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

// Advanced Switchboard Controls
const toggleRelay1 = document.getElementById('toggle-relay-1');
const toggleRelay2 = document.getElementById('toggle-relay-2');
const sliderInterval = document.getElementById('slider-interval');
const lblIntervalVal = document.getElementById('lbl-interval-val');
const btnRunSelfTest = document.getElementById('btn-run-selftest');
const pingLatencyBadge = document.getElementById('ping-latency-badge');

// Telemetry Grid & Filters
const deviceCountSpan = document.getElementById('device-count');
const gridPlaceholder = document.getElementById('grid-placeholder-box');
const devicesGrid = document.getElementById('devices-grid');
const searchDeviceId = document.getElementById('search-device-id');
const filterDeviceStatus = document.getElementById('filter-device-status');
const btnExportData = document.getElementById('btn-export-data');

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

// Application State Variables
let currentConnection = { type: null, target: null };
let selectedOtaFilePath = null;
let devicesCacheMap = new Map(); // Store complete list of subdevices

// Ping RTT latency variables
let pingIntervalId = null;
let lastPingTime = 0;
let awaitingPingResponse = false;

// ==========================================================================
// FRAMELESS WINDOW HANDLERS
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
    
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    pageViews.forEach(page => {
      if (page.id === targetId) {
        page.classList.add('active');
      } else {
        page.classList.remove('active');
      }
    });
  });
});

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
// INTERFACE CONTROLS & COMMAND ROUTER
// ==========================================================================

// Helper: Send configuration commands to the active interface
function sendGatewayCommand(command) {
  if (currentConnection.type === 'serial') {
    ipcRenderer.send('send-serial-command', command);
  } else if (currentConnection.type === 'tcp') {
    ipcRenderer.send('send-tcp-command', command);
  } else {
    appendLogLine(`[WARN] Cannot send command '${command}': Gateway disconnected.`, 'warning');
  }
}

// Refresh COM Ports
async function refreshSerialPorts() {
  selectSerialPort.innerHTML = '<option value="">Scanning COM ports...</option>';
  const ports = await ipcRenderer.invoke('list-ports');
  selectSerialPort.innerHTML = '';
  
  if (ports.length === 0) {
    selectSerialPort.innerHTML = '<option value="">No COM ports detected</option>';
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

// Run initial port refresh
refreshSerialPorts();

// Connect Serial
btnConnectSerial.addEventListener('click', () => {
  const portPath = selectSerialPort.value;
  const baudRate = selectSerialBaud.value;
  
  if (!portPath) {
    alert('Please select a valid COM port.');
    return;
  }

  ipcRenderer.send('connect-serial', { portPath, baudRate });
});

// START_BOOT Command Button
btnBootTrigger.addEventListener('click', () => {
  ipcRenderer.send('send-serial-command', 'START_BOOT');
});

// Connect WiFi Socket
btnConnectWifi.addEventListener('click', () => {
  const ip = inputWifiIp.value;
  const port = inputWifiPort.value;

  if (!ip || !port) {
    alert('Please enter a valid IP address and Port.');
    return;
  }

  ipcRenderer.send('connect-tcp', { ip, port });
});

// Disconnect
btnDisconnect.addEventListener('click', () => {
  ipcRenderer.send('disconnect-active');
});


// ==========================================================================
// PING / LATENCY MONITOR ROUTINE
// ==========================================================================
function startPingMonitor() {
  stopPingMonitor(); // Ensure clean start
  
  pingIntervalId = setInterval(() => {
    if (currentConnection.type === 'tcp' && !awaitingPingResponse) {
      lastPingTime = Date.now();
      awaitingPingResponse = true;
      ipcRenderer.send('send-tcp-command', 'PING');
    }
  }, 3000);
}

function stopPingMonitor() {
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  awaitingPingResponse = false;
  pingLatencyBadge.textContent = 'Offline';
  pingLatencyBadge.className = 'ping-result offline';
}

ipcRenderer.on('ping-pong-reply', () => {
  awaitingPingResponse = false;
  const rtt = Date.now() - lastPingTime;
  
  pingLatencyBadge.textContent = `${rtt} ms`;
  
  if (rtt < 30) {
    pingLatencyBadge.className = 'ping-result excellent';
  } else if (rtt < 100) {
    pingLatencyBadge.className = 'ping-result warning';
  } else {
    pingLatencyBadge.className = 'ping-result poor';
  }
});


// ==========================================================================
// CONNECTION STATE MANAGEMENT
// ==========================================================================
ipcRenderer.on('connection-status', (event, data) => {
  if (data.status === 'connected') {
    currentConnection.type = data.type;
    currentConnection.target = data.target;

    globalConnPill.textContent = data.type === 'serial' ? 'SERIAL ACTIVE' : 'SOCKET ACTIVE';
    globalConnPill.className = 'connection-pill connected';
    
    connIndicatorDot.className = 'pulse-dot connected';
    connIndicatorText.textContent = 'Connected';
    connDetailsSub.innerHTML = `Interface: ${data.type.toUpperCase()}<br>Node Target: ${data.target}`;

    btnDisconnect.style.display = 'block';
    document.querySelector('.tabs-control').style.display = 'none';
    tabContents.forEach(c => c.style.display = 'none');

    // Serial-specific overrides
    if (data.type === 'serial') {
      btnBootTrigger.disabled = false;
      pingLatencyBadge.textContent = 'USB Line';
      pingLatencyBadge.className = 'ping-result excellent';
    } else {
      btnBootTrigger.disabled = true;
      startPingMonitor();
    }
  } else if (data.status === 'disconnected' || data.status === 'error') {
    currentConnection.type = null;
    currentConnection.target = null;

    globalConnPill.textContent = 'DISCONNECTED';
    globalConnPill.className = 'connection-pill';
    
    connIndicatorDot.className = 'pulse-dot idle';
    connIndicatorText.textContent = 'Not Connected';
    connDetailsSub.innerHTML = data.status === 'error' ? `<span style="color:var(--accent-red)">${data.message}</span>` : 'Gateway Offline';

    btnDisconnect.style.display = 'none';
    document.querySelector('.tabs-control').style.display = 'flex';
    tabContents.forEach(c => c.style.display = '');
    
    btnBootTrigger.disabled = true;
    
    // Disable switchboard controls
    toggleRelay1.disabled = true;
    toggleRelay2.disabled = true;
    sliderInterval.disabled = true;
    btnRunSelfTest.disabled = true;

    stopPingMonitor();
    resetDiagnostics();

    if (data.status === 'error') {
      alert(`Connection Failed: ${data.message}`);
    }
  }
});


// ==========================================================================
// SYSTEM LOG TERMINAL SCREEN
// ==========================================================================
function appendLogLine(line, type = 'normal') {
  const lineElement = document.createElement('div');
  lineElement.className = `terminal-line ${type}`;
  
  let lowerLine = line.toLowerCase();
  if (lowerLine.includes('[error]') || lowerLine.includes('fail')) {
    lineElement.classList.add('error');
  } else if (lowerLine.includes('success') || lowerLine.includes('ok') || lowerLine.includes('active')) {
    lineElement.classList.add('success');
  } else if (lowerLine.includes('[diagnostic]') || lowerLine.includes('[cmd]')) {
    lineElement.classList.add('system');
  } else if (lowerLine.includes('[tx')) {
    lineElement.classList.add('tx');
  } else if (lowerLine.includes('[telemetry]')) {
    lineElement.classList.add('rx');
  }

  lineElement.textContent = `[${new Date().toLocaleTimeString()}] ${line}`;
  consoleTerminal.appendChild(lineElement);
  
  consoleTerminal.scrollTop = consoleTerminal.scrollHeight;
  
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
// DIAGNOSTICS & HARDWARE SYNC
// ==========================================================================

function resetDiagnostics() {
  diagImei.textContent = 'IMEI: --';
  diagMac.textContent = 'MAC: --';
  
  Object.keys(diagItems).forEach(key => {
    const el = diagItems[key];
    el.className = 'diag-item';
    el.querySelector('.diag-value').textContent = 'WAITING';
  });
}

// Initial Diagnostic Success parsing
ipcRenderer.on('hardware-payload', (event, payload) => {
  if (payload.status === 'BOOT_SUCCESS') {
    diagImei.textContent = `IMEI: ${payload.imei || '--'}`;
    diagMac.textContent = `MAC: ${payload.mac || '--'}`;
    
    inputOtaIp.value = '192.168.4.1'; // Default
    
    appendLogLine('[SYS] Received self-test success payload from gateway.', 'success');

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

// Synchronize switchboard control states on payload push
ipcRenderer.on('control-payload-sync', (event, payload) => {
  // Sync state values on input components
  toggleRelay1.disabled = false;
  toggleRelay2.disabled = false;
  sliderInterval.disabled = false;
  btnRunSelfTest.disabled = false;

  toggleRelay1.checked = !!payload.relay1;
  toggleRelay2.checked = !!payload.relay2;
  
  sliderInterval.value = payload.interval || 1500;
  lblIntervalVal.textContent = `${payload.interval || 1500} ms`;

  appendLogLine(`[SYS] Control Switchboard synchronized. Rate: ${payload.interval}ms, R1: ${payload.relay1 ? 'ON':'OFF'}, R2: ${payload.relay2 ? 'ON':'OFF'}`);
});


// ==========================================================================
// INTERACTIVE SWITCHBOARD CONTROL LISTENERS
// ==========================================================================

toggleRelay1.addEventListener('change', () => {
  const cmd = toggleRelay1.checked ? 'RELAY_1_ON' : 'RELAY_1_OFF';
  sendGatewayCommand(cmd);
});

toggleRelay2.addEventListener('change', () => {
  const cmd = toggleRelay2.checked ? 'RELAY_2_ON' : 'RELAY_2_OFF';
  sendGatewayCommand(cmd);
});

sliderInterval.addEventListener('input', () => {
  lblIntervalVal.textContent = `${sliderInterval.value} ms`;
});

sliderInterval.addEventListener('change', () => {
  const interval = sliderInterval.value;
  sendGatewayCommand(`SET_INTERVAL:${interval}`);
});

btnRunSelfTest.addEventListener('click', () => {
  resetDiagnostics();
  sendGatewayCommand('RE_DIAGNOSE');
});


// ==========================================================================
// TELEMETRY PROCESSING, FILTERING & JSON EXPORT
// ==========================================================================

ipcRenderer.on('telemetry-payload', (event, payload) => {
  if (payload.type === 'telemetry') {
    // Update local cache
    payload.devices.forEach(dev => {
      devicesCacheMap.set(dev.id, dev);
    });

    renderFilteredDevices();
  }
});

// Filters inputs trigger render
searchDeviceId.addEventListener('input', renderFilteredDevices);
filterDeviceStatus.addEventListener('change', renderFilteredDevices);

function renderFilteredDevices() {
  const query = searchDeviceId.value.trim().toLowerCase();
  const filter = filterDeviceStatus.value;
  const devices = Array.from(devicesCacheMap.values());
  
  const filtered = devices.filter(dev => {
    // Search filter
    const matchesSearch = dev.id.toString().includes(query);
    
    // Status filter
    let matchesStatus = true;
    if (filter === 'ONLINE') matchesStatus = dev.status === 'ONLINE';
    if (filter === 'OFFLINE') matchesStatus = dev.status !== 'ONLINE';
    
    return matchesSearch && matchesStatus;
  });

  deviceCountSpan.textContent = filtered.length;

  if (devicesCacheMap.size === 0) {
    gridPlaceholder.style.display = 'flex';
    devicesGrid.style.display = 'none';
    return;
  }

  gridPlaceholder.style.display = 'none';
  devicesGrid.style.display = 'grid';

  let html = '';
  filtered.forEach(device => {
    const isOffline = device.status !== 'ONLINE';
    const isLowBat = device.bat < 20;

    html += `
      <div class="device-card ${isOffline ? 'offline' : ''}">
        <div class="device-card-header">
          <span class="device-id">NODE #${device.id}</span>
          <span class="device-status-badge">${device.status}</span>
        </div>
        <div class="device-metrics">
          <div class="device-metric">
            <span class="metric-label">Temp</span>
            <span class="metric-val temp-val">${parseFloat(device.temp).toFixed(1)}°C</span>
          </div>
          <div class="device-metric">
            <span class="metric-label">Signal</span>
            <span class="metric-val rssi-val">${device.rssi} dBm</span>
          </div>
          <div class="device-metric" style="grid-column: span 2;">
            <span class="metric-label">Battery</span>
            <div class="bat-wrapper">
              <div class="bat-bar-outer">
                <div class="bat-bar-inner ${isLowBat ? 'low' : ''}" style="width: ${device.bat}%"></div>
              </div>
              <span class="metric-val bat-val" style="font-size:11px;">${device.bat}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  devicesGrid.innerHTML = html || `<div style="grid-column: 1/-1; text-align:center; padding: 30px; color: var(--text-dim);">No devices match active filters.</div>`;
}

// Export captured telemetry to JSON file
btnExportData.addEventListener('click', () => {
  if (devicesCacheMap.size === 0) {
    alert('No telemetry data available to export.');
    return;
  }

  try {
    const devicesList = Array.from(devicesCacheMap.values());
    const dataStr = JSON.stringify(devicesList, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `nebula-telemetry-dump-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    appendLogLine(`[SYS] Telemetry dump exported successfully. Count: ${devicesList.length} clients`, 'success');
  } catch (err) {
    alert(`Export failed: ${err.message}`);
    appendLogLine(`[ERROR] Export failed: ${err.message}`, 'error');
  }
});


// ==========================================================================
// OTA UPDATE DRAG AND DROP HANDLERS
// ==========================================================================

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

btnBrowseBin.addEventListener('click', (e) => {
  e.preventDefault();
  otaFileInput.click();
});

otaFileInput.addEventListener('change', () => {
  if (otaFileInput.files.length > 0) {
    handleOtaFileSelection(otaFileInput.files[0]);
  }
});

function handleOtaFileSelection(file) {
  if (!file.name.endsWith('.bin')) {
    alert('Invalid File format. Select a compiled firmware binary file (.bin)');
    return;
  }

  selectedOtaFilePath = file.path;
  const sizeInKB = Math.round(file.size / 1024);
  
  selectedFileName.textContent = file.name;
  selectedFileSize.textContent = `${sizeInKB} KB`;
  selectedFileInfo.style.display = 'flex';
  
  btnStartOta.disabled = false;
  
  appendLogLine(`[OTA] Selected firmware binary: ${file.name} (${sizeInKB} KB)`);
}

btnStartOta.addEventListener('click', () => {
  if (!selectedOtaFilePath) return;

  const otaIp = inputOtaIp.value;
  if (!otaIp) {
    alert('Enter the gateway AP IP address.');
    return;
  }

  btnStartOta.disabled = true;
  otaDropZone.style.pointerEvents = 'none';
  
  otaProgressBox.style.display = 'block';
  otaBarFill.style.width = '0%';
  otaPercentText.textContent = '0%';
  otaStatusText.textContent = 'Uploading firmware...';
  otaBarFill.style.backgroundColor = '';

  ipcRenderer.send('start-ota', { 
    filePath: selectedOtaFilePath, 
    ip: otaIp 
  });
});

ipcRenderer.on('ota-progress', (event, update) => {
  if (update.status === 'uploading') {
    otaBarFill.style.width = `${update.progress}%`;
    otaPercentText.textContent = `${update.progress}%`;
    otaStatusText.textContent = `Uploading firmware: ${update.progress}%`;
  } else if (update.status === 'success') {
    otaBarFill.style.width = '100%';
    otaPercentText.textContent = '100%';
    otaStatusText.textContent = 'Flash successful! Rebooting device...';
    otaBarFill.style.background = 'var(--grad-emerald-cyan)';
    
    appendLogLine('[OTA] SUCCESS: Firmware flash verification succeeded. Gateway rebooting...', 'success');
    alert('Firmware flash completed successfully! The gateway will reboot.');
    
    resetOtaForm();
  } else if (update.status === 'error') {
    otaStatusText.textContent = `Error: ${update.message}`;
    otaBarFill.style.background = 'var(--accent-pink)';
    btnStartOta.disabled = false;
    otaDropZone.style.pointerEvents = '';
    
    appendLogLine(`[OTA ERROR] Flashing aborted: ${update.message}`, 'error');
    alert(`Wireless OTA failed:\n${update.message}`);
  }
});

function resetOtaForm() {
  btnStartOta.disabled = true;
  otaDropZone.style.pointerEvents = '';
  selectedFileInfo.style.display = 'none';
  selectedOtaFilePath = null;
  otaFileInput.value = '';
}
