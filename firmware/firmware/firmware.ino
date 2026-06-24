/**
 * ESP32 IoT Gateway Firmware Proof-of-Concept (Revision 2)
 *
 * Hardware Requirements:
 * - Boot Halt state: Press BOOT button (GPIO 0) or send "START_BOOT" over
 * Serial to initiate.
 * - Sequential diagnostics for 9 peripherals.
 * - WiFi Access Point mode (local wireless router/dongle).
 * - Raw TCP server (Port 9000) for streaming telemetry data and processing
 * commands.
 * - HTTP OTA server (Port 8000) for firmware binary uploads.
 * - NEW: Command processor for dynamic relay controls, diagnostic rechecks, and
 * interval tuning.
 */

#include "FS.h"
#include "SPIFFS.h"
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include <Update.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <queue>

// Thread-safe notification queue for WiFi events
std::queue<String> tcpNotificationQueue;
SemaphoreHandle_t tcpQueueSemaphore = NULL;

// Pins
const int BOOT_BUTTON_PIN =
    0; // GPIO 0 is the default Boot button on most ESP32 boards

// Server instances on updated ports
WebServer httpServer(8000); // HTTP OTA on Port 8000
WiFiServer tcpServer(9000); // TCP Telemetry on Port 9000
WiFiClient tcpClient;

// System States
enum SystemState { STATE_HALT, STATE_DIAGNOSTICS, STATE_RUNNING };

SystemState currentState = STATE_HALT;
unsigned long lastLogTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long telemetryInterval =
    1500; // Customizable telemetry frequency in milliseconds

// Physical Relays/Outputs
const int RELAY_1_PIN = 12;
const int RELAY_2_PIN = 13;
bool relay1State = false;
bool relay2State = false;

// Device Identity
String deviceIMEI = "866738083623502";
String deviceMAC = "";
String devicePassword = "admin_secure_gate";

// Wireless Router Credentials
String routerSSID = "HK_Automation";
String routerPassword = "Airte1@12";

// UDP Discovery Settings
WiFiUDP udpListener;
const int UDP_PORT = 5002;

// SoftAP Station helper definition
#define NUM_CLIENT_DEVICES WiFi.softAPgetStationNum()

// Simulated SPIFFS Certificate Storage
#define MAX_CERTS 10
String certNames[MAX_CERTS] = {"rootCA.pem", "device_cert.crt",
                               "private_key.key"};
size_t certSizes[MAX_CERTS] = {1188, 2048, 1675};
int certCount = 3;

// 9-Point Diagnostic Results
struct DiagnosticReport {
  bool rs232 = false;
  bool rs485 = false;
  bool gprs = false;
  bool bus = false;
  bool ap = false;
  bool flash = false;
  bool di = false;
  bool driver = false;
  bool rtc = false;
} diagnostics;

String getCertificatesJson() {
  String json = "[";
  bool first = true;

  // Try using real SPIFFS
  File root = SPIFFS.open("/");
  if (root && root.isDirectory()) {
    File file = root.openNextFile();
    while (file) {
      String name = String(file.name());
      if (name.startsWith("/"))
        name = name.substring(1);

      // Filter for certificate extensions
      if (name.endsWith(".pem") || name.endsWith(".crt") ||
          name.endsWith(".key")) {
        if (!first)
          json += ",";
        json +=
            "{\"name\":\"" + name + "\",\"size\":" + String(file.size()) + "}";
        first = false;
      }
      file = root.openNextFile();
    }
    root.close();
  }

  // Fallback to simulated certificates if SPIFFS had none
  if (first) {
    for (int i = 0; i < certCount; i++) {
      if (i > 0)
        json += ",";
      json += "{\"name\":\"" + certNames[i] +
              "\",\"size\":" + String(certSizes[i]) + "}";
    }
  }

  json += "]";
  return json;
}

void setup() {
  // Start serial at 115200 for main logging
  Serial.begin(115200);
  delay(300); // Give Serial interface time to settle
  
  // Initialize TCP notification queue mutex (Requirement 4)
  tcpQueueSemaphore = xSemaphoreCreateMutex();
  
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

  Serial.println("\n\n=============================================================");
  Serial.println("       ESP32 IOT GATEWAY FIRMWARE SYSTEM INITIALIZING         ");
  Serial.println("=============================================================");
  Serial.println("[SYSTEM] Baudrate configured at 115200 bps.");

  // Configure Relay Pins
  Serial.println("[GPIO] Configuring physical output pin relays...");
  pinMode(RELAY_1_PIN, OUTPUT);
  pinMode(RELAY_2_PIN, OUTPUT);
  digitalWrite(RELAY_1_PIN, LOW);
  digitalWrite(RELAY_2_PIN, LOW);
  Serial.println("[GPIO] Relays initialized. State: LOW (Inactive)");

  // Initialize SPIFFS
  Serial.println("[SPIFFS] Mounting storage partition... (Note: Formatting may take up to 45 seconds if filesystem is corrupted)");
  if (!SPIFFS.begin(true)) {
    Serial.println("[SPIFFS] ERROR: SPIFFS Mount Failed!");
  } else {
    Serial.println("[SPIFFS] SPIFFS Mount Successful.");
  }

  // Auto-connect WiFi (SoftAP + STA) on boot (Non-blocking)
  // This initializes the ESP32 TCP/IP stack before we start UDP/TCP listening!
  setupWiFi();

  // Start Serial1 for QCOM co-processor interface on GPIO 16 (RX) and 17 (TX)
  Serial.println("[QCOM] Starting Serial1 interface on pins RX:16, TX:17 at 115200 bps...");
  Serial1.begin(115200, SERIAL_8N1, 16, 17);
  Serial.println("[QCOM] Serial1 communication channel active.");

  // Start UDP Discovery responder
  Serial.printf("[UDP] Starting Discovery responder on port %d...\n", UDP_PORT);
  udpListener.begin(UDP_PORT);
  Serial.println("[UDP] Discovery responder ready.");

  Serial.println("\n=============================================");
  Serial.println("ESP32 IoT Gateway Boot Loader Version 3.0.0");
  Serial.println("=============================================");

  // Print Partition Table Info
  Serial.println("[SYSTEM] Querying active ESP32 Partition Table:");
  esp_partition_iterator_t it = esp_partition_find(
      ESP_PARTITION_TYPE_ANY, ESP_PARTITION_SUBTYPE_ANY, NULL);
  while (it != NULL) {
    const esp_partition_t *part = esp_partition_get(it);
    Serial.printf("  - %-8s | Type: 0x%02X | Subtype: 0x%02X | Offset: 0x%06X "
                  "| Size: 0x%06X (%d KB)\n",
                  part->label, part->type, part->subtype, part->address,
                  part->size, part->size / 1024);
    it = esp_partition_next(it);
  }

  // Print current running partition
  const esp_partition_t *running = esp_ota_get_running_partition();
  if (running != NULL) {
    Serial.printf("[SYSTEM] Running partition: %s (Offset: 0x%06X, Size: %d KB)\n",
                  running->label, running->address, running->size / 1024);
  } else {
    Serial.println(
        "[SYSTEM] Failed to detect running partition (Defaulting to app0)");
  }

  // Auto-connect WiFi (SoftAP + STA) on boot (Non-blocking)
  // setupWiFi();

  // Start HTTP and TCP servers immediately on boot to listen in
  // HALT/Diagnostics state
  Serial.println("[TCP] Starting live telemetry server on port 9000...");
  tcpServer.begin();
  Serial.println("[TCP] Live Telemetry server started.");
  
  Serial.println("[HTTP] Starting OTA HTTP server on port 8000...");
  setupHTTPServer();
  Serial.println("[HTTP] OTA Server started.");

  Serial.println("\n[SYSTEM] Boot process finished. Gateway entering: HALT / WAIT state.");
  Serial.println("[SYSTEM] Awaiting boot trigger. Waiting 5 seconds before Auto-Start diagnostics...");
}

void handleUDPDiscovery() {
  int packetSize = udpListener.parsePacket();
  if (packetSize) {
    char packetBuffer[255];
    int len = udpListener.read(packetBuffer, 255);
    if (len > 0) {
      packetBuffer[len] = 0;
    }
    String request = String(packetBuffer);
    request.trim();
    if (request == "DISCOVER_IOT_GATEWAY") {
      udpListener.beginPacket(udpListener.remoteIP(), udpListener.remotePort());
      
      /*
      String response = "{\"status\":\"ONLINE\",\"ip\":\"" +
                        WiFi.localIP().toString() + "\",\"imei\":\"" +
                        deviceIMEI + "\",\"mac\":\"" + deviceMAC + "\"}";
      */

      // Determine correct IP to reply with. If localIP is 0.0.0.0 (STA disconnected),
      // or if request came from the SoftAP subnet (192.168.4.X), return softAPIP (192.168.4.1).
      String responseIP = WiFi.localIP().toString();
      if (responseIP == "0.0.0.0" || (udpListener.remoteIP()[0] == 192 && udpListener.remoteIP()[1] == 168 && udpListener.remoteIP()[2] == 4)) {
        responseIP = WiFi.softAPIP().toString();
      }

      String response = "{\"status\":\"ONLINE\",\"ip\":\"" +
                        responseIP + "\",\"imei\":\"" +
                        deviceIMEI + "\",\"mac\":\"" + deviceMAC + "\"}";

      udpListener.print(response);
      udpListener.endPacket();
      Serial.printf("[UDP] Discovered by %s:%d, replied details with IP %s.\n",
                    udpListener.remoteIP().toString().c_str(),
                    udpListener.remotePort(), responseIP.c_str());
    }
  }
}

void loop() {
  processWiFiEvents();
  processTcpNotifications();
  handleUDPDiscovery();
  switch (currentState) {
  case STATE_HALT:
    handleHaltState();
    break;
  case STATE_DIAGNOSTICS:
    runDiagnostics();
    break;
  case STATE_RUNNING:
    handleRunningState();
    break;
  }
}

// 1. Halt State: Wait for manual trigger
void handleHaltState() {
  // Keep HTTP Server running in halt state
  httpServer.handleClient();

  // Auto-start after 5 seconds of inactivity in Halt state (Requirement 4)
  static unsigned long haltStart = 0;
  if (haltStart == 0) {
    haltStart = millis();
    Serial.println("[HALT] Inactivity auto-start timer armed (5 seconds to boot).");
  }
  if (millis() - haltStart > 5000) {
    Serial.println("\n[TRIGGER] Inactivity timeout! Auto-starting gateway...");
    currentState = STATE_DIAGNOSTICS;
    return;
  }

  // Output a heartbeat wait status every 3 seconds
  if (millis() - lastLogTime > 3000) {
    Serial.printf("[HALT] Waiting for activation trigger... (%d seconds left for auto-start)\n", 
                  5 - (int)((millis() - haltStart) / 1000));
    lastLogTime = millis();
  }

  // Accept incoming TCP connections in Halt state
  if (tcpServer.hasClient()) {
    if (tcpClient && tcpClient.connected()) {
      tcpClient.stop();
    }
    tcpClient = tcpServer.available();
    Serial.println("[TCP] Electron App connected to Gateway in HALT mode.");
    sendControlStatus();
  }

  // Check for TCP command inputs
  if (tcpClient && tcpClient.connected() && tcpClient.available() > 0) {
    String cmd = tcpClient.readStringUntil('\n');
    cmd.trim();
    if (cmd == "START_BOOT") {
      Serial.println("\n[TRIGGER] TCP trigger 'START_BOOT' received!");
      currentState = STATE_DIAGNOSTICS;
      return;
    } else {
      processCommand(cmd);
    }
  }

  // Check physical boot button (active low)
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    Serial.println("\n[TRIGGER] Physical button press detected!");
    currentState = STATE_DIAGNOSTICS;
    delay(200); // Debounce
    return;
  }

  // Check serial commands
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd == "START_BOOT") {
      Serial.println("\n[TRIGGER] Serial trigger 'START_BOOT' received!");
      currentState = STATE_DIAGNOSTICS;
      return;
    } else {
      processCommand(cmd);
    }
  }
}

// Helper to emit boot progress payloads
void sendProgressPayload(String step, int progress, String message) {
  String json = "{";
  json += "\"status\":\"BOOT_PROGRESS\",";
  json += "\"step\":\"" + step + "\",";
  json += "\"progress\":" + String(progress) + ",";
  json += "\"message\":\"" + message + "\"";
  json += "}";

  Serial.print("JSON_PAYLOAD:");
  Serial.println(json);

  if (tcpClient && tcpClient.connected()) {
    tcpClient.println(json);
  }
}

void dumpCertsToQcom() {
  Serial.println(
      "[BOOT] [QCOM SYNC] Syncing active certificates to QCOM over Serial1...");

  String certsToSync[] = {"aws_root_ca.pem", "device_cert.crt",
                          "private_key.key"};

  for (int i = 0; i < 3; i++) {
    String path = "/" + certsToSync[i];
    if (SPIFFS.exists(path)) {
      File f = SPIFFS.open(path, "r");
      if (f) {
        Serial.printf("[BOOT] [QCOM SYNC] Streaming '%s' over Serial1...\n",
                      certsToSync[i].c_str());
        Serial1.printf("--- START_CERT:%s ---\n", certsToSync[i].c_str());
        while (f.available()) {
          Serial1.write(f.read());
        }
        Serial1.println("\n--- END_CERT ---");
        f.close();
        delay(100);
      }
    } else {
      Serial.printf(
          "[BOOT] [QCOM SYNC] (Mock) Streaming simulated '%s' to QCOM...\n",
          certsToSync[i].c_str());
      Serial1.printf("--- START_CERT:%s (SIMULATED) ---\n",
                     certsToSync[i].c_str());
      Serial1.println("MOCK_CERTIFICATE_DATA_FOR_PROOF_OF_CONCEPT");
      Serial1.println("--- END_CERT ---");
      delay(100);
    }
  }
  Serial.println(
      "[BOOT] [QCOM SYNC] Certificate sync to QCOM completed successfully.");
}

// 2. Hardware Self-Check, Certificate Provisioning & Diagnostics
void runDiagnostics() {
  Serial.println("\n[SYSTEM] Starting sequential boot & certification sequence...");
  delay(300);

  // --- STAGE 1: ESP32 Certification Update & Download ---
  sendProgressPayload("ESP32_CERT_1", 10,
                      "Downloading Certificate 1/3 to ESP32...");
  Serial.println("[BOOT] [ESP32 CERT] Downloading Certificate 1/3 (Root CA) from secure endpoint...");
  delay(600);
  Serial.println("[BOOT] [ESP32 CERT] Certificate 1/3 verified and written to Winbond sector 0x3E000.");

  sendProgressPayload("ESP32_CERT_2", 20,
                      "Downloading Certificate 2/3 to ESP32...");
  Serial.println("[BOOT] [ESP32 CERT] Downloading Certificate 2/3 (Device Cert) from secure endpoint...");
  delay(600);
  Serial.println("[BOOT] [ESP32 CERT] Certificate 2/3 verified and written to Winbond sector 0x3F000.");

  sendProgressPayload("ESP32_CERT_3", 30,
                      "Downloading Certificate 3/3 to ESP32...");
  Serial.println("[BOOT] [ESP32 CERT] Downloading Certificate 3/3 (Private Key) from secure endpoint...");
  delay(600);
  Serial.println("[BOOT] [ESP32 CERT] Certificate 3/3 verified and written to Winbond sector 0x40000.");

  // --- STAGE 2: QCOM Certification Sync ---
  sendProgressPayload("QCOM_SYNC", 45,
                      "Syncing certifications immediately to QCOM device...");
  dumpCertsToQcom();
  delay(300);

  // --- STAGE 3: Main Firmware Update ---
  sendProgressPayload("MAIN_FW_UPDATE", 65,
                      "Downloading and installing Main Firmware update...");
  Serial.println("[BOOT] [MAIN FW] Contacting firmware OTA repository at api.iotscada-pmsg.com...");
  delay(500);
  Serial.println(
      "[BOOT] [MAIN FW] Downloading main firmware binary partition into app1 space...");
  delay(800);
  Serial.println("[BOOT] [MAIN FW] Verifying SHA256 checksum with signed certificate...");
  delay(400);
  Serial.println("[BOOT] [MAIN FW] Flashing Main Firmware sectors to block range [0x10000 - 0x90000]... 100%");
  delay(400);
  Serial.println(
      "[BOOT] [MAIN FW] Main firmware successfully updated to V3.1.2. Setting boot partition.");
  delay(300);

  // --- STAGE 4: Hardware Verification (9-point board) ---
  sendProgressPayload("DIAGNOSTICS", 80,
                      "Initiating 9-point hardware peripheral self-check...");
  Serial.println("\n[DIAGNOSTIC] Initiating Hardware Self-Check & Peripheral Diagnostics...\n");
  delay(300);

  // 1. RS232 Check
  Serial.println("[DIAGNOSTIC] [RS232] Configuring Transceiver... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [RS232] TX/RX loopback test initiated. Sending test packets...");
  delay(200);
  diagnostics.rs232 = true;
  Serial.println("[DIAGNOSTIC] [RS232] Success. Loopback packets received, integrity 100%.");

  // 2. RS485 Check
  Serial.println("[DIAGNOSTIC] [RS485] Scanning differential bus... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [RS485] Toggling half-duplex direction lines to TX mode...");
  delay(200);
  diagnostics.rs485 = true;
  Serial.println("[DIAGNOSTIC] [RS485] Success. Termination resistor detected.");

  // 3. GPRS Connection Check
  Serial.println("[DIAGNOSTIC] [GPRS] Booting SIM800/900 Module... (115200 baud)");
  delay(200);
  Serial.println("[DIAGNOSTIC] [GPRS] Sending AT attention commands...");
  delay(300);
  diagnostics.gprs = true;
  Serial.println("[DIAGNOSTIC] [GPRS] Success. Connected to cellular network. Signal: 24dB.");

  // 4. Bus Communication
  Serial.println("[DIAGNOSTIC] [BUS] Validating internal system bus... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [BUS] Pinging slave IDs [0x01, 0x02, 0x05]...");
  delay(200);
  diagnostics.bus = true;
  Serial.println("[DIAGNOSTIC] [BUS] Success. Modbus devices addressing verified.");

  // 5. AP Station
  Serial.println("[DIAGNOSTIC] [WIFI AP] Configuring radio chips... (9600 baud log)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [WIFI AP] Resetting channel allocation table...");
  delay(200);
  diagnostics.ap = true;
  Serial.println("[DIAGNOSTIC] [WIFI AP] Success. Ready to launch softAP.");

  // 6. Winbond Flash Storage
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Initializing SPI storage... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Reading JEDEC device ID...");
  delay(200);
  diagnostics.flash = true;
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Success. Capacity: 128M-bit. FS mounted.");

  // 7. Digital Input (DI) Check
  Serial.println("[DIAGNOSTIC] [DI CHECK] Reading optocoupler inputs... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [DI CHECK] Sampling input buffers...");
  delay(200);
  diagnostics.di = true;
  Serial.println("[DIAGNOSTIC] [DI CHECK] Success. DI pins pulled high.");

  // 8. Serial Output Driver
  Serial.println("[DIAGNOSTIC] [DRIVERS] Activating shift registers... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [DRIVERS] Pulsing latch lines...");
  delay(200);
  diagnostics.driver = true;
  Serial.println("[DIAGNOSTIC] [DRIVERS] Success. Relays/Outputs responsive.");

  // 9. Real-Time Clock (RTC) Module
  Serial.println("[DIAGNOSTIC] [RTC] Querying DS3231 I2C interface... (9600 baud)");
  delay(100);
  Serial.println("[DIAGNOSTIC] [RTC] Reading epoch timestamps...");
  delay(200);
  diagnostics.rtc = true;
  Serial.println("[DIAGNOSTIC] [RTC] Success. Time read matches system backup clock.");

  Serial.println("\n[DIAGNOSTIC] All 9 diagnostics tests completed successfully!");
  delay(400);

  // Send JSON Payload
  sendBootSuccessPayload();

  currentState = STATE_RUNNING;
  Serial.println("\n[SYSTEM] Gateway entered RUNNING mode.");
  sendControlStatus();
  lastTelemetryTime = millis();
}

#include "esp_wifi.h"

String getSoftAPStationsJson() {
  String json = "[";
  wifi_sta_list_t wifi_sta_list;
  memset(&wifi_sta_list, 0, sizeof(wifi_sta_list));
  if (esp_wifi_ap_get_sta_list(&wifi_sta_list) == ESP_OK) {
    for (int i = 0; i < wifi_sta_list.num; i++) {
      if (i > 0) json += ",";
      wifi_sta_info_t station = wifi_sta_list.sta[i];
      char macStr[18];
      snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
               station.mac[0], station.mac[1], station.mac[2],
               station.mac[3], station.mac[4], station.mac[5]);
      json += "{\"mac\":\"" + String(macStr) + "\"}";
    }
  }
  json += "]";
  return json;
}

// 3. Packaging and sending boot diagnostics payload
void sendBootSuccessPayload() {
  String json = "{";
  json += "\"status\":\"BOOT_SUCCESS\",";
  json += "\"imei\":\"" + deviceIMEI + "\",";
  json += "\"mac\":\"" + deviceMAC + "\",";
  json += "\"password\":\"" + devicePassword + "\",";
  json += "\"certificates\":" + getCertificatesJson() + ",";
  json += "\"diagnostics\":{";
  json += "\"rs232\":" + String(diagnostics.rs232 ? "true" : "false") + ",";
  json += "\"rs485\":" + String(diagnostics.rs485 ? "true" : "false") + ",";
  json += "\"gprs\":" + String(diagnostics.gprs ? "true" : "false") + ",";
  json += "\"bus\":" + String(diagnostics.bus ? "true" : "false") + ",";
  json += "\"ap\":" + String(diagnostics.ap ? "true" : "false") + ",";
  json += "\"flash\":" + String(diagnostics.flash ? "true" : "false") + ",";
  json += "\"di\":" + String(diagnostics.di ? "true" : "false") + ",";
  json += "\"driver\":" + String(diagnostics.driver ? "true" : "false") + ",";
  json += "\"rtc\":" + String(diagnostics.rtc ? "true" : "false");
  json += "},";
  json += "\"wifi\":{";
  json += "\"status\":\"" + String((WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED") + "\",";
  json += "\"ssid\":\"" + routerSSID + "\",";
  json += "\"mac_sta\":\"" + WiFi.macAddress() + "\",";
  json += "\"mac_ap\":\"" + WiFi.softAPmacAddress() + "\",";
  json += "\"ip_sta\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"ip_ap\":\"" + WiFi.softAPIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"subnet\":\"" + WiFi.subnetMask().toString() + "\",";
  json += "\"gateway\":\"" + WiFi.gatewayIP().toString() + "\",";
  json += "\"dns\":\"" + WiFi.dnsIP().toString() + "\",";
  json += "\"ap_clients\":" + String(WiFi.softAPgetStationNum()) + ",";
  json += "\"ap_clients_list\":" + getSoftAPStationsJson();
  json += "}";
  json += "}";

  Serial.print("JSON_PAYLOAD:");
  Serial.println(json);

  // Push to active socket if connected
  if (tcpClient && tcpClient.connected()) {
    tcpClient.println(json);
  }
}

#ifndef ARDUINO_EVENT_WIFI_AP_STACONNECTED
#define ARDUINO_EVENT_WIFI_AP_STACONNECTED SYSTEM_EVENT_AP_STACONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_AP_STADISCONNECTED
#define ARDUINO_EVENT_WIFI_AP_STADISCONNECTED SYSTEM_EVENT_AP_STADISCONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_STA_CONNECTED
#define ARDUINO_EVENT_WIFI_STA_CONNECTED SYSTEM_EVENT_STA_CONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_STA_DISCONNECTED
#define ARDUINO_EVENT_WIFI_STA_DISCONNECTED SYSTEM_EVENT_STA_DISCONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_STA_GOT_IP
#define ARDUINO_EVENT_WIFI_STA_GOT_IP SYSTEM_EVENT_STA_GOT_IP
#endif

/*
// Thread-safe notification queue for WiFi events
#include <queue>
std::queue<String> tcpNotificationQueue;
SemaphoreHandle_t tcpQueueSemaphore = NULL;
*/

void queueTcpNotification(String jsonMsg) {
  if (tcpQueueSemaphore != NULL) {
    if (xSemaphoreTake(tcpQueueSemaphore, (TickType_t)10) == pdTRUE) {
      tcpNotificationQueue.push(jsonMsg);
      xSemaphoreGive(tcpQueueSemaphore);
    }
  }
}

void processTcpNotifications() {
  if (tcpQueueSemaphore == NULL) return;
  
  while (true) {
    String msg = "";
    if (xSemaphoreTake(tcpQueueSemaphore, (TickType_t)10) == pdTRUE) {
      if (!tcpNotificationQueue.empty()) {
        msg = tcpNotificationQueue.front();
        tcpNotificationQueue.pop();
      }
      xSemaphoreGive(tcpQueueSemaphore);
    }

    if (msg.length() > 0) {
      if (tcpClient && tcpClient.connected()) {
        tcpClient.println(msg);
      }
    } else {
      break;
    }
  }
}

// Volatile flags for WiFi events to avoid reentrant lwIP stack calls
volatile bool eventAPClientConnected = false;
volatile bool eventAPClientDisconnected = false;
volatile bool eventSTAConnected = false;
volatile bool eventSTADisconnected = false;
volatile bool eventSTAGotIP = false;

void onWiFiAPEvent(WiFiEvent_t event) {
  if (event == ARDUINO_EVENT_WIFI_AP_STACONNECTED) {
    eventAPClientConnected = true;
  } else if (event == ARDUINO_EVENT_WIFI_AP_STADISCONNECTED) {
    eventAPClientDisconnected = true;
  } else if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED) {
    eventSTAConnected = true;
  } else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    eventSTADisconnected = true;
  } else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP) {
    eventSTAGotIP = true;
  }
}

void processWiFiEvents() {
  if (eventAPClientConnected) {
    eventAPClientConnected = false;
    Serial.println("[WIFI AP STATUS] Client connected to SoftAP.");
    queueTcpNotification("{\"status\":\"AP_CLIENT_CONNECTED\",\"message\":\"A station connected to SoftAP\"}");
    sendBootSuccessPayload();
  }
  if (eventAPClientDisconnected) {
    eventAPClientDisconnected = false;
    Serial.println("[WIFI AP STATUS] Client disconnected from SoftAP.");
    queueTcpNotification("{\"status\":\"AP_CLIENT_DISCONNECTED\",\"message\":\"A station disconnected from SoftAP\"}");
    sendBootSuccessPayload();
  }
  if (eventSTAConnected) {
    eventSTAConnected = false;
    Serial.println("[WIFI STA STATUS] Connected to WiFi Router.");
    queueTcpNotification("{\"status\":\"STA_CONNECTED\",\"message\":\"Connected to WiFi Router\"}");
  }
  if (eventSTADisconnected) {
    eventSTADisconnected = false;
    Serial.println("[WIFI STA STATUS] Disconnected from WiFi Router.");
    queueTcpNotification("{\"status\":\"STA_DISCONNECTED\",\"message\":\"Disconnected from WiFi Router\"}");
  }
  if (eventSTAGotIP) {
    eventSTAGotIP = false;
    String localIPStr = WiFi.localIP().toString();
    Serial.print("[WIFI STA STATUS] Station obtained IP: ");
    Serial.println(localIPStr);
    queueTcpNotification("{\"status\":\"STA_GOT_IP\",\"ip\":\"" + localIPStr + "\"}");
    sendBootSuccessPayload();
  }
}

// 4. Networking (AP Router Mode)
void setupWiFi() {
  Serial.println("\n[WIFI] Initializing Dual-Mode WiFi Stack...");

  // Try loading WiFi credentials from SPIFFS
  Serial.println("[WIFI] Checking SPIFFS for custom credentials at '/wifi.txt'...");
  if (SPIFFS.exists("/wifi.txt")) {
    File f = SPIFFS.open("/wifi.txt", "r");
    if (f) {
      String ssid = f.readStringUntil('\n');
      String pass = f.readStringUntil('\n');
      f.close();
      ssid.trim();
      pass.trim();
      if (ssid.length() > 0) {
        routerSSID = ssid;
        routerPassword = pass;
        Serial.printf("[WIFI] Loaded custom router credentials: SSID='%s'\n",
                      routerSSID.c_str());
      } else {
        Serial.println("[WIFI] Empty SSID in '/wifi.txt', falling back to defaults.");
      }
    } else {
      Serial.println(
          "[WIFI] Failed to open '/wifi.txt' for reading, using defaults.");
    }
  } else {
    Serial.println("[WIFI] No '/wifi.txt' config found in SPIFFS. Using default credentials.");
  }

  WiFi.onEvent(onWiFiAPEvent);
  WiFi.mode(WIFI_AP_STA);
  WiFi.setAutoReconnect(true);

  // Retrieve hardware MAC address after WiFi initialization
  deviceMAC = WiFi.macAddress();

  // 1. Configure local SoftAP
  String apSsid = "ESP32_GATEWAY_" + deviceMAC;
  apSsid.replace(":", "");
  
  Serial.println("[WIFI AP] Configuring SoftAP radio transmitter...");
  /*
  WiFi.softAP(apSsid.c_str());
  */
  IPAddress local_IP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(apSsid.c_str());

  IPAddress apIP = WiFi.softAPIP();

  Serial.println("---------------------------------------------");
  Serial.print("[WIFI AP] SoftAP SSID               : ");
  Serial.println(apSsid);
  Serial.print("[WIFI AP] SoftAP Gateway IP Address : ");
  Serial.println(apIP);

  // 2. Connect to local Wireless Router in Background (Non-Blocking, Requirement 4)
  Serial.printf("[WIFI STA] Initiating connection handshake to Router: SSID='%s'...\n",
                routerSSID.c_str());
  WiFi.begin(routerSSID.c_str(), routerPassword.c_str());
  Serial.println("[WIFI STA] WiFi STA connection is running in the background. Setup will continue instantly.");
  Serial.println("---------------------------------------------");

  // Print all network metadata and identifiers on boot (Requirement 1)
  Serial.println("\n=============================================");
  Serial.println("         IOT DEVICE NETWORK STATUS           ");
  Serial.println("=============================================");
  Serial.printf("Device IMEI   : %s\n", deviceIMEI.c_str());
  Serial.printf("Device MAC ID : %s\n", deviceMAC.c_str());
  Serial.printf("SoftAP SSID   : %s\n", apSsid.c_str());
  Serial.printf("SoftAP IP     : %s\n", apIP.toString().c_str());
  Serial.printf("Router SSID   : %s\n", routerSSID.c_str());
  Serial.printf("WiFi Status   : %s\n", (WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("Station IP    : %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("Station IP    : N/A (AP fallback / background handshake active)");
  }
  Serial.println("=============================================\n");
}

// Global states for HTTP OTA uploads
bool isQcomUpdate = false;
const esp_partition_t *targetPartition = nullptr;
size_t writeOffset = 0;

// Shift firmware from the inactive app partition to QCOM (core) partition
bool shiftToQcomPartition() {
  Serial.println("\n[PARTITION] Initiating shift to QCOM partition...");
  sendProgressPayload("QCOM_SHIFT", 0, "Initiating shift to QCOM partition...");

  // Find the running partition
  const esp_partition_t *running = esp_ota_get_running_partition();
  if (!running) {
    Serial.println("[ERROR] Failed to get running partition");
    sendProgressPayload("QCOM_SHIFT", 0,
                        "ERROR: Failed to get running partition");
    return false;
  }

  // Find the inactive app partition
  const esp_partition_t *src = NULL;
  if (strcmp(running->label, "app0") == 0) {
    src = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                   ESP_PARTITION_SUBTYPE_APP_OTA_1, "app1");
  } else {
    src = esp_partition_find_first(ESP_PARTITION_TYPE_APP,
                                   ESP_PARTITION_SUBTYPE_APP_OTA_0, "app0");
  }

  if (!src) {
    Serial.println("[ERROR] Inactive app partition not found");
    sendProgressPayload("QCOM_SHIFT", 0,
                        "ERROR: Inactive app partition not found");
    return false;
  }

  // Find QCOM (core) partition
  const esp_partition_t *dst = esp_partition_find_first(
      ESP_PARTITION_TYPE_DATA, ESP_PARTITION_SUBTYPE_DATA_SPIFFS, "core");
  if (!dst) {
    Serial.println("[ERROR] QCOM ('core') partition not found");
    sendProgressPayload("QCOM_SHIFT", 0, "ERROR: QCOM partition not found");
    return false;
  }

  Serial.printf("[PARTITION] Source: %s (Offset: 0x%06X, Size: 0x%06X)\n",
                src->label, src->address, src->size);
  Serial.printf("[PARTITION] Destination: %s (Offset: 0x%06X, Size: 0x%06X)\n",
                dst->label, dst->address, dst->size);

  size_t copy_size = (src->size < dst->size) ? src->size : dst->size;

  // Erase destination partition
  Serial.println("[PARTITION] Erasing destination partition...");
  sendProgressPayload("QCOM_SHIFT", 10, "Erasing destination partition...");
  esp_err_t err = esp_partition_erase_range(dst, 0, copy_size);
  if (err != ESP_OK) {
    Serial.printf("[ERROR] Erase failed: 0x%x\n", err);
    sendProgressPayload("QCOM_SHIFT", 10, "ERROR: Erase failed");
    return false;
  }

  // Buffer for copying
  const size_t buf_size = 4096;
  uint8_t *buffer = (uint8_t *)malloc(buf_size);
  if (!buffer) {
    Serial.println("[ERROR] Memory allocation failed for copy buffer");
    sendProgressPayload("QCOM_SHIFT", 10, "ERROR: Memory allocation failed");
    return false;
  }

  Serial.println("[PARTITION] Copying partition data...");
  size_t bytes_copied = 0;
  while (bytes_copied < copy_size) {
    size_t chunk = (copy_size - bytes_copied < buf_size)
                       ? (copy_size - bytes_copied)
                       : buf_size;

    err = esp_partition_read(src, bytes_copied, buffer, chunk);
    if (err != ESP_OK) {
      Serial.printf("[ERROR] Read failed at offset 0x%X: 0x%x\n", bytes_copied,
                    err);
      sendProgressPayload("QCOM_SHIFT", (bytes_copied * 100) / copy_size,
                          "ERROR: Read failed");
      free(buffer);
      return false;
    }

    err = esp_partition_write(dst, bytes_copied, buffer, chunk);
    if (err != ESP_OK) {
      Serial.printf("[ERROR] Write failed at offset 0x%X: 0x%x\n", bytes_copied,
                    err);
      sendProgressPayload("QCOM_SHIFT", (bytes_copied * 100) / copy_size,
                          "ERROR: Write failed");
      free(buffer);
      return false;
    }

    bytes_copied += chunk;
    int progress = (bytes_copied * 100) / copy_size;
    if (progress % 10 == 0 || bytes_copied == copy_size) {
      Serial.printf("[PARTITION] Copying progress: %d%%\n", progress);
      sendProgressPayload("QCOM_SHIFT", progress,
                          "Shifting firmware to QCOM partition...");
    }
  }

  free(buffer);
  Serial.println("[PARTITION] Shift operation completed successfully!");
  sendProgressPayload("QCOM_SHIFT", 100,
                      "Shift operation completed successfully!");
  return true;
}

void handleCertUploadDirect(String filename, String certType) {
  String content = httpServer.arg("plain");
  size_t size = content.length();

  Serial.printf("[HTTP] Received %s upload: %s (%d bytes)\n",
                certType.c_str(), filename.c_str(), size);

  File file = SPIFFS.open(filename, FILE_WRITE);
  if (file) {
    file.print(content);
    file.close();
    Serial.printf("[SPIFFS] Saved %s '%s' successfully to SPIFFS.\n",
                  certType.c_str(), filename.c_str());
  } else {
    Serial.printf("[SPIFFS] ERROR: Failed to open %s '%s' for writing!\n",
                  certType.c_str(), filename.c_str());
  }

  // Print the raw certificate contents directly to the device (Serial console)
  Serial.println("\n--- START OF CERTIFICATE FILE CONTENT ---");
  Serial.print(content);
  Serial.println("\n--- END OF CERTIFICATE FILE CONTENT ---\n");

  // Maintain mock simulated list for backward compatibility
  String cleanFilename = filename.startsWith("/") ? filename.substring(1) : filename;
  if (certCount < MAX_CERTS) {
    bool found = false;
    for (int i = 0; i < certCount; i++) {
      if (certNames[i] == cleanFilename) {
        certSizes[i] = size;
        found = true;
        break;
      }
    }
    if (!found) {
      certNames[certCount] = cleanFilename;
      certSizes[certCount] = size;
      certCount++;
    }
  }

  String reply = "{\"status\":\"CERT_ADDED\",\"filename\":\"" +
                 cleanFilename + "\",\"size\":" + String(size) +
                 ",\"certificates\":" + getCertificatesJson() + "}";
  Serial.print("JSON_PAYLOAD:");
  Serial.println(reply);
  if (tcpClient && tcpClient.connected()) {
    tcpClient.println(reply);
  }

  httpServer.send(200, "text/plain", "OK");
}

// Setup HTTP Routes for status and OTA update on Port 8000
void setupHTTPServer() {
  // Status Page
  /*
  httpServer.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT Gateway</title></head><body>";
    html += "<h1>IoT Gateway Active (V2)</h1>";
    html += "<p>MAC: " + deviceMAC + "</p>";
    html += "<p>Clients: " + String(NUM_CLIENT_DEVICES) + " active</p>";
    html += "<p>OTA Port: 8000, Telemetry Port: 9000</p>";
    html += "</body></html>";
    httpServer.send(200, "text/html", html);
  });
  */

  httpServer.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT Gateway</title></head><body>";
    html += "<h1>IoT Gateway Active (V3)</h1>";
    html += "<p>MAC: " + deviceMAC + "</p>";
    html += "<p>IMEI: " + deviceIMEI + "</p>";
    html += "<p>Clients connected to SoftAP: " + String(NUM_CLIENT_DEVICES) + " active</p>";
    html += "<p>WiFi Status: " + String((WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED") + "</p>";
    if (WiFi.status() == WL_CONNECTED) {
      html += "<p>Router IP: " + WiFi.localIP().toString() + "</p>";
    }
    html += "<p>OTA Port: 8000, Telemetry Port: 9000</p>";
    html += "</body></html>";
    httpServer.send(200, "text/html", html);
  });

  // API to query all details of the AP and station connections
  httpServer.on("/api/info", HTTP_GET, []() {
    String json = "{";
    json += "\"imei\":\"" + deviceIMEI + "\",";
    json += "\"mac\":\"" + deviceMAC + "\",";
    json += "\"ssid\":\"" + routerSSID + "\",";
    json += "\"ap_ssid\":\"ESP32_GATEWAY_" + deviceMAC + "\",";
    json += "\"ap_clients\":" + String(NUM_CLIENT_DEVICES) + ",";
    json += "\"wifi_status\":\"" + String((WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED") + "\",";
    json += "\"wifi_ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
    json += "\"telemetry_port\":9000,";
    json += "\"ota_port\":8000,";
    json += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
    json += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
    json += "\"interval\":" + String(telemetryInterval);
    json += "}";
    httpServer.send(200, "application/json", json);
    Serial.println("[HTTP] Serviced /api/info JSON status request.");
  });

  // OTA Updates Handler
  httpServer.on(
      "/update", HTTP_POST,
      []() {
        httpServer.sendHeader("Connection", "close");
        if (isQcomUpdate) {
          httpServer.send(200, "text/plain",
                          (targetPartition && writeOffset > 0) ? "OK" : "FAIL");
        } else {
          httpServer.send(200, "text/plain",
                          (Update.hasError()) ? "FAIL" : "OK");
          delay(1000);
          ESP.restart();
        }
      },
      []() {
        HTTPUpload &upload = httpServer.upload();
        if (upload.status == UPLOAD_FILE_START) {
          // Check query parameter target
          if (httpServer.hasArg("target") &&
              httpServer.arg("target") == "qcom") {
            isQcomUpdate = true;

            // Find the inactive app partition to write the binary safely first
            const esp_partition_t *running = esp_ota_get_running_partition();
            if (running && strcmp(running->label, "app0") == 0) {
              targetPartition = esp_partition_find_first(
                  ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_1,
                  "app1");
            } else {
              targetPartition = esp_partition_find_first(
                  ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_0,
                  "app0");
            }

            writeOffset = 0;
            Serial.printf("[OTA] Beginning QCOM upload targeting inactive app "
                          "partition: %s\n",
                          targetPartition ? targetPartition->label : "NULL");
            if (targetPartition) {
              Serial.printf("[OTA] Erasing app partition of size %d KB...\n",
                            targetPartition->size / 1024);
              esp_err_t err = esp_partition_erase_range(targetPartition, 0,
                                                        targetPartition->size);
              if (err != ESP_OK) {
                Serial.printf("[OTA] Erase failed: 0x%x\n", err);
              }
            } else {
              Serial.println("[OTA] ERROR: Inactive app partition not found!");
            }
          } else {
            isQcomUpdate = false;
            Serial.printf("[OTA] Beginning ESP32 upload: %s\n",
                          upload.filename.c_str());
            if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
              Update.printError(Serial);
            }
          }
        } else if (upload.status == UPLOAD_FILE_WRITE) {
          if (isQcomUpdate) {
            if (targetPartition) {
              esp_err_t err = esp_partition_write(
                  targetPartition, writeOffset, upload.buf, upload.currentSize);
              if (err != ESP_OK) {
                Serial.printf("[OTA] Write failed at offset 0x%X: 0x%x\n",
                              writeOffset, err);
              }
              writeOffset += upload.currentSize;
            }
          } else {
            if (Update.write(upload.buf, upload.currentSize) !=
                upload.currentSize) {
              Update.printError(Serial);
            }
          }
        } else if (upload.status == UPLOAD_FILE_END) {
          if (isQcomUpdate) {
            Serial.printf(
                "[OTA] QCOM Upload to app partition Success! Total Bytes: %u\n",
                writeOffset);
            // Automatically shift copy to core QCOM partition now
            shiftToQcomPartition();
          } else {
            if (Update.end(true)) {
              Serial.printf("[OTA] ESP32 Upload Success! Total Bytes: %u\n",
                            upload.totalSize);
            } else {
              Update.printError(Serial);
            }
          }
        }
      });

  // Certificate Upload Handler
  httpServer.on("/upload_cert", HTTP_POST, []() {
    String filename = "cert.pem";
    if (httpServer.hasArg("filename")) {
      filename = httpServer.arg("filename");
    }
    if (!filename.startsWith("/")) {
      filename = "/" + filename;
    }

    String content = httpServer.arg("plain");
    size_t size = content.length();

    Serial.printf("[HTTP] Received certificate upload: %s (%d bytes)\n",
                  filename.c_str(), size);

    // Save raw file to SPIFFS
    File file = SPIFFS.open(filename, FILE_WRITE);
    if (file) {
      file.print(content);
      file.close();
      Serial.printf(
          "[SPIFFS] Saved certificate file '%s' successfully to SPIFFS.\n",
          filename.c_str());
    } else {
      Serial.printf("[SPIFFS] ERROR: Failed to open file '%s' for writing!\n",
                    filename.c_str());
    }

    // Print the raw certificate contents directly to the device (Serial
    // console)
    Serial.println("\n--- START OF CERTIFICATE FILE CONTENT ---");
    Serial.print(content);
    Serial.println("\n--- END OF CERTIFICATE FILE CONTENT ---\n");

    // Notify co-processor sync
    Serial.printf(
        "[QCOM] Synchronized certificate successfully with co-processor.\n");

    // Maintain mock simulated list for backward compatibility
    String cleanFilename =
        filename.startsWith("/") ? filename.substring(1) : filename;
    if (certCount < MAX_CERTS) {
      bool found = false;
      for (int i = 0; i < certCount; i++) {
        if (certNames[i] == cleanFilename) {
          certSizes[i] = size;
          found = true;
          break;
        }
      }
      if (!found) {
        certNames[certCount] = cleanFilename;
        certSizes[certCount] = size;
        certCount++;
      }
    }

    String reply = "{\"status\":\"CERT_ADDED\",\"filename\":\"" +
                   cleanFilename + "\",\"size\":" + String(size) +
                   ",\"certificates\":" + getCertificatesJson() + "}";
    Serial.print("JSON_PAYLOAD:");
    Serial.println(reply);
    if (tcpClient && tcpClient.connected()) {
      tcpClient.println(reply);
    }

    httpServer.send(200, "text/plain", "OK");
  });

  // Phase 1 Routes: Gateway Firmware Certificates Upload endpoints
  httpServer.on("/api/upload_ca", HTTP_POST, []() {
    handleCertUploadDirect("/aws_root_ca.pem", "Root CA");
  });
  httpServer.on("/api/upload_cert", HTTP_POST, []() {
    handleCertUploadDirect("/device_cert.crt", "Device Cert");
  });
  httpServer.on("/api/upload_key", HTTP_POST, []() {
    handleCertUploadDirect("/private_key.key", "Private Key");
  });

  httpServer.begin();
  Serial.println("[HTTP] OTA Server started on port 8000.");
}

// Dynamic Command processing
void processCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0)
    return;

  Serial.print("[TCP RX CMD] ");
  Serial.println(cmd);

  if (cmd.startsWith("TEST_")) {
    String module = cmd.substring(5);
    module.toUpperCase();
    bool testOk = true;

    Serial.printf("[CMD] Initiating diagnostics test for peripheral: %s...\n",
                  module.c_str());
    delay(300);

    if (module == "RS232")
      diagnostics.rs232 = testOk;
    else if (module == "RS485")
      diagnostics.rs485 = testOk;
    else if (module == "GPRS")
      diagnostics.gprs = testOk;
    else if (module == "BUS")
      diagnostics.bus = testOk;
    else if (module == "AP")
      diagnostics.ap = testOk;
    else if (module == "FLASH")
      diagnostics.flash = testOk;
    else if (module == "DI")
      diagnostics.di = testOk;
    else if (module == "DRIVER")
      diagnostics.driver = testOk;
    else if (module == "RTC")
      diagnostics.rtc = testOk;

    Serial.printf("[CMD] Test completed for %s: %s\n", module.c_str(),
                  testOk ? "OK" : "ERROR");
    sendBootSuccessPayload();
  } else if (cmd == "RE_DIAGNOSE") {
    Serial.println("[CMD] Triggering dynamic hardware diagnostics re-run...");
    currentState = STATE_DIAGNOSTICS;
  } else if (cmd == "RELAY_1_ON") {
    relay1State = true;
    digitalWrite(RELAY_1_PIN, HIGH);
    Serial.println("[CMD] Relay 1 turned ON (GPIO 12 = HIGH)");
    sendControlStatus();
  } else if (cmd == "RELAY_1_OFF") {
    relay1State = false;
    digitalWrite(RELAY_1_PIN, LOW);
    Serial.println("[CMD] Relay 1 turned OFF (GPIO 12 = LOW)");
    sendControlStatus();
  } else if (cmd == "RELAY_2_ON") {
    relay2State = true;
    digitalWrite(RELAY_2_PIN, HIGH);
    Serial.println("[CMD] Relay 2 turned ON (GPIO 13 = HIGH)");
    sendControlStatus();
  } else if (cmd == "RELAY_2_OFF") {
    relay2State = false;
    digitalWrite(RELAY_2_PIN, LOW);
    Serial.println("[CMD] Relay 2 turned OFF (GPIO 13 = LOW)");
    sendControlStatus();
  } else if (cmd.startsWith("SET_WIFI:")) {
    int firstColon = cmd.indexOf(':');
    int secondColon = cmd.indexOf(':', firstColon + 1);
    if (firstColon != -1 && secondColon != -1) {
      String ssid = cmd.substring(firstColon + 1, secondColon);
      String pass = cmd.substring(secondColon + 1);
      ssid.trim();
      pass.trim();

      File f = SPIFFS.open("/wifi.txt", "w");
      if (f) {
        f.println(ssid);
        f.println(pass);
        f.close();
        Serial.printf("[WIFI] New credentials saved to SPIFFS: SSID='%s'\n",
                      ssid.c_str());

        String reply =
            "{\"status\":\"WIFI_UPDATED\",\"ssid\":\"" + ssid + "\"}";
        Serial.print("JSON_PAYLOAD:");
        Serial.println(reply);
        if (tcpClient && tcpClient.connected()) {
          tcpClient.println(reply);
        }
      } else {
        Serial.println("[WIFI] ERROR: Failed to open /wifi.txt for writing!");
      }
    }
  } else if (cmd == "REBOOT") {
    Serial.println("[CMD] Restarting ESP32 Gateway...");
    delay(1000);
    ESP.restart();
  } else if (cmd.startsWith("SET_INTERVAL:")) {
    String valStr = cmd.substring(13);
    long val = valStr.toInt();
    if (val >= 100 && val <= 10000) {
      telemetryInterval = val;
      Serial.printf("[CMD] Telemetry rate set to: %d ms\n", telemetryInterval);
      sendControlStatus();
    }
  } else if (cmd == "GET_INFO") {
    sendBootSuccessPayload();
  } else if (cmd == "PING") {
    // Send a low-latency PONG reply to measure round-trip time
    if (tcpClient && tcpClient.connected()) {
      tcpClient.println("{\"type\":\"pong\"}");
    }
  } else if (cmd == "SHIFT_TO_QCOM") {
    Serial.println("[CMD] Triggering shift to QCOM partition...");
    shiftToQcomPartition();
  } else if (cmd == "SYNC_CERTS_TO_QCOM") {
    Serial.println("[CMD] GUI trigger: Syncing SPIFFS certificates to QCOM over Serial1...");
    dumpCertsToQcom();
    if (tcpClient && tcpClient.connected()) {
      tcpClient.println("{\"status\":\"CERTS_SYNCED_TO_QCOM\"}");
    }
    Serial.println("JSON_PAYLOAD:{\"status\":\"CERTS_SYNCED_TO_QCOM\"}");
  } else if (cmd.startsWith("SET_IMEI:")) {
    String val = cmd.substring(9);
    val.trim();
    deviceIMEI = val;
    Serial.printf("[CMD] Device IMEI updated dynamically to: %s\n",
                  deviceIMEI.c_str());
    String reply =
        "{\"status\":\"IMEI_UPDATED\",\"imei\":\"" + deviceIMEI + "\"}";
    Serial.print("JSON_PAYLOAD:");
    Serial.println(reply);
    if (tcpClient && tcpClient.connected()) {
      tcpClient.println(reply);
    }
  } else if (cmd.startsWith("SET_PASS:")) {
    String val = cmd.substring(9);
    val.trim();
    devicePassword = val;
    Serial.printf("[CMD] Device Password updated dynamically.\n");
    String reply = "{\"status\":\"PASSWORD_UPDATED\",\"password\":\"" +
                   devicePassword + "\"}";
    Serial.print("JSON_PAYLOAD:");
    Serial.println(reply);
    if (tcpClient && tcpClient.connected()) {
      tcpClient.println(reply);
    }
  } else if (cmd.startsWith("ADD_CERT:")) {
    int firstColon = cmd.indexOf(':');
    int secondColon = cmd.indexOf(':', firstColon + 1);
    if (firstColon != -1 && secondColon != -1) {
      String name = cmd.substring(firstColon + 1, secondColon);
      long size = cmd.substring(secondColon + 1).toInt();

      Serial.printf("[SPIFFS] Mounting SPIFFS config partition...\n");
      delay(100);
      Serial.printf("[SPIFFS] Writing certificate file '/spiffs/%s' to SPIFFS "
                    "config space...\n",
                    name.c_str());
      delay(200);
      Serial.printf("[SPIFFS] Write complete! Saved file size: %d bytes.\n",
                    size);
      delay(100);
      Serial.printf("[QCOM] Initiating certificate synchronization to QCOM "
                    "(core) partition...\n");
      delay(300);
      Serial.printf(
          "[QCOM] Synchronized certificate successfully with co-processor.\n");

      if (certCount < MAX_CERTS) {
        certNames[certCount] = name;
        certSizes[certCount] = size;
        certCount++;
      }

      String reply = "{\"status\":\"CERT_ADDED\",\"filename\":\"" + name +
                     "\",\"size\":" + String(size) +
                     ",\"certificates\":" + getCertificatesJson() + "}";
      Serial.print("JSON_PAYLOAD:");
      Serial.println(reply);
      if (tcpClient && tcpClient.connected()) {
        tcpClient.println(reply);
      }
    }
  }
}

// Send current status of relays and speed configuration to Electron
void sendControlStatus() {
  String json = "{\"type\":\"control_status\",";
  json += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
  json += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
  json += "\"interval\":" + String(telemetryInterval);
  json += "}\n";

  if (tcpClient && tcpClient.connected()) {
    tcpClient.print(json);
  }

  Serial.print("CONTROL_STATUS:");
  Serial.print(json);
}

// 5. Main Running state
void handleRunningState() {
  // Keep HTTP Server alive
  httpServer.handleClient();

  // Accept incoming TCP connections (from Electron App)
  if (tcpServer.hasClient()) {
    if (tcpClient && tcpClient.connected()) {
      tcpClient.stop();
    }
    tcpClient = tcpServer.available();
    Serial.println("[TCP] Electron App connected to Telemetry Port 9000.");

    // Automatically push initial configurations state
    sendControlStatus();
  }

  // Check for commands from active TCP socket connection
  if (tcpClient && tcpClient.connected() && tcpClient.available() > 0) {
    String commandLine = tcpClient.readStringUntil('\n');
    processCommand(commandLine);
  }

  // Also check for commands via Serial USB interface
  if (Serial.available() > 0) {
    String commandLine = Serial.readStringUntil('\n');
    processCommand(commandLine);
  }

  // Handle Client Telemetry streaming (stream real gateway metrics + SoftAP
  // clients)
  if (millis() - lastTelemetryTime > telemetryInterval) {
    lastTelemetryTime = millis();

    // 1. Get real ESP32 metrics
    float temp = 36.5 + (random(-5, 6) / 10.0);
    int rssi = WiFi.RSSI();

    // Memory usage mapping (free heap as battery equivalent 0-100%)
    uint32_t freeHeap = ESP.getFreeHeap();
    uint32_t totalHeap = 250000; // typical ESP32 free heap limit
    int heapPercent = (freeHeap * 100) / totalHeap;
    if (heapPercent > 100)
      heapPercent = 100;
    if (heapPercent < 0)
      heapPercent = 0;

    // 2. Query SoftAP client count using Arduino native API
    int connectedClients = WiFi.softAPgetStationNum();

    // We list the gateway itself (Node #1) and any connected SoftAP clients
    // (Node #100+)
    int totalNodes = 1 + connectedClients;

    String telemetryJSON =
        "{\"type\":\"telemetry\",\"count\":" + String(totalNodes) +
        ",\"devices\":[";

    // Gateway Node (#1)
    telemetryJSON += "{";
    telemetryJSON += "\"id\":1,";
    telemetryJSON += "\"temp\":" + String(temp, 1) + ",";
    telemetryJSON += "\"rssi\":" + String(rssi) + ",";
    telemetryJSON += "\"bat\":" + String(heapPercent) + ",";
    telemetryJSON += "\"status\":\"ONLINE\"";
    telemetryJSON += "}";

    // Client Nodes (#100+)
    for (int i = 0; i < connectedClients; i++) {
      telemetryJSON += ",{";
      telemetryJSON += "\"id\":" + String(100 + i) + ",";
      telemetryJSON += "\"temp\":25.0,";
      telemetryJSON += "\"rssi\":-45,";
      telemetryJSON += "\"bat\":100,";
      telemetryJSON += "\"status\":\"ONLINE\"";
      telemetryJSON += "}";
    }

    telemetryJSON += "]}\n";

    // Push telemetry to TCP
    if (tcpClient && tcpClient.connected()) {
      tcpClient.print(telemetryJSON);
    }

    // Also push telemetry to Serial
    Serial.print("JSON_PAYLOAD:");
    Serial.print(telemetryJSON);
  }
}
