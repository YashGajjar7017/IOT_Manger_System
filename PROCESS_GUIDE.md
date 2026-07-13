# IoT Monitor & Gateway Management System - Operation & Integration Guide

This guide provides a detailed, step-by-step walkthrough of the entire system workflow, from initial device boot and auto-discovery, through profile registration, diagnostics execution, database synchronization, and network troubleshooting.

---

## 1. System Boot & Network Setup
When the gateway (ESP32) is powered on:
1. It initializes the **SoftAP (Access Point) Mode** with an IP address of `192.168.4.1` (or connects as a client to a configured local network router).
2. It generates a unique SoftAP SSID dynamically formatted as: `ESP32_OTA_GATEWAY_<MAC>` (using its physical MAC address with colons removed).
3. The gateway starts three concurrent background tasks:
   * **TCP Server Task**: Listens on port `9000` to establish a telemetry and command link with the Electron application.
   * **UDP Discovery Task**: Listens on port `5002` for discovery broadcasts.
   * **HTTP Web Server Task**: Listens on port `500` (for HTTP POST firmware updates) and port `8000` (for certificates and SPIFFS file browser).

---

## 2. Network Discovery & Auto-Connection
1. When the Electron app starts, it periodically broadcasts a UDP discovery packet (`"DISCOVER_IOT_GATEWAY"`) on port `5002`.
2. Any listening ESP32 gateway receives this broadcast and responds with a JSON string containing its `status` (`"ONLINE"`), `ip` address, `imei` number, and `mac` address.
3. The Electron app captures this UDP response, registers the device in the UI's `Discovered Gateways` list, and automatically triggers an auto-connection handshake to the gateway's IP address on port `9000`.
4. Once connected, the gateway sends its initial `BOOT_SUCCESS` diagnostics payload to the Electron server.

---

## 3. Device Registration & Number Allocation
To register or edit a device profile in the database (`page-device-registry` tab):
1. **Form Loading**: When opening the registry page, the form loads the list of existing registered devices from MongoDB (with a local `devices_registry.json` file fallback).
2. **Auto-Incrementing Device Numbers**: The form automatically computes the next available unique device number by finding the maximum `deviceNumber` currently in the registry and incrementing it by 1 (`max + 1`).
3. **Manual Validation**: If the user overrides this value and inputs a number manually:
   * The frontend checks if the number is already allocated to another device IMEI.
   * The backend schema enforces uniqueness. If a duplicate is detected, it auto-assigns the next available number (`max + 1`) to guarantee no two devices ever share a number.
4. **Registration**: Submitting the form registers or updates the profile in the MongoDB registry database.

---

## 4. Real-Time Diagnostics & Checklist
The active telemetry diagnostics panel displays the status of all 9 hardware self-check modules:
1. **Modules Tested**:
   * **RS232 Interface**: Loopback testing.
   * **RS485 Interface**: MODBUS communication checks.
   * **GPRS GSM Modem**: Cellular network connection checks.
   * **AP Module**: Wireless Access Point connectivity.
   * **BUS Module**: Internal serial/peripheral bus links.
   * **Driver Pin**: Gate driver output pin states.
   * **SPIFFS Flash**: Internal file system read/write checks.
   * **Digital Input (DI)**: DI signal line checks.
   * **RTC Clock**: Real-Time Clock read/write validations.
2. **Execution**: Clicking **Test** next to any module sends a TCP command formatted as `TEST_<MODULE>` (e.g., `TEST_AP`, `TEST_BUS`) to the gateway.
3. **State Mapping**: The gateway runs the check, updates its internal state, and sends back the result. The application maps the response:
   * `true` / `"OK"` / `"PASSED"` $\rightarrow$ **Green (OK)**
   * `false` / `"ERROR"` / `"FAILED"` $\rightarrow$ **Red (ERROR)**
   * `"WAITING"` / `"PENDING"` $\rightarrow$ **Orange (WAITING)**

---

## 5. Manual & Automatic Database Syncing
1. **Auto Sync**: Any incoming `BOOT_SUCCESS` or telemetry diagnostics completed payload received on the TCP link is automatically parsed by the Electron backend, normalized (mapping boolean flags to `OK`/`ERROR` strings), and written directly to the database.
2. **Sync to DB Button**: Under the active device header card, a **Sync to DB** button is available. If configuration parameters are updated on the device but not yet reflected in the cloud database, clicking this button immediately gathers the active device's details, SSID, MAC, IMEI, and current diagnostics checks, and makes an HTTP POST to `/api/devices/register` to update the database registry.
3. **Network Discovery Status**: In the registered devices list, a **Net Status** column performs a live check:
   * If the registered device is currently connected, discovered via UDP, or its SSID/SoftAP is in the range of the PC's WiFi card scan, it displays a **Green (ONLINE)** status.
   * Otherwise, it displays a **Red (STOP)** status.

---

## 6. Connection Stability & Watchdogs
To prevent random TCP socket dropouts (where the socket enters a half-open state due to Wi-Fi link renegotiations and remains hung):
1. **Server Ping**: The Electron app sends a `PING` string to the connected client socket every 3 seconds.
2. **Client Watchdog Timer**: 
   * The ESP32 gateway monitors incoming TCP packets inside its `TaskTCPServer` loop.
   * Every successful receipt of a `PING` command refreshes a `lastTcpActivityTime` timestamp.
   * If no telemetry or ping activity is received from the Electron server for **15 seconds**, the watchdog timer fires, outputs a `[TCP WATCHDOG] No activity...` message, and executes `tcpClient.stop()`.
   * This cleanly releases the socket, allowing the gateway to accept the next incoming connection immediately when the Wi-Fi link recovers.
3. **Thread Safety**: All socket reads and writes are synchronized using the ESP32 RTOS `logMutex` semaphore, preventing race conditions between Core 0 and Core 1 when writing log messages.
