"""
Modbus TCP Register Poller
---------------------------
Connects to a Modbus TCP device, reads a range of holding registers,
stores the values in a list, and saves them to a JSON file so they
can be used later (e.g. by compare_registers.py).

Edit the CONFIG section below to change the IP, port, register range,
or register type.
"""

import json
import time
from datetime import datetime
from pymodbus.client import ModbusTcpClient

# ======================= CONFIG =======================
IP_ADDRESS = "192.168.4.1"        # Device IP
PORT = 502                        # Modbus TCP port (default 502)
SLAVE_ID = 1                      # Unit / slave ID

START_REGISTER = 2000              # First register address (0-based offset)
END_REGISTER = 6000                # Last register address (inclusive)

REGISTER_TYPE = "holding"          # "holding" or "input"
CHUNK_SIZE = 100                   # Registers per request. Lower this (e.g. 50, 20, 10)
                                    # if the device keeps timing out — many devices can't
                                    # handle the full 125-register protocol max in one request.

TIMEOUT = 5                        # Seconds to wait for a response
RETRIES = 3                        # Retries per chunk before giving up on it
DELAY_BETWEEN_REQUESTS = 0.05      # Seconds to pause between requests (be gentle on the device)

OUTPUT_FILE = "registers_2.json"   # Change this per poll (e.g. registers_2.json)
# ========================================================


def _read_block(client, reg_type, address, count, slave_id):
    """
    Calls the right read method, adapting to whichever keyword argument
    this installed pymodbus version expects for the slave/unit ID
    ('slave', 'unit', or 'device_id'), or falls back to positional args.
    """
    method = client.read_holding_registers if reg_type == "holding" else client.read_input_registers

    for kwarg_name in ("slave", "unit", "device_id"):
        try:
            return method(address=address, count=count, **{kwarg_name: slave_id})
        except TypeError:
            continue

    # Last resort: no slave/unit kwarg supported at all
    return method(address=address, count=count)


def read_registers(client, start, end, reg_type, slave_id, chunk_size):
    """Reads registers from start to end (inclusive) in chunks and returns a flat list."""
    values = []
    address = start
    total = end - start + 1

    if reg_type not in ("holding", "input"):
        raise ValueError("REGISTER_TYPE must be 'holding' or 'input'")

    while address <= end:
        count = min(chunk_size, end - address + 1)

        result = None
        last_error = None
        for attempt in range(RETRIES):
            try:
                result = _read_block(client, reg_type, address, count, slave_id)
                if not result.isError():
                    break
                last_error = result
            except Exception as exc:  # covers ModbusIOException, connection resets, etc.
                last_error = exc
                # The device may have force-closed the socket (common when it rejects
                # an address/request). Reconnect before the next attempt so we don't
                # cascade-fail every remaining chunk.
                try:
                    client.close()
                except Exception:
                    pass
                client.connect()
            time.sleep(DELAY_BETWEEN_REQUESTS)

        if result is None or result.isError():
            print(f"\nFailed to read registers {address}-{address + count - 1} after {RETRIES} attempts: {last_error}")
            # Fill with None so the list keeps its position/index alignment
            values.extend([None] * count)
        else:
            values.extend(result.registers)

        address += count
        print(f"Read {min(address - start, total)}/{total} registers...", end="\r")
        time.sleep(DELAY_BETWEEN_REQUESTS)

    print()
    return values


def main():
    client = ModbusTcpClient(IP_ADDRESS, port=PORT, timeout=TIMEOUT)

    if not client.connect():
        print(f"Could not connect to {IP_ADDRESS}:{PORT}")
        return

    print(f"Connected to {IP_ADDRESS}:{PORT}, reading registers {START_REGISTER}-{END_REGISTER}...")

    values = read_registers(client, START_REGISTER, END_REGISTER, REGISTER_TYPE, SLAVE_ID, CHUNK_SIZE)

    client.close()

    # Convert 16-bit registers to 32-bit long integers (Big Endian)
    # and map them to their starting register addresses.
    values_dict = {}
    for i in range(0, len(values), 2):
        reg_num = START_REGISTER + i
        val1 = values[i]
        val2 = values[i+1] if i + 1 < len(values) else None
        
        if val1 is not None and val2 is not None:
            long_val = (val1 << 16) | val2
            # To interpret as a signed 32-bit integer, uncomment the following line:
            # if long_val >= 0x80000000: long_val -= 0x100000000
            values_dict[str(reg_num)] = long_val
        else:
            values_dict[str(reg_num)] = None

    data = {
        "ip": IP_ADDRESS,
        "start_register": START_REGISTER,
        "end_register": END_REGISTER,
        "register_type": REGISTER_TYPE,
        "timestamp": datetime.now().isoformat(),
        "values": values_dict,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Saved {len(values_dict)} 32-bit register values to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
