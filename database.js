const mongoose = require('mongoose');

// Schema Definition
const TelemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  count: Number,
  devices: [
    {
      id: Number,
      temp: Number,
      rssi: Number,
      bat: Number,
      status: String
    }
  ]
});

const TelemetryModel = mongoose.model('Telemetry', TelemetrySchema);

let mongodbConnected = false;
let memoryHistoryBuffer = [];

// Initialize Database Connection
/*
function connectDatabase() {
  const mongoURI = 'mongodb://localhost:27017/IOT_System_Manager';
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

function connectDatabase(customURI) {
  const mongoURI = customURI || 'mongodb://localhost:27017/IOT_System_Manager';
  console.log(`[DATABASE] Connecting to MongoDB at ${mongoURI}...`);

  if (mongoose.connection.readyState !== 0) {
    mongoose.disconnect();
  }

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

// Save Telemetry snapshot helper
async function saveTelemetrySnapshot(data) {
  const snapshot = {
    timestamp: new Date(),
    count: data.count,
    devices: data.devices
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
  telemetryInterval: { type: Number, default: 1500 }
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
          telemetryInterval: data.telemetryInterval || 1500
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

