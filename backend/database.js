const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let localRegistryPath = '';
const appName = 'iot-monitor-system';
try {
  const { app } = require('electron');
  localRegistryPath = path.join(app.getPath('userData'), 'devices_registry.json');
} catch (e) {
  const appDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
  localRegistryPath = path.join(appDataPath, appName, 'devices_registry.json');
}

function loadLocalDevices() {
  try {
    if (fs.existsSync(localRegistryPath)) {
      const data = fs.readFileSync(localRegistryPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[DATABASE] Failed to read local devices registry:', e);
  }
  return [];
}

function saveLocalDevices(devices) {
  try {
    const dir = path.dirname(localRegistryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localRegistryPath, JSON.stringify(devices, null, 2), 'utf8');
  } catch (e) {
    console.error('[DATABASE] Failed to write local devices registry:', e);
  }
}

let localTroubleshootPath = '';
try {
  const { app } = require('electron');
  localTroubleshootPath = path.join(app.getPath('userData'), 'troubleshoot_logs.json');
} catch (e) {
  const appDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library/Application Support') : path.join(process.env.HOME, '.config'));
  localTroubleshootPath = path.join(appDataPath, appName, 'troubleshoot_logs.json');
}

function loadLocalTroubleshootLogs() {
  try {
    if (fs.existsSync(localTroubleshootPath)) {
      const data = fs.readFileSync(localTroubleshootPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[DATABASE] Failed to read local troubleshoot logs:', e);
  }
  return [];
}

function saveLocalTroubleshootLogs(logs) {
  try {
    const dir = path.dirname(localTroubleshootPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localTroubleshootPath, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('[DATABASE] Failed to write local troubleshoot logs:', e);
  }
}

function getCleanPcbNumber(pcbNumber, macAddress) {
  const macClean = (macAddress || '').replace(/:/g, '').toUpperCase();
  const suffix = macClean.slice(-6) || 'A530';
  if (!pcbNumber || pcbNumber === 'AUTO-REGISTERED' || pcbNumber.startsWith('ESP') || pcbNumber.startsWith('esp')) {
    return `RMS-Firmware-${suffix}`;
  }
  return pcbNumber;
}

// Schema Definition

const TelemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  pcbNumber: { type: String, default: '' },
  connectionType: { type: String, default: '' },
  target: { type: String, default: '' },
  imei: { type: String, default: '' },
  mac: { type: String, default: '' },
  password: { type: String, default: '' },
  routerSSID: { type: String, default: '' },
  routerPassword: { type: String, default: '' },
  telemetryInterval: { type: Number, default: 1500 },
  rs232Status: { type: String, default: 'WAITING' },
  rs485Status: { type: String, default: 'WAITING' },
  gprsStatus: { type: String, default: 'WAITING' },
  diStatus: { type: String, default: 'WAITING' },
  psramStatus: { type: String, default: 'WAITING' },
  rtcStatus: { type: String, default: 'WAITING' },
  flashStatus: { type: String, default: 'WAITING' },
  frStatus: { type: String, default: 'WAITING' },
  switchStatus: { type: String, default: 'WAITING' },
  apStatus: { type: String, default: 'WAITING' },
  busStatus: { type: String, default: 'WAITING' },
  driverStatus: { type: String, default: 'WAITING' },
  rs232Log: { type: String, default: '' },
  rs485Log: { type: String, default: '' },
  gprsLog: { type: String, default: '' },
  diLog: { type: String, default: '' },
  psramLog: { type: String, default: '' },
  rtcLog: { type: String, default: '' },
  flashLog: { type: String, default: '' },
  frLog: { type: String, default: '' },
  switchLog: { type: String, default: '' },
  apLog: { type: String, default: '' },
  busLog: { type: String, default: '' },
  driverLog: { type: String, default: '' },
  rs232Remarks: { type: String, default: '' },
  rs485Remarks: { type: String, default: '' },
  gprsRemarks: { type: String, default: '' },
  diRemarks: { type: String, default: '' },
  psramRemarks: { type: String, default: '' },
  rtcRemarks: { type: String, default: '' },
  flashRemarks: { type: String, default: '' },
  frRemarks: { type: String, default: '' },
  switchRemarks: { type: String, default: '' },
  apRemarks: { type: String, default: '' },
  busRemarks: { type: String, default: '' },
  driverRemarks: { type: String, default: '' }
});

const TelemetryModel = mongoose.model('Telemetry', TelemetrySchema);

let mongodbConnected = false;
let memoryHistoryBuffer = [];

// Initialize Database Connection
/*
function connectDatabase() {
  const mongoURI = 'mongodb://192.168.1.26:27017/IOT_System_Manager/IOT_System_Manager'; // 'mongodb+srv://yashacker:Iamyash@reactdb.d04du.mongodb.net/?appName=ReactDB';
  console.log(`[DATABASE] Connecting to MongoDB at ${mongoURI}...`);


  mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 3000
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
*/

function sanitizeMongoURI(uri) {
  if (!uri) return uri;
  const protocolMatch = uri.match(/^mongodb(?:\+srv)?:\/\//i);
  if (!protocolMatch) return uri;

  const protocol = protocolMatch[0];
  const rest = uri.slice(protocol.length);
  const firstSlashIdx = rest.indexOf('/');
  if (firstSlashIdx === -1) return uri;

  const hostPart = rest.slice(0, firstSlashIdx);
  const pathPart = rest.slice(firstSlashIdx);
  const queryIdx = pathPart.indexOf('?');
  let pathOnly = queryIdx !== -1 ? pathPart.slice(0, queryIdx) : pathPart;
  const queryPart = queryIdx !== -1 ? pathPart.slice(queryIdx) : '';

  const segments = pathOnly.split('/').filter(s => s.length > 0);
  if (segments.length > 1) {
    pathOnly = '/' + segments[0];
  }

  return protocol + hostPart + pathOnly + queryPart;
}

let dbExistsStatus = 'checking';

async function verifyDbExistence() {
  if (!mongoose.connection || !mongoose.connection.db) {
    dbExistsStatus = 'error';
    return;
  }
  try {
    const adminDb = mongoose.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    const dbName = mongoose.connection.name || 'IOT_Monitor_System';
    const dbExists = dbs.databases.some(d => d.name === dbName);
    dbExistsStatus = dbExists ? 'exists' : 'not_found';
    console.log(`[DATABASE] Checked database existence for '${dbName}': ${dbExistsStatus}`);
  } catch (err) {
    dbExistsStatus = 'error';
    console.error('[DATABASE] Error verifying database existence:', err.message);
  }
}

// Monitor connection states dynamically
mongoose.connection.on('connected', () => {
  mongodbConnected = true;
  console.log('[DATABASE] MongoDB connection event: CONNECTED');
  verifyDbExistence();
});
mongoose.connection.on('disconnected', () => {
  mongodbConnected = false;
  console.log('[DATABASE] MongoDB connection event: DISCONNECTED');
});
mongoose.connection.on('error', (err) => {
  mongodbConnected = false;
  console.error('[DATABASE] MongoDB connection event: ERROR -', err.message);
});

// Auto reconnection heartbeat
let reconnectTimer = null;
let lastUsedURI = 'mongodb://127.0.0.1:27017/IOT_Monitor_System';

function startHeartbeatReconnection(uri) {
  if (uri) {
    lastUsedURI = uri;
  }
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (mongoose.connection.readyState === 0 || !mongodbConnected) {
      console.log('[DATABASE MONITOR] Connection lost or inactive. Re-connecting to MongoDB...');
      const targetURI = sanitizeMongoURI(lastUsedURI);
      mongoose.connect(targetURI, {
        serverSelectionTimeoutMS: 3000
      })
      .then(() => {
        mongodbConnected = true;
      })
      .catch((err) => {
        mongodbConnected = false;
        console.warn('[DATABASE MONITOR] Automatic reconnection attempt failed:', err.message);
      });
    }
  }, 10000);
}

function connectDatabase(customURI) {
  const rawURI = customURI || process.env.MONOGDB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/IOT_Monitor_System';
  const mongoURI = sanitizeMongoURI(rawURI);
  lastUsedURI = rawURI;
  console.log(`[DATABASE] Connecting to MongoDB at ${mongoURI}...`);

  if (mongoose.connection.readyState !== 0) {
    mongoose.disconnect();
  }

  startHeartbeatReconnection(rawURI);

  return mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 3000
  })
    .then(() => {
      mongodbConnected = true;
      console.log('[DATABASE] MongoDB connection established successfully.');
      return mongoose.connection;
    })
    .catch((err) => {
      mongodbConnected = false;
      console.warn('[DATABASE] MongoDB connection failed. Falling back to In-Memory Logging.');
      console.warn(`[DATABASE] Error details: ${err.message}`);
      saveTroubleshootLog('db_connection_failed', `MongoDB connection failed at ${mongoURI}`, err.message);
      return null;
    });
}

// Save Telemetry snapshot helper
async function saveTelemetrySnapshot(data) {
  let device = null;
  try {
    if (data.imei) {
      device = await DeviceIdentificationModel.findOne({ imei: data.imei });
    }
    if (!device && data.pcbNumber) {
      device = await DeviceIdentificationModel.findOne({ pcbNumber: data.pcbNumber });
    }
    if (!device) {
      device = await DeviceIdentificationModel.findOne().sort({ timestamp: -1 });
    }
  } catch (err) {
    console.error('[DATABASE] Error looking up device for telemetry log:', err);
  }

  const snapshot = {
    timestamp: new Date(),
    pcbNumber: (device && device.pcbNumber) || getCleanPcbNumber(data.pcbNumber, data.mac),
    connectionType: (device && device.connectionType) || data.connectionType || 'tcp',
    target: (device && device.target) || data.target || '0.0.0.0:9000 (Listening)',
    imei: (device && device.imei) || data.imei || '',
    mac: (device && device.mac) || data.mac || '',
    password: (device && device.password) || data.password || 'admin_secure_gate',
    routerSSID: (device && device.routerSSID) || data.routerSSID || '',
    routerPassword: (device && device.routerPassword) || data.routerPassword || '',
    telemetryInterval: (device && device.telemetryInterval) || data.telemetryInterval || 1500,
    rs232Status: (device && device.rs232Status) || data.rs232Status || 'WAITING',
    rs485Status: (device && device.rs485Status) || data.rs485Status || 'WAITING',
    gprsStatus: (device && device.gprsStatus) || data.gprsStatus || 'WAITING',
    diStatus: (device && device.diStatus) || data.diStatus || 'WAITING',
    psramStatus: (device && device.psramStatus) || data.psramStatus || 'WAITING',
    rtcStatus: (device && device.rtcStatus) || data.rtcStatus || 'WAITING',
    flashStatus: (device && device.flashStatus) || data.flashStatus || 'WAITING',
    frStatus: (device && device.frStatus) || data.frStatus || 'WAITING',
    switchStatus: (device && device.switchStatus) || data.switchStatus || 'WAITING',
    apStatus: (device && device.apStatus) || data.apStatus || 'WAITING',
    busStatus: (device && device.busStatus) || data.busStatus || 'WAITING',
    driverStatus: (device && device.driverStatus) || data.driverStatus || 'WAITING',
    rs232Log: (device && device.rs232Log) || data.rs232Log || '',
    rs485Log: (device && device.rs485Log) || data.rs485Log || '',
    gprsLog: (device && device.gprsLog) || data.gprsLog || '',
    diLog: (device && device.diLog) || data.diLog || '',
    psramLog: (device && device.psramLog) || data.psramLog || '',
    rtcLog: (device && device.rtcLog) || data.rtcLog || '',
    flashLog: (device && device.flashLog) || data.flashLog || '',
    frLog: (device && device.frLog) || data.frLog || '',
    switchLog: (device && device.switchLog) || data.switchLog || '',
    apLog: (device && device.apLog) || data.apLog || '',
    busLog: (device && device.busLog) || data.busLog || '',
    driverLog: (device && device.driverLog) || data.driverLog || '',
    rs232Remarks: (device && device.rs232Remarks) || data.rs232Remarks || '',
    rs485Remarks: (device && device.rs485Remarks) || data.rs485Remarks || '',
    gprsRemarks: (device && device.gprsRemarks) || data.gprsRemarks || '',
    diRemarks: (device && device.diRemarks) || data.diRemarks || '',
    psramRemarks: (device && device.psramRemarks) || data.psramRemarks || '',
    rtcRemarks: (device && device.rtcRemarks) || data.rtcRemarks || '',
    flashRemarks: (device && device.flashRemarks) || data.flashRemarks || '',
    frRemarks: (device && device.frRemarks) || data.frRemarks || '',
    switchRemarks: (device && device.switchRemarks) || data.switchRemarks || '',
    apRemarks: (device && device.apRemarks) || data.apRemarks || '',
    busRemarks: (device && device.busRemarks) || data.busRemarks || '',
    driverRemarks: (device && device.driverRemarks) || data.driverRemarks || ''
  };

  if (mongodbConnected) {
    try {
      await TelemetryModel.create(snapshot);

      const count = await TelemetryModel.countDocuments();
      if (count > 200) {
        const oldest = await TelemetryModel.find().sort({ timestamp: 1 }).limit(1);
        if (oldest.length > 0) {
          await TelemetryModel.deleteOne({ _id: oldest[0]._id });
        }
      }
    } catch (err) {
      console.error('[DATABASE] Failed to write telemetry record to MongoDB:', err);
      await saveTroubleshootLog('db_entry_failed', `Failed to write telemetry record to MongoDB for IMEI: ${snapshot.imei || '(none)'}`, err.message);
    }
  } else {
    memoryHistoryBuffer.push(snapshot);
    if (memoryHistoryBuffer.length > 50) {
      memoryHistoryBuffer.shift();
    }
  }
}

// CertificateLog Schema Definition
const CertificateLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  imei: String,
  gatewayIp: String,
  rootCaSize: Number,
  deviceCertSize: Number,
  privateKeySize: Number,
  status: String,
  message: String
});

const CertificateLogModel = mongoose.model('CertificateLog', CertificateLogSchema);

const DeviceIdentificationSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  pcbNumber: { type: String, default: '' },
  connectionType: String,
  target: String,
  imei: { type: String, default: '' },
  remarks: { type: String, default: '' },
  mac: { type: String, default: '' },
  uuid: { type: String, default: '' },
  busId: { type: Number, default: 1 },
  deviceMode: { type: String, default: 'solaryan inverter' },
  password: { type: String, default: '' },
  routerSSID: { type: String, default: '' },
  routerPassword: { type: String, default: '' },
  telemetryInterval: { type: Number, default: 1500 },
  deviceNumber: { type: Number, default: 1 },
  rs232Status: { type: String, default: 'WAITING' },
  rs485Status: { type: String, default: 'WAITING' },
  gprsStatus: { type: String, default: 'WAITING' },
  diStatus: { type: String, default: 'WAITING' },
  psramStatus: { type: String, default: 'WAITING' },
  rtcStatus: { type: String, default: 'WAITING' },
  flashStatus: { type: String, default: 'WAITING' },
  frStatus: { type: String, default: 'WAITING' },
  switchStatus: { type: String, default: 'WAITING' },
  apStatus: { type: String, default: 'WAITING' },
  busStatus: { type: String, default: 'WAITING' },
  driverStatus: { type: String, default: 'WAITING' },
  rs232Log: { type: String, default: '' },
  rs485Log: { type: String, default: '' },
  gprsLog: { type: String, default: '' },
  diLog: { type: String, default: '' },
  psramLog: { type: String, default: '' },
  rtcLog: { type: String, default: '' },
  flashLog: { type: String, default: '' },
  frLog: { type: String, default: '' },
  switchLog: { type: String, default: '' },
  apLog: { type: String, default: '' },
  busLog: { type: String, default: '' },
  driverLog: { type: String, default: '' },
  rs232Remarks: { type: String, default: '' },
  rs485Remarks: { type: String, default: '' },
  gprsRemarks: { type: String, default: '' },
  diRemarks: { type: String, default: '' },
  psramRemarks: { type: String, default: '' },
  rtcRemarks: { type: String, default: '' },
  flashRemarks: { type: String, default: '' },
  frRemarks: { type: String, default: '' },
  switchRemarks: { type: String, default: '' },
  apRemarks: { type: String, default: '' },
  busRemarks: { type: String, default: '' },
  driverRemarks: { type: String, default: '' },
  lastOnline: { type: Date, default: Date.now },
  registrationMethod: { type: String, default: 'manual' }
});

const DeviceIdentificationModel = mongoose.model('DeviceIdentification', DeviceIdentificationSchema, 'Device_Name');

// Troubleshoot Schema Definition
const TroubleshootSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { type: String, default: 'info' },
  message: { type: String, default: '' },
  details: { type: String, default: '' }
});

const TroubleshootModel = mongoose.model('Troubleshoot', TroubleshootSchema, 'Troubleshoot_Logs');

async function saveTroubleshootLog(type, message, details) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: type || 'info',
    message: message || '',
    details: details || ''
  };

  // 1. Write locally
  try {
    const localLogs = loadLocalTroubleshootLogs();
    localLogs.unshift(logEntry);
    if (localLogs.length > 200) {
      localLogs.pop(); // keep last 200 logs
    }
    saveLocalTroubleshootLogs(localLogs);
  } catch (e) {
    console.error('[DATABASE] Error saving local troubleshoot log:', e);
  }

  // 2. Write to MongoDB if connected
  if (mongodbConnected) {
    try {
      await TroubleshootModel.create(logEntry);
      // clean up old records in mongo as well
      const count = await TroubleshootModel.countDocuments();
      if (count > 200) {
        const oldest = await TroubleshootModel.find().sort({ timestamp: 1 }).limit(1);
        if (oldest.length > 0) {
          await TroubleshootModel.deleteOne({ _id: oldest[0]._id });
        }
      }
    } catch (err) {
      console.error('[DATABASE] Failed to write troubleshoot record to MongoDB:', err);
    }
  }
}

async function getTroubleshootLogs() {
  if (mongodbConnected) {
    try {
      return await TroubleshootModel.find().sort({ timestamp: -1 }).limit(100);
    } catch (err) {
      console.error('[DATABASE] Failed to read troubleshoot logs from MongoDB, using local fallback:', err);
    }
  }
  return loadLocalTroubleshootLogs();
}

async function clearTroubleshootLogs() {
  try {
    saveLocalTroubleshootLogs([]);
  } catch (e) {
    console.error('[DATABASE] Failed to clear local troubleshoot logs:', e);
  }

  if (mongodbConnected) {
    try {
      await TroubleshootModel.deleteMany({});
    } catch (err) {
      console.error('[DATABASE] Failed to clear troubleshoot logs in MongoDB:', err);
    }
  }
  return true;
}

let memoryCertificateLogs = [];

async function saveCertificateLog(logData) {
  const record = {
    timestamp: new Date(),
    ...logData
  };
  if (mongodbConnected) {
    try {
      await CertificateLogModel.create(record);
    } catch (err) {
      console.error('[DATABASE] Failed to write certificate log to MongoDB:', err);
    }
  } else {
    memoryCertificateLogs.push(record);
    if (memoryCertificateLogs.length > 50) {
      memoryCertificateLogs.shift();
    }
  }
}

async function getCertificateLogs() {
  if (mongodbConnected) {
    try {
      return await CertificateLogModel.find().sort({ timestamp: -1 });
    } catch (err) {
      console.error('[DATABASE] Failed to read certificate logs from MongoDB:', err);
      return memoryCertificateLogs;
    }
  } else {
    return [...memoryCertificateLogs].reverse();
  }
}

async function createDeviceIdentification(data) {
  const record = {
    timestamp: new Date(),
    pcbNumber: getCleanPcbNumber(data.pcbNumber, data.mac),
    connectionType: data.connectionType,
    target: data.target,
    imei: data.imei || '',
    mac: data.mac || '',
    password: data.password || 'admin_secure_gate',
    routerSSID: data.routerSSID || '',
    routerPassword: data.routerPassword || '',
    telemetryInterval: data.telemetryInterval || 1500
  };
  if (mongodbConnected) {
    try {
      const doc = await DeviceIdentificationModel.create(record);
      console.log(`[DATABASE] Connected device logged with ID: ${doc._id}`);
      return doc._id.toString();
    } catch (err) {
      console.error('[DATABASE] Failed to create device identification:', err);
      return null;
    }
  } else {
    console.warn('[DATABASE] MongoDB not connected, cannot save device identification.');
    return null;
  }
}

async function updateDeviceIdentification(id, updateData) {
  if (mongodbConnected && id) {
    try {
      await DeviceIdentificationModel.findByIdAndUpdate(id, updateData);
      console.log(`[DATABASE] Device identification updated for ID: ${id}`);
    } catch (err) {
      console.error('[DATABASE] Failed to update device identification in MongoDB:', err);
    }
  }
}

async function getRegisteredDevices() {
  if (mongodbConnected) {
    try {
      const mongoDevs = await DeviceIdentificationModel.find().sort({ timestamp: -1 });
      saveLocalDevices(mongoDevs);
      return mongoDevs;
    } catch (err) {
      console.error('[DATABASE] Failed to fetch registered devices from MongoDB:', err);
      return loadLocalDevices();
    }
  } else {
    return loadLocalDevices();
  }
}

async function getDeviceByImei(imei) {
  if (mongodbConnected && imei) {
    try {
      return await DeviceIdentificationModel.findOne({ imei });
    } catch (err) {
      console.error('[DATABASE] Failed to find device by IMEI in MongoDB:', err);
    }
  }
  if (imei) {
    const localDevices = loadLocalDevices();
    return localDevices.find(d => d.imei === imei) || null;
  }
  return null;
}

async function registerOrUpdateDevice(data) {
  let savedDoc = null;

  try {
    const localDevices = loadLocalDevices();
    let foundIdx = localDevices.findIndex(d => d.imei === data.imei);
    let targetDeviceNumber = parseInt(data.deviceNumber);
    let hasDuplicate = false;
    if (targetDeviceNumber) {
      hasDuplicate = localDevices.some((d, idx) => d.deviceNumber === targetDeviceNumber && idx !== foundIdx);
    }
    if (!targetDeviceNumber || isNaN(targetDeviceNumber) || hasDuplicate) {
      const maxNum = localDevices.reduce((max, d) => ((d.deviceNumber || 0) > max ? d.deviceNumber : max), 0);
      targetDeviceNumber = maxNum + 1;
    }

    let updatedObj = {};
    if (foundIdx !== -1) {
      updatedObj = {
        ...localDevices[foundIdx],
        pcbNumber: getCleanPcbNumber(data.pcbNumber || localDevices[foundIdx].pcbNumber, data.mac || localDevices[foundIdx].mac),
        remarks: data.remarks !== undefined ? data.remarks : localDevices[foundIdx].remarks,
        connectionType: data.connectionType || localDevices[foundIdx].connectionType,
        target: data.target || localDevices[foundIdx].target,
        mac: data.mac || localDevices[foundIdx].mac,
        uuid: data.uuid !== undefined ? data.uuid : localDevices[foundIdx].uuid,
        busId: data.busId !== undefined ? data.busId : localDevices[foundIdx].busId,
        deviceMode: data.deviceMode !== undefined ? data.deviceMode : localDevices[foundIdx].deviceMode,
        password: data.password !== undefined ? data.password : localDevices[foundIdx].password,
        routerSSID: data.routerSSID !== undefined ? data.routerSSID : localDevices[foundIdx].routerSSID,
        routerPassword: data.routerPassword !== undefined ? data.routerPassword : localDevices[foundIdx].routerPassword,
        telemetryInterval: data.telemetryInterval !== undefined ? data.telemetryInterval : localDevices[foundIdx].telemetryInterval,
        deviceNumber: targetDeviceNumber,
        rs232Status: data.rs232Status !== undefined ? data.rs232Status : localDevices[foundIdx].rs232Status,
        rs485Status: data.rs485Status !== undefined ? data.rs485Status : localDevices[foundIdx].rs485Status,
        gprsStatus: data.gprsStatus !== undefined ? data.gprsStatus : localDevices[foundIdx].gprsStatus,
        diStatus: data.diStatus !== undefined ? data.diStatus : localDevices[foundIdx].diStatus,
        psramStatus: data.psramStatus !== undefined ? data.psramStatus : localDevices[foundIdx].psramStatus,
        rtcStatus: data.rtcStatus !== undefined ? data.rtcStatus : localDevices[foundIdx].rtcStatus,
        flashStatus: data.flashStatus !== undefined ? data.flashStatus : localDevices[foundIdx].flashStatus,
        frStatus: data.frStatus !== undefined ? data.frStatus : localDevices[foundIdx].frStatus,
        switchStatus: data.switchStatus !== undefined ? data.switchStatus : localDevices[foundIdx].switchStatus,
        apStatus: data.apStatus !== undefined ? data.apStatus : localDevices[foundIdx].apStatus,
        busStatus: data.busStatus !== undefined ? data.busStatus : localDevices[foundIdx].busStatus,
        driverStatus: data.driverStatus !== undefined ? data.driverStatus : localDevices[foundIdx].driverStatus,
        rs232Log: data.rs232Log !== undefined ? data.rs232Log : localDevices[foundIdx].rs232Log,
        rs485Log: data.rs485Log !== undefined ? data.rs485Log : localDevices[foundIdx].rs485Log,
        gprsLog: data.gprsLog !== undefined ? data.gprsLog : localDevices[foundIdx].gprsLog,
        diLog: data.diLog !== undefined ? data.diLog : localDevices[foundIdx].diLog,
        psramLog: data.psramLog !== undefined ? data.psramLog : localDevices[foundIdx].psramLog,
        rtcLog: data.rtcLog !== undefined ? data.rtcLog : localDevices[foundIdx].rtcLog,
        flashLog: data.flashLog !== undefined ? data.flashLog : localDevices[foundIdx].flashLog,
        frLog: data.frLog !== undefined ? data.frLog : localDevices[foundIdx].frLog,
        switchLog: data.switchLog !== undefined ? data.switchLog : localDevices[foundIdx].switchLog,
        apLog: data.apLog !== undefined ? data.apLog : localDevices[foundIdx].apLog,
        busLog: data.busLog !== undefined ? data.busLog : localDevices[foundIdx].busLog,
        driverLog: data.driverLog !== undefined ? data.driverLog : localDevices[foundIdx].driverLog,
        rs232Remarks: data.rs232Remarks !== undefined ? data.rs232Remarks : localDevices[foundIdx].rs232Remarks,
        rs485Remarks: data.rs485Remarks !== undefined ? data.rs485Remarks : localDevices[foundIdx].rs485Remarks,
        gprsRemarks: data.gprsRemarks !== undefined ? data.gprsRemarks : localDevices[foundIdx].gprsRemarks,
        diRemarks: data.diRemarks !== undefined ? data.diRemarks : localDevices[foundIdx].diRemarks,
        psramRemarks: data.psramRemarks !== undefined ? data.psramRemarks : localDevices[foundIdx].psramRemarks,
        rtcRemarks: data.rtcRemarks !== undefined ? data.rtcRemarks : localDevices[foundIdx].rtcRemarks,
        flashRemarks: data.flashRemarks !== undefined ? data.flashRemarks : localDevices[foundIdx].flashRemarks,
        frRemarks: data.frRemarks !== undefined ? data.frRemarks : localDevices[foundIdx].frRemarks,
        switchRemarks: data.switchRemarks !== undefined ? data.switchRemarks : localDevices[foundIdx].switchRemarks,
        apRemarks: data.apRemarks !== undefined ? data.apRemarks : localDevices[foundIdx].apRemarks,
        busRemarks: data.busRemarks !== undefined ? data.busRemarks : localDevices[foundIdx].busRemarks,
        driverRemarks: data.driverRemarks !== undefined ? data.driverRemarks : localDevices[foundIdx].driverRemarks,
        lastOnline: new Date().toISOString(),
        registrationMethod: data.registrationMethod || localDevices[foundIdx].registrationMethod || 'manual'
      };
      localDevices[foundIdx] = updatedObj;
    } else {
      updatedObj = {
        imei: data.imei,
        pcbNumber: getCleanPcbNumber(data.pcbNumber, data.mac),
        remarks: data.remarks || '',
        connectionType: data.connectionType || 'unknown',
        target: data.target || '',
        mac: data.mac || '',
        uuid: data.uuid || '',
        busId: data.busId || 1,
        deviceMode: data.deviceMode || 'solaryan inverter',
        password: data.password || 'admin_secure_gate',
        routerSSID: data.routerSSID || '',
        routerPassword: data.routerPassword || '',
        telemetryInterval: data.telemetryInterval || 1500,
        deviceNumber: targetDeviceNumber,
        rs232Status: data.rs232Status || 'WAITING',
        rs485Status: data.rs485Status || 'WAITING',
        gprsStatus: data.gprsStatus || 'WAITING',
        diStatus: data.diStatus || 'WAITING',
        psramStatus: data.psramStatus || 'WAITING',
        rtcStatus: data.rtcStatus || 'WAITING',
        flashStatus: data.flashStatus || 'WAITING',
        frStatus: data.frStatus || 'WAITING',
        switchStatus: data.switchStatus || 'WAITING',
        apStatus: data.apStatus || 'WAITING',
        busStatus: data.busStatus || 'WAITING',
        driverStatus: data.driverStatus || 'WAITING',
        rs232Log: data.rs232Log || '',
        rs485Log: data.rs485Log || '',
        gprsLog: data.gprsLog || '',
        diLog: data.diLog || '',
        psramLog: data.psramLog || '',
        rtcLog: data.rtcLog || '',
        flashLog: data.flashLog || '',
        frLog: data.frLog || '',
        switchLog: data.switchLog || '',
        apLog: data.apLog || '',
        busLog: data.busLog || '',
        driverLog: data.driverLog || '',
        rs232Remarks: data.rs232Remarks || '',
        rs485Remarks: data.rs485Remarks || '',
        gprsRemarks: data.gprsRemarks || '',
        diRemarks: data.diRemarks || '',
        psramRemarks: data.psramRemarks || '',
        rtcRemarks: data.rtcRemarks || '',
        flashRemarks: data.flashRemarks || '',
        frRemarks: data.frRemarks || '',
        switchRemarks: data.switchRemarks || '',
        apRemarks: data.apRemarks || '',
        busRemarks: data.busRemarks || '',
        driverRemarks: data.driverRemarks || '',
        lastOnline: new Date().toISOString(),
        registrationMethod: data.registrationMethod || 'manual',
        timestamp: new Date().toISOString()
      };
      localDevices.push(updatedObj);
    }
    saveLocalDevices(localDevices);
    savedDoc = updatedObj;
  } catch (e) {
    console.error('[DATABASE] Failed to update local devices registry:', e);
  }

  if (mongodbConnected && (data.imei || data.pcbNumber || data.mac)) {
    try {
      let doc = null;
      if (data.imei && data.imei !== '--') {
        doc = await DeviceIdentificationModel.findOne({ imei: data.imei });
      }
      if (!doc && data.pcbNumber) {
        doc = await DeviceIdentificationModel.findOne({ pcbNumber: data.pcbNumber });
      }
      if (!doc && data.mac) {
        doc = await DeviceIdentificationModel.findOne({ mac: data.mac });
      }
      
      let dbDeviceNumber = parseInt(data.deviceNumber);
      let dbDuplicate = false;
      const currentImei = data.imei || (doc ? doc.imei : '');
      if (dbDeviceNumber) {
        dbDuplicate = await DeviceIdentificationModel.findOne({
          deviceNumber: dbDeviceNumber,
          imei: { $ne: currentImei }
        });
      }
      if (!dbDeviceNumber || isNaN(dbDeviceNumber) || dbDuplicate) {
        const maxDev = await DeviceIdentificationModel.findOne().sort({ deviceNumber: -1 });
        dbDeviceNumber = maxDev && maxDev.deviceNumber ? maxDev.deviceNumber + 1 : 1;
      }

      if (doc) {
        doc.remarks = data.remarks !== undefined ? data.remarks : doc.remarks;
        doc.pcbNumber = data.pcbNumber || doc.pcbNumber;
        doc.connectionType = data.connectionType || doc.connectionType;
        doc.target = data.target || doc.target;
        doc.mac = data.mac || doc.mac;
        doc.password = data.password !== undefined ? data.password : doc.password;
        doc.routerSSID = data.routerSSID !== undefined ? data.routerSSID : doc.routerSSID;
        doc.routerPassword = data.routerPassword !== undefined ? data.routerPassword : doc.routerPassword;
        doc.telemetryInterval = data.telemetryInterval !== undefined ? data.telemetryInterval : doc.telemetryInterval;
        doc.uuid = data.uuid !== undefined ? data.uuid : doc.uuid;
        doc.busId = data.busId !== undefined ? data.busId : doc.busId;
        doc.deviceMode = data.deviceMode !== undefined ? data.deviceMode : doc.deviceMode;
        doc.deviceNumber = dbDeviceNumber;

        doc.rs232Status = data.rs232Status !== undefined ? data.rs232Status : doc.rs232Status;
        doc.rs485Status = data.rs485Status !== undefined ? data.rs485Status : doc.rs485Status;
        doc.gprsStatus = data.gprsStatus !== undefined ? data.gprsStatus : doc.gprsStatus;
        doc.diStatus = data.diStatus !== undefined ? data.diStatus : doc.diStatus;
        doc.psramStatus = data.psramStatus !== undefined ? data.psramStatus : doc.psramStatus;
        doc.rtcStatus = data.rtcStatus !== undefined ? data.rtcStatus : doc.rtcStatus;
        doc.flashStatus = data.flashStatus !== undefined ? data.flashStatus : doc.flashStatus;
        doc.frStatus = data.frStatus !== undefined ? data.frStatus : doc.frStatus;
        doc.switchStatus = data.switchStatus !== undefined ? data.switchStatus : doc.switchStatus;
        doc.apStatus = data.apStatus !== undefined ? data.apStatus : doc.apStatus;
        doc.busStatus = data.busStatus !== undefined ? data.busStatus : doc.busStatus;
        doc.driverStatus = data.driverStatus !== undefined ? data.driverStatus : doc.driverStatus;

        doc.rs232Log = data.rs232Log !== undefined ? data.rs232Log : doc.rs232Log;
        doc.rs485Log = data.rs485Log !== undefined ? data.rs485Log : doc.rs485Log;
        doc.gprsLog = data.gprsLog !== undefined ? data.gprsLog : doc.gprsLog;
        doc.diLog = data.diLog !== undefined ? data.diLog : doc.diLog;
        doc.psramLog = data.psramLog !== undefined ? data.psramLog : doc.psramLog;
        doc.rtcLog = data.rtcLog !== undefined ? data.rtcLog : doc.rtcLog;
        doc.flashLog = data.flashLog !== undefined ? data.flashLog : doc.flashLog;
        doc.frLog = data.frLog !== undefined ? data.frLog : doc.frLog;
        doc.switchLog = data.switchLog !== undefined ? data.switchLog : doc.switchLog;
        doc.apLog = data.apLog !== undefined ? data.apLog : doc.apLog;
        doc.busLog = data.busLog !== undefined ? data.busLog : doc.busLog;
        doc.driverLog = data.driverLog !== undefined ? data.driverLog : doc.driverLog;
        doc.rs232Remarks = data.rs232Remarks !== undefined ? data.rs232Remarks : doc.rs232Remarks;
        doc.rs485Remarks = data.rs485Remarks !== undefined ? data.rs485Remarks : doc.rs485Remarks;
        doc.gprsRemarks = data.gprsRemarks !== undefined ? data.gprsRemarks : doc.gprsRemarks;
        doc.diRemarks = data.diRemarks !== undefined ? data.diRemarks : doc.diRemarks;
        doc.psramRemarks = data.psramRemarks !== undefined ? data.psramRemarks : doc.psramRemarks;
        doc.rtcRemarks = data.rtcRemarks !== undefined ? data.rtcRemarks : doc.rtcRemarks;
        doc.flashRemarks = data.flashRemarks !== undefined ? data.flashRemarks : doc.flashRemarks;
        doc.frRemarks = data.frRemarks !== undefined ? data.frRemarks : doc.frRemarks;
        doc.switchRemarks = data.switchRemarks !== undefined ? data.switchRemarks : doc.switchRemarks;
        doc.apRemarks = data.apRemarks !== undefined ? data.apRemarks : doc.apRemarks;
        doc.busRemarks = data.busRemarks !== undefined ? data.busRemarks : doc.busRemarks;
        doc.driverRemarks = data.driverRemarks !== undefined ? data.driverRemarks : doc.driverRemarks;
        doc.lastOnline = new Date();
        doc.registrationMethod = data.registrationMethod || doc.registrationMethod || 'manual';

        await doc.save();
        console.log(`[DATABASE] Device updated in MongoDB for IMEI: ${data.imei}`);
        return doc;
      } else {
        doc = await DeviceIdentificationModel.create({
          imei: data.imei,
          pcbNumber: getCleanPcbNumber(data.pcbNumber, data.mac),
          remarks: data.remarks || '',
          connectionType: data.connectionType || 'unknown',
          target: data.target || '',
          mac: data.mac || '',
          uuid: data.uuid || '',
          busId: data.busId || 1,
          deviceMode: data.deviceMode || 'solaryan inverter',
          password: data.password || 'admin_secure_gate',
          routerSSID: data.routerSSID || '',
          routerPassword: data.routerPassword || '',
          telemetryInterval: data.telemetryInterval || 1500,
          deviceNumber: dbDeviceNumber,
          rs232Status: data.rs232Status || 'WAITING',
          rs485Status: data.rs485Status || 'WAITING',
          gprsStatus: data.gprsStatus || 'WAITING',
          diStatus: data.diStatus || 'WAITING',
          psramStatus: data.psramStatus || 'WAITING',
          rtcStatus: data.rtcStatus || 'WAITING',
          flashStatus: data.flashStatus || 'WAITING',
          frStatus: data.frStatus || 'WAITING',
          switchStatus: data.switchStatus || 'WAITING',
          apStatus: data.apStatus || 'WAITING',
          busStatus: data.busStatus || 'WAITING',
          driverStatus: data.driverStatus || 'WAITING',
          rs232Log: data.rs232Log || '',
          rs485Log: data.rs485Log || '',
          gprsLog: data.gprsLog || '',
          diLog: data.diLog || '',
          psramLog: data.psramLog || '',
          rtcLog: data.rtcLog || '',
          flashLog: data.flashLog || '',
          frLog: data.frLog || '',
          switchLog: data.switchLog || '',
          apLog: data.apLog || '',
          busLog: data.busLog || '',
          driverLog: data.driverLog || '',
          rs232Remarks: data.rs232Remarks || '',
          rs485Remarks: data.rs485Remarks || '',
          gprsRemarks: data.gprsRemarks || '',
          diRemarks: data.diRemarks || '',
          psramRemarks: data.psramRemarks || '',
          rtcRemarks: data.rtcRemarks || '',
          flashRemarks: data.flashRemarks || '',
          frRemarks: data.frRemarks || '',
          switchRemarks: data.switchRemarks || '',
          apRemarks: data.apRemarks || '',
          busRemarks: data.busRemarks || '',
          driverRemarks: data.driverRemarks || '',
          lastOnline: new Date(),
          registrationMethod: data.registrationMethod || 'manual'
        });
        console.log(`[DATABASE] Device registered in MongoDB for IMEI: ${data.imei}`);
        return doc;
      }
    } catch (err) {
      console.error('[DATABASE] Failed to register/update device in MongoDB:', err);
      await saveTroubleshootLog('db_entry_failed', `Failed to register/update device in MongoDB for IMEI: ${data.imei || '(none)'}`, err.message);
      return savedDoc;
    }
  }
  return savedDoc;
}

async function deleteDeviceByImei(identifier) {
  let deletedFromLocal = false;
  try {
    const localDevices = loadLocalDevices();
    const filtered = localDevices.filter(d => d.imei !== identifier && d._id !== identifier);
    if (filtered.length !== localDevices.length) {
      saveLocalDevices(filtered);
      deletedFromLocal = true;
    }
  } catch (e) {
    console.error('[DATABASE] Failed to delete local device registry:', e);
  }

  if (mongodbConnected && identifier) {
    try {
      const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
      if (isObjectId) {
        await DeviceIdentificationModel.deleteOne({ _id: identifier });
      } else {
        await DeviceIdentificationModel.deleteOne({ imei: identifier });
      }
      console.log(`[DATABASE] Device deleted in MongoDB for identifier: ${identifier}`);
      return true;
    } catch (err) {
      console.error('[DATABASE] Failed to delete device in MongoDB:', err);
      return deletedFromLocal;
    }
  }
  return deletedFromLocal;
}

async function syncDeviceConfig(imei, bootData) {
  if (!mongodbConnected) return null;
  try {
    let device = await DeviceIdentificationModel.findOne({ imei });
    if (!device) {
      // Auto-register new device with boot payload details
      device = await DeviceIdentificationModel.create({
        imei: imei,
        mac: bootData.mac || '',
        pcbNumber: getCleanPcbNumber(bootData.pcbNumber, bootData.mac),
        connectionType: bootData.connectionType || 'unknown',
        target: bootData.target || '',
        password: bootData.password || 'admin_secure_gate',
        routerSSID: (bootData.wifi && bootData.wifi.ssid) || '',
        routerPassword: (bootData.wifi && bootData.wifi.password) || '',
        telemetryInterval: bootData.interval || 1500,
        registrationMethod: 'auto',
        lastOnline: new Date()
      });
      console.log(`[DATABASE] Auto-registered new device IMEI: ${imei}`);
      return { action: 'registered', config: device };
    } else {
      console.log(`[DATABASE] Found registered device config for IMEI: ${imei}`);
      device.lastOnline = new Date();
      await device.save().catch(e => console.error('[DATABASE] Failed to update lastOnline on sync:', e));
      return { action: 'sync', config: device };
    }
  } catch (err) {
    console.error('[DATABASE] syncDeviceConfig error:', err);
    await saveTroubleshootLog('db_entry_failed', `syncDeviceConfig failed for IMEI: ${imei}`, err.message);
    return null;
  }
}

module.exports = {
  TelemetryModel,
  CertificateLogModel,
  DeviceIdentificationModel,
  connectDatabase,
  saveTelemetrySnapshot,
  saveCertificateLog,
  getCertificateLogs,
  createDeviceIdentification,
  updateDeviceIdentification,
  getRegisteredDevices,
  getDeviceByImei,
  registerOrUpdateDevice,
  deleteDeviceByImei,
  syncDeviceConfig,
  saveTroubleshootLog,
  getTroubleshootLogs,
  clearTroubleshootLogs,
  isDbConnected: () => mongodbConnected,
  getMemoryHistoryBuffer: () => memoryHistoryBuffer,
  clearMemoryHistoryBuffer: () => { memoryHistoryBuffer = []; }
};


// Admin User Schema
const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true }
});
const AdminModel = mongoose.model('AdminUser', AdminSchema);

let OFFLINE_CREDENTIALS_PATH = '';
try {
  const { app } = require('electron');
  OFFLINE_CREDENTIALS_PATH = path.join(app.getPath('userData'), 'scratch', 'admin_credentials.json');
} catch (e) {
  OFFLINE_CREDENTIALS_PATH = path.join(__dirname, 'scratch', 'admin_credentials.json');
}

function getOfflineCredentials() {
  try {
    if (fs.existsSync(OFFLINE_CREDENTIALS_PATH)) {
      return JSON.parse(fs.readFileSync(OFFLINE_CREDENTIALS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[DATABASE] Failed to read offline credentials:', e);
  }
  return [{ username: 'admin', email: 'admin@iot-monitor.local', password: 'admin_secure_gate' }];
}

function saveOfflineCredentials(users) {
  try {
    const dir = path.dirname(OFFLINE_CREDENTIALS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(OFFLINE_CREDENTIALS_PATH, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error('[DATABASE] Failed to save offline credentials:', e);
  }
}

async function createAdminUser(username, email, password) {
  if (!mongodbConnected) {
    try {
      const users = getOfflineCredentials();
      const existing = users.find(u => u.username === username);
      if (existing) return { success: false, message: 'User exists' };
      users.push({ username, email, password });
      saveOfflineCredentials(users);
      return { success: true, message: 'Signup successful (Offline Mode)' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  try {
    const existing = await AdminModel.findOne({ username });
    if (existing) return { success: false, message: 'User exists' };
    await AdminModel.create({ username, email, password });
    return { success: true, message: 'Signup successful' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

async function verifyAdminUser(username, password) {
  if (!mongodbConnected) {
    try {
      const users = getOfflineCredentials();
      const user = users.find(u => u.username === username && u.password === password);
      if (user) return { success: true, message: 'Login successful (Offline Mode)' };
      return { success: false, message: 'Invalid credentials' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  try {
    const user = await AdminModel.findOne({ username, password });
    if (user) return { success: true, message: 'Login successful' };
    return { success: false, message: 'Invalid credentials' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

module.exports.createAdminUser = createAdminUser;
module.exports.verifyAdminUser = verifyAdminUser;
module.exports.getDbStatus = () => ({ connected: mongodbConnected });
module.exports.getDbExistsStatus = () => dbExistsStatus;
