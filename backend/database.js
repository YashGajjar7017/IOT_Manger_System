const mongoose = require('mongoose');

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
  rs232Log: { type: String, default: '' },
  rs485Log: { type: String, default: '' },
  gprsLog: { type: String, default: '' }
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

function connectDatabase(customURI) {
  const rawURI = customURI || 'mongodb://192.168.1.26:27017/IOT_System_Manager/IOT_System_Manager'; // 'mongodb+srv://yashacker:Iamyash@reactdb.d04du.mongodb.net/?appName=ReactDB';
  const mongoURI = sanitizeMongoURI(rawURI);
  console.log(`[DATABASE] Connecting to MongoDB at ${mongoURI}...`);

  if (mongoose.connection.readyState !== 0) {
    mongoose.disconnect();
  }

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
      throw err;
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
    pcbNumber: (device && device.pcbNumber) || data.pcbNumber || '',
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
    rs232Log: (device && device.rs232Log) || data.rs232Log || '',
    rs485Log: (device && device.rs485Log) || data.rs485Log || '',
    gprsLog: (device && device.gprsLog) || data.gprsLog || ''
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

// DeviceIdentification Schema Definition
const DeviceIdentificationSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  pcbNumber: { type: String, default: '' },
  connectionType: String,
  target: String,
  imei: { type: String, default: '' },
  mac: { type: String, default: '' },
  password: { type: String, default: '' },
  routerSSID: { type: String, default: '' },
  routerPassword: { type: String, default: '' },
  telemetryInterval: { type: Number, default: 1500 },
  rs232Status: { type: String, default: 'WAITING' },
  rs485Status: { type: String, default: 'WAITING' },
  gprsStatus: { type: String, default: 'WAITING' },
  rs232Log: { type: String, default: '' },
  rs485Log: { type: String, default: '' },
  gprsLog: { type: String, default: '' }
});

const DeviceIdentificationModel = mongoose.model('DeviceIdentification', DeviceIdentificationSchema);

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
    pcbNumber: data.pcbNumber || '',
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
      return await DeviceIdentificationModel.find().sort({ timestamp: -1 });
    } catch (err) {
      console.error('[DATABASE] Failed to fetch registered devices from MongoDB:', err);
      return [];
    }
  } else {
    return [];
  }
}

async function getDeviceByImei(imei) {
  if (mongodbConnected && imei) {
    try {
      return await DeviceIdentificationModel.findOne({ imei });
    } catch (err) {
      console.error('[DATABASE] Failed to find device by IMEI in MongoDB:', err);
      return null;
    }
  }
  return null;
}

async function registerOrUpdateDevice(data) {
  if (mongodbConnected && data.imei) {
    try {
      let doc = await DeviceIdentificationModel.findOne({ imei: data.imei });
      if (doc) {
        doc.pcbNumber = data.pcbNumber || doc.pcbNumber;
        doc.connectionType = data.connectionType || doc.connectionType;
        doc.target = data.target || doc.target;
        doc.mac = data.mac || doc.mac;
        doc.password = data.password !== undefined ? data.password : doc.password;
        doc.routerSSID = data.routerSSID !== undefined ? data.routerSSID : doc.routerSSID;
        doc.routerPassword = data.routerPassword !== undefined ? data.routerPassword : doc.routerPassword;
        doc.telemetryInterval = data.telemetryInterval !== undefined ? data.telemetryInterval : doc.telemetryInterval;
        
        doc.rs232Status = data.rs232Status !== undefined ? data.rs232Status : doc.rs232Status;
        doc.rs485Status = data.rs485Status !== undefined ? data.rs485Status : doc.rs485Status;
        doc.gprsStatus = data.gprsStatus !== undefined ? data.gprsStatus : doc.gprsStatus;
        doc.rs232Log = data.rs232Log !== undefined ? data.rs232Log : doc.rs232Log;
        doc.rs485Log = data.rs485Log !== undefined ? data.rs485Log : doc.rs485Log;
        doc.gprsLog = data.gprsLog !== undefined ? data.gprsLog : doc.gprsLog;
        
        await doc.save();
        console.log(`[DATABASE] Device updated for IMEI: ${data.imei}`);
        return doc;
      } else {
        doc = await DeviceIdentificationModel.create({
          imei: data.imei,
          pcbNumber: data.pcbNumber || '',
          connectionType: data.connectionType || 'unknown',
          target: data.target || '',
          mac: data.mac || '',
          password: data.password || 'admin_secure_gate',
          routerSSID: data.routerSSID || '',
          routerPassword: data.routerPassword || '',
          telemetryInterval: data.telemetryInterval || 1500,
          rs232Status: data.rs232Status || 'WAITING',
          rs485Status: data.rs485Status || 'WAITING',
          gprsStatus: data.gprsStatus || 'WAITING',
          rs232Log: data.rs232Log || '',
          rs485Log: data.rs485Log || '',
          gprsLog: data.gprsLog || ''
        });
        console.log(`[DATABASE] Device registered for IMEI: ${data.imei}`);
        return doc;
      }
    } catch (err) {
      console.error('[DATABASE] Failed to register/update device in MongoDB:', err);
      return null;
    }
  }
  return null;
}

async function deleteDeviceByImei(imei) {
  if (mongodbConnected && imei) {
    try {
      await DeviceIdentificationModel.deleteOne({ imei });
      console.log(`[DATABASE] Device deleted for IMEI: ${imei}`);
      return true;
    } catch (err) {
      console.error('[DATABASE] Failed to delete device in MongoDB:', err);
      return false;
    }
  }
  return false;
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
        pcbNumber: bootData.pcbNumber || 'AUTO-REGISTERED',
        connectionType: bootData.connectionType || 'unknown',
        target: bootData.target || '',
        password: bootData.password || 'admin_secure_gate',
        routerSSID: (bootData.wifi && bootData.wifi.ssid) || '',
        routerPassword: (bootData.wifi && bootData.wifi.password) || '',
        telemetryInterval: bootData.interval || 1500
      });
      console.log(`[DATABASE] Auto-registered new device IMEI: ${imei}`);
      return { action: 'registered', config: device };
    } else {
      console.log(`[DATABASE] Found registered device config for IMEI: ${imei}`);
      return { action: 'sync', config: device };
    }
  } catch (err) {
    console.error('[DATABASE] syncDeviceConfig error:', err);
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
  isDbConnected: () => mongodbConnected,
  getMemoryHistoryBuffer: () => memoryHistoryBuffer,
  clearMemoryHistoryBuffer: () => { memoryHistoryBuffer = []; }
};


// Admin User Schema
const AdminSchema = new mongoose.Schema({ 
  username: { type: String, required: true, unique: true }, 
  password: { type: String, required: true } 
});
const AdminModel = mongoose.model('AdminUser', AdminSchema);

const fs = require('fs');
const path = require('path');
const OFFLINE_CREDENTIALS_PATH = path.join(__dirname, 'scratch', 'admin_credentials.json');

function getOfflineCredentials() {
  try {
    if (fs.existsSync(OFFLINE_CREDENTIALS_PATH)) {
      return JSON.parse(fs.readFileSync(OFFLINE_CREDENTIALS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[DATABASE] Failed to read offline credentials:', e);
  }
  return [{ username: 'admin', password: 'admin_secure_gate' }];
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

async function createAdminUser(username, password) { 
  if (!mongodbConnected) {
    try {
      const users = getOfflineCredentials();
      const existing = users.find(u => u.username === username);
      if (existing) return { success: false, message: 'User exists' };
      users.push({ username, password });
      saveOfflineCredentials(users);
      return { success: true, message: 'Signup successful (Offline Mode)' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
  try { 
    const existing = await AdminModel.findOne({ username }); 
    if (existing) return { success: false, message: 'User exists' }; 
    await AdminModel.create({ username, password }); 
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
