/*
 * =========================================================================
 * NOTE: THIS FILE IS COMMENTED OUT TO PREVENT COMPILER REDEFINITION ERRORS.
 * 
 * In Arduino/ESP32 build environments, all .ino files in the same directory
 * (e.g. firmware/) are combined into a single translation unit during build.
 * Having setup(), loop(), and other variables defined in both firmware.ino
 * and OTA_update.ino in the same folder causes "redefinition" errors.
 * 
 * The active code has been relocated to its own separate project directory:
 * firmware/OTA_update/OTA_update.ino
 * =========================================================================
 */

/*
#include <WiFi.h>
#include <WiFiUdp.h>
#include <WebServer.h>
#include <Update.h>
#include "esp_ota_ops.h"
#include "esp_partition.h"

// WebServer listening on port 500
WebServer server(500);

// UDP Discovery Responder
WiFiUDP udpListener;
const int UDP_PORT = 5002;

// Device Identity
String deviceMAC = "";
String deviceIMEI = "866738083623502_OTA";

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n=============================================================");
  Serial.println("       ESP32 OTA UPDATE FIRMWARE INITIALIZING                ");
  Serial.println("=============================================================");
  Serial.println("[SYSTEM] Baudrate configured at 115200 bps.");

  // Get MAC Address
  deviceMAC = WiFi.macAddress();
  String apSsid = "ESP32_OTA_GATEWAY_" + deviceMAC;
  apSsid.replace(":", "");

  // Configure SoftAP starting IP address 192.168.4.1 explicitly
  Serial.println("[WIFI AP] Configuring SoftAP radio transmitter details...");
  IPAddress local_IP(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
  WiFi.softAPConfig(local_IP, gateway, subnet);
  
  if (WiFi.softAP(apSsid.c_str())) {
    Serial.println("[WIFI AP] SoftAP started successfully.");
  } else {
    Serial.println("[WIFI AP] ERROR: SoftAP configuration failed!");
  }

  IPAddress apIP = WiFi.softAPIP();
  Serial.println("---------------------------------------------");
  Serial.print("[WIFI AP] SoftAP SSID               : ");
  Serial.println(apSsid);
  Serial.print("[WIFI AP] SoftAP Gateway IP Address : ");
  Serial.println(apIP.toString());
  Serial.println("---------------------------------------------");

  // Start UDP Discovery responder
  Serial.printf("[UDP] Starting Discovery responder on port %d...\n", UDP_PORT);
  udpListener.begin(UDP_PORT);
  Serial.println("[UDP] Discovery responder ready.");

  // Setup Web Server routes
  server.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT OTA Portal</title>";
    html += "<style>body{background:#03000a;color:#fff;font-family:sans-serif;text-align:center;padding:50px;}";
    html += ".card{background:rgba(255,255,255,0.03);border:1px solid rgba(0,240,255,0.2);border-radius:12px;padding:30px;display:inline-block;width:400px;}";
    html += "h1{color:#00f0ff;}p{color:#a0a0b0;}</style></head><body>";
    html += "<div class='card'><h1>IoT OTA Portal (Port 500)</h1>";
    html += "<p>Device MAC: " + WiFi.softAPmacAddress() + "</p>";
    html += "<p>Use the desktop dashboard GUI to upload and flash firmware binaries.</p></div></body></html>";
    server.send(200, "text/html", html);
  });

  // Setup HTTP POST Upload handler for /update
  server.on("/update", HTTP_POST, []() {
    server.sendHeader("Connection", "close");
    if (Update.hasError()) {
      Serial.println("[OTA ERROR] Flash update failed. Reporting failure to client...");
      server.send(500, "text/plain", "FAIL");
    } else {
      Serial.println("[OTA SUCCESS] Flash complete! Rebooting device in 1 second...");
      server.send(200, "text/plain", "OK");
      delay(1000);
      ESP.restart();
    }
  }, []() {
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
      Serial.println("\n---------------------------------------------");
      Serial.printf("[OTA] Beginning firmware upload process...\n");
      Serial.printf("[OTA] File Name: %s\n", upload.filename.c_str());

      // Check running partition context
      const esp_partition_t* running = esp_ota_get_running_partition();
      if (running != NULL) {
        Serial.printf("[OTA] Running App Partition: %s\n", running->label);
      }

      if (!Update.begin(UPDATE_SIZE_UNKNOWN)) {
        Serial.printf("[OTA ERROR] Update.begin failed: ");
        Update.printError(Serial);
      } else {
        Serial.println("[OTA] Partition prepared. Streaming sectors to flash memory...");
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      static int lastProgressPercent = -1;
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Serial.printf("[OTA ERROR] Sector write failed: ");
        Update.printError(Serial);
      } else {
        // Log progress every 10%
        int totalWritten = Update.progress();
        int totalSize = upload.totalSize;
        if (totalSize > 0) {
          int progressPercent = (totalWritten * 100) / totalSize;
          if (progressPercent % 10 == 0 && progressPercent != lastProgressPercent) {
            Serial.printf("[OTA PROGRESS] Flashed: %d%%\n", progressPercent);
            lastProgressPercent = progressPercent;
          }
        }
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) {
        Serial.println("[OTA] Firmware file successfully downloaded and verified!");
        Serial.printf("[OTA] Total bytes written: %u bytes.\n", upload.totalSize);
        Serial.println("---------------------------------------------");
      } else {
        Serial.printf("[OTA ERROR] Update verification failed: ");
        Update.printError(Serial);
      }
    }
  });

  server.begin();
  Serial.println("[HTTP] WebServer started on Port 500.");
  Serial.println("[SYSTEM] Ready to service firmware updates. Awaiting connection...\n");
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
      
      // Since OTA mode is SoftAP only, we reply with softAP IP (192.168.4.1)
      String responseIP = WiFi.softAPIP().toString();
      
      String response = "{\"status\":\"ONLINE\",\"ip\":\"" +
                        responseIP + "\",\"imei\":\"" +
                        deviceIMEI + "\",\"mac\":\"" + deviceMAC + "\"}";

      udpListener.print(response);
      udpListener.endPacket();
      Serial.printf("[UDP DISCOVERY] Responded to %s:%d with IP %s\n",
                    udpListener.remoteIP().toString().c_str(),
                    udpListener.remotePort(), responseIP.c_str());
    }
  }
}

void loop() {
  server.handleClient();
  handleUDPDiscovery();
}
*/
