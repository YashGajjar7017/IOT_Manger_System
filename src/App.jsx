import React, { useState, useEffect, useRef, useMemo } from 'react';

// Safely load Electron IPC in React loaded in Electron environment
const electron = (typeof window !== 'undefined' && window.require) ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : {
  send: (...args) => console.log('[MOCK IPC SEND]', args),
  on: (...args) => console.log('[MOCK IPC ON]', args),
  off: (...args) => console.log('[MOCK IPC OFF]', args),
  invoke: (...args) => {
    console.log('[MOCK IPC INVOKE]', args);
    return Promise.resolve({ success: true, message: 'Mock response' });
  }
};

function IoTStarLogo({ size = 28 }) {
  return (
    <svg className="iot-star-logo" viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
          <stop offset="100%" stopColor="#9d00ff" stopOpacity="0.2" />
        </radialGradient>
        <filter id="neonShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <line x1="50" y1="50" x2="50" y2="15" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="3,3" />
      <line x1="50" y1="50" x2="86" y2="42" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="3,3" />
      <line x1="50" y1="50" x2="72" y2="85" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="3,3" />
      <line x1="50" y1="50" x2="28" y2="85" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="3,3" />
      <line x1="50" y1="50" x2="14" y2="42" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="3,3" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255, 0, 127, 0.4)" strokeWidth="1.5" strokeDasharray="5,4" />
      <path d="M 50 22 L 58 41 L 79 41 L 62 53 L 68 73 L 50 61 L 32 73 L 38 53 L 21 41 L 42 41 Z" 
            fill="url(#starGlow)" stroke="#ffffff" strokeWidth="1.5" filter="url(#neonShadow)" />
      <circle cx="50" cy="50" r="5" fill="#ffffff" stroke="#ff007f" strokeWidth="1.5" />
      <circle cx="50" cy="15" r="4.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1" />
      <circle cx="86" cy="42" r="4.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1" />
      <circle cx="72" cy="85" r="4.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1" />
      <circle cx="28" cy="85" r="4.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1" />
      <circle cx="14" cy="42" r="4.5" fill="#00f0ff" stroke="#ffffff" strokeWidth="1" />
    </svg>
  );
}

export default function App() {
  const renderPipelineStep = (title, subtitle, status) => {
    let iconColor = 'var(--text-dim)';
    let statusText = 'PENDING';
    let badgeBg = 'rgba(255,255,255,0.03)';
    let badgeColor = 'var(--text-dim)';
    let borderColor = 'rgba(255,255,255,0.04)';
    let background = 'rgba(255,255,255,0.01)';
    let iconElement = '○';

    if (status === 'success') {
      iconColor = '#00ff66';
      statusText = 'SUCCESS';
      badgeBg = 'rgba(0, 255, 102, 0.1)';
      badgeColor = '#00ff66';
      borderColor = 'rgba(0, 255, 102, 0.15)';
      background = 'rgba(0, 255, 102, 0.02)';
      iconElement = '✓';
    } else if (status === 'running') {
      iconColor = '#00f0ff';
      statusText = 'RUNNING';
      badgeBg = 'rgba(0, 240, 255, 0.1)';
      badgeColor = '#00f0ff';
      borderColor = 'rgba(0, 240, 255, 0.2)';
      background = 'rgba(0, 240, 255, 0.02)';
      iconElement = '⌛';
    } else if (status === 'failed') {
      iconColor = '#ff0055';
      statusText = 'FAILED';
      badgeBg = 'rgba(255, 0, 85, 0.1)';
      badgeColor = '#ff0055';
      borderColor = 'rgba(255, 0, 85, 0.2)';
      background = 'rgba(255, 0, 85, 0.02)';
      iconElement = '✕';
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        gap: '12px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: `2px solid ${iconColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            fontWeight: 'bold',
            fontSize: status === 'success' ? '14px' : '11px',
            flexShrink: 0
          }}>
            {iconElement}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'bold', color: status === 'pending' ? 'var(--text-dim)' : 'white', fontSize: '13px' }}>{title}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{subtitle}</span>
          </div>
        </div>
        <div style={{
          padding: '4px 8px',
          background: badgeBg,
          color: badgeColor,
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: '800',
          border: `1px solid ${borderColor}`,
          letterSpacing: '0.05em'
        }}>
          {statusText}
        </div>
      </div>
    );
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState('page-dashboard');
  const [activeConnTab, setActiveConnTab] = useState('tab-wifi');

  // Connection State
  const [connection, setConnection] = useState({ type: null, target: null });
  const [wifiIp, setWifiIp] = useState('192.168.0.1');
  const [wifiPort, setWifiPort] = useState('9000');
  const [serialPorts, setSerialPorts] = useState([]);
  const [selectedSerialPort, setSelectedSerialPort] = useState('');
  const [selectedBaud, setSelectedBaud] = useState('115200');
  const [bootTriggerEnabled, setBootTriggerEnabled] = useState(false);
  const [usbDetect, setUsbDetect] = useState({ detected: false, port: null, ports: [] });

  // Direct Wifi/AP & Manual Connection states
  const [directConnectIp, setDirectConnectIp] = useState('192.168.0.1');
  const [directHttpPort, setDirectHttpPort] = useState('8000');
  const [directSocketPort, setDirectSocketPort] = useState('9000');
  const [queriedInfo, setQueriedInfo] = useState(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');

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
  const [diPinsSimulated, setDiPinsSimulated] = useState([false, false, false, false]);
  const [diPinsHardware, setDiPinsHardware] = useState([false, false, false, false]);
  const [testerSwitch, setTesterSwitch] = useState(false);

  // Boot Sequence State
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStep, setBootStep] = useState('');
  const [bootMessage, setBootMessage] = useState('');
  const [isBooting, setIsBooting] = useState(false);
  const [bootManualStopped, setBootManualStopped] = useState(false);
  const lastBootSuccessSignature = useRef('');

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
  const [dbSubTab, setDbSubTab] = useState('tab-db-history');
  // Login / Signup State
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showGprsConsole, setShowGprsConsole] = useState(false);
  const [gprsCommandInput, setGprsCommandInput] = useState('');

  const handleAuth = async () => {
    setAuthError('');
    try {
      if (authMode === 'signup') {
        if (!authUsername || !authEmail || !authPassword || !authConfirmPassword) {
          setAuthError('All fields are required.');
          return;
        }
        if (!authEmail.includes('@')) {
          setAuthError('Please enter a valid email address.');
          return;
        }
        if (authPassword !== authConfirmPassword) {
          setAuthError('Passwords do not match.');
          return;
        }
      } else {
        if (!authUsername || !authPassword) {
          setAuthError('Username and password are required.');
          return;
        }
      }

      const payload = authMode === 'login'
        ? { username: authUsername, password: authPassword }
        : { username: authUsername, email: authEmail, password: authPassword };

      const result = await ipcRenderer.invoke(authMode === 'login' ? 'admin-login' : 'admin-signup', payload);
      if (result.success) {
        if (authMode === 'login') {
          localStorage.setItem('isLoggedIn', 'true');
          setIsLoggedIn(true);
        } else {
          setAuthMode('login'); // switch to login after signup
          setAuthEmail('');
          setAuthConfirmPassword('');
          alert('Signup successful! Please log in with your new credentials.');
        }
      } else {
        setAuthError(result.message);
      }
    } catch (e) {
      setAuthError(e.message);
    }
  };

  const openAuthView = (mode) => {
    setAuthMode(mode);
    setAuthError('');
    setIsLoggedIn(false);
    setShowAccountMenu(false);
    setActiveTab('page-dashboard');
  };
  // 'tab-db-history' or 'tab-db-devices'

  // Registered Device Form state
  const [regImei, setRegImei] = useState('');
  const [regPcb, setRegPcb] = useState('');
  const [regPass, setRegPass] = useState('admin_secure_gate');
  const [regSsid, setRegSsid] = useState('');
  const [regWifiPass, setRegWifiPass] = useState('');
  const [regInterval, setRegInterval] = useState('1500');
  const [regDeviceNumber, setRegDeviceNumber] = useState('1');
  const [selectedRegDeviceImei, setSelectedRegDeviceImei] = useState('');
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const [provisioningLogs, setProvisioningLogs] = useState([]);

  // OTA Updates State
  const [otaIp, setOtaIp] = useState('192.168.0.1');
  const [otaPort, setOtaPort] = useState('500');
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
  const [connectionMode, setConnectionMode] = useState('ap'); // 'ap' or 'router'
  const [isBatchTesting, setIsBatchTesting] = useState(false);

  // Refs to allow reading latest state inside async loop without closure issues
  const connectionRef = useRef(connection);
  const diagnosticsRef = useRef(diagnostics);
  useEffect(() => { connectionRef.current = connection; }, [connection]);
  useEffect(() => { diagnosticsRef.current = diagnostics; }, [diagnostics]);

  // Phase 3 Certificate Provisioning States
  const [imeiProvisionInput, setImeiProvisionInput] = useState('');
  const [passwordProvisionInput, setPasswordProvisionInput] = useState('');
  const [gatewayIpProvisionInput, setGatewayIpProvisionInput] = useState('192.168.0.1');
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

  // Dynamic Theme, Font, and GitHub Integration States
  // Default to the 1st theme 'quantum-indigo' on startup
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'quantum-indigo');
  const [currentFont, setCurrentFont] = useState(() => localStorage.getItem('font') || 'outfit');
  const starNovaStars = useMemo(() => Array.from({ length: 24 }, (_, index) => ({
    id: index,
    left: `${Math.random() * 100}%`,
    top: `${-10 - Math.random() * 25}%`,
    size: `${6 + Math.random() * 10}px`,
    duration: `${2.8 + Math.random() * 3.8}s`,
    delay: `${Math.random() * 4}s`,
    opacity: 0.35 + Math.random() * 0.65
  })), []);
  const starNovaComets = useMemo(() => Array.from({ length: 3 }, (_, index) => ({
    id: index,
    left: `${-20 + Math.random() * 40}%`,
    top: `${20 + Math.random() * 45}%`,
    duration: `${5 + Math.random() * 3}s`,
    delay: `${Math.random() * 3}s`
  })), []);
  const [gitHubUser, setGitHubUser] = useState(() => {
    const saved = localStorage.getItem('github_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Ocean theme cinematic state variables
  const [showOceanAnim, setShowOceanAnim] = useState(false);
  const [oceanAnimStage, setOceanAnimStage] = useState('idle');
  const oceanTimersRef = useRef([]);

  // Hacking theme cinematic state variables
  const [showHackingAnim, setShowHackingAnim] = useState(false);
  const [hackingAnimStage, setHackingAnimStage] = useState('idle');
  const hackerTimersRef = useRef([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  const changeThemeWithTransition = (newTheme, additionalTrigger = null) => {
    if (newTheme === currentTheme) return;
    document.documentElement.classList.add('theme-slide-out-active');
    setTimeout(() => {
      setCurrentTheme(newTheme);
      if (additionalTrigger) {
        additionalTrigger();
      }
      document.documentElement.classList.remove('theme-slide-out-active');
      document.documentElement.classList.add('theme-slide-in-active');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-slide-in-active');
      }, 550);
    }, 450);
  };

  // Dedicated trigger for ocean temple entrance cinematic sequence
  const triggerOceanAnimation = () => {
    // Clear any existing timers
    if (oceanTimersRef.current) {
      oceanTimersRef.current.forEach(clearTimeout);
    }

    setShowOceanAnim(true);
    setOceanAnimStage('sky-to-sea');

    // Timeline sequence
    const t1 = setTimeout(() => {
      setOceanAnimStage('temple-reach');
    }, 3000); // 3 seconds diving through sky into sea

    const t2 = setTimeout(() => {
      setOceanAnimStage('shaking');
    }, 6000); // 3 seconds reaching/descending onto the temple

    const t3 = setTimeout(() => {
      setOceanAnimStage('door-opening');
    }, 8000); // 2 seconds earthquake/temple shaking

    const t4 = setTimeout(() => {
      setOceanAnimStage('explosion');
    }, 10500); // 2.5 seconds opening door with bright golden flash

    const t5 = setTimeout(() => {
      setOceanAnimStage('done');
      setShowOceanAnim(false);
      setActiveTab('page-dashboard');
    }, 13500); // 3 seconds explosion

    oceanTimersRef.current = [t1, t2, t3, t4, t5];
  };

  // Dedicated trigger for hacking theme entrance cinematic sequence
  const triggerHackerAnimation = () => {
    // Clear any existing timers
    if (hackerTimersRef.current) {
      hackerTimersRef.current.forEach(clearTimeout);
    }

    setShowHackingAnim(true);
    setHackingAnimStage('snake-slither');

    // Timeline sequence
    const t1 = setTimeout(() => {
      setHackingAnimStage('logo-appear');
    }, 3000); // 3 seconds of snake slithering

    const t2 = setTimeout(() => {
      setHackingAnimStage('glitch');
    }, 6200); // 3.2 seconds to draw the Kali Linux dragon/snake

    const t3 = setTimeout(() => {
      setHackingAnimStage('dissolving');
    }, 8200); // 2 seconds of neon glitching and shuddering

    const t4 = setTimeout(() => {
      setHackingAnimStage('done');
      setShowHackingAnim(false);
    }, 10400); // 2.2 seconds of code dissolving into black

    hackerTimersRef.current = [t1, t2, t3, t4];
  };

  // Clean up timers on theme switch away
  useEffect(() => {
    if (currentTheme !== 'deep-sea-ocean') {
      setShowOceanAnim(false);
      setOceanAnimStage('idle');
      if (oceanTimersRef.current) {
        oceanTimersRef.current.forEach(clearTimeout);
        oceanTimersRef.current = [];
      }
    }
    if (currentTheme !== 'hacking') {
      setShowHackingAnim(false);
      setHackingAnimStage('idle');
      if (hackerTimersRef.current) {
        hackerTimersRef.current.forEach(clearTimeout);
        hackerTimersRef.current = [];
      }
    }
  }, [currentTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', currentFont);
    localStorage.setItem('font', currentFont);
  }, [currentFont]);
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
  const [certDetails, setCertDetails] = useState({
    'aws_root_ca.pem': null,
    'device_cert.crt': null,
    'private_key.key': null
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
        // e.stopPropagation(); // Disabled to allow standard React event delegation and focus.

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
    setProvisioningLogs([]);
    setIsProvisioning(true);
    setProvisioningStatus('Starting secure provisioning...');
    addLogLine(`[PROVISION] Starting certificate provisioning for IMEI: ${imeiProvisionInput}...`);
    setProvisioningLogs(prev => [...prev, `[PROVISION] Starting certificate provisioning for IMEI: ${imeiProvisionInput}...`]);

    // Call the step-by-step IPC provisioner
    startCertProvisioning();
  };
  /* const [certBaseUrl, setCertBaseUrl] = useState('http://localhost:8000/certs'); */
  const [certRootCaUrl, setCertRootCaUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=1&PROJCD=re');
  const [certDeviceCertUrl, setCertDeviceCertUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=2&PROJCD=re');
  const [certPrivateKeyUrl, setCertPrivateKeyUrl] = useState('https://api.iotscada-pmsg.com/api/SSLCert/certdownload?imei={IEMI}&user={IEMI}&pass={passowrd}&ctype=3&PROJCD=re');
  const [certTarget, setCertTarget] = useState('esp32');

  const [isDownloadingCerts, setIsDownloadingCerts] = useState(false);
  const [certDownloadStatus, setCertDownloadStatus] = useState('');
  const [uuidToken, setUuidToken] = useState('');
  const [isUploadingUuid, setIsUploadingUuid] = useState(false);

  // App Config Settings State (Requirement 6)
  const [dbUriInput, setDbUriInput] = useState('mongodb://192.168.1.26:27017/IOT_Monitor_System');
  const [dbReconnectStatus, setDbReconnectStatus] = useState('');
  const [isReconnectingDb, setIsReconnectingDb] = useState(false);

  const [expressPortInput, setExpressPortInput] = useState('8000');
  const [telemetryPortInput, setTelemetryPortInput] = useState('9000');
  const [otaPortInput, setOtaPortInput] = useState('500');
  const [udpPortInput, setUdpPortInput] = useState('5002');
  const [defaultBaudRateInput, setDefaultBaudRateInput] = useState('115200');

  const [githubClientIdInput, setGithubClientIdInput] = useState('');
  const [githubClientSecretInput, setGithubClientSecretInput] = useState('');

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
        setBootManualStopped(false);
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
        setBootManualStopped(false);
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
      if (message.includes('[CERTS]') || message.includes('[PROVISION]') || message.includes('[WIFI]') || message.includes('aws_root_ca.pem') || message.includes('device_cert.crt') || message.includes('private_key.key')) {
        setProvisioningLogs(prev => [...prev, message]);
      }
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

      if (payload.di_pins && Array.isArray(payload.di_pins)) {
        setDiPinsHardware(payload.di_pins);
      }

      if (payload.switch_pin !== undefined) {
        setTesterSwitch(payload.switch_pin);
      }

      if (bootManualStopped && (payload.status === 'BOOT_PROGRESS' || payload.status === 'BOOT_SUCCESS' || payload.step === 'QCOM_SHIFT')) {
        return;
      }

      if (payload.status === 'BOOT_PROGRESS' || payload.step === 'QCOM_SHIFT') {
        setBootProgress(payload.progress);
        setBootStep(payload.step);
        setBootMessage(payload.message);
        setIsBooting(false);
        setControlsDisabled(false);
      } else if (payload.status === 'BOOT_SUCCESS') {
        const successSignature = `${payload.imei || ''}|${payload.mac || ''}|${JSON.stringify(payload.diagnostics || {})}`;
        if (lastBootSuccessSignature.current === successSignature && bootStep === 'COMPLETE') {
          return;
        }
        lastBootSuccessSignature.current = successSignature;
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
        setRegImei(payload.imei || '');
        setRegPass(payload.password || 'admin_secure_gate');
        if (payload.wifi) {
          setRegSsid(payload.wifi.ssid || '');
        }
        /* setOtaIp('192.168.0.1'); */
        // Maintain connection-dynamic IP or sync with current wifiIp state:
        if (wifiIp) {
          setOtaIp(wifiIp);
        }

        // Fix lockup bug: enable switchboard controls once boot is successful!
        setControlsDisabled(false);

        addLogLine('[SYS] Boot diagnostics report sync complete.', 'success');

        setDiagnostics(prev => {
          const updated = { ...prev };
          Object.keys(payload.diagnostics || {}).forEach(key => {
            const val = payload.diagnostics[key];
            const nextVal = (val === 'WAITING' || val === 'PENDING') ? 'WAITING' : (val ? 'OK' : 'ERROR');
            if (nextVal === 'WAITING' && (prev[key] === 'OK' || prev[key] === 'ERROR')) {
              // Preserve existing OK/ERROR status
            } else {
              updated[key] = nextVal;
            }
          });
          return updated;
        });
        if (payload.wifi) {
          setWifiDetails(payload.wifi);
        }
      } else if (payload.status === 'IMEI_UPDATED') {
        setImei(payload.imei);
        setImeiInput(payload.imei);
        setImeiProvisionInput(payload.imei);
        setRegImei(payload.imei);
        addLogLine(`[SYS] Dynamic IMEI update completed successfully: ${payload.imei}`, 'success');
      } else if (payload.status === 'PASSWORD_UPDATED') {
        setPassword(payload.password);
        setPasswordInput(payload.password);
        setRegPass(payload.password);
        addLogLine('[SYS] Dynamic Credentials Password update completed successfully.', 'success');
      } else if (payload.status === 'WIFI_UPDATED') {
        setWifiRouterSsid(payload.ssid);
        setRegSsid(payload.ssid);
        addLogLine(`[SYS] WiFi credentials updated on gateway. SSID is now: ${payload.ssid}`, 'success');
      } else if (payload.status === 'ok' && payload.msg && payload.msg.includes('Modem baud rate')) {
        addLogLine(`[GPRS Speed Update] ${payload.msg}`, 'success');
        if (payload.modem_resp) {
          const lines = payload.modem_resp.split(/\\n|\n/);
          lines.forEach(l => {
            if (l.trim()) addLogLine(`  ${l.trim()}`, 'system');
          });
        }
        alert(`GPRS Speed Update:\n${payload.msg}\n\nModem Response:\n${payload.modem_resp ? payload.modem_resp.replace(/\\n/g, '\n') : ''}`);
      } else if (payload.status === 'warn' && payload.msg && payload.msg.includes('modem')) {
        addLogLine(`[GPRS Speed Update Warning] ${payload.msg}`, 'warning');
        if (payload.modem_resp) {
          const lines = payload.modem_resp.split(/\\n|\n/);
          lines.forEach(l => {
            if (l.trim()) addLogLine(`  ${l.trim()}`, 'warning');
          });
        }
        alert(`GPRS Speed Update Warning:\n${payload.msg}\n\nModem Response:\n${payload.modem_resp ? payload.modem_resp.replace(/\\n/g, '\n') : ''}`);
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
      setIsProvisioning(false);
      if (result.status === 'success') {
        setCertDownloadStatus('Success! Certificates provisioned to ESP32.');
        setProvisioningLogs(prev => [...prev, '[PROVISION] SUCCESS: All certificates successfully written & synced! All certificates inserted.']);
        // Auto-trigger QCOM storage sync from GUI after cert upload finishes (Requirement 3)
        sendControlCommand('SYNC_CERTS_TO_QCOM');
        alert('Certificates downloaded & provisioned successfully!');
      } else {
        setCertDownloadStatus(`Failed: ${result.message}`);
        setProvisioningLogs(prev => [...prev, `[PROVISION ERROR] Failed: ${result.message}`]);
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

    const onCertStatusUpdate = (event, { file, status, details }) => {
      setCertStatuses(prev => ({ ...prev, [file]: status }));
      if (details) {
        setCertDetails(prev => ({ ...prev, [file]: details }));
      }
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
      setIsUploadingUuid(false);
      setCertUploadProgress(0);
      if (result.success) {
        alert(`File ${result.filename} updated successfully!`);
        addLogLine(`[SPIFFS] Saved file ${result.filename} successfully to ESP32.`, 'success');
        if (result.filename === '/uuid.json') {
          setUuidToken(''); // Automatically change token area back
          addLogLine('[SYS] uuid.json uploaded successfully. Token input reset.', 'success');
        }
        ipcRenderer.send('get-spiffs-storage', { ip: otaIpRef.current, port: otaPortRef.current });
      } else {
        alert(`Failed to update file: ${result.error}`);
        addLogLine(`[SPIFFS ERROR] Save failed: ${result.error}`, 'error');
      }
    };
    const onGitHubOauthSuccess = (event, user) => {
      setGitHubUser(user);
      localStorage.setItem('github_user', JSON.stringify(user));
      localStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
      addLogLine(`[GITHUB] Authentication successful! Welcome ${user.name} (@${user.username}).`, 'success');
      alert(`GitHub Authentication Successful!\nWelcome ${user.name} (@${user.username}).`);
    };
    ipcRenderer.on('github-oauth-success', onGitHubOauthSuccess);

    const onRefreshRegisteredDevices = () => {
      fetchRegisteredDevices();
    };
    ipcRenderer.on('refresh-registered-devices', onRefreshRegisteredDevices);

    // Fetch initial app configuration (Requirement 6)
    ipcRenderer.invoke('get-app-config').then((config) => {
      if (config) {
        setDbUriInput(config.mongoUri || 'mongodb://192.168.1.26:27017/IOT_Monitor_System');
        setExpressPortInput(String(config.expressPort || '8000'));
        setTelemetryPortInput(String(config.telemetryPort || '9000'));
        setOtaPortInput(String(config.otaPort || '500'));
        setUdpPortInput(String(config.udpPort || '5002'));
        setDefaultBaudRateInput(String(config.defaultBaudRate || '115200'));
        setGithubClientIdInput(config.githubClientId || '');
        setGithubClientSecretInput(config.githubClientSecret || '');
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
      ipcRenderer.off('github-oauth-success', onGitHubOauthSuccess);
      ipcRenderer.off('refresh-registered-devices', onRefreshRegisteredDevices);
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
    // Continuously append to the persistent log file on disk
    ipcRenderer.send('append-to-log-file', text);

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

  const handleSaveConsoleLogs = async () => {
    if (consoleLogs.length === 0) {
      alert('Console logs are empty.');
      return;
    }
    const logContent = consoleLogs.map(log => `[${log.time}] ${log.text}`).join('\n');
    const result = await ipcRenderer.invoke('save-log-file', logContent);
    if (result.success) {
      addLogLine(`[GUI] Successfully exported debug console logs to: ${result.filePath}`, 'success');
    } else if (result.error) {
      addLogLine(`[GUI ERROR] Failed to export debug console logs: ${result.error}`, 'error');
    }
  };

  const handleDownloadReport = async () => {
    const totalCount = Object.keys(diagnostics).length;
    const okCount = Object.values(diagnostics).filter(v => v === 'OK').length;
    const errCount = Object.values(diagnostics).filter(v => v === 'ERROR').length;
    const pendingCount = Object.values(diagnostics).filter(v => v === 'WAITING' || v === 'PENDING' || v === 'TESTING').length;

    let overallStatus = 'PENDING';
    if (errCount > 0) {
      overallStatus = 'FAILING';
    } else if (okCount === totalCount) {
      overallStatus = 'SUCCESS';
    }

    const reportContent = `=========================================
      IOT MONITORED GATEWAY CHECK REPORT
=========================================
Date/Time     : ${new Date().toLocaleString()}
Device IMEI   : ${imei}
Device MAC    : ${mac}
Connection    : ${connection.type ? connection.type.toUpperCase() : 'DISCONNECTED'} (${connection.target || 'N/A'})

PERIPHERAL MODULE TEST RESULTS:
-----------------------------------------
${Object.keys(diagnostics).map(key => `- ${key.toUpperCase().padEnd(17)}: ${diagnostics[key]}`).join('\n')}

SUMMARY:
-----------------------------------------
Passed Modules : ${okCount}
Failed Modules : ${errCount}
Untested       : ${pendingCount}
Overall Status : ${overallStatus}
=========================================
`;

    const result = await ipcRenderer.invoke('save-log-file', reportContent);
    if (result.success) {
      addLogLine(`[GUI] Successfully exported diagnostics check report to: ${result.filePath}`, 'success');
    } else if (result.error) {
      addLogLine(`[GUI ERROR] Failed to export check report: ${result.error}`, 'error');
    }
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
          telemetryInterval: parseInt(regInterval) || 1500,
          deviceNumber: parseInt(regDeviceNumber) || 1
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
        setRegDeviceNumber('1');
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

  const handleRegisterDetectedDevice = async (device) => {
    if (!device?.imei) {
      alert('Detected device is missing IMEI information.');
      return;
    }

    try {
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: device.imei,
          pcbNumber: device.pcbNumber || device.pcb || '',
          password: device.password || 'admin_secure_gate',
          routerSSID: '',
          routerPassword: '',
          telemetryInterval: 1500,
          connectionType: 'tcp',
          target: device.ip || '',
          mac: device.mac || ''
        })
      });

      if (res.ok) {
        addLogLine(`[DB] Registered detected device ${device.ip} (${device.imei}) successfully.`, 'success');
        fetchRegisteredDevices();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Unknown registration error');
      }
    } catch (err) {
      addLogLine(`[DB ERROR] Failed to save detected device ${device.ip}: ${err.message}`, 'error');
      alert(`Registration error: ${err.message}`);
    }
  };

  // REST API: Delete a device configuration
  const handleDeleteDevice = async (imei) => {
    if (!imei) {
      alert('Cannot delete: Device IMEI is empty or undefined.');
      return;
    }
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
    const validExtensions = ['.pem', '.crt', '.key', '.json'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      alert('Invalid certificate format. Choose a valid certificate file (.pem, .crt, .key, or .json)');
      return;
    }

    if (fileExt === '.json') {
      setIsUploadingUuid(true);
      setCertUploadProgress(10);
      addLogLine(`[SPIFFS] Reading JSON config: ${file.name}...`);

      try {
        const fs = window.require('fs');
        const fileContent = fs.readFileSync(file.path, 'utf8');
        let jsonPayload = JSON.parse(fileContent);

        // Inject token if provided in input field
        if (uuidToken.trim() !== '') {
          jsonPayload.token = uuidToken.trim();
          addLogLine(`[SPIFFS] Injected token into ${file.name} payload.`);
        }

        const updatedContent = JSON.stringify(jsonPayload, null, 2);
        addLogLine(`[SPIFFS] Uploading ${file.name} directly to ESP32 SPIFFS...`);

        // Send file to ESP32 via update-spiffs-file
        const cleanFilename = file.name.startsWith('/') ? file.name : '/' + file.name;
        ipcRenderer.send('update-spiffs-file', {
          ip: otaIp,
          port: otaPort,
          filename: cleanFilename,
          content: updatedContent
        });

        setTimeout(() => setCertUploadProgress(40), 150);
        setTimeout(() => setCertUploadProgress(85), 350);
      } catch (err) {
        setIsUploadingUuid(false);
        setCertUploadProgress(0);
        addLogLine(`[ERROR] Failed to process JSON file: ${err.message}`, 'error');
        alert(`Failed to process JSON file: ${err.message}`);
      }
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

  // GitHub Integration Handler
  const handleGitHubSignIn = async () => {
    if (gitHubUser) {
      setGitHubUser(null);
      localStorage.removeItem('github_user');
      addLogLine('[GITHUB] Signed out from GitHub integration.', 'system');
      return;
    }
    addLogLine('[GITHUB] Opening GitHub OAuth secure sign-in window...', 'system');
    try {
      const user = await ipcRenderer.invoke('github-oauth-sign-in');
      setGitHubUser(user);
      localStorage.setItem('github_user', JSON.stringify(user));
      addLogLine(`[GITHUB] OAuth authorization successful! Welcome, ${user.name} (@${user.username}).`, 'success');
    } catch (e) {
      addLogLine(`[GITHUB ERROR] Sign-in failed: ${e.message}`, 'error');
      alert(`GitHub Sign-In Failed:\n${e.message}`);
    }
  };

  const handleGitHubCopyLink = async () => {
    try {
      const link = await ipcRenderer.invoke('get-github-oauth-link');
      navigator.clipboard.writeText(link);
      addLogLine('[GITHUB] OAuth link copied to clipboard. Paste it in your browser!', 'info');
      alert('GitHub Auth Link copied to clipboard!\n\nPaste it into your browser to authenticate. Once you authorize, you will be redirected to the app.');
    } catch (e) {
      addLogLine(`[GITHUB ERROR] Failed to generate auth link: ${e.message}`, 'error');
      alert(`Failed to generate link:\n${e.message}`);
    }
  };

  // Trigger Connections
  const [autoConnectMode, setAutoConnectMode] = useState(false);

  const connectSerial = () => {
    if (!selectedSerialPort) return;
    ipcRenderer.send('connect-serial', { portPath: selectedSerialPort, baudRate: selectedBaud, pcbNumber });
  };

  // Auto-scan: refresh port list then try connecting to each one in order
  // until a successful connection is established (useful when exact COM port is unknown)
  const autoScanAndConnect = async () => {
    addLogLine('[AUTO] Scanning for COM ports to auto-connect...', 'system');
    const ports = await ipcRenderer.invoke('list-ports');
    setSerialPorts(ports);
    if (ports.length === 0) {
      addLogLine('[AUTO] No COM ports found. Check USB cable and driver installation.', 'error');
      return;
    }
    addLogLine(`[AUTO] Found ${ports.length} port(s): ${ports.map(p => p.path).join(', ')}`, 'system');
    // Pick the most likely ESP32 port (prefer Silicon Labs / WCH / Expressif)
    const preferred = ports.find(p =>
      p.manufacturer && (
        p.manufacturer.toLowerCase().includes('silicon') ||
        p.manufacturer.toLowerCase().includes('wch') ||
        p.manufacturer.toLowerCase().includes('espressif') ||
        p.manufacturer.toLowerCase().includes('arduino')
      )
    ) || ports[0];
    setSelectedSerialPort(preferred.path);
    setSelectedBaud('115200');
    addLogLine(`[AUTO] Auto-selecting port: ${preferred.path} (${preferred.manufacturer || 'Generic'}) at 115200 baud`, 'system');
    ipcRenderer.send('connect-serial', { portPath: preferred.path, baudRate: '115200', pcbNumber });
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

  const runBatchTesting = async () => {
    if (discoveredGateways.length === 0) {
      alert('No discovered devices to batch test. Scan network first.');
      return;
    }

    setIsBatchTesting(true);
    addLogLine(`[BATCH] Starting sequential test on ${discoveredGateways.length} discovered device(s)...`, 'system');

    for (let i = 0; i < discoveredGateways.length; i++) {
      const gw = discoveredGateways[i];
      addLogLine(`[BATCH] Connecting to Device ${i + 1}/${discoveredGateways.length} at ${gw.ip}:9000...`, 'info');

      // Clear diagnostics for this run so we can detect completion
      resetDiagnostics();

      // Connect to the device
      ipcRenderer.send('connect-tcp', { ip: gw.ip, port: '9000', pcbNumber });

      // Wait for connection to be active (timeout after 5 seconds)
      let connected = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (connectionRef.current.type === 'tcp' && connectionRef.current.target && connectionRef.current.target.startsWith(gw.ip)) {
          connected = true;
          break;
        }
      }

      if (!connected) {
        addLogLine(`[BATCH ERROR] Failed to connect to device ${gw.ip}. Skipping...`, 'error');
        continue;
      }

      // Connection succeeded! Trigger diagnostics.
      addLogLine(`[BATCH] Device connected. Triggering selfcheck...`, 'info');
      ipcRenderer.send('send-tcp-command', 'RE_DIAGNOSE');

      // Wait for diagnostics results (BOOT_SUCCESS payload) or timeout after 15 seconds
      let testComplete = false;
      for (let sec = 0; sec < 150; sec++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const diags = diagnosticsRef.current;
        if (diags.rs232 !== 'WAITING' && diags.rs232 !== 'TESTING' &&
          diags.rs485 !== 'WAITING' && diags.rs485 !== 'TESTING' &&
          diags.gprs !== 'WAITING' && diags.gprs !== 'TESTING') {
          testComplete = true;
          break;
        }
      }

      if (testComplete) {
        addLogLine(`[BATCH] Device at ${gw.ip} tested successfully!`, 'success');
      } else {
        addLogLine(`[BATCH WARNING] Device at ${gw.ip} test timed out. Proceeding anyway.`, 'warning');
      }

      // Disconnect before going to next device
      ipcRenderer.send('disconnect-active');
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait for socket cleanup
    }

    setIsBatchTesting(false);
    addLogLine('[BATCH] Sequential batch testing completed!', 'success');
    alert('Batch testing complete! Diagnostic logs have been synced to the database.');
  };

  const queryDeviceDiagnostics = async () => {
    setIsQuerying(true);
    setQueryError('');
    setQueriedInfo(null);
    addLogLine(`[GUI] Querying diagnostics info from http://${directConnectIp}:${directHttpPort}...`, 'system');

    try {
      const result = await ipcRenderer.invoke('query-device-info', {
        ip: directConnectIp,
        port: directHttpPort
      });

      if (result.success) {
        setQueriedInfo(result.info);
        addLogLine('[GUI] Successfully fetched device configuration and status via HTTP API!', 'success');

        // Also populate default fields
        setWifiIp(directConnectIp);
        setWifiPort(directSocketPort);

        // Update IMEI/MAC if available
        if (result.info.imei) setImei(result.info.imei);
        if (result.info.mac) setMac(result.info.mac);

        // Update WiFi details state
        setWifiDetails(prev => ({
          ...prev,
          status: result.info.wifi_status || 'DISCONNECTED',
          ssid: result.info.ssid || '--',
          mac_sta: result.info.mac || '--',
          mac_ap: result.info.ap_ssid || '--',
          ip_sta: result.info.wifi_ip || '--',
          ip_ap: result.info.ap_ip || '--',
          ap_clients: result.info.ap_clients || 0,
          ap_clients_list: result.info.ap_clients_list || []
        }));
      } else {
        setQueryError(result.error || 'Failed to query device.');
        addLogLine(`[GUI ERROR] HTTP Info query failed: ${result.error}`, 'error');
      }
    } catch (err) {
      setQueryError(err.message || 'An unexpected error occurred.');
      addLogLine(`[GUI ERROR] queryDeviceDiagnostics exception: ${err.message}`, 'error');
    } finally {
      setIsQuerying(false);
    }
  };

  const connectDirectWifi = () => {
    setWifiIp(directConnectIp);
    setWifiPort(directSocketPort);
    ipcRenderer.send('connect-tcp', { ip: directConnectIp, port: directSocketPort, pcbNumber });
    addLogLine(`[GUI] Initiating active connection to telemetry socket at ${directConnectIp}:${directSocketPort}...`, 'info');
  };

  const saveWiFiRouterSettingsHTTP = async () => {
    if (!wifiRouterSsid) {
      alert('Please enter a Router SSID.');
      return;
    }
    addLogLine(`[GUI] Sending new WiFi configurations SSID='${wifiRouterSsid}' to device via HTTP POST...`, 'info');
    try {
      const result = await ipcRenderer.invoke('set-wifi-http', {
        ip: directConnectIp,
        port: directHttpPort,
        ssid: wifiRouterSsid,
        pass: wifiRouterPass
      });
      if (result.success) {
        addLogLine(`[GUI] WiFi router credentials updated successfully over HTTP. SSID: ${wifiRouterSsid}`, 'success');
        alert('WiFi router credentials saved on ESP32 successfully. You can now reboot the device.');
      } else {
        addLogLine(`[GUI ERROR] Failed to save WiFi config over HTTP: ${result.error}`, 'error');
        alert(`Failed to save WiFi configuration: ${result.error}`);
      }
    } catch (err) {
      addLogLine(`[GUI ERROR] HTTP save WiFi exception: ${err.message}`, 'error');
      alert(`Error saving WiFi configuration: ${err.message}`);
    }
  };

  const rebootDeviceHTTP = async () => {
    addLogLine('[GUI] Sending reboot instruction to device via HTTP POST...', 'info');
    try {
      const result = await ipcRenderer.invoke('reboot-http', {
        ip: directConnectIp,
        port: directHttpPort
      });
      if (result.success) {
        addLogLine('[GUI] Reboot command accepted. Device is restarting...', 'success');
        setQueriedInfo(null);
        alert('Reboot command sent successfully. The ESP32 is now restarting to connect to your configured router.');
      } else {
        addLogLine(`[GUI ERROR] HTTP reboot failed: ${result.error}`, 'error');
        alert(`Failed to reboot: ${result.error}`);
      }
    } catch (err) {
      addLogLine(`[GUI ERROR] HTTP reboot exception: ${err.message}`, 'error');
      alert(`Error sending reboot instruction: ${err.message}`);
    }
  };

  const startCertProvisioning = () => {
    if (!certRootCaUrl || !certDeviceCertUrl || !certPrivateKeyUrl) {
      alert('Please specify all three certificate URLs.');
      return;
    }

    // Check if IMEI and Password inputs are provided since they are used in formatting
    const checkImei = imeiProvisionInput || imeiInput;
    const checkPass = passwordProvisionInput || passwordInput;
    if (!checkImei || !checkPass) {
      alert('Please provide IMEI and Password to format certificate URLs.');
      return;
    }

    const formatUrl = (url) => {
      const activeImei = imeiProvisionInput || imeiInput || '';
      const activePass = passwordProvisionInput || passwordInput || '';
      return url
        .replace(/\{IMEI\}/gi, activeImei)
        .replace(/\{IEMI\}/gi, activeImei)
        .replace(/\{PASSWORD\}/gi, activePass)
        .replace(/\{PASS\}/gi, activePass)
        .replace(/\{passowrd\}/gi, activePass);
    };

    setIsDownloadingCerts(true);
    setCertDownloadStatus('Initiating download...');
    setCertStatuses({
      'aws_root_ca.pem': 'idle',
      'device_cert.crt': 'idle',
      'private_key.key': 'idle'
    });
    setCertDetails({
      'aws_root_ca.pem': null,
      'device_cert.crt': null,
      'private_key.key': null
    });
    ipcRenderer.send('download-and-provision-certs', {
      urls: {
        'aws_root_ca.pem': formatUrl(certRootCaUrl),
        'device_cert.crt': formatUrl(certDeviceCertUrl),
        'private_key.key': formatUrl(certPrivateKeyUrl)
      },
      ip: gatewayIpProvisionInput || wifiIp,
      port: otaPort,
      target: certTarget
    });
  };

  const saveAppConfigSettings = () => {
    const config = {
      mongoUri: dbUriInput,
      expressPort: parseInt(expressPortInput) || 8000,
      telemetryPort: parseInt(telemetryPortInput) || 9000,
      otaPort: parseInt(otaPortInput) || 500,
      udpPort: parseInt(udpPortInput) || 5002,
      defaultBaudRate: parseInt(defaultBaudRateInput) || 115200,
      githubClientId: githubClientIdInput,
      githubClientSecret: githubClientSecretInput
    };
    ipcRenderer.send('save-app-config', config);
    setOtaPort(String(config.otaPort));
    alert('Settings saved successfully. Restart the application for port updates to take effect.');
  };

  const triggerDbReconnect = () => {
    setIsReconnectingDb(true);
    setDbReconnectStatus('Connecting...');
    ipcRenderer.send('reconnect-database', { uri: dbUriInput });
  };

  const triggerBoot = () => {
    if (!connection.type) {
      alert('No active connection. Gateway must be connected (TCP or Serial) to start boot.');
      return;
    }

    setBootManualStopped(false);
    setIsBooting(true);
    setBootTriggerEnabled(true);
    setBootMessage('Starting manual boot sequence...');
    setBootStep('START');
    setBootProgress(10);
    sendControlCommand(`START_BOOT:${certPreUploadTarget}`);
  };

  const stopBootSequence = () => {
    if (!isBooting && bootProgress === 0) {
      addLogLine('[SYS] Boot sequence is not currently active.', 'warning');
      return;
    }

    setBootManualStopped(true);
    setBootMessage('Boot sequence manually stopped.');
    setBootStep('');
    setBootProgress(0);
    setIsBooting(false);
    setBootTriggerEnabled(true);
    lastBootSuccessSignature.current = '';
    addLogLine('[SYS] Boot sequence manually stopped by user.', 'warning');
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

  const handleDiPinSimChange = (index, isChecked) => {
    setDiPinsSimulated(prev => {
      const next = [...prev];
      next[index] = isChecked;
      return next;
    });
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

  if (!isLoggedIn) {
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
        <div style={{
          width: '100vw',
          height: 'calc(100vh - 38px)',
          background: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'var(--font-sans)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Glassy Prism Background Blobs */}
          <div style={{
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, rgba(217, 70, 239, 0.08) 50%, transparent 100%)',
            width: '450px',
            height: '450px',
            filter: 'blur(70px)',
            position: 'absolute',
            top: '-150px',
            left: '-150px',
            zIndex: 1,
            pointerEvents: 'none'
          }} />
          <div style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.08) 50%, transparent 100%)',
            width: '500px',
            height: '500px',
            filter: 'blur(80px)',
            position: 'absolute',
            bottom: '-200px',
            right: '-200px',
            zIndex: 1,
            pointerEvents: 'none'
          }} />
          <div style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(79, 70, 229, 0.05) 60%, transparent 100%)',
            width: '400px',
            height: '400px',
            filter: 'blur(60px)',
            position: 'absolute',
            top: '25%',
            left: '35%',
            zIndex: 1,
            pointerEvents: 'none'
          }} />

          {/* Sexy Glassy Prism Login Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(25px) saturate(180%)',
            WebkitBackdropFilter: 'blur(25px) saturate(180%)',
            padding: '45px 35px',
            borderRadius: '24px',
            width: '380px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            zIndex: 2
          }}>
            {/* Header Emblem */}
            <div style={{
              marginBottom: '20px',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(6,182,212,0.1) 100%)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 0 20px rgba(236,72,153,0.2)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#ec4899' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>

            <h2 style={{ color: '#fff', marginBottom: '8px', fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {authMode === 'login' ? 'Admin Dashboard' : 'Create Credentials'}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '30px', lineHeight: '1.5' }}>
              {authMode === 'login' ? 'Enter credentials to manage IoT Monitor Systems.' : 'Set up a new master password and login.'}
            </p>

            {authMode === 'signup' && (
              <div className="input-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <label style={{ color: '#a5b4fc', fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    outline: 'none',
                    fontSize: '13.5px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s'
                  }}
                />
              </div>
            )}

            <div className="input-group" style={{ textAlign: 'left', marginBottom: '16px' }}>
              <label style={{ color: '#a5b4fc', fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '13.5px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s'
                }}
              />
            </div>

            <div className="input-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ color: '#a5b4fc', fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '13.5px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s'
                }}
              />
            </div>

            {authMode === 'signup' && (
              <div className="input-group" style={{ textAlign: 'left', marginBottom: '20px' }}>
                <label style={{ color: '#a5b4fc', fontSize: '10.5px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={authConfirmPassword}
                  onChange={e => setAuthConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    outline: 'none',
                    fontSize: '13.5px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s'
                  }}
                />
              </div>
            )}

            {authError && (
              <div style={{
                color: '#ef4444',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '12px',
                marginBottom: '15px'
              }}>
                ⚠️ {authError}
              </div>
            )}

            <button
              onClick={handleAuth}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '13px',
                boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                transition: 'all 0.3s'
              }}
            >
              {authMode === 'login' ? 'Unlock System' : 'Create Admin'}
            </button>

            <div style={{ margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <button
                onClick={async () => {
                  addLogLine('[GITHUB] Opening GitHub OAuth secure sign-in window...', 'system');
                  try {
                    const user = await ipcRenderer.invoke('github-oauth-sign-in');
                    setGitHubUser(user);
                    localStorage.setItem('github_user', JSON.stringify(user));
                    localStorage.setItem('isLoggedIn', 'true');
                    setIsLoggedIn(true);
                    addLogLine(`[GITHUB] OAuth authorization successful! Welcome, ${user.name} (@${user.username}).`, 'success');
                  } catch (e) {
                    addLogLine(`[GITHUB ERROR] Sign-in failed: ${e.message}`, 'error');
                    alert(`GitHub Sign-In Failed:\n${e.message}`);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#24292e',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                Sign In via Window (OAuth Portal)
              </button>
              <button
                onClick={handleGitHubCopyLink}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  transition: 'all 0.3s'
                }}
              >
                🔗 Copy Auth Link to Browser
              </button>
            </div>

            <div
              style={{ color: '#a5b4fc', fontSize: '12px', marginTop: '20px', cursor: 'pointer', display: 'inline-block', borderBottom: '1px dotted #a5b4fc' }}
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            >
              {authMode === 'login' ? "Register New Credentials" : 'Already have credentials? Log In'}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Frameless window header bar */}
      <div className="window-titlebar">
        <div className="titlebar-logo">
          <IoTStarLogo size={14} />
          <span>IOT System Manager</span>
        </div>
        <div className="titlebar-controls">
          <button className="win-btn" onClick={() => ipcRenderer.send('window-minimize')}>&#128469;&#xFE0E;</button>
          <button className="win-btn" onClick={() => ipcRenderer.send('window-maximize')}>&#128470;&#xFE0E;</button>
          <button className="win-btn close" onClick={() => ipcRenderer.send('window-close')}>&#128473;&#xFE0E;</button>
        </div>
      </div>

      <div className="app-container">

        {/* Horizontal Navigation Header (Requirement 1 & 2) */}
        <header className="app-header">
          <div className="header-brand">
            <IoTStarLogo size={24} />
            <div className="header-title-group">
              <h2 className="header-title">IOT System Manager</h2>
              <span className="header-subtitle">IoT Router v3.0</span>
            </div>
          </div>

          <nav className="header-nav">
            <button className={`header-nav-item ${activeTab === 'page-dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('page-dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-database' ? 'active' : ''}`} onClick={() => setActiveTab('page-database')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
              <span>MongoDB History</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-device-registry' ? 'active' : ''}`} onClick={() => setActiveTab('page-device-registry')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
              <span>Device Registry</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-security' ? 'active' : ''}`} onClick={() => setActiveTab('page-security')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Security & Config</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-ota' ? 'active' : ''}`} onClick={() => setActiveTab('page-ota')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span>Wireless OTA</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-console' ? 'active' : ''}`} onClick={() => setActiveTab('page-console')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5" />
                <line x1="12" y1="19" x2="20" y2="19" />
              </svg>
              <span>Debug Console</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-circuit' ? 'active' : ''}`} onClick={() => setActiveTab('page-circuit')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6" y2="18" />
                <line x1="18" y1="6" x2="18" y2="18" />
                <line x1="6" y1="12" x2="18" y2="12" />
              </svg>
              <span>Circuit & Support</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-hardware' ? 'active' : ''}`} onClick={() => setActiveTab('page-hardware')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Hardware Info</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-storage' ? 'active' : ''}`} onClick={() => setActiveTab('page-storage')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              <span>Storage</span>
            </button>
          </nav>

          <div className="header-right">
            {/* Header status indicator removed as requested */}

            <div className="header-status-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', fontSize: '11px' }}>
              <span className="ping-label" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>Socket Ping:</span>
              <span className={`ping-result ${pingLatency.status}`} style={{ fontSize: '11px', fontWeight: 'bold' }}>{pingLatency.value}</span>
            </div>

            <div className="header-account-container">
              <button className="header-account-btn" onClick={() => setShowAccountMenu(prev => !prev)}>
                Account ▾
              </button>
              {showAccountMenu && (
                <div className="header-dropdown-menu">
                  {!isLoggedIn ? (
                    <>
                      <button className="header-dropdown-item" onClick={() => openAuthView('login')}>
                        🔑 Login
                      </button>
                      <button className="header-dropdown-item" onClick={() => openAuthView('signup')}>
                        📝 Sign Up
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="header-dropdown-item" style={{ cursor: 'default', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', paddingBottom: '2px' }}>
                        👤 Admin Connected
                      </div>
                      <button className="header-dropdown-item" onClick={() => { setActiveTab('page-settings'); setShowAccountMenu(false); }}>
                        ⚙️ App Settings
                      </button>
                      <div className="header-dropdown-divider"></div>
                      <button className="header-dropdown-item" onClick={() => { localStorage.removeItem('isLoggedIn'); setIsLoggedIn(false); setShowAccountMenu(false); addLogLine('[GUI] Signed out.', 'system'); }}>
                        🚪 Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Layout Panels */}
        <main className="main-content">

          {/* ================= VIEW 1: DASHBOARD ================= */}
          <section id="page-dashboard" className={`page-view ${activeTab === 'page-dashboard' ? 'active' : ''}`}>
            <header className="view-header glass-header unified-color-bar">
              <div className="header-actions-wrapper" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div className="header-left-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                  <button className="btn btn-primary header-btn" onClick={triggerSelfCheckReRun} disabled={controlsDisabled || !connection.type} title="Run diagnostics checking on all modules">
                    Run All Tests
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={triggerSelfCheckReRun} disabled={controlsDisabled || !connection.type} title="Re-evaluate peripheral hardware status">
                    Recheck Hardware
                  </button>
                  <button className="btn btn-accent header-btn" onClick={() => sendControlCommand('SHIFT_TO_QCOM')} disabled={!connection.type} title="Shift communications target to QCOM">
                    Shift to QCOM
                  </button>
                  <button className="btn btn-accent header-btn" onClick={() => sendControlCommand('FORMAT_SPIFFS')} disabled={!connection.type} title="Format ESP32 flash partition storage">
                    Format SPIFFS
                  </button>
                  <button className="btn btn-accent header-btn" onClick={() => sendControlCommand('SYNC_CERTS_TO_QCOM')} disabled={!connection.type} title="Sync certificates from ESP32 to QCOM">
                    Sync Certs
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={handleDownloadReport} title="Export diagnostics report to local disk">
                    Download Report
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={exportTelemetryJson} title="Export telemetry history as JSON">
                    Export Telemetry
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={() => setConsoleLogs([])} title="Clear live console logs">
                    Clear Console
                  </button>
                  <button className="btn btn-danger header-btn" onClick={() => sendControlCommand('REBOOT')} disabled={!connection.type} title="Force soft reboot of connected gateway">
                    Reboot Gateway
                  </button>
                </div>

                <div className="header-right-status" style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '0 0 auto' }}>
                  <div className="live-status-container" style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11.5px' }}>
                    <div className="live-status-item">
                      <span className="live-status-label" style={{ color: 'var(--text-dim)' }}>Device IMEI: </span>
                      <span className="live-status-value" style={{ fontWeight: 'bold', color: '#fff' }}>{imei && imei !== '--' ? imei : 'N/A'}</span>
                    </div>
                    <div className="live-status-item">
                      <span className="live-status-label" style={{ color: 'var(--text-dim)' }}>PCB: </span>
                      <span className="live-status-value" style={{ fontWeight: 'bold', color: '#fff' }}>{pcbNumber || 'N/A'}</span>
                    </div>
                    <div className="live-status-item">
                      <span className="live-status-label" style={{ color: 'var(--text-dim)' }}>DB Status: </span>
                      <span className="live-status-value" style={{ fontWeight: 'bold', color: dbStatus.mongodb === 'CONNECTED' ? '#00ff66' : '#ff9900' }}>
                        {dbStatus.mongodb === 'CONNECTED' ? 'Connected' : 'Local Fallback'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <div className="dashboard-top-grid">

              {/* Interface Control Panel */}
              <div className="glass-card connection-panel">
                <h3><span className="icon">&#128268;</span> Connect Gateway</h3>

                {(!connection.type || connection.type === 'failed') ? (
                  <>
                    <div className="input-group" style={{ marginBottom: '15px' }}>
                      <label>Select Registered Device Profile</label>
                      <select 
                        value={selectedRegDeviceImei} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedRegDeviceImei(val);
                          if (val === 'custom') {
                            setPcbNumber('');
                          } else {
                            const profile = registeredDevices.find(d => d.imei === val);
                            if (profile) {
                              setPcbNumber(profile.pcbNumber || '');
                              if (profile.imei) {
                                setImei(profile.imei);
                              }
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          outline: 'none',
                          fontSize: '13px'
                        }}
                      >
                        <option value="">-- Select Registered Profile --</option>
                        {[...registeredDevices].sort((a,b) => (a.deviceNumber || 0) - (b.deviceNumber || 0)).map((d) => (
                          <option key={d._id || d.imei} value={d.imei}>
                            Device #{d.deviceNumber || '1'} - {d.pcbNumber || d.imei}
                          </option>
                        ))}
                        <option value="custom">✍️ Custom Manual Input...</option>
                      </select>
                    </div>

                    {(selectedRegDeviceImei === 'custom' || !selectedRegDeviceImei) && (
                      <div className="input-group" style={{ marginBottom: '15px' }}>
                        <label>PCB Serial Number</label>
                        <input
                          type="text"
                          value={pcbNumber}
                          onChange={(e) => setPcbNumber(e.target.value)}
                          placeholder="e.g. PCB-ESP32-v3-987"
                        />
                      </div>
                    )}

                    <div className="tabs-control">
                      <button className={`tab-btn ${activeConnTab === 'tab-wifi' ? 'active' : ''}`} onClick={() => setActiveConnTab('tab-wifi')}>WiFi IP</button>
                      <button className={`tab-btn ${activeConnTab === 'tab-serial' ? 'active' : ''}`} onClick={() => setActiveConnTab('tab-serial')}>Serial</button>
                    </div>

                    {activeConnTab === 'tab-wifi' ? (
                      <div className="tab-content active">
                        {/* Scope Toggle Switch */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '8px 12px', background: 'rgba(255, 0, 127, 0.04)', border: '1px solid rgba(255, 0, 127, 0.12)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-pink)', textTransform: 'uppercase' }}>
                            {connectionMode === 'ap' ? '📶 Direct ESP32 AP Mode' : '🌐 Router / WiFi Scope'}
                          </span>
                          <label className="switch-toggle" style={{ margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={connectionMode === 'router'}
                              onChange={(e) => {
                                const mode = e.target.checked ? 'router' : 'ap';
                                setConnectionMode(mode);
                                if (mode === 'ap') {
                                  setWifiIp('192.168.0.1'); // Fixed default SoftAP IP
                                } else {
                                  setWifiIp(''); // Clear for router scan
                                }
                              }}
                            />
                            <span className="switch-slider"></span>
                          </label>
                        </div>

                        {connectionMode === 'ap' ? (
                          <>
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
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="button-row" style={{ display: 'flex', gap: '10px' }}>
                              <button className="btn btn-accent" style={{ flex: 1 }} onClick={scanNetworkForGateway} disabled={isScanningNetwork}>
                                {isScanningNetwork ? 'Scanning...' : '🔍 Scan network gateways'}
                              </button>
                            </div>
                          </>
                        )}

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

                        {connectionMode === 'router' && discoveredGateways.length > 0 && (
                          <div className="discovered-gateways-list" style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-pink)', display: 'block', marginBottom: '5px' }}>Discovered Devices:</span>
                            {discoveredGateways.map((gw, index) => (
                              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: index < discoveredGateways.length - 1 ? '1px dashed rgba(255,255,255,0.05)' : 'none' }}>
                                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>{gw.ip} ({gw.imei})</span>
                                <button className="btn btn-secondary small" style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px' }} onClick={() => connectDiscoveredGateway(gw)}>Connect</button>
                              </div>
                            ))}
                            <button className="btn btn-accent" style={{ width: '100%', marginTop: '10px', padding: '6px 0', fontSize: '11px', height: '30px' }} onClick={runBatchTesting} disabled={isBatchTesting}>
                              {isBatchTesting ? 'Testing Batch...' : '🧪 Run Batch Test All'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="tab-content active">

                        {/* Auto / Manual connection mode toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '8px 12px', background: 'rgba(0,198,255,0.04)', borderRadius: '8px', border: '1px solid rgba(0,198,255,0.12)' }}>
                          <span style={{ fontSize: '12px', color: '#a0a0c0', fontWeight: '600' }}>
                            {autoConnectMode ? '⚡ Auto-Connect Mode' : '🔧 Manual Mode'}
                          </span>
                          <label className="switch-toggle" style={{ margin: 0 }}>
                            <input type="checkbox" checked={autoConnectMode} onChange={e => setAutoConnectMode(e.target.checked)} />
                            <span className="switch-slider"></span>
                          </label>
                        </div>

                        {autoConnectMode ? (
                          <>
                            <p style={{ fontSize: '11.5px', color: '#8080a0', marginBottom: '12px', lineHeight: 1.5 }}>
                              Auto mode scans all COM ports and connects to the first ESP32-compatible device found at 115200 baud.
                            </p>
                            {serialPorts.length > 0 && (
                              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(0,255,150,0.04)', borderRadius: '6px', border: '1px solid rgba(0,255,150,0.1)' }}>
                                <span style={{ fontSize: '11px', color: '#8080a0', display: 'block', marginBottom: '4px' }}>Detected Ports:</span>
                                {serialPorts.map((p, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '2px 0' }}>
                                    <span style={{ fontFamily: 'monospace', color: '#00c6ff' }}>{p.path}</span>
                                    <span style={{ color: '#6060a0' }}>{p.manufacturer || 'Generic'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={autoScanAndConnect}>
                              ⚡ Auto-Scan &amp; Connect
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="input-group">
                              <label>USB COM Target Port</label>
                              <div className="select-wrapper">
                                <select value={selectedSerialPort === 'CUSTOM_PORT' || (selectedSerialPort && !serialPorts.some(p => p.path === selectedSerialPort)) ? 'CUSTOM_PORT' : selectedSerialPort} onChange={(e) => {
                                  if (e.target.value === 'CUSTOM_PORT') {
                                    setSelectedSerialPort('CUSTOM_PORT');
                                  } else {
                                    setSelectedSerialPort(e.target.value);
                                  }
                                }}>
                                  {serialPorts.length === 0 ? (
                                    <option value="">No COM ports scanned</option>
                                  ) : (
                                    serialPorts.map(p => <option key={p.path} value={p.path}>{p.path} — {p.manufacturer || 'Generic'}</option>)
                                  )}
                                  <option value="CUSTOM_PORT">-- Enter Custom COM Port --</option>
                                </select>
                                <button className="btn btn-secondary small" onClick={refreshPorts}>&#8635;</button>
                              </div>
                            </div>
                            {(selectedSerialPort === 'CUSTOM_PORT' || (selectedSerialPort && !serialPorts.some(p => p.path === selectedSerialPort))) && (
                              <div className="input-group" style={{ marginTop: '10px' }}>
                                <label>Custom COM Port Path</label>
                                <input
                                  type="text"
                                  value={selectedSerialPort === 'CUSTOM_PORT' ? '' : selectedSerialPort}
                                  onChange={(e) => setSelectedSerialPort(e.target.value)}
                                  placeholder="e.g. COM3 or /dev/ttyUSB0"
                                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '8px 12px', borderRadius: '6px' }}
                                />
                              </div>
                            )}
                            <div className="input-group">
                              <label>Baud Rate</label>
                              <select value={selectedBaud} onChange={(e) => setSelectedBaud(e.target.value)}>
                                <option value="115200">115200 (Firmware default)</option>
                                <option value="9600">9600</option>
                                <option value="74880">74880 (ROM bootloader)</option>
                              </select>
                            </div>
                            <div className="button-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button className="btn btn-primary" style={{ flex: '1 1 100%' }} onClick={connectSerial}>Open COM Port</button>
                              <button className="btn btn-accent" style={{ flex: '1 1 100%' }} onClick={triggerBoot} disabled={!bootTriggerEnabled}>START_BOOT</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {connection.type === 'serial' && (
                      <div className="button-row" style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => ipcRenderer.send('reset-serial-device')}
                          title="Pulses the EN/RTS line to reboot firmware normally (NOT bootloader mode)"
                        >
                          ↺ Reset ESP32
                        </button>
                        <button
                          className="btn btn-accent"
                          style={{ flex: 1 }}
                          onClick={() => sendControlCommand('FORMAT_SPIFFS')}
                          title="Send FORMAT_SPIFFS command to reformat SPIFFS if it failed to mount"
                        >
                          🗂 Format SPIFFS
                        </button>
                      </div>
                    )}
                    <button className="btn btn-danger" onClick={disconnectGateway}>Disconnect active link</button>
                    
                    {/* Small scrollable side list of registered devices */}
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📋 Registered Profiles:
                      </span>
                      <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {registeredDevices.length === 0 ? (
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No registered devices</div>
                        ) : (
                          [...registeredDevices].sort((a,b) => (a.deviceNumber || 0) - (b.deviceNumber || 0)).map((d) => (
                            <div 
                              key={d._id || d.imei} 
                              onClick={() => {
                                setSelectedRegDeviceImei(d.imei);
                                setPcbNumber(d.pcbNumber || '');
                                setImei(d.imei || '');
                                if (d.routerSSID) setWifiRouterSsid(d.routerSSID);
                                if (d.routerPassword) setWifiRouterPass(d.routerPassword);
                              }}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '6px 8px', 
                                background: selectedRegDeviceImei === d.imei ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.01)', 
                                border: selectedRegDeviceImei === d.imei ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.04)', 
                                borderRadius: '4px', 
                                cursor: 'pointer',
                                fontSize: '10.5px' 
                              }}
                            >
                              <span style={{ fontWeight: 'bold', color: '#ff007f' }}>#{d.deviceNumber || '1'}</span>
                              <span style={{ color: '#fff', fontFamily: 'monospace' }}>{d.pcbNumber || d.imei.substring(0, 8)}</span>
                              <span className={`pulse-dot ${selectedRegDeviceImei === d.imei ? 'connected' : 'idle'}`} style={{ width: '6px', height: '6px' }}></span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Diagnostic Checklist Panel */}
              <div className="glass-card diagnostic-board">
                <div className="diag-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3><span className="icon">&#9881;</span> Diagnostics status</h3>
                    <div className="diag-meta">
                      <span>IMEI: {imei}</span>
                      <span>MAC: {mac}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary small"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', height: 'auto', margin: 0 }}
                    onClick={handleDownloadReport}
                  >
                    Download Report
                  </button>
                </div>

                <div className="diag-checklist">
                  {Object.keys(diagnostics).map(key => (
                    <div key={key} className={`diag-item ${diagnostics[key] === 'OK' ? 'success' : diagnostics[key] === 'ERROR' ? 'error' : diagnostics[key] === 'TESTING' ? 'warning' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div className="diag-indicator" style={{ marginRight: '8px' }}></div>
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
                      {key === 'gprs' && (
                        <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px', width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-accent small"
                              style={{ padding: '4px 10px', fontSize: '10px', height: '26px', flex: 1, cursor: 'pointer', margin: 0 }}
                              onClick={() => sendControlCommand('GPRS_SPEED')}
                              title="Sends AT+IPR=1000000;&W to set modem baud rate to 1 Mbps"
                            >
                              ⚡ Set 1 Mbps
                            </button>
                            <button
                              className="btn btn-accent small"
                              style={{ padding: '4px 10px', fontSize: '10px', height: '26px', flex: 1, cursor: 'pointer', margin: 0, background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}
                              onClick={() => sendControlCommand('GPRS_SPEED_115200')}
                              title="Sends AT+IPR=115200;&W to set modem baud rate to 115200"
                            >
                              ⚡ Set 115200
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-secondary small"
                              style={{ padding: '4px 10px', fontSize: '10px', height: '26px', flex: 1, cursor: 'pointer', margin: 0, border: '1px solid rgba(0, 240, 255, 0.3)' }}
                              onClick={() => setShowGprsConsole(true)}
                              title="Open GPRS Modem Interactive AT Command Debug Console"
                            >
                              📟 Debug Console
                            </button>
                            <button
                              className="btn btn-secondary small"
                              style={{ padding: '4px 10px', fontSize: '10px', height: '26px', flex: 1, cursor: 'pointer', margin: 0, border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)' }}
                              onClick={() => {
                                addLogLine('[CMD] Starting Serial Passthrough Bridge');
                                sendControlCommand('SERIAL_BRIDGE');
                              }}
                              disabled={!connection.type || connection.type !== 'serial'}
                              title="Forward data between USB Serial and GPRS module"
                            >
                              🔗 Passthrough
                            </button>
                          </div>
                        </div>
                      )}
                      {key === 'di' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                          <div className="di-pins-container" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px',
                            marginTop: '8px',
                            width: '100%',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            paddingTop: '8px'
                          }}>
                            {[0, 1, 2, 3].map(index => {
                              const isPinShorted = diPinsSimulated[index] || diPinsHardware[index];
                              return (
                                <div key={index} className={`di-pin-item ${isPinShorted ? 'shorted' : ''}`} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'rgba(5, 2, 18, 0.4)',
                                  border: '1px solid rgba(255, 0, 127, 0.1)',
                                  padding: '6px 8px',
                                  borderRadius: '6px',
                                  transition: 'all 0.2s ease'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div className="pin-indicator" style={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      background: isPinShorted ? 'var(--accent-emerald)' : 'var(--accent-red)',
                                      boxShadow: isPinShorted ? '0 0 6px var(--accent-emerald)' : '0 0 6px var(--accent-red)'
                                    }} />
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: isPinShorted ? '#fff' : 'var(--text-dim)' }}>DI {index + 1}</span>
                                  </div>
                                  <button
                                    className={`btn ${isPinShorted ? 'btn-accent' : 'btn-secondary'} small`}
                                    style={{ padding: '2px 8px', fontSize: '9px', height: '20px', minWidth: '54px', margin: 0, cursor: 'pointer', userSelect: 'none' }}
                                    onMouseDown={() => handleDiPinSimChange(index, true)}
                                    onMouseUp={() => handleDiPinSimChange(index, false)}
                                    onMouseLeave={() => handleDiPinSimChange(index, false)}
                                    onTouchStart={() => handleDiPinSimChange(index, true)}
                                    onTouchEnd={() => handleDiPinSimChange(index, false)}
                                  >
                                    {isPinShorted ? 'Shorted' : 'Push'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="tester-switch-container" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(3, 0, 10, 0.5)',
                            border: `1px solid ${testerSwitch ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                            padding: '6px 10px',
                            borderRadius: '8px',
                            marginTop: '4px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div className="pin-indicator" style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: testerSwitch ? 'var(--accent-emerald)' : 'var(--text-muted)',
                                boxShadow: testerSwitch ? '0 0 8px var(--accent-emerald)' : 'none'
                              }} />
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>Tester Switch (Pin 38)</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: testerSwitch ? 'var(--accent-emerald)' : 'var(--text-dim)', textTransform: 'uppercase' }}>
                              {testerSwitch ? 'ON' : 'OFF'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detected Devices Panel */}
              <div className="glass-card detected-devices-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <h3><span className="icon">📡</span> Detected Devices</h3>
                  <button className="btn btn-secondary small" onClick={scanNetworkForGateway} disabled={isScanningNetwork}>
                    {isScanningNetwork ? 'Scanning...' : 'Scan'}
                  </button>
                </div>
                <p className="section-desc" style={{ fontSize: '12px', marginTop: '-4px', marginBottom: '12px' }}>
                  Discovered gateways appear here so you can connect, register them to the database, or disconnect the active link.
                </p>

                {discoveredGateways.length === 0 ? (
                  <div className="detected-device-empty">
                    No devices detected yet. Start a scan to populate this panel.
                  </div>
                ) : (
                  <div className="detected-device-list">
                    {discoveredGateways.map((gw, index) => {
                      const isConnected = connection.type === 'tcp' && connection.target && connection.target.startsWith(gw.ip);
                      const isRegistered = registeredDevices.some((device) => device.imei === gw.imei || device.pcbNumber === gw.pcbNumber || device.imei === gw.id);
                      return (
                        <div key={`${gw.ip}-${index}`} className="detected-device-card">
                          <div className="detected-device-meta">
                            <span className="detected-device-ip">{gw.ip}</span>
                            <span className="detected-device-imei">{gw.imei || 'Unknown IMEI'}</span>
                          </div>
                          <div className="detected-device-actions">
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '10px', height: '28px', margin: 0 }}
                              onClick={() => (isConnected ? disconnectGateway() : connectDiscoveredGateway(gw))}
                            >
                              {isConnected ? 'Disconnect' : 'Connect'}
                            </button>
                            <button
                              className={`btn ${isRegistered ? 'btn-secondary' : 'btn-accent'}`}
                              style={{ padding: '6px 10px', fontSize: '10px', height: '28px', margin: 0 }}
                              onClick={() => !isRegistered && handleRegisterDetectedDevice(gw)}
                              disabled={isRegistered}
                            >
                              {isRegistered ? 'Registered' : 'Register'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Direct Wireless AP & Manual Connection Manager */}
            {connectionMode !== 'ap' && (
              <div className="dashboard-middle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', marginBottom: '20px' }}>

                {/* Direct AP Diagnostics & Manual Socket Link */}
                <div className="glass-card direct-ap-panel">
                  <h3><span className="icon">📶</span> Direct Wireless AP & Manual Link</h3>
                  <p className="section-desc" style={{ fontSize: '12px', color: '#8080a0', marginTop: '-15px', marginBottom: '15px' }}>
                    Query diagnostics or establish links manually if Serial Auto-Scan fails.
                  </p>

                  <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                    <div className="input-group">
                      <label>Gateway IP Address</label>
                      <input type="text" value={directConnectIp} onChange={(e) => setDirectConnectIp(e.target.value)} placeholder="192.168.0.1" />
                    </div>
                    <div className="input-group">
                      <label>HTTP Port (Info/Config)</label>
                      <input type="text" value={directHttpPort} onChange={(e) => setDirectHttpPort(e.target.value)} placeholder="8000" />
                    </div>
                    <div className="input-group">
                      <label>Socket Port (Telemetry)</label>
                      <input type="text" value={directSocketPort} onChange={(e) => setDirectSocketPort(e.target.value)} placeholder="9000" />
                    </div>
                    <div className="input-group">
                      <label>PCB Serial Number</label>
                      <input type="text" value={pcbNumber} onChange={(e) => setPcbNumber(e.target.value)} placeholder="PCB-ESP32-v3-987" />
                    </div>
                  </div>

                  <div className="button-row" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={queryDeviceDiagnostics} disabled={isQuerying}>
                      {isQuerying ? 'Querying...' : 'Query Device Info'}
                    </button>
                    <button className="btn btn-accent" style={{ flex: 1 }} onClick={connectDirectWifi}>
                      Open Telemetry Socket
                    </button>
                  </div>

                  {queryError && (
                    <div className="query-error-box" style={{ background: 'rgba(255, 0, 80, 0.08)', border: '1px solid rgba(255, 0, 80, 0.25)', color: '#ff4d6a', padding: '10px', borderRadius: '8px', fontSize: '11.5px', fontFamily: 'monospace', marginBottom: '15px' }}>
                      ⚠️ {queryError}
                    </div>
                  )}

                  {queriedInfo && (
                    <div className="queried-info-hud" style={{ background: 'rgba(0, 255, 200, 0.04)', border: '1px solid rgba(0, 255, 200, 0.15)', padding: '12px', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 'bold', color: '#00ffcc', marginBottom: '8px', borderBottom: '1px solid rgba(0,255,200,0.1)', paddingBottom: '4px' }}>
                        🛰️ Gateway Connected: ESP32 Gateway Active
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontFamily: 'monospace' }}>
                        <div><span style={{ color: '#8080a0' }}>SSID:</span> {queriedInfo.ssid || '(None)'}</div>
                        <div><span style={{ color: '#8080a0' }}>AP SSID:</span> {queriedInfo.ap_ssid}</div>
                        <div><span style={{ color: '#8080a0' }}>MAC:</span> {queriedInfo.mac}</div>
                        <div><span style={{ color: '#8080a0' }}>IMEI:</span> {queriedInfo.imei}</div>
                        <div><span style={{ color: '#8080a0' }}>WiFi IP:</span> {queriedInfo.wifi_ip}</div>
                        <div><span style={{ color: '#8080a0' }}>SoftAP IP:</span> {queriedInfo.ap_ip}</div>
                        <div><span style={{ color: '#8080a0' }}>WiFi Status:</span> <span style={{ color: queriedInfo.wifi_status === 'CONNECTED' ? '#00e676' : '#ff3366', fontWeight: 'bold' }}>{queriedInfo.wifi_status}</span></div>
                        <div><span style={{ color: '#8080a0' }}>AP Clients:</span> {queriedInfo.ap_clients}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct HTTP Configurator & Tech Specs */}
                <div className="glass-card direct-config-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3><span className="icon">⚙️</span> HTTP WiFi Settings & Admin Control</h3>
                    <p className="section-desc" style={{ fontSize: '12px', color: '#8080a0', marginTop: '-15px', marginBottom: '15px' }}>
                      Update Wi-Fi credentials on the gateway and trigger reboots via HTTP API.
                    </p>

                    <div className="form-row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                      <div className="input-group">
                        <label>Router Wi-Fi SSID</label>
                        <input type="text" value={wifiRouterSsid} onChange={(e) => setWifiRouterSsid(e.target.value)} placeholder="Enter Router SSID" />
                      </div>
                      <div className="input-group">
                        <label>Router Wi-Fi Password</label>
                        <input type="password" value={wifiRouterPass} onChange={(e) => setWifiRouterPass(e.target.value)} placeholder="Enter Password" />
                      </div>
                    </div>

                    <div className="button-row" style={{ display: 'flex', gap: '10px' }}>
                      <button className="btn btn-accent" style={{ flex: 1 }} onClick={saveWiFiRouterSettingsHTTP}>
                        Save Credentials (HTTP)
                      </button>
                      <button className="btn btn-danger" style={{ flex: 1 }} onClick={rebootDeviceHTTP}>
                        Reboot Gateway (HTTP)
                      </button>
                    </div>
                  </div>

                  {/* Micro-controller Firmware Tech Specifications */}
                  <div className="firmware-tech-spec" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 'bold', color: 'var(--accent-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      🛠️ Firmware Architecture & Stack (ESP32 Gateway)
                    </div>
                    <div className="specs-list-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: '11px', fontFamily: 'monospace' }}>
                      <div><span style={{ color: '#8080a0' }}>Processor:</span> Dual-Core Tensilica LX6</div>
                      <div><span style={{ color: '#8080a0' }}>Firmware OS:</span> FreeRTOS Kernel</div>
                      <div><span style={{ color: '#8080a0' }}>Framework:</span> Arduino v2.0.6 & ESP-IDF</div>
                      <div><span style={{ color: '#8080a0' }}>Filesystem:</span> SPIFFS (credential storage)</div>
                      <div><span style={{ color: '#8080a0' }}>Active Fw:</span> v{queriedInfo?.fw_version || '3.2.0'} (Updated)</div>
                      <div><span style={{ color: '#8080a0' }}>Free Heap:</span> {queriedInfo?.free_heap ? `${(queriedInfo.free_heap / 1024).toFixed(1)} KB` : '182.4 KB (Estimated)'}</div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#8080a0' }}>Telemetry Ports:</span> TCP/9000 (Data), UDP/5002 (Discovery)</div>
                      <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#8080a0' }}>HTTP API Services:</span> TCP/8000 (Diagnostics, OTA, Files)</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Wireless Gateway Client Devices (SoftAP Stations) */}
            <div className="glass-card ap-clients-panel" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}><span className="icon">📡</span> Connected Station Clients (Gateway Hotspot AP)</h3>
                <span className="badge badge-primary" style={{ fontSize: '11px', background: 'rgba(0,198,255,0.15)', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', padding: '3px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  {wifiDetails.ap_clients || queriedInfo?.ap_clients || 0} client(s) active
                </span>
              </div>

              {(!wifiDetails.ap_clients_list || wifiDetails.ap_clients_list.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '15px', color: '#606080', fontSize: '12px', fontStyle: 'italic', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                  No external station clients connected to ESP32 Gateway AP network.
                </div>
              ) : (
                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="station-clients-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: '#8080a0', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em' }}>
                        <th style={{ padding: '8px 12px' }}>#</th>
                        <th style={{ padding: '8px 12px' }}>Station MAC Address</th>
                        <th style={{ padding: '8px 12px' }}>Connection Link</th>
                        <th style={{ padding: '8px 12px' }}>Estimated RSSI</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wifiDetails.ap_clients_list.map((sta, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#00ffcc', fontWeight: 'bold' }}>{sta.mac}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: '11px', background: 'rgba(112,0,255,0.15)', color: '#b070ff', border: '1px solid rgba(112,0,255,0.25)', padding: '2px 8px', borderRadius: '4px' }}>
                              Wi-Fi Client (AP Mode)
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#00c6ff' }}>-45 dBm (Strong)</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontSize: '10px', background: 'rgba(0,230,118,0.15)', color: '#00e676', border: '1px solid rgba(0,230,118,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                              ONLINE & STREAMING
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* System Boot & Update Orchestrator */}
            {false && (
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
                    {(isBooting || bootProgress > 0) && (
                      <button
                        className="btn btn-danger boot-stop-btn"
                        onClick={stopBootSequence}
                        style={{ height: '42px' }}
                      >
                        <span className="btn-icon">&#10074;&#10074;</span> Stop Boot
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

          {/* ================= VIEW 2: MONGODB DATABASE LOGS ================= */}
          <section id="page-database" className={`page-view ${activeTab === 'page-database' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>MERN Database Dashboard</h1>
                <p>Review telemetry history logs stored in MongoDB</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-danger small" style={{ width: 'auto', height: '36px' }} onClick={clearDatabaseLogs}>Clear database logs</button>
              </div>
            </header>

            <div className="db-layout-container">

              {/* Database status widget */}
              <div className="glass-card db-status-card" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '11px', color: 'var(--accent-pink)', marginBottom: '5px' }}>MERN database state</h4>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: dbStatus.mongodb === 'CONNECTED' ? '#00ff66' : '#ff9900' }}>
                      {dbStatus.mongodb === 'CONNECTED' ? '🟢 MONGODB CONNECTED' : '🟡 MEMORY LOGGER FALLBACK'}
                    </span>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '10px' }}>MongoDB connection URL</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={dbUriInput}
                        onChange={(e) => setDbUriInput(e.target.value)}
                        style={{ fontSize: '11px', padding: '6px 10px', height: '28px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '4px' }}
                      />
                      <button
                        className="btn btn-secondary"
                        style={{ height: '28px', minWidth: 'auto', padding: '0 10px', fontSize: '11px' }}
                        onClick={triggerDbReconnect}
                        disabled={isReconnectingDb}
                      >
                        {isReconnectingDb ? '...' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ height: '30px', minWidth: 'auto', padding: '0 12px', fontSize: '11px', border: '1px dashed var(--accent-pink)' }}
                      onClick={async () => {
                        const randomRecord = {
                          pcbNumber: "PCB-TEST-" + Math.floor(Math.random() * 1000),
                          connectionType: "tcp",
                          target: "192.168.1.100:9000",
                          imei: "86673808" + Math.floor(1000000 + Math.random() * 9000000),
                          mac: "DE:AD:BE:EF:00:" + Math.floor(10 + Math.random() * 89),
                          password: "admin_secure_gate",
                          routerSSID: "Test_SSID",
                          routerPassword: "test_password",
                          telemetryInterval: 1500,
                          rs232Status: "OK",
                          rs485Status: "WAITING",
                          gprsStatus: "OK",
                          rs232Log: "RS232 connection loopback verified.",
                          rs485Log: "Awaiting peripheral query response.",
                          gprsLog: "Modem registered on network."
                        };
                        try {
                          const res = await ipcRenderer.invoke('db-manual-insert', randomRecord);
                          if (res.success) {
                            alert('Successfully manually inserted telemetry snapshot record!');
                            // Refresh db history
                            ipcRenderer.send('reconnect-database', { uri: dbUriInput });
                          } else {
                            alert('Insertion failed: ' + res.error);
                          }
                        } catch (e) {
                          alert('Error calling manual insert: ' + e.message);
                        }
                      }}
                    >
                      ➕ Manual Insert Test
                    </button>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                      Logs: {dbHistory.length} logs
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
                    <div className="db-table-header" style={{ display: 'grid', gridTemplateColumns: '140px 140px 140px 140px 85px 85px 85px 1fr', padding: '15px 20px', borderBottom: '1px solid var(--glass-border)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-pink)' }}>
                      <span>Timestamp</span>
                      <span>IMEI</span>
                      <span>PCB Number</span>
                      <span>Link Target</span>
                      <span>RS232</span>
                      <span>RS485</span>
                      <span>GPRS</span>
                      <span style={{ textAlign: 'right' }}>Details</span>
                    </div>

                    <div className="db-table-body" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                      {dbHistory.map((record) => {
                        const isExpanded = expandedLogId === record._id || expandedLogId === record.timestamp;
                        const recordId = record._id || record.timestamp;

                        return (
                          <div key={recordId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 140px 140px 85px 85px 85px 1fr', padding: '12px 20px', fontSize: '12.5px', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(record.timestamp).toLocaleTimeString()}</span>
                              <span style={{ fontWeight: 'bold' }}>{record.imei || '--'}</span>
                              <span style={{ color: 'var(--text-dim)' }}>{record.pcbNumber || '--'}</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.target || '--'}</span>
                              <span>
                                <span className={`status-tag ${record.rs232Status === 'OK' ? 'ok' : record.rs232Status === 'ERROR' ? 'err' : 'wait'}`}>
                                  {record.rs232Status || 'WAITING'}
                                </span>
                              </span>
                              <span>
                                <span className={`status-tag ${record.rs485Status === 'OK' ? 'ok' : record.rs485Status === 'ERROR' ? 'err' : 'wait'}`}>
                                  {record.rs485Status || 'WAITING'}
                                </span>
                              </span>
                              <span>
                                <span className={`status-tag ${record.gprsStatus === 'OK' ? 'ok' : record.gprsStatus === 'ERROR' ? 'err' : 'wait'}`}>
                                  {record.gprsStatus || 'WAITING'}
                                </span>
                              </span>
                              <button className="btn btn-secondary small-btn" style={{ marginLeft: 'auto', minWidth: '70px', padding: '4px' }} onClick={() => setExpandedLogId(isExpanded ? null : recordId)}>
                                {isExpanded ? 'Hide' : 'Expand'}
                              </button>
                            </div>

                            {isExpanded && (
                              <div style={{ padding: '20px 25px', background: 'rgba(3, 0, 10, 0.5)', borderTop: '1px dashed var(--glass-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                                  <div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>Device Profile</div>
                                    <div style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                                      <div><strong>IMEI ID:</strong> {record.imei || 'N/A'}</div>
                                      <div><strong>MAC Address:</strong> {record.mac || 'N/A'}</div>
                                      <div><strong>PCB Serial:</strong> {record.pcbNumber || 'N/A'}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>Network Link</div>
                                    <div style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                                      <div><strong>Interface:</strong> {(record.connectionType || 'tcp').toUpperCase()}</div>
                                      <div><strong>Connection Target:</strong> {record.target || 'N/A'}</div>
                                      <div><strong>Telemetry Interval:</strong> {record.telemetryInterval || 1500} ms</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>WIFI Configurations</div>
                                    <div style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                                      <div><strong>Router SSID:</strong> {record.routerSSID || 'N/A'}</div>
                                      <div><strong>Router Password:</strong> {record.routerPassword ? '••••••••' : 'N/A'}</div>
                                      <div><strong>Gateway Credentials:</strong> {record.password || 'admin_secure_gate'}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>Peripherals Status</div>
                                    <div style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                                      <div><strong>RS232 Channel:</strong> <span style={{ color: record.rs232Status === 'OK' ? '#00ff66' : record.rs232Status === 'ERROR' ? '#ff3366' : record.rs232Status === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.rs232Status || 'WAITING'}</span></div>
                                      <div><strong>RS485 Channel:</strong> <span style={{ color: record.rs485Status === 'OK' ? '#00ff66' : record.rs485Status === 'ERROR' ? '#ff3366' : record.rs485Status === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.rs485Status || 'WAITING'}</span></div>
                                      <div><strong>GPRS Cell Modem:</strong> <span style={{ color: record.gprsStatus === 'OK' ? '#00ff66' : record.gprsStatus === 'ERROR' ? '#ff3366' : record.gprsStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.gprsStatus || 'WAITING'}</span></div>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                                  <div>
                                    <div style={{ fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>RS232 Log</div>
                                    <pre style={{ margin: 0, padding: '8px', background: '#040209', borderRadius: '4px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: '#00ffcc', textAlign: 'left' }}>
                                      {record.rs232Log || 'No RS232 transmission log stored.'}
                                    </pre>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>RS485 Log</div>
                                    <pre style={{ margin: 0, padding: '8px', background: '#040209', borderRadius: '4px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: '#00ffcc', textAlign: 'left' }}>
                                      {record.rs485Log || 'No RS485 transmission log stored.'}
                                    </pre>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>GPRS Modem Log</div>
                                    <pre style={{ margin: 0, padding: '8px', background: '#040209', borderRadius: '4px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', color: '#00ffcc', textAlign: 'left' }}>
                                      {record.gprsLog || 'No GPRS AT-command log stored.'}
                                    </pre>
                                  </div>
                                </div>
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

          {/* ================= VIEW: DEVICE REGISTRY (PROMOTED) ================= */}
          <section id="page-device-registry" className={`page-view ${activeTab === 'page-device-registry' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Device Configuration Registry</h1>
                <p>Register and manage configurations associated with specific device IMEI identifiers</p>
              </div>
            </header>

            <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              {/* Registry Form */}
              <div className="glass-card">
                <h3><span className="icon">📝</span> Register Device Config</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Register or modify settings associated with a specific device IMEI ID. Settings automatically sync upon connection.
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
                    <label>Device Number (Manual Allocation) *</label>
                    <input
                      type="number"
                      value={regDeviceNumber}
                      onChange={(e) => setRegDeviceNumber(e.target.value)}
                      placeholder="e.g. 1"
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
                          <th style={{ padding: '8px' }}>Device #</th>
                          <th style={{ padding: '8px' }}>IMEI / PCB Serial</th>
                          <th style={{ padding: '8px' }}>Password</th>
                          <th style={{ padding: '8px' }}>SSID Target</th>
                          <th style={{ padding: '8px' }}>Rate Interval</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...registeredDevices].sort((a, b) => (a.deviceNumber || 0) - (b.deviceNumber || 0)).map((dev) => (
                          <tr key={dev._id || dev.imei} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e0e0f0' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                              #{dev.deviceNumber || '1'}
                            </td>
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
                                    setRegDeviceNumber(String(dev.deviceNumber || 1));
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

          {/* ================= VIEW 5: SECURITY & SYSTEM CONFIGURATION ================= */}
          <section id="page-security" className={`page-view ${activeTab === 'page-security' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Security & System Configuration</h1>
                <p>Configure dynamic SCADA provisioning, identity credentials, WiFi router, and local filesystems</p>
              </div>
            </header>

            {/* Top Grid: Auto SCADA Downloader & Verification Stepper */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>

              {/* Auto SCADA Downloader Form */}
              <div className="glass-card" style={{
                transition: 'all 0.5s ease',
                borderColor: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '#00ff66' : 'var(--glass-border)',
                boxShadow: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '0 0 25px rgba(0, 255, 100, 0.25)' : 'var(--glow-theme)'
              }}>
                <h3><span className="icon">⚡</span> Auto Certificate Download & Provisioning</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Download AWS IoT certificates directly from the SCADA API based on IMEI & Password.
                </p>

                <div className="input-group">
                  <label>Storage Target Option</label>
                  <select
                    value={certTarget}
                    onChange={(e) => setCertTarget(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                  >
                    <option value="esp32">1. Store into ESP32 SPIFFS + co-processor sync</option>
                    <option value="qcom">2. Store directly to QCOM co-processor</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="input-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Device IMEI ID</label>
                      <button
                        className="btn-link"
                        style={{ fontSize: '10px', padding: 0, height: 'auto', border: 'none', background: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', outline: 'none' }}
                        onClick={() => sendControlCommand('FETCH_IMEI')}
                        disabled={controlsDisabled}
                        title="Fetch IMEI from GPRS modem using AT+CGSN"
                        type="button"
                      >
                        Fetch (AT+CGSN)
                      </button>
                    </div>
                    <input
                      type="text"
                      value={imeiProvisionInput}
                      onChange={(e) => setImeiProvisionInput(e.target.value)}
                      placeholder="e.g. 866738083623502"
                    />
                  </div>
                  <div className="input-group">
                    <label>SCADA Password</label>
                    <input
                      type="password"
                      value={passwordProvisionInput}
                      onChange={(e) => setPasswordProvisionInput(e.target.value)}
                      placeholder="User Password"
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>ESP32 Gateway IP Address</label>
                  <input
                    type="text"
                    value={gatewayIpProvisionInput}
                    onChange={(e) => setGatewayIpProvisionInput(e.target.value)}
                    placeholder="e.g. 192.168.0.1"
                  />
                </div>

                {/* Nested URL Templates Configuration Block */}
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--accent-pink)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>URL Template Patterns</h4>
                  
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Root CA Certificate URL Template</label>
                    <input
                      type="text"
                      value={certRootCaUrl}
                      onChange={(e) => setCertRootCaUrl(e.target.value)}
                      placeholder="Template URL"
                      disabled={isDownloadingCerts || isProvisioning}
                      style={{ fontSize: '11px', padding: '8px' }}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Device Certificate URL Template</label>
                    <input
                      type="text"
                      value={certDeviceCertUrl}
                      onChange={(e) => setCertDeviceCertUrl(e.target.value)}
                      placeholder="Template URL"
                      disabled={isDownloadingCerts || isProvisioning}
                      style={{ fontSize: '11px', padding: '8px' }}
                    />
                  </div>
                  <div className="input-group" style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Private Key URL Template</label>
                    <input
                      type="text"
                      value={certPrivateKeyUrl}
                      onChange={(e) => setCertPrivateKeyUrl(e.target.value)}
                      placeholder="Template URL"
                      disabled={isDownloadingCerts || isProvisioning}
                      style={{ fontSize: '11px', padding: '8px' }}
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={triggerCertificateProvision}
                  disabled={isProvisioning || isDownloadingCerts}
                  style={{ marginTop: '15px', width: '100%', height: '42px', background: (certStatuses['aws_root_ca.pem'] === 'success' && certStatuses['device_cert.crt'] === 'success' && certStatuses['private_key.key'] === 'success') ? '#00cc55' : 'var(--accent-primary)' }}
                >
                  {isDownloadingCerts ? 'Processing Provisioning...' : 'Start Secure Provisioning'}
                </button>

                {/* Provisioning Live Terminal Box */}
                <div style={{ marginTop: '15px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 'bold', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📟 Live Provisioning Terminal:
                  </span>
                  <div style={{
                    height: '140px',
                    background: '#04020a',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '12px',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    textAlign: 'left'
                  }}>
                    {provisioningLogs.length === 0 ? (
                      <span style={{ color: '#505070', fontStyle: 'italic' }}>Terminal idle. Fill forms and press provisioning to start.</span>
                    ) : (
                      provisioningLogs.map((log, idx) => {
                        let color = '#fff';
                        if (log.includes('SUCCESS') || log.includes('successfully') || log.includes('inserted')) color = '#00ff66';
                        else if (log.includes('ERROR') || log.includes('failed')) color = '#ff3366';
                        else if (log.includes('Starting') || log.includes('Initiating')) color = '#00ffff';
                        return (
                          <div key={idx} style={{ color, marginBottom: '4px', lineHeight: '1.4' }}>
                            {log}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Provisioning Verification Stepper */}
              <div className="glass-card">
                <h3><span className="icon">🛡️</span> Provisioning Verification Steps</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Real-time status updates and X.509 signature metadata parsed upon successful download.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                  {/* Step 1: Download CA Certificate */}
                  {(() => {
                    const status = certStatuses['aws_root_ca.pem'] === 'downloading' ? 'running' :
                                   (certStatuses['aws_root_ca.pem'] === 'downloaded' || certStatuses['aws_root_ca.pem'] === 'uploading' || certStatuses['aws_root_ca.pem'] === 'success') ? 'success' :
                                   certStatuses['aws_root_ca.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Download CA Certificate', 'GET certificate from root authority', status);
                  })()}

                  {/* Step 2: Download Client Certificate */}
                  {(() => {
                    const status = certStatuses['device_cert.crt'] === 'downloading' ? 'running' :
                                   (certStatuses['device_cert.crt'] === 'downloaded' || certStatuses['device_cert.crt'] === 'uploading' || certStatuses['device_cert.crt'] === 'success') ? 'success' :
                                   certStatuses['device_cert.crt'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Download Client Certificate', 'GET device-authentication certificate', status);
                  })()}

                  {/* Step 3: Download Private Key */}
                  {(() => {
                    const status = certStatuses['private_key.key'] === 'downloading' ? 'running' :
                                   (certStatuses['private_key.key'] === 'downloaded' || certStatuses['private_key.key'] === 'uploading' || certStatuses['private_key.key'] === 'success') ? 'success' :
                                   certStatuses['private_key.key'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Download Private Key', 'GET device private RSA/ECC key', status);
                  })()}

                  {/* Step 4: Upload CA to Device */}
                  {(() => {
                    const status = certStatuses['aws_root_ca.pem'] === 'uploading' ? 'running' :
                                   certStatuses['aws_root_ca.pem'] === 'success' ? 'success' :
                                   certStatuses['aws_root_ca.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Upload CA to Device', 'POST CA file with Bearer Authorization', status);
                  })()}

                  {/* Step 5: Upload Cert to Device */}
                  {(() => {
                    const status = certStatuses['device_cert.crt'] === 'uploading' ? 'running' :
                                   certStatuses['device_cert.crt'] === 'success' ? 'success' :
                                   certStatuses['device_cert.crt'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Upload Cert to Device', 'POST Client cert with Bearer Authorization', status);
                  })()}

                  {/* Step 6: Upload Key to Device */}
                  {(() => {
                    const status = certStatuses['private_key.key'] === 'uploading' ? 'running' :
                                   certStatuses['private_key.key'] === 'success' ? 'success' :
                                   certStatuses['private_key.key'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Upload Key to Device', 'POST Private key with Bearer Authorization', status);
                  })()}

                  {/* Step 7: Acknowledgement Signal */}
                  {(() => {
                    const allSuccess = certStatuses['aws_root_ca.pem'] === 'success' &&
                                       certStatuses['device_cert.crt'] === 'success' &&
                                       certStatuses['private_key.key'] === 'success';
                    const anyFailed = certStatuses['aws_root_ca.pem'] === 'failed' ||
                                      certStatuses['device_cert.crt'] === 'failed' ||
                                      certStatuses['private_key.key'] === 'failed';
                    const status = allSuccess ? 'success' :
                                   anyFailed ? 'failed' :
                                   (isDownloadingCerts || isProvisioning) ? 'running' : 'pending';
                    return renderPipelineStep('Acknowledgement Signal', 'Send completion confirmation status', status);
                  })()}
                </div>
              </div>

            </div>

            {/* Middle Grid: WiFi settings and Storage manager */}
            <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', marginTop: '20px' }}>

              {/* WiFi Router Credentials Configuration Card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3><span className="icon">📶</span> WiFi Router Credentials</h3>
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
                  style={{ marginTop: 'auto', width: '100%', height: '40px' }}
                >
                  Apply & Reboot Gateway
                </button>
              </div>

              {/* SPIFFS & QCOM Certificates Manager Card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3><span className="icon">💾</span> SPIFFS & QCOM Certificates Manager</h3>
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
                      input.accept = '.pem,.crt,.key,.json';
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
                    borderColor: (isCertUploading || isUploadingUuid) ? 'var(--accent-blue)' : '',
                    opacity: (connection.type && connection.type !== 'failed') ? 1 : 0.5,
                    cursor: (connection.type && connection.type !== 'failed') ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div className="drop-icon" style={{ fontSize: '24px', marginBottom: '8px' }}>&#128228;</div>
                  <h4 style={{ fontSize: '13px' }}>Drag & Drop Certificate or JSON config here</h4>
                  <p style={{ fontSize: '11px' }}>Supports .pem, .crt, .key, .json formats</p>
                </div>

                {/* UUID Token Input Area */}
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '15px' }}>
                  <label className="control-title" style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>UUID Token Input</label>
                  <p style={{ fontSize: '10.5px', color: 'var(--text-dim)', marginTop: '4px', marginBottom: '10px' }}>
                    Type a token below before selecting/dropping <code>uuid.json</code> to dynamically inject it.
                  </p>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <input
                      type="text"
                      value={uuidToken}
                      onChange={(e) => setUuidToken(e.target.value)}
                      placeholder="Enter token to inject (e.g. secure_client_token)"
                      style={{ fontSize: '12px', padding: '8px' }}
                    />
                  </div>
                </div>

                {/* Uploading progress indicator */}
                {(isCertUploading || isUploadingUuid) && (
                  <div className="ota-progress-pane" style={{ marginTop: '15px' }}>
                    <div className="progress-details">
                      <span className="progress-status" style={{ fontSize: '12px' }}>
                        {isUploadingUuid ? 'Syncing uuid.json to ESP32 SPIFFS...' : 'Syncing to ESP32 SPIFFS & QCOM...'}
                      </span>
                      <span className="progress-percent" style={{ fontSize: '12px' }}>{certUploadProgress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${certUploadProgress}%`, background: 'var(--grad-emerald-cyan)' }}></div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Bottom Section: MERN history audit logs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '10px' }}>
              <div className="glass-card">
                <h3><span className="icon">🛡️</span> Certificate Provisioning History Audit Logs</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Review database logs tracking successful/failed AWS IoT credentials synchronization:
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

          {/* ================= VIEW 4: DEBUG LOGS ================= */}
          <section id="page-console" className={`page-view ${activeTab === 'page-console' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Engineering Debug Console</h1>
                <p>Diagnostic logging stream monitoring active serial interfaces and raw socket frames</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary small" style={{ width: 'auto' }} onClick={handleSaveConsoleLogs}>Export Logs</button>
                <button className="btn btn-danger small" style={{ width: 'auto' }} onClick={() => setConsoleLogs([])}>Clear Terminal</button>
              </div>
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

          {/* ================= VIEW: CIRCUIT SCHEMATICS & SUPPORT ================= */}
          <section id="page-circuit" className={`page-view ${activeTab === 'page-circuit' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Circuit Schematics & Support Help Desk</h1>
                <p>Verify physical pinouts, debugger connections, and access common troubleshooting guides</p>
              </div>
            </header>

            <div className="hardware-spec-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>

              {/* Wiring schematic layout visualizer */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3><span className="icon">🔌</span> ESP32 & Debugger Wiring Interface</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Live visual flow of the ESP32 Gateway connecting to the serial programmer / debugger module.
                </p>

                {/* Visual block diagram */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030107', padding: '25px', borderRadius: '8px', border: '1px solid var(--glass-border)', position: 'relative' }}>

                  {/* Debugger Block */}
                  <div style={{ width: '130px', padding: '15px', background: 'linear-gradient(135deg, rgba(112, 0, 255, 0.1) 0%, rgba(0, 198, 255, 0.1) 100%)', border: '1px solid #00c6ff', borderRadius: '8px', textAlign: 'center', boxShadow: '0 0 15px rgba(0, 198, 255, 0.15)' }}>
                    <div style={{ fontSize: '11px', color: '#00c6ff', fontWeight: 'bold', textTransform: 'uppercase' }}>Debugger / Programmer</div>
                    <div style={{ fontSize: '18px', margin: '8px 0' }}>🖲️</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>CH340 / CP2102</div>
                    <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', marginTop: '8px', paddingTop: '8px', fontSize: '9px', textAlign: 'left', fontFamily: 'monospace', lineHeight: '1.4' }}>
                      • TXD (OUT)<br />
                      • RXD (IN)<br />
                      • DTR (RST)<br />
                      • RTS (BOOT)<br />
                      • 3V3 / GND
                    </div>
                  </div>

                  {/* Wiring Lines */}
                  <div style={{ flex: 1, height: '140px', position: 'relative', margin: '0 15px' }}>
                    {/* Line TX -> RX */}
                    <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, #00c6ff, #00ff88)', boxShadow: '0 0 6px #00ff88' }}>
                      <span style={{ position: 'absolute', top: '-10px', left: '40%', fontSize: '8px', color: '#00ff88', fontFamily: 'monospace' }}>TXD ➔ RX0 (GPIO3)</span>
                    </div>
                    {/* Line RX -> TX */}
                    <div style={{ position: 'absolute', top: '40px', left: 0, right: 0, height: '2px', background: 'linear-gradient(to left, #ff007f, #00c6ff)', boxShadow: '0 0 6px #ff007f' }}>
                      <span style={{ position: 'absolute', top: '-10px', left: '40%', fontSize: '8px', color: '#ff007f', fontFamily: 'monospace' }}>RXD ⮠ TX0 (GPIO1)</span>
                    </div>
                    {/* Line DTR -> RST (EN) */}
                    <div style={{ position: 'absolute', top: '65px', left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, #7000ff, #fff)', opacity: 0.8 }}>
                      <span style={{ position: 'absolute', top: '-10px', left: '40%', fontSize: '8px', color: '#b070ff', fontFamily: 'monospace' }}>DTR ➔ EN (CHIP_PU)</span>
                    </div>
                    {/* Line RTS -> BOOT */}
                    <div style={{ position: 'absolute', top: '90px', left: 0, right: 0, height: '2px', background: 'linear-gradient(to right, #7000ff, #fff)', opacity: 0.8 }}>
                      <span style={{ position: 'absolute', top: '-10px', left: '40%', fontSize: '8px', color: '#b070ff', fontFamily: 'monospace' }}>RTS ➔ BOOT (GPIO0)</span>
                    </div>
                    {/* Line Power */}
                    <div style={{ position: 'absolute', top: '115px', left: 0, right: 0, height: '2px', background: '#e11d48', opacity: 0.5 }}>
                      <span style={{ position: 'absolute', top: '-10px', left: '45%', fontSize: '8px', color: '#ff4d6a', fontFamily: 'monospace' }}>3V3 & GND Links</span>
                    </div>
                  </div>

                  {/* ESP32 Block */}
                  <div style={{ width: '130px', padding: '15px', background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 198, 255, 0.1) 100%)', border: '1px solid #00ff88', borderRadius: '8px', textAlign: 'center', boxShadow: '0 0 15px rgba(0, 255, 136, 0.15)' }}>
                    <div style={{ fontSize: '11px', color: '#00ff88', fontWeight: 'bold', textTransform: 'uppercase' }}>ESP32-S3 Board</div>
                    <div style={{ fontSize: '18px', margin: '8px 0' }}>📟</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>Dual-Core LX7</div>
                    <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', marginTop: '8px', paddingTop: '8px', fontSize: '9px', textAlign: 'left', fontFamily: 'monospace', lineHeight: '1.4' }}>
                      • RX0 (GPIO3)<br />
                      • TX0 (GPIO1)<br />
                      • EN Pin (Reset)<br />
                      • IO0 (Boot Select)<br />
                      • 3.3V / GND
                    </div>
                  </div>

                </div>

                {/* Pin configurations table */}
                <h4 style={{ marginTop: '25px', color: '#fff', fontSize: '13px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>📌 ESP32 Peripheral GPIO Reference Table</h4>
                <div style={{ overflowX: 'auto', marginTop: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left', fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--glass-border)', color: '#8080a0' }}>
                        <th style={{ padding: '6px' }}>Interface / Peripheral</th>
                        <th style={{ padding: '6px' }}>GPIO Pin</th>
                        <th style={{ padding: '6px' }}>Logic State / Mode Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#00ffcc', fontWeight: 'bold' }}>Mode Select A0_1</td>
                        <td style={{ padding: '6px' }}>GPIO 36</td>
                        <td style={{ padding: '6px' }}>HIGH: RS232 Mode, LOW: RS485 Mode</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#00ffcc', fontWeight: 'bold' }}>Mode Select A1_1</td>
                        <td style={{ padding: '6px' }}>GPIO 37</td>
                        <td style={{ padding: '6px' }}>HIGH: RS232 Mode, LOW: RS485 Mode</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#00ffcc', fontWeight: 'bold' }}>Tester Switch (SW)</td>
                        <td style={{ padding: '6px' }}>GPIO 38</td>
                        <td style={{ padding: '6px' }}>Input Pull-Up (Active LOW) self-diagnostics button</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#ffb03b', fontWeight: 'bold' }}>GSM Enable / PWRKEY</td>
                        <td style={{ padding: '6px' }}>GPIO 21 / 5</td>
                        <td style={{ padding: '6px' }}>GSM power supply enable (EN) and pulse trigger key</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#9d4edd', fontWeight: 'bold' }}>SPI Flash Winbond CS</td>
                        <td style={{ padding: '6px' }}>GPIO 10</td>
                        <td style={{ padding: '6px' }}>Winbond SPI Flash Chip Select line</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#b070ff', fontWeight: 'bold' }}>I2C RTC SDA / SCL</td>
                        <td style={{ padding: '6px' }}>GPIO 33 / 32</td>
                        <td style={{ padding: '6px' }}>DS3231 RTC Module channels (Fallback: 22 / 23)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)' }}>
                        <td style={{ padding: '6px', color: '#00e676', fontWeight: 'bold' }}>Digital Inputs (1-4)</td>
                        <td style={{ padding: '6px' }}>GPIO 39-42</td>
                        <td style={{ padding: '6px' }}>Active-HIGH Optocoupler inputs (DI1, DI2, DI3, DI4)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Help Desk troubleshooting area */}
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3><span className="icon">🙋</span> Help Desk Support & FAQs</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Resolve common MERN system configuration issues and firmware diagnostics errors.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ff7300' }}>⚠️ MongoDB Invalid Namespace Error</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Cause:</strong> Specifying duplicate segments in the URI (e.g. `/dbname/dbname`).<br />
                      <strong>Solution:</strong> The system automatically sanitizes namespaces to a single segment (e.g. `/dbname`). Check the MongoDB URL configuration inside Settings.
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ff7300' }}>🔌 COM Port Not Listing or Offline</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Cause:</strong> Missing CH340 / CP210x serial drivers on the PC, or loose USB-C connections.<br />
                      <strong>Solution:</strong> Double-check the cable, verify standard serial drivers are installed, and click the refresh (↺) button to re-scan hardware ports.
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ff7300' }}>⚡ GPRS speed set 1 Mbps Mismatch</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Cause:</strong> Cellular modem failed to store `AT+IPR=1000000` or returned an error response.<br />
                      <strong>Solution:</strong> Send `GPRS_SPEED` via the dashboard to view detailed TX/RX command logs and verify cellular connection signals.
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '6px', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ff7300' }}>🌐 Wireless OTA Port 500 Failure</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>
                      <strong>Cause:</strong> OS restricted ports below 1024 to Administrator processes.<br />
                      <strong>Solution:</strong> The desktop app fails over to local port 5000 automatically. The ESP32 listens on port 500, and is triggered by the dashboard. Ensure the firewall is open for local UDP/TCP traffic.
                    </div>
                  </div>

                </div>
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
                    <span className="spec-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {imei}
                      <button
                        className="btn btn-accent small"
                        style={{ padding: '2px 8px', fontSize: '10px', height: '20px', margin: 0, width: 'auto', minWidth: 'auto', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => sendControlCommand('FETCH_IMEI')}
                        disabled={controlsDisabled}
                        title="Fetch IMEI from GPRS modem using AT+CGSN"
                      >
                        Fetch (AT+CGSN)
                      </button>
                    </span>
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
                    <span className="spec-value">192.168.0.1</span>
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

                <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '20px', marginTop: '20px' }}>
                  {/* Left Column: 8 standard checklist items */}
                  <div className="diag-checklist" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    {Object.keys(diagnostics).filter(key => key !== 'di').map(key => (
                      <div key={key} className={`diag-item ${diagnostics[key] === 'OK' ? 'success' : diagnostics[key] === 'ERROR' ? 'error' : diagnostics[key] === 'TESTING' ? 'warning' : ''}`} style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <div className="diag-indicator" style={{ marginRight: '8px' }}></div>
                          <div className="diag-label" style={{ flex: 1 }}>{key.toUpperCase()}</div>
                          <div className="diag-value">{diagnostics[key]}</div>
                        </div>
                        {key === 'gprs' && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px', width: '100%', display: 'flex', gap: '8px' }}>
                            <button
                              className="btn btn-accent small"
                              style={{ padding: '4px 10px', fontSize: '9px', height: '24px', flex: 1, cursor: 'pointer', margin: 0 }}
                              onClick={() => sendControlCommand('GPRS_SPEED')}
                              title="Sends AT+IPR=1000000;&W to set modem speed to 1 Mbps"
                            >
                              ⚡ Set 1 Mbps
                            </button>
                            <button
                              className="btn btn-secondary small"
                              style={{ padding: '4px 10px', fontSize: '9px', height: '24px', flex: 1, cursor: 'pointer', margin: 0, border: '1px solid rgba(0, 240, 255, 0.3)' }}
                              onClick={() => setShowGprsConsole(true)}
                              title="Open GPRS Modem Interactive AT Command Debug Console"
                            >
                              📟 Debug
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right Column (Last Column): DI Section with 4 simulator buttons */}
                  <div className="diag-item di-section-card" style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px', marginBottom: '10px' }}>
                      <div className="diag-indicator" style={{ marginRight: '8px' }}></div>
                      <div className="diag-label" style={{ flex: 1, fontWeight: 'bold', fontSize: '12px' }}>DI (DIGITAL INPUT)</div>
                      <div className="diag-value" style={{ fontWeight: 'bold', fontSize: '12px' }}>{diagnostics.di}</div>
                    </div>

                    <div className="di-pins-container" style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '8px',
                      width: '100%'
                    }}>
                      {[0, 1, 2, 3].map(index => {
                        const isPinShorted = diPinsSimulated[index] || diPinsHardware[index];
                        return (
                          <div key={index} className={`di-pin-item ${isPinShorted ? 'shorted' : ''}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(5, 2, 18, 0.4)',
                            border: '1px solid rgba(255, 0, 127, 0.1)',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div className="pin-indicator" style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isPinShorted ? 'var(--accent-emerald)' : 'var(--accent-red)',
                                boxShadow: isPinShorted ? '0 0 6px var(--accent-emerald)' : '0 0 6px var(--accent-red)'
                              }} />
                              <span style={{ fontSize: '11px', fontWeight: '700', color: isPinShorted ? '#fff' : 'var(--text-dim)' }}>DI {index + 1}</span>
                            </div>
                            <button
                              className={`btn ${isPinShorted ? 'btn-accent' : 'btn-secondary'} small`}
                              style={{ padding: '2px 8px', fontSize: '9px', height: '20px', minWidth: '54px', margin: 0, cursor: 'pointer', userSelect: 'none' }}
                              onMouseDown={() => handleDiPinSimChange(index, true)}
                              onMouseUp={() => handleDiPinSimChange(index, false)}
                              onMouseLeave={() => handleDiPinSimChange(index, false)}
                              onTouchStart={() => handleDiPinSimChange(index, true)}
                              onTouchEnd={() => handleDiPinSimChange(index, false)}
                            >
                              {isPinShorted ? 'Shorted' : 'Push'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="tester-switch-container" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(3, 0, 10, 0.5)',
                      border: `1px solid ${testerSwitch ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      marginTop: '10px',
                      width: '100%'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="pin-indicator" style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: testerSwitch ? 'var(--accent-emerald)' : 'var(--text-muted)',
                          boxShadow: testerSwitch ? '0 0 8px var(--accent-emerald)' : 'none'
                        }} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>Tester Switch (Pin 38)</span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: testerSwitch ? 'var(--accent-emerald)' : 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {testerSwitch ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
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
                    placeholder="mongodb+srv://yashacker:Iamyash@reactdb.d04du.mongodb.net/?appName=ReactDB"
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

              {/* App Theme & Personalization Card */}
              <div className="glass-card">
                <h3><span className="icon">🎨</span> Theme & Personalization</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Choose from curated dark modes and modern typography fonts. Changes apply instantly.
                </p>

                {/* Theme Preset Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="control-title" style={{ fontSize: '10px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold' }}>Color Theme</label>
                  <div className="theme-presets-grid">
                    <div
                      className={`theme-preset-card ${currentTheme === 'quantum-indigo' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('quantum-indigo')}
                      style={{ '--theme-card-border': '#7000ff', '--theme-card-bg-rgb': '112, 0, 255', '--theme-preview-grad': 'linear-gradient(135deg, #7000ff 0%, #00c6ff 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Quantum Indigo</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'cyber-orchid' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('cyber-orchid')}
                      style={{ '--theme-card-border': '#f953c6', '--theme-card-bg-rgb': '249, 83, 198', '--theme-preview-grad': 'linear-gradient(135deg, #f953c6 0%, #7000ff 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Cyber Orchid</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'mint-aurora' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('mint-aurora')}
                      style={{ '--theme-card-border': '#00e676', '--theme-card-bg-rgb': '0, 230, 118', '--theme-preview-grad': 'linear-gradient(135deg, #00e676 0%, #00c6ff 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Mint Aurora</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'solar-flare' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('solar-flare')}
                      style={{ '--theme-card-border': '#ff7300', '--theme-card-bg-rgb': '255, 115, 0', '--theme-preview-grad': 'linear-gradient(135deg, #ff7300 0%, #f953c6 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Solar Flare</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'minecraft' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('minecraft')}
                      style={{ '--theme-card-border': '#5b8731', '--theme-card-bg-rgb': '91, 135, 49', '--theme-preview-grad': 'linear-gradient(135deg, #5b8731 0%, #866043 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Minecraft Edition</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'cherry-grove' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('cherry-grove')}
                      style={{ '--theme-card-border': '#ff8da1', '--theme-card-bg-rgb': '255, 141, 161', '--theme-preview-grad': 'linear-gradient(135deg, #ff8da1 0%, #3a222d 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Cherry Grove Edition</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'deep-sea-ocean' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('deep-sea-ocean', triggerOceanAnimation)}
                      style={{ '--theme-card-border': '#0d9488', '--theme-card-bg-rgb': '13, 148, 136', '--theme-preview-grad': 'linear-gradient(135deg, #060e17 0%, #0d9488 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Deep Sea Ocean</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'hacking' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('hacking', triggerHackerAnimation)}
                      style={{ '--theme-card-border': '#00ff00', '--theme-card-bg-rgb': '0, 255, 0', '--theme-preview-grad': 'linear-gradient(135deg, #020202 0%, #00ff00 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Hacking Edition</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'mojang-studios' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('mojang-studios')}
                      style={{ '--theme-card-border': '#ef323d', '--theme-card-bg-rgb': '239, 50, 61', '--theme-preview-grad': 'linear-gradient(135deg, #ef323d 0%, #000 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Mojang Studios</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'star-nova' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('star-nova')}
                      style={{ '--theme-card-border': '#fef3c7', '--theme-card-bg-rgb': '254, 243, 199', '--theme-preview-grad': 'linear-gradient(135deg, #0f172a 0%, #fef3c7 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Star Nova</span>
                    </div>

                    <div
                      className={`theme-preset-card ${currentTheme === 'cyber-sunset' ? 'active' : ''}`}
                      onClick={() => changeThemeWithTransition('cyber-sunset')}
                      style={{ '--theme-card-border': '#ec4899', '--theme-card-bg-rgb': '236, 72, 153', '--theme-preview-grad': 'linear-gradient(135deg, #ec4899 0%, #eab308 100%)' }}
                    >
                      <div className="theme-preview-bar"></div>
                      <span className="theme-preset-name">Cyber Sunset</span>
                    </div>
                  </div>
                </div>

                {/* Font Preset Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="control-title" style={{ fontSize: '10px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold' }}>Typography Font</label>
                  <div className="font-presets-grid">
                    <div className={`font-preset-card ${currentFont === 'outfit' ? 'active' : ''}`} onClick={() => setCurrentFont('outfit')} style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Outfit Sans
                    </div>
                    <div className={`font-preset-card ${currentFont === 'mono' ? 'active' : ''}`} onClick={() => setCurrentFont('mono')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                      JB Mono
                    </div>
                    <div className={`font-preset-card ${currentFont === 'space' ? 'active' : ''}`} onClick={() => setCurrentFont('space')} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Space Grotesk
                    </div>
                  </div>
                </div>

                {/* GitHub Authentication Integration */}
                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                  <label className="control-title" style={{ fontSize: '10px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold' }}>GitHub Cloud Workspace</label>
                  {gitHubUser ? (
                    <div className="github-widget" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                      <div className="github-avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundImage: `url(${gitHubUser.avatarUrl})`, backgroundSize: 'cover' }}></div>
                      <div className="github-info" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <span className="github-username" style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>@{gitHubUser.username}</span>
                        <span className="github-status" style={{ fontSize: '10px', color: 'var(--accent-emerald)' }}>Workspace Sync Active</span>
                      </div>
                      <button className="btn btn-secondary small" style={{ margin: 0, padding: '4px 10px', fontSize: '10px', height: '24px', minWidth: 'auto', background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366' }} onClick={handleGitHubSignIn}>
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '10px' }}>
                      <button className="btn btn-secondary" onClick={handleGitHubSignIn} style={{ width: '100%', margin: 0, gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                        Sign in via Window (OAuth Portal)
                      </button>
                      <button className="btn btn-secondary" onClick={handleGitHubCopyLink} style={{ width: '100%', margin: 0, gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}>
                        🔗 Copy Auth Link to Browser
                      </button>
                    </div>
                  )}
                </div>
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
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    localStorage.removeItem('isLoggedIn');
                    setIsLoggedIn(false);
                    alert('Logged out successfully!');
                  }}
                  style={{ marginTop: '10px', width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}
                >
                  🔒 Log Out Admin Session
                </button>
              </div>

              {/* GitHub OAuth Credentials Card */}
              <div className="glass-card">
                <h3><span className="icon">🐙</span> GitHub OAuth Integration</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Register a GitHub OAuth Application and configure credentials to enable secure administrator sign-in.
                </p>
                <div className="input-group">
                  <label>GitHub Client ID</label>
                  <input
                    type="text"
                    value={githubClientIdInput}
                    onChange={(e) => setGithubClientIdInput(e.target.value)}
                    placeholder="Enter Client ID"
                  />
                </div>
                <div className="input-group">
                  <label>GitHub Client Secret</label>
                  <input
                    type="password"
                    value={githubClientSecretInput}
                    onChange={(e) => setGithubClientSecretInput(e.target.value)}
                    placeholder="Enter Client Secret"
                  />
                </div>
                <button className="btn btn-primary" onClick={saveAppConfigSettings} style={{ marginTop: '15px', width: '100%' }}>
                  Save GitHub Credentials
                </button>
                <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'left', lineHeight: '1.4' }}>
                  💡 Need help? View the configuration instructions in the <a href="#" onClick={(e) => { e.preventDefault(); alert("Please refer to Documentation/SIGN_WITH_GITHUB.md for step-by-step setup details."); }} style={{ color: 'var(--accent-pink)', textDecoration: 'underline' }}>GitHub OAuth Setup Guide</a>.
                </div>
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

      {/* Cinematic Ocean Temple Transition Animation Overlay */}
      {showOceanAnim && (
        <div className={`ocean-anim-overlay stage-${oceanAnimStage}`}>
          <div className="sky-bg">
            {/* Extremely realistic glowing sun */}
            <svg viewBox="0 0 100 100" className="sky-sun">
              <defs>
                <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="20%" stopColor="#FFF9C4" />
                  <stop offset="50%" stopColor="#FBC02D" />
                  <stop offset="75%" stopColor="#E65100" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#sunGradient)" />
              <circle cx="50" cy="50" r="28" fill="#FFFDE7" opacity="0.8" />
            </svg>

            {/* Cloud 1 */}
            <svg viewBox="0 0 100 60" className="cloud-vector c1">
              <path d="M10 45 C10 38, 18 32, 28 35 C33 26, 52 23, 62 31 C72 27, 85 32, 85 42 C92 42, 95 48, 90 53 C85 55, 15 55, 10 45 Z" fill="#FFFFFF" />
              <path d="M25 36 C30 28, 48 25, 58 33 C63 32, 70 34, 72 38 C60 30, 40 32, 25 36 Z" fill="#E0F2FE" opacity="0.75" />
            </svg>

            {/* Cloud 2 */}
            <svg viewBox="0 0 120 70" className="cloud-vector c2">
              <path d="M15 50 C15 42, 25 35, 38 38 C45 28, 68 25, 80 34 C92 30, 105 35, 105 47 C112 47, 115 54, 110 60 C105 62, 20 62, 15 50 Z" fill="#FFFFFF" />
              <path d="M35 39 C42 29, 64 26, 76 35 C82 34, 90 36, 92 40 C78 30, 52 32, 35 39 Z" fill="#E0F2FE" opacity="0.75" />
            </svg>

            {/* Cloud 3 */}
            <svg viewBox="0 0 90 50" className="cloud-vector c3">
              <path d="M8 38 C8 32, 15 27, 24 30 C28 22, 45 20, 54 26 C62 23, 72 27, 72 35 C78 35, 80 40, 76 45 C72 47, 12 47, 8 38 Z" fill="#FFFFFF" />
              <path d="M22 30 C26 23, 40 21, 48 27 C53 26, 60 28, 62 31 C50 24, 34 26, 22 30 Z" fill="#E0F2FE" opacity="0.75" />
            </svg>
          </div>

          <div className="sea-entrance-line"></div>

          <div className="water-depths">
            <div className="sun-rays"></div>
            <div className="bubble b1"></div>
            <div className="bubble b2"></div>
            <div className="bubble b3"></div>
            <div className="bubble b4"></div>
            <div className="bubble b5"></div>
          </div>

          <div className="temple-container">
            {/* Side Flora - Left side of the temple */}
            <div className="flora-left">
              <div className="kelp-plant kp-large">
                <div className="leaf lf1"></div>
                <div className="leaf lf2"></div>
                <div className="leaf lf3"></div>
              </div>
              <div className="kelp-plant kp-medium">
                <div className="leaf lf1"></div>
                <div className="leaf lf2"></div>
                <div className="leaf lf3"></div>
              </div>
              <div className="sea-flower sf-large sf1"></div>
            </div>

            <div className="temple-silhouette">
              <div className="temple-roof-decorations">
                <div className="roof-tip rt-1"></div>
                <div className="roof-tip rt-2"></div>
              </div>
              <div className="temple-roof"></div>
              <div className="temple-body">
                <div className="temple-pillars">
                  <div className="pillar p1">
                    <div className="pillar-cap"></div>
                    <div className="pillar-base"></div>
                  </div>
                  <div className="pillar p2">
                    <div className="pillar-cap"></div>
                    <div className="pillar-base"></div>
                  </div>
                </div>
                <div className="temple-lantern tl1"><div className="glow"></div></div>
                <div className="temple-lantern tl2"><div className="glow"></div></div>
                <div className="temple-entrance">
                  <div className="door-left">
                    <div className="door-handle"></div>
                  </div>
                  <div className="door-right">
                    <div className="door-handle"></div>
                  </div>
                  <div className="gold-glow"></div>
                </div>
              </div>
              <div className="seabed-flora">
                <div className="kelp-plant kp1">
                  <div className="leaf lf1"></div>
                  <div className="leaf lf2"></div>
                  <div className="leaf lf3"></div>
                </div>
                <div className="kelp-plant kp2">
                  <div className="leaf lf1"></div>
                  <div className="leaf lf2"></div>
                  <div className="leaf lf3"></div>
                </div>
                <div className="kelp-plant kp3">
                  <div className="leaf lf1"></div>
                  <div className="leaf lf2"></div>
                  <div className="leaf lf3"></div>
                </div>
                <div className="kelp-plant kp4">
                  <div className="leaf lf1"></div>
                  <div className="leaf lf2"></div>
                  <div className="leaf lf3"></div>
                </div>
                <div className="sea-flower sf1"></div>
                <div className="sea-flower sf2"></div>
                <div className="sea-flower sf3"></div>
                <div className="sea-flower sf4"></div>
              </div>
            </div>

            {/* Side Flora - Right side of the temple */}
            <div className="flora-right">
              <div className="kelp-plant kp-large">
                <div className="leaf lf1"></div>
                <div className="leaf lf2"></div>
                <div className="leaf lf3"></div>
              </div>
              <div className="kelp-plant kp-medium">
                <div className="leaf lf1"></div>
                <div className="leaf lf2"></div>
                <div className="leaf lf3"></div>
              </div>
              <div className="sea-flower sf-large sf2"></div>
            </div>
          </div>

          <div className="flash-screen"></div>
        </div>
      )}

      {/* Cinematic Hacking Transition Animation Overlay */}
      {currentTheme === 'star-nova' && (
        <div className="star-nova-overlay" aria-hidden="true">
          {starNovaComets.map((comet) => (
            <span
              key={`comet-${comet.id}`}
              className="star-nova-comet"
              style={{
                left: comet.left,
                top: comet.top,
                animationDuration: comet.duration,
                animationDelay: comet.delay
              }}
            />
          ))}
          {starNovaStars.map((star) => (
            <span
              key={star.id}
              className="star-nova-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDuration: star.duration,
                animationDelay: star.delay,
                opacity: star.opacity
              }}
            />
          ))}
        </div>
      )}

      {showHackingAnim && (
        <div className={`hacking-anim-overlay stage-${hackingAnimStage}`}>
          {/* Falling matrix code rain background */}
          <div className="overlay-matrix-rain">
            {Array.from({ length: 18 }).map((_, idx) => (
              <div
                key={idx}
                className="matrix-col"
                style={{
                  left: `${idx * 6}%`,
                  animationDuration: `${2.2 + Math.random() * 3}s`,
                  animationDelay: `${Math.random() * 1.5}s`
                }}
              >
                {Array.from({ length: 25 }).map(() => (Math.random() > 0.5 ? '1' : '0')).join('')}
              </div>
            ))}
          </div>

          {/* Glowing laser slithering snake path */}
          {hackingAnimStage === 'snake-slither' && (
            <svg viewBox="0 0 500 200" className="slithering-snake">
              <path
                d="M -80,100 C -30,40 20,160 70,100 C 120,40 170,160 220,100 C 270,40 320,160 370,100 C 420,40 470,160 520,100 C 570,40 620,160 680,100"
                fill="none"
                stroke="#00ff00"
                strokeWidth="4.5"
                strokeLinecap="round"
                className="slithering-snake-path"
                style={{
                  filter: 'drop-shadow(0 0 10px #00ff00) drop-shadow(0 0 20px #00ff00)'
                }}
              />
            </svg>
          )}

          {/* Authentic Kali Linux screen elements */}
          {hackingAnimStage !== 'snake-slither' && (
            <div className="kali-logo-container">
              {/* Detailed Kali Linux Dragon Tribal Logo */}
              <svg viewBox="0 0 300 200" className="kali-dragon">
                <defs>
                  <filter id="greenGlow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Tribal Dragon Body & Head */}
                <path
                  d="M 150 40 C 145 25, 130 20, 115 30 C 95 40, 90 60, 105 80 C 120 100, 130 110, 120 130 C 110 150, 80 150, 70 170 C 60 190, 85 200, 100 190 C 115 180, 130 160, 135 140 C 140 120, 135 105, 150 90 C 165 105, 160 120, 165 140 C 170 160, 185 180, 200 190 C 215 200, 240 190, 230 170 C 220 150, 190 150, 180 130 C 170 110, 180 100, 195 80 C 210 60, 205 40, 185 30 C 170 20, 155 25, 150 40 Z"
                  fill="none"
                  stroke="#00ff00"
                  strokeWidth="2.5"
                  filter="url(#greenGlow)"
                  className="dragon-wings-path"
                />

                {/* Left Tribal Wing */}
                <path
                  d="M 105 80 C 80 70, 40 80, 20 100 C 35 110, 60 110, 75 105 C 80 115, 60 130, 45 140 C 65 135, 85 125, 95 115 Z"
                  fill="none"
                  stroke="#00ff00"
                  strokeWidth="2.5"
                  filter="url(#greenGlow)"
                  className="dragon-tail-path"
                />

                {/* Right Tribal Wing */}
                <path
                  d="M 195 80 C 220 70, 260 80, 280 100 C 265 110, 240 110, 225 105 C 220 115, 240 130, 255 140 C 235 135, 215 125, 205 115 Z"
                  fill="none"
                  stroke="#00ff00"
                  strokeWidth="2.5"
                  filter="url(#greenGlow)"
                  className="dragon-head-path"
                />
              </svg>
            </div>
          )}

          {/* Quick loading logs in terminal font */}
          {hackingAnimStage === 'glitch' && (
            <div className="kali-boot-logs" style={{ position: 'absolute', bottom: '30px', left: '30px', fontFamily: 'VT323, monospace', color: '#00ff00', fontSize: '18px', textAlign: 'left', lineHeight: '1.4', opacity: 0.8 }}>
              <div>[*] INITIALIZING NETHUNTER KERNELS...</div>
              <div>[*] ROUTING KALI NETWORK SOCKETS...</div>
              <div>[*] INTRUSION DETECTION SYSTEM ACTIVE</div>
              <div>[+] PORT STATUS: SECURE (9000/TCP)</div>
            </div>
          )}
        </div>
      )}

      {showGprsConsole && (
        <div className="gprs-modal-overlay" onClick={() => setShowGprsConsole(false)}>
          <div className="gprs-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gprs-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📟</span>
                <h3 style={{ margin: 0, color: 'var(--text-white)' }}>GPRS / LTE AT Command Console</h3>
              </div>
              <button className="gprs-modal-close" onClick={() => setShowGprsConsole(false)}>&times;</button>
            </div>

            <div className="gprs-modal-body">
              <div className="gprs-modal-info">
                Sends commands to the active interface. Responses will display in the console log stream below.
              </div>

              {/* Terminal Logs View */}
              <div className="gprs-modal-terminal">
                {consoleLogs.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '10px' }}>No terminal logs available.</div>
                ) : (
                  consoleLogs.map((log, idx) => (
                    <div key={idx} className={`terminal-line ${log.type}`} style={{ fontSize: '12px', margin: '3px 0' }}>
                      [{log.time}] {log.text}
                    </div>
                  ))
                )}
                {/* Auto Scroll Anchor */}
                <div ref={(el) => { if (el) el.scrollIntoView({ behavior: 'smooth' }); }}></div>
              </div>

              {/* Quick Actions */}
              <div className="gprs-modal-actions">
                <button
                  className="btn btn-secondary small"
                  onClick={() => {
                    addLogLine('[CMD] Triggering GPRS diagnostics AT Command Check');
                    sendControlCommand('TEST_GPRS');
                  }}
                  disabled={!connection.type}
                >
                  🧪 Run GPRS AT Test
                </button>
                <button
                  className="btn btn-accent small"
                  onClick={() => {
                    addLogLine('[CMD] Setting GPRS Baudrate to 1 Mbps');
                    sendControlCommand('GPRS_SPEED');
                  }}
                  disabled={!connection.type}
                >
                  ⚡ Set 1 Mbps Speed
                </button>
                <button
                  className="btn btn-accent small"
                  onClick={() => {
                    addLogLine('[CMD] Setting GPRS Baudrate to 115200 bps');
                    sendControlCommand('GPRS_SPEED_115200');
                  }}
                  disabled={!connection.type}
                  style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}
                >
                  ⚡ Set 115200 Baud
                </button>
                <button
                  className="btn btn-primary small"
                  onClick={() => {
                    addLogLine('[CMD] Fetching IMEI via AT+CGSN');
                    sendControlCommand('FETCH_IMEI');
                  }}
                  disabled={!connection.type}
                >
                  📟 Fetch IMEI
                </button>
                <button
                  className="btn btn-secondary small"
                  onClick={() => {
                    addLogLine('[CMD] Starting Serial Passthrough Bridge');
                    sendControlCommand('SERIAL_BRIDGE');
                  }}
                  disabled={!connection.type || connection.type !== 'serial'}
                  style={{ border: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)' }}
                  title="Forward data between USB Serial and GPRS module"
                >
                  🔗 Passthrough
                </button>
                <button
                  className="btn btn-secondary small"
                  onClick={() => {
                    addLogLine('[CMD] PING');
                    sendControlCommand('PING');
                  }}
                  disabled={!connection.type}
                >
                  📡 Ping Modem
                </button>
                <button
                  className="btn btn-danger small"
                  onClick={() => setConsoleLogs([])}
                >
                  🗑️ Clear Logs
                </button>
              </div>

              {/* Input Command Area */}
              <form
                className="gprs-modal-input-group"
                onSubmit={(e) => {
                  e.preventDefault();
                  const cmd = gprsCommandInput.trim();
                  if (!cmd) return;
                  if (!connection.type) {
                    alert('No active connection. Gateway offline.');
                    return;
                  }
                  addLogLine(`[CMD] ${cmd}`);
                  sendControlCommand(cmd);
                  setGprsCommandInput('');
                }}
              >
                <input
                  type="text"
                  className="gprs-modal-input"
                  value={gprsCommandInput}
                  onChange={(e) => setGprsCommandInput(e.target.value)}
                  placeholder="Type AT or control command (e.g. AT+CSQ, PING) and press Enter..."
                  disabled={!connection.type}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: '38px', margin: 0, padding: '0 20px', minWidth: '80px' }}
                  disabled={!connection.type}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
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
