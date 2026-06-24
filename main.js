const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const express = require('express');
const db = require('./database');
const { SerialPort } = require('serialport');
const dgram = require('dgram');

let mainWindow;
let activeSerialPort = null;
let activeTcpSocket = null;
let serialBuffer = '';
let tcpBuffer = '';
let expressServer = null;

const CONFIG_PATH = path.join(app.getPath('userData'), 'app-config.json');

let appConfig = {
  mongoUri: 'mongodb://127.0.0.1:27017/iot_monitor',
  expressPort: 8000,
  telemetryPort: 9000,
  otaPort: 500,
  udpPort: 5002,
  defaultBaudRate: 115200
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      appConfig = { ...appConfig, ...JSON.parse(data) };
      console.log('[CONFIG] Settings loaded from:', CONFIG_PATH);
    } else {
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf8');
      console.log('[CONFIG] Default settings created at:', CONFIG_PATH);
    }
  } catch (e) {
    console.error('[CONFIG] Failed to load/save config:', e.message);
  }
}

function saveConfig(newConfig) {
  try {
    appConfig = { ...appConfig, ...newConfig };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf8');
    console.log('[CONFIG] Settings saved to:', CONFIG_PATH);
  } catch (e) {
    console.error('[CONFIG] Failed to save config:', e.message);
  }
}

// Load configurations immediately
loadConfig();

// 2. Start Express Web Server
function startExpressServer() {
  const expressApp = express();
  expressApp.use(express.json());

  // Serve Vite compiled React frontend assets
  const distPath = path.join(__dirname, 'frontend-build');
  expressApp.use(express.static(distPath));

  // REST API: Get database connection and logs status
  expressApp.get('/api/status', (req, res) => {
    res.json({
      mongodb: db.isDbConnected() ? 'CONNECTED' : 'FALLBACK_MEMORY',
      recordsCount: db.isDbConnected() ? 'Fetching dynamically' : db.getMemoryHistoryBuffer().length
    });
  });

  // REST API: Retrieve the last 50 historical telemetry snapshots
  expressApp.get('/api/telemetry/history', async (req, res) => {
    try {
      if (db.isDbConnected()) {
        const history = await db.TelemetryModel.find()
          .sort({ timestamp: -1 })
          .limit(50);
        res.json(history);
      } else {
        // Return memory buffer (newest first)
        res.json([...db.getMemoryHistoryBuffer()].reverse());
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch logs: ${err.message}` });
    }
  });

  // REST API: Delete all telemetry history logs
  expressApp.delete('/api/telemetry/history', async (req, res) => {
    try {
      if (db.isDbConnected()) {
        await db.TelemetryModel.deleteMany({});
        res.json({ success: true, message: 'MongoDB history logs cleared.' });
      } else {
        db.clearMemoryHistoryBuffer();
        res.json({ success: true, message: 'In-Memory history logs cleared.' });
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to clear logs: ${err.message}` });
    }
  });

  // Helper to download certificate from SCADA and POST upload it directly to ESP32
  const downloadAndUploadCert = (fileUrl, uploadUrl) => {
    return new Promise((resolve, reject) => {
      const client = fileUrl.startsWith('https') ? require('https') : require('http');
      client.get(fileUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download from SCADA, HTTP Code: ${res.statusCode}`));
          return;
        }
        let content = '';
        res.on('data', chunk => content += chunk.toString());
        res.on('end', () => {
          const urlObj = new URL(uploadUrl);
          const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              'Content-Length': Buffer.byteLength(content)
            }
          };
          const req = http.request(options, (uploadRes) => {
            let responseData = '';
            uploadRes.on('data', chunk => responseData += chunk.toString());
            uploadRes.on('end', () => {
              if (uploadRes.statusCode === 200) {
                resolve(Buffer.byteLength(content));
              } else {
                reject(new Error(`ESP32 upload failed. Code ${uploadRes.statusCode}: ${responseData}`));
              }
            });
          });
          req.on('error', err => reject(err));
          req.write(content);
          req.end();
        });
      }).on('error', err => reject(err));
    });
  };

  // Express API: Provision Certificates from SCADA server to ESP32
  expressApp.post('/api/certificates/provision', async (req, res) => {
    const { imei, password, gatewayIp } = req.body;
    if (!imei || !password || !gatewayIp) {
      return res.status(400).json({ error: 'Missing imei, password, or gatewayIp' });
    }

    const rootCaUrl = `https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei=${imei}&user=${imei}&pass=${password}&ctype=1&PROJCD=re`;
    const deviceCertUrl = `https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei=${imei}&user=${imei}&pass=${password}&ctype=2&PROJCD=re`;
    const privateKeyUrl = `https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei=${imei}&user=${imei}&pass=${password}&ctype=3&PROJCD=re`;

    const esp32BaseUrl = `http://${gatewayIp}:8000`;

    try {
      console.log(`[EXPRESS API] Starting certificates provisioning for IMEI ${imei}...`);

      const rootCaSize = await downloadAndUploadCert(rootCaUrl, `${esp32BaseUrl}/api/upload_ca`);
      const deviceCertSize = await downloadAndUploadCert(deviceCertUrl, `${esp32BaseUrl}/api/upload_cert`);
      const privateKeySize = await downloadAndUploadCert(privateKeyUrl, `${esp32BaseUrl}/api/upload_key`);

      // Write log to DB
      const logData = {
        imei,
        gatewayIp,
        rootCaSize,
        deviceCertSize,
        privateKeySize,
        status: 'SUCCESS',
        message: 'Successfully provisioned CA, Cert, and Key from SCADA to ESP32.'
      };
      await db.saveCertificateLog(logData);

      // Trigger sync to QCOM via serial channel
      if (activeTcpSocket && !activeTcpSocket.destroyed) {
        activeTcpSocket.write('SYNC_CERTS_TO_QCOM\n');
      } else if (activeSerialPort && activeSerialPort.isOpen) {
        activeSerialPort.write('SYNC_CERTS_TO_QCOM\n');
      }

      res.json({ success: true, message: 'All certificates successfully provisioned from SCADA -> ESP32 -> QCOM channel.' });
    } catch (err) {
      console.error('[EXPRESS API] Provisioning failed:', err.message);
      
      const logData = {
        imei,
        gatewayIp,
        rootCaSize: 0,
        deviceCertSize: 0,
        privateKeySize: 0,
        status: 'FAILED',
        message: err.message
      };
      await db.saveCertificateLog(logData);

      res.status(500).json({ error: `Provisioning failed: ${err.message}` });
    }
  });

  // Express API: Fetch historical audit logs for certificate provisioning
  expressApp.get('/api/certificates/history', async (req, res) => {
    try {
      const history = await db.getCertificateLogs();
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch logs: ${err.message}` });
    }
  });

  // Express API: Simple HTTP endpoint to flash firmware from raw binary buffer (Port 500)
  expressApp.post('/api/ota/upload', (req, res) => {
    const filename = req.headers['x-filename'] || 'firmware.bin';
    const fileSize = parseInt(req.headers['content-length']) || 0;
    
    let gatewayIP = '192.168.4.1';
    if (activeTcpSocket && !activeTcpSocket.destroyed && activeTcpSocket.remoteAddress) {
      gatewayIP = activeTcpSocket.remoteAddress;
    }
    
    const otaPort = appConfig.otaPort || 500;
    console.log(`[EXPRESS API] Proxied OTA upload starting. Size: ${fileSize} bytes. Target: http://${gatewayIP}:${otaPort}/update`);
    
    const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
    const header = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="update"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const totalLength = header.length + fileSize + footer.length;

    const options = {
      hostname: gatewayIP,
      port: otaPort,
      path: `/update?target=esp32`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
        'Connection': 'close'
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let responseData = '';
      proxyRes.on('data', (chunk) => { responseData += chunk.toString(); });
      proxyRes.on('end', () => {
        if (proxyRes.statusCode === 200 && responseData.toUpperCase().includes('OK')) {
          res.json({ success: true, message: 'Flash completed successfully!' });
        } else {
          res.status(500).json({ error: `Flashing failed. Code ${proxyRes.statusCode}: ${responseData}` });
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[EXPRESS API] OTA upload error:', err.message);
      res.status(500).json({ error: err.message });
    });

    proxyReq.write(header);
    
    req.on('data', (chunk) => {
      proxyReq.write(chunk);
    });
    
    req.on('end', () => {
      proxyReq.write(footer);
      proxyReq.end();
    });
  });

  // Express API: Simple HTTP endpoint to flash firmware from a remote URL
  expressApp.post('/api/ota/flash-url', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'Missing remote url' });
    }
    
    let gatewayIP = '192.168.4.1';
    if (activeTcpSocket && !activeTcpSocket.destroyed && activeTcpSocket.remoteAddress) {
      gatewayIP = activeTcpSocket.remoteAddress;
    }
    
    const otaPort = appConfig.otaPort || 500;
    console.log(`[EXPRESS API] Remote URL OTA requested: ${url} -> http://${gatewayIP}:${otaPort}/update`);
    
    const tempPath = path.join(__dirname, 'scratch', `api_remote_firmware_${Date.now()}.bin`);
    if (!fs.existsSync(path.dirname(tempPath))) {
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    }
    
    try {
      const client = url.startsWith('https') ? require('https') : require('http');
      const contentSize = await new Promise((resolve, reject) => {
        client.get(url, (getRes) => {
          if (getRes.statusCode !== 200) {
            reject(new Error(`Failed to download firmware. HTTP Code: ${getRes.statusCode}`));
            return;
          }
          const fileStream = fs.createWriteStream(tempPath);
          getRes.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(fs.statSync(tempPath).size);
          });
          fileStream.on('error', err => reject(err));
        }).on('error', err => reject(err));
      });
      
      const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
      const header = 
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="update"; filename="firmware.bin"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const totalLength = header.length + contentSize + footer.length;
      
      const options = {
        hostname: gatewayIP,
        port: otaPort,
        path: `/update?target=esp32`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalLength,
          'Connection': 'close'
        }
      };
      
      const proxyReq = http.request(options, (proxyRes) => {
        let responseData = '';
        proxyRes.on('data', (chunk) => { responseData += chunk.toString(); });
        proxyRes.on('end', () => {
          try { fs.unlinkSync(tempPath); } catch (e) {}
          if (proxyRes.statusCode === 200 && responseData.toUpperCase().includes('OK')) {
            res.json({ success: true, message: 'Flash completed successfully from remote URL!' });
          } else {
            res.status(500).json({ error: `Flashing failed. Code ${proxyRes.statusCode}: ${responseData}` });
          }
        });
      });
      
      proxyReq.on('error', (err) => {
        try { fs.unlinkSync(tempPath); } catch (e) {}
        console.error('[EXPRESS API] OTA URL flash error:', err.message);
        res.status(500).json({ error: err.message });
      });
      
      proxyReq.write(header);
      const readStream = fs.createReadStream(tempPath);
      readStream.on('data', (chunk) => { proxyReq.write(chunk); });
      readStream.on('end', () => {
        proxyReq.write(footer);
        proxyReq.end();
      });
      
    } catch (err) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
      console.error('[EXPRESS API] OTA URL exception:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Fallback to React index.html for single-page routing
  expressApp.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Create HTTP server wrapper
  expressServer = http.createServer(expressApp);
  expressServer.listen(appConfig.expressPort, '127.0.0.1', () => {
    console.log(`[EXPRESS] Server running on http://127.0.0.1:${appConfig.expressPort}`);
  });
}

// 4. Electron Window Creation
function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  /*
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
  */

  /*
  mainWindow = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height,
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
  */

  mainWindow = new BrowserWindow({
    x: x,
    y: y,
    width: width,
    height: height,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Set to false to allow direct IPC access in React
      backgroundThrottling: false
    },
    titleBarStyle: 'hidden',
    backgroundColor: '#03000a',
    icon: path.join(__dirname, 'icon/logo.png')
  });

  // Load the compiled React app served via local Express
  mainWindow.loadURL(`http://localhost:${appConfig.expressPort}`);
  
  // Maximize the window automatically on load
  mainWindow.maximize();
}

let otaLocalServer = null;
function startOtaLocalServer() {
  const expressApp = express();
  
  expressApp.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>IoT Gateway OTA Portal</title>
        <style>
          body {
            background: #03000a;
            color: #ffffff;
            font-family: 'Outfit', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 0, 127, 0.2);
            border-radius: 12px;
            padding: 30px;
            width: 400px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(255, 0, 127, 0.1);
          }
          h2 {
            color: #ff007f;
            margin-bottom: 20px;
          }
          input[type="file"] {
            display: none;
          }
          .file-label {
            display: inline-block;
            background: linear-gradient(135deg, #ff007f 0%, #7f00ff 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            margin: 15px 0;
            font-weight: 500;
          }
          .btn {
            background: transparent;
            border: 1px solid #00f0ff;
            color: #00f0ff;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            width: 100%;
            margin-top: 10px;
          }
          .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          #status {
            margin-top: 15px;
            font-size: 14px;
            color: #a0a0b0;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>IoT Gateway OTA Portal</h2>
          <p>Upload a compiled firmware binary (.bin) to update the connected gateway.</p>
          <form id="uploadForm" enctype="multipart/form-data">
            <label for="file" class="file-label">Choose Firmware Binary</label>
            <input type="file" id="file" name="update" accept=".bin" required />
            <div id="fileName" style="font-size: 12px; margin-bottom: 15px; word-break: break-all;"></div>
            <button type="submit" class="btn" id="submitBtn">Flash Firmware</button>
          </form>
          <div id="status">Ready</div>
        </div>
        <script>
          const fileInput = document.getElementById('file');
          const fileName = document.getElementById('fileName');
          const form = document.getElementById('uploadForm');
          const submitBtn = document.getElementById('submitBtn');
          const statusDiv = document.getElementById('status');

          fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
              fileName.textContent = fileInput.files[0].name;
            }
          });

          form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (fileInput.files.length === 0) return;
            
            submitBtn.disabled = true;
            statusDiv.textContent = 'Uploading and flashing...';
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/upload-ota', true);
            
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percent = Math.round((event.loaded / event.total) * 100);
                statusDiv.textContent = 'Uploading: ' + percent + '%';
              }
            };
            
            xhr.onload = () => {
              if (xhr.status === 200) {
                statusDiv.innerHTML = '<span style="color:#00ff66">✓ Flash completed successfully! Device restarting.</span>';
              } else {
                statusDiv.innerHTML = '<span style="color:#ff3366">✗ Flash failed: ' + xhr.responseText + '</span>';
                submitBtn.disabled = false;
              }
            };
            
            xhr.onerror = () => {
              statusDiv.innerHTML = '<span style="color:#ff3366">✗ Transmission failed.</span>';
              submitBtn.disabled = false;
            };
            
            // Send file raw
            xhr.setRequestHeader('x-filename', fileInput.files[0].name);
            xhr.send(fileInput.files[0]);
          });
        </script>
      </body>
      </html>
    `);
  });

  // Handle raw binary upload
  /*
  expressApp.post('/upload-ota', (req, res) => {
    const filename = req.headers['x-filename'] || 'firmware.bin';
    console.log('[OTA SERVER] Received upload');
    
    const tempPath = path.join(__dirname, 'scratch', `temp_${Date.now()}.bin`);
    if (!fs.existsSync(path.dirname(tempPath))) {
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    }

    const fileStream = fs.createWriteStream(tempPath);
    req.pipe(fileStream);

    fileStream.on('finish', () => {
      const stats = fs.statSync(tempPath);
      const fileSize = stats.size;
      
      let gatewayIP = '192.168.4.1';
      if (activeTcpSocket && !activeTcpSocket.destroyed && activeTcpSocket.remoteAddress) {
        gatewayIP = activeTcpSocket.remoteAddress;
      }

      if (mainWindow) {
        mainWindow.webContents.send('console-log', `[OTA LOCAL] Uploaded: ${filename} (${Math.round(fileSize/1024)} KB)`);
        mainWindow.webContents.send('ota-progress', { status: 'uploading', progress: 50 });
      }

      const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
      const header = 
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="update"; filename="${filename}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const totalLength = header.length + fileSize + footer.length;

      const options = {
        hostname: gatewayIP,
        port: 8000,
        path: `/update?target=esp32`,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': totalLength,
          'Connection': 'close'
        }
      };

      const proxyReq = http.request(options, (proxyRes) => {
        let responseData = '';
        proxyRes.on('data', (chunk) => { responseData += chunk.toString(); });
        proxyRes.on('end', () => {
          try { fs.unlinkSync(tempPath); } catch (e) {}

          if (proxyRes.statusCode === 200 && responseData.toUpperCase().includes('OK')) {
            res.send('OK');
            if (mainWindow) {
              mainWindow.webContents.send('ota-progress', { status: 'success', progress: 100, target: 'esp32' });
              mainWindow.webContents.send('console-log', '[OTA LOCAL] Flash successful. Gateway rebooting...');
            }
          } else {
            res.status(500).send(`Flashing failed: ${responseData}`);
            if (mainWindow) {
              mainWindow.webContents.send('ota-progress', { status: 'error', message: responseData });
            }
          }
        });
      });

      proxyReq.on('error', (err) => {
        try { fs.unlinkSync(tempPath); } catch (e) {}
        res.status(500).send(err.message);
        if (mainWindow) {
          mainWindow.webContents.send('ota-progress', { status: 'error', message: err.message });
        }
      });

      proxyReq.write(header);
      const readStream = fs.createReadStream(tempPath);
      readStream.on('data', (chunk) => {
        proxyReq.write(chunk);
      });
      readStream.on('end', () => {
        proxyReq.write(footer);
        proxyReq.end();
      });
    });
  });
  */

  // Rewritten local OTA server using direct in-memory streaming to fix corruption/permissions/timeouts (Requirement 5)
  expressApp.post('/upload-ota', (req, res) => {
    const filename = req.headers['x-filename'] || 'firmware.bin';
    const fileSize = parseInt(req.headers['content-length']) || 0;
    
    let gatewayIP = '192.168.4.1';
    if (activeTcpSocket && !activeTcpSocket.destroyed && activeTcpSocket.remoteAddress) {
      gatewayIP = activeTcpSocket.remoteAddress;
    }

    if (mainWindow) {
      // Old hardcoded port 8000 line commented out:
      // mainWindow.webContents.send('console-log', `[OTA LOCAL] In-memory proxying of ${filename} (${Math.round(fileSize/1024)} KB) to target http://${gatewayIP}:8000/update...`);
      mainWindow.webContents.send('console-log', `[OTA LOCAL] In-memory proxying of ${filename} (${Math.round(fileSize/1024)} KB) to target http://${gatewayIP}:${appConfig.otaPort || 500}/update...`);
      mainWindow.webContents.send('ota-progress', { status: 'uploading', progress: 10 });
    }

    const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
    const header = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="update"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const totalLength = header.length + fileSize + footer.length;

    const options = {
      hostname: gatewayIP,
      // Old hardcoded port 8000 line commented out:
      // port: 8000,
      port: appConfig.otaPort || 500,
      path: `/update?target=esp32`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
        'Connection': 'close'
      }
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let responseData = '';
      proxyRes.on('data', (chunk) => { responseData += chunk.toString(); });
      proxyRes.on('end', () => {
        if (proxyRes.statusCode === 200 && responseData.toUpperCase().includes('OK')) {
          res.send('OK');
          if (mainWindow) {
            mainWindow.webContents.send('ota-progress', { status: 'success', progress: 100, target: 'esp32' });
            mainWindow.webContents.send('console-log', '[OTA LOCAL] In-memory flash upload successful! Device rebooting.');
          }
        } else {
          res.status(500).send(`Flashing failed. Code ${proxyRes.statusCode}: ${responseData}`);
          if (mainWindow) {
            mainWindow.webContents.send('ota-progress', { status: 'error', message: responseData });
          }
        }
      });
    });

    proxyReq.on('error', (err) => {
      res.status(500).send(err.message);
      if (mainWindow) {
        mainWindow.webContents.send('ota-progress', { status: 'error', message: err.message });
      }
    });

    // Write multipart prefix header
    proxyReq.write(header);
    
    // Pipe request chunks dynamically
    let uploadedBytes = 0;
    req.on('data', (chunk) => {
      proxyReq.write(chunk);
      uploadedBytes += chunk.length;
      if (mainWindow && fileSize > 0) {
        const progress = Math.round((uploadedBytes / fileSize) * 90);
        mainWindow.webContents.send('ota-progress', { status: 'uploading', progress: 10 + progress });
      }
    });
    
    req.on('end', () => {
      proxyReq.write(footer);
      proxyReq.end();
    });
  });

  const primaryPort = appConfig.otaPort;
  const fallbackPort = 5000;

  otaLocalServer = http.createServer(expressApp);
  
  otaLocalServer.on('error', (err) => {
    if (err.code === 'EACCES') {
      console.warn(`[OTA SERVER] Port ${primaryPort} requires administrator privileges. Falling back to port ${fallbackPort}.`);
      otaLocalServer.listen(fallbackPort, '127.0.0.1', () => {
        if (mainWindow) {
          mainWindow.webContents.send('console-log', `[OTA LOCAL] Portal started: http://localhost:${fallbackPort} (Port 500 requires Admin privileges).`);
        }
      });
    }
  });

  otaLocalServer.listen(primaryPort, '127.0.0.1', () => {
    if (mainWindow) {
      mainWindow.webContents.send('console-log', `[OTA LOCAL] Portal started: http://localhost:${primaryPort}`);
    }
  });
}

app.whenReady().then(() => {
  db.connectDatabase(appConfig.mongoUri);
  startExpressServer();
  startOtaLocalServer();
  createWindow();

  // Start background WiFi and UDP auto-discovery scanning
  if (mainWindow) {
    startBackgroundScanning(mainWindow.webContents);
  }

  // USB physical cable polling (Requirement 5)
  let lastUsbDetected = false;
  let detectedPortPath = null;
  setInterval(async () => {
    try {
      const ports = await SerialPort.list();
      // ESP32 usually has manufacturer containing 'Silicon Labs', 'WCH', 'Expressif', 'Arduino', or CH340
      const espPort = ports.find(p => 
        (p.manufacturer && (
          p.manufacturer.toLowerCase().includes('silicon') || 
          p.manufacturer.toLowerCase().includes('wch') || 
          p.manufacturer.toLowerCase().includes('usb') || 
          p.manufacturer.toLowerCase().includes('espressif') || 
          p.manufacturer.toLowerCase().includes('arduino')
        )) || p.path.toLowerCase().includes('usb')
      ) || ports[0]; // fallback to first port if list is not empty

      const usbDetected = ports.length > 0;
      const currentPortPath = usbDetected ? (espPort ? espPort.path : ports[0].path) : null;
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('usb-detect-status', {
          detected: usbDetected,
          port: currentPortPath,
          ports: ports.map(p => ({ path: p.path, manufacturer: p.manufacturer || 'Generic Serial Device' }))
        });
      }
    } catch (e) {
      console.error('[USB POLLER] Error listing ports:', e.message);
    }
  }, 2000);

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

let backgroundScanInterval = null;

function startBackgroundScanning(webContents) {
  if (backgroundScanInterval) clearInterval(backgroundScanInterval);

  backgroundScanInterval = setInterval(() => {
    // 1. WiFi SSID Scanning (Windows only) to detect nearby ESP32 Access Points
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec('netsh wlan show networks', (err, stdout, stderr) => {
        if (!err && stdout) {
          const lines = stdout.split('\n');
          const detectedSsids = [];
          for (let line of lines) {
            if (line.includes('SSID')) {
              const parts = line.split(':');
              if (parts.length > 1) {
                const ssid = parts[1].trim();
                if (ssid.startsWith('ESP32_GATEWAY_')) {
                  detectedSsids.push(ssid);
                }
              }
            }
          }
          if (webContents && !webContents.isDestroyed()) {
            webContents.send('wifi-scan-status', { nearbyGateways: detectedSsids });
          }
        }
      });
    }

    // 2. Background UDP Discovery targeting local subnet and direct SoftAP IP 192.168.4.1
    try {
      const socket = dgram.createSocket('udp4');
      socket.bind(0, () => {
        socket.setBroadcast(true);
        const message = Buffer.from('DISCOVER_IOT_GATEWAY');
        
        // Target A: Subnet broadcast
        socket.send(message, 0, message.length, appConfig.udpPort, '255.255.255.255', (err) => {
          if (err) console.error('[UDP BG] Broadcast error:', err.message);
        });

        // Target B: Direct ESP32 SoftAP gateway IP (192.168.4.1)
        socket.send(message, 0, message.length, appConfig.udpPort, '192.168.4.1', (err) => {
          if (err) console.error('[UDP BG] Direct IP error:', err.message);
        });
      });

      socket.on('message', (msg, rinfo) => {
        try {
          const payload = JSON.parse(msg.toString());
          if (webContents && !webContents.isDestroyed()) {
            webContents.send('gateway-discovered', payload);
          }
          try { socket.close(); } catch (e) {}
        } catch (e) {
          console.error('[UDP BG] Parse error:', e);
        }
      });

      setTimeout(() => {
        try {
          if (socket && !socket.closed) {
            socket.close();
          }
        } catch (e) {}
      }, 1500);
    } catch (e) {
      console.error('[UDP BG] Socket error:', e.message);
    }
  }, 4000);
}

// Helper: Cleanup active network and serial connections
function cleanupConnections() {
  if (backgroundScanInterval) {
    clearInterval(backgroundScanInterval);
    backgroundScanInterval = null;
  }
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

      // De-assert DTR & RTS to release reset state and allow booting
      /*
      activeSerialPort.set({ dtr: false, rts: false }, (setErr) => {
        if (setErr) console.warn('[SERIAL] Failed to set DTR/RTS initial lines:', setErr.message);
      });
      */

      // Explicit hardware reset EN toggle on opening connection to ensure firmware boots automatically (Requirement 2)
      activeSerialPort.set({ dtr: false, rts: true }, (setErr) => {
        if (!setErr) {
          setTimeout(() => {
            activeSerialPort.set({ dtr: false, rts: false }, (resetErr) => {
              if (!resetErr) {
                event.reply('console-log', '[SERIAL] Hardware auto-reset triggered on connection open. Booting gateway...');
              }
            });
          }, 100);
        }
      });

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
              if (payload.type === 'telemetry') {
                event.reply('telemetry-payload', payload);
                db.saveTelemetrySnapshot(payload);
              } else {
                event.reply('hardware-payload', payload);
              }
            } catch (e) {
              event.reply('console-log', `[ERROR] Failed to parse serial JSON: ${e.message}`);
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
          db.saveTelemetrySnapshot(payload);
        } else if (payload.type === 'control_status') {
          event.reply('control-payload-sync', payload);
        } else if (payload.type === 'pong') {
          event.reply('ping-pong-reply');
        } else if (payload.status) {
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

/*
ipcMain.on('start-ota', (event, { filePath, ip, port, target }) => {
  const gatewayIP = ip || '192.168.4.1';
  const gatewayPort = parseInt(port) || 8000;
  const targetName = target || 'esp32';
  event.reply('console-log', `[OTA] Streaming binary firmware for ${targetName.toUpperCase()} to http://${gatewayIP}:${gatewayPort}/update?target=${targetName}...`);

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
      port: gatewayPort,
      path: `/update?target=${targetName}`,
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
          event.reply('ota-progress', { status: 'success', progress: 100, target: targetName });
          if (targetName === 'esp32') {
            event.reply('console-log', '[OTA] Upgrade completed! Router reboot triggered.');
          } else {
            event.reply('console-log', '[OTA] QCOM Co-processor flash update completed successfully!');
          }
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
*/

// Updated buffer-based start-ota handler to resolve file path limitations inside web app context
ipcMain.on('start-ota', (event, { fileBuffer, filename, ip, port, target }) => {
  const gatewayIP = ip || '192.168.4.1';
  const gatewayPort = parseInt(port) || 8000;
  const targetName = target || 'esp32';
  event.reply('console-log', `[OTA] Streaming buffer-based binary firmware for ${targetName.toUpperCase()} to http://${gatewayIP}:${gatewayPort}/update?target=${targetName}...`);

  if (!fileBuffer) {
    event.reply('ota-progress', { status: 'error', message: 'Binary file buffer is empty.' });
    return;
  }

  try {
    const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
    const fileSize = buffer.length;
    
    const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
    
    const header = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="update"; filename="${filename || 'firmware.bin'}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    
    const totalLength = header.length + fileSize + footer.length;
    
    const options = {
      hostname: gatewayIP,
      port: gatewayPort,
      path: `/update?target=${targetName}`,
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
          event.reply('ota-progress', { status: 'success', progress: 100, target: targetName });
          if (targetName === 'esp32') {
            event.reply('console-log', '[OTA] Upgrade completed! Router reboot triggered.');
          } else {
            event.reply('console-log', '[OTA] QCOM Co-processor flash update completed successfully!');
          }
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
    
    const { Readable } = require('stream');
    const fileStream = Readable.from(buffer);
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

// IPC Handler: upload-certificate to ESP32 WebServer via HTTP POST
ipcMain.on('upload-certificate', (event, { filePath, ip }) => {
  const gatewayIP = ip || '192.168.4.1';
  event.reply('console-log', `[SPIFFS] Uploading certificate ${path.basename(filePath)} to http://${gatewayIP}:8000/upload_cert...`);
  
  if (!fs.existsSync(filePath)) {
    event.reply('console-log', `[ERROR] Certificate file not found: ${filePath}`);
    event.reply('hardware-payload', { status: 'CERT_ERROR', filename: path.basename(filePath), message: 'File not found' });
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);
    
    const options = {
      hostname: gatewayIP,
      port: 8000,
      path: `/upload_cert?filename=${encodeURIComponent(filename)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(content)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          event.reply('console-log', `[SPIFFS] Certificate ${filename} uploaded successfully to gateway.`);
          // The gateway will also broadcast its CERT_ADDED JSON payload over the socket,
          // but we can reply with confirmation here as a fallback or extra validation.
        } else {
          event.reply('console-log', `[ERROR] Certificate upload failed. Status: ${res.statusCode} - ${responseData}`);
          event.reply('hardware-payload', { status: 'CERT_ERROR', filename, message: `Upload failed: status ${res.statusCode}` });
        }
      });
    });
    
    req.on('error', (err) => {
      event.reply('console-log', `[ERROR] Certificate upload HTTP error: ${err.message}`);
      event.reply('hardware-payload', { status: 'CERT_ERROR', filename, message: err.message });
    });
    
    req.write(content);
    req.end();
    
  } catch (err) {
    event.reply('console-log', `[EXCEPTION] Failed to upload certificate: ${err.message}`);
    event.reply('hardware-payload', { status: 'CERT_ERROR', filename: path.basename(filePath), message: err.message });
  }
});

// Hardware DTR/RTS Resets & Boot Control
ipcMain.on('reset-device', (event) => {
  if (activeSerialPort && activeSerialPort.isOpen) {
    event.reply('console-log', '[SERIAL] Toggling EN/RST pin (RTS) to reset ESP32...');
    // RTS = true, DTR = false (EN pulled low)
    activeSerialPort.set({ dtr: false, rts: true }, () => {
      setTimeout(() => {
        // RTS = false, DTR = false (EN goes high, boots)
        activeSerialPort.set({ dtr: false, rts: false }, () => {
          event.reply('console-log', '[SERIAL] ESP32 reset complete. Device booting...');
        });
      }, 100);
    });
  } else {
    event.reply('console-log', '[ERROR] Serial port not open. Cannot reset.');
  }
});

ipcMain.on('enter-bootloader', (event) => {
  if (activeSerialPort && activeSerialPort.isOpen) {
    event.reply('console-log', '[SERIAL] Putting ESP32 into ROM bootloader mode...');
    // Reset into bootloader: EN low, GPIO0 low
    // 1. RTS = true, DTR = false (Reset pin EN goes low)
    activeSerialPort.set({ dtr: false, rts: true }, () => {
      setTimeout(() => {
        // 2. RTS = true, DTR = true (GPIO0 goes low while EN is low)
        activeSerialPort.set({ dtr: true, rts: true }, () => {
          setTimeout(() => {
            // 3. RTS = false, DTR = true (EN goes high while GPIO0 is held low)
            activeSerialPort.set({ dtr: true, rts: false }, () => {
              setTimeout(() => {
                // 4. RTS = false, DTR = false (release lines)
                activeSerialPort.set({ dtr: false, rts: false }, () => {
                  event.reply('console-log', '[SERIAL] ESP32 is now in bootloader mode. Ready for .ino flash.');
                });
              }, 50);
            });
          }, 50);
        });
      }, 50);
    });
  } else {
    event.reply('console-log', '[ERROR] Serial port not open. Cannot trigger bootloader.');
  }
});

// Network Discovery
ipcMain.on('start-udp-discovery', (event) => {
  event.reply('console-log', '[UDP] Scanning network for IoT Gateway devices...');
  const socket = dgram.createSocket('udp4');
  
  socket.bind(0, () => {
    socket.setBroadcast(true);
    const message = Buffer.from('DISCOVER_IOT_GATEWAY');
    
    // Broadcast on default interface
    socket.send(message, 0, message.length, appConfig.udpPort, '255.255.255.255', (err) => {
      if (err) {
        event.reply('console-log', `[UDP ERROR] Broadcast failed: ${err.message}`);
      }
    });

    // Send directly to ESP32 SoftAP default IP (192.168.4.1) for router-less setups
    socket.send(message, 0, message.length, appConfig.udpPort, '192.168.4.1', (err) => {
      if (err) {
        event.reply('console-log', `[UDP ERROR] Direct send to 192.168.4.1 failed: ${err.message}`);
      }
    });
  });

  socket.on('message', (msg, rinfo) => {
    try {
      const payload = JSON.parse(msg.toString());
      event.reply('gateway-discovered', payload);
      event.reply('console-log', `[UDP] Discovered gateway at ${payload.ip} (IMEI: ${payload.imei})`);
      try { socket.close(); } catch (e) {}
    } catch (e) {
      console.error('[UDP] Failed to parse reply:', e);
    }
  });

  setTimeout(() => {
    try {
      if (socket && !socket.closed) {
        socket.close();
        event.reply('console-log', '[UDP] Discovery scan complete.');
        event.reply('discovery-timeout');
      }
    } catch (e) {}
  }, 3000);
});

// Dynamic Certificate Downloader & Provisioner
/*
ipcMain.on('download-and-provision-certs', async (event, { baseUrl, ip }) => {
  const gatewayIP = ip || '192.168.4.1';
  event.reply('console-log', `[CERTS] Downloading certificates from: ${baseUrl}...`);
  
  const files = ['aws_root_ca.pem', 'device_cert.crt', 'private_key.key'];
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${file}`;
      
      event.reply('console-log', `[CERTS] Downloading ${file} (${i+1}/3)...`);
      
      const content = await new Promise((resolve, reject) => {
        const client = baseUrl.startsWith('https') ? require('https') : http;
        client.get(fileUrl, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download ${file}, HTTP Code: ${res.statusCode}`));
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk.toString());
          res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
      });
      
      event.reply('console-log', `[CERTS] Uploading ${file} to ESP32 SPIFFS...`);
      
      await new Promise((resolve, reject) => {
        const options = {
          hostname: gatewayIP,
          port: 8000,
          path: `/upload_cert?filename=${encodeURIComponent(file)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(content)
          }
        };
        
        const req = http.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk.toString(); });
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed. Code ${res.statusCode}: ${responseData}`));
            }
          });
        });
        
        req.on('error', err => reject(err));
        req.write(content);
        req.end();
      });
      
      event.reply('console-log', `[CERTS] Certificate ${file} synchronized to ESP32.`);
    }
    
    event.reply('console-log', '[CERTS] All certificates uploaded and synced successfully!');
    event.reply('provision-certs-status', { status: 'success' });
  } catch (err) {
    event.reply('console-log', `[CERTS ERROR] Provisioning failed: ${err.message}`);
    event.reply('provision-certs-status', { status: 'error', message: err.message });
  }
});
*/

// Updated Certificate Downloader supporting 3 separate URLs and auto-syncing to QCOM (Requirement 3)
/*
ipcMain.on('download-and-provision-certs', async (event, { urls, ip }) => {
  const gatewayIP = ip || '192.168.4.1';
  event.reply('console-log', `[CERTS] Starting download of 3 certificates from separate URLs...`);
  
  try {
    const files = Object.keys(urls);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = urls[file];
      
      event.reply('console-log', `[CERTS] Downloading ${file} from: ${fileUrl}...`);
      
      const content = await new Promise((resolve, reject) => {
        const client = fileUrl.startsWith('https') ? require('https') : http;
        client.get(fileUrl, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download ${file}, HTTP Code: ${res.statusCode}`));
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk.toString());
          res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
      });
      
      event.reply('console-log', `[CERTS] Uploading ${file} to ESP32 SPIFFS...`);
      
      await new Promise((resolve, reject) => {
        const options = {
          hostname: gatewayIP,
          port: 8000,
          path: `/upload_cert?filename=${encodeURIComponent(file)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(content)
          }
        };
        
        const req = http.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk.toString(); });
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed. Code ${res.statusCode}: ${responseData}`));
            }
          });
        });
        
        req.on('error', err => reject(err));
        req.write(content);
        req.end();
      });
      
      event.reply('console-log', `[CERTS] Certificate ${file} uploaded to SPIFFS successfully.`);
    }
    
    event.reply('console-log', '[CERTS] All certificates provisioned to ESP32. Immediately triggering QCOM sync via arduino command...');
    
    // Trigger certificate transfer to QCOM storage immediately (Requirement 3)
    if (activeTcpSocket && !activeTcpSocket.destroyed) {
      activeTcpSocket.write('SYNC_CERTS_TO_QCOM\n');
    } else if (activeSerialPort && activeSerialPort.isOpen) {
      activeSerialPort.write('SYNC_CERTS_TO_QCOM\n');
    }
    
    event.reply('provision-certs-status', { status: 'success' });
  } catch (err) {
    event.reply('console-log', `[CERTS ERROR] Provisioning failed: ${err.message}`);
    event.reply('provision-certs-status', { status: 'error', message: err.message });
  }
});
*/

ipcMain.on('download-and-provision-certs', async (event, { urls, ip }) => {
  const gatewayIP = ip || '192.168.4.1';
  event.reply('console-log', `[CERTS] Starting step-by-step certificate provisioning process...`);
  
  const scratchDir = path.join(__dirname, 'scratch', 'certs');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  try {
    const files = Object.keys(urls);
    
    // Step 1: Download all files locally first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = urls[file];
      const localFilePath = path.join(scratchDir, file);
      
      event.reply('console-log', `[CERTS] [STEP 1/3] Downloading ${file} locally from: ${fileUrl}...`);
      
      const content = await new Promise((resolve, reject) => {
        const client = fileUrl.startsWith('https') ? require('https') : http;
        client.get(fileUrl, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download ${file}, HTTP Code: ${res.statusCode}`));
            return;
          }
          let data = '';
          res.on('data', chunk => data += chunk.toString());
          res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
      });
      
      fs.writeFileSync(localFilePath, content, 'utf8');
      event.reply('console-log', `[CERTS] Downloaded locally to: scratch/certs/${file} (Size: ${Buffer.byteLength(content)} bytes).`);
    }
    
    // Step 2: Upload locally stored files to ESP32 SPIFFS
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const localFilePath = path.join(scratchDir, file);
      
      event.reply('console-log', `[CERTS] [STEP 2/3] Uploading ${file} from local storage to ESP32 SPIFFS...`);
      
      const content = fs.readFileSync(localFilePath, 'utf8');
      
      await new Promise((resolve, reject) => {
        const options = {
          hostname: gatewayIP,
          port: 8000,
          path: `/upload_cert?filename=${encodeURIComponent(file)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(content)
          }
        };
        
        const req = http.request(options, (res) => {
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk.toString(); });
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed. Code ${res.statusCode}: ${responseData}`));
            }
          });
        });
        
        req.on('error', err => reject(err));
        req.write(content);
        req.end();
      });
      
      event.reply('console-log', `[WIFI] Certificate ${file} uploaded to SPIFFS successfully.`);
    }
    
    // Step 3: Sync to QCOM via serial channel
    event.reply('console-log', '[CERTS] [STEP 3/3] Initiating sync from ESP32 to QCOM co-processor storage...');
    if (activeTcpSocket && !activeTcpSocket.destroyed) {
      activeTcpSocket.write('SYNC_CERTS_TO_QCOM\n');
    } else if (activeSerialPort && activeSerialPort.isOpen) {
      activeSerialPort.write('SYNC_CERTS_TO_QCOM\n');
    }
    
    event.reply('console-log', '[CERTS] All certificates successfully provisioned from URL -> Local -> ESP32 -> QCOM channel.');
    event.reply('provision-certs-status', { status: 'success' });
  } catch (err) {
    event.reply('console-log', `[CERTS ERROR] Provisioning failed: ${err.message}`);
    event.reply('provision-certs-status', { status: 'error', message: err.message });
  }
});

// IPC Handler: Download firmware from URL locally and flash to ESP32 (Requirement 3)
ipcMain.on('download-and-flash-firmware', async (event, { firmwareUrl, ip, port, target }) => {
  const gatewayIP = ip || '192.168.4.1';
  const gatewayPort = parseInt(port) || 8000;
  const targetName = target || 'esp32';
  
  event.reply('console-log', `[OTA] [STEP 1/2] Initiating firmware download from: ${firmwareUrl}...`);
  
  const tempPath = path.join(__dirname, 'scratch', `remote_firmware_${Date.now()}.bin`);
  if (!fs.existsSync(path.dirname(tempPath))) {
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
  }
  
  try {
    // 1. Download file to local storage
    const contentSize = await new Promise((resolve, reject) => {
      const client = firmwareUrl.startsWith('https') ? require('https') : http;
      client.get(firmwareUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download firmware. HTTP Code: ${res.statusCode}`));
          return;
        }
        
        const fileStream = fs.createWriteStream(tempPath);
        res.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(fs.statSync(tempPath).size);
        });
        
        fileStream.on('error', err => reject(err));
      }).on('error', err => reject(err));
    });
    
    event.reply('console-log', `[OTA] Firmware downloaded locally to: scratch/ (Size: ${Math.round(contentSize/1024)} KB)`);
    event.reply('console-log', `[OTA] [STEP 2/2] Streaming locally stored firmware to gateway http://${gatewayIP}:${gatewayPort}/update...`);
    
    // 2. Perform upload from local temporary file
    const boundary = '----WebKitFormBoundaryIoT' + Math.random().toString(36).substring(2);
    const filename = 'firmware.bin';
    
    const header = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="update"; filename="${filename}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;
    const footer = `\r\n--${boundary}--\r\n`;
    const totalLength = header.length + contentSize + footer.length;
    
    const options = {
      hostname: gatewayIP,
      port: gatewayPort,
      path: `/update?target=${targetName}`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength,
        'Connection': 'close'
      }
    };
    
    event.reply('ota-progress', { status: 'uploading', progress: 0 });
    
    const proxyReq = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk.toString(); });
      res.on('end', () => {
        try { fs.unlinkSync(tempPath); } catch (e) {}
        
        if (res.statusCode === 200 && responseData.toUpperCase().includes('OK')) {
          event.reply('ota-progress', { status: 'success', progress: 100, target: targetName });
          event.reply('console-log', `[OTA] Flash succeeded. Gateway processed ${targetName.toUpperCase()} firmware update.`);
        } else {
          event.reply('ota-progress', { status: 'error', message: responseData });
        }
      });
    });
    
    proxyReq.on('error', (err) => {
      try { fs.unlinkSync(tempPath); } catch (e) {}
      event.reply('ota-progress', { status: 'error', message: err.message });
    });
    
    proxyReq.write(header);
    
    const fileStream = fs.createReadStream(tempPath, { highWaterMark: 32768 });
    let bytesSent = 0;
    
    fileStream.on('data', (chunk) => {
      proxyReq.write(chunk);
      bytesSent += chunk.length;
      const progress = Math.round((bytesSent / contentSize) * 100);
      event.reply('ota-progress', { status: 'uploading', progress: progress });
    });
    
    fileStream.on('end', () => {
      proxyReq.write(footer);
      proxyReq.end();
    });
    
  } catch (err) {
    try { fs.unlinkSync(tempPath); } catch (e) {}
    event.reply('ota-progress', { status: 'error', message: err.message });
    event.reply('console-log', `[OTA ERROR] Failed URL flash update: ${err.message}`);
  }
});

// Database dynamic reconnection IPC listener (Requirement 6)
ipcMain.on('reconnect-database', (event, { uri }) => {
  event.reply('console-log', `[DATABASE] Reconnect request received for: ${uri}`);
  
  // Save URI to persistent config
  saveConfig({ mongoUri: uri });
  
  db.connectDatabase(uri);
  setTimeout(() => {
    event.reply('database-connection-result', {
      connected: db.isDbConnected(),
      message: db.isDbConnected() ? 'Database connected successfully.' : 'Database connection failed.'
    });
  }, 3500);
});

// App configuration IPC channels (Requirement 6)
ipcMain.handle('get-app-config', () => {
  return appConfig;
});

ipcMain.on('save-app-config', (event, newConfig) => {
  saveConfig(newConfig);
  event.reply('console-log', '[CONFIG] App configuration updated successfully.');
  event.reply('app-config-saved', appConfig);
});

