/**
 * data-worker.js — Worker Thread for IoT Monitor System
 *
 * Runs in a separate thread from the Electron main process.
 * Responsibilities:
 *   1. Parse raw JSON lines from serial/TCP data streams (CPU-intensive)
 *   2. Save telemetry snapshots to MongoDB / memory fallback (I/O-intensive)
 *   3. Return parsed payloads to the main thread via postMessage
 *
 * This prevents the main thread (which handles UI + IPC) from blocking
 * during heavy JSON processing or slow DB write operations.
 *
 * Message protocol:
 *   IN  { type: 'PARSE_LINE',   line: string }
 *   IN  { type: 'PARSE_LINES',  lines: string[] }
 *   IN  { type: 'DB_RECONNECT', uri: string }
 *   IN  { type: 'SHUTDOWN' }
 *
 *   OUT { type: 'TELEMETRY',       payload: object }
 *   OUT { type: 'HARDWARE',        payload: object }
 *   OUT { type: 'CONTROL_STATUS',  payload: object }
 *   OUT { type: 'PONG' }
 *   OUT { type: 'CONSOLE_LOG',     message: string }
 *   OUT { type: 'ERROR',           message: string }
 *   OUT { type: 'DB_READY',        connected: boolean }
 */

'use strict';

const { parentPort, workerData } = require('worker_threads');
const path = require('path');

// Load the database module inside the worker so DB I/O is off the main thread
let db;
try {
  db = require(path.join(__dirname, 'database.js'));
  const mongoUri = workerData && workerData.mongoUri
    ? workerData.mongoUri
    : 'mongodb://127.0.0.1:27017/iot_monitor';

  db.connectDatabase(mongoUri)
    .then(() => {
      parentPort.postMessage({ type: 'CONSOLE_LOG', message: '[WORKER] Database connection initialised inside worker thread.' });
      parentPort.postMessage({ type: 'DB_READY', connected: db.isDbConnected() });
    })
    .catch((err) => {
      parentPort.postMessage({ type: 'CONSOLE_LOG', message: `[WORKER] DB connect failed (using memory fallback): ${err.message}` });
      parentPort.postMessage({ type: 'DB_READY', connected: false });
    });
} catch (err) {
  parentPort.postMessage({ type: 'CONSOLE_LOG', message: `[WORKER] Failed to load database module: ${err.message}` });
}

/**
 * Process a single trimmed line of text from serial/TCP stream.
 * Returns an array of message objects to send back to main thread.
 */
function processLine(line) {
  const results = [];

  if (!line) return results;

  // ── JSON_PAYLOAD: prefix (serial protocol) ──────────────────────────────
  if (line.startsWith('JSON_PAYLOAD:')) {
    const jsonStr = line.substring(13);
    try {
      const payload = JSON.parse(jsonStr);
      if (payload.type === 'telemetry') {
        results.push({ type: 'TELEMETRY', payload });
        // Non-blocking DB save — errors are caught internally
        if (db) {
          db.saveTelemetrySnapshot(payload).catch((err) => {
            parentPort.postMessage({ type: 'CONSOLE_LOG', message: `[WORKER] DB save error: ${err.message}` });
          });
        }
      } else {
        results.push({ type: 'HARDWARE', payload });
      }
    } catch (e) {
      results.push({ type: 'CONSOLE_LOG', message: `[WORKER ERROR] Failed to parse JSON_PAYLOAD: ${e.message}` });
    }
    return results;
  }

  // ── CONTROL_STATUS: prefix (serial protocol) ────────────────────────────
  if (line.startsWith('CONTROL_STATUS:')) {
    const jsonStr = line.substring(15);
    try {
      const payload = JSON.parse(jsonStr);
      results.push({ type: 'CONTROL_STATUS', payload });
    } catch (e) {
      results.push({ type: 'CONSOLE_LOG', message: `[WORKER ERROR] Failed to parse CONTROL_STATUS: ${e.message}` });
    }
    return results;
  }

  // ── TCP bare JSON (no prefix, line is raw JSON) ──────────────────────────
  if (line.startsWith('{') || line.startsWith('[')) {
    try {
      const payload = JSON.parse(line);
      if (payload.type === 'telemetry') {
        results.push({ type: 'TELEMETRY', payload });
        if (db) {
          db.saveTelemetrySnapshot(payload).catch((err) => {
            parentPort.postMessage({ type: 'CONSOLE_LOG', message: `[WORKER] DB save error: ${err.message}` });
          });
        }
      } else if (payload.type === 'control_status') {
        results.push({ type: 'CONTROL_STATUS', payload });
      } else if (payload.type === 'pong') {
        results.push({ type: 'PONG' });
      } else if (payload.status) {
        results.push({ type: 'HARDWARE', payload });
      } else {
        // Unknown JSON structure — log it
        results.push({ type: 'CONSOLE_LOG', message: `[TCP RX] ${line}` });
      }
    } catch (e) {
      // Not JSON — treat as plain console line
      results.push({ type: 'CONSOLE_LOG', message: line });
    }
    return results;
  }

  // ── Plain text line (serial debug output, status messages etc.) ──────────
  results.push({ type: 'CONSOLE_LOG', message: line });
  return results;
}

// ── Main message handler ────────────────────────────────────────────────────
parentPort.on('message', (msg) => {
  try {
    switch (msg.type) {
      case 'PARSE_LINE': {
        const line = (msg.line || '').trim();
        if (!line) return;
        const results = processLine(line);
        results.forEach((r) => parentPort.postMessage(r));
        break;
      }

      case 'PARSE_LINES': {
        const lines = msg.lines || [];
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          const results = processLine(line);
          results.forEach((r) => parentPort.postMessage(r));
        }
        break;
      }

      case 'DB_RECONNECT': {
        if (db && msg.uri) {
          db.connectDatabase(msg.uri)
            .then(() => {
              parentPort.postMessage({ type: 'DB_READY', connected: db.isDbConnected() });
              parentPort.postMessage({ type: 'CONSOLE_LOG', message: '[WORKER] Database reconnected successfully.' });
            })
            .catch((err) => {
              parentPort.postMessage({ type: 'DB_READY', connected: false });
              parentPort.postMessage({ type: 'CONSOLE_LOG', message: `[WORKER] Database reconnect failed: ${err.message}` });
            });
        }
        break;
      }

      case 'SHUTDOWN': {
        parentPort.postMessage({ type: 'CONSOLE_LOG', message: '[WORKER] Shutting down data worker thread.' });
        process.exit(0);
        break;
      }

      default:
        parentPort.postMessage({ type: 'CONSOLE_LOG', message: `[WORKER] Unknown message type: ${msg.type}` });
    }
  } catch (err) {
    parentPort.postMessage({ type: 'ERROR', message: `[WORKER EXCEPTION] ${err.message}` });
  }
});

parentPort.postMessage({ type: 'CONSOLE_LOG', message: '[WORKER] Data processing worker thread started.' });
