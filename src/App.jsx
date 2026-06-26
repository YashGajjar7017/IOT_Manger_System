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
  const [usbDetect, setUsbDetect] = useState({ detected: false, port: null, ports: [] });

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
  const [wifiRouterSsid, setWifiRouterSsid] = useState('');
  const [wifiRouterPass, setWifiRouterPass] = useState('');

  // SPIFFS Certificate State
  const [certificates, setCertificates] = useState([]);
  const [isCertUploading, setIsCertUploading] = useState(false);
  const [certUploadProgress, setCertUploadProgress] = useState(0);

  // WiFi & Network Connection Details State (Request 1)
  const [wifiDetails, setWifiDetails] = useState({
    status: 'DISCONNECTED',
    ssid: '--',
    mac_sta: '--',
    mac_ap: '--',
    ip_sta: '--',
    ip_ap: '--',
    rssi: 0,
    subnet: '--',
    gateway: '--',
    dns: '--',
    ap_clients: 0,
    ap_clients_list: []
  });

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
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [dbSubTab, setDbSubTab] = useState('tab-db-history'); // 'tab-db-history' or 'tab-db-devices'

  // Registered Device Form state
  const [regImei, setRegImei] = useState('');
  const [regPcb, setRegPcb] = useState('');
  const [regPass, setRegPass] = useState('admin_secure_gate');
  const [regSsid, setRegSsid] = useState('');
  const [regWifiPass, setRegWifiPass] = useState('');
  const [regInterval, setRegInterval] = useState('1500');
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);

  // OTA Updates State
  const [otaIp, setOtaIp] = useState('192.168.4.1');
  const [otaPort, setOtaPort] = useState('8000');
  const [otaAddress, setOtaAddress] = useState(''); // Optional: flash to specific address offset (standard mode)
  const [firmwareUrl, setFirmwareUrl] = useState('');
  const [otaFile, setOtaFile] = useState(null);
  const [otaProgress, setOtaProgress] = useState(null); // { status, progress, message }
  const [otaTarget, setOtaTarget] = useState('esp32'); // 'esp32' or 'qcom'
  const fileInputRef = useRef(null);

  // Sync refs to bypass stale React closures in async/event listener callbacks
  const otaIpRef = useRef(otaIp);
  const otaPortRef = useRef(otaPort);
  useEffect(() => { otaIpRef.current = otaIp; }, [otaIp]);
  useEffect(() => { otaPortRef.current = otaPort; }, [otaPort]);

  // Network Scanning & Cert Downloader State
  const [isScanningNetwork, setIsScanningNetwork] = useState(false);
  const [discoveredGateways, setDiscoveredGateways] = useState([]);
  const [nearbyHotspots, setNearbyHotspots] = useState([]);

  // Phase 3 Certificate Provisioning States
  const [imeiProvisionInput, setImeiProvisionInput] = useState('');
  const [passwordProvisionInput, setPasswordProvisionInput] = useState('');
  const [gatewayIpProvisionInput, setGatewayIpProvisionInput] = useState('192.168.4.1');
  const [provisioningStatus, setProvisioningStatus] = useState('');
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [certHistoryLogs, setCertHistoryLogs] = useState([]);

  // Advanced Multi-File Flashing states
  const [otaMode, setOtaMode] = useState('standard');
  const [otaSlots, setOtaSlots] = useState([
    { id: 1, label: 'Bootloader', address: '0x0', checked: true, file: null, status: 'idle', progress: 0 },
    { id: 2, label: 'Partitions', address: '0x8000', checked: true, file: null, status: 'idle', progress: 0 },
    { id: 3, label: 'Boot App0', address: '0xe000', checked: true, file: null, status: 'idle', progress: 0 },
    { id: 4, label: 'App Firmware', address: '0x10000', checked: true, file: null, status: 'idle', progress: 0 },
  ]);
  const [isFlashingAdvanced, setIsFlashingAdvanced] = useState(false);
  const [autoRebootAdvanced, setAutoRebootAdvanced] = useState(true);
  const flashingQueueRef = useRef([]);
  const currentSlotRef = useRef(null);

  // ESP32 SPIFFS Storage states
  const [spiffsStorage, setSpiffsStorage] = useState({ totalBytes: 0, usedBytes: 0, files: [] });
  const [isFetchingStorage, setIsFetchingStorage] = useState(false);
  const [storageError, setStorageError] = useState(null);

  const [pcbNumber, setPcbNumber] = useState('');
  const [certPreUploadTarget, setCertPreUploadTarget] = useState('BOTH');
  const [certStatuses, setCertStatuses] = useState({
    'aws_root_ca.pem': 'idle',
    'device_cert.crt': 'idle',
    'private_key.key': 'idle'
  });
  const [selectedSpiffsFile, setSelectedSpiffsFile] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState('');
  const [fileContentEdit, setFileContentEdit] = useState('');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isCreatingNewFile, setIsCreatingNewFile] = useState(false);
  const [newFileNameInput, setNewFileNameInput] = useState('');

  // Auto-fill values when device connects/boots
  useEffect(() => {
    if (imei && imei !== '--') {
      setImeiProvisionInput(imei);
    }
    if (password && password !== '--') {
      setPasswordProvisionInput(password);
    }
    if (wifiIp) {
      setGatewayIpProvisionInput(wifiIp);
    }
  }, [imei, password, wifiIp]);

  // Fix for text input not responding to keyboard on first click in Electron frameless window.
  // Root cause: body has user-select:none + -webkit-app-region:drag bleeds into inputs.
  // Fix: Stop propagation on input mousedown so the drag region doesn't steal it,
  // then synchronously focus the element (no setTimeout race condition).
  useEffect(() => {
    const handleGlobalMouseDown = (e) => {
      const target = e.target.closest('input, textarea, select') ||
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ? e.target : null);

      if (target) {
        // Prevent the titlebar drag-region from absorbing this mousedown
        e.stopPropagation();

        // Tell Electron main process to grant OS keyboard focus to the window
        if (ipcRenderer) {
          ipcRenderer.send('focus-window');
        }

        // Synchronously focus — no setTimeout, so the first keydown is captured
        try {
          target.focus();
          // Select-all on text inputs so the user can immediately replace value
          if (target.tagName === 'INPUT' && target.type !== 'checkbox' && target.type !== 'radio') {
            requestAnimationFrame(() => {
              try { target.select(); } catch (_) { }
            });
          }
        } catch (err) {
          // Silently ignore — element may have been removed from DOM
        }
      }
    };

    document.addEventListener('mousedown', handleGlobalMouseDown, true); // capture phase
    return () => document.removeEventListener('mousedown', handleGlobalMouseDown, true);
  }, []);


  const fetchCertProvisionHistory = async () => {
    try {
      const res = await fetch('/api/certificates/history');
      if (res.ok) {
        const data = await res.json();
        setCertHistoryLogs(data);
      }
    } catch (err) {
      console.error('Failed to load certificate logs history:', err);
    }
  };

  // Fetch certificate history when the provisioning tab is active
  useEffect(() => {
    if (activeTab === 'page-cert-provision') {
      fetchCertProvisionHistory();
    }
  }, [activeTab]);

  const triggerCertificateProvision = async () => {
    if (!imeiProvisionInput || !passwordProvisionInput || !gatewayIpProvisionInput) {
      alert('IMEI, Password, and Gateway IP are required.');
      return;
    }
    setIsProvisioning(true);
    setProvisioningStatus('Initiating secure download from SCADA server...');
    addLogLine(`[EXPRESS CLIENT] POSTing certificate provision request for IMEI: ${imeiProvisionInput}...`);

    try {
      const res = await fetch('/api/certificates/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: imeiProvisionInput,
          password: passwordProvisionInput,
          gatewayIp: gatewayIpProvisionInput
        })
      });

      const result = await res.json();
      if (res.ok) {
        setProvisioningStatus('Success! Certificates provisioned to ESP32 SPIFFS & QCOM synced.');
        addLogLine('[EXPRESS CLIENT] SUCCESS: Certificate provisioning completed.', 'success');
        alert('Certificates provisioned successfully!');
        fetchCertProvisionHistory();
        sendControlCommand('GET_INFO');
      } else {
        setProvisioningStatus(`Error: ${result.error || 'Failed'}`);
        addLogLine(`[EXPRESS CLIENT ERROR] ${result.error || 'Failed'}`, 'error');
        alert(`Provisioning Failed:\n${result.error || 'Unknown error'}`);
        fetchCertProvisionHistory();
      }
    } catch (err) {
      setProvisioningStatus(`Error: ${err.message}`);
      addLogLine(`[EXPRESS CLIENT ERROR] ${err.message}`, 'error');
      alert(`Provisioning Failed:\n${err.message}`);
      fetchCertProvisionHistory();
    } finally {
      setIsProvisioning(false);
    }
  };
  /* const [certBaseUrl, setCertBaseUrl] = useState('http://localhost:8000/certs'); */
  const [certRootCaUrl, setCertRootCaUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=1&PROJCD=re');
  const [certDeviceCertUrl, setCertDeviceCertUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=2&PROJCD=re');
  const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=3&PROJCD=re');
  const [isDownloadingCerts, setIsDownloadingCerts] = useState(false);
  const [certDownloadStatus, setCertDownloadStatus] = useState('');

  // App Config Settings State (Requirement 6)
  const [dbUriInput, setDbUriInput] = useState('mongodb://localhost:27017/IOT_System_Manager');
  const [dbReconnectStatus, setDbReconnectStatus] = useState('');
  const [isReconnectingDb, setIsReconnectingDb] = useState(false);

  const [expressPortInput, setExpressPortInput] = useState('8000');
  const [telemetryPortInput, setTelemetryPortInput] = useState('9000');
  const [otaPortInput, setOtaPortInput] = useState('500');
  const [udpPortInput, setUdpPortInput] = useState('5002');
  const [defaultBaudRateInput, setDefaultBaudRateInput] = useState('115200');

  // System Info specifications useMemo
  const systemInfo = useMemo(() => {
    try {
      const os = window.require('os');
      const processVersions = window.process ? window.process.versions : (window.require ? window.require('process').versions : {});
      return {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpu: os.cpus()[0]?.model || 'Unknown CPU',
        totalMem: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`,
        freeMem: `${Math.round(os.freemem() / (1024 * 1024))} MB`,
        node: processVersions.node || 'Unknown',
        electron: processVersions.electron || 'Unknown',
        chrome: processVersions.chrome || 'Unknown',
        v8: processVersions.v8 || 'Unknown'
      };
    } catch (e) {
      return {
        platform: 'Unknown', release: 'Unknown', arch: 'Unknown', cpu: 'Unknown', totalMem: 'Unknown', freeMem: 'Unknown',
        node: 'Unknown', electron: 'Unknown', chrome: 'Unknown', v8: 'Unknown'
      };
    }
  }, []);

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
        setBootTriggerEnabled(true);
        setControlsDisabled(false);
        addLogLine(`Gateway interface online: ${data.type.toUpperCase()} -> ${data.target}`, 'success');

        if (data.type === 'serial') {
          setPingLatency({ value: 'USB Line', status: 'excellent' });
          setTimeout(() => {
            ipcRenderer.send('send-serial-command', 'GET_INFO');
          }, 1000);
        } else if (data.type === 'tcp') {
          setTimeout(() => {
            ipcRenderer.send('send-tcp-command', 'GET_INFO');
          }, 1000);
        }

        // Dynamically update active WiFi/OTA IP input fields upon successful connection (Requirement 4)
        if (data.type === 'tcp' && data.target) {
          const parts = data.target.split(':');
          if (parts.length > 0) {
            const connectedIp = parts[0];
            setWifiIp(connectedIp);
            setOtaIp(connectedIp);
            addLogLine(`[GUI] Dynamically updated WiFi/OTA target IP address to: ${connectedIp}`, 'success');
          }
        }
      } else {
        setConnection({ type: data.status === 'error' ? 'failed' : null, target: data.message || null });
        setBootTriggerEnabled(false);
        setControlsDisabled(true);
        setPingLatency({ value: 'Offline', status: 'offline' });
        // Comment out resetDiagnostics() to preserve diagnostics, IMEI, and MAC details during device reboots
        // resetDiagnostics();

        if (data.status === 'error') {
          addLogLine(`Connection error: ${data.message}`, 'error');
        } else {
          addLogLine('Gateway interface closed.', 'system');
        }
      }
    };
    ipcRenderer.on('connection-status', onConnectionStatus);

    const onUsbDetectStatus = (event, status) => {
      setUsbDetect(status);
      if (status.detected) {
        setSerialPorts(status.ports);
        if (status.port && !selectedSerialPort) {
          setSelectedSerialPort(status.port);
        }
      }
    };
    ipcRenderer.on('usb-detect-status', onUsbDetectStatus);

    // 3. Subscribe to console logs
    const onConsoleLog = (event, message) => {
      addLogLine(message);
    };
    ipcRenderer.on('console-log', onConsoleLog);

    // 4. Subscribe to diagnostics success and boot progress updates
    const onHardwarePayload = (event, payload) => {
      if (!payload) return;

      // Auto-extract IMEI/MAC/Password if present in payload (Requirement 4)
      if (payload.imei && payload.imei !== '--') {
        setImei(payload.imei);
        setImeiInput(payload.imei);
      }
      if (payload.mac && payload.mac !== '--') {
        setMac(payload.mac);
      }
      if (payload.password && payload.password !== '--') {
        setPassword(payload.password);
        setPasswordInput(payload.password);
      }

      if (payload.status === 'BOOT_PROGRESS' || payload.step === 'QCOM_SHIFT') {
        setBootProgress(payload.progress);
        setBootStep(payload.step);
        setBootMessage(payload.message);
        setIsBooting(true);
        setControlsDisabled(true);

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
        /* setOtaIp('192.168.4.1'); */
        // Maintain connection-dynamic IP or sync with current wifiIp state:
        if (wifiIp) {
          setOtaIp(wifiIp);
        }

        // Fix lockup bug: enable switchboard controls once boot is successful!
        setControlsDisabled(false);

        addLogLine('[SYS] Boot diagnostics report sync complete.', 'success');

        const newDiags = {};
        Object.keys(payload.diagnostics || {}).forEach(key => {
          newDiags[key] = payload.diagnostics[key] ? 'OK' : 'ERROR';
        });
        setDiagnostics(prev => ({ ...prev, ...newDiags }));
        if (payload.wifi) {
          setWifiDetails(payload.wifi);
        }
      } else if (payload.status === 'IMEI_UPDATED') {
        setImei(payload.imei);
        setImeiInput(payload.imei);
        addLogLine(`[SYS] Dynamic IMEI update completed successfully: ${payload.imei}`, 'success');
      } else if (payload.status === 'PASSWORD_UPDATED') {
        setPassword(payload.password);
        setPasswordInput(payload.password);
        addLogLine('[SYS] Dynamic Credentials Password update completed successfully.', 'success');
      } else if (payload.status === 'WIFI_UPDATED') {
        setWifiRouterSsid(payload.ssid);
        addLogLine(`[SYS] WiFi credentials updated on gateway. SSID is now: ${payload.ssid}`, 'success');
      } else if (payload.status === 'CERT_ADDED') {
        if (payload.certificates) {
          setCertificates(payload.certificates);
        } else {
          setCertificates(prev => {
            if (prev.some(c => c.name === payload.filename)) return prev;
            return [...prev, { name: payload.filename, size: payload.size }];
          });
        }
        setIsCertUploading(false);
        setCertUploadProgress(0);
        addLogLine(`[SYS] Certificate file successfully stored to SPIFFS and synchronized to QCOM: ${payload.filename}`, 'success');

        // Auto-trigger QCOM storage sync from GUI after cert upload finishes (Requirement 3)
        sendControlCommand('SYNC_CERTS_TO_QCOM');
        addLogLine(`[GUI] Auto-triggered QCOM certificate storage sync.`);
      } else if (payload.status === 'AP_CLIENT_CONNECTED') {
        addLogLine(`[WIFI AP STATUS] Client connected to SoftAP.`, 'success');
      } else if (payload.status === 'AP_CLIENT_DISCONNECTED') {
        addLogLine(`[WIFI AP STATUS] Client disconnected from SoftAP.`, 'error');
      } else if (payload.status === 'CERT_ERROR') {
        setIsCertUploading(false);
        setCertUploadProgress(0);
        addLogLine(`[ERROR] Certificate upload failed: ${payload.message}`, 'error');
        alert(`Certificate upload failed: ${payload.message}`);
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
      // If we are doing advanced flashing
      if (flashingQueueRef.current.length > 0 && currentSlotRef.current) {
        const slotId = currentSlotRef.current.id;

        if (update.status === 'uploading') {
          setOtaSlots(prev => prev.map(s => s.id === slotId ? { ...s, progress: update.progress } : s));
        } else if (update.status === 'success') {
          setOtaSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'success', progress: 100 } : s));
          addLogLine(`[OTA] Slot "${currentSlotRef.current.label}" flashed successfully.`, 'success');

          // Pop completed slot from queue
          flashingQueueRef.current.shift();
          currentSlotRef.current = null;

          // Proceed to next
          setTimeout(flashNextSlot, 500);
        } else if (update.status === 'error') {
          setOtaSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'error' } : s));
          addLogLine(`[OTA ERROR] Slot "${currentSlotRef.current.label}" failed: ${update.message}`, 'error');
          alert(`OTA Flashing Failed at slot "${currentSlotRef.current.label}":\n${update.message}`);

          // Clear remaining queue
          flashingQueueRef.current = [];
          currentSlotRef.current = null;
          setIsFlashingAdvanced(false);
          setControlsDisabled(false);
        }
      } else {
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
      }
    };
    ipcRenderer.on('ota-progress', onOtaProgress);

    const onGatewayDiscovered = (event, gateway) => {
      setDiscoveredGateways(prev => {
        if (prev.some(g => g.ip === gateway.ip)) return prev;
        return [...prev, gateway];
      });

      // Auto-fill and auto-connect when a gateway is discovered if we are offline
      setWifiIp(gateway.ip);
      setConnection(curr => {
        if (!curr.type || curr.type === 'failed') {
          addLogLine(`[AUTO CONNECT] Auto-connecting to discovered gateway at ${gateway.ip}:9000...`, 'system');
          ipcRenderer.send('connect-tcp', { ip: gateway.ip, port: '9000' });
        }
        return curr;
      });
    };
    ipcRenderer.on('gateway-discovered', onGatewayDiscovered);

    const onWifiScanStatus = (event, status) => {
      setNearbyHotspots(status.nearbyGateways || []);
    };
    ipcRenderer.on('wifi-scan-status', onWifiScanStatus);

    const onDiscoveryTimeout = () => {
      setIsScanningNetwork(false);
    };
    ipcRenderer.on('discovery-timeout', onDiscoveryTimeout);

    const onProvisionCertsStatus = (event, result) => {
      setIsDownloadingCerts(false);
      if (result.status === 'success') {
        setCertDownloadStatus('Success! Certificates provisioned to ESP32.');
        // Auto-trigger QCOM storage sync from GUI after cert upload finishes (Requirement 3)
        sendControlCommand('SYNC_CERTS_TO_QCOM');
        alert('Certificates downloaded & provisioned successfully!');
      } else {
        setCertDownloadStatus(`Failed: ${result.message}`);
        alert(`Certificate Provisioning Failed:\n${result.message}`);
      }
    };
    ipcRenderer.on('provision-certs-status', onProvisionCertsStatus);

    const onDbConnectionResult = (event, result) => {
      setIsReconnectingDb(false);
      if (result.connected) {
        setDbReconnectStatus('Database connected successfully.');
        addLogLine('[DATABASE] MongoDB reconnected successfully.', 'success');
        fetchDatabaseStatus();
        fetchDatabaseHistory();
      } else {
        setDbReconnectStatus(`Failed: ${result.message}`);
        addLogLine(`[DATABASE ERROR] MongoDB reconnection failed: ${result.message}`, 'error');
      }
    };
    ipcRenderer.on('database-connection-result', onDbConnectionResult);

    const onSpiffsStorageInfo = (event, result) => {
      setIsFetchingStorage(false);
      if (result.success) {
        setSpiffsStorage({
          totalBytes: result.totalBytes,
          usedBytes: result.usedBytes,
          files: result.files || []
        });
        setStorageError(null);
        addLogLine('[SPIFFS] Storage information retrieved successfully.', 'success');
      } else {
        setStorageError(result.error);
        addLogLine(`[SPIFFS ERROR] Failed to fetch storage: ${result.error}`, 'error');
      }
    };
    ipcRenderer.on('spiffs-storage-info', onSpiffsStorageInfo);

    const onSpiffsDeleteResult = (event, result) => {
      if (result.success) {
        addLogLine(`[SPIFFS] Deleted file ${result.filename} successfully.`, 'success');
        alert(`File ${result.filename} deleted successfully.`);
        ipcRenderer.send('get-spiffs-storage', { ip: otaIpRef.current, port: otaPortRef.current });
      } else {
        addLogLine(`[SPIFFS ERROR] Failed to delete file ${result.filename}: ${result.error}`, 'error');
        alert(`Delete Failed:\n${result.error}`);
      }
    };
    ipcRenderer.on('spiffs-delete-result', onSpiffsDeleteResult);

    const onCertStatusUpdate = (event, { file, status }) => {
      setCertStatuses(prev => ({ ...prev, [file]: status }));
    };
    ipcRenderer.on('cert-status-update', onCertStatusUpdate);

    const onSpiffsReadResult = (event, result) => {
      setIsReadingFile(false);
      if (result.success) {
        setSelectedSpiffsFile(result.filename);
        setSelectedFileContent(result.content);
        setFileContentEdit(result.content);
        setIsCreatingNewFile(false);
        addLogLine(`[SPIFFS] Successfully read file content for: ${result.filename}`, 'success');
      } else {
        alert(`Failed to read file: ${result.error}`);
        addLogLine(`[SPIFFS ERROR] Read failed: ${result.error}`, 'error');
      }
    };
    ipcRenderer.on('spiffs-read-result', onSpiffsReadResult);

    const onSpiffsUpdateResult = (event, result) => {
      setIsSavingFile(false);
      if (result.success) {
        alert(`File ${result.filename} updated successfully!`);
        addLogLine(`[SPIFFS] Saved file ${result.filename} successfully to ESP32.`, 'success');
        ipcRenderer.send('get-spiffs-storage', { ip: otaIpRef.current, port: otaPortRef.current });
      } else {
        alert(`Failed to update file: ${result.error}`);
        addLogLine(`[SPIFFS ERROR] Save failed: ${result.error}`, 'error');
      }
    };
    ipcRenderer.on('spiffs-update-result', onSpiffsUpdateResult);

    // Fetch initial app configuration (Requirement 6)
    ipcRenderer.invoke('get-app-config').then((config) => {
      if (config) {
        setDbUriInput(config.mongoUri || 'mongodb://localhost:27017/IOT_System_Manager');
        setExpressPortInput(String(config.expressPort || '8000'));
        setTelemetryPortInput(String(config.telemetryPort || '9000'));
        setOtaPortInput(String(config.otaPort || '500'));
        setUdpPortInput(String(config.udpPort || '5002'));
        setDefaultBaudRateInput(String(config.defaultBaudRate || '115200'));
      }
    });

    return () => {
      ipcRenderer.off('connection-status', onConnectionStatus);
      ipcRenderer.off('usb-detect-status', onUsbDetectStatus);
      ipcRenderer.off('console-log', onConsoleLog);
      ipcRenderer.off('hardware-payload', onHardwarePayload);
      ipcRenderer.off('control-payload-sync', onControlPayloadSync);
      ipcRenderer.off('telemetry-payload', onTelemetryPayload);
      ipcRenderer.off('ping-pong-reply', onPingPongReply);
      ipcRenderer.off('ota-progress', onOtaProgress);
      ipcRenderer.off('gateway-discovered', onGatewayDiscovered);
      ipcRenderer.off('wifi-scan-status', onWifiScanStatus);
      ipcRenderer.off('discovery-timeout', onDiscoveryTimeout);
      ipcRenderer.off('provision-certs-status', onProvisionCertsStatus);
      ipcRenderer.off('database-connection-result', onDbConnectionResult);
      ipcRenderer.off('spiffs-storage-info', onSpiffsStorageInfo);
      ipcRenderer.off('spiffs-delete-result', onSpiffsDeleteResult);
      ipcRenderer.off('cert-status-update', onCertStatusUpdate);
      ipcRenderer.off('spiffs-read-result', onSpiffsReadResult);
      ipcRenderer.off('spiffs-update-result', onSpiffsUpdateResult);
    };
  }, []);

  // Pre-populate device map from disk cache on startup for instant dashboard rendering.
  // This runs once on mount so the Telemetry Grid shows last-known device states
  // immediately — even before the device sends its first live packet.
  useEffect(() => {
    ipcRenderer.invoke('get-cached-telemetry')
      .then((result) => {
        if (result && Array.isArray(result.devices) && result.devices.length > 0) {
          setDevicesMap(prevMap => {
            const nextMap = new Map(prevMap);
            result.devices.forEach(dev => {
              if (dev && dev.id !== undefined) {
                // Mark as cached so live data can overwrite without flickering
                nextMap.set(dev.id, { ...dev, _fromCache: true });
              }
            });
            return nextMap;
          });
          addLogLine(`[CACHE] ⚡ Loaded ${result.devices.length} device(s) from disk cache — dashboard ready instantly.`, 'system');
        }
      })
      .catch((err) => {
        // Cache miss is fine — not an error
        console.log('[CACHE] No disk cache available on startup:', err.message);
      });
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
      fetchRegisteredDevices();
    }
  }, [activeTab]);

  // Terminal scroll handler
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'auto' });
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

  // REST API: Fetch registered devices configuration
  const fetchRegisteredDevices = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const data = await res.json();
        setRegisteredDevices(data);
      }
    } catch (err) {
      console.error('Failed to fetch registered devices:', err);
    }
  };

  // REST API: Register a new device configuration
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!regImei) {
      alert('IMEI is required.');
      return;
    }
    setIsRegisteringDevice(true);
    try {
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: regImei,
          pcbNumber: regPcb,
          password: regPass,
          routerSSID: regSsid,
          routerPassword: regWifiPass,
          telemetryInterval: parseInt(regInterval) || 1500
        })
      });
      if (res.ok) {
        alert('Device configuration registered/updated successfully.');
        setRegImei('');
        setRegPcb('');
        setRegPass('admin_secure_gate');
        setRegSsid('');
        setRegWifiPass('');
        setRegInterval('1500');
        fetchRegisteredDevices();
      } else {
        const errData = await res.json();
        alert(`Failed to save device: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Registration error: ${err.message}`);
    } finally {
      setIsRegisteringDevice(false);
    }
  };

  // REST API: Delete a device configuration
  const handleDeleteDevice = async (imei) => {
    if (!confirm(`Are you sure you want to unregister device IMEI ${imei}?`)) return;
    try {
      const res = await fetch(`/api/devices/${imei}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Device unregistered successfully.');
        fetchRegisteredDevices();
      } else {
        const errData = await res.json();
        alert(`Failed to delete: ${errData.error}`);
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // UI action: Push DB configuration directly to connected device
  const handlePushDeviceConfig = async (device) => {
    if (!connection.type) {
      alert('No active connection. Gateway must be connected (TCP or Serial) to push configuration.');
      return;
    }
    addLogLine(`[GUI] Manually pushing DB config to device (IMEI: ${device.imei})...`);
    try {
      if (device.password) {
        sendControlCommand(`SET_PASS:${device.password}`);
        addLogLine(`[CMD] Pushing Password: *****`);
      }
      if (device.telemetryInterval) {
        sendControlCommand(`SET_INTERVAL:${device.telemetryInterval}`);
        addLogLine(`[CMD] Pushing Telemetry Interval: ${device.telemetryInterval} ms`);
      }
      if (device.routerSSID) {
        sendControlCommand(`SET_WIFI:${device.routerSSID}:${device.routerPassword}`);
        addLogLine(`[CMD] Pushing Wi-Fi SSID: ${device.routerSSID}`);
        setTimeout(() => {
          sendControlCommand('REBOOT');
          addLogLine('[CMD] Dispatched REBOOT to gateway.');
        }, 1000);
      }
      alert('Configuration push commands dispatched successfully.');
    } catch (err) {
      alert(`Failed to push configuration: ${err.message}`);
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

  // Apply WiFi Router SSID and Password configuration to firmware
  const applyWifiRouterSettings = () => {
    if (!wifiRouterSsid) {
      alert('WiFi Router SSID cannot be empty.');
      return;
    }
    sendControlCommand(`SET_WIFI:${wifiRouterSsid}:${wifiRouterPass}`);
    addLogLine(`[CMD] Sending WiFi credentials update: SSID -> ${wifiRouterSsid}`);

    // Reboot the gateway automatically after 1 second so changes take effect
    setTimeout(() => {
      sendControlCommand('REBOOT');
      addLogLine('[CMD] Sent REBOOT command to Gateway.');
    }, 1000);
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
    setCertUploadProgress(10);
    addLogLine(`[SPIFFS] Initiating HTTP upload of certificate: ${file.name}...`);

    // Send file path, IP, and Port to Electron uploader IPC
    ipcRenderer.send('upload-certificate', { filePath: file.path, ip: otaIp, port: otaPort });

    // Update progress feedback for UI rendering
    setTimeout(() => setCertUploadProgress(40), 200);
    setTimeout(() => setCertUploadProgress(75), 500);
  };

  // Trigger Connections
  const connectSerial = () => {
    if (!selectedSerialPort) return;
    ipcRenderer.send('connect-serial', { portPath: selectedSerialPort, baudRate: selectedBaud, pcbNumber });
  };

  const connectWifi = () => {
    ipcRenderer.send('connect-tcp', { ip: wifiIp, port: wifiPort, pcbNumber });
  };

  const disconnectGateway = () => {
    ipcRenderer.send('disconnect-active');
  };

  const scanNetworkForGateway = () => {
    setIsScanningNetwork(true);
    setDiscoveredGateways([]);
    ipcRenderer.send('start-udp-discovery');
  };

  const connectDiscoveredGateway = (gateway) => {
    setWifiIp(gateway.ip);
    ipcRenderer.send('connect-tcp', { ip: gateway.ip, port: '9000', pcbNumber });
  };

  const startCertProvisioning = () => {
    if (!certRootCaUrl || !certDeviceCertUrl || !certPrivateKeyUrl) {
      alert('Please specify all three certificate URLs.');
      return;
    }

    // Check if IMEI and Password inputs are provided since they are used in formatting (Requirement 4)
    if (!imeiInput || !passwordInput) {
      alert('Please provide IMEI and Password inputs (in Security & Config) to format certificate URLs.');
      return;
    }

    const formatUrl = (url) => {
      return url
        .replace(/\{IMEI\}/gi, imeiInput)
        .replace(/\{IEMI\}/gi, imeiInput) // Handle IMEI vs IEMI typo
        .replace(/\{PASSWORD\}/gi, passwordInput)
        .replace(/\{PASS\}/gi, passwordInput); // Handle PASS vs PASSWORD template
    };

    setIsDownloadingCerts(true);
    setCertDownloadStatus('Initiating download...');
    setCertStatuses({
      'aws_root_ca.pem': 'idle',
      'device_cert.crt': 'idle',
      'private_key.key': 'idle'
    });
    ipcRenderer.send('download-and-provision-certs', {
      urls: {
        'aws_root_ca.pem': formatUrl(certRootCaUrl),
        'device_cert.crt': formatUrl(certDeviceCertUrl),
        'private_key.key': formatUrl(certPrivateKeyUrl)
      },
      ip: wifiIp,
      port: otaPort
    });
  };

  const saveAppConfigSettings = () => {
    const config = {
      mongoUri: dbUriInput,
      expressPort: parseInt(expressPortInput) || 8000,
      telemetryPort: parseInt(telemetryPortInput) || 9000,
      otaPort: parseInt(otaPortInput) || 500,
      udpPort: parseInt(udpPortInput) || 5002,
      defaultBaudRate: parseInt(defaultBaudRateInput) || 115200
    };
    ipcRenderer.send('save-app-config', config);
    alert('Settings saved successfully. Restart the application for port updates to take effect.');
  };

  const triggerDbReconnect = () => {
    setIsReconnectingDb(true);
    setDbReconnectStatus('Connecting...');
    ipcRenderer.send('reconnect-database', { uri: dbUriInput });
  };

  const triggerBoot = () => {
    sendControlCommand(`START_BOOT:${certPreUploadTarget}`);
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

  const testModule = (moduleKey) => {
    setDiagnostics(prev => ({ ...prev, [moduleKey]: 'TESTING' }));
    sendControlCommand(`TEST_${moduleKey.toUpperCase()}`);
    addLogLine(`[CMD] Triggering diagnostics check for module: ${moduleKey.toUpperCase()}`);
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

    const localSourcePath = otaFile.path || otaFile.name;
    addLogLine(`[OTA] Source File (Where bin is loaded from): ${localSourcePath}`);
    // Fix Issue 3: Log if address mode is active in standard OTA
    if (otaAddress && otaAddress.trim()) {
      addLogLine(`[OTA] Standard Mode - Targeted Address Flash: ${otaAddress.trim()} (no full erase)`, 'system');
    } else {
      addLogLine(`[OTA] Target Flashing Partition: ${otaTarget === 'esp32' ? 'ESP32 App Partition (Target app0/app1 dynamic switch)' : 'QCOM Co-processor Partition'}`);
    }
    addLogLine(`[OTA] Reading local binary file: ${otaFile.name}...`);

    const reader = new FileReader();
    reader.onload = () => {
      // Electron IPC automatically serializes ArrayBuffer as Buffer
      ipcRenderer.send('start-ota', {
        fileBuffer: reader.result,
        filename: otaFile.name,
        ip: otaIp,
        port: otaPort,
        target: otaTarget,
        filePath: localSourcePath,
        // Fix Issue 3: Pass address only if user specified one; otherwise standard OTA will use normal partitioning
        ...(otaAddress && otaAddress.trim() ? { address: otaAddress.trim(), reboot: true } : {})
      });
    };
    reader.onerror = (err) => {
      addLogLine(`[OTA] FileReader error: ${err.message}`, 'error');
      setOtaProgress({ status: 'error', message: 'Failed to read local binary file.' });
      setControlsDisabled(false);
    };
    reader.readAsArrayBuffer(otaFile);
  };

  const flashNextSlot = () => {
    if (flashingQueueRef.current.length === 0) {
      setIsFlashingAdvanced(false);
      setControlsDisabled(false);
      addLogLine('[OTA] Advanced Sequential Flashing Complete!', 'success');
      alert('All selected partitions flashed successfully!');
      return;
    }

    const nextSlot = flashingQueueRef.current[0];
    currentSlotRef.current = nextSlot;

    setOtaSlots(prev => prev.map(s => s.id === nextSlot.id ? { ...s, status: 'uploading', progress: 0 } : s));
    addLogLine(`[OTA] Flashing slot "${nextSlot.label}" to address ${nextSlot.address}...`);

    const reader = new FileReader();
    reader.onload = () => {
      const isLast = flashingQueueRef.current.length === 1;
      const shouldReboot = isLast ? autoRebootAdvanced : false;

      ipcRenderer.send('start-ota', {
        fileBuffer: reader.result,
        filename: nextSlot.file.name,
        ip: otaIpRef.current,
        port: otaPortRef.current,
        target: 'esp32',
        filePath: nextSlot.file.path || nextSlot.file.name,
        address: nextSlot.address,
        reboot: shouldReboot
      });
    };
    reader.onerror = (err) => {
      addLogLine(`[OTA] FileReader error for "${nextSlot.label}": ${err.message}`, 'error');
      setOtaSlots(prev => prev.map(s => s.id === nextSlot.id ? { ...s, status: 'error' } : s));
      flashingQueueRef.current = [];
      currentSlotRef.current = null;
      setIsFlashingAdvanced(false);
      setControlsDisabled(false);
    };
    reader.readAsArrayBuffer(nextSlot.file);
  };

  const startAdvancedOtaUpdate = () => {
    const activeSlots = otaSlots.filter(s => s.checked && s.file);
    if (activeSlots.length === 0) {
      alert('Please check at least one slot and select a valid .bin file.');
      return;
    }

    setOtaSlots(prev => prev.map(s => {
      if (s.checked && s.file) {
        return { ...s, status: 'pending', progress: 0 };
      }
      return s;
    }));

    setControlsDisabled(true);
    setIsFlashingAdvanced(true);

    flashingQueueRef.current = activeSlots;
    flashNextSlot();
  };

  const refreshSpiffsStorage = () => {
    setIsFetchingStorage(true);
    setStorageError(null);
    ipcRenderer.send('get-spiffs-storage', { ip: otaIp, port: otaPort });
  };

  const handleDeleteSpiffsFile = (filename) => {
    if (confirm(`Are you sure you want to delete ${filename} from ESP32 SPIFFS storage?`)) {
      ipcRenderer.send('delete-spiffs-file', { ip: otaIp, port: otaPort, filename });
    }
  };

  const handleReadSpiffsFile = (filename) => {
    setIsReadingFile(true);
    ipcRenderer.send('read-spiffs-file', { ip: otaIp, port: otaPort, filename });
  };

  const handleSaveSpiffsFileContent = () => {
    const filename = isCreatingNewFile ? newFileNameInput.trim() : selectedSpiffsFile;
    if (!filename) {
      alert('Please specify a filename.');
      return;
    }
    const cleanFilename = filename.startsWith('/') ? filename : '/' + filename;
    setIsSavingFile(true);
    ipcRenderer.send('update-spiffs-file', {
      ip: otaIp,
      port: otaPort,
      filename: cleanFilename,
      content: fileContentEdit
    });
  };

  const handleNewSpiffsFileSetup = () => {
    setIsCreatingNewFile(true);
    setSelectedSpiffsFile('');
    setSelectedFileContent('');
    setFileContentEdit('');
    setNewFileNameInput('/untitled.txt');
  };

  useEffect(() => {
    if (connection.type === 'tcp' && otaIp) {
      ipcRenderer.send('get-spiffs-storage', { ip: otaIp, port: otaPort });
    }
  }, [connection.type, otaIp, otaPort]);

  const startOtaUrlUpdate = () => {
    if (!firmwareUrl) {
      alert('Please specify a valid firmware URL.');
      return;
    }
    setControlsDisabled(true);
    setOtaProgress({ status: 'uploading', progress: 0 });
    addLogLine(`[OTA] Initiating step-by-step firmware URL update from: ${firmwareUrl}...`);
    ipcRenderer.send('download-and-flash-firmware', { firmwareUrl, ip: otaIp, port: otaPort, target: otaTarget });
  };

  return (
    <>
      {/* Frameless window header bar */}
      <div className="window-titlebar">
        <div className="titlebar-logo">
          <div className="logo-dot"></div>
          <span>IOT System Manager</span>
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
              <h2>IOT System Manager</h2>
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

            <button className={`nav-item ${activeTab === 'page-hardware' ? 'active' : ''}`} onClick={() => setActiveTab('page-hardware')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Hardware Info</span>
            </button>

            <button className={`nav-item ${activeTab === 'page-cert-provision' ? 'active' : ''}`} onClick={() => setActiveTab('page-cert-provision')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 11l2 2 4-4" />
              </svg>
              <span>Cert Provisioning</span>
            </button>

            <button className={`nav-item ${activeTab === 'page-storage' ? 'active' : ''}`} onClick={() => setActiveTab('page-storage')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>ESP32 Storage</span>
            </button>

            <button className={`nav-item ${activeTab === 'page-settings' ? 'active' : ''}`} onClick={() => setActiveTab('page-settings')}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>App Settings</span>
            </button>
          </nav>

          <div className="sidebar-status-box">
            <div className="status-indicator">
              <span className={`pulse-dot ${connection.type === 'failed' ? 'error' : connection.type ? 'connected' : 'idle'}`}></span>
              <span>{connection.type === 'failed' ? 'Connection Failed' : connection.type ? 'Gateway Online' : 'Not Connected'}</span>
            </div>
            <div className="connection-details">
              {connection.type === 'failed' ? connection.target : connection.type ? `Port: ${connection.type.toUpperCase()}\n${connection.target}` : 'Gateway Offline'}
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
              <div className={`connection-pill ${connection.type === 'failed' ? 'failed' : connection.type ? 'connected' : ''}`}>
                {connection.type === 'failed' ? 'CONNECTION FAILED' : connection.type ? `${connection.type.toUpperCase()} ACTIVE` : 'DISCONNECTED'}
              </div>
            </header>

            <div className="dashboard-top-grid">

              {/* Interface Control Panel */}
              <div className="glass-card connection-panel">
                <h3><span className="icon">&#128268;</span> Connect Gateway</h3>

                {(!connection.type || connection.type === 'failed') ? (
                  <>
                    <div className="input-group" style={{ marginBottom: '15px' }}>
                      <label>PCB Serial Number</label>
                      <input
                        type="text"
                        value={pcbNumber}
                        onChange={(e) => setPcbNumber(e.target.value)}
                        placeholder="e.g. PCB-ESP32-v3-987"
                      />
                    </div>

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
                        <div className="button-row" style={{ display: 'flex', gap: '10px' }}>
                          <button className="btn btn-primary" style={{ flex: 1 }} onClick={connectWifi}>Open Socket (9000)</button>
                          <button className="btn btn-accent" style={{ flex: 1 }} onClick={scanNetworkForGateway} disabled={isScanningNetwork}>
                            {isScanningNetwork ? 'Scanning...' : 'Auto-Detect'}
                          </button>
                        </div>

                        {nearbyHotspots.length > 0 && (
                          <div className="nearby-hotspots-list" style={{ marginTop: '15px', padding: '10px', background: 'rgba(0,255,200,0.03)', borderRadius: '8px', border: '1px solid rgba(0,255,200,0.1)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#00ffcc', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}>
                              📶 Wireless APs Visible Nearby:
                            </span>
                            {nearbyHotspots.map((ssid, index) => (
                              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: index < nearbyHotspots.length - 1 ? '1px dashed rgba(0,255,200,0.05)' : 'none' }}>
                                <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#00ffcc' }}>{ssid}</span>
                                <span style={{ fontSize: '10px', color: '#8080a0', fontStyle: 'italic' }}>Connect PC to this SSID</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {discoveredGateways.length > 0 && (
                          <div className="discovered-gateways-list" style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-pink)', display: 'block', marginBottom: '5px' }}>Discovered Devices:</span>
                            {discoveredGateways.map((gw, index) => (
                              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: index < discoveredGateways.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{gw.ip} ({gw.imei})</span>
                                <button className="btn btn-secondary small" style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px' }} onClick={() => connectDiscoveredGateway(gw)}>Connect</button>
                              </div>
                            ))}
                          </div>
                        )}
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
                        <div className="button-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn btn-primary" style={{ flex: '1 1 100%' }} onClick={connectSerial}>Open COM</button>
                          <button className="btn btn-accent" style={{ flex: '1 1 100%' }} onClick={triggerBoot} disabled={!bootTriggerEnabled}>START_BOOT</button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {connection.type === 'serial' && (
                      <div className="button-row" style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => ipcRenderer.send('reset-device')}>Reset ESP32</button>
                        <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => ipcRenderer.send('enter-bootloader')}>Flash Mode</button>
                      </div>
                    )}
                    <button className="btn btn-danger" onClick={disconnectGateway}>Disconnect active link</button>
                  </div>
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
                    <div key={key} className={`diag-item ${diagnostics[key] === 'OK' ? 'success' : diagnostics[key] === 'ERROR' ? 'error' : diagnostics[key] === 'TESTING' ? 'warning' : ''}`}>
                      <div className="diag-indicator"></div>
                      <div className="diag-label" style={{ flex: 1 }}>{key.toUpperCase()} Module</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="diag-value" style={{ fontSize: '11px', fontWeight: 'bold' }}>{diagnostics[key]}</div>
                        {connection.type && diagnostics[key] !== 'TESTING' && (
                          <button
                            className="btn btn-secondary small"
                            style={{ padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto', margin: 0, border: '1px solid rgba(249, 83, 198, 0.3)', cursor: 'pointer' }}
                            onClick={() => testModule(key)}
                          >
                            Test
                          </button>
                        )}
                      </div>
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
                  <button className="btn btn-danger" onClick={() => sendControlCommand('REBOOT')} disabled={!connection.type}>
                    <span className="btn-icon">&#10227;</span> Reboot Gateway
                  </button>
                  <div className="ping-widget">
                    <span className="ping-label">Socket RTT Ping:</span>
                    <span className={`ping-result ${pingLatency.status}`}>{pingLatency.value}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* System Boot & Update Orchestrator */}
            {connection.type && (
              <div className="glass-card boot-orchestrator-card">
                <div className="boot-orchestrator-header">
                  <div className="boot-title-wrapper">
                    <h3><span className="icon">&#9889;</span> System Boot & Update Orchestrator</h3>
                    <p className="boot-subtitle">Manage ESP32 certificate provisioning, QCOM device syncing, and firmware flashes</p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {!isBooting && bootProgress === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select
                          value={certPreUploadTarget}
                          onChange={(e) => setCertPreUploadTarget(e.target.value)}
                          className="filter-select"
                          style={{ height: '42px', margin: 0, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px', padding: '0 10px', fontSize: '12px' }}
                        >
                          <option value="BOTH">Upload to both ESP32 & QCOM</option>
                          <option value="ESP32">Upload to ESP32 Only</option>
                          <option value="QCOM">Upload to QCOM Only</option>
                          <option value="SKIP">Skip Certificate Pre-Upload</option>
                        </select>
                        <button className="btn btn-accent boot-start-btn" onClick={triggerBoot}>
                          <span className="btn-icon">&#9658;</span> Start Boot Sequence
                        </button>
                      </div>
                    )}
                    {bootProgress < 100 && (
                      <button
                        className="btn btn-secondary boot-bypass-btn"
                        onClick={() => {
                          setIsBooting(false);
                          setBootProgress(100);
                          setBootStep('COMPLETE');
                          setBootMessage('Boot diagnostics bypassed by user.');
                          setControlsDisabled(false);
                          addLogLine('[SYS] Boot diagnostics sequence bypassed from GUI.', 'warning');
                        }}
                        style={{ height: '42px' }}
                      >
                        Skip Boot Diagnostics
                      </button>
                    )}
                  </div>
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
                          <span className="metric-label">{dev.id === 1 ? 'Memory Usage' : 'Battery'}</span>
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

            {/* Dashboard Real-time Console Log Drawer Widget (Requirement 1 & 3) */}
            <div className="glass-card" style={{ marginTop: '20px', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="icon" style={{ animation: 'pulse 2s infinite' }}>📺</span> Live Serial & Socket Terminal Output
                </h3>
                <button
                  className="btn btn-danger small"
                  onClick={() => setConsoleLogs([])}
                  style={{ margin: 0, height: '24px', padding: '0 10px', fontSize: '11px', minWidth: 'auto' }}
                >
                  Clear Console Logs
                </button>
              </div>
              <div
                style={{
                  background: '#040209',
                  borderRadius: '6px',
                  border: '1px solid var(--glass-border)',
                  padding: '10px',
                  height: '150px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  textAlign: 'left'
                }}
              >
                {consoleLogs.slice(-50).map((log, idx) => (
                  <div key={idx} className={`terminal-line ${log.type}`} style={{ margin: '2px 0' }}>
                    [{log.time}] {log.text}
                  </div>
                ))}
                {consoleLogs.length === 0 && (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px 0' }}>
                    No terminal log data available. Connect ESP32 serial or TCP port to receive streams.
                  </div>
                )}
              </div>
            </div>

          </section>

          {/* ================= VIEW 2: MONGODB DATABASE LOGS & REGISTRY ================= */}
          <section id="page-database" className={`page-view ${activeTab === 'page-database' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>MERN Database Dashboard</h1>
                <p>Review telemetry history logs and manage registered device configurations stored in MongoDB</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`btn ${dbSubTab === 'tab-db-history' ? 'btn-primary' : 'btn-secondary'} small`} onClick={() => setDbSubTab('tab-db-history')} style={{ minWidth: 'auto', padding: '0 15px', height: '36px' }}>Telemetry History</button>
                <button className={`btn ${dbSubTab === 'tab-db-devices' ? 'btn-primary' : 'btn-secondary'} small`} onClick={() => setDbSubTab('tab-db-devices')} style={{ minWidth: 'auto', padding: '0 15px', height: '36px' }}>Device Registry</button>
                <button className="btn btn-danger small" style={{ width: 'auto', height: '36px' }} onClick={clearDatabaseLogs}>Clear database logs</button>
              </div>
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

              {dbSubTab === 'tab-db-history' ? (
                /* logs display */
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
              ) : (
                /* registered devices registry view */
                <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '15px' }}>
                  {/* Registry Form */}
                  <div className="glass-card">
                    <h3><span className="icon">📝</span> Register Device Config</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                      Register or modify target settings associated with a specific device IMEI ID. Settings automatically sync upon connection.
                    </p>

                    <form onSubmit={handleRegisterDevice}>
                      <div className="input-group">
                        <label>Device IMEI ID *</label>
                        <input
                          type="text"
                          value={regImei}
                          onChange={(e) => setRegImei(e.target.value)}
                          placeholder="e.g. 866738083623502"
                          required
                        />
                      </div>

                      <div className="input-group">
                        <label>PCB Serial Number</label>
                        <input
                          type="text"
                          value={regPcb}
                          onChange={(e) => setRegPcb(e.target.value)}
                          placeholder="e.g. PCB-ESP32-v3-987"
                        />
                      </div>

                      <div className="input-group">
                        <label>Gateway Password</label>
                        <input
                          type="password"
                          value={regPass}
                          onChange={(e) => setRegPass(e.target.value)}
                          placeholder="Device credentials password"
                        />
                      </div>

                      <div className="input-group">
                        <label>Target Router SSID</label>
                        <input
                          type="text"
                          value={regSsid}
                          onChange={(e) => setRegSsid(e.target.value)}
                          placeholder="SSID of Wireless Router"
                        />
                      </div>

                      <div className="input-group">
                        <label>Router Password</label>
                        <input
                          type="password"
                          value={regWifiPass}
                          onChange={(e) => setRegWifiPass(e.target.value)}
                          placeholder="Router WPA2 Passphrase"
                        />
                      </div>

                      <div className="input-group">
                        <label>Telemetry Interval (ms)</label>
                        <input
                          type="number"
                          value={regInterval}
                          onChange={(e) => setRegInterval(e.target.value)}
                          placeholder="1500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isRegisteringDevice}
                        style={{ marginTop: '15px', width: '100%' }}
                      >
                        {isRegisteringDevice ? 'Saving Registry...' : 'Save Configuration Profile'}
                      </button>
                    </form>
                  </div>

                  {/* Registered Devices List Table */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3><span className="icon">📡</span> Registered Device Profiles ({registeredDevices.length})</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                      List of device configurations registered inside the MongoDB database.
                    </p>

                    <div style={{ maxHeight: '420px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', flex: 1 }}>
                      {registeredDevices.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#707090', fontStyle: 'italic' }}>
                          No configurations found in database registry. Fill form to register.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent-pink)', textAlign: 'left' }}>
                              <th style={{ padding: '8px' }}>IMEI / PCB Serial</th>
                              <th style={{ padding: '8px' }}>Password</th>
                              <th style={{ padding: '8px' }}>SSID Target</th>
                              <th style={{ padding: '8px' }}>Rate Interval</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registeredDevices.map((dev) => (
                              <tr key={dev._id || dev.imei} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e0e0f0' }}>
                                <td style={{ padding: '8px' }}>
                                  <div style={{ fontWeight: 'bold', color: 'white' }}>{dev.imei}</div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{dev.pcbNumber || 'No PCB Serial'}</div>
                                </td>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{dev.password || 'admin_secure_gate'}</td>
                                <td style={{ padding: '8px' }}>{dev.routerSSID || '--'}</td>
                                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{dev.telemetryInterval}ms</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      className="btn btn-secondary small"
                                      style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto' }}
                                      onClick={() => {
                                        setRegImei(dev.imei);
                                        setRegPcb(dev.pcbNumber || '');
                                        setRegPass(dev.password || 'admin_secure_gate');
                                        setRegSsid(dev.routerSSID || '');
                                        setRegWifiPass(dev.routerPassword || '');
                                        setRegInterval(String(dev.telemetryInterval || 1500));
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn btn-accent small"
                                      style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto' }}
                                      onClick={() => handlePushDeviceConfig(dev)}
                                    >
                                      Push
                                    </button>
                                    <button
                                      className="btn btn-danger small"
                                      style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto', background: 'rgba(255, 0, 85, 0.1)', border: '1px solid rgba(255, 0, 85, 0.3)', color: '#ff0055' }}
                                      onClick={() => handleDeleteDevice(dev.imei)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

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

                <div className="ota-settings" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div className="input-group" style={{ flex: 1, minWidth: '180px', maxWidth: '250px' }}>
                    <label>Gateway HTTP Address (IP)</label>
                    <input type="text" value={otaIp} onChange={(e) => setOtaIp(e.target.value)} />
                  </div>
                  <div className="input-group" style={{ flex: 1, minWidth: '100px', maxWidth: '120px' }}>
                    <label>Port ID</label>
                    <input type="text" value={otaPort} onChange={(e) => setOtaPort(e.target.value)} placeholder="8000" />
                  </div>
                  <div className="input-group" style={{ flex: 1, minWidth: '200px', maxWidth: '250px' }}>
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
                  <div className="input-group" style={{ flex: 1, minWidth: '180px', maxWidth: '220px' }}>
                    <label>Flashing Mode</label>
                    <select
                      value={otaMode}
                      onChange={(e) => setOtaMode(e.target.value)}
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
                      <option value="standard" style={{ background: '#1c1b22', color: 'white' }}>Standard Full OTA</option>
                      <option value="advanced" style={{ background: '#1c1b22', color: 'white' }}>Advanced Multi-File</option>
                    </select>
                  </div>
                </div>

                {otaMode === 'advanced' ? (
                  <div className="advanced-ota-layout" style={{ marginTop: '20px' }}>
                    <div style={{
                      background: 'rgba(0, 240, 255, 0.02)',
                      border: '1px dashed rgba(0, 240, 255, 0.2)',
                      padding: '15px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      marginBottom: '15px',
                      lineHeight: '1.4'
                    }}>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                        ADVANCED SEQUENTIAL FLASHING CONTROLS (NO FULL ERASE)
                      </span>
                      Write compiled binary segments at arbitrary address offsets. Only checked slots with chosen files will be updated. The device will dynamically erase only the required sectors.
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {otaSlots.map((slot) => (
                        <div key={slot.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--glass-border)',
                          padding: '10px 15px',
                          borderRadius: '8px',
                          flexWrap: 'wrap'
                        }}>
                          {/* Checked Menu (Requirement 3) */}
                          <input
                            type="checkbox"
                            checked={slot.checked}
                            onChange={() => {
                              setOtaSlots(prev => prev.map(s => s.id === slot.id ? { ...s, checked: !s.checked } : s));
                            }}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />

                          <input
                            type="text"
                            value={slot.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOtaSlots(prev => prev.map(s => s.id === slot.id ? { ...s, label: val } : s));
                            }}
                            placeholder="Slot Label"
                            style={{
                              flex: '1 1 120px',
                              height: '32px',
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              color: 'white',
                              fontSize: '13px',
                              outline: 'none'
                            }}
                          />

                          {/* Address input */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Offset:</span>
                            <input
                              type="text"
                              value={slot.address}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOtaSlots(prev => prev.map(s => s.id === slot.id ? { ...s, address: val } : s));
                              }}
                              placeholder="e.g. 0x10000"
                              style={{
                                width: '90px',
                                height: '32px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                color: 'white',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                textAlign: 'center',
                                outline: 'none'
                              }}
                            />
                          </div>

                          {/* File input / chosen file display */}
                          <div style={{ flex: '2 2 200px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn btn-secondary small-btn"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.bin';
                                input.onchange = (e) => {
                                  if (e.target.files.length > 0) {
                                    const file = e.target.files[0];
                                    setOtaSlots(prev => prev.map(s => s.id === slot.id ? { ...s, file: file } : s));
                                  }
                                };
                                input.click();
                              }}
                              style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}
                            >
                              Choose Bin
                            </button>
                            <span style={{ fontSize: '12px', color: slot.file ? '#fff' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              {slot.file ? slot.file.name : 'No file selected'}
                            </span>
                          </div>

                          {/* Slot Progress / Status display */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                            {slot.status === 'uploading' && (
                              <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: 'bold' }}>
                                Flashing: {slot.progress || 0}%
                              </span>
                            )}
                            {slot.status === 'success' && (
                              <span style={{ color: 'var(--accent-emerald)', fontSize: '11px', fontWeight: 'bold' }}>
                                &#10004; Success
                              </span>
                            )}
                            {slot.status === 'error' && (
                              <span style={{ color: 'var(--accent-pink)', fontSize: '11px', fontWeight: 'bold' }}>
                                &#10008; Fail
                              </span>
                            )}
                            {slot.status === 'pending' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                Pending...
                              </span>
                            )}
                            {slot.status === 'idle' && (
                              <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                                Ready
                              </span>
                            )}
                          </div>

                          {/* Remove button (custom only) */}
                          {slot.id > 10 && (
                            <button
                              onClick={() => {
                                setOtaSlots(prev => prev.filter(s => s.id !== slot.id));
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255,255,255,0.3)',
                                fontSize: '14px',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              &#x2715;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setOtaSlots(prev => [...prev, {
                            id: Date.now(),
                            label: 'Custom Block',
                            address: '0x170000',
                            file: null,
                            checked: true,
                            progress: null,
                            status: 'idle'
                          }]);
                        }}
                        style={{ height: '36px', padding: '0 15px', fontSize: '12px' }}
                      >
                        + Add Flashing Slot
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                        <input
                          type="checkbox"
                          id="autoRebootCheck"
                          checked={autoRebootAdvanced}
                          onChange={(e) => setAutoRebootAdvanced(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label htmlFor="autoRebootCheck" style={{ fontSize: '12px', cursor: 'pointer', color: 'var(--text-dim)' }}>
                          Reboot device when complete
                        </label>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary large"
                      onClick={startAdvancedOtaUpdate}
                      disabled={isFlashingAdvanced || controlsDisabled}
                      style={{ marginTop: '20px', width: '100%' }}
                    >
                      {isFlashingAdvanced ? 'Sequential Flashing...' : 'Flash Checked Binaries'}
                    </button>
                  </div>
                ) : (
                  <>
                    {otaTarget === 'esp32' && (
                      <div className="partition-memory-map" style={{
                        marginTop: '10px',
                        padding: '15px',
                        background: 'rgba(0, 240, 255, 0.03)',
                        border: '1px dashed rgba(0, 240, 255, 0.25)',
                        borderRadius: '10px',
                        fontSize: '12px'
                      }}>
                        <span style={{ color: 'var(--accent-blue)', fontWeight: '800', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ESP32 Custom Partition Memory Layout (partitions.csv)
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontFamily: 'monospace' }}>
                          <div style={{ flex: 1, minWidth: '120px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <strong style={{ color: 'white' }}>bootloader</strong><br />
                            Offset: 0x0000<br />
                            Size: 32KB
                          </div>
                          <div style={{ flex: 1, minWidth: '120px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <strong style={{ color: 'white' }}>partitions</strong><br />
                            Offset: 0x8000<br />
                            Size: 4KB
                          </div>
                          <div style={{ flex: 1, minWidth: '120px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <strong style={{ color: 'white' }}>otadata</strong><br />
                            Offset: 0xe000<br />
                            Size: 8KB
                          </div>
                          <div style={{ flex: 1, minWidth: '120px', padding: '8px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                            <strong style={{ color: 'var(--accent-blue)' }}>app0 (OTA update)</strong><br />
                            Offset: 0x10000<br />
                            Size: 1408KB
                          </div>
                          <div style={{ flex: 1, minWidth: '120px', padding: '8px', background: 'rgba(249, 83, 198, 0.05)', borderRadius: '6px', border: '1px solid rgba(249, 83, 198, 0.15)' }}>
                            <strong style={{ color: 'var(--accent-pink)' }}>app1 (Main application)</strong><br />
                            Offset: 0x170000<br />
                            Size: 1408KB
                          </div>
                        </div>
                        <div style={{ marginTop: '10px', color: 'var(--text-dim)', fontSize: '11px', lineHeight: '1.4' }}>
                          <strong>Active Destination Target:</strong> Writes (pastes) the bin file to the inactive partition (writes to <strong>app1 at 0x170000</strong> if running the loader on app0, or writes to <strong>app0 at 0x10000</strong> if running the application on app1) and switches boot target.
                        </div>
                      </div>
                    )}

                    {/* Fix Issue 3: Optional Target Address field for Standard OTA mode */}
                    <div style={{ marginTop: '15px', padding: '14px', background: 'rgba(0, 240, 255, 0.02)', border: '1px solid rgba(0, 240, 255, 0.15)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '5px' }}>
                            Target Flash Address (Optional)
                          </label>
                          <input
                            type="text"
                            value={otaAddress}
                            onChange={(e) => setOtaAddress(e.target.value)}
                            placeholder="e.g. 0x10000 (leave blank for standard OTA)"
                            style={{
                              width: '100%',
                              height: '36px',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '6px',
                              color: 'white',
                              fontFamily: 'monospace',
                              fontSize: '13px',
                              padding: '0 10px',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '280px', lineHeight: '1.5' }}>
                          If set, writes binary <strong>only to this flash address</strong> without erasing the whole device. Leave blank to use the standard OTA partition switching mechanism.
                        </div>
                      </div>
                      {otaAddress && otaAddress.trim() && (
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                          ⚡ Targeted flash mode active → Writing to address <strong>{otaAddress.trim()}</strong>
                        </div>
                      )}
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
                      <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>Browse files</button>
                      <input type="file" accept=".bin" style={{ display: 'none' }} ref={fileInputRef} onChange={(e) => {
                        if (e.target.files.length > 0) handleOtaFileChange(e.target.files[0]);
                      }} />

                      {otaFile && (
                        <div className="selected-file-display" onClick={(e) => e.stopPropagation()}>
                          <span className="file-name" style={{ wordBreak: 'break-all' }}>{otaFile.path || otaFile.name}</span>
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

                    <div className="ota-actions" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <button className="btn btn-primary large" onClick={startOtaUpdate} disabled={!otaFile || otaProgress !== null}>
                        Initiate local file flash update
                      </button>

                      {/* Remote flasher URL section (Requirement 3) */}
                      <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                        <h4 style={{ fontSize: '13px', color: 'var(--accent-pink)', marginBottom: '10px' }}>Flash from remote Firmware URL / API</h4>
                        <div className="input-group">
                          <label>Remote Binary URL (.bin)</label>
                          <input
                            type="text"
                            value={firmwareUrl}
                            onChange={(e) => setFirmwareUrl(e.target.value)}
                            placeholder="e.g. http://127.0.0.1:8000/firmware.bin"
                          />
                        </div>
                        <button
                          className="btn btn-accent"
                          onClick={startOtaUrlUpdate}
                          disabled={!firmwareUrl || otaProgress !== null}
                          style={{ marginTop: '10px', width: '100%', height: '40px' }}
                        >
                          Fetch, Download & Flash Remote Firmware
                        </button>
                      </div>
                    </div>
                  </>
                )}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    />
                  </div>

                  <div className="input-group">
                    <label>Gateway Password</label>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter device passphrase"
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

                {/* WiFi Router Credentials Configuration Card */}
                <div className="glass-card">
                  <h3><span className="icon">&#128246;</span> WiFi Router Credentials</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                    Update the SSID and Passphrase for the external wireless router. Gateway will store credentials to SPIFFS and auto-reboot to apply.
                  </p>

                  <div className="input-group">
                    <label>Router SSID</label>
                    <input
                      type="text"
                      value={wifiRouterSsid}
                      onChange={(e) => setWifiRouterSsid(e.target.value)}
                      placeholder="SSID of Wireless Router"
                    />
                  </div>

                  <div className="input-group">
                    <label>Router Password</label>
                    <input
                      type="password"
                      value={wifiRouterPass}
                      onChange={(e) => setWifiRouterPass(e.target.value)}
                      placeholder="Router WPA2 Passphrase"
                    />
                  </div>

                  <button
                    className="btn btn-accent"
                    onClick={applyWifiRouterSettings}
                    disabled={!connection.type}
                    style={{ marginTop: '10px' }}
                  >
                    Apply & Reboot Gateway
                  </button>
                </div>
              </div>

              <div className="glass-card">
                <h3><span className="icon">&#128190;</span> ESP32 SPIFFS Storage & File Inspector</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Inspect space utilization and manage active configuration / certificate files stored directly in the ESP32 SPIFFS filesystem.
                </p>

                {spiffsStorage.totalBytes > 0 && (
                  <div className="storage-utilization" style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '12px 15px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    marginBottom: '15px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Used Storage: <strong style={{ color: '#fff' }}>{Math.round(spiffsStorage.usedBytes / 1024)} KB</strong> / {Math.round(spiffsStorage.totalBytes / 1024)} KB</span>
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{Math.round((spiffsStorage.totalBytes - spiffsStorage.usedBytes) / 1024)} KB Free</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (spiffsStorage.usedBytes * 100) / spiffsStorage.totalBytes)}%`,
                        background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-pink))',
                        boxShadow: '0 0 8px rgba(0, 240, 255, 0.4)'
                      }}></div>
                    </div>
                  </div>
                )}

                {storageError && (
                  <div style={{ color: 'var(--accent-pink)', fontSize: '11px', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
                    Failed to communicate with storage API: {storageError}
                  </div>
                )}

                <div className="cert-list-container" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '15px' }}>
                  {spiffsStorage.files.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      No SPIFFS data queried yet. Use the refresh button below to scan ESP32.
                    </div>
                  ) : (
                    spiffsStorage.files.map((file, idx) => {
                      const cleanName = file.name.startsWith('/') ? file.name.substring(1) : file.name;
                      return (
                        <div key={idx} className="cert-item-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', marginBottom: '4px' }}>
                          <div className="cert-item-details" style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="cert-item-name" style={{ fontWeight: 'bold', color: 'white', fontSize: '12px' }}>{cleanName}</span>
                            <span className="cert-item-size" style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{file.size} bytes</span>
                          </div>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleDeleteSpiffsFile(file.name)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '10px',
                              height: '24px',
                              background: 'rgba(255, 0, 85, 0.1)',
                              border: '1px solid rgba(255, 0, 85, 0.3)',
                              color: '#ff0055',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <button className="btn btn-secondary" onClick={refreshSpiffsStorage} disabled={isFetchingStorage} style={{ flex: 1, height: '36px', fontSize: '12px' }}>
                    {isFetchingStorage ? 'Querying Filesystem...' : 'Refresh Storage Inspector'}
                  </button>
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
                    if (connection.type && connection.type !== 'failed') {
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
                    opacity: (connection.type && connection.type !== 'failed') ? 1 : 0.5,
                    cursor: (connection.type && connection.type !== 'failed') ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div className="drop-icon" style={{ fontSize: '24px', marginBottom: '8px' }}>&#128228;</div>
                  <h4 style={{ fontSize: '13px' }}>Drag & Drop Certificate file here</h4>
                  <p style={{ fontSize: '11px' }}>Supports .pem, .crt, .key formats</p>
                </div>

                {/* Auto-Download from URL */}
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ fontSize: '13px', color: 'var(--accent-pink)', marginBottom: '10px' }}>Auto-Download from URL</h4>

                   <div className="input-group">
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <label>Root CA Certificate URL (.pem)</label>
                       <CertStatusBadge status={certStatuses['aws_root_ca.pem']} />
                     </div>
                     <input
                       type="text"
                       value={certRootCaUrl}
                       onChange={(e) => setCertRootCaUrl(e.target.value)}
                       placeholder="e.g. https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=1&PROJCD=re"
                       disabled={isDownloadingCerts}
                     />
                   </div>
                   <div className="input-group">
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <label>Device Certificate URL (.crt)</label>
                       <CertStatusBadge status={certStatuses['device_cert.crt']} />
                     </div>
                     <input
                       type="text"
                       value={certDeviceCertUrl}
                       onChange={(e) => setCertDeviceCertUrl(e.target.value)}
                       placeholder="e.g. https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=2&PROJCD=re"
                       disabled={isDownloadingCerts}
                     />
                   </div>
                   <div className="input-group">
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <label>Private Key URL (.key)</label>
                       <CertStatusBadge status={certStatuses['private_key.key']} />
                     </div>
                     <input
                       type="text"
                       value={certPrivateKeyUrl}
                       onChange={(e) => setCertPrivateKeyUrl(e.target.value)}
                       placeholder="e.g. https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IMEI}&user={IMEI}&pass={PASSWORD}&ctype=3&PROJCD=re"
                       disabled={isDownloadingCerts}
                     />
                   </div>

                  <button
                    className="btn btn-primary"
                    onClick={startCertProvisioning}
                    disabled={(!connection.type || connection.type === 'failed') || isDownloadingCerts}
                    style={{ marginTop: '10px', width: '100%' }}
                  >
                    {isDownloadingCerts ? 'Downloading & Provisioning...' : 'Fetch & Sync Certificates'}
                  </button>
                  {certDownloadStatus && (
                    <span style={{ display: 'block', marginTop: '8px', fontSize: '11px', color: certDownloadStatus.startsWith('Success') ? '#00ff66' : '#ff3366', fontFamily: 'var(--font-mono)' }}>
                      {certDownloadStatus}
                    </span>
                  )}
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

          {/* ================= VIEW 6: HARDWARE INFO ================= */}
          <section id="page-hardware" className={`page-view ${activeTab === 'page-hardware' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Hardware Diagnostics & Info</h1>
                <p>Monitor physical USB interfaces, active network connections, boot partitions, and peripheral verification status</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={() => sendControlCommand('GET_INFO')}
                  disabled={controlsDisabled}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}
                >
                  🔄 Refresh Status
                </button>
                <div className={`connection-pill ${connection.type === 'failed' ? 'failed' : connection.type ? 'connected' : ''}`}>
                  {connection.type === 'failed' ? 'CONNECTION FAILED' : connection.type ? `${connection.type.toUpperCase()} ACTIVE` : 'DISCONNECTED'}
                </div>
              </div>
            </header>

            <div className="hardware-spec-grid">

              {/* Connection Status Card */}
              <div className="glass-card hardware-card">
                <h3><span className="icon">🔌</span> Interface Connectivity</h3>
                <div style={{ marginTop: '15px' }}>
                  <div className="spec-list-item">
                    <span className="spec-label">Type-C USB Cable Status</span>
                    <span className={`spec-value ${usbDetect.detected ? 'highlight-emerald' : 'highlight-pink'}`}>
                      {usbDetect.detected ? `DETECTED (${usbDetect.port})` : 'NOT DETECTED'}
                    </span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Active Connection Mode</span>
                    <span className={`spec-value ${connection.type ? 'highlight-blue' : ''}`}>
                      {connection.type ? connection.type.toUpperCase() : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Active Connection Target</span>
                    <span className="spec-value">{connection.target || 'None'}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">RTT Connection Ping</span>
                    <span className={`spec-value ${pingLatency.status === 'excellent' ? 'highlight-emerald' : pingLatency.status === 'warning' ? 'highlight-pink' : ''}`}>
                      {pingLatency.value}
                    </span>
                  </div>
                </div>
              </div>

              {/* Board Specifications Card */}
              <div className="glass-card hardware-card">
                <h3><span className="icon">📟</span> Hardware Specifications</h3>
                <div style={{ marginTop: '15px' }}>
                  <div className="spec-list-item">
                    <span className="spec-label">System Chipset</span>
                    <span className="spec-value highlight-blue">ESP32 Dual-Core (240MHz)</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Firmware Version</span>
                    <span className="spec-value highlight-emerald">v3.1.2</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Hardware IMEI ID</span>
                    <span className="spec-value">{imei}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">STA MAC Address</span>
                    <span className="spec-value">{wifiDetails.mac_sta && wifiDetails.mac_sta !== '--' ? wifiDetails.mac_sta : mac}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">SoftAP MAC Address</span>
                    <span className="spec-value">{wifiDetails.mac_ap || '--'}</span>
                  </div>
                </div>
              </div>

              {/* WiFi Router Status Card (STA Mode) */}
              <div className="glass-card hardware-card">
                <h3><span className="icon">📡</span> WiFi Router Client (STA)</h3>
                <div style={{ marginTop: '15px' }}>
                  <div className="spec-list-item">
                    <span className="spec-label">Connection Status</span>
                    <span className={`spec-value ${wifiDetails.status === 'CONNECTED' ? 'highlight-emerald' : 'highlight-pink'}`}>
                      {wifiDetails.status}
                    </span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Target Router SSID</span>
                    <span className="spec-value highlight-blue">{wifiDetails.ssid || '--'}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Station Local IP</span>
                    <span className="spec-value">{wifiDetails.ip_sta || '--'}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Signal Strength (RSSI)</span>
                    <span className="spec-value">{wifiDetails.rssi ? `${wifiDetails.rssi} dBm` : '--'}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Subnet Mask</span>
                    <span className="spec-value">{wifiDetails.subnet || '--'}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Gateway IP</span>
                    <span className="spec-value">{wifiDetails.gateway || '--'}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Primary DNS</span>
                    <span className="spec-value">{wifiDetails.dns || '--'}</span>
                  </div>
                </div>
              </div>

              {/* SoftAP Hotspot & Stations Card */}
              <div className="glass-card hardware-card">
                <h3><span className="icon">📶</span> SoftAP Hotspot & Stations</h3>
                <div style={{ marginTop: '15px' }}>
                  <div className="spec-list-item">
                    <span className="spec-label">Hotspot SSID</span>
                    <span className="spec-value highlight-blue">{wifiDetails.mac_ap && wifiDetails.mac_ap !== '--' ? `ESP32_GATEWAY_${wifiDetails.mac_ap.replace(/:/g, '')}` : `ESP32_GATEWAY_${mac.replace(/:/g, '')}`}</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Hotspot IP Address</span>
                    <span className="spec-value">192.168.4.1</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Active Clients Count</span>
                    <span className="spec-value highlight-emerald">{wifiDetails.ap_clients} client(s)</span>
                  </div>
                  <div style={{ marginTop: '15px' }}>
                    <span className="spec-label" style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: '#a0a0c0' }}>
                      Connected Client MACs:
                    </span>
                    {wifiDetails.ap_clients_list && wifiDetails.ap_clients_list.length > 0 ? (
                      <div style={{ maxHeight: '90px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {wifiDetails.ap_clients_list.map((cli, idx) => (
                          <div key={idx} style={{ fontSize: '0.8rem', fontFamily: 'monospace', padding: '3px 0', borderBottom: idx < wifiDetails.ap_clients_list.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none', color: '#00ffcc' }}>
                            • {cli.mac}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#707090', fontStyle: 'italic', padding: '4px', textAlign: 'center', background: 'rgba(0, 0, 0, 0.1)', borderRadius: '4px' }}>
                        No clients connected
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Boot Partition Map Card */}
              <div className="glass-card hardware-card">
                <h3><span className="icon">💾</span> Boot & Partition Mapping</h3>
                <div style={{ marginTop: '15px' }}>
                  <div className="spec-list-item">
                    <span className="spec-label">Running Partition</span>
                    <span className="spec-value highlight-blue">app0</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">Running Offset</span>
                    <span className="spec-value">0x010000</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">OTA Partition Update</span>
                    <span className="spec-value">app1 (0x1D0000)</span>
                  </div>
                  <div className="spec-list-item">
                    <span className="spec-label">QCOM Storage Partition</span>
                    <span className="spec-value">core (0x390000)</span>
                  </div>
                </div>
              </div>

              {/* 9-Point diagnostics card */}
              <div className="glass-card hardware-card" style={{ gridColumn: 'span 2' }}>
                <h3><span className="icon">🛡️</span> Peripheral Self-Check Diagnostician</h3>
                <div className="diag-checklist" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '20px' }}>
                  {Object.keys(diagnostics).map(key => (
                    <div key={key} className={`diag-item ${diagnostics[key] === 'OK' ? 'success' : diagnostics[key] === 'ERROR' ? 'error' : diagnostics[key] === 'TESTING' ? 'warning' : ''}`} style={{ margin: 0 }}>
                      <div className="diag-indicator"></div>
                      <div className="diag-label" style={{ flex: 1 }}>{key.toUpperCase()}</div>
                      <div className="diag-value">{diagnostics[key]}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ================= VIEW 7: CERTIFICATE PROVISIONING ================= */}
          <section id="page-cert-provision" className={`page-view ${activeTab === 'page-cert-provision' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Certificate Provisioning & Audit</h1>
                <p>Fetch AWS IoT credentials dynamically from the SCADA server and flash them directly to the ESP32 Winbond flash SPIFFS</p>
              </div>
            </header>

            <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

              {/* Form Card */}
              <div className="glass-card">
                <h3><span className="icon">🔑</span> Request SCADA Certificates</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Enter the device identity credentials to download the Root CA, Device Certificate, and Private Key from the SCADA gateway.
                </p>

                <div className="input-group">
                  <label>Device IMEI ID</label>
                  <input
                    type="text"
                    value={imeiProvisionInput}
                    onChange={(e) => setImeiProvisionInput(e.target.value)}
                    placeholder="e.g. 866738083623502"
                  />
                </div>

                <div className="input-group">
                  <label>SCADA User Password</label>
                  <input
                    type="password"
                    value={passwordProvisionInput}
                    onChange={(e) => setPasswordProvisionInput(e.target.value)}
                    placeholder="Enter device credentials password"
                  />
                </div>

                <div className="input-group">
                  <label>ESP32 Gateway IP Address</label>
                  <input
                    type="text"
                    value={gatewayIpProvisionInput}
                    onChange={(e) => setGatewayIpProvisionInput(e.target.value)}
                    placeholder="e.g. 192.168.4.1"
                  />
                </div>

                <button
                  className="btn btn-primary"
                  onClick={triggerCertificateProvision}
                  disabled={isProvisioning}
                  style={{ marginTop: '20px', width: '100%' }}
                >
                  {isProvisioning ? 'Downloading & Provisioning...' : 'Start Secure Provisioning'}
                </button>

                {provisioningStatus && (
                  <div style={{ marginTop: '15px', fontSize: '12.5px', color: provisioningStatus.startsWith('Success') ? '#00ff66' : provisioningStatus.startsWith('Error') ? '#ff3366' : '#00ffff', fontFamily: 'var(--font-mono)' }}>
                    • {provisioningStatus}
                  </div>
                )}
              </div>

              {/* History Audit Logs Card */}
              <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                <h3><span className="icon">🛡️</span> Certificate Provisioning History Audit Logs</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Review MERN database logs tracking successful/failed AWS IoT credentials synchronization:
                </p>

                <div style={{ maxHeight: '350px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  {certHistoryLogs.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#707090', fontStyle: 'italic' }}>
                      No certificate provisioning logs recorded in database
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent-pink)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Timestamp</th>
                          <th style={{ padding: '8px' }}>IMEI</th>
                          <th style={{ padding: '8px' }}>Gateway IP</th>
                          <th style={{ padding: '8px' }}>Sizes (CA/Cert/Key)</th>
                          <th style={{ padding: '8px' }}>Status</th>
                          <th style={{ padding: '8px' }}>Logs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certHistoryLogs.map((log, index) => (
                          <tr key={log._id || index} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e0e0f0' }}>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{log.imei}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>{log.gatewayIp}</td>
                            <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                              {log.status === 'SUCCESS' ? `${log.rootCaSize}B / ${log.deviceCertSize}B / ${log.privateKeySize}B` : '--'}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: '4px', background: log.status === 'SUCCESS' ? 'rgba(0,255,100,0.1)' : 'rgba(255,50,50,0.1)', color: log.status === 'SUCCESS' ? '#00ff66' : '#ff3366', fontWeight: 'bold', fontSize: '0.75rem' }}>
                                {log.status}
                              </span>
                            </td>
                            <td style={{ padding: '8px', color: '#a0a0c0', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.message}>
                              {log.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ================= VIEW: ESP32 SPIFFS STORAGE MANAGER ================= */}
          <section id="page-storage" className={`page-view ${activeTab === 'page-storage' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>ESP32 SPIFFS Storage Manager</h1>
                <p>Read, write, edit, and inspect active files stored directly in the ESP32 Winbond flash SPIFFS filesystem</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={refreshSpiffsStorage}
                  disabled={isFetchingStorage}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', minWidth: 'auto', fontSize: '12px' }}
                >
                  🔄 Refresh Filesystem
                </button>
                <div className={`connection-pill ${connection.type === 'failed' ? 'failed' : connection.type ? 'connected' : ''}`}>
                  {connection.type === 'failed' ? 'CONNECTION FAILED' : connection.type ? `${connection.type.toUpperCase()} ACTIVE` : 'DISCONNECTED'}
                </div>
              </div>
            </header>

            <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>
              
              {/* Left Column: Files list and storage utilization */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Storage Utilization Card */}
                <div className="glass-card">
                  <h3><span className="icon">&#128190;</span> Filesystem Space</h3>
                  
                  {spiffsStorage.totalBytes > 0 ? (
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Used: <strong style={{ color: '#fff' }}>{Math.round(spiffsStorage.usedBytes / 1024)} KB</strong> / {Math.round(spiffsStorage.totalBytes / 1024)} KB</span>
                        <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{Math.round((spiffsStorage.totalBytes - spiffsStorage.usedBytes) / 1024)} KB Free</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (spiffsStorage.usedBytes * 100) / spiffsStorage.totalBytes)}%`,
                          background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-pink))',
                          boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)'
                        }}></div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12.5px', fontStyle: 'italic' }}>
                      Connect device and refresh to inspect filesystem details.
                    </div>
                  )}

                  <button 
                    className="btn btn-accent" 
                    onClick={handleNewSpiffsFileSetup}
                    disabled={!connection.type || connection.type === 'failed'}
                    style={{ marginTop: '20px', width: '100%', height: '36px', fontSize: '12.5px' }}
                  >
                    ➕ Create New File
                  </button>
                </div>

                {/* Files List Card */}
                <div className="glass-card">
                  <h3><span className="icon">&#128194;</span> SPIFFS Files</h3>
                  
                  <div className="cert-list-container" style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '15px' }}>
                    {spiffsStorage.files.length === 0 ? (
                      <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12.5px' }}>
                        No files found. Scan the filesystem using the refresh button.
                      </div>
                    ) : (
                      spiffsStorage.files.map((file, idx) => {
                        const cleanName = file.name.startsWith('/') ? file.name.substring(1) : file.name;
                        const isSelected = selectedSpiffsFile === file.name;
                        return (
                          <div 
                            key={idx} 
                            className="cert-item-row" 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              padding: '10px 12px', 
                              background: isSelected ? 'rgba(0, 240, 255, 0.05)' : 'rgba(255,255,255,0.01)', 
                              border: isSelected ? '1px solid rgba(0, 240, 255, 0.2)' : '1px solid rgba(255,255,255,0.03)',
                              borderRadius: '6px', 
                              marginBottom: '6px' 
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }} onClick={() => handleReadSpiffsFile(file.name)}>
                              <span style={{ fontWeight: 'bold', color: isSelected ? 'var(--accent-blue)' : 'white', fontSize: '12.5px' }}>/{cleanName}</span>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '2px' }}>{file.size} bytes</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleReadSpiffsFile(file.name)}
                                disabled={isReadingFile}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  height: '26px',
                                  minWidth: 'auto',
                                  margin: 0,
                                  background: 'rgba(0, 240, 255, 0.1)',
                                  border: '1px solid rgba(0, 240, 255, 0.3)',
                                  color: '#00f0ff',
                                  cursor: 'pointer'
                                }}
                              >
                                Read
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleDeleteSpiffsFile(file.name)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  height: '26px',
                                  minWidth: 'auto',
                                  margin: 0,
                                  background: 'rgba(255, 0, 85, 0.1)',
                                  border: '1px solid rgba(255, 0, 85, 0.3)',
                                  color: '#ff0055',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: File Content Editor & Viewer */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
                {selectedSpiffsFile || isCreatingNewFile ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0 }}>
                          {isCreatingNewFile ? '📝 Create New File' : `📖 File: ${selectedSpiffsFile}`}
                        </h3>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {isCreatingNewFile ? 'Drafting new configuration file content' : `Read-only / write-override partition: ${Math.round(selectedFileContent.length)} characters`}
                        </span>
                      </div>
                      <button
                        className="btn btn-secondary small"
                        onClick={() => {
                          setSelectedSpiffsFile('');
                          setIsCreatingNewFile(false);
                          setFileContentEdit('');
                        }}
                        style={{ margin: 0, minWidth: 'auto', padding: '4px 10px', height: '26px', fontSize: '11px' }}
                      >
                        Close
                      </button>
                    </div>

                    {isCreatingNewFile && (
                      <div className="input-group" style={{ marginBottom: '15px' }}>
                        <label>SPIFFS Destination File Path</label>
                        <input
                          type="text"
                          value={newFileNameInput}
                          onChange={(e) => setNewFileNameInput(e.target.value)}
                          placeholder="e.g. /config.txt"
                        />
                      </div>
                    )}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '11.5px', color: 'var(--accent-pink)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                        File Content Editor
                      </label>
                      <textarea
                        value={fileContentEdit}
                        onChange={(e) => setFileContentEdit(e.target.value)}
                        placeholder="Type file plain-text content here..."
                        style={{
                          flex: 1,
                          width: '100%',
                          minHeight: '250px',
                          background: '#040209',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          padding: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: '#00ffcc',
                          lineHeight: '1.6',
                          resize: 'vertical',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleSaveSpiffsFileContent}
                        disabled={isSavingFile || (!isCreatingNewFile && !selectedSpiffsFile)}
                        style={{ width: 'auto', padding: '0 25px', height: '38px', fontSize: '12.5px' }}
                      >
                        {isSavingFile ? 'Saving Content...' : 'Save File to SPIFFS'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>📂</div>
                    <h4>No File Loaded</h4>
                    <p style={{ maxWidth: '300px', fontSize: '12.5px', marginTop: '5px' }}>
                      Select a file from the list to view/edit its contents, or click "Create New File" to initialize a new config file.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ================= VIEW 5: APP SETTINGS (Requirement 6) ================= */}
          <section id="page-settings" className={`page-view ${activeTab === 'page-settings' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Application Settings</h1>
                <p>Configure MongoDB connection strings, system communication ports, default baud rates, and view system specifications</p>
              </div>
            </header>

            <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

              {/* Database Settings Card */}
              <div className="glass-card">
                <h3><span className="icon">📂</span> MongoDB Database Settings</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Set the MERN backend database connection URI. The app will attempt to connect and persist telemetry data dynamically.
                </p>
                <div className="input-group">
                  <label>MongoDB Connection URI</label>
                  <input
                    type="text"
                    value={dbUriInput}
                    onChange={(e) => setDbUriInput(e.target.value)}
                    placeholder="mongodb://localhost:27017/IOT_System_Manager"
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <button className="btn btn-primary" onClick={triggerDbReconnect} disabled={isReconnectingDb} style={{ flex: 1 }}>
                    {isReconnectingDb ? 'Connecting...' : 'Reconnect & Save'}
                  </button>
                </div>
                {dbReconnectStatus && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: dbReconnectStatus.includes('success') ? '#00ff66' : '#ff3366', fontFamily: 'var(--font-mono)' }}>
                    {dbReconnectStatus}
                  </div>
                )}
              </div>

              {/* Ports & Communication Config Card */}
              <div className="glass-card">
                <h3><span className="icon">⚙️</span> Port & Communication Config</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Modify ports used by telemetry, web hosting, OTA, and UDP network services. Changes require app restart to bind.
                </p>
                <div className="input-group">
                  <label>Express Web Host Port</label>
                  <input type="text" value={expressPortInput} onChange={(e) => setExpressPortInput(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Telemetry TCP Socket Port</label>
                  <input type="text" value={telemetryPortInput} onChange={(e) => setTelemetryPortInput(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>OTA Local Portal Port</label>
                  <input type="text" value={otaPortInput} onChange={(e) => setOtaPortInput(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>UDP Network Discovery Port</label>
                  <input type="text" value={udpPortInput} onChange={(e) => setUdpPortInput(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Default COM Baud Rate</label>
                  <select value={defaultBaudRateInput} onChange={(e) => setDefaultBaudRateInput(e.target.value)} className="filter-select" style={{ width: '100%', height: '42px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', outline: 'none' }}>
                    <option value="115200" style={{ background: '#1c1b22', color: 'white' }}>115200</option>
                    <option value="9600" style={{ background: '#1c1b22', color: 'white' }}>9600</option>
                    <option value="57600" style={{ background: '#1c1b22', color: 'white' }}>57600</option>
                  </select>
                </div>
                <button className="btn btn-accent" onClick={saveAppConfigSettings} style={{ marginTop: '15px', width: '100%' }}>
                  Save Communications Config
                </button>
              </div>

              {/* System Info Specifications Card */}
              <div className="glass-card" style={{ gridColumn: 'span 2' }}>
                <h3><span className="icon">🖥️</span> System Specifications & Versions</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Hardware architecture, operating system metadata, and host framework runtime environments:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>OS Environment</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>{systemInfo.platform.toUpperCase()} ({systemInfo.release})</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>CPU Architecture</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>{systemInfo.cpu} ({systemInfo.arch})</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>System RAM</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>{systemInfo.freeMem} Free / {systemInfo.totalMem} Total</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>Electron Framework</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>v{systemInfo.electron}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>NodeJS Platform</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>v{systemInfo.node}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>Chromium Core</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>v{systemInfo.chrome}</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--glass-border)', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>V8 JavaScript Engine</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginTop: '2px' }}>{systemInfo.v8}</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

        </main>

      </div>
    </>
  );
}

const CertStatusBadge = ({ status }) => {
  let color = 'var(--text-dim)';
  let label = 'Pending';

  if (status === 'downloading') {
    color = '#00f0ff';
    label = 'Downloading...';
  } else if (status === 'downloaded') {
    color = '#ffbb00';
    label = 'Downloaded';
  } else if (status === 'uploading') {
    color = '#ffbb00';
    label = 'Uploading...';
  } else if (status === 'success') {
    color = '#00ff66';
    label = 'Success';
  } else if (status === 'failed') {
    color = '#ff3366';
    label = 'Failed';
  }

  return (
    <span style={{ fontSize: '11px', color, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      ● {label}
    </span>
  );
};
