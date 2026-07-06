import re

with open('main.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_handler_start = "ipcMain.on('download-and-provision-certs', async (event, { urls, ip, port }) => {"
idx_start = code.find(old_handler_start)

if idx_start == -1:
    old_handler_start = "ipcMain.on('download-and-provision-certs', async (event, { urls, ip }) => {"
    idx_start = code.find(old_handler_start)

if idx_start == -1:
    print("Failed to find download-and-provision-certs handler start")
    exit(1)

# Find the end of this ipcMain.on block (it ends before download-and-flash-firmware)
idx_end = code.find("ipcMain.on('download-and-flash-firmware'", idx_start)
if idx_end == -1:
    print("Failed to find next handler start")
    exit(1)

new_handler = """ipcMain.on('download-and-provision-certs', async (event, { urls, ip, port, target }) => {
  const gatewayIP = ip || '192.168.0.1';
  const targetPort1 = parseInt(port) || 8000;
  const targetPort2 = targetPort1 === 8000 ? (appConfig.otaPort || 500) : 8000;
  const isQcom = (target === 'qcom');

  event.reply('console-log', `[CERTS] Starting step-by-step certificate provisioning process (Target: ${target.toUpperCase()})...`);

  const scratchDir = path.join(__dirname, 'scratch', 'certs');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  try {
    const files = Object.keys(urls);

    // Step 1: Download all files locally first (with TLS verification bypass)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = urls[file];
      const localFilePath = path.join(scratchDir, file);

      event.reply('cert-status-update', { file, status: 'downloading' });
      event.reply('console-log', `[CERTS] [STEP 1/3] Downloading ${file} locally from: ${fileUrl}...`);

      try {
        const downloadFileWithRedirects = (initialUrl) => {
          return new Promise((resolve, reject) => {
            const fetchUrl = (currentUrl, redirectsRemaining = 5) => {
              if (redirectsRemaining === 0) {
                reject(new Error('Too many redirects'));
                return;
              }
              try {
                const urlObj = new URL(currentUrl);
                const isHttps = urlObj.protocol === 'https:';
                const client = isHttps ? require('https') : require('http');

                const getOptions = {
                  hostname: urlObj.hostname,
                  port: urlObj.port || (isHttps ? 443 : 80),
                  path: urlObj.pathname + urlObj.search,
                  method: 'GET',
                  rejectUnauthorized: false
                };

                client.get(getOptions, (res) => {
                  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    let redirectUrl = res.headers.location;
                    if (!redirectUrl.startsWith('http')) {
                      redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
                    }
                    event.reply('console-log', `[CERTS] Redirect encountered. Following to: ${redirectUrl}`);
                    fetchUrl(redirectUrl, redirectsRemaining - 1);
                    return;
                  }

                  if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download ${file}, HTTP Code: ${res.statusCode}`));
                    return;
                  }

                  let data = [];
                  res.on('data', chunk => data.push(chunk));
                  res.on('end', () => resolve(Buffer.concat(data).toString('utf8')));
                }).on('error', err => reject(err));
              } catch (e) {
                reject(e);
              }
            };
            fetchUrl(initialUrl);
          });
        };

        const content = await downloadFileWithRedirects(fileUrl);

        fs.writeFileSync(localFilePath, content, 'utf8');
        event.reply('cert-status-update', { file, status: 'downloaded' });
        event.reply('console-log', `[CERTS] Downloaded locally to: scratch/certs/${file} (Size: ${Buffer.byteLength(content)} bytes).`);
      } catch (err) {
        event.reply('cert-status-update', { file, status: 'failed' });
        throw err;
      }
    }

    if (isQcom) {
      // Step 2 for QCOM: Stream files directly over active serial/TCP interface
      event.reply('console-log', `[CERTS] [STEP 2/3] Streaming certificates directly to QCOM Co-processor over active channel...`);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const localFilePath = path.join(scratchDir, file);
        const content = fs.readFileSync(localFilePath, 'utf8');
        const formattedCertData = `--- START_CERT:${file} ---\\n${content}\\n--- END_CERT ---\\n`;

        event.reply('cert-status-update', { file, status: 'uploading' });
        if (activeTcpSocket && !activeTcpSocket.destroyed) {
          activeTcpSocket.write(formattedCertData);
          event.reply('console-log', `[CERTS] Streamed ${file} directly to QCOM via TCP socket.`);
        } else if (activeSerialPort && activeSerialPort.isOpen) {
          activeSerialPort.write(formattedCertData);
          event.reply('console-log', `[CERTS] Streamed ${file} directly to QCOM via Serial Port.`);
        } else {
          throw new Error('No active TCP socket or Serial Port connection to stream QCOM certificates.');
        }
        event.reply('cert-status-update', { file, status: 'success' });
      }

      // Step 3 for QCOM: Complete
      event.reply('console-log', `[CERTS] [STEP 3/3] Certificates stored directly to QCOM.`);
    } else {
      // Step 2 for ESP32: Upload locally stored files to ESP32 SPIFFS with Port Fallback
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const localFilePath = path.join(scratchDir, file);

        event.reply('cert-status-update', { file, status: 'uploading' });
        event.reply('console-log', `[CERTS] [STEP 2/3] Uploading ${file} from local storage to ESP32 SPIFFS...`);

        const content = fs.readFileSync(localFilePath, 'utf8');
        const contentBytes = Buffer.byteLength(content);

        const uploadToPort = (portNum) => {
          return new Promise((resolve, reject) => {
            const options = {
              hostname: gatewayIP,
              port: portNum,
              path: `/upload_cert?filename=${encodeURIComponent(file)}`,
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain',
                'Content-Length': contentBytes
              }
            };

            const req = http.request(options, (res) => {
              let responseData = '';
              res.on('data', (chunk) => { responseData += chunk.toString(); });
              res.on('end', () => {
                if (res.statusCode === 200) resolve();
                else reject(new Error(`Upload failed. Code ${res.statusCode}: ${responseData}`));
              });
            });
            req.on('error', err => reject(err));
            req.write(content);
            req.end();
          });
        };

        // Attempt 1: Upload to primary target port
        try {
          await uploadToPort(targetPort1);
          event.reply('cert-status-update', { file, status: 'success' });
          event.reply('console-log', `[WIFI] Certificate ${file} uploaded to SPIFFS on Port ${targetPort1}.`);
        } catch (err1) {
          event.reply('console-log', `[WIFI] Port ${targetPort1} upload failed: ${err1.message}. Retrying on fallback Port ${targetPort2}...`);

          // Attempt 2: Fallback to secondary port
          try {
            await uploadToPort(targetPort2);
            event.reply('cert-status-update', { file, status: 'success' });
            event.reply('console-log', `[WIFI] Certificate ${file} uploaded to SPIFFS on fallback Port ${targetPort2}.`);
          } catch (err2) {
            event.reply('cert-status-update', { file, status: 'failed' });
            throw err2;
          }
        }
      }

      // Step 3 for ESP32: Sync to QCOM via serial channel
      event.reply('console-log', '[CERTS] [STEP 3/3] Initiating sync from ESP32 to QCOM co-processor storage...');
      if (activeTcpSocket && !activeTcpSocket.destroyed) {
        activeTcpSocket.write('SYNC_CERTS_TO_QCOM\\n');
      } else if (activeSerialPort && activeSerialPort.isOpen) {
        activeSerialPort.write('SYNC_CERTS_TO_QCOM\\n');
      }
    }

    event.reply('console-log', `[CERTS] All certificates successfully provisioned to ${target.toUpperCase()}.`);
    event.reply('provision-certs-status', { status: 'success' });
  } catch (err) {
    event.reply('console-log', `[CERTS ERROR] Provisioning failed: ${err.message}`);
    event.reply('provision-certs-status', { status: 'error', message: err.message });
  }
});
"""

# Perform replacement
patched_code = code.replace(code[idx_start:idx_end], new_handler)

with open('main.js', 'w', encoding='utf-8') as f:
    f.write(patched_code)

print("Successfully patched main.js")
