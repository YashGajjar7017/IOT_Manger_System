# MongoDB Database Guide & Schema Configuration

This guide details how the IOT Monitor System manages data persistence, database connections, and offline fallbacks, enabling the desktop application to run seamlessly as a standalone shareable executable (`.exe`).

---

## 1. Database Connection Architecture

The application uses **Mongoose** (MongoDB Object Modeling for Node.js) to connect to a local MongoDB instance.

- **Connection URL**: `mongodb://127.0.0.1:27017/iot_monitor`
- **Timeout Threshold**: `serverSelectionTimeoutMS: 3000` (Fast fail-over if MongoDB is not running).

### Graceful In-Memory Fallback
To ensure the packaged `.exe` can be shared with anyone (including users who do not have MongoDB installed on their system), the backend implements a dual-mode persistence architecture:
1. **MongoDB Mode**: If a local database is detected on startup, telemetry is stored persistently.
2. **In-Memory Fallback Mode**: If connection fails or times out (3 seconds), the app switches to an in-memory buffer (`memoryHistoryBuffer`), caching the last 50 telemetry snapshots.

This ensures zero-config execution for end-users.

---

## 2. Database Schema (Mongoose)

Telemetry snapshots are defined by the `Telemetry` schema in `main.js`:

```javascript
const TelemetrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  count: Number, // Number of client nodes reporting
  devices: [
    {
      id: Number,      // Node ID
      temp: Number,    // Temperature value (°C)
      rssi: Number,    // Signal strength (dBm)
      bat: Number,     // Battery charge status (%)
      status: String   // "ONLINE" or "OFFLINE"
    }
  ]
});
```

---

## 3. Data Retention & Auto-Capping

To prevent database bloating in Proof-of-Concept environments, the main process implements an automated capping policy:
- **MongoDB Capping**: Upon saving a new snapshot, the database size is checked. If it exceeds **200 documents**, the oldest snapshot is deleted:
  ```javascript
  const count = await TelemetryModel.countDocuments();
  if (count > 200) {
    const oldest = await TelemetryModel.find().sort({ timestamp: 1 }).limit(1);
    if (oldest.length > 0) {
      await TelemetryModel.deleteOne({ _id: oldest[0]._id });
    }
  }
  ```
- **In-Memory Capping**: The fallback array keeps a maximum of **50 items**, removing the oldest records when new telemetry arrives (`memoryHistoryBuffer.shift()`).

---

## 4. API Endpoints

The built-in Express server exposes the following REST interfaces for database interaction:

* **`GET /api/status`**: Returns the current connection mode and total records cached.
  ```json
  {
    "mongodb": "CONNECTED" | "FALLBACK_MEMORY",
    "recordsCount": 142
  }
  ```
* **`GET /api/telemetry/history`**: Returns the last 50 snapshots in reverse chronological order (newest first).
* **`DELETE /api/telemetry/history`**: Wipes the telemetry database collection (or clears the memory cache).
