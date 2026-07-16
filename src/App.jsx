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

const parseFloat32 = (val) => {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, val);
  return view.getFloat32(0);
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
  const [diagnosticsDetails, setDiagnosticsDetails] = useState({
    rs232: '',
    rs485: '',
    gprs: '',
    bus: '',
    ap: '',
    flash: '',
    di: '',
    driver: '',
    rtc: ''
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
  const [isRegistryLocked, setIsRegistryLocked] = useState(true);
  const [editingDeviceImei, setEditingDeviceImei] = useState(null);
  // Login / Signup State
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalActiveTab, setAccountModalActiveTab] = useState('profile');
  const [copiedTextIndex, setCopiedTextIndex] = useState(null);
  const [bgVideoEnabled, setBgVideoEnabled] = useState(() => {
    const saved = localStorage.getItem('bgVideo');
    return saved !== null ? saved === 'false' : false;
  });
  const [bgVideoId, setBgVideoId] = useState(() => localStorage.getItem('bgVideoId') || 'FYH9n37B7Yw');
  const [bgVideoOpacity, setBgVideoOpacity] = useState(() => {
    const saved = localStorage.getItem('bgVideoOpacity');
    return saved !== null ? parseFloat(saved) : 0.25;
  });

  const [modbusIp, setModbusIp] = useState('192.168.4.1');
  const [modbusPort, setModbusPort] = useState('502');
  const [modbusSlaveId, setModbusSlaveId] = useState('1');
  const [modbusRegType, setModbusRegType] = useState('holding');
  const [modbusMode, setModbusMode] = useState('direct');
  const [modbusDisplay32, setModbusDisplay32] = useState(true);

  const [showGprsConsole, setShowGprsConsole] = useState(false);
  const [gprsCommandInput, setGprsCommandInput] = useState('');
  const [continuousDiagnostics, setContinuousDiagnostics] = useState(false);
  const [troubleshootLogs, setTroubleshootLogs] = useState([]);
  const [isSyncingXml, setIsSyncingXml] = useState(false);

  // Per-module diagnostics remarks (persisted in localStorage)
  const [diagnosticRemarks, setDiagnosticRemarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('diagnosticRemarks') || '{}'); } catch { return {}; }
  });

  // Device reconnect — known device banner state
  const [reconnectBanner, setReconnectBanner] = useState(null); // null | { imei, doc }

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
  const [regDeviceMode, setRegDeviceMode] = useState('solaryan inverter');
  const [regRemarks, setRegRemarks] = useState('');
  const [configSourceType, setConfigSourceType] = useState('wizard');
  const [configFileName, setConfigFileName] = useState('');
  const [configFileContent, setConfigFileContent] = useState('');
  const [modbusStartReg, setModbusStartReg] = useState(2000);
  const [modbusCount, setModbusCount] = useState(4001);
  const [modbusData, setModbusData] = useState([]);
  const [modbusData32, setModbusData32] = useState({});
  const [isReadingModbus, setIsReadingModbus] = useState(false);
  const [modbusError, setModbusError] = useState(null);

  // Inverter & Meter Partition Config States
  const [inverterMeterType, setInverterMeterType] = useState('solar_yan_inverter_single');
  const [busDataId, setBusDataId] = useState(1);
  const [busBaudRate, setBusBaudRate] = useState(9600);
  const [isUploadingConfigPartition, setIsUploadingConfigPartition] = useState(false);
  const [configPartitionProgress, setConfigPartitionProgress] = useState(0);

  // OTA Updates State
  const [otaIp, setOtaIp] = useState('192.168.0.1');
  const [otaPort, setOtaPort] = useState('500');
  const [otaAddress, setOtaAddress] = useState(''); // Optional: flash to specific address offset (standard mode)
  const [firmwareUrl, setFirmwareUrl] = useState('');
  const [otaFile, setOtaFile] = useState(null);
  const [otaProgress, setOtaProgress] = useState(null); // { status, progress, message }
  const [otaTarget, setOtaTarget] = useState('esp32'); // 'esp32' or 'qcom'
  const fileInputRef = useRef(null);
  const accountContainerRef = useRef(null);
  const accountModalRef = useRef(null);

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

  useEffect(() => {
    if (!continuousDiagnostics || !connection.type) return;
    const timer = setInterval(() => {
      // Clear status and send RE_DIAGNOSE toconnected gateway
      resetDiagnostics();
      sendControlCommand('RE_DIAGNOSE');
    }, 5000);
    return () => clearInterval(timer);
  }, [continuousDiagnostics, connection.type]);

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
  const [isFlashingUsb, setIsFlashingUsb] = useState(false);
  const [cliStatus, setCliStatus] = useState({ installed: false, version: '', checking: true });
  const [isInstallingCli, setIsInstallingCli] = useState(false);
  const [cliConsoleLogs, setCliConsoleLogs] = useState([]);
  const [arduinoFqbn, setArduinoFqbn] = useState(() => localStorage.getItem('arduino_fqbn') || 'esp32:esp32:esp32s3');
  const [gitHubRepoBranchInput, setGitHubRepoBranchInput] = useState('main');
  const [isGitHubSyncing, setIsGitHubSyncing] = useState(false);
  const [gitHubRepoUrlInput, setGitHubRepoUrlInput] = useState(() => localStorage.getItem('github_repo_url') || 'https://github.com/YashGajjar7017/IOT_Manger_System');
  const [gitHubTargetAccount, setGitHubTargetAccount] = useState('regular_update');
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [updateState, setUpdateState] = useState({
    checking: false,
    checked: false,
    hasUpdate: false,
    currentVersion: '2.1.1',
    onlineVersion: '',
    changes: '',
    downloadUrl: '',
    error: null
  });
  const [isUpdatingSoftware, setIsUpdatingSoftware] = useState(false);
  const [hwAccelInput, setHwAccelInput] = useState(true);

  // Dynamic Theme, Font, and GitHub Integration States
  // Default to the 1st theme 'quantum-indigo' on startup
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'quantum-indigo';
  });
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
    const storedVideo = localStorage.getItem('bgVideoId');
    if (storedVideo === 'CdRhCdL8_wE') {
      localStorage.removeItem('bgVideoId');
      localStorage.setItem('bgVideoEnabled', 'false');
      setBgVideoId('');
      setBgVideoEnabled(true);
    }
  }, []);

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
    'rootCA.pem': 'idle',
    'client.pem': 'idle',
    'key.pem': 'idle'
  });
  const [certDetails, setCertDetails] = useState({
    'rootCA.pem': null,
    'client.pem': null,
    'key.pem': null
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
  const [dbUriInput, setDbUriInput] = useState('mongodb://127.0.0.1:27017/IOT_Monitor_System');
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
      } else if (data.status === 'awaiting-reconnect') {
        // ESP32 dropped connection (e.g. WiFi blip / ECONNRESET) — TCP server is still listening
        setConnection({ type: 'awaiting-reconnect', target: null });
        setBootTriggerEnabled(false);
        setControlsDisabled(true);
        setPingLatency({ value: 'Reconnecting...', status: 'offline' });
        addLogLine('[TCP] ESP32 link dropped — server is listening, waiting for ESP32 to reconnect...', 'system');
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
      if (message.includes('[CERTS]') || message.includes('[PROVISION]') || message.includes('[WIFI]') || message.includes('rootCA.pem') || message.includes('client.pem') || message.includes('key.pem')) {
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

      if (payload.status === 'MODBUS_DATA') {
        setModbusData(payload.values || []);
        setIsReadingModbus(false);
        setModbusError(null);
      } else if (payload.status === 'MODBUS_ERROR') {
        setIsReadingModbus(false);
        setModbusError(payload.msg || 'Modbus communication error');
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
            let statusVal = val;
            let detailVal = '';

            if (val && typeof val === 'object') {
              statusVal = val.status;
              detailVal = val.detail || '';
            }

            const nextVal = (statusVal === 'WAITING' || statusVal === 'PENDING')
              ? 'WAITING'
              : (statusVal === true || statusVal === 'true' || statusVal === 'OK' || statusVal === 'PASSED' || statusVal === 'PASS' ? 'OK' : 'ERROR');

            if (nextVal === 'WAITING' && (prev[key] === 'OK' || prev[key] === 'ERROR')) {
              // Preserve existing OK/ERROR status
            } else {
              updated[key] = nextVal;
              setDiagnosticsDetails(prevDetails => ({ ...prevDetails, [key]: detailVal }));
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

    const onUsbFlashProgress = (event, payload) => {
      if (payload.status === 'compiling' || payload.status === 'uploading') {
        setIsFlashingUsb(true);
        addLogLine(`[USB FLASH PROGRESS] ${payload.message || 'Processing...'} (${payload.progress}%)`, 'info');
      } else if (payload.status === 'success') {
        setIsFlashingUsb(false);
        addLogLine(`[USB FLASH SUCCESS] ${payload.message}`, 'success');
        alert('USB Flash Completed successfully!');
      } else if (payload.status === 'error') {
        setIsFlashingUsb(false);
        addLogLine(`[USB FLASH ERROR] Flashing failed: ${payload.message}`, 'error');
        alert(`USB Flashing Failed:\n${payload.message}`);
      }
    };
    ipcRenderer.on('usb-flash-progress', onUsbFlashProgress);

    const onArduinoCliInstallStatus = (event, payload) => {
      if (payload.status === 'downloading' || payload.status === 'extracting') {
        setIsInstallingCli(true);
        addCliLog(`[INSTALL STATUS] ${payload.message}`, 'info');
      } else if (payload.status === 'success') {
        setIsInstallingCli(false);
        addCliLog(`[INSTALL SUCCESS] ${payload.message}`, 'success');
        checkCliInstallation();
        alert('Arduino CLI installed successfully!');
      } else if (payload.status === 'error') {
        setIsInstallingCli(false);
        addCliLog(`[INSTALL ERROR] ${payload.message}`, 'error');
        alert(`Arduino CLI installation failed:\n${payload.message}`);
      }
    };
    ipcRenderer.on('arduino-cli-install-status', onArduinoCliInstallStatus);

    const onGitHubSyncResult = (event, result) => {
      setIsGitHubSyncing(false);
      if (result.success) {
        addLogLine(`[GITHUB SYNC SUCCESS] ${result.message}`, 'success');
        alert('Code updated successfully from GitHub! The application will now restart to apply updates.');
      } else {
        addLogLine(`[GITHUB SYNC ERROR] Sync failed: ${result.message}`, 'error');
        alert(`GitHub Code Sync Failed:\n${result.message}`);
      }
    };
    ipcRenderer.on('github-sync-result', onGitHubSyncResult);

    checkCliInstallation();

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
        alert('Database connected successfully!');
      } else {
        setDbReconnectStatus(`Failed: ${result.message}`);
        addLogLine(`[DATABASE ERROR] MongoDB reconnection failed: ${result.message}`, 'error');
        alert(`Database connection failed:\n${result.message}`);
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

    const onRefreshDatabaseHistory = () => {
      fetchDatabaseHistory();
    };
    ipcRenderer.on('refresh-database-history', onRefreshDatabaseHistory);

    // Handle known device reconnection — load previous session from DB
    const onDeviceReconnectedKnown = (event, doc) => {
      if (!doc || !doc.imei) return;
      // Load previous diagnostics state from DB doc
      const diagKeys = ['rs232', 'rs485', 'gprs', 'bus', 'ap', 'flash', 'di', 'driver', 'rtc'];
      const newDiag = {};
      const newDiagDetails = {};
      diagKeys.forEach(key => {
        const statusKey = `${key}Status`;
        const logKey = `${key}Log`;
        if (doc[statusKey] && doc[statusKey] !== 'WAITING') {
          newDiag[key] = doc[statusKey];
          newDiagDetails[key] = doc[logKey] || '';
        }
      });
      if (Object.keys(newDiag).length > 0) {
        setDiagnostics(prev => ({ ...prev, ...newDiag }));
        setDiagnosticsDetails(prev => ({ ...prev, ...newDiagDetails }));
      }
      // Show banner
      setReconnectBanner({ imei: doc.imei, doc });
      addLogLine(`[DB] ⚡ Known device ${doc.imei} reconnected — previous session loaded. Testing can be skipped.`, 'success');
    };
    ipcRenderer.on('device-reconnected-known', onDeviceReconnectedKnown);

    // Fetch initial app configuration (Requirement 6)
    ipcRenderer.invoke('get-app-config').then((config) => {
      if (config) {
        setDbUriInput(config.mongoUri || 'mongodb://127.0.0.1:27017/IOT_Monitor_System');
        setExpressPortInput(String(config.expressPort || '8000'));
        setTelemetryPortInput(String(config.telemetryPort || '9000'));
        setOtaPortInput(String(config.otaPort || '500'));
        setUdpPortInput(String(config.udpPort || '5002'));
        setDefaultBaudRateInput(String(config.defaultBaudRate || '115200'));
        setGithubClientIdInput(config.githubClientId || '');
        setGithubClientSecretInput(config.githubClientSecret || '');
        setHwAccelInput(config.hardwareAcceleration !== false);
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
      ipcRenderer.off('refresh-database-history', onRefreshDatabaseHistory);
      ipcRenderer.off('device-reconnected-known', onDeviceReconnectedKnown);
      ipcRenderer.off('usb-flash-progress', onUsbFlashProgress);
      ipcRenderer.off('arduino-cli-install-status', onArduinoCliInstallStatus);
      ipcRenderer.off('github-sync-result', onGitHubSyncResult);
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
    if (activeTab === 'page-device-registry') {
      fetchDatabaseHistory();
      fetchDatabaseStatus();
      fetchRegisteredDevices();
    }
  }, [activeTab]);

  // Auto-increment device number based on registry entries
  useEffect(() => {
    if (!editingDeviceImei && registeredDevices && registeredDevices.length > 0) {
      const maxNum = registeredDevices.reduce((max, d) => ((d.deviceNumber || 0) > max ? d.deviceNumber : max), 0);
      setRegDeviceNumber(String(maxNum + 1));
    } else if (!editingDeviceImei) {
      setRegDeviceNumber('1');
    }
  }, [registeredDevices, editingDeviceImei]);

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
${Object.keys(diagnostics).map(key => `- ${key.toUpperCase().padEnd(17)}: ${diagnostics[key]}${diagnosticsDetails[key] ? ' (' + diagnosticsDetails[key] + ')' : ''}`).join('\n')}

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
    setDiagnosticsDetails({
      rs232: '',
      rs485: '',
      gprs: '',
      bus: '',
      ap: '',
      flash: '',
      di: '',
      driver: '',
      rtc: ''
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

  const handleForceSyncActiveDeviceToDb = async () => {
    if (!imei || imei === '--') {
      alert('No active device IMEI found to sync. Make sure a device is connected.');
      return;
    }
    try {
      const payload = {
        imei: imei,
        pcbNumber: pcbNumber && pcbNumber !== '--' ? pcbNumber : '',
        mac: mac && mac !== '--' ? mac : '',
        connectionType: connection.type || 'tcp',
        target: connection.target || '',
        routerSSID: wifiRouterSsid || '',
        routerPassword: wifiRouterPass || '',
        telemetryInterval: telemetryRate || 1500,
        deviceNumber: parseInt(regDeviceNumber) || 1,
        rs232Status: diagnostics.rs232 || 'WAITING',
        rs485Status: diagnostics.rs485 || 'WAITING',
        gprsStatus: diagnostics.gprs || 'WAITING',
        busStatus: diagnostics.bus || 'WAITING',
        apStatus: diagnostics.ap || 'WAITING',
        flashStatus: diagnostics.flash || 'WAITING',
        diStatus: diagnostics.di || 'WAITING',
        driverStatus: diagnostics.driver || 'WAITING',
        rtcStatus: diagnostics.rtc || 'WAITING'
      };
      const res = await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Active device details successfully synced to database immediately!');
        fetchRegisteredDevices();
      } else {
        const errData = await res.json();
        alert(`Sync failed: ${errData.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Sync error: ${err.message}`);
    }
  };

  const saveModuleRemarkToDb = async (key, value) => {
    setDiagnosticsDetails(prev => ({ ...prev, [key]: value }));
    if (!imei || imei === '--') return;
    try {
      const logField = `${key}Log`;
      await fetch('/api/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: imei,
          [logField]: value
        })
      });
      fetchRegisteredDevices();
    } catch (err) {
      console.error('[DB] Failed to save diagnostic remark:', err);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedTextIndex(index);
    setTimeout(() => setCopiedTextIndex(null), 2000);
  };

  // REST API: Register a new device configuration
  const handleRegisterDevice = async (e) => {
    e.preventDefault();
    if (!regImei) {
      alert('IMEI is required.');
      return;
    }
    const devNumVal = parseInt(regDeviceNumber);
    if (!devNumVal || isNaN(devNumVal) || devNumVal < 1) {
      alert('Please enter a valid Device Number.');
      return;
    }
    const duplicate = registeredDevices.find(d => d.deviceNumber === devNumVal && d.imei !== editingDeviceImei);
    if (duplicate) {
      alert(`Device Number ${devNumVal} is already allocated to device IMEI: ${duplicate.imei}. Please use a different number.`);
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
          remarks: regRemarks,
          password: regPass,
          routerSSID: regSsid,
          routerPassword: regWifiPass,
          telemetryInterval: parseInt(regInterval) || 1500,
          deviceNumber: parseInt(regDeviceNumber) || 1,
          deviceMode: regDeviceMode
        })
      });
      if (res.ok) {
        alert(editingDeviceImei ? 'Device configuration updated successfully.' : 'Device configuration registered successfully.');
        setRegImei('');
        setRegPcb('');
        setRegPass('admin_secure_gate');
        setRegSsid('');
        setRegWifiPass('');
        setRegInterval('1500');
        setRegDeviceNumber('1');
        setRegDeviceMode('solaryan inverter');
        setRegRemarks('');
        setEditingDeviceImei(null);
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
          remarks: device.remarks || '',
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
  const handleDeleteDevice = async (identifier, displayName) => {
    if (!identifier) {
      alert('Cannot delete: Device identifier is empty or undefined.');
      return;
    }
    if (!confirm(`Are you sure you want to unregister device: ${displayName}?`)) return;
    try {
      const res = await fetch(`/api/devices/${identifier}`, { method: 'DELETE' });
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

  const triggerModbusRead = async () => {
    setIsReadingModbus(true);
    setModbusError(null);

    if (modbusMode === 'gateway') {
      if (!connection.type) {
        alert('Gateway must be connected via TCP or Serial to read registers in Gateway mode.');
        setIsReadingModbus(false);
        return;
      }
      sendControlCommand(`READ_MODBUS:${modbusStartReg}:${modbusCount}`);
      addLogLine(`[GUI] Requested Modbus read of ${modbusCount} registers starting at ${modbusStartReg} via gateway...`, 'system');
    } else {
      // Direct Modbus TCP
      addLogLine(`[MODBUS] Direct query to ${modbusIp}:${modbusPort} (Slave ${modbusSlaveId}, type ${modbusRegType})...`, 'system');
      try {
        const result = await ipcRenderer.invoke('query-modbus-tcp', {
          ip: modbusIp,
          port: parseInt(modbusPort) || 502,
          startReg: modbusStartReg,
          count: modbusCount,
          slaveId: parseInt(modbusSlaveId) || 1,
          regType: modbusRegType
        });
        setIsReadingModbus(false);
        if (result.success) {
          setModbusData(result.raw16 || []);
          setModbusData32(result.values || {});
          addLogLine(`[MODBUS] Direct query success. Read ${result.raw16.length} registers.`, 'success');
        } else {
          setModbusError(result.error || 'Modbus communication error');
          addLogLine(`[MODBUS ERROR] Direct query failed: ${result.error}`, 'error');
        }
      } catch (err) {
        setIsReadingModbus(false);
        setModbusError(err.message);
        addLogLine(`[MODBUS ERROR] Direct query exception: ${err.message}`, 'error');
      }
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

  const handleUsbFlash = () => {
    const port = selectedSerialPort || (connection.type === 'serial' ? connection.target : null);
    if (!port || port === 'CUSTOM_PORT') {
      alert('Please select a valid COM port first.');
      return;
    }

    const fqbn = localStorage.getItem('arduino_fqbn') || 'esp32:esp32:esp32s3';

    if (connection.type === 'serial') {
      addLogLine(`[USB FLASH] Disconnecting active serial connection on ${port} to release port for flashing...`);
      ipcRenderer.send('disconnect-active');
    }

    setIsFlashingUsb(true);
    addLogLine(`[USB FLASH] Initiating compiler & flash upload to ${port} using FQBN: ${fqbn}...`);
    ipcRenderer.send('compile-and-flash-serial', { port, fqbn });
  };

  const checkCliInstallation = async () => {
    try {
      const res = await ipcRenderer.invoke('check-arduino-cli-installed');
      setCliStatus({
        installed: res.installed,
        version: res.version || res.path || '',
        source: res.source || '',
        checking: false
      });
      addCliLog(`[TOOLCHAIN CHECK] Arduino-CLI detected: ${res.installed ? 'YES (' + (res.source || '') + ')' : 'NO'}`);
    } catch (e) {
      setCliStatus({ installed: false, version: '', checking: false });
      addCliLog(`[TOOLCHAIN CHECK ERROR] Verify check failed: ${e.message}`);
    }
  };

  const handleDownloadCli = () => {
    setIsInstallingCli(true);
    addCliLog('[INSTALL] Triggering Arduino CLI automatic installer download...');
    ipcRenderer.send('install-arduino-cli');
  };

  const addCliLog = (text, type = 'system') => {
    const logObj = {
      time: new Date().toLocaleTimeString(),
      text,
      type
    };
    setCliConsoleLogs(prev => {
      const next = [...prev, logObj];
      if (next.length > 500) next.shift();
      return next;
    });
  };

  const handleGitHubSync = () => {
    const targetUrl = gitHubTargetAccount === 'regular_update' ? 'https://github.com/YashGajjar7017/IOT_Manger_System' : gitHubRepoUrlInput;
    const targetBranch = gitHubTargetAccount === 'regular_update' ? 'main' : gitHubRepoBranchInput;
    if (!targetUrl) {
      alert('Please enter a valid GitHub repository URL.');
      return;
    }
    localStorage.setItem('github_repo_url', targetUrl);
    setIsGitHubSyncing(true);
    addLogLine(`[GITHUB SYNC] Starting sync trigger for repository: ${targetUrl} (branch: ${targetBranch})...`);
    ipcRenderer.send('sync-code-from-github', { repoUrl: targetUrl, branch: targetBranch });
  };

  const handleCheckUpdate = async () => {
    setUpdateState(prev => ({ ...prev, checking: true, error: null }));
    try {
      const targetUrl = gitHubTargetAccount === 'regular_update' ? 'https://github.com/YashGajjar7017/IOT_Manger_System' : gitHubRepoUrlInput;
      const targetBranch = gitHubTargetAccount === 'regular_update' ? 'main' : gitHubRepoBranchInput;
      const res = await ipcRenderer.invoke('check-software-update', { repoUrl: targetUrl, branch: targetBranch });
      if (res.success) {
        setUpdateState({
          checking: false,
          checked: true,
          hasUpdate: res.hasUpdate,
          currentVersion: res.currentVersion,
          onlineVersion: res.onlineVersion,
          changes: res.changes,
          downloadUrl: res.downloadUrl,
          error: null
        });
      } else {
        setUpdateState(prev => ({ ...prev, checking: false, error: res.message }));
      }
    } catch (e) {
      setUpdateState(prev => ({ ...prev, checking: false, error: e.message }));
    }
  };

  const handleApplyUpdate = () => {
    setIsUpdatingSoftware(true);
    addLogLine('[GITHUB SYNC] Applying update trigger downloaded from GitHub script...');
    const targetUrl = gitHubTargetAccount === 'regular_update' ? 'https://github.com/YashGajjar7017/IOT_Manger_System' : gitHubRepoUrlInput;
    const targetBranch = gitHubTargetAccount === 'regular_update' ? 'main' : gitHubRepoBranchInput;
    ipcRenderer.send('sync-code-from-github', {
      repoUrl: targetUrl,
      branch: targetBranch
    });
  };

  const handlePullGithubXml = async () => {
    setIsSyncingXml(true);
    try {
      const repoUrl = gitHubTargetAccount === 'regular_update' ? 'https://github.com/YashGajjar7017/IOT_Manger_System' : (gitHubRepoUrlInput || 'https://github.com/YashGajjar7017/IOT_Manger_System');
      const branch = gitHubTargetAccount === 'regular_update' ? 'main' : (gitHubRepoBranchInput || 'main');
      const result = await ipcRenderer.invoke('manual-pull-github-xml', { repoUrl, branch });
      if (result.success) {
        alert(result.message);
        addLogLine(`[GITHUB XML SUCCESS] ${result.message}`, 'success');
      } else {
        alert(`Failed to pull XML: ${result.message}`);
        addLogLine(`[GITHUB XML ERROR] Pull failed: ${result.message}`, 'error');
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
      addLogLine(`[GITHUB XML ERROR] Exception: ${err.message}`, 'error');
    } finally {
      setIsSyncingXml(false);
    }
  };

  const handleUploadConfigPartition = async () => {
    if (!connection.type || connection.type === 'failed') {
      alert('Gateway must be connected to upload configuration.');
      return;
    }

    setIsUploadingConfigPartition(true);
    setConfigPartitionProgress(10);
    addLogLine(`[CONFIG PARTITION] Compiling configuration for: ${inverterMeterType}...`);

    try {
      let deviceConfigContent = '';
      if (configSourceType === 'wizard') {
        const deviceConfigPayload = {
          inverterMeterType,
          busId: parseInt(busDataId) || 1,
          baudRate: parseInt(busBaudRate) || 9600,
          timestamp: new Date().toISOString()
        };
        deviceConfigContent = JSON.stringify(deviceConfigPayload, null, 2);
      } else {
        if (!configFileContent) {
          alert('Please import a configuration file first.');
          setIsUploadingConfigPartition(false);
          setConfigPartitionProgress(0);
          return;
        }
        deviceConfigContent = configFileContent;
      }

      const uuidConfigPayload = {
        uuid: uuidToken.trim() || 'nebula-secure-uuid',
        bus_id: parseInt(busDataId) || 1
      };
      const uuidConfigContent = JSON.stringify(uuidConfigPayload, null, 2);

      if (configSourceType === 'wizard') {
        addLogLine(`[CONFIG PARTITION] Uploading /device_config.json to ESP32 config partition (SPIFFS)...`);
        ipcRenderer.send('update-spiffs-file', {
          ip: otaIp,
          port: otaPort,
          filename: '/device_config.json',
          content: deviceConfigContent
        });

        setConfigPartitionProgress(40);

        setTimeout(() => {
          addLogLine(`[CONFIG PARTITION] Uploading /uuid.json (bus_id: ${busDataId}) to ESP32 config partition (SPIFFS)...`);
          ipcRenderer.send('update-spiffs-file', {
            ip: otaIp,
            port: otaPort,
            filename: '/uuid.json',
            content: uuidConfigContent
          });
          setConfigPartitionProgress(80);
        }, 600);
      } else {
        const isJson = configSourceType === 'file_json';
        const targetFilename = isJson ? '/device_config.json' : '/config.csv';
        addLogLine(`[CONFIG PARTITION] Uploading custom file to ESP32 config partition (${targetFilename})...`);
        ipcRenderer.send('update-spiffs-file', {
          ip: otaIp,
          port: otaPort,
          filename: targetFilename,
          content: deviceConfigContent
        });
        setConfigPartitionProgress(80);
      }

      setTimeout(() => {
        setConfigPartitionProgress(100);
        setIsUploadingConfigPartition(false);
        addLogLine(`[CONFIG PARTITION SUCCESS] Partition configuration successfully uploaded and stored forever!`, 'success');
        alert('Configuration uploaded to spiffs/psram config partition successfully! Reboot gateway to apply settings.');
      }, 500);

    } catch (err) {
      setIsUploadingConfigPartition(false);
      setConfigPartitionProgress(0);
      addLogLine(`[ERROR] Failed to compile or upload configuration: ${err.message}`, 'error');
      alert(`Upload failed: ${err.message}`);
    }
  };

  const handleImportConfigFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setConfigFileContent(content);
      setConfigFileName(file.name);

      const fileExt = file.name.split('.').pop().toLowerCase();
      if (fileExt === 'json') {
        setConfigSourceType('file_json');
      } else if (fileExt === 'csv') {
        setConfigSourceType('file_csv');
      }

      addLogLine(`[GUI] Successfully imported local config file: ${file.name} (${file.size} bytes)`);
    };
    reader.onerror = (err) => {
      alert(`Failed to read file: ${err.message}`);
    };
    reader.readAsText(file);
  };

  const fetchTroubleshootLogs = async () => {
    try {
      const logs = await ipcRenderer.invoke('get-troubleshoot-logs');
      setTroubleshootLogs(logs || []);
    } catch (err) {
      console.error('Failed to get troubleshoot logs:', err);
    }
  };

  const clearTroubleshootLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all troubleshoot logs?')) return;
    try {
      const success = await ipcRenderer.invoke('clear-troubleshoot-logs');
      if (success) {
        setTroubleshootLogs([]);
        alert('Troubleshoot logs cleared successfully.');
      }
    } catch (err) {
      alert(`Failed to clear troubleshoot logs: ${err.message}`);
    }
  };

  useEffect(() => {
    if (showAccountModal) {
      fetchTroubleshootLogs();
    }
  }, [showAccountModal]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Close only if the click is outside BOTH the header button container AND the modal itself
      const outsideContainer = accountContainerRef.current && !accountContainerRef.current.contains(e.target);
      const outsideModal = accountModalRef.current && !accountModalRef.current.contains(e.target);
      if (outsideContainer && outsideModal) {
        setShowAccountModal(false);
      }
    };
    if (showAccountModal) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAccountModal]);

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
      'rootCA.pem': 'idle',
      'client.pem': 'idle',
      'key.pem': 'idle'
    });
    setCertDetails({
      'rootCA.pem': null,
      'client.pem': null,
      'key.pem': null
    });
    ipcRenderer.send('download-and-provision-certs', {
      urls: {
        'rootCA.pem': formatUrl(certRootCaUrl),
        'client.pem': formatUrl(certDeviceCertUrl),
        'key.pem': formatUrl(certPrivateKeyUrl)
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
      githubClientSecret: githubClientSecretInput,
      hardwareAcceleration: hwAccelInput
    };
    ipcRenderer.send('save-app-config', config);
    setOtaPort(String(config.otaPort));
    alert('Settings saved successfully. Restart the application for updates to take effect.');
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
    if (connection.type) {
      sendControlCommand(isChecked ? `SIM_DI_ON:${index}` : `SIM_DI_OFF:${index}`);
    }
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

  // Group Modbus registers into 32-bit values (Big Endian)
  const grouped32BitData = useMemo(() => {
    const dict = {};
    for (let i = 0; i < modbusData.length; i += 2) {
      const regAddr = modbusStartReg + i;
      const val1 = modbusData[i];
      const val2 = (i + 1 < modbusData.length) ? modbusData[i + 1] : null;
      if (val1 !== null && val1 !== undefined && val2 !== null && val2 !== undefined) {
        const longVal = (val1 << 16) | val2;
        dict[String(regAddr)] = longVal;
      } else if (val1 !== null && val1 !== undefined) {
        dict[String(regAddr)] = val1; // Fallback to 16-bit single
      } else {
        dict[String(regAddr)] = null;
      }
    }
    return dict;
  }, [modbusData, modbusStartReg]);

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

      {bgVideoEnabled && bgVideoId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -2,
          overflow: 'hidden',
          pointerEvents: 'none',
          background: '#0d0a1b'
        }}>
          <iframe
            src={`https://www.youtube.com/embed/${bgVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${bgVideoId}&showinfo=0&rel=0&modestbranding=1&iv_load_policy=3&playsinline=1&enablejsapi=1`}
            style={{
              width: '100vw',
              height: '56.25vw',
              minHeight: '100vh',
              minWidth: '177.77vh',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: bgVideoOpacity,
              border: 'none',
              pointerEvents: 'none'
            }}
            title="Background Video"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

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

            <button className={`header-nav-item ${activeTab === 'page-firmware-flash' ? 'active' : ''}`} onClick={() => setActiveTab('page-firmware-flash')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span>Firmware Flasher</span>
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
              <span>Console Terminal</span>
            </button>

            <button className={`header-nav-item ${activeTab === 'page-modbus' ? 'active' : ''}`} onClick={() => setActiveTab('page-modbus')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
              <span>Modbus Viewer</span>
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

            <button className={`header-nav-item ${showAccountModal ? 'active' : ''}`} onClick={() => { setAccountModalActiveTab('profile'); setShowAccountModal(true); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Setting</span>
            </button>

          </nav>

          <div className="header-right">
            {/* Header status indicator removed as requested */}

            {/* <div className="header-status-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', fontSize: '11px' }}>
            <span className="ping-label" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>Socket Ping:</span>
              <span className={`ping-result ${pingLatency.status}`} style={{ fontSize: '11px', fontWeight: 'bold' }}>{pingLatency.value}</span>
            </div> */}

            <div className="header-account-container" ref={accountContainerRef} style={{ position: 'relative' }}>
              <button
                className={`header-account-btn ${showAccountMenu ? 'active' : ''}`}
                onClick={() => setShowAccountMenu(prev => !prev)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: isLoggedIn ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-pink))' : 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                  {isLoggedIn ? (authUsername ? authUsername[0].toUpperCase() : '👤') : '👤'}
                </span>
                {isLoggedIn ? (authUsername || 'Setting') : 'Setting'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '12px', height: '12px', transition: 'transform 0.2s', transform: showAccountMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Account Dropdown */}
              {showAccountMenu && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: '200px',
                  background: 'rgba(14, 11, 30, 0.97)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0, 240, 255, 0.08)',
                  backdropFilter: 'blur(20px)',
                  zIndex: 9999,
                  overflow: 'hidden'
                }}>
                  {/* Account info header */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isLoggedIn ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-pink))' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, fontWeight: 'bold', color: 'white' }}>
                      {isLoggedIn ? (authUsername ? authUsername[0].toUpperCase() : '👤') : '👤'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{isLoggedIn ? (authUsername || 'User') : 'Not Signed In'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{isLoggedIn ? 'Administrator' : 'Click to sign in'}</div>
                    </div>
                  </div>
                  {/* Menu items */}
                  <div style={{ padding: '6px' }}>
                    <button
                      onClick={() => { setShowAccountMenu(false); setAccountModalActiveTab('profile'); setShowAccountModal(true); }}
                      style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '12px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9" /></svg>
                      Open Settings
                    </button>
                    {isLoggedIn ? (
                      <button
                        onClick={() => { setShowAccountMenu(false); openAuthView('login'); }}
                        style={{ width: '100%', background: 'none', border: 'none', color: '#ff4d6d', fontSize: '12px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 77, 109, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        Sign Out
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowAccountMenu(false); setShowAccountModal(true); setAccountModalActiveTab('profile'); }}
                        style={{ width: '100%', background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '12px', padding: '8px 10px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 240, 255, 0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                        Sign In
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* Modal overlay moved to root level to avoid stacking context/clipping issues */}
              {false && (
                <div
                  className="gprs-modal-overlay"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(3, 2, 8, 0.85)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10000
                  }}
                  onClick={() => setShowAccountModal(false)}
                >
                  <div
                    style={{
                      width: '50vw',
                      minWidth: '850px',
                      height: '80vh',
                      minHeight: '550px',
                      background: '#0e0b1e', // Solid premium dark background
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '16px',
                      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 240, 255, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      textAlign: 'left'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '18px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.01)'
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        👤 System Account & Settings Manager
                      </h3>
                      <button
                        onClick={() => setShowAccountModal(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          fontSize: '24px',
                          cursor: 'pointer',
                          padding: '4px',
                          lineHeight: '1'
                        }}
                      >
                        &times;
                      </button>
                    </div>

                    {/* Modal Body Grid */}
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                      {/* Left Navigation Sidebar */}
                      <div
                        style={{
                          width: '230px',
                          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'rgba(0, 0, 0, 0.15)',
                          padding: '15px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          overflowY: 'auto'
                        }}
                      >
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'profile' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'profile' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('profile')}
                        >
                          👤 Admin Profile
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'db-settings' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'db-settings' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('db-settings')}
                        >
                          📂 Database Settings
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'theme-styling' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'theme-styling' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('theme-styling')}
                        >
                          🎨 Theme & Styling
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'ports-baud' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'ports-baud' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('ports-baud')}
                        >
                          🔌 Ports & Baud Rate
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'github-oauth' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'github-oauth' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('github-oauth')}
                        >
                          🐙 GitHub OAuth
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'performance-os' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'performance-os' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('performance-os')}
                        >
                          ⚡ Performance & OS
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'github-sync' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'github-sync' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('github-sync')}
                        >
                          🔄 GitHub Sync
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: accountModalActiveTab === 'revocation-logs' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            color: accountModalActiveTab === 'revocation-logs' ? 'var(--accent-pink)' : 'var(--text-dim)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            outline: 'none',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => setAccountModalActiveTab('revocation-logs')}
                        >
                          🛠️ Troubleshoot Logs
                        </button>
                      </div>

                      {/* Right Panel Scrollable Content */}
                      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.05)' }}>
                        {/* Profile Tab */}
                        {accountModalActiveTab === 'profile' && (
                          <div>
                            {!isLoggedIn ? (
                              <div className="glass-card auth-card" style={{ maxWidth: '400px', margin: '20px auto', border: '1px solid var(--glass-border)', padding: '20px' }}>
                                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                  <span style={{ fontSize: '32px' }}>🔑</span>
                                  <h4 style={{ color: 'white', margin: '10px 0 5px 0', fontSize: '15px' }}>Admin Authorization</h4>
                                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Unlock profiles & settings</p>
                                </div>

                                {authError && (
                                  <div style={{ padding: '8px', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid rgba(255, 51, 102, 0.3)', color: '#ff3366', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
                                    ⚠️ {authError}
                                  </div>
                                )}

                                <div className="input-group">
                                  <label>Username</label>
                                  <input type="text" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Enter admin username" />
                                </div>

                                {authMode === 'signup' && (
                                  <div className="input-group">
                                    <label>Email Address</label>
                                    <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="admin@domain.com" />
                                  </div>
                                )}

                                <div className="input-group">
                                  <label>Password</label>
                                  <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••••••" />
                                </div>

                                {authMode === 'signup' && (
                                  <div className="input-group">
                                    <label>Confirm Password</label>
                                    <input type="password" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} placeholder="••••••••••••" />
                                  </div>
                                )}

                                <button className="btn btn-accent" onClick={handleAuth} style={{ width: '100%', marginTop: '15px' }}>
                                  {authMode === 'login' ? 'Authenticate Session' : 'Register Administrator'}
                                </button>

                                <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px' }}>
                                  <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                                    {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="glass-card" style={{ padding: '20px' }}>
                                <h3>👤 Admin Profile</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>Active administrator session details:</p>

                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                  <div>
                                    <span style={{ color: 'var(--accent-pink)', textTransform: 'uppercase', fontSize: '9px', display: 'block', fontWeight: 'bold' }}>Active User</span>
                                    <strong style={{ fontSize: '14px', color: 'white' }}>Administrator</strong>
                                  </div>
                                  <div>
                                    <span style={{ color: 'var(--accent-pink)', textTransform: 'uppercase', fontSize: '9px', display: 'block', fontWeight: 'bold' }}>Status</span>
                                    <strong style={{ fontSize: '14px', color: 'var(--accent-emerald)' }}>Connected & Authenticated</strong>
                                  </div>
                                </div>

                                <button
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    localStorage.removeItem('isLoggedIn');
                                    setIsLoggedIn(false);
                                    addLogLine('[GUI] Logged out.', 'system');
                                    alert('Session terminated.');
                                  }}
                                  style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', height: '36px', padding: '0', cursor: 'pointer' }}
                                >
                                  🚪 Log Out Session
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Database Settings Tab */}
                        {accountModalActiveTab === 'db-settings' && (
                          <div className="glass-card" style={{ padding: '20px' }}>
                            <h3>📂 MongoDB Database Settings</h3>
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
                        )}

                        {/* Theme & Styling Tab */}
                        {accountModalActiveTab === 'theme-styling' && (
                          <div className="glass-card" style={{ padding: '20px' }}>
                            <h3>🎨 Theme & Personalization</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                              Choose from curated dark modes and modern typography fonts. Changes apply instantly.
                            </p>

                            {/* Theme Preset Selection */}
                            <div style={{ marginBottom: '20px' }}>
                              <label className="control-title" style={{ fontSize: '10px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold' }}>Color Theme</label>
                              <div className="theme-presets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '10px' }}>
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
                                  <span className="theme-preset-name">Minecraft</span>
                                </div>

                                <div
                                  className={`theme-preset-card ${currentTheme === 'cherry-grove' ? 'active' : ''}`}
                                  onClick={() => changeThemeWithTransition('cherry-grove')}
                                  style={{ '--theme-card-border': '#ff8da1', '--theme-card-bg-rgb': '255, 141, 161', '--theme-preview-grad': 'linear-gradient(135deg, #ff8da1 0%, #3a222d 100%)' }}
                                >
                                  <div className="theme-preview-bar"></div>
                                  <span className="theme-preset-name">Cherry Grove</span>
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
                            <div style={{ marginBottom: '10px' }}>
                              <label className="control-title" style={{ fontSize: '10px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold' }}>Typography Font</label>
                              <div className="font-presets-grid" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <div className={`font-preset-card ${currentFont === 'outfit' ? 'active' : ''}`} onClick={() => setCurrentFont('outfit')} style={{ fontFamily: 'Outfit, sans-serif', flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', borderRadius: '6px' }}>
                                  Outfit Sans
                                </div>
                                <div className={`font-preset-card ${currentFont === 'mono' ? 'active' : ''}`} onClick={() => setCurrentFont('mono')} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', borderRadius: '6px' }}>
                                  JB Mono
                                </div>
                                <div className={`font-preset-card ${currentFont === 'space' ? 'active' : ''}`} onClick={() => setCurrentFont('space')} style={{ fontFamily: 'Space Grotesk, sans-serif', flex: 1, textAlign: 'center', padding: '8px', cursor: 'pointer', border: '1px solid var(--glass-border)', borderRadius: '6px' }}>
                                  Space Grotesk
                                </div>
                              </div>
                            </div>

                            {/* Video Background Settings */}
                            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '15px' }}>
                              <label className="control-title" style={{ fontSize: '10px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold' }}>Cinematic Background Video</label>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '10px' }}>
                                <div className="input-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Video Background</label>
                                  <select
                                    value={bgVideoEnabled ? 'true' : 'false'}
                                    onChange={(e) => {
                                      const val = e.target.value === 'true';
                                      setBgVideoEnabled(val);
                                      localStorage.setItem('bgVideoEnabled', String(val));
                                    }}
                                    style={{ width: '100%', padding: '8px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                                  >
                                    <option value="true">Enabled (Looping Trailer)</option>
                                    <option value="false">Disabled (Solid Theme Color)</option>
                                  </select>
                                </div>

                                <div className="input-group" style={{ marginBottom: 0 }}>
                                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>YouTube Video ID</label>
                                  <input
                                    type="text"
                                    value={bgVideoId}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBgVideoId(val);
                                      localStorage.setItem('bgVideoId', val);
                                    }}
                                    placeholder="e.g. FYH9n37B7Yw"
                                    style={{ width: '100%', padding: '8px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                                  />
                                </div>
                              </div>

                              <div className="input-group" style={{ marginTop: '15px', marginBottom: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Video Opacity / Dim Level</label>
                                  <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{Math.round(bgVideoOpacity * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0.05"
                                  max="0.80"
                                  step="0.05"
                                  value={bgVideoOpacity}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setBgVideoOpacity(val);
                                    localStorage.setItem('bgVideoOpacity', String(val));
                                  }}
                                  style={{ width: '100%', accentColor: 'var(--accent-pink)', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '6px' }}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Ports & Baud Rate Tab */}
                        {accountModalActiveTab === 'ports-baud' && (
                          <div className="glass-card" style={{ padding: '20px' }}>
                            <h3>🔌 Port & Communication Config</h3>
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
                            <div className="input-group" style={{ marginBottom: '15px' }}>
                              <label>Default COM Baud Rate</label>
                              <select value={defaultBaudRateInput} onChange={(e) => setDefaultBaudRateInput(e.target.value)} className="filter-select" style={{ width: '100%', height: '40px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', outline: 'none' }}>
                                <option value="115200" style={{ background: '#1c1b22', color: 'white' }}>115200</option>
                                <option value="9600" style={{ background: '#1c1b22', color: 'white' }}>9600</option>
                                <option value="57600" style={{ background: '#1c1b22', color: 'white' }}>57600</option>
                              </select>
                            </div>
                            <button className="btn btn-accent" onClick={saveAppConfigSettings} style={{ width: '100%' }}>
                              Save Communications Config
                            </button>
                          </div>
                        )}

                        {/* GitHub OAuth Tab */}
                        {accountModalActiveTab === 'github-oauth' && (
                          <div className="glass-card" style={{ padding: '20px' }}>
                            <h3>🐙 GitHub OAuth Integration</h3>
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
                            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                              💡 Need help? View instructions in the <a href="#" onClick={(e) => { e.preventDefault(); alert("Please refer to Documentation/SIGN_WITH_GITHUB.md for setup details."); }} style={{ color: 'var(--accent-pink)', textDecoration: 'underline' }}>GitHub OAuth Setup Guide</a>.
                            </div>
                          </div>
                        )}

                        {/* Performance & OS Tab */}
                        {accountModalActiveTab === 'performance-os' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="glass-card" style={{ padding: '20px' }}>
                              <h3>⚡ Performance & System Config</h3>
                              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                                Enable hardware acceleration to use GPU resources for smoother transitions and rendering.
                              </p>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                <div>
                                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>GPU Hardware Acceleration</div>
                                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Requires application restart to take effect</div>
                                </div>
                                <label className="switch-toggle" style={{ margin: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={hwAccelInput}
                                    onChange={(e) => setHwAccelInput(e.target.checked)}
                                  />
                                  <span className="switch-slider"></span>
                                </label>
                              </div>
                              <button className="btn btn-primary" onClick={saveAppConfigSettings} style={{ marginTop: '15px', width: '100%' }}>
                                Save Performance Settings
                              </button>
                            </div>

                            <div className="glass-card" style={{ padding: '20px' }}>
                              <h3>🖥️ System Specifications & Versions</h3>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ fontSize: '9px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>OS Environment</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>{systemInfo.platform.toUpperCase()} ({systemInfo.release})</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ fontSize: '9px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>CPU Architecture</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>{systemInfo.cpu} ({systemInfo.arch})</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ fontSize: '9px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>System RAM</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>{systemInfo.freeMem} / {systemInfo.totalMem}</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ fontSize: '9px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>Electron</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>v{systemInfo.electron}</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ fontSize: '9px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>NodeJS</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>v{systemInfo.node}</span>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                  <span style={{ fontSize: '9px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>Chromium</span>
                                  <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>v{systemInfo.chrome}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* GitHub Sync Tab */}
                        {accountModalActiveTab === 'github-sync' && (
                          <div className="glass-card" style={{ padding: '20px' }}>
                            <h3>🐙 GitHub Sync & XML Pull</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                              Sync online codebase files and raw repository XML update logs:
                            </p>

                            <div className="input-group">
                              <label>GitHub Repository URL</label>
                              <input
                                type="text"
                                value={gitHubRepoUrlInput || ''}
                                onChange={(e) => setGitHubRepoUrlInput(e.target.value)}
                                placeholder="https://github.com/Username/Repo"
                              />
                            </div>
                            <div className="input-group">
                              <label>Repository Branch</label>
                              <input
                                type="text"
                                value={gitHubRepoBranchInput || ''}
                                onChange={(e) => setGitHubRepoBranchInput(e.target.value)}
                                placeholder="main"
                              />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                              <button
                                className="btn btn-primary"
                                onClick={handlePullGithubXml}
                                disabled={isSyncingXml}
                                style={{ margin: 0, width: '100%' }}
                              >
                                {isSyncingXml ? 'Syncing XML...' : 'Update XML Now'}
                              </button>
                              <button
                                className="btn btn-accent"
                                onClick={handleGitHubSync}
                                disabled={isGitHubSyncing}
                                style={{ margin: 0, width: '100%' }}
                              >
                                {isGitHubSyncing ? 'Syncing Code...' : 'Sync Code Now'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Troubleshoot Logs Tab */}
                        {accountModalActiveTab === 'revocation-logs' && (
                          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                              <h3>🛠️ Revocation & Troubleshoot Logs</h3>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary small" onClick={fetchTroubleshootLogs} style={{ margin: 0, height: '28px', padding: '0 12px', fontSize: '11px' }}>
                                  🔄 Refresh
                                </button>
                                <button className="btn btn-danger small" onClick={clearTroubleshootLogs} style={{ margin: 0, height: '28px', padding: '0 12px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                  🗑️ Clear Logs
                                </button>
                              </div>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                              Offline troubleshooting history: connection terminations (revoke events) and database failures.
                            </p>

                            <div style={{ maxHeight: '350px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                              {troubleshootLogs.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#707090', fontStyle: 'italic' }}>
                                  No troubleshooting logs found.
                                </div>
                              ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent-pink)', textAlign: 'left' }}>
                                      <th style={{ padding: '6px' }}>Timestamp</th>
                                      <th style={{ padding: '6px' }}>Event</th>
                                      <th style={{ padding: '6px' }}>Message</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {troubleshootLogs.map((log, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e0e0f0' }}>
                                        <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                        <td style={{ padding: '6px' }}>
                                          <span className="status-tag err" style={{ padding: '1px 4px', fontSize: '8px' }}>
                                            {log.event || log.type}
                                          </span>
                                        </td>
                                        <td style={{ padding: '6px' }}>{log.message || log.details}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Layout Panels */}
        <main className="main-content">

          {/* ================= VIEW: SOFTWARE UPDATE CHECKER ================= */}
          <section id="page-update-check" className={`page-view ${activeTab === 'page-update-check' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>Software Update Center</h1>
                <p>Check for system updates, review changelogs, and update application code instantly</p>
              </div>
            </header>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>🚀</div>
                <h3>Check for Updates</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '25px' }}>
                  Match your current software scripts with the latest release metadata index XML on the GitHub production repository.
                </p>

                {updateState.checking ? (
                  <div style={{ fontSize: '14px', color: 'var(--accent-blue)', fontWeight: 'bold' }}>
                    🔍 Accessing GitHub version repository...
                  </div>
                ) : updateState.error ? (
                  <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', padding: '15px', borderRadius: '8px', color: '#ff3366', fontSize: '13px', marginBottom: '20px' }}>
                    <strong>Error checking updates:</strong> {updateState.error}
                  </div>
                ) : updateState.checked ? (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '8px', marginBottom: '25px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Installed Version:</span>
                      <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>v{updateState.currentVersion}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Latest Online Version:</span>
                      <span style={{ fontWeight: 'bold', fontFamily: 'monospace', color: updateState.hasUpdate ? 'var(--accent-pink)' : '#00ff66' }}>
                        v{updateState.onlineVersion}
                      </span>
                    </div>
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                      <strong style={{ fontSize: '11px', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>What's New:</strong>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.4' }}>{updateState.changes}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      Current script version: <strong>v{updateState.currentVersion}</strong>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                  <button
                    className="btn btn-primary"
                    disabled={updateState.checking}
                    onClick={handleCheckUpdate}
                    style={{ width: '200px', margin: 0 }}
                  >
                    🔍 Check Now
                  </button>
                  {updateState.hasUpdate && (
                    <button
                      className="btn btn-accent"
                      onClick={handleApplyUpdate}
                      disabled={isUpdatingSoftware}
                      style={{ width: '200px', margin: 0, background: 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)' }}
                    >
                      {isUpdatingSoftware ? 'Downloading...' : '🔄 Apply Latest Update'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ================= VIEW 1: DASHBOARD ================= */}
          <section id="page-dashboard" className={`page-view ${activeTab === 'page-dashboard' ? 'active' : ''}`}>
            <header className="view-header glass-header unified-color-bar">
              <div className="header-actions-wrapper" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '10px' }}>
                <div className="header-left-actions" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', flex: '1 1 auto', alignItems: 'center' }}>
                  <button className="btn btn-primary header-btn" onClick={triggerSelfCheckReRun} disabled={controlsDisabled || !connection.type} title="Run diagnostics checking on all modules" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    🧪 Run Tests
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={triggerSelfCheckReRun} disabled={controlsDisabled || !connection.type} title="Re-evaluate peripheral hardware status" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    ↺ Recheck HW
                  </button>
                  <label className="checkbox-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '10.5px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '0 8px', borderRadius: '14px', color: 'white', height: '28px', userSelect: 'none', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={continuousDiagnostics}
                      onChange={(e) => setContinuousDiagnostics(e.target.checked)}
                      style={{ cursor: 'pointer', width: '12px', height: '12px', accentColor: 'var(--accent-pink)' }}
                    />
                    <span>DB Update</span>
                  </label>
                  <button className="btn btn-accent header-btn" onClick={() => sendControlCommand('SHIFT_TO_QCOM')} disabled={!connection.type} title="Shift communications target to QCOM" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    Shift QCOM
                  </button>
                  <button className="btn btn-accent header-btn" onClick={() => sendControlCommand('FORMAT_SPIFFS')} disabled={!connection.type} title="Format ESP32 flash partition storage" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    Format
                  </button>
                  <button className="btn btn-accent header-btn" onClick={() => sendControlCommand('SYNC_CERTS_TO_QCOM')} disabled={!connection.type} title="Sync certificates from ESP32 to QCOM" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    Sync Certs
                  </button>
                  {/* <button className="btn btn-secondary header-btn" onClick={handleDownloadReport} title="Export diagnostics report to local disk">
                    Download Report
                  </button> */}
                  <button className="btn btn-secondary header-btn" onClick={handleForceSyncActiveDeviceToDb} disabled={!connection.type || !imei || imei === '--'} title="Immediately sync active device and current diagnostics to database" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    Save DB
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={exportTelemetryJson} title="Export telemetry history as JSON" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    Export
                  </button>
                  <button className="btn btn-secondary header-btn" onClick={() => setConsoleLogs([])} title="Clear live console logs" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto' }}>
                    Clear
                  </button>
                  <button className="btn btn-danger header-btn" onClick={() => sendControlCommand('REBOOT')} disabled={!connection.type} title="Force soft reboot of connected gateway" style={{ height: '28px', fontSize: '10.5px', padding: '0 8px', margin: 0, minWidth: 'auto', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ff4d4d' }}>
                    Reboot
                  </button>
                </div>

                <div className="header-right-status" style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: '0 0 auto' }}>
                  <div className="live-status-container" style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '11.5px' }}>
                    <div className="live-status-item">
                      <span className="live-status-label" style={{ color: 'var(--text-dim)' }}>Link: </span>
                      <span className="live-status-value" style={{ fontWeight: 'bold', color: connection.type ? '#00ff66' : '#ff3366' }}>
                        {connection.type ? `CONNECTED (${connection.type.toUpperCase()})` : 'DISCONNECTED (CLOSED)'}
                      </span>
                    </div>
                    {connection.type && connection.target && (
                      <div className="live-status-item">
                        {/* <span className="live-status-label" style={{ color: 'var(--text-dim)' }}>Target: </span> */}
                        {/* <span className="live-status-value" style={{ fontWeight: 'bold', color: '#fff' }}>{connection.target}</span> */}
                      </div>
                    )}
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
                            const profile = registeredDevices.find(d => (d._id || d.imei || d.pcbNumber) === val);
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
                        {[...registeredDevices].sort((a, b) => (a.deviceNumber || 0) - (b.deviceNumber || 0)).map((d) => (
                          <option key={d._id || d.imei || d.pcbNumber} value={d._id || d.imei || d.pcbNumber}>
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
                            {connectionMode === 'ap' ? '📶 RMS-FIRMWARE Direct SoftAP' : '🌐 Router / WiFi Scope'}
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
                            <div className="button-row" style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '8px' }}>
                              <button className="btn btn-primary" style={{ width: '80%', margin: 0 }} onClick={connectSerial}>Open COM Port</button>
                              <button
                                className="btn btn-secondary"
                                style={{ width: '20%', margin: 0, minWidth: 'auto', padding: 0, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                onClick={() => setShowGprsConsole(true)}
                                title="Open GPRS Modem AT Command Debug Console"
                              >
                                📟
                              </button>
                            </div>
                            <div className="button-row" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                              <button className="btn btn-accent" style={{ flex: 1, margin: 0 }} onClick={triggerBoot} disabled={!bootTriggerEnabled}>START_BOOT</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="button-row" style={{ display: 'flex', gap: '8px', width: '100%', marginBottom: '8px' }}>
                      <button className="btn btn-danger" style={{ width: '80%', margin: 0 }} onClick={disconnectGateway}>Disconnect active link</button>
                      <button
                        className="btn btn-secondary"
                        style={{ width: '20%', margin: 0, minWidth: 'auto', padding: 0, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        onClick={() => setShowGprsConsole(true)}
                        title="Open GPRS Modem AT Command Debug Console"
                      >
                        📟
                      </button>
                    </div>
                    <div className="button-row" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, margin: 0 }}
                        onClick={() => ipcRenderer.send('reset-serial-device')}
                        title="Pulses the EN/RTS line to reboot firmware normally (NOT bootloader mode)"
                      >
                        ↺ Reset ESP32
                      </button>
                      <button
                        className="btn btn-accent"
                        style={{ flex: 1, margin: 0 }}
                        onClick={() => sendControlCommand('FORMAT_SPIFFS')}
                        title="Send FORMAT_SPIFFS command to reformat SPIFFS if it failed to mount"
                      >
                        🗂 Format SPIFFS
                      </button>
                    </div>
                    {/* Small scrollable side list of registered devices */}
                    <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📋 Registered Profiles:
                      </span>
                      <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {registeredDevices.length === 0 ? (
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No registered devices</div>
                        ) : (
                          [...registeredDevices].sort((a, b) => (a.deviceNumber || 0) - (b.deviceNumber || 0)).map((d) => (
                            <div
                              key={d._id || d.imei || d.pcbNumber}
                              onClick={() => {
                                const val = d._id || d.imei || d.pcbNumber;
                                setSelectedRegDeviceImei(val);
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
                                background: selectedRegDeviceImei === (d._id || d.imei || d.pcbNumber) ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.01)',
                                border: selectedRegDeviceImei === (d._id || d.imei || d.pcbNumber) ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.04)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '10.5px'
                              }}
                            >
                              <span style={{ fontWeight: 'bold', color: '#ff007f' }}>#{d.deviceNumber || '1'}</span>
                              <span style={{ color: '#fff', fontFamily: 'monospace' }}>{d.pcbNumber || d.imei}</span>
                              <span className={`pulse-dot ${selectedRegDeviceImei === (d._id || d.imei || d.pcbNumber) ? 'connected' : 'idle'}`} style={{ width: '6px', height: '6px' }}></span>
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
                    <div key={key} className={`diag-item ${diagnostics[key] === 'OK' ? 'success' : diagnostics[key] === 'ERROR' ? 'error' : diagnostics[key] === 'TESTING' ? 'warning' : ''}`} title={diagnosticsDetails[key] || ''}>
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <div className="diag-indicator" style={{ marginRight: '8px' }}></div>
                        <div className="diag-label" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{key.toUpperCase()} Module</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="diag-value" style={{ fontSize: '11px', fontWeight: 'bold' }}>{diagnostics[key]}</div>
                          {connection.type && diagnostics[key] !== 'TESTING' && (
                            key === 'gprs' ? (
                              <div style={{ display: 'flex', gap: '6px', width: '130px', flexShrink: 0 }}>
                                <button
                                  className="btn btn-secondary small"
                                  style={{ flex: 1, margin: 0, padding: '2px 4px', fontSize: '10px', height: '22px', minWidth: 'auto', border: '1px solid rgba(249, 83, 198, 0.3)', cursor: 'pointer' }}
                                  onClick={() => testModule(key)}
                                >
                                  Test
                                </button>
                                <button
                                  className="btn btn-secondary small"
                                  style={{ flex: 1, margin: 0, padding: '2px 4px', fontSize: '10px', height: '22px', minWidth: 'auto', border: '1px solid rgba(0, 240, 255, 0.4)', color: '#00f0ff', background: 'rgba(0, 240, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                                  onClick={() => setShowGprsConsole(true)}
                                  title="Open GPRS Modem Interactive AT Command Debug Console"
                                >
                                  📟 Debug
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-secondary small"
                                style={{ padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto', margin: 0, border: '1px solid rgba(249, 83, 198, 0.3)', cursor: 'pointer' }}
                                onClick={() => testModule(key)}
                              >
                                Test
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      {/* Remarks textarea for each diagnostic module */}
                      <textarea
                        placeholder={`${key.toUpperCase()} remarks — what was not working, next steps...`}
                        value={diagnosticRemarks[key] || ''}
                        onChange={e => {
                          const updated = { ...diagnosticRemarks, [key]: e.target.value };
                          setDiagnosticRemarks(updated);
                          localStorage.setItem('diagnosticRemarks', JSON.stringify(updated));
                        }}
                        onMouseLeave={e => {
                          saveModuleRemarkToDb(key, e.target.value);
                        }}
                        onBlur={e => {
                          saveModuleRemarkToDb(key, e.target.value);
                        }}
                        rows={2}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: '5px',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '10px',
                          padding: '5px 8px',
                          resize: 'vertical',
                          outline: 'none',
                          fontFamily: 'var(--font-mono)',
                          lineHeight: 1.5,
                          boxSizing: 'border-box'
                        }}
                      />
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

          {/* ================= VIEW: MODBUS REGISTER VIEWER ================= */}
          <section id="page-modbus" className={`page-view ${activeTab === 'page-modbus' ? 'active' : ''}`}>
            <header className="view-header glass-header">
              <div>
                <h1>Modbus Register Viewer</h1>
                <p>Read holding/input registers dynamically from Modbus slave devices via RS485 bus or Direct TCP/IP link.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="status-tag ok" style={{ background: 'rgba(0, 240, 255, 0.1)', color: '#00f0ff', borderColor: 'rgba(0, 240, 255, 0.3)' }}>
                  UUID: {imei && registeredDevices.find(d => d.imei === imei)?.uuid || 'N/A'}
                </span>
                <span className="status-tag info" style={{ background: 'rgba(255, 187, 0, 0.1)', color: '#ffbb00', borderColor: 'rgba(255, 187, 0, 0.3)' }}>
                  Bus ID: {imei && registeredDevices.find(d => d.imei === imei)?.busId || '1'}
                </span>
              </div>
            </header>

            <div className="glass-card" style={{ marginBottom: '20px', padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Row 1: Mode, Starting Register, Number of Registers */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Query Mode</label>
                    <select
                      value={modbusMode}
                      onChange={(e) => setModbusMode(e.target.value)}
                      style={{
                        width: '100%',
                        height: '38px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'white',
                        padding: '0 10px',
                        fontSize: '14px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="gateway" style={{ background: '#1c1b22', color: 'white' }}>Gateway Bridge (Connected HW)</option>
                      <option value="direct" style={{ background: '#1c1b22', color: 'white' }}>Direct Modbus TCP (Desktop Client)</option>
                    </select>
                  </div>

                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Starting Register Address</label>
                    <input
                      type="number"
                      value={modbusStartReg}
                      onChange={(e) => setModbusStartReg(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="e.g. 2000"
                      style={{
                        width: '100%',
                        height: '38px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'white',
                        padding: '0 12px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Number of Registers {modbusMode === 'gateway' ? '(Max 125)' : '(Chunked)'}</label>
                    <input
                      type="number"
                      value={modbusCount}
                      onChange={(e) => setModbusCount(modbusMode === 'gateway' ? Math.min(125, Math.max(1, parseInt(e.target.value) || 1)) : Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="e.g. 100"
                      style={{
                        width: '100%',
                        height: '38px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'white',
                        padding: '0 12px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Direct Mode Inputs */}
                {modbusMode === 'direct' && (
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '15px' }}>
                    <div style={{ flex: 2, minWidth: '180px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Modbus Device IP Address</label>
                      <input
                        type="text"
                        value={modbusIp}
                        onChange={(e) => setModbusIp(e.target.value)}
                        placeholder="e.g. 192.168.4.1"
                        style={{
                          width: '100%',
                          height: '38px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'white',
                          padding: '0 12px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Port</label>
                      <input
                        type="text"
                        value={modbusPort}
                        onChange={(e) => setModbusPort(e.target.value)}
                        placeholder="502"
                        style={{
                          width: '100%',
                          height: '38px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'white',
                          padding: '0 12px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: '100px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Slave / Unit ID</label>
                      <input
                        type="number"
                        value={modbusSlaveId}
                        onChange={(e) => setModbusSlaveId(e.target.value)}
                        placeholder="1"
                        style={{
                          width: '100%',
                          height: '38px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'white',
                          padding: '0 12px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1.5, minWidth: '130px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>Register Type</label>
                      <select
                        value={modbusRegType}
                        onChange={(e) => setModbusRegType(e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'white',
                          padding: '0 10px',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="holding" style={{ background: '#1c1b22', color: 'white' }}>Holding (FC 03)</option>
                        <option value="input" style={{ background: '#1c1b22', color: 'white' }}>Input (FC 04)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Row 3: Format & Action Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Display Format:</span>
                    <select
                      value={modbusDisplay32 ? '32bit' : '16bit'}
                      onChange={(e) => setModbusDisplay32(e.target.value === '32bit')}
                      style={{
                        height: '30px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        padding: '0 8px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="32bit" style={{ background: '#1c1b22', color: 'white' }}>32-Bit Grouped (Long Endian)</option>
                      <option value="16bit" style={{ background: '#1c1b22', color: 'white' }}>16-Bit Raw Registers</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={triggerModbusRead}
                    disabled={isReadingModbus || (modbusMode === 'gateway' && !connection.type)}
                    style={{ margin: 0, height: '38px', display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', justifyContent: 'center' }}
                  >
                    {isReadingModbus ? (
                      <>
                        <span style={{ width: '12px', height: '12px', border: '2px solid white', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }}></span>
                        Reading Modbus...
                      </>
                    ) : (
                      <>⚡ Query Registers</>
                    )}
                  </button>
                </div>
              </div>

              {modbusError && (
                <div style={{ marginTop: '15px', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.3)', color: '#ff4d4d', padding: '12px', borderRadius: '6px', fontSize: '13px' }}>
                  ⚠️ Error: {modbusError}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>
                  Register Data Grid ({modbusDisplay32 ? Object.keys(grouped32BitData).length : modbusData.length} records shown)
                </h3>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                  Format: Address [Decimal | Hex | Binary]
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px', paddingRight: '5px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {modbusDisplay32 ? (
                    // 32-bit grouped view
                    Object.keys(grouped32BitData).sort((a, b) => parseInt(a) - parseInt(b)).map((key) => {
                      const regAddr = parseInt(key);
                      const val = grouped32BitData[key];
                      if (val === null || val === undefined) {
                        return (
                          <div key={regAddr} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              REG {regAddr} - {regAddr + 1}
                            </span>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                              NULL / TIMEOUT
                            </div>
                          </div>
                        );
                      }

                      const hasNext = (regAddr + 1 - modbusStartReg < modbusData.length);
                      const hexStr = '0x' + val.toString(16).toUpperCase().padStart(8, '0');
                      const binStr = val.toString(2).padStart(32, '0').replace(/(.{4})/g, '$1 ').trim();

                      return (
                        <div key={regAddr} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0, 240, 255, 0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.2s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent-pink)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                              REG {regAddr}{hasNext ? ` - ${regAddr + 1}` : ''} (32-Bit)
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                              {hexStr}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>UINT32 (Unsigned)</div>
                              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-mono)' }}>{val}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>INT32 (Signed)</div>
                              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-mono)' }}>{val | 0}</div>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>FLOAT32 (IEEE-754)</div>
                              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{parseFloat32(val).toFixed(6).replace(/\.?0+$/, "")}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', opacity: 0.8, marginTop: '2px' }}>
                            BIN: {binStr}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // 16-bit raw registers view
                    modbusData.map((val, idx) => {
                      const regAddr = modbusStartReg + idx;
                      if (val === null || val === undefined) {
                        return (
                          <div key={regAddr} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              REG {regAddr}
                            </span>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                              NULL / TIMEOUT
                            </div>
                          </div>
                        );
                      }
                      const hexStr = '0x' + val.toString(16).toUpperCase().padStart(4, '0');
                      const binStr = val.toString(2).padStart(16, '0').replace(/(.{4})/g, '$1 ').trim();
                      return (
                        <div key={regAddr} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.2s ease' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                              REG {regAddr} (16-Bit)
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>
                              {hexStr}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>UINT16 (Unsigned)</div>
                              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-mono)' }}>{val}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>INT16 (Signed)</div>
                              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white', fontFamily: 'var(--font-mono)' }}>{(val << 16) >> 16}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', opacity: 0.8, marginTop: '2px' }}>
                            BIN: {binStr}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {modbusData.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
                      No register data read yet. Configure the parameters above and click "Query Registers".
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ================= VIEW 2: MONGODB DATABASE LOGS ================= */}
          {/* ================= VIEW 2: USB FIRMWARE COMPILER & INSTALLER ================= */}
          <section id="page-firmware-flash" className={`page-view ${activeTab === 'page-firmware-flash' ? 'active' : ''}`}>
            <header className="view-header">
              <div>
                <h1>USB Firmware Compiler & Installer</h1>
                <p>Compile firmware.ino and flash directly to ESP32 Gateway via USB using Arduino CLI</p>
              </div>
            </header>

            <div className="security-layout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

              {/* Arduino-CLI Installer Status Card */}
              <div className="glass-card">
                <h3><span className="icon">📥</span> Arduino-CLI Toolchain Manager</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Arduino CLI is required to compile and flash the firmware source code (.ino) locally.
                </p>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 'bold', textTransform: 'uppercase' }}>Arduino CLI Status</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: cliStatus.installed ? '#00ff66' : '#ff3366' }}>
                      {cliStatus.installed ? `🟢 DETECTED (${cliStatus.source === 'local' ? 'Local' : 'Global'} Version)` : '🔴 NOT DETECTED'}
                    </span>
                  </div>
                  {cliStatus.installed && (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      <strong>Path/Ver:</strong> {cliStatus.version || cliStatus.path}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleDownloadCli}
                    disabled={isInstallingCli}
                    style={{ flex: '1 1 100%', margin: 0 }}
                  >
                    {isInstallingCli ? '📥 Downloading toolchain...' : '📥 Download & Install Arduino CLI'}
                  </button>
                  <button
                    className="btn btn-accent"
                    onClick={() => {
                      ipcRenderer.send('run-global-cli-env-installer');
                      addCliLog('[INSTALL] Requesting UAC elevation to run global PATH environment installer batch file...');
                    }}
                    disabled={!cliStatus.installed}
                    style={{ flex: '1 1 65%', margin: 0, background: 'linear-gradient(135deg, #FF007F 0%, #7F00FF 100%)', border: 'none', color: '#fff' }}
                    title="Configures global system PATH environment variable (requires Admin privileges)"
                  >
                    ⚡ Register Global ENV (Admin)
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={checkCliInstallation}
                    style={{ flex: '1 1 30%', margin: 0, padding: '0 15px' }}
                    title="Re-verify toolchain installation status"
                  >
                    🔄 Verify
                  </button>
                </div>
              </div>

              {/* USB Compile & Flash Control Card */}
              <div className="glass-card">
                <h3><span className="icon">⚡</span> USB / Serial Flash Controller</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  Choose your target board serial COM port and FQBN architecture to compile & upload.
                </p>

                <div className="input-group">
                  <label>Select Target COM Port</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={selectedSerialPort}
                      onChange={(e) => setSelectedSerialPort(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      {serialPorts.length === 0 ? (
                        <option value="">No COM ports scanned</option>
                      ) : (
                        serialPorts.map(p => <option key={p.path} value={p.path}>{p.path} — {p.manufacturer || 'Generic'}</option>)
                      )}
                    </select>
                    <button className="btn btn-secondary small" style={{ height: '38px', padding: '0 10px', minWidth: 'auto' }} onClick={refreshPorts}>&#8635;</button>
                  </div>
                </div>

                <div className="input-group">
                  <label>Board FQBN target</label>
                  <input
                    type="text"
                    value={arduinoFqbn}
                    onChange={(e) => {
                      setArduinoFqbn(e.target.value);
                      localStorage.setItem('arduino_fqbn', e.target.value);
                    }}
                    placeholder="esp32:esp32:esp32s3"
                  />
                </div>

                <button
                  className="btn btn-accent"
                  onClick={handleUsbFlash}
                  disabled={isFlashingUsb || !cliStatus.installed || !selectedSerialPort}
                  style={{ width: '100%', margin: 0, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isFlashingUsb ? '⚡ Compiling & Flashing...' : '⚡ Compile & Upload Firmware'}
                </button>
              </div>

              {/* Software Downloads & Database Templates Card */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3><span className="icon">📦</span> Setup Resources & Database URLs</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '5px' }}>
                  Quick setup guides, software downloads, and preformatted MongoDB connection strings.
                </p>

                {/* Connection Strings Copy Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                  <span style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MongoDB URI Templates</span>

                  {[
                    { label: 'Local Host Connection', val: 'mongodb://127.0.0.1:27017/IOT_Monitor_System' },
                    { label: 'Atlas Cloud Database', val: 'mongodb+srv://<username>:<password>@cluster.mongodb.net/IOT_Monitor_System' },
                    { label: 'Docker Container Network', val: 'mongodb://mongodb_container:27017/IOT_Monitor_System' },
                    { label: 'Local Replica Set', val: 'mongodb://127.0.0.1:27017,127.0.0.1:27018/IOT_Monitor_System?replicaSet=rs0' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{item.label}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          readOnly
                          value={item.val}
                          style={{ flex: 1, fontSize: '10.5px', fontFamily: 'var(--font-mono)', background: 'transparent', border: 'none', color: '#ccc', margin: 0, padding: 0 }}
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          className="btn btn-secondary small"
                          onClick={() => copyToClipboard(item.val, idx)}
                          style={{ margin: 0, padding: '2px 8px', fontSize: '9.5px', height: '22px', minWidth: '55px' }}
                        >
                          {copiedTextIndex === idx ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Software Downloads Section */}
                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--accent-pink)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Tool Downloads</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <a
                      href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary small"
                      style={{ margin: 0, fontSize: '10.5px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textDecoration: 'none' }}
                    >
                      🔌 CP210x USB to UART Driver
                    </a>
                    <a
                      href="https://arduino.github.io/arduino-cli/latest/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary small"
                      style={{ margin: 0, fontSize: '10.5px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textDecoration: 'none' }}
                    >
                      🤖 Arduino CLI Official Download
                    </a>
                    <a
                      href="https://mongodb.com/try/download/community"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary small"
                      style={{ margin: 0, fontSize: '10.5px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textDecoration: 'none' }}
                    >
                      🍃 MongoDB Community Server
                    </a>
                  </div>
                </div>
              </div>

            </div>

            {/* Dedicated compiler console logs */}
            <div className="glass-card" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3><span className="icon">📟</span> Toolchain Logs & Compiler Terminal</h3>
                <button
                  className="btn btn-secondary small"
                  style={{ width: 'auto', padding: '4px 12px', fontSize: '11px', height: '26px' }}
                  onClick={() => setCliConsoleLogs([])}
                >
                  Clear Terminal
                </button>
              </div>

              <div className="console-box" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                <div className="console-terminal" style={{ padding: '12px' }}>
                  {cliConsoleLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '20px', textAlign: 'center' }}>
                      Awaiting toolchain installation or firmware compilation triggers...
                    </div>
                  ) : (
                    cliConsoleLogs.map((log, idx) => (
                      <div key={idx} className={`terminal-line ${log.type}`}>
                        [{log.time}] {log.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ================= VIEW: DEVICE REGISTRY (PROMOTED) ================= */}
          <section id="page-device-registry" className={`page-view ${activeTab === 'page-device-registry' ? 'active' : ''}`}>
            <header className="view-header">
              <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h1>Device Configuration Registry</h1>
                  <p>Register and manage configurations associated with specific device IMEI identifiers</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>

                  {/* MongoDB Connection input */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--accent-pink)', margin: 0, letterSpacing: '0.05em' }}>MongoDB Connection URL</label>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={dbUriInput}
                        onChange={(e) => setDbUriInput(e.target.value)}
                        placeholder="mongodb://127.0.0.1:27017/IOT_System_Manager"
                        style={{ width: '240px', fontSize: '11px', padding: '4px 10px', height: '28px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '6px', margin: 0 }}
                      />
                      <button
                        className="btn btn-secondary"
                        style={{ height: '28px', minWidth: 'auto', padding: '0 12px', fontSize: '11px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        onClick={triggerDbReconnect}
                        disabled={isReconnectingDb}
                      >
                        {isReconnectingDb ? '...' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  {/* Lock toggle switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)', height: '28px', boxShadow: isRegistryLocked ? 'none' : '0 0 15px rgba(0,255,100,0.1)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: isRegistryLocked ? '#ff3366' : '#00ff66', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isRegistryLocked ? '🔒 Locked' : '🔓 Unlocked'}
                    </span>
                    <label className="switch-toggle" style={{ margin: 0 }}>
                      <input type="checkbox" checked={!isRegistryLocked} onChange={(e) => {
                        setIsRegistryLocked(!e.target.checked);
                        if (!e.target.checked) {
                          setEditingDeviceImei(null);
                          setRegImei('');
                          setRegPcb('');
                          setRegRemarks('');
                          setRegPass('admin_secure_gate');
                          setRegSsid('');
                          setRegWifiPass('');
                          setRegInterval('1500');
                          setRegDeviceNumber('1');
                        }
                      }} />
                      <span className="switch-slider"></span>
                    </label>
                  </div>

                </div>
              </div>
            </header>

            <div className="security-layout-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%', height: 'calc(100vh - 175px)', minHeight: '520px' }}>
              {/* Registry Form */}
              <div className="glass-card" style={{ flex: '0 0 250px', width: '250px', minWidth: '250px', border: editingDeviceImei ? '1px solid rgba(0, 122, 255, 0.4)' : '1px solid var(--glass-border)', boxShadow: editingDeviceImei ? '0 0 20px rgba(0, 122, 255, 0.15)' : 'none', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <h3><span className="icon">📝</span> {editingDeviceImei ? 'Modify Device Profile' : 'Register Device Config'}</h3>
                  {editingDeviceImei ? (
                    <span style={{ fontSize: '11px', background: 'rgba(0,122,255,0.15)', color: '#007aff', border: '1px solid rgba(0,122,255,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Update Mode
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', background: 'rgba(0,255,100,0.15)', color: '#00ff66', border: '1px solid rgba(0,255,100,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Insert Mode
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Register or modify settings associated with a specific device IMEI ID. Settings automatically sync upon connection.
                </p>

                <form onSubmit={handleRegisterDevice} style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                  <div className="input-group">
                    <label>Device IMEI ID *</label>
                    <input
                      type="text"
                      value={regImei}
                      onChange={(e) => setRegImei(e.target.value)}
                      placeholder="e.g. 866738083623502"
                      required
                      disabled={isRegistryLocked || !!editingDeviceImei}
                      style={{ opacity: editingDeviceImei ? 0.6 : 1 }}
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
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div className="input-group">
                    <label>PCB Serial Number</label>
                    <input
                      type="text"
                      value={regPcb}
                      onChange={(e) => setRegPcb(e.target.value)}
                      placeholder="e.g. PCB-ESP32-v3-987"
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div className="input-group">
                    <label>Gateway Password</label>
                    <input
                      type="password"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      placeholder="Device credentials password"
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div className="input-group">
                    <label>Target Router SSID</label>
                    <input
                      type="text"
                      value={regSsid}
                      onChange={(e) => setRegSsid(e.target.value)}
                      placeholder="SSID of Wireless Router"
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div className="input-group">
                    <label>Router Password</label>
                    <input
                      type="password"
                      value={regWifiPass}
                      onChange={(e) => setRegWifiPass(e.target.value)}
                      placeholder="Router WPA2 Passphrase"
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div className="input-group">
                    <label>Device Mode / Protocol</label>
                    <select
                      value={regDeviceMode}
                      onChange={(e) => setRegDeviceMode(e.target.value)}
                      disabled={isRegistryLocked}
                      style={{
                        width: '100%',
                        height: '38px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--glass-border)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '0 10px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="solaryan inverter">SolarYan Inverter</option>
                      <option value="solaryan inverter + 3 phase meter">SolarYan Inverter + 3 Phase Meter</option>
                      <option value="solaryan 3 phase inverter + meter">SolarYan 3 Phase Inverter + Meter</option>
                      <option value="solaryan 3 phase inverter + 3 phase meter">SolarYan 3 Phase Inverter + 3 Phase Meter</option>
                      <option value="DLMS">DLMS</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Telemetry Interval (ms)</label>
                    <input
                      type="number"
                      value={regInterval}
                      onChange={(e) => setRegInterval(e.target.value)}
                      placeholder="1500"
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div className="input-group">
                    <label>Remarks</label>
                    <input
                      type="text"
                      value={regRemarks}
                      onChange={(e) => setRegRemarks(e.target.value)}
                      placeholder="e.g. Medha Station Gateway"
                      disabled={isRegistryLocked}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isRegisteringDevice || isRegistryLocked}
                      style={{ flex: 2, margin: 0 }}
                    >
                      {isRegistryLocked ? '🔒 Locked' : isRegisteringDevice ? 'Saving...' : editingDeviceImei ? 'Update Profile' : 'Insert Profile'}
                    </button>
                    {editingDeviceImei && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1, margin: 0 }}
                        onClick={() => {
                          setEditingDeviceImei(null);
                          setRegImei('');
                          setRegPcb('');
                          setRegPass('admin_secure_gate');
                          setRegSsid('');
                          setRegWifiPass('');
                          setRegInterval('1500');
                          setRegDeviceNumber('1');
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Registered Devices List Table */}
              <div className="glass-card" style={{ flex: '1 1 calc(100% - 270px)', minWidth: '450px', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                <h3><span className="icon">📡</span> Registered Device Profiles ({registeredDevices.length})</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                  List of device configurations registered inside the MongoDB database.
                </p>

                <div style={{ overflowY: 'auto', overflowX: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)', flex: 1 }}>
                  {registeredDevices.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#707090', fontStyle: 'italic' }}>
                      No configurations found in database registry. Fill form to register.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent-pink)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Device #</th>
                          <th style={{ padding: '8px' }}>IMEI / PCB Serial</th>
                          <th style={{ padding: '8px' }}>Mode</th>
                          <th style={{ padding: '8px' }}>Remarks</th>
                          <th style={{ padding: '8px' }}>Net Status</th>
                          <th style={{ padding: '8px' }}>Target Address</th>
                          <th style={{ padding: '8px' }}>MAC</th>
                          <th style={{ padding: '8px' }}>Last Online</th>
                          <th style={{ padding: '8px' }}>Reg Method</th>
                          <th style={{ padding: '8px' }}>Interval</th>
                          <th style={{ padding: '8px' }}>RS232</th>
                          <th style={{ padding: '8px' }}>RS485</th>
                          <th style={{ padding: '8px' }}>GPRS</th>
                          <th style={{ padding: '8px' }}>AP</th>
                          <th style={{ padding: '8px' }}>Bus</th>
                          <th style={{ padding: '8px' }}>Driver</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...registeredDevices].sort((a, b) => (a.deviceNumber || 0) - (b.deviceNumber || 0)).map((dev) => {
                          const isCurrentConnected = connection.type && (imei === dev.imei || connection.target.includes(dev.target) || (dev.mac && connection.target.includes(dev.mac.replace(/:/g, ''))));
                          const inDiscoveredGateways = discoveredGateways.some(g => g.imei === dev.imei || (g.mac && dev.mac && g.mac.replace(/:/g, '').toLowerCase() === dev.mac.replace(/:/g, '').toLowerCase()));
                          const inNearbyHotspots = dev.mac && nearbyHotspots.some(ssid => ssid.toLowerCase().includes(dev.mac.replace(/:/g, '').toLowerCase())) || (dev.routerSSID && nearbyHotspots.some(ssid => ssid.toLowerCase() === dev.routerSSID.toLowerCase()));
                          const isFound = isCurrentConnected || inDiscoveredGateways || inNearbyHotspots;

                          return (
                            <tr key={dev._id || dev.imei || dev.pcbNumber} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e0e0f0' }}>
                              <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                                #{dev.deviceNumber || '1'}
                              </td>
                              <td style={{ padding: '8px' }}>
                                <div style={{ fontWeight: 'bold', color: 'white' }}>{dev.imei || '(no IMEI)'}</div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{dev.pcbNumber || 'No PCB Serial'}</div>
                              </td>
                              <td style={{ padding: '8px', fontSize: '11px', textTransform: 'capitalize' }}>
                                <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{dev.deviceMode || 'solaryan inverter'}</span>
                              </td>
                              <td style={{ padding: '8px', fontSize: '11px', color: 'var(--text-dim)' }}>
                                {dev.remarks || '--'}
                              </td>
                              <td style={{ padding: '8px' }}>
                                {isFound ? (
                                  <span className="status-tag ok" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '10px', minWidth: '55px', textAlign: 'center' }}>
                                    ONLINE
                                  </span>
                                ) : (
                                  <span className="status-tag err" style={{ display: 'inline-block', padding: '2px 6px', fontSize: '10px', minWidth: '55px', textAlign: 'center', background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', color: '#ff3333' }}>
                                    STOP
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px', fontSize: '11px' }}>
                                <span style={{ fontWeight: 'bold', color: '#ffbb00' }}>{dev.connectionType ? dev.connectionType.toUpperCase() : 'N/A'}</span>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{dev.target || '--'}</div>
                              </td>
                              <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: '10.5px' }}>{dev.mac || 'N/A'}</td>
                              <td style={{ padding: '8px', fontSize: '10.5px' }}>
                                {dev.lastOnline ? new Date(dev.lastOnline).toLocaleString() : 'Never'}
                              </td>
                              <td style={{ padding: '8px', fontSize: '10.5px', textTransform: 'capitalize' }}>
                                <span style={{ color: dev.registrationMethod === 'auto' ? 'var(--accent-pink)' : '#00ff66' }}>
                                  {dev.registrationMethod || 'manual'}
                                </span>
                              </td>
                              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{dev.telemetryInterval}ms</td>
                              <td style={{ padding: '8px' }}>
                                <span className={`status-tag ${dev.rs232Status === 'OK' ? 'ok' : dev.rs232Status === 'ERROR' ? 'err' : 'wait'}`} style={{ padding: '2px 6px', fontSize: '9px', minWidth: '45px', textAlign: 'center', display: 'inline-block' }}>
                                  {dev.rs232Status || 'WAITING'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className={`status-tag ${dev.rs485Status === 'OK' ? 'ok' : dev.rs485Status === 'ERROR' ? 'err' : 'wait'}`} style={{ padding: '2px 6px', fontSize: '9px', minWidth: '45px', textAlign: 'center', display: 'inline-block' }}>
                                  {dev.rs485Status || 'WAITING'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className={`status-tag ${dev.gprsStatus === 'OK' ? 'ok' : dev.gprsStatus === 'ERROR' ? 'err' : 'wait'}`} style={{ padding: '2px 6px', fontSize: '9px', minWidth: '45px', textAlign: 'center', display: 'inline-block' }}>
                                  {dev.gprsStatus || 'WAITING'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className={`status-tag ${dev.apStatus === 'OK' ? 'ok' : dev.apStatus === 'ERROR' ? 'err' : 'wait'}`} style={{ padding: '2px 6px', fontSize: '9px', minWidth: '45px', textAlign: 'center', display: 'inline-block' }}>
                                  {dev.apStatus || 'WAITING'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className={`status-tag ${dev.busStatus === 'OK' ? 'ok' : dev.busStatus === 'ERROR' ? 'err' : 'wait'}`} style={{ padding: '2px 6px', fontSize: '9px', minWidth: '45px', textAlign: 'center', display: 'inline-block' }}>
                                  {dev.busStatus || 'WAITING'}
                                </span>
                              </td>
                              <td style={{ padding: '8px' }}>
                                <span className={`status-tag ${dev.driverStatus === 'OK' ? 'ok' : dev.driverStatus === 'ERROR' ? 'err' : 'wait'}`} style={{ padding: '2px 6px', fontSize: '9px', minWidth: '45px', textAlign: 'center', display: 'inline-block' }}>
                                  {dev.driverStatus || 'WAITING'}
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-primary small"
                                    style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto', background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)', color: '#00f0ff' }}
                                    onClick={() => {
                                      const val = dev._id || dev.imei || dev.pcbNumber;
                                      setSelectedRegDeviceImei(val);
                                      setPcbNumber(dev.pcbNumber || '');
                                      setImei(dev.imei || '');
                                      if (dev.mac) setMac(dev.mac);
                                      if (dev.routerSSID) setWifiRouterSsid(dev.routerSSID);
                                      if (dev.routerPassword) setWifiRouterPass(dev.routerPassword);
                                      setActiveTab('page-dashboard');
                                      addLogLine(`[GUI] Switched active controller target to Device #${dev.deviceNumber || '1'} (${dev.pcbNumber || dev.imei})`, 'success');
                                    }}
                                  >
                                    Control
                                  </button>
                                  <button
                                    className="btn btn-secondary small"
                                    style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto', opacity: isRegistryLocked ? 0.5 : 1 }}
                                    disabled={isRegistryLocked}
                                    onClick={() => {
                                      setRegImei(dev.imei);
                                      setRegPcb(dev.pcbNumber || '');
                                      setRegPass(dev.password || 'admin_secure_gate');
                                      setRegSsid(dev.routerSSID || '');
                                      setRegWifiPass(dev.routerPassword || '');
                                      setRegInterval(String(dev.telemetryInterval || 1500));
                                      setRegDeviceNumber(String(dev.deviceNumber || 1));
                                      setRegDeviceMode(dev.deviceMode || 'solaryan inverter');
                                      setRegRemarks(dev.remarks || '');
                                      setEditingDeviceImei(dev.imei);
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
                                    style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px', minWidth: 'auto', background: 'rgba(255, 0, 85, 0.1)', border: '1px solid rgba(255, 0, 85, 0.3)', color: '#ff0055', opacity: isRegistryLocked ? 0.5 : 1 }}
                                    disabled={isRegistryLocked}
                                    onClick={() => handleDeleteDevice(dev._id || dev.imei, dev.imei || dev.pcbNumber || 'Unnamed Device')}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            {/* Relocated Database Telemetry History Logs Section */}
            <div className="glass-card" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                  <h3><span className="icon">📊</span> Telemetry Database History Logs ({dbHistory.length} logs)</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Review telemetry snapshot logs stored inside MongoDB database</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-secondary small" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', height: '30px' }} onClick={fetchDatabaseHistory}>🔄 Refresh Logs</button>
                  <button className="btn btn-danger small" style={{ width: 'auto', padding: '6px 12px', fontSize: '11px', height: '30px', background: 'rgba(255, 50, 50, 0.1)', border: '1px solid rgba(255, 50, 50, 0.3)', color: '#ff3333' }} onClick={clearDatabaseLogs}>Clear database logs</button>
                </div>
              </div>

              {dbHistory.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                  No telemetry logs found inside MongoDB database. Run telemetry streaming to record.
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

                  <div className="db-table-body" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {dbHistory.map((record) => {
                      const isExpanded = expandedLogId === record._id || expandedLogId === record.timestamp;
                      const recordId = record._id || record.timestamp;

                      return (
                        <div key={recordId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 140px 140px 85px 85px 85px 1fr', padding: '12px 20px', fontSize: '12px', alignItems: 'center' }}>
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
                            <button className="btn btn-secondary small-btn" style={{ marginLeft: 'auto', minWidth: '70px', padding: '4px', height: '24px', fontSize: '10.5px' }} onClick={() => setExpandedLogId(isExpanded ? null : recordId)}>
                              {isExpanded ? 'Hide' : 'Expand'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div style={{ padding: '20px 25px', background: 'rgba(3, 0, 10, 0.5)', borderTop: '1px dashed var(--glass-border)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>Device Profile</div>
                                  <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                    <div><strong>IMEI ID:</strong> {record.imei || 'N/A'}</div>
                                    <div><strong>MAC Address:</strong> {record.mac || 'N/A'}</div>
                                    <div><strong>PCB Serial:</strong> {record.pcbNumber || 'N/A'}</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>Network Link</div>
                                  <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                    <div><strong>Interface:</strong> {(record.connectionType || 'tcp').toUpperCase()}</div>
                                    <div><strong>Connection Target:</strong> {record.target || 'N/A'}</div>
                                    <div><strong>Telemetry Interval:</strong> {record.telemetryInterval || 1500} ms</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>WIFI Configurations</div>
                                  <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                    <div><strong>Router SSID:</strong> {record.routerSSID || 'N/A'}</div>
                                    <div><strong>Router Password:</strong> {record.routerPassword ? '••••••••' : 'N/A'}</div>
                                    <div><strong>Gateway Credentials:</strong> {record.password || 'admin_secure_gate'}</div>
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--accent-pink)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>Peripherals Status</div>
                                  <div style={{ fontSize: '11px', lineHeight: '1.4', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 15px' }}>
                                    <div><strong>RS232:</strong> <span style={{ color: record.rs232Status === 'OK' ? '#00ff66' : record.rs232Status === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.rs232Status || 'WAITING'}</span></div>
                                    <div><strong>RS485:</strong> <span style={{ color: record.rs485Status === 'OK' ? '#00ff66' : record.rs485Status === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.rs485Status || 'WAITING'}</span></div>
                                    <div><strong>GPRS:</strong> <span style={{ color: record.gprsStatus === 'OK' ? '#00ff66' : record.gprsStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.gprsStatus || 'WAITING'}</span></div>
                                    <div><strong>AP:</strong> <span style={{ color: record.apStatus === 'OK' ? '#00ff66' : record.apStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.apStatus || 'WAITING'}</span></div>
                                    <div><strong>Bus:</strong> <span style={{ color: record.busStatus === 'OK' ? '#00ff66' : record.busStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.busStatus || 'WAITING'}</span></div>
                                    <div><strong>Driver:</strong> <span style={{ color: record.driverStatus === 'OK' ? '#00ff66' : record.driverStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.driverStatus || 'WAITING'}</span></div>
                                    <div><strong>Flash:</strong> <span style={{ color: record.flashStatus === 'OK' ? '#00ff66' : record.flashStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.flashStatus || 'WAITING'}</span></div>
                                    <div><strong>DI Pin:</strong> <span style={{ color: record.diStatus === 'OK' ? '#00ff66' : record.diStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.diStatus || 'WAITING'}</span></div>
                                    <div><strong>RTC Clock:</strong> <span style={{ color: record.rtcStatus === 'OK' ? '#00ff66' : record.rtcStatus === 'ERROR' ? '#ff3366' : '#ffaa00' }}>{record.rtcStatus || 'WAITING'}</span></div>
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
                      <option value="qcom" style={{ background: '#1c1b22', color: 'white' }}>Quectel Co-processor (core partition)</option>
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
                      <p>Connect PC WiFi to the `RMS-FIRMWARE-XXXXXX` SoftAP network.</p>
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
                borderColor: (certStatuses['rootCA.pem'] === 'success' && certStatuses['client.pem'] === 'success' && certStatuses['key.pem'] === 'success') ? '#00ff66' : 'var(--glass-border)',
                boxShadow: (certStatuses['rootCA.pem'] === 'success' && certStatuses['client.pem'] === 'success' && certStatuses['key.pem'] === 'success') ? '0 0 25px rgba(0, 255, 100, 0.25)' : 'var(--glow-theme)'
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
                    <option value="qcom">2. Store directly to Quectel-L40 co-processor</option>
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
                  style={{ marginTop: '15px', width: '100%', height: '42px', background: (certStatuses['rootCA.pem'] === 'success' && certStatuses['client.pem'] === 'success' && certStatuses['key.pem'] === 'success') ? '#00cc55' : 'var(--accent-primary)' }}
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

                {/* Drag & Drop Upload Zone (merged) */}
                <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent-blue)', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📁 Certificate File Upload (Drag & Drop):
                  </span>
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
                      padding: '20px 15px',
                      borderColor: (isCertUploading || isUploadingUuid) ? 'var(--accent-blue)' : 'var(--glass-border)',
                      opacity: (connection.type && connection.type !== 'failed') ? 1 : 0.5,
                      cursor: (connection.type && connection.type !== 'failed') ? 'pointer' : 'not-allowed',
                      textAlign: 'center',
                      border: '2px dashed var(--glass-border)',
                      borderRadius: '8px',
                      background: 'rgba(3, 0, 10, 0.4)'
                    }}
                  >
                    <div className="drop-icon" style={{ fontSize: '20px', marginBottom: '6px' }}>&#128228;</div>
                    <h4 style={{ fontSize: '12px' }}>Drag & Drop Certificate or JSON here</h4>
                    <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Supports .pem, .crt, .key, .json</p>
                  </div>
                </div>

                {/* UUID Token Input Area */}
                <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
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
                      <span className="progress-status" style={{ fontSize: '11px' }}>
                        {isUploadingUuid ? 'Syncing uuid.json to ESP32 SPIFFS...' : 'Syncing to ESP32 SPIFFS & QCOM...'}
                      </span>
                      <span className="progress-percent" style={{ fontSize: '11px' }}>{certUploadProgress}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${certUploadProgress}%`, background: 'var(--grad-emerald-cyan)' }}></div>
                    </div>
                  </div>
                )}
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
                    const status = certStatuses['rootCA.pem'] === 'downloading' ? 'running' :
                      (certStatuses['rootCA.pem'] === 'downloaded' || certStatuses['rootCA.pem'] === 'uploading' || certStatuses['rootCA.pem'] === 'success') ? 'success' :
                        certStatuses['rootCA.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Download CA Certificate', 'GET certificate from root authority', status);
                  })()}

                  {/* Step 2: Download Client Certificate */}
                  {(() => {
                    const status = certStatuses['client.pem'] === 'downloading' ? 'running' :
                      (certStatuses['client.pem'] === 'downloaded' || certStatuses['client.pem'] === 'uploading' || certStatuses['client.pem'] === 'success') ? 'success' :
                        certStatuses['client.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Download Client Certificate', 'GET device-authentication certificate', status);
                  })()}

                  {/* Step 3: Download Private Key */}
                  {(() => {
                    const status = certStatuses['key.pem'] === 'downloading' ? 'running' :
                      (certStatuses['key.pem'] === 'downloaded' || certStatuses['key.pem'] === 'uploading' || certStatuses['key.pem'] === 'success') ? 'success' :
                        certStatuses['key.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Download Private Key', 'GET device private RSA/ECC key', status);
                  })()}

                  {/* Step 4: Upload CA to Device */}
                  {(() => {
                    const status = certStatuses['rootCA.pem'] === 'uploading' ? 'running' :
                      certStatuses['rootCA.pem'] === 'success' ? 'success' :
                        certStatuses['rootCA.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Upload CA to Device', 'POST CA file with Bearer Authorization', status);
                  })()}

                  {/* Step 5: Upload Cert to Device */}
                  {(() => {
                    const status = certStatuses['client.pem'] === 'uploading' ? 'running' :
                      certStatuses['client.pem'] === 'success' ? 'success' :
                        certStatuses['client.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Upload Cert to Device', 'POST Client cert with Bearer Authorization', status);
                  })()}

                  {/* Step 6: Upload Key to Device */}
                  {(() => {
                    const status = certStatuses['key.pem'] === 'uploading' ? 'running' :
                      certStatuses['key.pem'] === 'success' ? 'success' :
                        certStatuses['key.pem'] === 'failed' ? 'failed' : 'pending';
                    return renderPipelineStep('Upload Key to Device', 'POST Private key with Bearer Authorization', status);
                  })()}

                  {/* Step 7: Acknowledgement Signal */}
                  {(() => {
                    const allSuccess = certStatuses['rootCA.pem'] === 'success' &&
                      certStatuses['client.pem'] === 'success' &&
                      certStatuses['key.pem'] === 'success';
                    const anyFailed = certStatuses['rootCA.pem'] === 'failed' ||
                      certStatuses['client.pem'] === 'failed' ||
                      certStatuses['key.pem'] === 'failed';
                    const status = allSuccess ? 'success' :
                      anyFailed ? 'failed' :
                        (isDownloadingCerts || isProvisioning) ? 'running' : 'pending';
                    return renderPipelineStep('Acknowledgement Signal', 'Send completion confirmation status', status);
                  })()}
                </div>
              </div>

            </div>

            {/* Middle Section: Inverter & Meter Partition Config */}
            <div style={{ marginTop: '20px' }}>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3><span className="icon">📟</span> Inverter & Meter Partition Configuration</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '20px' }}>
                  Select the physical hardware layout for the SCADA node. Pushing configurations will write device profiles to the SPIFFS/PSRAM config partition and persist bus settings forever.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div className="input-group">
                    <label>Configuration Source</label>
                    <select
                      value={configSourceType}
                      onChange={(e) => {
                        setConfigSourceType(e.target.value);
                        if (e.target.value === 'wizard') {
                          setConfigFileName('');
                          setConfigFileContent('');
                        }
                      }}
                      style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                    >
                      <option value="wizard">Predefined Layout (Wizard)</option>
                      <option value="file_json">Custom JSON File</option>
                      <option value="file_csv">Custom CSV File</option>
                    </select>
                  </div>

                  {configSourceType === 'wizard' ? (
                    <div className="input-group">
                      <label>Selected Device Layout</label>
                      <select
                        value={inverterMeterType}
                        onChange={(e) => setInverterMeterType(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                      >
                        <option value="solar_yan_inverter_single">Solar Yan Inverter (Single)</option>
                        <option value="inverter_single_meter_single">Inverter (Single) + Meter (Single)</option>
                        <option value="inverter_3phase_meter_single">Inverter (3-Phase) + Meter (Single)</option>
                        <option value="inverter_3phase_meter_3phase">Inverter (3-Phase) + Meter (3-Phase)</option>
                        <option value="dlms_meter">DLMS Meter</option>
                      </select>
                    </div>
                  ) : (
                    <div className="input-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label>Import Configuration File</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => document.getElementById('config-file-importer').click()}
                          style={{ margin: 0, padding: '8px 14px', fontSize: '11px', height: '36px' }}
                        >
                          📂 Import File
                        </button>
                        <input
                          type="file"
                          id="config-file-importer"
                          accept={configSourceType === 'file_json' ? '.json' : '.csv'}
                          onChange={handleImportConfigFile}
                          style={{ display: 'none' }}
                        />
                        {configFileName ? (
                          <span style={{ fontSize: '11px', color: 'var(--accent-emerald)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={configFileName}>
                            ✓ {configFileName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No file selected</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="input-group">
                    <label>Device Bus ID (Modbus Slave ID)</label>
                    <input
                      type="number"
                      value={busDataId}
                      onChange={(e) => setBusDataId(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div className="input-group">
                    <label>Bus Baud Rate (bps)</label>
                    <select
                      value={busBaudRate}
                      onChange={(e) => setBusBaudRate(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '10px', background: 'var(--input-bg)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                    >
                      <option value="9600">9600</option>
                      <option value="115200">115200</option>
                    </select>
                  </div>
                </div>

                <button
                  className="btn btn-accent"
                  onClick={handleUploadConfigPartition}
                  disabled={!connection.type || isUploadingConfigPartition}
                  style={{ width: '100%', height: '40px' }}
                >
                  {isUploadingConfigPartition ? 'Uploading Config to Partition...' : '💾 Upload Config Partition & Bus Data'}
                </button>

                {isUploadingConfigPartition && (
                  <div className="ota-progress-pane" style={{ marginTop: '15px' }}>
                    <div className="progress-details">
                      <span className="progress-status" style={{ fontSize: '12px' }}>Uploading config blocks to SPIFFS/PSRAM config partition...</span>
                      <span className="progress-percent" style={{ fontSize: '12px' }}>{configPartitionProgress}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '6px' }}>
                      <div className="progress-bar-fill" style={{ width: `${configPartitionProgress}%`, background: 'var(--grad-cyan-purple)' }}></div>
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
            {/* Added GitHub Code Sync card */}
            {/* <div className="glass-card" style={{ marginTop: '20px' }}>
              <h3><span className="icon">🔄</span> GitHub App Code Auto-Updater</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                Pull the latest javascript, styling, and firmware source files directly from your GitHub repository to update the app dynamically without reinstalling the full .exe.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 180px', gap: '15px', alignItems: 'flex-end' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>GitHub Repository URL</label>
                  <input
                    type="text"
                    value={gitHubRepoUrlInput}
                    onChange={(e) => setGitHubRepoUrlInput(e.target.value)}
                    placeholder="https://github.com/Username/RepoName"
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Branch / Head target</label>
                  <input
                    type="text"
                    value={gitHubRepoBranchInput}
                    onChange={(e) => setGitHubRepoBranchInput(e.target.value)}
                    placeholder="main"
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleGitHubSync}
                  disabled={isGitHubSyncing}
                  style={{ height: '38px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {isGitHubSyncing ? 'Syncing...' : '🔄 Pull Latest Code'}
                </button>
              </div>
            </div> */}
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
                    <span className="spec-value highlight-blue">{wifiDetails.ap_ssid && wifiDetails.ap_ssid !== '--' ? wifiDetails.ap_ssid : `RMS-FIRMWARE-${(wifiDetails.mac_ap || mac || '').replace(/:/g, '').slice(-6).toUpperCase()}`}</span>
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

            <div className="gprs-modal-body" style={{ display: 'flex', gap: '20px', flexDirection: 'row', flexWrap: 'wrap' }}>

              {/* Left Column (60% width) */}
              <div style={{ flex: '3 1 60%', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '350px' }}>
                <div className="gprs-modal-info">
                  Sends commands to the active interface. Responses will display in the console log stream below.
                </div>

                {/* Terminal Logs View */}
                <div className="gprs-modal-terminal" style={{ flexGrow: 1, minHeight: '300px' }}>
                  {consoleLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontStyle: 'italic', padding: '10px' }}>No terminal logs available.</div>
                  ) : (
                    consoleLogs.map((log, idx) => (
                      <div key={idx} className={`terminal-line ${log.type}`} style={{ fontSize: '12px', margin: '3px 0' }}>
                        [{log.time}] {log.text}
                      </div>
                    ))
                  )}
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

              {/* Right Column (40% width) - Live Debug Checklist Box */}
              <div className="debug-checklist-box" style={{ flex: '2 1 35%', minWidth: '250px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '15px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, color: 'var(--accent-pink)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Real-Time Diagnostics</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>
                  Active gateway telemetry parameter self-checks and debug testing triggers:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {[
                    { key: 'rs232', name: 'RS232 Interface' },
                    { key: 'rs485', name: 'RS485 Interface' },
                    { key: 'gprs', name: 'GPRS GSM Modem' },
                    { key: 'ap', name: 'AP Module' },
                    { key: 'bus', name: 'BUS Module' },
                    { key: 'driver', name: 'Driver Pin' },
                    { key: 'flash', name: 'SPIFFS Flash' },
                    { key: 'di', name: 'Digital Input' },
                    { key: 'rtc', name: 'RTC Clock' }
                  ].map((m) => {
                    const status = diagnostics[m.key] || 'WAITING';
                    const color = (status === 'OK' || status === 'PASSED' || status === 'PASS')
                      ? 'var(--accent-emerald)'
                      : ((status === 'ERROR' || status === 'FAILED' || status === 'FAIL') ? 'var(--accent-pink)' : 'orange');
                    return (
                      <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{m.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Status: <span style={{ color, fontWeight: 'bold' }}>{status}</span></div>
                        </div>
                        <button className="btn btn-secondary small" style={{ margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px' }} onClick={() => testModule(m.key)} disabled={!connection.type}>Test</button>
                      </div>
                    );
                  })}
                </div>

                {/* ESP32 Heartbeat State */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>ESP32 System Clock</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Uptime: {systemInfo.uptime || 'N/A'} s</div>
                  </div>
                  <button className="btn btn-secondary small" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', margin: 0, padding: '2px 8px', fontSize: '10px', height: '22px' }} onClick={() => { addLogLine('[CMD] Triggering ESP32 reboot...'); sendControlCommand('REBOOT'); }} disabled={!connection.type}>Reboot</button>
                </div>
              </div>

              <div style={{ background: 'rgba(112,0,255,0.05)', border: '1px solid rgba(112,0,255,0.15)', borderRadius: '6px', padding: '10px', fontSize: '11px', marginTop: '10px' }}>
                💡 <strong>Hardware Self-Check:</strong> Triggering self-checks updates parameters directly in the main console and logs test operations to the active system logs.
              </div>
            </div>

          </div>
        </div>
      )}

      {showAccountModal && (
        <div
          className="gprs-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 2, 8, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            ref={accountModalRef}
            style={{
              width: '50vw',
              minWidth: '850px',
              height: '80vh',
              minHeight: '550px',
              background: '#0e0b1e', // Solid premium dark background
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 240, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                👤 System Account & Settings Manager
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px',
                  lineHeight: '1'
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body Grid */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Left Navigation Sidebar */}
              <div
                style={{
                  width: '230px',
                  borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(0, 0, 0, 0.15)',
                  padding: '15px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  overflowY: 'auto'
                }}
              >
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'profile' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'profile' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('profile')}
                >
                  👤 Admin Session Info
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'db-settings' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'db-settings' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('db-settings')}
                >
                  📂 Database Settings
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'theme-styling' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'theme-styling' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('theme-styling')}
                >
                  🎨 Theme & Styling
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'ports-baud' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'ports-baud' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('ports-baud')}
                >
                  🔌 Communication Ports
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'github-oauth' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'github-oauth' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('github-oauth')}
                >
                  🐙 GitHub Integration
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'performance-os' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'performance-os' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('performance-os')}
                >
                  ⚡ Performance & OS
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'github-sync' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'github-sync' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('github-sync')}
                >
                  📂 GitHub File Sync
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: accountModalActiveTab === 'revocation-logs' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: accountModalActiveTab === 'revocation-logs' ? 'var(--accent-pink)' : 'var(--text-dim)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setAccountModalActiveTab('revocation-logs')}
                >
                  🛠️ Troubleshoot Logs
                </button>
              </div>

              {/* Right Panel Scrollable Content */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.05)' }}>
                {/* Profile Tab */}
                {accountModalActiveTab === 'profile' && (
                  <div>
                    {!isLoggedIn ? (
                      <div className="glass-card auth-card" style={{ maxWidth: '400px', margin: '20px auto', border: '1px solid var(--glass-border)', padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                          <span style={{ fontSize: '32px' }}>🔑</span>
                          <h4 style={{ color: 'white', margin: '10px 0 5px 0', fontSize: '15px' }}>Admin Authorization</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>Unlock profiles & settings</p>
                        </div>

                        {authError && (
                          <div style={{ padding: '8px', background: 'rgba(255, 51, 102, 0.1)', border: '1px solid rgba(255, 51, 102, 0.3)', color: '#ff3366', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
                            ⚠️ {authError}
                          </div>
                        )}

                        <div className="input-group">
                          <label>Username</label>
                          <input type="text" value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} placeholder="Enter admin username" />
                        </div>

                        {authMode === 'signup' && (
                          <div className="input-group">
                            <label>Email Address</label>
                            <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="admin@domain.com" />
                          </div>
                        )}

                        <div className="input-group">
                          <label>Password</label>
                          <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••••••" />
                        </div>

                        {authMode === 'signup' && (
                          <div className="input-group">
                            <label>Confirm Password</label>
                            <input type="password" value={authConfirmPassword} onChange={(e) => setAuthConfirmPassword(e.target.value)} placeholder="••••••••••••" />
                          </div>
                        )}

                        <button className="btn btn-accent" onClick={handleAuth} style={{ width: '100%', marginTop: '15px' }}>
                          {authMode === 'login' ? 'Authenticate Session' : 'Register Administrator'}
                        </button>

                        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px' }}>
                          <a href="#" onClick={(e) => { e.preventDefault(); setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                            {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <h3>👤 Admin Profile</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>Active administrator session details:</p>

                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                          <div>
                            <span style={{ color: 'var(--accent-pink)', textTransform: 'uppercase', fontSize: '9px', display: 'block', fontWeight: 'bold' }}>Active User</span>
                            <strong style={{ fontSize: '14px', color: 'white' }}>Administrator</strong>
                          </div>
                          <div>
                            <span style={{ color: 'var(--accent-pink)', textTransform: 'uppercase', fontSize: '9px', display: 'block', fontWeight: 'bold' }}>Status</span>
                            <strong style={{ fontSize: '14px', color: 'var(--accent-emerald)' }}>Connected & Authenticated</strong>
                          </div>
                        </div>

                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            localStorage.removeItem('isLoggedIn');
                            setIsLoggedIn(false);
                            addLogLine('[GUI] Logged out.', 'system');
                            alert('Session terminated.');
                          }}
                          style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', height: '36px', padding: '0', cursor: 'pointer' }}
                        >
                          🚪 Log Out Session
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Database Settings Tab */}
                {accountModalActiveTab === 'db-settings' && (
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3>📂 MongoDB Database Settings</h3>
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
                )}

                {/* Theme & Styling Tab */}
                {accountModalActiveTab === 'theme-styling' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Color Theme Selector Section */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>🎨 Select Visual Theme Preset</h3>
                          <p style={{ fontSize: '11.5px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                            Choose a visual accent color palette. Changes will instantly animate across the entire dashboard.
                          </p>
                        </div>
                        <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--glass-border)', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Theme: {currentTheme.replace('-', ' ')}
                        </span>
                      </div>

                      <div className="theme-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                        {[
                          { id: 'quantum-indigo', name: 'Quantum Indigo', desc: '⚛️ Modern digital blue', grad: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)', trigger: null },
                          { id: 'cyber-orchid', name: 'Cyber Orchid', desc: '🌸 Premium metallic silver', grad: 'linear-gradient(135deg, #8e8e93 0%, #d1d1d6 100%)', trigger: null },
                          { id: 'mint-aurora', name: 'Mint Aurora', desc: '🍵 Refreshing green glow', grad: 'linear-gradient(135deg, #30d158 0%, #0a84ff 100%)', trigger: null },
                          { id: 'solar-flare', name: 'Solar Flare', desc: '☀️ Warm violet & blue', grad: 'linear-gradient(135deg, #0a84ff 0%, #bf5af2 100%)', trigger: null },
                          { id: 'minecraft', name: 'Minecraft Craft', desc: '🧱 Pixel block earth tone', grad: 'linear-gradient(135deg, #855C33 0%, #3D8B2A 100%)', trigger: null },
                          { id: 'cherry-grove', name: 'Cherry Grove', desc: '🍒 Sakura pink gradient', grad: 'linear-gradient(135deg, #ff79c6 0%, #ffb86c 100%)', trigger: null },
                          { id: 'deep-sea-ocean', name: 'Deep Sea Ocean', desc: '🌊 Submerged navy blue', grad: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', trigger: triggerOceanAnimation },
                          { id: 'hacking', name: 'Terminal Hacking', desc: '💻 Matrix green terminal', grad: 'linear-gradient(135deg, #000000 0%, #15803d 100%)', trigger: triggerHackerAnimation },
                          { id: 'mojang-studios', name: 'Mojang Studios', desc: '🟥 Classic red block brand', grad: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', trigger: null },
                          { id: 'star-nova', name: 'Star Nova', desc: '🌟 Cosmic indigo space', grad: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)', trigger: null },
                          { id: 'cyber-sunset', name: 'Cyber Sunset', desc: '🌇 Vaporwave synth neon', grad: 'linear-gradient(135deg, #ec4899 0%, #eab308 100%)', trigger: null }
                        ].map((theme) => {
                          const isActive = currentTheme === theme.id;
                          return (
                            <div
                              key={theme.id}
                              onClick={() => changeThemeWithTransition(theme.id, theme.trigger)}
                              style={{
                                cursor: 'pointer',
                                background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                                border: isActive ? '1px solid var(--accent-blue)' : '1px solid var(--glass-border)',
                                boxShadow: isActive ? '0 0 15px rgba(0, 240, 255, 0.15)' : 'none',
                                borderRadius: '10px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: isActive ? 'translateY(-2px)' : 'none',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <div style={{ height: '32px', width: '100%', borderRadius: '6px', background: theme.grad, opacity: 0.9 }}></div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: isActive ? 'var(--accent-blue)' : '#fff' }}>
                                  {theme.name}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', lineHeight: '1.2' }}>
                                  {theme.desc}
                                </span>
                              </div>
                              {isActive && (
                                <span style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: 'var(--accent-blue)',
                                  boxShadow: '0 0 8px var(--accent-blue)'
                                }}></span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Font & Video custom styling in grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                      {/* Typography Selection */}
                      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '14px', color: 'white' }}>🔤 Typography Font Face</h3>
                          <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 15px 0' }}>
                            Adjust application-wide text display styling.
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {[
                            { id: 'outfit', name: 'Outfit Sans', desc: 'Modern Rounded aesthetic' },
                            { id: 'mono', name: 'JetBrains Mono', desc: 'Hardware terminal code style' },
                            { id: 'space', name: 'Space Grotesk', desc: 'Futuristic wide geometric' }
                          ].map((f) => {
                            const isFontActive = currentFont === f.id;
                            return (
                              <button
                                key={f.id}
                                className={`btn ${isFontActive ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => {
                                  setCurrentFont(f.id);
                                  localStorage.setItem('font', f.id);
                                  document.documentElement.setAttribute('data-font', f.id);
                                }}
                                style={{
                                  margin: 0,
                                  textAlign: 'left',
                                  padding: '10px 14px',
                                  height: 'auto',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: '2px',
                                  border: isFontActive ? '1px solid var(--accent-blue)' : '1px solid var(--glass-border)',
                                  background: isFontActive ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255,255,255,0.02)'
                                }}
                              >
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: isFontActive ? 'var(--accent-blue)' : '#fff' }}>{f.name}</span>
                                <span style={{ fontSize: '9.5px', color: 'var(--text-dim)', textTransform: 'none', fontWeight: 'normal' }}>{f.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* YouTube Background controls */}
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '14px', color: 'white' }}>🎬 Looping Video Background</h3>
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '4px 0 15px 0' }}>
                          Overlay a low-opacity video loop in the dashboard background.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>Video Player State</label>
                            <select
                              value={String(bgVideoEnabled)}
                              onChange={(e) => {
                                const val = e.target.value === 'true';
                                setBgVideoEnabled(val);
                                localStorage.setItem('bgVideoEnabled', String(val));
                              }}
                              style={{ width: '100%', padding: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '6px' }}
                            >
                              <option value="true">Enabled (Looped Video)</option>
                              <option value="false">Disabled (Solid Colors)</option>
                            </select>
                          </div>

                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '4px' }}>YouTube Video ID</label>
                            <input
                              type="text"
                              value={bgVideoId}
                              onChange={(e) => {
                                setBgVideoId(e.target.value);
                                localStorage.setItem('bgVideoId', e.target.value);
                              }}
                              placeholder="e.g. FYH9n37B7Yw"
                              style={{ height: '32px', fontSize: '11.5px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)' }}
                            />
                          </div>

                          <div className="input-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <label style={{ fontSize: '10px', color: 'var(--text-dim)', margin: 0 }}>Video Opacity</label>
                              <span style={{ fontSize: '10px', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{Math.round(bgVideoOpacity * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="0.4"
                              step="0.01"
                              value={bgVideoOpacity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setBgVideoOpacity(val);
                                localStorage.setItem('bgVideoOpacity', String(val));
                              }}
                              style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', outline: 'none' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* Ports & Baud Rate Tab */}
                {accountModalActiveTab === 'ports-baud' && (
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3>🔌 Port & Communication Config</h3>
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
                    <div className="input-group" style={{ marginBottom: '15px' }}>
                      <label>Default COM Baud Rate</label>
                      <select value={defaultBaudRateInput} onChange={(e) => setDefaultBaudRateInput(e.target.value)} className="filter-select" style={{ width: '100%', height: '40px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', outline: 'none' }}>
                        <option value="115200" style={{ background: '#1c1b22', color: 'white' }}>115200</option>
                        <option value="9600" style={{ background: '#1c1b22', color: 'white' }}>9600</option>
                        <option value="57600" style={{ background: '#1c1b22', color: 'white' }}>57600</option>
                      </select>
                    </div>
                    <button className="btn btn-accent" onClick={saveAppConfigSettings} style={{ width: '100%' }}>
                      Save Communications Config
                    </button>
                  </div>
                )}

                {/* GitHub OAuth Tab */}
                {accountModalActiveTab === 'github-oauth' && (
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3>🐙 GitHub OAuth Integration</h3>
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
                    <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                      💡 Need help? View instructions in the <a href="#" onClick={(e) => { e.preventDefault(); alert("Please refer to Documentation/SIGN_WITH_GITHUB.md for setup details."); }} style={{ color: 'var(--accent-pink)', textDecoration: 'underline' }}>GitHub OAuth Setup Guide</a>.
                    </div>
                  </div>
                )}

                {/* Performance & OS Tab */}
                {accountModalActiveTab === 'performance-os' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                      <h3>⚡ Performance & System Config</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                        Enable hardware acceleration to use GPU resources for smoother transitions and rendering.
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>GPU Hardware Acceleration</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Requires application restart to take effect</div>
                        </div>
                        <label className="switch-toggle" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={hwAccelInput}
                            onChange={(e) => setHwAccelInput(e.target.checked)}
                          />
                          <span className="switch-slider"></span>
                        </label>
                      </div>
                      <button className="btn btn-primary" onClick={saveAppConfigSettings} style={{ marginTop: '15px', width: '100%' }}>
                        Save Performance Settings
                      </button>
                    </div>

                    <div className="glass-card" style={{ padding: '20px' }}>
                      <h3>🖥️ System Specifications & Versions</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '10px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>OS Environment</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>{systemInfo.platform.toUpperCase()} ({systemInfo.release})</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>CPU Architecture</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>{systemInfo.cpu} ({systemInfo.arch})</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-pink)', display: 'block', textTransform: 'uppercase' }}>System RAM</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>{systemInfo.freeMem} / {systemInfo.totalMem}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>Electron</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>v{systemInfo.electron}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>NodeJS</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>v{systemInfo.node}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                          <span style={{ fontSize: '9px', color: 'var(--accent-blue)', display: 'block', textTransform: 'uppercase' }}>Chromium</span>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginTop: '2px', color: 'white' }}>v{systemInfo.chrome}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* GitHub Sync Tab */}
                {accountModalActiveTab === 'github-sync' && (
                  <div className="glass-card" style={{ padding: '20px' }}>
                    <h3>🐙 GitHub Sync & XML Pull</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                      Sync online codebase files and raw repository XML update logs:
                    </p>

                    <div className="input-group">
                      <label>GitHub Repository URL</label>
                      <input
                        type="text"
                        value={gitHubRepoUrlInput || ''}
                        onChange={(e) => setGitHubRepoUrlInput(e.target.value)}
                        placeholder="https://github.com/Username/Repo"
                      />
                    </div>
                    <div className="input-group">
                      <label>Repository Branch</label>
                      <input
                        type="text"
                        value={gitHubRepoBranchInput || ''}
                        onChange={(e) => setGitHubRepoBranchInput(e.target.value)}
                        placeholder="main"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handlePullGithubXml}
                        disabled={isSyncingXml}
                        style={{ margin: 0, width: '100%' }}
                      >
                        {isSyncingXml ? 'Syncing XML...' : 'Update XML Now'}
                      </button>
                      <button
                        className="btn btn-accent"
                        onClick={handleGitHubSync}
                        disabled={isGitHubSyncing}
                        style={{ margin: 0, width: '100%' }}
                      >
                        {isGitHubSyncing ? 'Syncing Code...' : 'Sync Code Now'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Troubleshoot Logs Tab */}
                {accountModalActiveTab === 'revocation-logs' && (
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3>🛠️ Revocation & Troubleshoot Logs</h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary small" onClick={fetchTroubleshootLogs} style={{ margin: 0, height: '28px', padding: '0 12px', fontSize: '11px' }}>
                          🔄 Refresh
                        </button>
                        <button className="btn btn-danger small" onClick={clearTroubleshootLogs} style={{ margin: 0, height: '28px', padding: '0 12px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                          🗑️ Clear Logs
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '15px' }}>
                      Offline troubleshooting history: connection terminations (revoke events) and database failures.
                    </p>

                    <div style={{ maxHeight: '350px', overflowY: 'auto', background: 'rgba(0, 0, 0, 0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      {troubleshootLogs.length === 0 ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#707090', fontStyle: 'italic' }}>
                          No troubleshooting logs found.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--accent-pink)', textAlign: 'left' }}>
                              <th style={{ padding: '6px' }}>Timestamp</th>
                              <th style={{ padding: '6px' }}>Event</th>
                              <th style={{ padding: '6px' }}>Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {troubleshootLogs.map((log, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#e0e0f0' }}>
                                <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleString()}</td>
                                <td style={{ padding: '6px' }}>
                                  <span className="status-tag err" style={{ padding: '1px 4px', fontSize: '8px' }}>
                                    {log.event || log.type}
                                  </span>
                                </td>
                                <td style={{ padding: '6px' }}>{log.message || log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
