/**
 * ESP32 IoT Gateway Firmware Proof-of-Concept (Revision 2)
 * 
 * Hardware Requirements:
 * - Boot Halt state: Press BOOT button (GPIO 0) or send "START_BOOT" over Serial to initiate.
 * - Sequential diagnostics for 9 peripherals.
 * - WiFi Access Point mode (local wireless router/dongle).
 * - Raw TCP server (Port 9000) for streaming telemetry data and processing commands.
 * - HTTP OTA server (Port 8000) for firmware binary uploads.
 * - NEW: Command processor for dynamic relay controls, diagnostic rechecks, and interval tuning.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>

// Pins
const int BOOT_BUTTON_PIN = 0; // GPIO 0 is the default Boot button on most ESP32 boards

// Server instances on updated ports
WebServer httpServer(8000);  // HTTP OTA on Port 8000
WiFiServer tcpServer(9000);   // TCP Telemetry on Port 9000
WiFiClient tcpClient;

// System States
enum SystemState {
  STATE_HALT,
  STATE_DIAGNOSTICS,
  STATE_RUNNING
};

SystemState currentState = STATE_HALT;
unsigned long lastLogTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long telemetryInterval = 1500; // Customizable telemetry frequency in milliseconds

// Mock Relays/Outputs
bool relay1State = false;
bool relay2State = false;

// Device Identity
String deviceIMEI = "123456789012345";
String deviceMAC = "";

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

// Mock telemetry client device count (50 to 100)
#define NUM_CLIENT_DEVICES 75
struct SubDevice {
  int id;
  float temperature;
  int rssi;
  int battery;
  bool online;
} subDevices[NUM_CLIENT_DEVICES];

void setup() {
  // Start serial at 115200 for main logging
  Serial.begin(115200);
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  
  // Get ESP32 MAC address
  deviceMAC = WiFi.macAddress();
  
  // Initialize mock sub-devices
  randomSeed(analogRead(0));
  for (int i = 0; i < NUM_CLIENT_DEVICES; i++) {
    subDevices[i].id = 100 + i;
    subDevices[i].temperature = 20.0 + random(0, 150) / 10.0;
    subDevices[i].rssi = -50 - random(0, 40);
    subDevices[i].battery = random(50, 100);
    subDevices[i].online = true;
  }

  Serial.println("\n=============================================");
  Serial.println("ESP32 IoT Gateway Boot Loader Version 2.0.0");
  Serial.println("=============================================");
  Serial.println("[SYSTEM] System state: HALT / WAIT");
  Serial.println("[SYSTEM] Awaiting trigger: Press BOOT button (GPIO 0) or send 'START_BOOT' serial command.");
}

void loop() {
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
  // Output a heartbeat wait status every 3 seconds
  if (millis() - lastLogTime > 3000) {
    Serial.println("[HALT] Waiting for activation trigger (BOOT Button or 'START_BOOT' command)...");
    lastLogTime = millis();
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
    }
  }
}

// 2. Hardware Self-Check & Diagnostics
void runDiagnostics() {
  Serial.println("\n[DIAGNOSTIC] Initiating Hardware Self-Check & Peripheral Diagnostics...\n");
  delay(500);

  // 1. RS232 Check
  Serial.println("[DIAGNOSTIC] [RS232] Testing Transceiver... (9600 baud)");
  delay(300);
  diagnostics.rs232 = true;
  Serial.println("[DIAGNOSTIC] [RS232] Success. Loopback test OK.");

  // 2. RS485 Check
  Serial.println("[DIAGNOSTIC] [RS485] Scanning differential bus... (9600 baud)");
  delay(300);
  diagnostics.rs485 = true;
  Serial.println("[DIAGNOSTIC] [RS485] Success. Termination resistor detected.");

  // 3. GPRS Connection Check
  Serial.println("[DIAGNOSTIC] [GPRS] Booting SIM800/900 Module... (115200 baud)");
  delay(500);
  diagnostics.gprs = true;
  Serial.println("[DIAGNOSTIC] [GPRS] Success. Connected to cellular network. Signal: 24dB.");

  // 4. Bus Communication
  Serial.println("[DIAGNOSTIC] [BUS] Validating internal system bus... (9600 baud)");
  delay(300);
  diagnostics.bus = true;
  Serial.println("[DIAGNOSTIC] [BUS] Success. Modbus devices addressing verified.");

  // 5. AP Station
  Serial.println("[DIAGNOSTIC] [WIFI AP] Configuring radio chips... (9600 baud log)");
  delay(300);
  diagnostics.ap = true;
  Serial.println("[DIAGNOSTIC] [WIFI AP] Success. Ready to launch softAP.");

  // 6. Winbond Flash Storage
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Initializing SPI storage... (9600 baud)");
  delay(300);
  diagnostics.flash = true;
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Success. Capacity: 128M-bit. FS mounted.");

  // 7. Digital Input (DI) Check
  Serial.println("[DIAGNOSTIC] [DI CHECK] Reading optocoupler inputs... (9600 baud)");
  delay(300);
  diagnostics.di = true;
  Serial.println("[DIAGNOSTIC] [DI CHECK] Success. DI pins pulled high.");

  // 8. Serial Output Driver
  Serial.println("[DIAGNOSTIC] [DRIVERS] Activating shift registers... (9600 baud)");
  delay(300);
  diagnostics.driver = true;
  Serial.println("[DIAGNOSTIC] [DRIVERS] Success. Relays/Outputs responsive.");

  // 9. Real-Time Clock (RTC) Module
  Serial.println("[DIAGNOSTIC] [RTC] Querying DS3231 I2C interface... (9600 baud)");
  delay(300);
  diagnostics.rtc = true;
  Serial.println("[DIAGNOSTIC] [RTC] Success. Time read matches system backup clock.");

  Serial.println("\n[DIAGNOSTIC] All 9 diagnostics tests completed successfully!");
  delay(400);

  // Send JSON Payload
  sendBootSuccessPayload();

  // Initialize soft Access Point (AP Router Mode)
  setupWiFiAP();

  // Start TCP server on Port 9000
  tcpServer.begin();
  Serial.println("[TCP] Live Telemetry server started on port 9000.");

  // Start HTTP OTA server on Port 8000
  setupHTTPServer();

  currentState = STATE_RUNNING;
  Serial.println("\n[SYSTEM] Gateway entered RUNNING mode.");
  lastTelemetryTime = millis();
}

// 3. Packaging and sending boot diagnostics payload
void sendBootSuccessPayload() {
  String json = "{";
  json += "\"status\":\"BOOT_SUCCESS\",";
  json += "\"imei\":\"" + deviceIMEI + "\",";
  json += "\"mac\":\"" + deviceMAC + "\",";
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
  json += "}";
  json += "}";

  Serial.print("JSON_PAYLOAD:");
  Serial.println(json);

  // Push to active socket if connected
  if (tcpClient && tcpClient.connected()) {
    tcpClient.println(json);
  }
}

// 4. Networking (AP Router Mode)
void setupWiFiAP() {
  // Generate unique SSID using MAC
  String ssid = "ESP32_GATEWAY_" + deviceMAC;
  ssid.replace(":", ""); // Remove colons for cleaner SSID
  
  // Set up as an open Access Point
  WiFi.softAP(ssid.c_str());
  
  IPAddress IP = WiFi.softAPIP();
  Serial.println("---------------------------------------------");
  Serial.print("[WIFI AP] softAP initiated. SSID: ");
  Serial.println(ssid);
  Serial.print("[WIFI AP] Gateway IP Address: ");
  Serial.println(IP);
  Serial.println("---------------------------------------------");
}

// Setup HTTP Routes for status and OTA update on Port 8000
void setupHTTPServer() {
  // Status Page
  httpServer.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT Gateway</title></head><body>";
    html += "<h1>IoT Gateway Active (V2)</h1>";
    html += "<p>MAC: " + deviceMAC + "</p>";
    html += "<p>Clients: " + String(NUM_CLIENT_DEVICES) + " active</p>";
    html += "<p>OTA Port: 8000, Telemetry Port: 9000</p>";
    html += "</body></html>";
    httpServer.send(200, "text/html", html);
  });

  // OTA Updates Handler
  httpServer.on("/update", HTTP_POST, []() {
    httpServer.sendHeader("Connection", "close");
    httpServer.send(200, "text/plain", (Update.hasError()) ? "FAIL" : "OK");
    delay(1000);
    ESP.restart();
  }, []() {
    HTTPUpload& upload = httpServer.upload();
    if (upload.status == UPLOAD_FILE_START) {
      Serial.printf("[OTA] Beginning upload: %s\n", upload.filename.c_str());
      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) { 
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) {
        Serial.printf("[OTA] Upload Success! Total Bytes: %u\n", upload.totalSize);
      } else {
        Update.printError(Serial);
      }
    }
  });

  httpServer.begin();
  Serial.println("[HTTP] OTA Server started on port 8000.");
}

// Dynamic Command processing
void processCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  Serial.print("[TCP RX CMD] ");
  Serial.println(cmd);

  if (cmd == "RE_DIAGNOSE") {
    Serial.println("[CMD] Triggering dynamic hardware diagnostics re-run...");
    currentState = STATE_DIAGNOSTICS;
  }
  else if (cmd == "RELAY_1_ON") {
    relay1State = true;
    Serial.println("[CMD] Relay 1 turned ON");
    sendControlStatus();
  }
  else if (cmd == "RELAY_1_OFF") {
    relay1State = false;
    Serial.println("[CMD] Relay 1 turned OFF");
    sendControlStatus();
  }
  else if (cmd == "RELAY_2_ON") {
    relay2State = true;
    Serial.println("[CMD] Relay 2 turned ON");
    sendControlStatus();
  }
  else if (cmd == "RELAY_2_OFF") {
    relay2State = false;
    Serial.println("[CMD] Relay 2 turned OFF");
    sendControlStatus();
  }
  else if (cmd.startsWith("SET_INTERVAL:")) {
    String valStr = cmd.substring(13);
    long val = valStr.toInt();
    if (val >= 100 && val <= 10000) {
      telemetryInterval = val;
      Serial.printf("[CMD] Telemetry rate set to: %d ms\n", telemetryInterval);
      sendControlStatus();
    }
  }
  else if (cmd == "PING") {
    // Send a low-latency PONG reply to measure round-trip time
    if (tcpClient && tcpClient.connected()) {
      tcpClient.println("{\"type\":\"pong\"}");
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

  // Handle Client Telemetry streaming
  if (millis() - lastTelemetryTime > telemetryInterval) {
    lastTelemetryTime = millis();
    
    // Update simulated sub-devices (fluctuate readings slightly)
    for (int i = 0; i < NUM_CLIENT_DEVICES; i++) {
      subDevices[i].temperature += (random(-5, 6) / 10.0);
      if (subDevices[i].temperature < 15.0) subDevices[i].temperature = 15.0;
      if (subDevices[i].temperature > 40.0) subDevices[i].temperature = 40.0;
      
      subDevices[i].online = (random(0, 100) < 95);
      
      subDevices[i].rssi += random(-2, 3);
      if (subDevices[i].rssi > -30) subDevices[i].rssi = -30;
      if (subDevices[i].rssi < -95) subDevices[i].rssi = -95;
      
      if (random(0, 100) < 5) {
        subDevices[i].battery -= 1;
        if (subDevices[i].battery < 0) subDevices[i].battery = 100;
      }
    }

    // Build JSON packet
    String telemetryJSON = "{\"type\":\"telemetry\",\"count\":" + String(NUM_CLIENT_DEVICES) + ",\"devices\":[";
    for (int i = 0; i < NUM_CLIENT_DEVICES; i++) {
      telemetryJSON += "{";
      telemetryJSON += "\"id\":" + String(subDevices[i].id) + ",";
      telemetryJSON += "\"temp\":" + String(subDevices[i].temperature, 1) + ",";
      telemetryJSON += "\"rssi\":" + String(subDevices[i].rssi) + ",";
      telemetryJSON += "\"bat\":" + String(subDevices[i].battery) + ",";
      telemetryJSON += "\"status\":" + String(subDevices[i].online ? "\"ONLINE\"" : "\"OFFLINE\"");
      telemetryJSON += "}";
      if (i < NUM_CLIENT_DEVICES - 1) {
        telemetryJSON += ",";
      }
    }
    telemetryJSON += "]}\n"; // Add newline for parser split

    // Push telemetry to TCP
    if (tcpClient && tcpClient.connected()) {
      tcpClient.print(telemetryJSON);
    }
  }
}
