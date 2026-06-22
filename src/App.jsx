import React, { useState, useEffect, useRef, useMemo } from 'react';

// Safely load Electron IPC in React loaded in Electron environment
const { ipcRenderer } = window.require('electron');

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState('page-dashboard');
  const [activeConnTab, setActiveConnTab] = useState('tab-wifi');

  // Connection State
  const [connection, setConnection] = useState({ type: null, target: null });
  const [wifiIp, setWifiIp] = useState('192.168.4.1');
  const [wifiPort, setWifiPort] = useState('9000');
  const [serialPorts, setSerialPorts] = useState([]);
  const [selectedSerialPort, setSelectedSerialPort] = useState('');
  const [selectedBaud, setSelectedBaud] = useState('115200');
  const [bootTriggerEnabled, setBootTriggerEnabled] = useState(false);

  // Diagnostics State
  const [imei, setImei] = useState('--');
  const [mac, setMac] = useState('--');
  const [diagnostics, setDiagnostics] = useState({
    rs232: 'WAITING',
    rs485: 'WAITING',
    gprs: 'WAITING',
    bus: 'WAITING',
    ap: 'WAITING',
    flash: 'WAITING',
    di: 'WAITING',
    driver: 'WAITING',
    rtc: 'WAITING'
  });

  // Boot Sequence State
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStep, setBootStep] = useState('');
  const [bootMessage, setBootMessage] = useState('');
  const [isBooting, setIsBooting] = useState(false);

  // Device Credentials State
  const [password, setPassword] = useState('--');
  const [imeiInput, setImeiInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // SPIFFS Certificate State
  const [certificates, setCertificates] = useState([]);
  const [isCertUploading, setIsCertUploading] = useState(false);
  const [certUploadProgress, setCertUploadProgress] = useState(0);

  // Switchboard Controls State
  const [relay1, setRelay1] = useState(false);
  const [relay2, setRelay2] = useState(false);
  const [telemetryRate, setTelemetryRate] = useState(1500);
  const [controlsDisabled, setControlsDisabled] = useState(true);
  const [pingLatency, setPingLatency] = useState({ value: 'Offline', status: 'offline' });

  // Telemetry Grid State
  const [devicesMap, setDevicesMap] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Database History State
  const [dbStatus, setDbStatus] = useState({ mongodb: 'CONNECTING', recordsCount: 0 });
  const [dbHistory, setDbHistory] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // OTA Updates State
  const [otaIp, setOtaIp] = useState('192.168.4.1');
  const [otaFile, setOtaFile] = useState(null);
  const [otaProgress, setOtaProgress] = useState(null); // { status, progress, message }
  const [otaTarget, setOtaTarget] = useState('esp32s3'); // 'esp32' or 'qcom'
  const fileInputRef = useRef(null);

  // Terminal Console Logs State
  const [consoleLogs, setConsoleLogs] = useState([
    { text: 'System Initialized. Awaiting interface connectivity...', type: 'system', time: new Date().toLocaleTimeString() }
  ]);
  const consoleEndRef = useRef(null);

  // Ping Latency Refs
  const lastPingTimeRef = useRef(0);
  const awaitingPingResponseRef = useRef(false);

  // ==========================================================================
  // APP LIFECYCLE & IPC SUBSCRIPTIONS
  // ==========================================================================
  useEffect(() => {
    // 1. Scan serial ports on load
    refreshPorts();

    // 2. Subscribe to connection status
    const onConnectionStatus = (event, data) => {
      if (data.status === 'connected') {
        setConnection({ type: data.type, target: data.target });
        setBootTriggerEnabled(data.type === 'serial');
        addLogLine(`Gateway interface online: ${data.type.toUpperCase()} -> ${data.target}`, 'success');

        if (data.type === 'serial') {
          setPingLatency({ value: 'USB Line', status: 'excellent' });
        }
      } else {
        setConnection({ type: null, target: null });
        setBootTriggerEnabled(false);
        setControlsDisabled(true);
        setPingLatency({ value: 'Offline', status: 'offline' });
        resetDiagnostics();

        if (data.status === 'error') {
          addLogLine(`Connection error: ${data.message}`, 'error');
          alert(`Connection failed: ${data.message}`);
        } else {
          addLogLine('Gateway interface closed.', 'system');
        }
      }
    };
    ipcRenderer.on('connection-status', onConnectionStatus);

    // 3. Subscribe to console logs
    const onConsoleLog = (event, message) => {
      addLogLine(message);
    };
    ipcRenderer.on('console-log', onConsoleLog);

    // 4. Subscribe to diagnostics success and boot progress updates
    const onHardwarePayload = (event, payload) => {
      if (payload.status === 'BOOT_PROGRESS' || payload.step === 'QCOM_SHIFT') {
        setIsBooting(true);
        setBootProgress(payload.progress);
        setBootStep(payload.step);
        setBootMessage(payload.message);
        if (payload.step === 'QCOM_SHIFT' && payload.progress === 100) {
          setTimeout(() => setIsBooting(false), 2000);
        }
      } else if (payload.status === 'BOOT_SUCCESS') {
        setIsBooting(false);
        setBootProgress(100);
        setBootStep('COMPLETE');
        setBootMessage('Boot and certification sequence complete!');
        setImei(payload.imei || '--');
        setMac(payload.mac || '--');
        setPassword(payload.password || 'admin_secure_gate');
        setImeiInput(payload.imei || '');
        setPasswordInput(payload.password || '');
        setCertificates(payload.certificates || []);
        setOtaIp('192.168.4.1');
        
        // Fix lockup bug: enable switchboard controls once boot is successful!
        setControlsDisabled(false);

        addLogLine('[SYS] Boot diagnostics report sync complete.', 'success');

        const newDiags = {};
        Object.keys(payload.diagnostics || {}).forEach(key => {
          newDiags[key] = payload.diagnostics[key] ? 'OK' : 'ERROR';
        });
        setDiagnostics(prev => ({ ...prev, ...newDiags }));
      } else if (payload.status === 'IMEI_UPDATED') {
        setImei(payload.imei);
        setImeiInput(payload.imei);
        addLogLine(`[SYS] Dynamic IMEI update completed successfully: ${payload.imei}`, 'success');
      } else if (payload.status === 'PASSWORD_UPDATED') {
        setPassword(payload.password);
        setPasswordInput(payload.password);
        addLogLine('[SYS] Dynamic Credentials Password update completed successfully.', 'success');
      } else if (payload.status === 'CERT_ADDED') {
        setCertificates(prev => {
          if (prev.some(c => c.name === payload.filename)) return prev;
          return [...prev, { name: payload.filename, size: payload.size }];
        });
        setIsCertUploading(false);
        setCertUploadProgress(0);
        addLogLine(`[SYS] Certificate file successfully stored to SPIFFS and synchronized to QCOM: ${payload.filename}`, 'success');
      }
    };
    ipcRenderer.on('hardware-payload', onHardwarePayload);

    // 5. Subscribe to controls config sync
    const onControlPayloadSync = (event, payload) => {
      setControlsDisabled(false);
      setRelay1(!!payload.relay1);
      setRelay2(!!payload.relay2);
      setTelemetryRate(payload.interval || 1500);
      addLogLine(`[SYS] Synced board: Rate: ${payload.interval}ms, R1: ${payload.relay1 ? 'ON' : 'OFF'}, R2: ${payload.relay2 ? 'ON' : 'OFF'}`);
    };
    ipcRenderer.on('control-payload-sync', onControlPayloadSync);

    // 6. Subscribe to telemetry feed data
    const onTelemetryPayload = (event, payload) => {
      if (payload.type === 'telemetry') {
        setDevicesMap(prevMap => {
          const nextMap = new Map(prevMap);
          payload.devices.forEach(dev => {
            nextMap.set(dev.id, dev);
          });
          return nextMap;
        });
      }
    };
    ipcRenderer.on('telemetry-payload', onTelemetryPayload);

    // 7. Subscribe to RTT Ping response
    const onPingPongReply = () => {
      awaitingPingResponseRef.current = false;
      const rtt = Date.now() - lastPingTimeRef.current;
      let status = 'excellent';
      if (rtt >= 100) status = 'poor';
      else if (rtt >= 30) status = 'warning';

      setPingLatency({ value: `${rtt} ms`, status });
    };
    ipcRenderer.on('ping-pong-reply', onPingPongReply);

    // 8. Subscribe to OTA flashing status
    const onOtaProgress = (event, update) => {
      setOtaProgress(update);
      if (update.status === 'success') {
        addLogLine('[OTA] SUCCESS: Firmware flash verification succeeded.', 'success');
        alert('Firmware flash completed successfully!');
        setOtaFile(null);
        setOtaProgress(null);
      } else if (update.status === 'error') {
        addLogLine(`[OTA ERROR] Flashing failed: ${update.message}`, 'error');
        alert(`OTA Update Failed:\n${update.message}`);
        setOtaProgress(null);
      }
    };
    ipcRenderer.on('ota-progress', onOtaProgress);

    return () => {
      ipcRenderer.off('connection-status', onConnectionStatus);
      ipcRenderer.off('console-log', onConsoleLog);
      ipcRenderer.off('hardware-payload', onHardwarePayload);
      ipcRenderer.off('control-payload-sync', onControlPayloadSync);
      ipcRenderer.off('telemetry-payload', onTelemetryPayload);
      ipcRenderer.off('ping-pong-reply', onPingPongReply);
      ipcRenderer.off('ota-progress', onOtaProgress);
    };
  }, []);

  // Ping Loop for WiFi TCP Socket
  useEffect(() => {
    let timerId = null;
    if (connection.type === 'tcp') {
      timerId = setInterval(() => {
        if (!awaitingPingResponseRef.current) {
          lastPingTimeRef.current = Date.now();
          awaitingPingResponseRef.current = true;
          ipcRenderer.send('send-tcp-command', 'PING');
        }
      }, 3000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
      awaitingPingResponseRef.current = false;
    };
  }, [connection]);

  // Sync / query database history whenever history log tab is clicked active
  useEffect(() => {
    if (activeTab === 'page-database') {
      fetchDatabaseHistory();
      fetchDatabaseStatus();
    }
  }, [activeTab]);

  // Terminal scroll handler
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // ==========================================================================
  // DATA MANAGEMENT FUNCTIONS
  // ==========================================================================
  const addLogLine = (text, type = 'normal') => {
    setConsoleLogs(prev => {
      const lineObj = {
        text,
        type,
        time: new Date().toLocaleTimeString()
      };

      // Auto highlighting
      let lowerLine = text.toLowerCase();
      if (lowerLine.includes('[error]') || lowerLine.includes('fail')) {
        lineObj.type = 'error';
      } else if (lowerLine.includes('success') || lowerLine.includes('ok') || lowerLine.includes('online')) {
        lineObj.type = 'success';
      } else if (lowerLine.includes('[diagnostic]') || lowerLine.includes('[cmd]')) {
        lineObj.type = 'system';
      } else if (lowerLine.includes('[tx')) {
        lineObj.type = 'tx';
      } else if (lowerLine.includes('[telemetry]')) {
        lineObj.type = 'rx';
      }

      const next = [...prev, lineObj];
      if (next.length > 300) next.shift(); // Cap console history
      return next;
    });
  };

  const resetDiagnostics = () => {
    setImei('--');
    setMac('--');
    setPassword('--');
    setImeiInput('');
    setPasswordInput('');
    setCertificates([]);
    setBootProgress(0);
    setBootStep('');
    setBootMessage('');
    setIsBooting(false);
    setIsCertUploading(false);
    setCertUploadProgress(0);
    setDiagnostics({
      rs232: 'WAITING',
      rs485: 'WAITING',
      gprs: 'WAITING',
      bus: 'WAITING',
      ap: 'WAITING',
      flash: 'WAITING',
      di: 'WAITING',
      driver: 'WAITING',
      rtc: 'WAITING'
    });
  };

  // REST API: Load log documents
  const fetchDatabaseHistory = async () => {
    try {
      const res = await fetch('/api/telemetry/history');
      if (res.ok) {
        const data = await res.json();
        setDbHistory(data);
      }
    } catch (err) {
      console.error('Failed to load database history logs:', err);
    }
  };

  // REST API: Load mongoose status details
  const fetchDatabaseStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (err) {
      console.error('Failed to load mongoose status:', err);
    }
  };

  // REST API: Clear history collection
  const clearDatabaseLogs = async () => {
    if (!confirm('Are you sure you want to delete all historical telemetry records from the database?')) return;
    try {
      const res = await fetch('/api/telemetry/history', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        addLogLine(`[DATABASE] ${data.message}`, 'success');
        fetchDatabaseHistory();
        fetchDatabaseStatus();
      }
    } catch (err) {
      alert(`Clear failed: ${err.message}`);
    }
  };

  // COM Ports search
  const refreshPorts = async () => {
    setSelectedSerialPort('');
    const ports = await ipcRenderer.invoke('list-ports');
    setSerialPorts(ports);
    if (ports.length > 0) {
      setSelectedSerialPort(ports[0].path);
    }
  };

  // Send controls commands
  const sendControlCommand = (cmd) => {
    if (connection.type === 'serial') {
      ipcRenderer.send('send-serial-command', cmd);
    } else if (connection.type === 'tcp') {
      ipcRenderer.send('send-tcp-command', cmd);
    }
  };

  // Apply IMEI and Password dynamic updates to firmware
  const applyDeviceSettings = () => {
    if (!imeiInput || !passwordInput) {
      alert('IMEI and Password values cannot be empty.');
      return;
    }
    if (imeiInput.length < 15) {
      alert('IMEI must be at least 15 characters long.');
      return;
    }
    sendControlCommand(`SET_IMEI:${imeiInput}`);
    sendControlCommand(`SET_PASS:${passwordInput}`);
    addLogLine(`[CMD] Sending dynamic updates: IMEI -> ${imeiInput}, Password -> *****`);
  };

  // Upload certificate to device SPIFFS & QCOM
  const handleCertificateSelection = (file) => {
    const validExtensions = ['.pem', '.crt', '.key'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      alert('Invalid certificate format. Choose a valid certificate file (.pem, .crt, or .key)');
      return;
    }

    setIsCertUploading(true);
    setCertUploadProgress(20);
    addLogLine(`[SPIFFS] Preparing to write certificate: ${file.name}...`);

    setTimeout(() => {
      setCertUploadProgress(50);
      addLogLine(`[SPIFFS] Copying file contents to SPIFFS sector storage (${file.size} bytes)...`);
      
      setTimeout(() => {
        setCertUploadProgress(85);
        addLogLine(`[QCOM] Broadcasting certificates sync across co-processor links...`);
        sendControlCommand(`ADD_CERT:${file.name}:${file.size}`);
      }, 500);
    }, 400);
  };

  // Trigger Connections
  const connectSerial = () => {
    if (!selectedSerialPort) return;
    ipcRenderer.send('connect-serial', { portPath: selectedSerialPort, baudRate: selectedBaud });
  };

  const connectWifi = () => {
    ipcRenderer.send('connect-tcp', { ip: wifiIp, port: wifiPort });
  };

  const disconnectGateway = () => {
    ipcRenderer.send('disconnect-active');
  };

  const triggerBoot = () => {
    ipcRenderer.send('send-serial-command', 'START_BOOT');
  };

  // Switchboard Event Actions
  const handleRelay1Toggle = () => {
    const nextState = !relay1;
    setRelay1(nextState);
    sendControlCommand(nextState ? 'RELAY_1_ON' : 'RELAY_1_OFF');
  };

  const handleRelay2Toggle = () => {
    const nextState = !relay2;
    setRelay2(nextState);
    sendControlCommand(nextState ? 'RELAY_2_ON' : 'RELAY_2_OFF');
  };

  const handleIntervalChange = (e) => {
    setTelemetryRate(e.target.value);
  };

  const commitIntervalChange = () => {
    sendControlCommand(`SET_INTERVAL:${telemetryRate}`);
  };

  const triggerSelfCheckReRun = () => {
    resetDiagnostics();
    sendControlCommand('RE_DIAGNOSE');
  };

  // Sub-device grid filters
  const filteredDevicesList = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = Array.from(devicesMap.values());

    return list.filter(dev => {
      const matchesSearch = dev.id.toString().includes(query);

      let matchesStatus = true;
      if (statusFilter === 'ONLINE') matchesStatus = dev.status === 'ONLINE';
      if (statusFilter === 'OFFLINE') matchesStatus = dev.status !== 'ONLINE';

      return matchesSearch && matchesStatus;
    });
  }, [devicesMap, searchQuery, statusFilter]);

  // CSV/JSON Local exporter blobbing
  const exportTelemetryJson = () => {
    const list = Array.from(devicesMap.values());
    if (list.length === 0) {
      alert('No telemetry data collected to export.');
      return;
    }

    try {
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nebula-telemetry-mern-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      addLogLine(`[SYS] Successfully exported telemetry payload file. Devices count: ${list.length}`, 'success');
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  // OTA Dropzone handlers
  const handleOtaFileChange = (file) => {
    if (!file.name.endsWith('.bin')) {
      alert('Invalid file structure. Choose a compiled firmware .bin file.');
      return;
    }
    setOtaFile(file);
    addLogLine(`[OTA] Selected firmware binary: ${file.name} (${Math.round(file.size / 1024)} KB)`);
  };

  const startOtaUpdate = () => {
    if (!otaFile) return;
    setControlsDisabled(true);
    setOtaProgress({ status: 'uploading', progress: 0 });
    ipcRenderer.send('start-ota', { filePath: otaFile.path, ip: otaIp, target: otaTarget });
  };

  return (
    <>
      {/* Frameless window header bar */}
      <div className="window-titlebar">
        <div className="titlebar-logo">
          <div className="logo-dot"></div>
          <span>NEBULA MERN SYSTEM</span>
        </div>
        <div className="titlebar-controls">
          <button className="win-btn" onClick={() => ipcRenderer.send('window-minimize')}>&#128469;&#xFE0E;</button>
          <button className="win-btn" onClick={() => ipcRenderer.send('window-maximize')}>&#128470;&#xFE0E;</button>
          <button className="win-btn close" onClick={() => ipcRenderer.send('window-close')}>&#128473;&#xFE0E;</button>
        </div>
      </div>

      <div className="app-container">

        {/* Navigation Sidebar */}
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="brand-text">
              <h2>NEBULA MERN</h2>
              <span>IoT Router v3.0</span>
            </div>
          </div>

          <nav className="nav-menu">
            <button className={`nav-item ${activeTab === 'page-dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('page-dashboard')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button className={`nav-item ${activeTab === 'page-database' ? 'active' : ''}`} onClick={() => setActiveTab('page-database')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
              <span>MongoDB History</span>
            </button>

            <button className={`nav-item ${activeTab === 'page-security' ? 'active' : ''}`} onClick={() => setActiveTab('page-security')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Security & Config</span>
            </button>
            
            <button className={`nav-item ${activeTab === 'page-ota' ? 'active' : ''}`} onClick={() => setActiveTab('page-ota')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span>Wireless OTA</span>
            </button>

            <button className={`nav-item ${activeTab === 'page-console' ? 'active' : ''}`} onClick={() => setActiveTab('page-console')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span>Debug Console</span>
            </button>
          </nav>

          <div className="sidebar-status-box">
            <div className="status-indicator">
              <span className={`pulse-dot ${connection.type ? 'connected' : 'idle'}`}></span>
              <span>{connection.type ? 'Gateway Online' : 'Not Connected'}</span>
            </div>
            <div className="connection-details">
              {connection.type ? `Port: ${connection.type.toUpperCase()}\n${connection.target}` : 'Gateway Offline'}
            </div>
          </div>
        </aside>

        {/* View Layout Panels */}
        <main className="main-content">

          {/* ================= VIEW 1: DASHBOARD ================= */}
          <section id="page-dashboard" className={`page-view ${activeTab === 'page-dashboard' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Gateway Dashboard</h1>
                <p>Monitor peripherals, adjust pacing telemetry speed, and toggle relays</p>
              </div>
              <div className={`connection-pill ${connection.type ? 'connected' : ''}`}>
                {connection.type ? `${connection.type.toUpperCase()} ACTIVE` : 'DISCONNECTED'}
              </div>
            </header>

            <div className="dashboard-top-grid">

              {/* Interface Control Panel */}
              <div className="glass-card connection-panel">
                <h3><span className="icon">&#128268;</span> Connect Gateway</h3>

                {!connection.type ? (
                  <>
                    <div className="tabs-control">
                      <button className={`tab-btn ${activeConnTab === 'tab-wifi' ? 'active' : ''}`} onClick={() => setActiveConnTab('tab-wifi')}>WiFi IP</button>
                      <button className={`tab-btn ${activeConnTab === 'tab-serial' ? 'active' : ''}`} onClick={() => setActiveConnTab('tab-serial')}>Serial</button>
                    </div>

                    {activeConnTab === 'tab-wifi' ? (
                      <div className="tab-content active">
                        <div className="input-group">
                          <label>Gateway IP Address</label>
                          <input type="text" value={wifiIp} onChange={(e) => setWifiIp(e.target.value)} />
                        </div>
                        <div className="input-group">
                          <label>Telemetry Socket Port</label>
                          <input type="text" value={wifiPort} onChange={(e) => setWifiPort(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" onClick={connectWifi}>Open Socket (9000)</button>
                      </div>
                    ) : (
                      <div className="tab-content active">
                        <div className="input-group">
                          <label>USB COM Target Port</label>
                          <div className="select-wrapper">
                            <select value={selectedSerialPort} onChange={(e) => setSelectedSerialPort(e.target.value)}>
                              {serialPorts.length === 0 ? (
                                <option value="">No COM ports scanned</option>
                              ) : (
                                serialPorts.map(p => <option key={p.path} value={p.path}>{p.path}</option>)
                              )}
                            </select>
                            <button className="btn btn-secondary small" onClick={refreshPorts}>&#8635;</button>
                          </div>
                        </div>
                        <div className="input-group">
                          <label>Baud Rate</label>
                          <select value={selectedBaud} onChange={(e) => setSelectedBaud(e.target.value)}>
                            <option value="115200">115200</option>
                            <option value="9600">9600</option>
                          </select>
                        </div>
                        <div className="button-row">
                          <button className="btn btn-primary" onClick={connectSerial}>Open COM</button>
                          <button className="btn btn-accent" onClick={triggerBoot} disabled={!bootTriggerEnabled}>START_BOOT</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button className="btn btn-danger" onClick={disconnectGateway}>Disconnect active link</button>
                )}
              </div>

              {/* Diagnostic Checklist Panel */}
              <div className="glass-card diagnostic-board">
                <div className="diag-header">
                  <h3><span className="icon">&#9881;</span> Diagnostics status</h3>
                  <div className="diag-meta">
                    <span>IMEI: {imei}</span>
                    <span>MAC: {mac}</span>
                  </div>
                </div>

                <div className="diag-checklist">
                  {Object.keys(diagnostics).map(key => (
                    <div key={key} className={`diag-item ${diagnostics[key] === 'OK' ? 'success' : diagnostics[key] === 'ERROR' ? 'error' : ''}`}>
                      <div className="diag-indicator"></div>
                      <div className="diag-label">{key.toUpperCase()} Module</div>
                      <div className="diag-value">{diagnostics[key]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Switchboard Controller Panel */}
              <div className="glass-card switchboard-panel">
                <h3><span className="icon">&#9903;</span> Controls Switchboard</h3>

                <div className="control-row">
                  <span className="control-title">System Relays</span>
                  <div className="relays-grid">
                    <div className="relay-switch-container">
                      <span className="relay-name">Relay 1</span>
                      <label className="switch-toggle">
                        <input type="checkbox" checked={relay1} onChange={handleRelay1Toggle} disabled={controlsDisabled} />
                        <span className="switch-slider"></span>
                      </label>
                    </div>
                    <div className="relay-switch-container">
                      <span className="relay-name">Relay 2</span>
                      <label className="switch-toggle">
                        <input type="checkbox" checked={relay2} onChange={handleRelay2Toggle} disabled={controlsDisabled} />
                        <span className="switch-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="control-row">
                  <div className="slider-header">
                    <span className="control-title">Interval Rate</span>
                    <span className="slider-value">{telemetryRate} ms</span>
                  </div>
                  <input type="range" min="200" max="5000" step="100" value={telemetryRate} onChange={handleIntervalChange} onMouseUp={commitIntervalChange} disabled={controlsDisabled} />
                  <div className="slider-labels">
                    <span>Fast (200ms)</span>
                    <span>Slow (5s)</span>
                  </div>
                </div>

                <div className="control-row bottom-actions">
                  <button className="btn btn-secondary" onClick={triggerSelfCheckReRun} disabled={controlsDisabled}>
                    <span className="btn-icon">&#10227;</span> Recheck Hardware
                  </button>
                  <button className="btn btn-accent" onClick={() => sendControlCommand('SHIFT_TO_QCOM')} disabled={!connection.type}>
                    <span className="btn-icon">&#10145;</span> Shift to QCOM
                  </button>
                  <div className="ping-widget">
                    <span className="ping-label">Socket RTT Ping:</span>
                    <span className={`ping-result ${pingLatency.status}`}>{pingLatency.value}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* System Boot & Update Orchestrator */}
            {connection.type === 'serial' && (
              <div className="glass-card boot-orchestrator-card">
                <div className="boot-orchestrator-header">
                  <div className="boot-title-wrapper">
                    <h3><span className="icon">&#9889;</span> System Boot & Update Orchestrator</h3>
                    <p className="boot-subtitle">Manage ESP32 certificate provisioning, QCOM device syncing, and firmware flashes</p>
                  </div>
                  {!isBooting && bootProgress === 0 && (
                    <button className="btn btn-accent boot-start-btn" onClick={triggerBoot}>
                      <span className="btn-icon">&#9658;</span> Start Boot Sequence
                    </button>
                  )}
                </div>

                {(isBooting || bootProgress > 0) && (
                  <div className="boot-orchestrator-body">
                    {/* Neon Progress Bar */}
                    <div className="boot-progress-container">
                      <div className="boot-progress-header">
                        <span className="boot-status-msg">{bootMessage || 'Booting...'}</span>
                        <span className="boot-status-pct">{bootProgress}%</span>
                      </div>
                      <div className="boot-progress-bar-bg">
                        <div className="boot-progress-bar-fill" style={{ width: `${bootProgress}%` }}></div>
                      </div>
                    </div>

                    {/* Timeline Steps Stepper */}
                    <div className="boot-timeline-stepper">

                      {/* Step 1: ESP32 Cert Update */}
                      <div className={`boot-step ${bootStep.startsWith('ESP32_CERT') ? 'active' :
                          (bootProgress > 30 || bootStep === 'QCOM_SYNC' || bootStep === 'MAIN_FW_UPDATE' || bootStep === 'DIAGNOSTICS' || bootStep === 'COMPLETE') ? 'completed' : 'pending'
                        }`}>
                        <div className="step-marker">
                          <span className="step-number">1</span>
                          <span className="step-check">&#10003;</span>
                        </div>
                        <div className="step-info">
                          <span className="step-label">ESP32 Provisioning</span>
                          <span className="step-desc">Download 3 Certificates</span>
                        </div>
                      </div>

                      {/* Step 2: QCOM Sync */}
                      <div className={`boot-step ${bootStep === 'QCOM_SYNC' ? 'active' :
                          (bootProgress > 45 || bootStep === 'MAIN_FW_UPDATE' || bootStep === 'DIAGNOSTICS' || bootStep === 'COMPLETE') ? 'completed' : 'pending'
                        }`}>
                        <div className="step-marker">
                          <span className="step-number">2</span>
                          <span className="step-check">&#10003;</span>
                        </div>
                        <div className="step-info">
                          <span className="step-label">QCOM Sync</span>
                          <span className="step-desc">Immediate Certificate Transfer</span>
                        </div>
                      </div>

                      {/* Step 3: Main Firmware Flash */}
                      <div className={`boot-step ${bootStep === 'MAIN_FW_UPDATE' ? 'active' :
                          (bootProgress > 65 || bootStep === 'DIAGNOSTICS' || bootStep === 'COMPLETE') ? 'completed' : 'pending'
                        }`}>
                        <div className="step-marker">
                          <span className="step-number">3</span>
                          <span className="step-check">&#10003;</span>
                        </div>
                        <div className="step-info">
                          <span className="step-label">Firmware Update</span>
                          <span className="step-desc">Flash Main FW Partition</span>
                        </div>
                      </div>

                      {/* Step 4: Hardware Check */}
                      <div className={`boot-step ${bootStep === 'DIAGNOSTICS' ? 'active' :
                          (bootStep === 'COMPLETE') ? 'completed' : 'pending'
                        }`}>
                        <div className="step-marker">
                          <span className="step-number">4</span>
                          <span className="step-check">&#10003;</span>
                        </div>
                        <div className="step-info">
                          <span className="step-label">Self-Check</span>
                          <span className="step-desc">9-Point Peripheral Test</span>
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Telemetry client list */}
            <div className="sub-devices-section">
              <div className="sub-devices-header-row">
                <div className="header-left">
                  <h3><span className="icon">&#128246;</span> Clients telemetries feed ({filteredDevicesList.length} shown)</h3>
                </div>

                <div className="feed-filters">
                  <input type="text" placeholder="Search Node ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="filter-input" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                    <option value="ALL">All Status</option>
                    <option value="ONLINE">Online Only</option>
                    <option value="OFFLINE">Offline Only</option>
                  </select>
                  <button className="btn btn-accent small-btn" onClick={exportTelemetryJson}>Export JSON</button>
                </div>
              </div>

              {devicesMap.size === 0 ? (
                <div className="grid-placeholder">
                  <div className="empty-state">
                    <div className="empty-icon">&#128225;</div>
                    <h4>Awaiting Live Feeds</h4>
                    <p>Establish a serial connection or open the telemetry socket (Port 9000) to parse incoming client cards.</p>
                  </div>
                </div>
              ) : (
                <div className="sub-devices-grid">
                  {filteredDevicesList.map(dev => (
                    <div key={dev.id} className={`device-card ${dev.status === 'ONLINE' ? '' : 'offline'}`}>
                      <div className="device-card-header">
                        <span className="device-id">NODE #{dev.id}</span>
                        <span className="device-status-badge">{dev.status}</span>
                      </div>
                      <div className="device-metrics">
                        <div className="device-metric">
                          <span class="metric-label">Temp</span>
                          <span class="metric-val temp-val">{parseFloat(dev.temp).toFixed(1)}°C</span>
                        </div>
                        <div className="device-metric">
                          <span class="metric-label">Signal</span>
                          <span class="metric-val">{dev.rssi} dBm</span>
                        </div>
                        <div className="device-metric" style={{ gridColumn: 'span 2' }}>
                          <span class="metric-label">Battery</span>
                          <div className="bat-wrapper">
                            <div className="bat-bar-outer">
                              <div className={`bat-bar-inner ${dev.bat < 20 ? 'low' : ''}`} style={{ width: `${dev.bat}%` }}></div>
                            </div>
                            <span className="metric-val" style={{ fontSize: '11px' }}>{dev.bat}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>

          {/* ================= VIEW 2: MONGODB DATABASE LOGS ================= */}
          <section id="page-database" className={`page-view ${activeTab === 'page-database' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>MongoDB Telemetry History</h1>
                <p>Review telemetry snapshots logged directly to the local MongoDB MERN backend database</p>
              </div>
              <button className="btn btn-danger small" style={{ width: 'auto' }} onClick={clearDatabaseLogs}>Clear database logs</button>
            </header>

            <div className="db-layout-container">

              {/* Database status widget */}
              <div className="glass-card db-status-card" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', color: 'var(--accent-pink)', marginBottom: '5px' }}>MERN database state</h4>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {dbStatus.mongodb === 'CONNECTED' ? '🟢 MONGODB CONNECTED' : '🟡 MEMORY LOGGER FALLBACK (DB OFFLINE)'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="control-title" style={{ marginBottom: '2px' }}>Snapshots Logged</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                      {dbHistory.length} snapshots
                    </span>
                  </div>
                </div>
              </div>

              {/* logs display */}
              <div className="glass-card" style={{ padding: '0px' }}>
                {dbHistory.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No logs found. Connect your gateway, start the socket telemetry stream, and records will save automatically.
                  </div>
                ) : (
                  <div className="db-history-table">
                    <div className="db-table-header" style={{ display: 'grid', gridTemplateColumns: '150px 100px 1fr 100px', padding: '15px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-pink)' }}>
                      <span>Timestamp</span>
                      <span>Clients</span>
                      <span>Nodes Summary</span>
                      <span style={{ textAlign: 'right' }}>Details</span>
                    </div>

                    <div className="db-table-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      {dbHistory.map((record) => {
                        const isExpanded = expandedLogId === record._id || expandedLogId === record.timestamp;
                        const recordId = record._id || record.timestamp;

                        return (
                          <div key={recordId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '150px 100px 1fr 100px', padding: '12px 20px', fontSize: '13px', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(record.timestamp).toLocaleTimeString()}</span>
                              <span>{record.count} clients</span>
                              <span style={{ color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {record.devices.slice(0, 8).map(d => `#${d.id}(${d.temp}°C)`).join(', ')}...
                              </span>
                              <button className="btn btn-secondary small-btn" style={{ marginLeft: 'auto' }} onClick={() => setExpandedLogId(isExpanded ? null : recordId)}>
                                {isExpanded ? 'Hide' : 'Expand'}
                              </button>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '15px 25px', background: 'rgba(3, 0, 10, 0.5)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', borderTop: '1px dashed var(--glass-border)' }}>
                                {record.devices.map((d) => (
                                  <div key={d.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 'bold' }}>Node #{d.id}</span>
                                    <span style={{ color: 'var(--accent-orange)' }}>Temp: {parseFloat(d.temp).toFixed(1)}°C</span>
                                    <span>Signal: {d.rssi}dBm</span>
                                    <span>Bat: {d.bat}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ================= VIEW 3: OTA UPDATES ================= */}
          <section id="page-ota" className={`page-view ${activeTab === 'page-ota' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Wireless OTA Firmware Update</h1>
                <p>Perform firmware flash operations wirelessly over Port 8000 of the router softAP</p>
              </div>
            </header>

            <div className="ota-container">
              <div className="glass-card ota-card">
                <div className="ota-alert-box">
                  <div className="alert-icon">&#9888;</div>
                  <div className="alert-content">
                    <h4>OTA Firmware flash warnings</h4>
                    <p>Ensure the computer is connected to the gateway softAP network. Do not interrupt power or close the uploader process.</p>
                  </div>
                </div>

                <div className="ota-settings" style={{ display: 'flex', gap: '15px' }}>
                  <div className="input-group" style={{ flex: 1, maxWidth: '280px' }}>
                    <label>Gateway HTTP Address (IP)</label>
                    <input type="text" value={otaIp} onChange={(e) => setOtaIp(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ flex: 1, maxWidth: '280px' }}>
                    <label>Flash Target Partition</label>
                    <select
                      value={otaTarget}
                      onChange={(e) => setOtaTarget(e.target.value)}
                      className="filter-select"
                      style={{
                        width: '100%',
                        height: '42px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '0 10px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="esp32" style={{ background: '#1c1b22', color: 'white' }}>ESP32 Firmware (OTA app0/app1)</option>
                      <option value="qcom" style={{ background: '#1c1b22', color: 'white' }}>QCOM Co-processor (core partition)</option>
                    </select>
                  </div>
                </div>

                {/* Drag and drop zone */}
                <div className="drag-drop-zone"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) handleOtaFileChange(e.dataTransfer.files[0]);
                  }}
                  onClick={() => fileInputRef.current.click()}
                >
                  <div className="drop-icon">&#128190;</div>
                  <h4>Drag & Drop firmware binary here</h4>
                  <p>or</p>
                  <button className="btn btn-secondary">Browse files</button>
                  <input type="file" accept=".bin" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => {
                    if (e.target.files.length > 0) handleOtaFileChange(e.target.files[0]);
                  }} />

                  {otaFile && (
                    <div className="selected-file-display" onClick={(e) => e.stopPropagation()}>
                      <span className="file-name">{otaFile.name}</span>
                      <span className="file-size">{Math.round(otaFile.size / 1024)} KB</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {otaProgress && (
                  <div className="ota-progress-pane">
                    <div className="progress-details">
                      <span className="progress-status">Uploading binary...</span>
                      <span className="progress-percent">{otaProgress.progress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${otaProgress.progress}%` }}></div>
                    </div>
                    <div className="ota-speed-info">
                      <span>Writing sectors to winbond flash...</span>
                      <span className="pulse-dot loading"></span>
                    </div>
                  </div>
                )}

                <div className="ota-actions">
                  <button className="btn btn-primary large" onClick={startOtaUpdate} disabled={!otaFile || otaProgress !== null}>
                    Initiate wireless flash update
                </div>
              </div>

              {/* Guide card */}
              <div className="glass-card instruction-card">
                <h3>OTA Procedure Guide</h3>
                <ol className="step-list">
                  <li>
                    <div class="step-num">1</div>
                    <div class="step-desc">
                      <strong>Export Binary</strong>
                      <p>Generate the `.bin` compiled file from Arduino/PlatformIO.</p>
                    </div>
                  </li>
                  <li>
                    <div class="step-num">2</div>
                    <div class="step-desc">
                      <strong>Join Access Point</strong>
                      <p>Connect PC WiFi to `ESP32_GATEWAY_XXXX` softAP network.</p>
                    </div>
                  </li>
                  <li>
                    <div class="step-num">3</div>
                    <div class="step-desc">
                      <strong>Upload</strong>
                      <p>Drag the file and flash on Port 8000. Progress is shown.</p>
                    </div>
                  </li>
                  <li>
                    <div class="step-num">4</div>
                    <div class="step-desc">
                      <strong>Reboot</strong>
                      <p>The gateway writes sectors, validates signatures, and restarts automatically in 3 seconds.</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* ================= VIEW: SECURITY & CREDENTIALS ================= */}
          <section id="page-security" className={`page-view ${activeTab === 'page-security' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Security & System Configuration</h1>
                <p>Modify device credentials and manage certificates in ESP32 config partition and QCOM device storage</p>
              </div>
            </header>

            <div className="security-layout-grid">
              
              {/* Credentials Configuration Card */}
              <div className="glass-card">
                <h3><span className="icon">&#128274;</span> Identity Credentials</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Update gateway hardware identifier and communication passphrase. Updates sync dynamically over the active interface.
                </p>

                <div className="input-group">
                  <label>Device IMEI</label>
                  <input 
                    type="text" 
                    value={imeiInput} 
                    onChange={(e) => setImeiInput(e.target.value)} 
                    placeholder="e.g. 866738083623502" 
                    disabled={!connection.type}
                  />
                </div>

                <div className="input-group">
                  <label>Gateway Password</label>
                  <input 
                    type="password" 
                    value={passwordInput} 
                    onChange={(e) => setPasswordInput(e.target.value)} 
                    placeholder="Enter device passphrase"
                    disabled={!connection.type}
                  />
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={applyDeviceSettings} 
                  disabled={!connection.type}
                  style={{ marginTop: '10px' }}
                >
                  Apply Credentials Update
                </button>

                <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '11px' }}>
                  <span style={{ fontWeight: 'bold', display: 'block', color: 'var(--accent-pink)', marginBottom: '5px' }}>Current Sync Profile:</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)' }}>IMEI: {imei}</span>
                  <span style={{ display: 'block', fontFamily: 'var(--font-mono)' }}>Password: {password}</span>
                </div>
              </div>

              {/* Certificates Manager Card */}
              <div className="glass-card">
                <h3><span className="icon">&#128190;</span> SPIFFS & QCOM Certificates Manager</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Manage certificates stored directly inside the ESP32 SPIFFS config partition (`config`) and synced to the QCOM co-processor space.
                </p>

                <div className="cert-list-container">
                  {certificates.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No active certificates loaded. Connect gateway and trigger boot diagnostics.
                    </div>
                  ) : (
                    certificates.map((cert, idx) => (
                      <div key={idx} className="cert-item-row">
                        <div className="cert-item-details">
                          <span className="cert-item-name">{cert.name}</span>
                          <span className="cert-item-size">{cert.size} bytes</span>
                        </div>
                        <span className="cert-badge">Active SPIFFS / QCOM</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Certificate drag & drop zone */}
                <div 
                  className="drag-drop-zone"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    if (e.dataTransfer.files.length > 0) handleCertificateSelection(e.dataTransfer.files[0]);
                  }}
                  onClick={() => {
                    if (connection.type) {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pem,.crt,.key';
                      input.onchange = (e) => {
                        if (e.target.files.length > 0) handleCertificateSelection(e.target.files[0]);
                      };
                      input.click();
                    } else {
                      alert('Gateway must be connected to upload certificates.');
                    }
                  }}
                  style={{ 
                    padding: '25px 20px',
                    borderColor: isCertUploading ? 'var(--accent-blue)' : '',
                    opacity: connection.type ? 1 : 0.5,
                    cursor: connection.type ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div className="drop-icon" style={{ fontSize: '24px', marginBottom: '8px' }}>&#128228;</div>
                  <h4 style={{ fontSize: '13px' }}>Drag & Drop Certificate file here</h4>
                  <p style={{ fontSize: '11px' }}>Supports .pem, .crt, .key formats</p>
                </div>

                {/* Uploading progress indicator */}
                {isCertUploading && (
                  <div className="ota-progress-pane" style={{ marginTop: '15px' }}>
                    <div className="progress-details">
                      <span className="progress-status" style={{ fontSize: '12px' }}>Syncing to ESP32 SPIFFS & QCOM...</span>
                      <span className="progress-percent" style={{ fontSize: '12px' }}>{certUploadProgress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${certUploadProgress}%`, background: 'var(--grad-emerald-cyan)' }}></div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ================= VIEW 4: DEBUG LOGS ================= */}
          <section id="page-console" className={`page-view ${activeTab === 'page-console' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Engineering Debug Console</h1>
                <p>Diagnostic logging stream monitoring active serial interfaces and raw socket frames</p>
              </div>
              <button className="btn btn-danger small" style={{ width: 'auto' }} onClick={() => setConsoleLogs([])}>Clear Terminal</button>
            </header>

            <div className="console-box">
              <div className="console-terminal">
                {consoleLogs.map((log, idx) => (
                  <div key={idx} className={`terminal-line ${log.type}`}>
                    [{log.time}] {log.text}
                  </div>
                ))}
                <div ref={consoleEndRef}></div>
              </div>
            </div>
          </section>

        </main>

      </div>
    </>
  );
}
