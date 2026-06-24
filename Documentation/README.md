# IoT Monitor System - Developer Functions & Architecture Guide

This directory contains developer documentation explaining every major function, handler, and workflow in the IoT Monitor System (Electron Desktop Client + ESP32 Firmware).

---

## 1. System Architecture Overview

The system is composed of:
1. **ESP32 Firmware (`firmware.ino`)**: Runs dual-mode `WIFI_AP_STA`. Operates a raw TCP server (Port 9000) for telemetry stream/commands, a UDP responder (Port 5002) for auto-discovery, and an HTTP WebServer (Port 8000) for status querying and OTA flash uploads. Remaps hardware `Serial1` to RX:16/TX:17 to interface with the QCOM co-processor.
2. **Electron Main Process (`main.js`)**: Orchestrates background TCP/UDP socket servers, manages USB serial connections (with DTR/RTS line triggers), and operates a local Express server (Port 500) to proxy file flashes in-memory.
3. **React UI App (`src/App.jsx`)**: Rendered in the Electron wrapper, providing control switches, historical databases, cert upload dropzones, and real-time consoles.

---

## 2. ESP32 Firmware Functions (`firmware.ino`)

### System Core & Callbacks
*   **`setup()`**: Configures hardware output pins for relays, mounts Winbond flash SPIFFS filesystem, binds UDP listener on port `5002`, starts serial interfaces (`Serial` at 115200, `Serial1` at 115200 on pins 16/17), configures dual WiFi, and prints active partition table data on boot.
*   **`loop()`**: Continuously processes incoming UDP discovery packets and schedules the system state loops: Halt, Diagnostics, or Running.
*   **`onWiFiAPEvent(WiFiEvent_t event)`**: Listens for WiFi Access Point station connection events. When a client connects or disconnects to the ESP32 softAP, it prints log frames to Serial and sends a socket update to Electron.

### Halt, Diagnostics, & Boot Control
*   **`handleHaltState()`**: Holds the device in start boot halt, keeping HTTP/TCP interfaces active and listening for serial/network commands. Initiates the full self-check if the `START_BOOT` command is received.
*   **`runDiagnostics()`**: Sequence of mock-testing the 9 core hardware transceiver modules (RS232, RS485, GPRS, Modbus internal bus, WiFi AP, SPI Winbond flash, Digital inputs, relays, and DS3231 RTC). Generates diagnostic status parameters.
*   **`sendBootSuccessPayload()`**: Packs all 9 peripheral diagnostic statuses, device MAC address, current active certificates list, IMEI, and passwords into a JSON block and broadcasts it.

### Certificates & Partition Syncing
*   **`dumpCertsToQcom()`**: Reads files `/aws_root_ca.pem`, `/device_cert.crt`, and `/private_key.key` from SPIFFS and streams their content byte-by-byte over `Serial1` using frame boundary headers `--- START_CERT ---` and `--- END_CERT ---` to provision the QCOM co-processor.
*   **`shiftToQcomPartition()`**: Safely erases the SPIFFS `core` partition, copies the compiled application binary blocks from the inactive OTA app partition to the core partition, and reports progress updates.
*   **`setupHTTPServer()`**: Regulates the HTTP routes on Port 8000:
    *   `GET /`: Serves a detailed HTML web page showing hardware MAC, IMEI, and connected AP clients.
    *   `GET /api/info`: Returns a JSON object with SSID, dynamic IP, active relay states, and intervals for easy remote polling.
    *   `POST /update`: Handles raw OTA stream parsing and writes sector blocks into app partitions.

---

## 3. Electron Main Process (`main.js`)

### Auto-Discovery & Networking
*   **`startOtaLocalServer()`**: Boots an Express server on Port 500 (with port 5000 fallback). Serves a premium drag-and-drop flasher HTML page. Upon file upload, it streams raw multipart bytes directly to the ESP32 OTA endpoint to bypass local disk permissions.
*   **`start-udp-discovery` IPC handler**: Broadcasts UDP query packet to `255.255.255.255:5002` to discover local gateways and replies to the renderer with target IPs.

### Hardware Port Interface
*   **`connect-serial` IPC handler**: Connects to the chosen USB serial target. Automatically toggles RTS on start to perform a hardware EN reset. Listens for serial lines starting with `JSON_PAYLOAD:` or `CONTROL_STATUS:` to sync telemetry grids.
*   **`reset-device` & `enter-bootloader` IPC**: Sequentially writes RTS and DTR pins to force ESP32 hard resets or enter GPIO0 ROM download mode.
*   **`connect-tcp` IPC handler**: Establishes a raw socket connection on port `9000`.

### Step-by-Step Certificate Downloader
*   **`download-and-provision-certs` IPC handler**: Updates credentials in a 3-step sequence:
    1.  Downloads certificates from separate URLs to PC cache directory `scratch/certs/`.
    2.  Reads files from local disk and uploads them using multipart POST to ESP32 SPIFFS `/upload_cert`.
    3.  Writes command `SYNC_CERTS_TO_QCOM\n` over the TCP/Serial channel to trigger the co-processor transfer.

### Remote URL Flash Downloader
*   **`download-and-flash-firmware` IPC handler**: Implements step-by-step firmware updates from a remote URL:
    1.  Downloads the `.bin` firmware file locally to `scratch/remote_firmware.bin`.
    2.  Pipes the downloaded binary raw file stream to the ESP32 HTTP OTA update endpoint on the configured Port ID.
    3.  Deletes the cache file on completion.

---

## 4. Frontend Controls App (`src/App.jsx`)

### Navigation & Tab UI
*   `activeTab` controls which view is currently active: `page-dashboard`, `page-database` (MongoDB logs list), `page-security` (cert/identity settings), `page-ota` (wireless updates flasher), or `page-console` (debug log stream).

### Network Inputs & Local Triggers
*   **`startCertProvisioning()`**: Validates input fields and passes the Root CA, Device Certificate, and Private Key URLs as an object structure to the IPC cert downloader.
*   **`startOtaUrlUpdate()`**: Triggers URL-based firmware downloader using input URLs and Port ID parameters.
*   **`connectDiscoveredGateway()`**: Dynamically updates the active gateway WiFi and OTA IP address fields upon connection.
*   **`Skip Boot Diagnostics button`**: Triggers a bypass action that overrides stepper state variables (`bootProgress` to 100, `controlsDisabled` to false) allowing direct layout interactions without running physical checks.
