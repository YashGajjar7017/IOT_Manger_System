# IoT Monitor System Setup & Build Guide

This guide describes how to configure, compile, and run the IoT Monitor System (ESP32 Firmware + Electron React App) and build the production-ready standalone executable (`.exe`).

---

## 1. ESP32 Firmware Compilation & Setup

The IoT co-processor gateway runs the C++ code located in [firmware.ino](file:///a:/Coding/Electron/IOT_System_Manager_System/firmware/firmware.ino).

### Prerequisites
1. Download and install **Arduino IDE** (or VS Code with PlatformIO).
2. Install the **ESP32 Board Package** in Arduino IDE (Tools > Board > Boards Manager > search for "esp32" by Espressif Systems).
3. Select board target: **ESP32 Dev Module** or **ESP32S3 Dev Module**.

### Wireless Router Configuration
On boot, the ESP32 automatically configures:
1. **Station Mode (STA)**: Connects to your wireless router to communicate over the local network.
2. **Access Point Mode (SoftAP)**: Broadcasts an open backup configuration SSID (`ESP32_GATEWAY_XXXX`) if no router is present.

Configure your router credentials in [firmware.ino](file:///a:/Coding/Electron/IOT_System_Manager_System/firmware/firmware.ino):
```cpp
const char* routerSSID = "IoT_Router";
const char* routerPassword = "password123";
```

### Flashing
- Connect the ESP32 to your PC via a USB cable.
- Select the correct COM port in the IDE.
- Click **Upload** to compile and flash.

---

## 2. Desktop Application Setup

The dashboard is built on React, Vite, and Electron.

### Setup Steps
1. Navigate to the project root directory:
   ```bash
   cd a:\Coding\Electron\IOT_System_Manager_System
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Running in Development
To run the React dev server and the Electron container simultaneously with hot-reload enabled:
```bash
npm run electron-dev
```

---

## 3. Standalone Packaging (.exe)

To bundle the application into a single standalone installer that can be shared with anyone:

1. Run the build script:
   ```bash
   npm run electron-build
   ```
   This script triggers `vite build` (compiling React to `frontend-build/`) and then invokes `electron-builder` to package the files.
2. Once complete, you will find the generated installer binaries in the **`installer-release/`** directory:
   * **`IOT Monitor System Setup 2.0.0.exe`**: Standard installer which installs the application on Windows.
   * **`IOT Monitor System 2.0.0.exe`**: Portable application that runs instantly without installation.

### Zero-Configuration Sharing
These executables can be copied, zipped, or shared via USB/LocalSend with anyone. They run without any database prerequisites because the application automatically falls back to an in-memory buffer if MongoDB is not running on the target PC.
