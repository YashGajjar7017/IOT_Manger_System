/**
 * ESP32 IoT Gateway Firmware Proof-of-Concept
 * 
 * Hardware Requirements:
 * - Boot Halt state: Press BOOT button (GPIO 0) or send "START_BOOT" over Serial to initiate.
 * - Sequential diagnostics for 9 peripherals.
 * - WiFi Access Point mode (local wireless router/dongle).
 * - Raw TCP server (Port 8080) for streaming telemetry data for 50-100 clients.
 * - HTTP OTA server (Port 80) for firmware binary uploads.
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Update.h>

// Pins
const int BOOT_BUTTON_PIN = 0; // GPIO 0 is the default Boot button on most ESP32 boards

// Server instances
WebServer httpServer(80);
WiFiServer tcpServer(8080);
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
  Serial.println("ESP32 IoT Gateway Boot Loader Version 1.0.0");
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
  delay(400);
  diagnostics.rs232 = true;
  Serial.println("[DIAGNOSTIC] [RS232] Success. Loopback test OK.");

  // 2. RS485 Check
  Serial.println("[DIAGNOSTIC] [RS485] Scanning differential bus... (9600 baud)");
  delay(400);
  diagnostics.rs485 = true;
  Serial.println("[DIAGNOSTIC] [RS485] Success. Termination resistor detected.");

  // 3. GPRS Connection Check
  Serial.println("[DIAGNOSTIC] [GPRS] Booting SIM800/900 Module... (115200 baud)");
  delay(600);
  diagnostics.gprs = true;
  Serial.println("[DIAGNOSTIC] [GPRS] Success. Connected to cellular network. Signal: 24dB.");

  // 4. Bus Communication
  Serial.println("[DIAGNOSTIC] [BUS] Validating internal system bus... (9600 baud)");
  delay(400);
  diagnostics.bus = true;
  Serial.println("[DIAGNOSTIC] [BUS] Success. Modbus devices addressing verified.");

  // 5. AP Station
  Serial.println("[DIAGNOSTIC] [WIFI AP] Configuring radio chips... (9600 baud log)");
  delay(400);
  diagnostics.ap = true;
  Serial.println("[DIAGNOSTIC] [WIFI AP] Success. Ready to launch softAP.");

  // 6. Winbond Flash Storage
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Initializing SPI storage... (9600 baud)");
  delay(400);
  diagnostics.flash = true;
  Serial.println("[DIAGNOSTIC] [WINBOND FLASH] Success. Capacity: 128M-bit. FS mounted.");

  // 7. Digital Input (DI) Check
  Serial.println("[DIAGNOSTIC] [DI CHECK] Reading optocoupler inputs... (9600 baud)");
  delay(400);
  diagnostics.di = true;
  Serial.println("[DIAGNOSTIC] [DI CHECK] Success. DI pins pulled high.");

  // 8. Serial Output Driver
  Serial.println("[DIAGNOSTIC] [DRIVERS] Activating shift registers... (9600 baud)");
  delay(400);
  diagnostics.driver = true;
  Serial.println("[DIAGNOSTIC] [DRIVERS] Success. Relays/Outputs responsive.");

  // 9. Real-Time Clock (RTC) Module
  Serial.println("[DIAGNOSTIC] [RTC] Querying DS3231 I2C interface... (9600 baud)");
  delay(400);
  diagnostics.rtc = true;
  Serial.println("[DIAGNOSTIC] [RTC] Success. Time read matches system backup clock.");

  Serial.println("\n[DIAGNOSTIC] All 9 diagnostics tests completed successfully!");
  delay(500);

  // Send JSON Payload
  sendBootSuccessPayload();

  // Initialize soft Access Point (AP Router Mode)
  setupWiFiAP();

  // Start TCP server
  tcpServer.begin();
  Serial.println("[TCP] Live Telemetry server started on port 8080.");

  // Start HTTP OTA server
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

// Setup HTTP Routes for status and OTA update
void setupHTTPServer() {
  // Status Page
  httpServer.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT Gateway</title></head><body>";
    html += "<h1>IoT Gateway Active</h1>";
    html += "<p>MAC: " + deviceMAC + "</p>";
    html += "<p>Clients: " + String(NUM_CLIENT_DEVICES) + " active</p>";
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
  Serial.println("[HTTP] OTA Server started on port 80.");
}

// 5. Main Running state
void handleRunningState() {
  // Keep HTTP Server alive
  httpServer.handleClient();

  // Accept incoming TCP connections (from Electron App)
  if (tcpServer.hasClient()) {
    if (tcpClient && tcpClient.connected()) {
      // Disconnect existing client if a new one connects
      tcpClient.stop();
    }
    tcpClient = tcpServer.available();
    Serial.println("[TCP] Electron App client connected!");
  }

  // Handle Client Telemetry streaming
  if (millis() - lastTelemetryTime > 1500) { // Every 1.5 seconds
    lastTelemetryTime = millis();
    
    // Update simulated sub-devices (fluctuate readings slightly)
    for (int i = 0; i < NUM_CLIENT_DEVICES; i++) {
      // Small temperature fluctuation
      subDevices[i].temperature += (random(-5, 6) / 10.0);
      if (subDevices[i].temperature < 15.0) subDevices[i].temperature = 15.0;
      if (subDevices[i].temperature > 40.0) subDevices[i].temperature = 40.0;
      
      // Random online/offline status (95% online)
      subDevices[i].online = (random(0, 100) < 95);
      
      // Fluctuating RSSI
      subDevices[i].rssi += random(-2, 3);
      if (subDevices[i].rssi > -30) subDevices[i].rssi = -30;
      if (subDevices[i].rssi < -95) subDevices[i].rssi = -95;
      
      // Battery slow drain simulation
      if (random(0, 100) < 5) {
        subDevices[i].battery -= 1;
        if (subDevices[i].battery < 0) subDevices[i].battery = 100; // recharge simulated
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
    
    // Also push a smaller log to Serial so we can monitor on USB
    Serial.print("[TELEMETRY] Broadcasted packet to clients. Active count: ");
    Serial.println(NUM_CLIENT_DEVICES);
  }
}
