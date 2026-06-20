const { ipcRenderer } = require('electron');

// UI Selectors
const btnMinimize = document.getElementById('btn-minimize');
const btnMaximize = document.getElementById('btn-maximize');
const btnClose = document.getElementById('btn-close');

const navItems = document.querySelectorAll('.nav-item');
const pageViews = document.querySelectorAll('.page-view');

const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Connections Controls
const selectSerialPort = document.getElementById('serial-port-select');
const btnRefreshPorts = document.getElementById('btn-refresh-ports');
const selectSerialBaud = document.getElementById('serial-baud');
const btnConnectSerial = document.getElementById('btn-connect-serial');
const btnBootTrigger = document.getElementById('btn-boot-trigger');

const inputWifiIp = document.getElementById('wifi-ip');
const inputWifiPort = document.getElementById('wifi-port');
const btnConnectWifi = document.getElementById('btn-connect-wifi');

const btnDisconnect = document.getElementById('btn-disconnect');
const globalConnPill = document.getElementById('global-conn-pill');
const connIndicatorDot = document.getElementById('conn-indicator-dot');
const connIndicatorText = document.getElementById('conn-indicator-text');
const connDetailsSub = document.getElementById('conn-details-sub');

// Diagnostics & Data info
const diagImei = document.getElementById('diag-imei');
const diagMac = document.getElementById('diag-mac');
const diagItems = {
  rs232: document.getElementById('diag-rs232'),
  rs485: document.getElementById('diag-rs485'),
  gprs: document.getElementById('diag-gprs'),
  bus: document.getElementById('diag-bus'),
  ap: document.getElementById('diag-ap'),
  flash: document.getElementById('diag-flash'),
  di: document.getElementById('diag-di'),
  driver: document.getElementById('diag-driver'),
  rtc: document.getElementById('diag-rtc')
};

// Telemetry Grid
const deviceCountSpan = document.getElementById('device-count');
const gridPlaceholder = document.getElementById('grid-placeholder-box');
const devicesGrid = document.getElementById('devices-grid');

// OTA Updates
const inputOtaIp = document.getElementById('ota-ip');
const otaDropZone = document.getElementById('ota-drop-zone');
const otaFileInput = document.getElementById('ota-file-input');
const btnBrowseBin = document.getElementById('btn-browse-bin');
const selectedFileInfo = document.getElementById('selected-file-info');
const selectedFileName = document.getElementById('selected-file-name');
const selectedFileSize = document.getElementById('selected-file-size');
const otaProgressBox = document.getElementById('ota-progress-box');
const otaStatusText = document.getElementById('ota-status-text');
const otaPercentText = document.getElementById('ota-percent-text');
const otaBarFill = document.getElementById('ota-bar-fill');
const btnStartOta = document.getElementById('btn-start-ota');

// Terminal Log
const consoleTerminal = document.getElementById('console-terminal-lines');
const btnClearLogs = document.getElementById('btn-clear-logs');

// App Variables
let currentConnection = { type: null, target: null };
let selectedOtaFilePath = null;

// ==========================================================================
// FRAMELESS TITLEBAR HANDLERS
// ==========================================================================
btnMinimize.addEventListener('click', () => ipcRenderer.send('window-minimize'));
btnMaximize.addEventListener('click', () => ipcRenderer.send('window-maximize'));
btnClose.addEventListener('click', () => ipcRenderer.send('window-close'));


// ==========================================================================
// NAVIGATION TAB SWITCHING
// ==========================================================================
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const targetId = item.getAttribute('data-target');
    
    // Toggle navigation button active states
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    // Toggle pages display
    pageViews.forEach(page => {
      if (page.id === targetId) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
  });
});

// Connection Panels Tab Switching
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');

    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    tabContents.forEach(content => {
      if (content.id === targetTab) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  });
});


// ==========================================================================
// CONNECTION INTERFACE LOGIC
// ==========================================================================

// Refresh Serial COM Ports
async function refreshSerialPorts() {
  selectSerialPort.innerHTML = '<option value="">Scanning...</option>';
  const ports = await ipcRenderer.invoke('list-ports');
  selectSerialPort.innerHTML = '';
  
  if (ports.length === 0) {
    selectSerialPort.innerHTML = '<option value="">No ports detected</option>';
    return;
  }

  ports.forEach(port => {
    const opt = document.createElement('option');
    opt.value = port.path;
    opt.textContent = `${port.path} - ${port.manufacturer}`;
    selectSerialPort.appendChild(opt);
  });
}

btnRefreshPorts.addEventListener('click', (e) => {
  e.preventDefault();
  refreshSerialPorts();
});

// Initial scan
refreshSerialPorts();

// Connect Serial Click
btnConnectSerial.addEventListener('click', () => {
  const portPath = selectSerialPort.value;
  const baudRate = selectSerialBaud.value;
  
  if (!portPath) {
    alert('Please select a valid COM port.');
    return;
  }

  ipcRenderer.send('connect-serial', { portPath, baudRate });
});

// Start Boot Serial Command Trigger
btnBootTrigger.addEventListener('click', () => {
  ipcRenderer.send('send-serial-command', 'START_BOOT');
});

// Connect WiFi TCP Socket
btnConnectWifi.addEventListener('click', () => {
  const ip = inputWifiIp.value;
  const port = inputWifiPort.value;

  if (!ip || !port) {
    alert('Please enter a valid IP address and Port.');
    return;
  }

  ipcRenderer.send('connect-tcp', { ip, port });
});

// Disconnect active
btnDisconnect.addEventListener('click', () => {
  ipcRenderer.send('disconnect-active');
});


// ==========================================================================
// MAIN CONTROLLER AND IPC STATUS UPDATES
// ==========================================================================

// Watch Connection Status Changes from Main Process
ipcRenderer.on('connection-status', (event, data) => {
  if (data.status === 'connected') {
    currentConnection.type = data.type;
    currentConnection.target = data.target;

    // UI Updates
    globalConnPill.textContent = data.type === 'serial' ? 'SERIAL ACTIVE' : 'SOCKET ACTIVE';
    globalConnPill.className = 'connection-pill connected';
    
    connIndicatorDot.className = 'pulse-dot connected';
    connIndicatorText.textContent = 'Connected';
    connDetailsSub.innerHTML = `Mode: ${data.type.toUpperCase()}<br>Target: ${data.target}`;

    // Show disconnect and hide input tabs
    btnDisconnect.style.display = 'block';
    document.querySelector('.tabs-control').style.display = 'none';
    tabContents.forEach(c => c.style.display = 'none');

    // Handle Boot Command Activation for Serial
    if (data.type === 'serial') {
      btnBootTrigger.disabled = false;
    } else {
      btnBootTrigger.disabled = true;
    }
  } else if (data.status === 'disconnected' || data.status === 'error') {
    currentConnection.type = null;
    currentConnection.target = null;

    globalConnPill.textContent = 'DISCONNECTED';
    globalConnPill.className = 'connection-pill';
    
    connIndicatorDot.className = 'pulse-dot idle';
    connIndicatorText.textContent = 'Not Connected';
    connDetailsSub.innerHTML = data.status === 'error' ? `<span style="color:var(--accent-red)">${data.message}</span>` : 'Gateway Offline';

    // Toggle Panels
    btnDisconnect.style.display = 'none';
    document.querySelector('.tabs-control').style.display = 'flex';
    tabContents.forEach(c => c.style.display = '');
    
    btnBootTrigger.disabled = true;

    if (data.status === 'error') {
      alert(`Connection Error: ${data.message}`);
    }
  }
});


// ==========================================================================
// SYSTEM LOG TERMINAL SCREEN
// ==========================================================================
function appendLogLine(line, type = 'normal') {
  const lineElement = document.createElement('div');
  lineElement.className = `terminal-line ${type}`;
  
  // Highlighting prefixes
  let lowerLine = line.toLowerCase();
  if (lowerLine.includes('[error]') || lowerLine.includes('fail')) {
    lineElement.classList.add('error');
  } else if (lowerLine.includes('success') || lowerLine.includes('ok')) {
    lineElement.classList.add('success');
  } else if (lowerLine.includes('[diagnostic]')) {
    lineElement.classList.add('system');
  } else if (lowerLine.includes('[tx]')) {
    lineElement.classList.add('tx');
  } else if (lowerLine.includes('[telemetry]')) {
    lineElement.classList.add('rx');
  }

  lineElement.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
  consoleTerminal.appendChild(lineElement);
  
  // Auto Scroll
  consoleTerminal.scrollTop = consoleTerminal.scrollHeight;
  
  // Cap history to 500 lines to avoid memory leak
  if (consoleTerminal.children.length > 500) {
    consoleTerminal.removeChild(consoleTerminal.firstChild);
  }
}

ipcRenderer.on('console-log', (event, message) => {
  appendLogLine(message);
});

btnClearLogs.addEventListener('click', () => {
  consoleTerminal.innerHTML = '<div class="terminal-line system">-- Logs Cleared. --</div>';
});


// ==========================================================================
// DIAGNOSTICS & TELEMETRY LIVE UPDATES
// ==========================================================================

// Reset Diagnostics
function resetDiagnostics() {
  diagImei.textContent = 'IMEI: --';
  diagMac.textContent = 'MAC: --';
  
  Object.keys(diagItems).forEach(key => {
    const el = diagItems[key];
    el.className = 'diag-item';
    el.querySelector('.diag-value').textContent = 'WAITING';
  });
}

// 9-Point Hardware Diagnostic Update
ipcRenderer.on('hardware-payload', (event, payload) => {
  if (payload.status === 'BOOT_SUCCESS') {
    diagImei.textContent = `IMEI: ${payload.imei || '--'}`;
    diagMac.textContent = `MAC: ${payload.mac || '--'}`;
    
    // Sync values on OTA inputs
    inputOtaIp.value = '192.168.4.1'; // standard gateway IP
    
    appendLogLine('[SYS] Valid boot diagnostics JSON payload parsed successfully.', 'success');

    if (payload.diagnostics) {
      Object.keys(payload.diagnostics).forEach(key => {
        const itemElement = diagItems[key];
        if (!itemElement) return;

        const isSuccess = payload.diagnostics[key];
        if (isSuccess) {
          itemElement.className = 'diag-item success';
          itemElement.querySelector('.diag-value').textContent = 'OK';
        } else {
          itemElement.className = 'diag-item error';
          itemElement.querySelector('.diag-value').textContent = 'ERROR';
        }
      });
    }
  }
});

// Telemetry Client Data Binding
ipcRenderer.on('telemetry-payload', (event, payload) => {
  if (payload.type === 'telemetry') {
    deviceCountSpan.textContent = payload.count || 0;
    
    // Hide empty state and show grid
    gridPlaceholder.style.display = 'none';
    devicesGrid.style.display = 'grid';

    // Loop through devices and append or update their cards
    payload.devices.forEach(device => {
      let card = document.getElementById(`device-card-${device.id}`);
      
      if (!card) {
        // Create new device card dynamically
        card = document.createElement('div');
        card.id = `device-card-${device.id}`;
        card.className = 'device-card';
        
        card.innerHTML = `
          <div class="device-card-header">
            <span class="device-id">NODE #${device.id}</span>
            <span class="device-status-badge">ONLINE</span>
          </div>
          <div class="device-metrics">
            <div class="device-metric">
              <span class="metric-label">Temp</span>
              <span class="metric-val temp-val">${device.temp}°C</span>
            </div>
            <div class="device-metric">
              <span class="metric-label">Signal</span>
              <span class="metric-val rssi-val">${device.rssi} dBm</span>
            </div>
            <div class="device-metric" style="grid-column: span 2;">
              <span class="metric-label">Battery</span>
              <div class="bat-wrapper">
                <div class="bat-bar-outer">
                  <div class="bat-bar-inner" style="width: ${device.bat}%"></div>
                </div>
                <span class="metric-val bat-val" style="font-size:11px;">${device.bat}%</span>
              </div>
            </div>
          </div>
        `;
        devicesGrid.appendChild(card);
      } else {
        // Update existing device card properties
        card.querySelector('.temp-val').textContent = `${device.temp}°C`;
        card.querySelector('.rssi-val').textContent = `${device.rssi} dBm`;
        card.querySelector('.bat-val').textContent = `${device.bat}%`;
        
        const batFill = card.querySelector('.bat-bar-inner');
        batFill.style.width = `${device.bat}%`;
        
        if (device.bat < 20) {
          batFill.classList.add('low');
        } else {
          batFill.classList.remove('low');
        }

        // Status update
        const statusBadge = card.querySelector('.device-status-badge');
        if (device.status === 'ONLINE') {
          card.classList.remove('offline');
          statusBadge.textContent = 'ONLINE';
        } else {
          card.classList.add('offline');
          statusBadge.textContent = 'OFFLINE';
        }
      }
    });
  }
});


// ==========================================================================
// OTA UPDATE DRAG AND DROP HANDLERS
// ==========================================================================

// Drag events
otaDropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  otaDropZone.classList.add('dragover');
});

otaDropZone.addEventListener('dragleave', () => {
  otaDropZone.classList.remove('dragover');
});

otaDropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  otaDropZone.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleOtaFileSelection(files[0]);
  }
});

// File click dialog browse
btnBrowseBin.addEventListener('click', (e) => {
  e.preventDefault();
  otaFileInput.click();
});

otaFileInput.addEventListener('change', () => {
  if (otaFileInput.files.length > 0) {
    handleOtaFileSelection(otaFileInput.files[0]);
  }
});

// Process Selected File
function handleOtaFileSelection(file) {
  if (!file.name.endsWith('.bin')) {
    alert('Invalid File Format. Please choose a compiled firmware binary (.bin) file.');
    return;
  }

  selectedOtaFilePath = file.path; // Absolute local file path (available in Electron)
  
  // Format sizes
  const sizeInKB = Math.round(file.size / 1024);
  
  selectedFileName.textContent = file.name;
  selectedFileSize.textContent = `${sizeInKB} KB`;
  
  selectedFileInfo.style.display = 'flex';
  btnStartOta.disabled = false;
  
  appendLogLine(`[OTA] Selected firmware file: ${file.name} (${sizeInKB} KB)`);
}

// Start Wireless Upload Trigger
btnStartOta.addEventListener('click', () => {
  if (!selectedOtaFilePath) return;

  const otaIp = inputOtaIp.value;
  if (!otaIp) {
    alert('Please enter the gateway IP address.');
    return;
  }

  // Lock UI inputs
  btnStartOta.disabled = true;
  otaDropZone.style.pointerEvents = 'none';
  
  // Init progress state
  otaProgressBox.style.display = 'block';
  otaBarFill.style.width = '0%';
  otaPercentText.textContent = '0%';
  otaStatusText.textContent = 'Uploading firmware...';
  otaBarFill.style.backgroundColor = ''; // Reset error red

  // Send start command to Main
  ipcRenderer.send('start-ota', { 
    filePath: selectedOtaFilePath, 
    ip: otaIp 
  });
});

// Process OTA progress responses from main.js
ipcRenderer.on('ota-progress', (event, update) => {
  if (update.status === 'uploading') {
    otaBarFill.style.width = `${update.progress}%`;
    otaPercentText.textContent = `${update.progress}%`;
    otaStatusText.textContent = `Streaming data: ${update.progress}%`;
  } else if (update.status === 'success') {
    otaBarFill.style.width = '100%';
    otaPercentText.textContent = '100%';
    otaStatusText.textContent = 'Update successful! Gateway is rebooting...';
    otaBarFill.style.background = 'var(--grad-emerald)';
    
    appendLogLine('[OTA] SUCCESS: Firmware update verified. Gateway rebooting in 3 seconds.', 'success');
    alert('Firmware update succeeded! The gateway will reboot now.');
    
    // Unlock UI
    resetOtaForm();
  } else if (update.status === 'error') {
    otaStatusText.textContent = `Error: ${update.message}`;
    otaBarFill.style.background = 'var(--accent-red)';
    btnStartOta.disabled = false;
    otaDropZone.style.pointerEvents = '';
    
    appendLogLine(`[OTA ERROR] Failed: ${update.message}`, 'error');
    alert(`OTA Update Failed:\n${update.message}`);
  }
});

function resetOtaForm() {
  btnStartOta.disabled = true;
  otaDropZone.style.pointerEvents = '';
  selectedFileInfo.style.display = 'none';
  selectedOtaFilePath = null;
  otaFileInput.value = '';
}
