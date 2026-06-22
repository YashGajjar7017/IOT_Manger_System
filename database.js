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
function connectDatabase() {
  const mongoURI = 'mongodb://127.0.0.1:27017/iot_monitor';
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

module.exports = {
  TelemetryModel,
  connectDatabase,
  saveTelemetrySnapshot,
  isDbConnected: () => mongodbConnected,
  getMemoryHistoryBuffer: () => memoryHistoryBuffer,
  clearMemoryHistoryBuffer: () => { memoryHistoryBuffer = []; }
};
