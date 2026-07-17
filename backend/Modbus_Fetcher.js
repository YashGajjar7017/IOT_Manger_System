const fs = require('fs').promises;
const net = require('net');
const { client: ModbusClient } = require('jsmodbus');

// ======================= CONFIG =======================
const IP_ADDRESS = process.argv[2] || "192.168.4.1";       // Device IP
const PORT = parseInt(process.argv[3]) || 502;                       // Modbus TCP port (default 502)
const SLAVE_ID = parseInt(process.argv[4]) || 1;                     // Unit / slave ID

const START_REGISTER = parseInt(process.argv[5]) || 2000;             // First register address (0-based offset)
const END_REGISTER = parseInt(process.argv[6]) || 6000;               // Last register address (inclusive)

const REGISTER_TYPE = process.argv[7] || "holding";         // "holding" or "input"
const CHUNK_SIZE = 100;                  // Registers per request (Lower this if device times out)

const TIMEOUT = 5000;                    // Milliseconds to wait for a response (5s)
const RETRIES = 3;                       // Retries per chunk before giving up on it
const DELAY_BETWEEN_REQUESTS = 50;       // Milliseconds to pause between requests (0.05s)

const OUTPUT_FILE = "registers_2.json";  // Output filename
// ======================================================

// Helper utility to handle pausing execution asynchronously
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Reads a single block of registers using jsmodbus
 */
async function readBlock(modbusClient, regType, address, count, slaveId) {
    // jsmodbus uses 0-based indexing options natively, but double check your device offsets
    const options = { unitId: slaveId };

    if (regType === "holding") {
        const response = await modbusClient.readHoldingRegisters(address, count);
        // jsmodbus returns the raw array inside response.response.body.values
        return response.response.body.values;
    } else {
        const response = await modbusClient.readInputRegisters(address, count);
        return response.response.body.values;
    }
}

/**
 * Reads registers from start to end (inclusive) in chunks and returns a flat list
 */
async function readRegisters(socket, modbusClient, start, end, regType, slaveId, chunkSize, ip, port) {
    const values = [];
    let address = start;
    const total = end - start + 1;

    if (regType !== "holding" && regType !== "input") {
        throw new Error("REGISTER_TYPE must be 'holding' or 'input'");
    }

    while (address <= end) {
        const count = Math.min(chunkSize, end - address + 1);
        let result = null;
        let lastError = null;

        for (let attempt = 0; attempt < RETRIES; attempt++) {
            try {
                result = await readBlock(modbusClient, regType, address, count, slaveId);
                if (result) break;
            } catch (exc) {
                lastError = exc;

                // If the socket drops or gets forced shut, try to clean up and reconnect
                try {
                    socket.destroy();
                } catch (e) { }

                await new Promise((resolve) => {
                    const onConnectErr = () => {
                        socket.off('error', onConnectErr);
                        resolve();
                    };
                    socket.once('error', onConnectErr);
                    socket.connect({ host: ip, port: port }, () => {
                        socket.off('error', onConnectErr);
                        resolve();
                    });
                });
            }
            await sleep(DELAY_BETWEEN_REQUESTS);
        }

        if (!result) {
            console.log(`\nFailed to read registers ${address}-${address + count - 1} after ${RETRIES} attempts: ${lastError?.message || lastError}`);
            // Fill with nulls so the list keeps its index alignment
            values.push(...Array(count).fill(null));
        } else {
            values.push(...result);
        }

        address += count;
        // In Node, stdout.write combined with '\r' emulates the Python end="\r" line overwriting
        process.stdout.write(`Read ${Math.min(address - start, total)}/${total} registers...\r`);
        await sleep(DELAY_BETWEEN_REQUESTS);
    }

    console.log(); // Newline after progress loop finishes
    return values;
}

async function runFetcher(ip, port, slaveId, startRegister, endRegister, regType) {
    const socket = new net.Socket();
    const client = new ModbusClient.TCP(socket, slaveId);

    console.log(`Connecting to ${ip}:${port}...`);

    try {
        await new Promise((resolve, reject) => {
            socket.setTimeout(TIMEOUT);
            socket.connect({ host: ip, port: port }, () => resolve());
            socket.on('error', (err) => reject(err));
            socket.on('timeout', () => reject(new Error('Connection timeout')));
        });
    } catch (err) {
        console.error(`Could not connect to ${ip}:${port}: ${err.message}`);
        throw err;
    }

    console.log(`Connected to ${ip}:${port}, reading registers ${startRegister}-${endRegister}...`);

    const values = await readRegisters(socket, client, startRegister, endRegister, regType, slaveId, CHUNK_SIZE, ip, port);

    // Close network connection safely
    socket.end();

    // Convert 16-bit registers to 32-bit unsigned long integers (Big Endian)
    const valuesDict = {};
    for (let i = 0; i < values.length; i += 2) {
        const regNum = startRegister + i;
        const val1 = values[i];
        const val2 = (i + 1 < values.length) ? values[i + 1] : null;

        if (val1 !== null && val2 !== null) {
            let longVal = ((val1 << 16) | val2) >>> 0;
            valuesDict[String(regNum)] = longVal;
        } else {
            valuesDict[String(regNum)] = null;
        }
    }

    const data = {
        ip: ip,
        start_register: startRegister,
        end_register: endRegister,
        register_type: regType,
        timestamp: new Date().toISOString(),
        values: valuesDict,
        raw16: values,
    };

    try {
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`Saved ${Object.keys(valuesDict).length} 32-bit register values to ${OUTPUT_FILE}`);
    } catch (fsErr) {
        console.error(`Failed to write JSON output file: ${fsErr.message}`);
    }

    return { success: true, values: valuesDict, raw16: values };
}

async function main() {
    try {
        await runFetcher(IP_ADDRESS, PORT, SLAVE_ID, START_REGISTER, END_REGISTER, REGISTER_TYPE);
    } catch (err) {
        console.error("Fetcher error:", err.message);
    }
}

if (require.main === module) {
    main();
} else {
    module.exports = { runFetcher };
}