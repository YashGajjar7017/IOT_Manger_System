const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const express = require('express');
const mongoose = require('mongoose');
const { SerialPort } = require('serialport');

let mainWindow;
let activeSerialPort = null;
let activeTcpSocket = null;
let serialBuffer = '';
let tcpBuffer = '';
let expressServer = null;

// Database Configuration
let mongodbConnected = false;
let memoryHistoryBuffer = []; // In-memory fallback database if MongoDB is not running

// Mongoose Schema Definition
const TelemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  count: Number,
  devices: [
    {
      id: Number,
      temp: Number,
      rssi: Number,
      bat: Number,
      status: String
    }
  ]
});

const TelemetryModel = mongoose.model('Telemetry', TelemetrySchema);

// 1. Initialize MongoDB Connection with Graceful In-Memory Fallback
function connectDatabase() {
  const mongoURI = 'mongodb://127.0.0.1:27017/iot_monitor';
  console.log(`[DATABASE] Connecting to MongoDB at ${mongoURI}...`);

  mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 3000 // Timeout fast if MongoDB is not running
  })
  .then(() => {
    mongodbConnected = true;
    console.log('[DATABASE] MongoDB connection established successfully.');
  })
  .catch((err) => {
    mongodbConnected = false;
    console.warn('[DATABASE] MongoDB connection failed. Falling back to In-Memory Logging.');
    console.warn(`[DATABASE] Error details: ${err.message}`);
  });
}

// 2. Start Express Web Server
function startExpressServer() {
  const expressApp = express();
  expressApp.use(express.json());

  // Serve Vite compiled React frontend assets
  const distPath = path.join(__dirname, 'dist');
  expressApp.use(express.static(distPath));

  // REST API: Get database connection and logs status
  expressApp.get('/api/status', (req, res) => {
    res.json({
      mongodb: mongodbConnected ? 'CONNECTED' : 'FALLBACK_MEMORY',
      recordsCount: mongodbConnected ? 'Fetching dynamically' : memoryHistoryBuffer.length
    });
  });

  // REST API: Retrieve the last 50 historical telemetry snapshots
  expressApp.get('/api/telemetry/history', async (req, res) => {
    try {
      if (mongodbConnected) {
        const history = await TelemetryModel.find()
          .sort({ timestamp: -1 })
          .limit(50);
        res.json(history);
      } else {
        // Return memory buffer (newest first)
        res.json([...memoryHistoryBuffer].reverse());
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch logs: ${err.message}` });
    }
  });

  // REST API: Delete all telemetry history logs
  expressApp.delete('/api/telemetry/history', async (req, res) => {
    try {
      if (mongodbConnected) {
        await TelemetryModel.deleteMany({});
        res.json({ success: true, message: 'MongoDB history logs cleared.' });
      } else {
        memoryHistoryBuffer = [];
        res.json({ success: true, message: 'In-Memory history logs cleared.' });
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to clear logs: ${err.message}` });
    }
  });

  // Fallback to React index.html for single-page routing
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Create HTTP server wrapper
  expressServer = http.createServer(expressApp);
  expressServer.listen(8000, '127.0.0.1', () => {
    console.log('[EXPRESS] Server running on http://127.0.0.1:8000');
  });
}

// 3. Save Telemetry snapshot helper
async function saveTelemetrySnapshot(data) {
  const snapshot = {
    timestamp: new Date(),
    count: data.count,
    devices: data.devices
  };

  if (mongodbConnected) {
    try {
      await TelemetryModel.create(snapshot);
      
      // Auto-cap history to 200 documents to prevent bloated database in PoC
      const count = await TelemetryModel.countDocuments();
      if (count > 200) {
        const oldest = await TelemetryModel.find().sort({ timestamp: 1 }).limit(1);
        if (oldest.length > 0) {
          await TelemetryModel.deleteOne({ _id: oldest[0]._id });
        }
      }
    } catch (err) {
      console.error('[DATABASE] Failed to write telemetry record to MongoDB:', err);
    }
  } else {
    memoryHistoryBuffer.push(snapshot);
    if (memoryHistoryBuffer.length > 50) {
      memoryHistoryBuffer.shift(); // Keep last 50 snapshots
    }
  }
}

// 4. Electron Window Creation
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 870,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Set to false to allow direct IPC access in React
      backgroundThrottling: false
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#03000a'
  });

  // Load the compiled React app served via local Express
  mainWindow.loadURL('http://localhost:8000');
}

app.whenReady().then(() => {
  connectDatabase();
  startExpressServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanupConnections();
  if (expressServer) {
    expressServer.close();
  }
  if (process.platform !== 'darwin') app.quit();
});

// Window controls IPC handling
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Helper: Cleanup active network and serial connections
function cleanupConnections() {
  if (activeSerialPort && activeSerialPort.isOpen) {
    activeSerialPort.close();
    activeSerialPort = null;
  }
  if (activeTcpSocket) {
    activeTcpSocket.destroy();
    activeTcpSocket = null;
  }
}

// -------------------------------------------------------------
// IPC Handlers: Serial Communication
// -------------------------------------------------------------

ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || 'Generic Device'
    }));
  } catch (err) {
    console.error('Failed to list serial ports:', err);
    return [];
  }
});

ipcMain.on('connect-serial', (event, { portPath, baudRate }) => {
  cleanupConnections();

  try {
    activeSerialPort = new SerialPort({
      path: portPath,
      baudRate: parseInt(baudRate) || 115200,
      autoOpen: false
    });

    activeSerialPort.open((err) => {
      if (err) {
        event.reply('connection-status', { status: 'error', message: `Failed to open serial: ${err.message}` });
        return;
      }

      event.reply('connection-status', { status: 'connected', type: 'serial', target: portPath });
      serialBuffer = '';

      activeSerialPort.on('data', (chunk) => {
        serialBuffer += chunk.toString();
        
        let lines = serialBuffer.split('\n');
        serialBuffer = lines.pop(); // Keep partial line

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          if (line.startsWith('JSON_PAYLOAD:')) {
            const jsonStr = line.substring(13);
            try {
              const payload = JSON.parse(jsonStr);
              event.reply('hardware-payload', payload);
            } catch (e) {
              event.reply('console-log', `[ERROR] Failed to parse boot JSON: ${e.message}`);
            }
          } else if (line.startsWith('CONTROL_STATUS:')) {
            const jsonStr = line.substring(15);
            try {
              const payload = JSON.parse(jsonStr);
              event.reply('control-payload-sync', payload);
            } catch (e) {
              event.reply('console-log', `[ERROR] Failed to parse control status: ${e.message}`);
            }
          } else {
            event.reply('console-log', line);
          }
        }
      });

      activeSerialPort.on('close', () => {
        event.reply('connection-status', { status: 'disconnected' });
      });

      activeSerialPort.on('error', (err) => {
        event.reply('console-log', `[SERIAL ERROR] ${err.message}`);
      });
    });
  } catch (err) {
    event.reply('connection-status', { status: 'error', message: err.message });
  }
});

ipcMain.on('send-serial-command', (event, command) => {
  if (activeSerialPort && activeSerialPort.isOpen) {
    activeSerialPort.write(command + '\n', (err) => {
      if (err) {
        event.reply('console-log', `[ERROR] Failed to write command: ${err.message}`);
      } else {
        event.reply('console-log', `[TX SERIAL] Send: ${command}`);
      }
    });
  } else {
    event.reply('console-log', '[ERROR] Serial port not open.');
  }
});

// -------------------------------------------------------------
// IPC Handlers: TCP Network Communication
// -------------------------------------------------------------

ipcMain.on('connect-tcp', (event, { ip, port }) => {
  cleanupConnections();
  const hostIP = ip || '192.168.4.1';
  const hostPort = parseInt(port) || 9000;

  event.reply('console-log', `[TCP] Connecting to telemetry socket at ${hostIP}:${hostPort}...`);

  activeTcpSocket = new net.Socket();
  activeTcpSocket.setTimeout(6000);

  activeTcpSocket.connect(hostPort, hostIP, () => {
    event.reply('connection-status', { status: 'connected', type: 'tcp', target: `${hostIP}:${hostPort}` });
    event.reply('console-log', `[TCP] Connected to gateway socket at ${hostIP}:${hostPort}`);
    tcpBuffer = '';
  });

  activeTcpSocket.on('data', (chunk) => {
    tcpBuffer += chunk.toString();

    let lines = tcpBuffer.split('\n');
    tcpBuffer = lines.pop();

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      try {
        const payload = JSON.parse(line);
        if (payload.type === 'telemetry') {
          event.reply('telemetry-payload', payload);
          
          // Auto-save incoming telemetry packet to MongoDB / memory database
          saveTelemetrySnapshot(payload);
        } else if (payload.type === 'control_status') {
          event.reply('control-payload-sync', payload);
        } else if (payload.type === 'pong') {
          event.reply('ping-pong-reply');
        } else if (payload.status === 'BOOT_SUCCESS') {
          event.reply('hardware-payload', payload);
        }
      } catch (e) {
        event.reply('console-log', `[TCP RX] ${line}`);
      }
    }
  });

  activeTcpSocket.on('timeout', () => {
    event.reply('console-log', '[TCP] Connection timeout threshold reached.');
    activeTcpSocket.destroy();
  });

  activeTcpSocket.on('close', () => {
    event.reply('connection-status', { status: 'disconnected' });
    event.reply('console-log', '[TCP] Client socket disconnected.');
  });

  activeTcpSocket.on('error', (err) => {
    event.reply('connection-status', { status: 'error', message: `TCP Socket Error: ${err.message}` });
    event.reply('console-log', `[TCP ERROR] ${err.message}`);
  });
});

ipcMain.on('send-tcp-command', (event, command) => {
  if (activeTcpSocket && !activeTcpSocket.destroyed) {
    activeTcpSocket.write(command + '\n', (err) => {
      if (err) {
        event.reply('console-log', `[ERROR] Failed to send TCP command: ${err.message}`);
      } else {
        event.reply('console-log', `[TX TCP] Send: ${command}`);
      }
    });
  } else {
    event.reply('console-log', '[ERROR] TCP connection is inactive.');
  }
});

ipcMain.on('disconnect-active', (event) => {
  cleanupConnections();
  event.reply('connection-status', { status: 'disconnected' });
  event.reply('console-log', '[SYSTEM] Interface disconnected.');
});

// -------------------------------------------------------------
// IPC Handlers: Wireless HTTP OTA Updates
// -------------------------------------------------------------

ipcMain.on('start-ota', (event, { filePath, ip }) => {
  const gatewayIP = ip || '192.168.4.1';
  event.reply('console-log', `[OTA] Streaming binary firmware to http://${gatewayIP}:8000/update...`);

  if (!fs.existsSync(filePath)) {
    event.reply('ota-progress', { status: 'error', message: 'Binary file does not exist.' });
    return;
  }

  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
    const filename = path.basename(filePath);
    
    const header = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="update"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    
    const totalLength = header.length + fileSize + footer.length;
    
    const options = {
      hostname: gatewayIP,
      port: 8000,
      path: '/update',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
        'Connection': 'close'
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 && responseData.toUpperCase().includes('OK')) {
          event.reply('ota-progress', { status: 'success', progress: 100 });
          event.reply('console-log', '[OTA] Upgrade completed! Router reboot triggered.');
        } else {
          event.reply('ota-progress', { 
            status: 'error', 
            message: `Flashing failed. Code ${res.statusCode}: ${responseData}` 
          });
        }
      });
    });
    
    req.on('error', (err) => {
      event.reply('ota-progress', { 
        status: 'error', 
        message: `OTA transmission failed: ${err.message}. Check AP connection.` 
      });
      event.reply('console-log', `[OTA ERROR] ${err.message}`);
    });
    
    req.write(header);
    
    const fileStream = fs.createReadStream(filePath, { highWaterMark: 32768 });
    let bytesSent = 0;
    
    fileStream.on('data', (chunk) => {
      req.write(chunk);
      bytesSent += chunk.length;
      const progress = Math.round((bytesSent / fileSize) * 100);
      event.reply('ota-progress', { status: 'uploading', progress: progress });
    });
    
    fileStream.on('end', () => {
      req.write(footer);
      req.end();
    });
    
  } catch (err) {
    event.reply('ota-progress', { status: 'error', message: err.message });
    event.reply('console-log', `[OTA EXCEPTION] ${err.message}`);
  }
});
