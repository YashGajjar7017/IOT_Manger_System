const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const { SerialPort } = require('serialport');

let mainWindow;
let activeSerialPort = null;
let activeTcpSocket = null;
let serialBuffer = '';
let tcpBuffer = '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Set to false to allow direct IPC access in renderer.js
      backgroundThrottling: false
    },
    titleBarStyle: 'hidden', // Custom window controls styling can be used
    backgroundColor: '#12072b'
  });

  mainWindow.loadFile('index.html');
  
  // Open devtools during development if needed
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanupConnections();
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

// List available serial ports
ipcMain.handle('list-ports', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || 'Generic'
    }));
  } catch (err) {
    console.error('Failed to list serial ports:', err);
    return [];
  }
});

// Connect to a serial port
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
        
        // Process data line-by-line
        let lines = serialBuffer.split('\n');
        serialBuffer = lines.pop(); // Keep incomplete line in buffer

        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          // Check if it's the custom JSON telemetry or boot payload
          if (line.startsWith('JSON_PAYLOAD:')) {
            const jsonStr = line.substring(13);
            try {
              const payload = JSON.parse(jsonStr);
              event.reply('hardware-payload', payload);
            } catch (e) {
              event.reply('console-log', `[ERROR] Failed to parse boot JSON: ${e.message}`);
            }
          } else {
            // Forward serial debug logs directly to renderer console
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

// Send a serial command
ipcMain.on('send-serial-command', (event, command) => {
  if (activeSerialPort && activeSerialPort.isOpen) {
    activeSerialPort.write(command + '\n', (err) => {
      if (err) {
        event.reply('console-log', `[ERROR] Failed to write command: ${err.message}`);
      } else {
        event.reply('console-log', `[TX] Send Command: ${command}`);
      }
    });
  } else {
    event.reply('console-log', '[ERROR] Serial port not open.');
  }
});

// -------------------------------------------------------------
// IPC Handlers: TCP Network Communication
// -------------------------------------------------------------

// Connect to the gateway via TCP Socket (WiFi AP mode)
ipcMain.on('connect-tcp', (event, { ip, port }) => {
  cleanupConnections();
  const hostIP = ip || '192.168.4.1';
  const hostPort = parseInt(port) || 8080;

  event.reply('console-log', `[TCP] Attempting connection to ${hostIP}:${hostPort}...`);

  activeTcpSocket = new net.Socket();
  activeTcpSocket.setTimeout(5000); // 5 seconds timeout

  activeTcpSocket.connect(hostPort, hostIP, () => {
    event.reply('connection-status', { status: 'connected', type: 'tcp', target: `${hostIP}:${hostPort}` });
    event.reply('console-log', `[TCP] Successfully connected to telemetry server at ${hostIP}:${hostPort}`);
    tcpBuffer = '';
  });

  activeTcpSocket.on('data', (chunk) => {
    tcpBuffer += chunk.toString();

    // Process TCP JSON packets line-by-line
    let lines = tcpBuffer.split('\n');
    tcpBuffer = lines.pop(); // Keep incomplete line

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      try {
        const payload = JSON.parse(line);
        event.reply('telemetry-payload', payload);
      } catch (e) {
        // Log telemetry lines if they aren't JSON
        event.reply('console-log', `[TCP RX] ${line}`);
      }
    }
  });

  activeTcpSocket.on('timeout', () => {
    event.reply('console-log', '[TCP] Connection timed out.');
    activeTcpSocket.destroy();
  });

  activeTcpSocket.on('close', () => {
    event.reply('connection-status', { status: 'disconnected' });
    event.reply('console-log', '[TCP] Socket connection closed.');
  });

  activeTcpSocket.on('error', (err) => {
    event.reply('connection-status', { status: 'error', message: `TCP Socket Error: ${err.message}` });
    event.reply('console-log', `[TCP ERROR] ${err.message}`);
  });
});

// Disconnect active interface
ipcMain.on('disconnect-active', (event) => {
  cleanupConnections();
  event.reply('connection-status', { status: 'disconnected' });
  event.reply('console-log', '[SYSTEM] Active connections disconnected.');
});

// -------------------------------------------------------------
// IPC Handlers: Wireless HTTP OTA Updates
// -------------------------------------------------------------

ipcMain.on('start-ota', (event, { filePath, ip }) => {
  const gatewayIP = ip || '192.168.4.1';
  event.reply('console-log', `[OTA] Starting OTA transfer of ${path.basename(filePath)} to ${gatewayIP}...`);

  if (!fs.existsSync(filePath)) {
    event.reply('ota-progress', { status: 'error', message: 'Selected file does not exist.' });
    return;
  }

  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    // WebKitFormBoundary for multipart form-data
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
      port: 80,
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
          event.reply('console-log', '[OTA] Upgrade complete! Device rebooting...');
        } else {
          event.reply('ota-progress', { 
            status: 'error', 
            message: `Server update failed. Code ${res.statusCode}: ${responseData}` 
          });
        }
      });
    });
    
    req.on('error', (err) => {
      event.reply('ota-progress', { 
        status: 'error', 
        message: `OTA request error: ${err.message}. Ensure you are connected to the Gateway Access Point.` 
      });
      event.reply('console-log', `[OTA ERROR] ${err.message}`);
    });
    
    // Write headers
    req.write(header);
    
    // Stream binary file with progress updates
    const fileStream = fs.createReadStream(filePath, { highWaterMark: 32768 }); // 32KB chunks
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
