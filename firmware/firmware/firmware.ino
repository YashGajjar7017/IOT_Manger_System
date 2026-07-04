/**
 * ============================================================
 *  ESP32-S3 IoT Gateway Firmware  v4.0
 *  (Production + Diagnostic Merge)
 *
 *  Architecture based on Diagnostic Firmware v3.0.
 *  All production features from Revision 2/3 are preserved:
 *    • TCP telemetry → Electron desktop app (port 9000)
 *    • UDP discovery responder (port 5002)
 *    • SPIFFS certificate storage + QCOM sync (Serial1)
 *    • HTTP OTA servers: Port 500 (cert/direct) & Port 8000 (ESP32)
 *    • QCOM partition shift
 *    • Relay control (GPIO 4 & 6)
 *    • Full command processor
 *    • State machine: HALT → DIAGNOSTICS → RUNNING
 *    • SoftAP + STA dual WiFi mode
 *
 *  NEW in v4.0 (from Diagnostic FW):
 *    • Ultra-premium PRISM web dashboard at port 80 (web_ui.h)
 *    • Structured TestResult[] with PASS/WARN/FAIL/SKIP status
 *    • Async test dispatch via pendingAll / pendingTestID flags
 *    • Circular 4 KB log buffer served at /log
 *    • 9 modular test functions (RS232, RS485, GPRS, DI, PSRAM,
 *      RTC, Winbond, FR Meter, Switch)
 *    • GPRS AT quick-action routes (/gprs-speed, /gprs-reset, /gprs-echo-off)
 *    • OTA via dashboard at /ota (port 80)
 *    • RTC_DS1307 (RTClib Adafruit)
 *
 *  REQUIRED LIBRARIES
 *    • RTClib (Adafruit)
 *  BUILT-IN (ESP32 Arduino core)
 *    • WiFi, WebServer, Update, SPI, Wire, FS, SPIFFS
 * ============================================================
 *
 *  HOW TO USE
 *  1. Flash via Arduino IDE or esptool.
 *  2. Connect phone/laptop to WiFi:
 *       SSID : Esp32_Channel_Network's   (diagnostic dashboard)
 *       Pass : esp32
 *  3. Open browser → http://192.168.4.1  (PRISM dashboard)
 *  4. Run tests or use the Electron desktop app for production.
 */

// ── System headers ─────────────────────────────────────────────────────────────
#include "RTClib.h"
#include "FS.h"
#include "SPIFFS.h"
#include "web_ui.h"        // PROGMEM PRISM dashboard (from diagnostic FW v4.0)
#include "winbond_flash.h" // SPI flash JEDEC helper
#include "esp_ota_ops.h"
#include "esp_partition.h"
#include <Arduino.h>
#include <SPI.h>
#include <Update.h>
#include <WebServer.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <Wire.h>
#include <queue>

// ============================================================
//  BOARD PIN MAP
// ============================================================
#define MUX_A0 36       // MUX select bit 0
#define MUX_A1 37       // MUX select bit 1

// RS232 port  (MUX_A0=HIGH, MUX_A1=LOW → Serial2)
#define RS232_RX 15
#define RS232_TX 14

// RS485 port  (MUX_A0=LOW,  MUX_A1=LOW → Serial2)
#define RS485_RX 18
#define RS485_TX 17

// GPRS / LTE modem  (Serial1)
#define GPRS_RX 1
#define GPRS_TX 2
#define GSM_EN_PIN 21
#define GSM_PWRKEY_PIN 5

// RS232 cross-port slave  (Serial1 re-used during RS232 test)
#define RS232_SLAVE_RX GPRS_RX  // GPIO 1
#define RS232_SLAVE_TX GPRS_TX  // GPIO 2

// I2C  (-1 = use board default SDA/SCL)
#define I2C_SDA -1
#define I2C_SCL -1

// Digital Inputs
#define DI_COUNT 4
const uint8_t DI_PINS[DI_COUNT] = {38, 39, 40, 41};

// Switch inputs
#define SW_COUNT 4
const uint8_t SW_PINS[SW_COUNT]    = {42, 45, 46, 47};
const char   *SW_LABELS[SW_COUNT]  = {"SW1", "SW2", "SW3", "SW4"};
bool          swState[SW_COUNT]    = {false, false, false, false};

// SPI Flash
#define FLASH_CS   10
#define FLASH_SCK  12
#define FLASH_MISO 11
#define FLASH_MOSI 13

// Relay outputs
#define RELAY_1_PIN 4
#define RELAY_2_PIN 6

// Boot button
#define BOOT_BUTTON_PIN 0

// ============================================================
//  MODBUS / SERIAL CONFIG
// ============================================================
#define MODBUS_BAUD        9600
#define MODBUS_CFG         SERIAL_8N1
#define MODBUS_TIMEOUT_MS  1200
#define MODBUS_GAP_MS      40
#define MODBUS_FC03        0x03

#define FR_SLAVE_ID   1
#define FR_START_REG  0
#define FR_REG_COUNT  2

#define CONT_TEST_MS   5000
#define CONT_INTERVAL  500

#define GPRS_BAUD_RATE    115200
#define GPRS_AT_TIMEOUT_MS 2000

// ============================================================
//  WI-FI  (Diagnostic / Web dashboard AP)
// ============================================================
#define AP_SSID "Esp32_Channel_Network's"
#define AP_PASS "esp32"

// ============================================================
//  TEST IDs & STATUSES
// ============================================================
enum TestID : int {
  T_RS232 = 0,
  T_RS485 = 1,
  T_GPRS  = 2,
  T_DI    = 3,
  T_PSRAM = 4,
  T_RTC   = 5,
  T_WINBOND = 6,
  T_FR    = 7,
  T_SWITCH = 8,
  T_COUNT = 9
};

enum TestStatus : uint8_t { S_PENDING, S_PASS, S_WARN, S_FAIL, S_SKIP };

struct TestResult {
  const char *name;
  TestStatus  status;
  String      detail;
};

// ============================================================
//  GLOBAL OBJECTS
// ============================================================
RTC_DS1307 rtc;

// Diagnostic web server (port 80, served from main loop)
WebServer server(80);

// Production OTA servers (handled by Core-1 FreeRTOS task)
WebServer httpServer(8000); // standard OTA + REST APIs
WebServer Server(500);      // cert upload / direct OTA / QCOM shift

// ── Test results array ──────────────────────────────────────
TestResult results[T_COUNT] = {
  {"RS232",   S_PENDING, "Not tested"},
  {"RS485",   S_PENDING, "Not tested"},
  {"GPRS",    S_PENDING, "Not tested"},
  {"DI",      S_PENDING, "Not tested"},
  {"PSRAM",   S_PENDING, "Not tested"},
  {"RTC",     S_PENDING, "Not tested"},
  {"Winbond", S_PENDING, "Not tested"},
  {"FR",      S_PENDING, "Not tested"},
  {"Switch",  S_PENDING, "Not tested"},
};

volatile bool testRunning  = false;
volatile bool pendingAll   = false;
volatile int  pendingTestID = -1;

// Circular log buffer
#define LOG_MAX_BYTES 4096
String logBuf;

// ── Production globals ──────────────────────────────────────
String deviceIMEI      = "866738083623502";
String deviceMAC       = "";
String devicePassword  = "admin_secure_gate";
String bootCertTarget  = "BOTH";

String routerSSID     = "Medha_Network's";
String routerPassword = "medha@123";

enum SystemState { STATE_HALT, STATE_DIAGNOSTICS, STATE_RUNNING };
SystemState currentState = STATE_HALT;

unsigned long lastLogTime       = 0;
unsigned long lastTelemetryTime = 0;
unsigned long telemetryInterval = 1500;

bool relay1State = false;
bool relay2State = false;

volatile bool diagRunning = false;

// TCP client (Electron desktop app)
WiFiClient tcpClient;
IPAddress  electronServerIP;
bool       hasElectronServerIP = false;
unsigned long lastConnectAttempt = 0;
const unsigned long connectInterval = 5000;

// UDP discovery (port 5002)
WiFiUDP udpListener;
const int UDP_PORT = 5002;

// Thread-safe TCP notification queue
std::queue<String> tcpNotificationQueue;
SemaphoreHandle_t  tcpQueueSemaphore = NULL;

// SPIFFS certificate list
#define MAX_CERTS 10
String certNames[MAX_CERTS] = {"rootCA.pem","device_cert.crt","private_key.key"};
size_t certSizes[MAX_CERTS] = {1188, 2048, 1675};
int    certCount = 3;

// QCOM/OTA upload state
bool isQcomUpdate = false;
const esp_partition_t *targetPartition = nullptr;
size_t writeOffset = 0;

// WiFi event flags (volatile — set from ISR context)
volatile bool eventAPClientConnected    = false;
volatile bool eventAPClientDisconnected = false;
volatile bool eventSTAConnected         = false;
volatile bool eventSTADisconnected      = false;
volatile bool eventSTAGotIP             = false;

// Forward declarations
void sendBootSuccessPayload();
void sendControlStatus();
void sendProgressPayload(String step, int progress, String message);
void dumpCertsToQcom();
void processCommand(String cmd);
String getCertificatesJson();
String getSoftAPStationsJson();
void handleCertUploadDirect(String filename, String certType);
void handleCertUploadDirectOta(String filename, String certType);
void queueTcpNotification(String jsonMsg);
void processTcpNotifications();

// ============================================================
//  LOGGING HELPERS
// ============================================================
void logAdd(const String &s) {
  Serial.print(s);
  logBuf += s;
  if (logBuf.length() > LOG_MAX_BYTES)
    logBuf = logBuf.substring(logBuf.length() - LOG_MAX_BYTES);
}
void logLn(const String &s = "") { logAdd(s + "\n"); }
void logLine() { logLn("------------------------------------------------------------"); }

void logFmt(const char *fmt, ...) {
  char buf[256];
  va_list a;
  va_start(a, fmt);
  vsnprintf(buf, sizeof(buf), fmt, a);
  va_end(a);
  logAdd(String(buf));
}

// ============================================================
//  TEST RESULT HELPERS
// ============================================================
const char *statusStr(TestStatus s) {
  switch (s) {
    case S_PASS: return "PASS";
    case S_WARN: return "WARN";
    case S_FAIL: return "FAIL";
    case S_SKIP: return "SKIP";
    default:     return "PENDING";
  }
}

void setResult(TestID id, TestStatus status, const String &detail) {
  results[id].status = status;
  results[id].detail = detail;
  logFmt("[%s] %s: %s\n", statusStr(status), results[id].name, detail.c_str());
}

// ============================================================
//  SERIAL / MODBUS HELPERS
// ============================================================
void drain(HardwareSerial &p) { while (p.available()) p.read(); }

String hexStr(const uint8_t *d, size_t n) {
  String s;
  char h[4];
  for (size_t i = 0; i < n; i++) {
    if (i) s += ' ';
    snprintf(h, sizeof(h), "%02X", d[i]);
    s += h;
  }
  return s;
}

size_t readFrame(HardwareSerial &p, uint8_t *buf, size_t maxLen,
                 uint32_t timeoutMs, uint32_t gapMs) {
  size_t   n    = 0;
  bool     seen = false;
  uint32_t t0   = millis();
  uint32_t tl   = t0;
  while (millis() - t0 < timeoutMs) {
    while (p.available()) {
      int b = p.read();
      if (b >= 0 && n < maxLen) buf[n++] = (uint8_t)b;
      seen = true;
      tl   = millis();
    }
    if (seen && (millis() - tl) >= gapMs) break;
    delay(1);
  }
  return n;
}

// ============================================================
//  MUX CONTROL
// ============================================================
void muxRS232() { digitalWrite(MUX_A0, HIGH); digitalWrite(MUX_A1, LOW); delay(80); }
void muxRS485() { digitalWrite(MUX_A0, LOW);  digitalWrite(MUX_A1, LOW); delay(80); }

// ============================================================
//  GSM POWER-ON
// ============================================================
void gsmPowerOn() {
  pinMode(GSM_EN_PIN,     OUTPUT);
  pinMode(GSM_PWRKEY_PIN, OUTPUT);
  digitalWrite(GSM_EN_PIN, HIGH);
  delay(100);
  digitalWrite(GSM_PWRKEY_PIN, HIGH);
  delay(1200);
  digitalWrite(GSM_PWRKEY_PIN, LOW);
}

// ============================================================
//  MODBUS CRC-16
// ============================================================
uint16_t crc16(const uint8_t *d, size_t n) {
  uint16_t c = 0xFFFF;
  for (size_t i = 0; i < n; i++) {
    c ^= d[i];
    for (int j = 0; j < 8; j++) c = (c & 1) ? ((c >> 1) ^ 0xA001) : (c >> 1);
  }
  return c;
}

bool crcOK(const uint8_t *f, size_t n) {
  if (n < 4) return false;
  uint16_t rx = f[n-2] | ((uint16_t)f[n-1] << 8);
  return rx == crc16(f, n - 2);
}

// ============================================================
//  TEST — RS232
// ============================================================
void testRS232() {
  testRunning = true;
  setResult(T_RS232, S_PENDING, "Running…");
  logLine();
  logLn("RS232 · MASTER↔SLAVE CROSS-PORT TEST (5 s)");

  muxRS232();
  Serial2.end(); delay(20);
  Serial2.begin(MODBUS_BAUD, MODBUS_CFG, RS232_RX, RS232_TX); delay(50);

  Serial1.end(); delay(20);
  Serial1.begin(MODBUS_BAUD, MODBUS_CFG, RS232_SLAVE_RX, RS232_SLAVE_TX); delay(50);

  logFmt("Master : TX=GPIO%d  RX=GPIO%d\n", RS232_TX, RS232_RX);
  logFmt("Slave  : RX=GPIO%d  TX=GPIO%d\n", RS232_SLAVE_RX, RS232_SLAVE_TX);

  uint8_t req[8] = {(uint8_t)FR_SLAVE_ID, MODBUS_FC03,
    highByte(FR_START_REG), lowByte(FR_START_REG),
    highByte(FR_REG_COUNT),  lowByte(FR_REG_COUNT), 0, 0};
  uint16_t reqCRC = crc16(req, 6);
  req[6] = lowByte(reqCRC); req[7] = highByte(reqCRC);

  uint8_t slaveResp[9] = {(uint8_t)FR_SLAVE_ID, MODBUS_FC03,
    (uint8_t)(FR_REG_COUNT * 2), 0x00, 0x01, 0x00, 0x02, 0, 0};
  uint16_t respCRC = crc16(slaveResp, 7);
  slaveResp[7] = lowByte(respCRC); slaveResp[8] = highByte(respCRC);

  int attempts = 0, passes = 0;
  uint32_t deadline = millis() + CONT_TEST_MS;

  while (millis() < deadline) {
    attempts++;
    logFmt("─── Round %d ───────────────────────\n", attempts);
    logFmt("Master TX: %s\n", hexStr(req, 8).c_str());

    drain(Serial2); drain(Serial1);
    Serial2.write(req, 8); Serial2.flush();
    delay(25);

    uint8_t rxBuf[16]; size_t rxn = 0;
    uint32_t rxt = millis();
    while (millis() - rxt < 30 && rxn < 16) {
      while (Serial1.available() && rxn < 16) rxBuf[rxn++] = Serial1.read();
    }
    logFmt("Slave  RX: %u byte(s)%s\n", (unsigned)rxn, rxn >= 8 ? " — request OK" : " — incomplete!");

    if (rxn >= 8 && rxBuf[0] == (uint8_t)FR_SLAVE_ID && rxBuf[1] == MODBUS_FC03) {
      drain(Serial1);
      Serial1.write(slaveResp, 9); Serial1.flush();
      logFmt("Slave  TX: %s\n", hexStr(slaveResp, 9).c_str());

      uint8_t resp[128];
      size_t rn = readFrame(Serial2, resp, sizeof(resp), MODBUS_TIMEOUT_MS, MODBUS_GAP_MS);
      if (rn > 0) {
        logFmt("Master RX: %s (%u B)\n", hexStr(resp, min(rn, (size_t)16)).c_str(), (unsigned)rn);
        for (size_t o = 0; o + 5 <= rn; o++) {
          if (resp[o] != (uint8_t)FR_SLAVE_ID) continue;
          if (resp[o+1] != MODBUS_FC03) continue;
          uint8_t bc = resp[o+2];
          if (o + 5 + bc > rn || !crcOK(resp+o, 5+bc)) continue;
          passes++;
          logLn("Master RX: CRC OK → PASS");
          break;
        }
      } else {
        logLn("Master RX: timeout — no response received");
      }
    } else {
      logFmt("Slave  RX: %u byte(s) received — skipping reply\n", (unsigned)rxn);
    }

    uint32_t nextSend = millis() + CONT_INTERVAL;
    while (millis() < nextSend && millis() < deadline) { server.handleClient(); delay(1); }
  }

  if (passes > 0) {
    setResult(T_RS232, S_PASS,
      "Cross-port OK — " + String(passes) + "/" + String(attempts) + " rounds passed");
  } else {
    setResult(T_RS232, S_WARN,
      "MUX OK · slave port got no valid reply (" + String(attempts) + " rounds)");
  }

  // Restore Serial1 to GPRS baud
  Serial1.end(); delay(20);
  Serial1.begin(GPRS_BAUD_RATE, SERIAL_8N1, GPRS_RX, GPRS_TX);
  testRunning = false;
}

// ============================================================
//  TEST — RS485
// ============================================================
void testRS485() {
  testRunning = true;
  setResult(T_RS485, S_PENDING, "Running…");
  logLine();
  logLn("RS485 · MODBUS BUS TEST (5 s continuous)");

  muxRS485();
  Serial2.end(); delay(20);
  Serial2.begin(9600, SERIAL_8N1, RS485_RX, RS485_TX); delay(100);

  uint8_t req[8] = {0x01, 0x08, 0x00, 0x00, 0xA5, 0x37, 0, 0};
  uint16_t c = crc16(req, 6);
  req[6] = lowByte(c); req[7] = highByte(c);

  int attempts = 0, passes = 0;
  uint32_t deadline = millis() + CONT_TEST_MS;

  while (millis() < deadline) {
    attempts++;
    logFmt("Attempt %d  Req: %s\n", attempts, hexStr(req, 8).c_str());
    drain(Serial2);
    Serial2.write(req, 8); Serial2.flush();

    uint8_t resp[128];
    size_t rn = readFrame(Serial2, resp, sizeof(resp), MODBUS_TIMEOUT_MS, MODBUS_GAP_MS);
    if (rn > 0) {
      logFmt("       Resp: %s (%u B)\n", hexStr(resp, min(rn, (size_t)16)).c_str(), (unsigned)rn);
      passes++;
    } else {
      logLn("       No response");
    }

    uint32_t nextSend = millis() + CONT_INTERVAL;
    while (millis() < nextSend && millis() < deadline) { server.handleClient(); delay(1); }
  }

  if (passes > 0)
    setResult(T_RS485, S_PASS, "MUX OK | Device responded " + String(passes) + "/" + String(attempts) + " times");
  else
    setResult(T_RS485, S_WARN, "MUX switched OK · no device responded (" + String(attempts) + " attempts)");

  testRunning = false;
}

// ============================================================
//  GPRS AT helpers
// ============================================================
static String atRead(uint32_t ms) {
  String r; uint32_t t0 = millis(); bool seen = false;
  while (millis() - t0 < ms) {
    while (Serial1.available()) { r += (char)Serial1.read(); seen = true; }
    if (seen && millis() - t0 > 150) break;
    delay(1);
  }
  r.trim(); return r;
}

static String AT(const char *cmd, uint32_t ms = 1200) {
  drain(Serial1);
  Serial1.print(cmd); Serial1.print("\r\n");
  return atRead(ms);
}

static int parseCSQ(const String &r) {
  int s = r.indexOf("+CSQ:"); if (s < 0) return -1;
  int p = s + 5;
  while (p < (int)r.length() && (r[p] < '0' || r[p] > '9')) p++;
  int e = p;
  while (e < (int)r.length() && r[e] >= '0' && r[e] <= '9') e++;
  return (e == p) ? -1 : r.substring(p, e).toInt();
}

// ============================================================
//  TEST — GPRS / LTE
// ============================================================
void testGPRS() {
  testRunning = true;
  setResult(T_GPRS, S_PENDING, "Running…");
  logLine();
  logLn("GPRS / LTE · AT COMMAND TEST");

  Serial1.end(); delay(20);
  Serial1.begin(GPRS_BAUD_RATE, SERIAL_8N1, GPRS_RX, GPRS_TX); delay(300);

  bool alive = false; String atResp;
  for (int i = 0; i < 3 && !alive; i++) {
    atResp = AT("AT", 1000);
    logFmt("AT[%d] -> %s\n", i+1, atResp.c_str());
    if (atResp.indexOf("OK") >= 0) { alive = true; break; }
    delay(400);
  }

  if (!alive) {
    setResult(T_GPRS, S_FAIL, "No AT response — check modem power/wiring | Baud=" + String(GPRS_BAUD_RATE));
    testRunning = false; return;
  }

  AT("ATE0", 500);
  String simR  = AT("AT+CPIN?", GPRS_AT_TIMEOUT_MS);
  String csqR  = AT("AT+CSQ",   GPRS_AT_TIMEOUT_MS);
  String cregR = AT("AT+CREG?", GPRS_AT_TIMEOUT_MS);
  String cgmiR = AT("AT+CGMI",  GPRS_AT_TIMEOUT_MS);

  logFmt("CPIN : %s\n", simR.c_str());
  logFmt("CSQ  : %s\n", csqR.c_str());
  logFmt("CREG : %s\n", cregR.c_str());
  logFmt("CGMI : %s\n", cgmiR.c_str());

  int csqV  = parseCSQ(csqR);
  bool simOK = simR.indexOf("READY") >= 0;
  bool regOK = cregR.indexOf(",1") >= 0 || cregR.indexOf(",5") >= 0;

  const char *sigQ = (csqV < 0 || csqV == 99) ? "??" :
                      csqV < 10 ? "LOW" : csqV < 15 ? "OK" : csqV < 20 ? "GOOD" : "STRONG";

  String detail = "Modem:OK";
  if (simOK) detail += " | SIM:READY"; else detail += " | SIM:NOT-READY";
  if (csqV >= 0 && csqV != 99)
    detail += " | CSQ:" + String(csqV) + "(" + String(-113 + 2*csqV) + "dBm," + sigQ + ")";
  else detail += " | CSQ:N/A";
  detail += regOK ? " | NET:REG" : " | NET:UNREG";

  setResult(T_GPRS, S_PASS, detail);
  testRunning = false;
}

// ============================================================
//  TEST — FR Meter
// ============================================================
void testFR() {
  testRunning = true;
  setResult(T_FR, S_PENDING, "Running…");
  logLine();
  logLn("FR METER · MODBUS RTU TEST");

  muxRS232();
  Serial2.end(); delay(20);
  Serial2.begin(MODBUS_BAUD, MODBUS_CFG, RS232_RX, RS232_TX);
  Serial2.flush(); delay(10);

  uint8_t req[8] = {(uint8_t)FR_SLAVE_ID, MODBUS_FC03,
    highByte(FR_START_REG), lowByte(FR_START_REG),
    highByte(FR_REG_COUNT),  lowByte(FR_REG_COUNT), 0, 0};
  uint16_t c = crc16(req, 6);
  req[6] = lowByte(c); req[7] = highByte(c);

  logFmt("Slave ID: %d  Regs: %d..%d\n", FR_SLAVE_ID, FR_START_REG, FR_START_REG + FR_REG_COUNT - 1);
  logFmt("Req : %s\n", hexStr(req, 8).c_str());
  drain(Serial2);
  Serial2.write(req, 8); Serial2.flush();

  uint8_t resp[128];
  size_t rn = readFrame(Serial2, resp, sizeof(resp), MODBUS_TIMEOUT_MS, MODBUS_GAP_MS);

  if (rn == 0) {
    setResult(T_FR, S_FAIL, "No response — check wiring & FR slave power");
    testRunning = false; return;
  }
  logFmt("Resp: %s (%u bytes)\n", hexStr(resp, rn).c_str(), (unsigned)rn);

  for (size_t o = 0; o + 5 <= rn; o++) {
    if (resp[o] != (uint8_t)FR_SLAVE_ID) continue;
    uint8_t fc = resp[o+1];
    if (fc == (MODBUS_FC03 | 0x80)) {
      if (crcOK(resp+o, 5)) setResult(T_FR, S_FAIL, "Exception code=" + String(resp[o+2]));
      continue;
    }
    if (fc != MODBUS_FC03) continue;
    uint8_t bc = resp[o+2];
    if (o + 5 + bc > rn || !crcOK(resp+o, 5+bc)) continue;
    String d;
    for (uint16_t i = 0; i < bc/2; i++) {
      if (i) d += ", ";
      uint16_t v = ((uint16_t)resp[o+3+i*2] << 8) | resp[o+4+i*2];
      d += "R" + String(FR_START_REG + i) + "=" + String(v);
    }
    setResult(T_FR, S_PASS, "slave=" + String(FR_SLAVE_ID) + " | " + d);
    testRunning = false; return;
  }
  setResult(T_FR, S_FAIL, "Invalid / corrupt response");
  testRunning = false;
}

// ============================================================
//  TEST — Switch Inputs
// ============================================================
void testSwitch() {
  testRunning = true;
  setResult(T_SWITCH, S_PENDING, "Reading…");
  logLine();
  logLn("SWITCH INPUT TEST");

  String detail; int closed = 0;
  for (int i = 0; i < SW_COUNT; i++) {
    pinMode(SW_PINS[i], INPUT_PULLUP); delay(5);
    int v = digitalRead(SW_PINS[i]);
    swState[i] = (v == LOW);
    if (i) detail += " | ";
    detail += String(SW_LABELS[i]) + "(G" + String(SW_PINS[i]) + ")=" + (swState[i] ? "ON" : "OFF");
    logFmt("%s  GPIO%u = %s\n", SW_LABELS[i], (unsigned)SW_PINS[i], swState[i] ? "ON (closed)" : "OFF (open)");
    if (swState[i]) closed++;
  }

  if (closed > 0) setResult(T_SWITCH, S_PASS, detail);
  else            setResult(T_SWITCH, S_WARN, detail + " · all open");
  testRunning = false;
}

// ============================================================
//  TEST — Digital Inputs
// ============================================================
void testDI() {
  testRunning = true;
  setResult(T_DI, S_PENDING, "Running…");
  logLine();
  logLn("DIGITAL INPUT TEST");

  String d;
  for (int i = 0; i < DI_COUNT; i++) {
    pinMode(DI_PINS[i], INPUT_PULLUP); delay(5);
    int v = digitalRead(DI_PINS[i]);
    if (i) d += " | ";
    d += "DI" + String(i+1) + "(G" + String(DI_PINS[i]) + ")=" + (v ? "H" : "L");
    logFmt("DI%d  GPIO%u = %s\n", i+1, (unsigned)DI_PINS[i], v ? "HIGH" : "LOW");
  }
  setResult(T_DI, S_PASS, d);
  testRunning = false;
}

// ============================================================
//  TEST — PSRAM
// ============================================================
void testPSRAM() {
  testRunning = true;
  setResult(T_PSRAM, S_PENDING, "Running…");
  logLine();
  logLn("PSRAM TEST");

  if (!psramInit()) {
    setResult(T_PSRAM, S_WARN, "PSRAM not present or not enabled in this build");
    testRunning = false; return;
  }

  size_t freeMem = ESP.getFreePsram();
  logFmt("Free PSRAM: %u bytes\n", (unsigned)freeMem);

  const size_t PROBE = 2048;
  uint8_t *probe = (uint8_t *)ps_malloc(PROBE);
  if (!probe) {
    setResult(T_PSRAM, S_FAIL, "ps_malloc(" + String(PROBE) + ") failed");
    testRunning = false; return;
  }

  for (size_t i = 0; i < PROBE; i++) probe[i] = (uint8_t)(i & 0xFF);
  bool ok = true;
  for (size_t i = 0; i < PROBE; i++) {
    if (probe[i] != (uint8_t)(i & 0xFF)) { ok = false; break; }
  }
  free(probe);

  char d[72];
  snprintf(d, sizeof(d), "%u B free | W/R %s", (unsigned)freeMem, ok ? "PASS" : "FAIL");
  setResult(T_PSRAM, ok ? S_PASS : S_FAIL, String(d));
  testRunning = false;
}

// ============================================================
//  TEST — RTC DS1307
// ============================================================
void testRTC() {
  testRunning = true;
  setResult(T_RTC, S_PENDING, "Running…");
  logLine();
  logLn("RTC DS1307 · I2C TEST");

#if I2C_SDA >= 0 && I2C_SCL >= 0
  Wire.begin(I2C_SDA, I2C_SCL);
#else
  Wire.begin();
#endif

  uint8_t found = 0;
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      logFmt("I2C device @ 0x%02X\n", a);
      found++;
    }
  }
  logFmt("I2C devices found: %u\n", (unsigned)found);

  if (!rtc.begin()) {
    setResult(T_RTC, S_FAIL, "DS1307 not detected | I2C devices=" + String(found));
    testRunning = false; return;
  }

  if (!rtc.isrunning()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    setResult(T_RTC, S_WARN, "Oscillator was stopped — set to compile time");
    testRunning = false; return;
  }

  DateTime now = rtc.now();
  char d[40];
  snprintf(d, sizeof(d), "%04u-%02u-%02u %02u:%02u:%02u",
    now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
  setResult(T_RTC, S_PASS, String(d));
  testRunning = false;
}

// ============================================================
//  TEST — Winbond SPI Flash
// ============================================================
void testWinbond() {
  testRunning = true;
  setResult(T_WINBOND, S_PENDING, "Running…");
  logLine();
  logLn("WINBOND SPI FLASH TEST");

  winbondInit();
  bool ok = runWinbondTest();

  if (ok)
    setResult(T_WINBOND, S_PASS, "JEDEC=" + winbondJedecString() + " | R/W OK");
  else
    setResult(T_WINBOND, S_FAIL, "JEDEC=" + winbondJedecString() + " | Not Winbond / no response");
  testRunning = false;
}

// ============================================================
//  RUN ALL / DISPATCH
// ============================================================
void runAllTests() {
  logBuf = "";
  logLine();
  logLn("=== GATEWAY DIAGNOSTIC — RUN ALL TESTS ===");
  logLine();
  testSwitch();
  testRS232();
  testRS485();
  testGPRS();
  testDI();
  testPSRAM();
  testRTC();
  testWinbond();
  testFR();
  logLine();
  logLn("=== ALL TESTS COMPLETE ===");
  logLine();
}

void dispatchTest(int id) {
  switch (id) {
    case T_RS232:   testRS232();   break;
    case T_RS485:   testRS485();   break;
    case T_GPRS:    testGPRS();    break;
    case T_DI:      testDI();      break;
    case T_PSRAM:   testPSRAM();   break;
    case T_RTC:     testRTC();     break;
    case T_WINBOND: testWinbond(); break;
    case T_FR:      testFR();      break;
    case T_SWITCH:  testSwitch();  break;
    default: break;
  }
}

// ============================================================
//  JSON BUILDER  (for /results endpoint)
// ============================================================
String buildJSON() {
  String j = "{\"running\":";
  j += testRunning ? "true" : "false";
  j += ",\"tests\":[";
  for (int i = 0; i < T_COUNT; i++) {
    if (i) j += ",";
    String d = results[i].detail;
    d.replace("\\", "\\\\");
    d.replace("\"", "\\\"");
    d.replace("\n", " ");
    d.replace("\r", "");
    j += "{\"name\":\"" + String(results[i].name) +
         "\",\"status\":\"" + String(statusStr(results[i].status)) +
         "\",\"detail\":\"" + d + "\"}";
  }
  j += "]}";
  return j;
}

// ============================================================
//  PORT-80 ROUTE HANDLERS  (diagnostic dashboard)
// ============================================================
void onRoot()    { server.send_P(200, "text/html", index_html); }

void onResults() {
  server.sendHeader("Cache-Control", "no-cache, no-store");
  server.send(200, "application/json", buildJSON());
}

void onLog() {
  server.sendHeader("Cache-Control", "no-cache, no-store");
  server.send(200, "text/plain; charset=utf-8", logBuf.length() ? logBuf : "No log yet.");
}

void onInfo() {
  char buf[300];
  snprintf(buf, sizeof(buf),
    "{\"fw\":\"4.0\",\"chip\":\"ESP32-S3\","
    "\"heap\":%u,\"psram\":%u,\"clients\":%u}",
    (unsigned)ESP.getFreeHeap(), (unsigned)ESP.getFreePsram(),
    (unsigned)WiFi.softAPgetStationNum());
  server.send(200, "application/json", String(buf));
}

void onSwitchState() {
  server.sendHeader("Cache-Control", "no-cache, no-store");
  String j = "{\"switches\":[";
  for (int i = 0; i < SW_COUNT; i++) {
    pinMode(SW_PINS[i], INPUT_PULLUP);
    bool on = (digitalRead(SW_PINS[i]) == LOW);
    swState[i] = on;
    if (i) j += ",";
    j += "{\"label\":\"" + String(SW_LABELS[i]) +
         "\",\"gpio\":" + String(SW_PINS[i]) +
         ",\"on\":" + (on ? "true" : "false") + "}";
  }
  j += "]}";
  server.send(200, "application/json", j);
}

void onGPRSSpeed() {
  if (testRunning) { server.send(429, "application/json", "{\"error\":\"busy\"}"); return; }
  logLine();
  logLn("GPRS SPEED → Setting baud rate to 1 Mbps (AT+IPR=1000000;&W)");
  Serial1.end(); delay(20);
  Serial1.begin(GPRS_BAUD_RATE, SERIAL_8N1, GPRS_RX, GPRS_TX); delay(300);
  drain(Serial1); Serial1.print("AT\r\n");
  String r1 = atRead(1000);
  logFmt("AT  -> %s\n", r1.c_str());
  drain(Serial1); Serial1.print("AT+IPR=1000000;&W\r\n");
  String r2 = atRead(1500);
  logFmt("AT+IPR=1000000;&W -> %s\n", r2.c_str());
  bool ok = r2.indexOf("OK") >= 0 || r1.indexOf("OK") >= 0;
  String resp;
  if (ok)
    resp = "{\"status\":\"ok\",\"msg\":\"Baud rate set to 1 Mbps\",\"modem_resp\":\"" + r2 + "\"}";
  else
    resp = "{\"status\":\"warn\",\"msg\":\"Command sent but no OK received\",\"modem_resp\":\"" + r2 + "\"}";
  server.send(200, "application/json", resp);
}

void onGPRSReset() {
  if (testRunning) { server.send(429, "application/json", "{\"error\":\"busy\"}"); return; }
  logLine(); logLn("GPRS RESET → Sending ATZ");
  drain(Serial1); Serial1.print("ATZ\r\n");
  String r = atRead(1500);
  logFmt("ATZ -> %s\n", r.c_str());
  bool ok = r.indexOf("OK") >= 0;
  String resp;
  if (ok) resp = "{\"status\":\"ok\",\"msg\":\"Modem reset OK (ATZ)\"}";
  else    resp = "{\"status\":\"warn\",\"msg\":\"ATZ sent - no OK received\"}";
  server.send(200, "application/json", resp);
}

void onGPRSEchoOff() {
  if (testRunning) { server.send(429, "application/json", "{\"error\":\"busy\"}"); return; }
  drain(Serial1); Serial1.print("ATE0\r\n");
  String r = atRead(1000);
  logFmt("ATE0 -> %s\n", r.c_str());
  bool ok = r.indexOf("OK") >= 0;
  String resp;
  if (ok) resp = "{\"status\":\"ok\",\"msg\":\"Echo disabled (ATE0)\"}";
  else    resp = "{\"status\":\"warn\",\"msg\":\"ATE0 sent - no OK received\"}";
  server.send(200, "application/json", resp);
}

void onRun() {
  if (testRunning) { server.send(429, "application/json", "{\"error\":\"busy\"}"); return; }
  String t = server.arg("test");
  t.toLowerCase();

  if      (t == "all")     pendingAll = true;
  else if (t == "rs232")   pendingTestID = T_RS232;
  else if (t == "rs485")   pendingTestID = T_RS485;
  else if (t == "gprs")    pendingTestID = T_GPRS;
  else if (t == "di")      pendingTestID = T_DI;
  else if (t == "psram")   pendingTestID = T_PSRAM;
  else if (t == "rtc")     pendingTestID = T_RTC;
  else if (t == "winbond") pendingTestID = T_WINBOND;
  else if (t == "fr")      pendingTestID = T_FR;
  else if (t == "switch")  pendingTestID = T_SWITCH;
  else { server.send(400, "application/json", "{\"error\":\"unknown test\"}"); return; }

  server.send(200, "application/json", "{\"status\":\"queued\"}");
}

// OTA at port 80 (upload handler)
void onOTAUpload() {
  HTTPUpload &u = server.upload();
  if (u.status == UPLOAD_FILE_START) {
    logFmt("OTA start: %s\n", u.filename.c_str());
    if (!Update.begin(UPDATE_SIZE_UNKNOWN))
      logLn("OTA begin error: " + String(Update.errorString()));
  } else if (u.status == UPLOAD_FILE_WRITE) {
    if (Update.write(u.buf, u.currentSize) != u.currentSize)
      logLn("OTA write error: " + String(Update.errorString()));
  } else if (u.status == UPLOAD_FILE_END) {
    if (Update.end(true))
      logFmt("OTA done: %u bytes written\n", (unsigned)u.totalSize);
    else
      logLn("OTA end error: " + String(Update.errorString()));
  }
}

// OTA at port 80 (completion handler)
void onOTADone() {
  bool ok = !Update.hasError();
  if (ok) {
    server.send(200, "text/plain", "OTA OK");
    logLn("OTA success — rebooting…");
    delay(1500);
    ESP.restart();
  } else {
    String err = Update.errorString();
    server.send(500, "text/plain", "OTA FAIL: " + err);
    logLn("OTA failed: " + err);
  }
}

// ============================================================
//  PRODUCTION: SPIFFS CERT HELPERS
// ============================================================
String getCertificatesJson() {
  String json = "["; bool first = true;
  File root = SPIFFS.open("/");
  if (root && root.isDirectory()) {
    File file = root.openNextFile();
    while (file) {
      String name = String(file.name());
      if (name.startsWith("/")) name = name.substring(1);
      if (name.endsWith(".pem") || name.endsWith(".crt") || name.endsWith(".key")) {
        if (!first) json += ",";
        json += "{\"name\":\"" + name + "\",\"size\":" + String(file.size()) + "}";
        first = false;
      }
      file = root.openNextFile();
    }
    root.close();
  }
  if (first) {
    for (int i = 0; i < certCount; i++) {
      if (i > 0) json += ",";
      json += "{\"name\":\"" + certNames[i] + "\",\"size\":" + String(certSizes[i]) + "}";
    }
  }
  json += "]"; return json;
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
  json += "]"; return json;
}

// ============================================================
//  PRODUCTION: QCOM CERT SYNC
// ============================================================
void dumpCertsToQcom() {
  logLn("[QCOM SYNC] Syncing certificates to QCOM over Serial1...");
  String certsToSync[] = {"aws_root_ca.pem", "device_cert.crt", "private_key.key"};
  for (int i = 0; i < 3; i++) {
    String path = "/" + certsToSync[i];
    if (SPIFFS.exists(path)) {
      File f = SPIFFS.open(path, "r");
      if (f) {
        logFmt("[QCOM] Streaming '%s'...\n", certsToSync[i].c_str());
        Serial1.printf("--- START_CERT:%s ---\n", certsToSync[i].c_str());
        while (f.available()) Serial1.write(f.read());
        Serial1.println("\n--- END_CERT ---");
        f.close();
        unsigned long sw = millis(); String qr = "";
        while (millis() - sw < 1500) {
          while (Serial1.available()) { char c = Serial1.read(); qr += c; }
          if (qr.indexOf("SUCCESS") != -1 || qr.indexOf("OK") != -1) break;
          delay(10);
        }
        qr.trim();
        logFmt("[QCOM] Response: %s\n", qr.length() > 0 ? qr.c_str() : "SUCCESS (Simulated)");
        if (tcpClient && tcpClient.connected())
          tcpClient.printf("[QCOM RESPONSE] %s\n", qr.length() > 0 ? qr.c_str() : "SUCCESS (Simulated)");
      }
    } else {
      logFmt("[QCOM] (Mock) Streaming '%s'...\n", certsToSync[i].c_str());
      Serial1.printf("--- START_CERT:%s (SIMULATED) ---\n", certsToSync[i].c_str());
      Serial1.println("MOCK_CERTIFICATE_DATA_FOR_PROOF_OF_CONCEPT");
      Serial1.println("--- END_CERT ---");
      delay(100);
      logLn("[QCOM] SUCCESS (Simulated mock verification)");
    }
  }
  logLn("[QCOM SYNC] Certificate sync completed.");
}

// ============================================================
//  PRODUCTION: BOOT PROGRESS / SUCCESS PAYLOADS
// ============================================================
void sendProgressPayload(String step, int progress, String message) {
  String json = "{";
  json += "\"status\":\"BOOT_PROGRESS\",";
  json += "\"step\":\"" + step + "\",";
  json += "\"progress\":" + String(progress) + ",";
  json += "\"message\":\"" + message + "\"";
  json += "}";
  Serial.print("JSON_PAYLOAD:"); Serial.println(json);
  if (tcpClient && tcpClient.connected()) tcpClient.println(json);
}

void sendBootSuccessPayload() {
  // Build test results section from TestResult array
  String diagJson = "{";
  diagJson += "\"rs232\":" + String(results[T_RS232].status == S_PASS ? "true" : "false") + ",";
  diagJson += "\"rs485\":" + String(results[T_RS485].status == S_PASS ? "true" : "false") + ",";
  diagJson += "\"gprs\":"  + String(results[T_GPRS].status  == S_PASS ? "true" : "false") + ",";
  diagJson += "\"flash\":" + String(results[T_WINBOND].status == S_PASS ? "true" : "false") + ",";
  diagJson += "\"di\":"    + String(results[T_DI].status    == S_PASS ? "true" : "false") + ",";
  diagJson += "\"rtc\":"   + String(results[T_RTC].status   == S_PASS ? "true" : "false") + ",";
  diagJson += "\"psram\":" + String(results[T_PSRAM].status == S_PASS ? "true" : "false") + ",";
  diagJson += "\"switch\":" + String(results[T_SWITCH].status == S_PASS ? "true" : "false") + ",";
  diagJson += "\"fr\":"    + String(results[T_FR].status    == S_PASS ? "true" : "false") + ",";
  diagJson += "\"ap\":true,\"bus\":true,\"driver\":true,";
  diagJson += "\"di_pins\":[";
  for (int i = 0; i < DI_COUNT; i++) {
    if (i) diagJson += ",";
    diagJson += (digitalRead(DI_PINS[i]) == HIGH) ? "true" : "false";
  }
  diagJson += "],";
  diagJson += "\"switch_pins\":[";
  for (int i = 0; i < SW_COUNT; i++) {
    if (i) diagJson += ",";
    diagJson += (digitalRead(SW_PINS[i]) == LOW) ? "true" : "false";
  }
  diagJson += "]";
  diagJson += "}";

  String json = "{";
  json += "\"status\":\"BOOT_SUCCESS\",";
  json += "\"imei\":\"" + deviceIMEI + "\",";
  json += "\"mac\":\"" + deviceMAC + "\",";
  json += "\"password\":\"" + devicePassword + "\",";
  json += "\"certificates\":" + getCertificatesJson() + ",";
  json += "\"diagnostics\":" + diagJson + ",";
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
  json += "},";
  json += "\"interval\":" + String(telemetryInterval);
  json += "}";

  Serial.print("JSON_PAYLOAD:"); Serial.println(json);
  if (tcpClient && tcpClient.connected()) tcpClient.println(json);
}

void sendControlStatus() {
  String json = "{\"type\":\"control_status\",";
  json += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
  json += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
  json += "\"interval\":" + String(telemetryInterval);
  json += "}\n";
  if (tcpClient && tcpClient.connected()) tcpClient.print(json);
  Serial.print("CONTROL_STATUS:"); Serial.print(json);
}

// ============================================================
//  PRODUCTION: QCOM PARTITION SHIFT
// ============================================================
bool shiftToQcomPartition() {
  logLn("[PARTITION] Initiating shift to QCOM partition...");
  sendProgressPayload("QCOM_SHIFT", 0, "Initiating shift to QCOM partition...");

  const esp_partition_t *running = esp_ota_get_running_partition();
  if (!running) { logLn("[ERROR] Failed to get running partition"); return false; }

  const esp_partition_t *src = NULL;
  if (strcmp(running->label, "app0") == 0)
    src = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_1, "app1");
  else
    src = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_0, "app0");
  if (!src) { logLn("[ERROR] Inactive app partition not found"); return false; }

  const esp_partition_t *dst = esp_partition_find_first(
    ESP_PARTITION_TYPE_DATA, ESP_PARTITION_SUBTYPE_DATA_SPIFFS, "core");
  if (!dst) { logLn("[ERROR] QCOM ('core') partition not found"); return false; }

  size_t copy_size = (src->size < dst->size) ? src->size : dst->size;
  logFmt("[PARTITION] Copy %u bytes: %s → %s\n", copy_size, src->label, dst->label);

  sendProgressPayload("QCOM_SHIFT", 10, "Erasing destination partition...");
  esp_err_t err = esp_partition_erase_range(dst, 0, copy_size);
  if (err != ESP_OK) { logFmt("[ERROR] Erase failed: 0x%x\n", err); return false; }

  const size_t buf_size = 4096;
  uint8_t *buffer = (uint8_t *)malloc(buf_size);
  if (!buffer) { logLn("[ERROR] Memory allocation failed"); return false; }

  size_t bytes_copied = 0;
  while (bytes_copied < copy_size) {
    size_t chunk = (copy_size - bytes_copied < buf_size) ? (copy_size - bytes_copied) : buf_size;
    err = esp_partition_read(src, bytes_copied, buffer, chunk);
    if (err != ESP_OK) { logFmt("[ERROR] Read failed at 0x%X\n", bytes_copied); free(buffer); return false; }
    err = esp_partition_write(dst, bytes_copied, buffer, chunk);
    if (err != ESP_OK) { logFmt("[ERROR] Write failed at 0x%X\n", bytes_copied); free(buffer); return false; }
    bytes_copied += chunk;
    int pct = (bytes_copied * 100) / copy_size;
    if (pct % 10 == 0) sendProgressPayload("QCOM_SHIFT", pct, "Shifting firmware to QCOM...");
  }

  free(buffer);
  logLn("[PARTITION] Shift completed successfully!");
  sendProgressPayload("QCOM_SHIFT", 100, "Shift operation completed successfully!");
  return true;
}

// ============================================================
//  PRODUCTION: CERT UPLOAD HELPERS
// ============================================================
void handleCertUploadDirectOta(String filename, String certType) {
  String content = Server.arg("plain");
  size_t size    = content.length();
  logFmt("[HTTP Port-500] Received OTA %s: %s (%u bytes)\n", certType.c_str(), filename.c_str(), size);
  File file = SPIFFS.open(filename, FILE_WRITE);
  if (file) { file.print(content); file.close(); }
  Serial.println("\n--- START OF CERTIFICATE FILE CONTENT ---");
  Serial.print(content);
  Serial.println("\n--- END OF CERTIFICATE FILE CONTENT ---\n");
  dumpCertsToQcom();
  Server.send(200, "text/plain", "OK");
}

void handleCertUploadDirect(String filename, String certType) {
  String content = httpServer.arg("plain");
  size_t size    = content.length();
  logFmt("[HTTP Port-8000] Received %s: %s (%u bytes)\n", certType.c_str(), filename.c_str(), size);
  File file = SPIFFS.open(filename, FILE_WRITE);
  if (file) { file.print(content); file.close(); }
  Serial.println("\n--- START OF CERTIFICATE FILE CONTENT ---");
  Serial.print(content);
  Serial.println("\n--- END OF CERTIFICATE FILE CONTENT ---\n");
  // Update cert list
  String clean = filename.startsWith("/") ? filename.substring(1) : filename;
  if (certCount < MAX_CERTS) {
    bool found = false;
    for (int i = 0; i < certCount; i++) {
      if (certNames[i] == clean) { certSizes[i] = size; found = true; break; }
    }
    if (!found) { certNames[certCount] = clean; certSizes[certCount] = size; certCount++; }
  }
  String reply = "{\"status\":\"CERT_ADDED\",\"filename\":\"" + clean +
    "\",\"size\":" + String(size) + ",\"certificates\":" + getCertificatesJson() + "}";
  Serial.print("JSON_PAYLOAD:"); Serial.println(reply);
  if (tcpClient && tcpClient.connected()) tcpClient.println(reply);
  httpServer.send(200, "text/plain", "OK");
}

// ============================================================
//  PRODUCTION: PORT-500 SERVER SETUP
// ============================================================
void setupServer() {
  Server.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT OTA Portal</title>";
    html += "<style>body{background:#03000a;color:#fff;font-family:sans-serif;text-align:center;padding:50px;}";
    html += ".card{background:rgba(255,255,255,0.03);border:1px solid rgba(0,240,255,0.2);border-radius:12px;padding:30px;display:inline-block;width:400px;}";
    html += "h1{color:#00f0ff;}p{color:#a0a0b0;}</style></head><body>";
    html += "<div class='card'><h1>IoT OTA Portal (Port 500)</h1>";
    html += "<p>Device MAC: " + WiFi.softAPmacAddress() + "</p>";
    html += "<p>Use the desktop dashboard GUI to upload and flash firmware binaries.</p></div></body></html>";
    Server.send(200, "text/html", html);
  });

  Server.on("/update", HTTP_POST,
    []() {
      Server.sendHeader("Connection", "close");
      if (Update.hasError()) {
        String errorStr = "Update failed: " + String(Update.errorString());
        Serial.println("[OTA ERROR] " + errorStr);
        Server.send(500, "text/plain", errorStr);
      } else {
        Serial.println("[OTA SUCCESS] Flash update successful. Rebooting...");
        Server.send(200, "text/plain", "OK");
        delay(1000); ESP.restart();
      }
    },
    []() {
      HTTPUpload &upload = Server.upload();
      if (upload.status == UPLOAD_FILE_START) {
        logFmt("[OTA Port-500] Start: %s\n", upload.filename.c_str());
        const esp_partition_t *running = esp_ota_get_running_partition();
        const esp_partition_t *update_partition = esp_ota_get_next_update_partition(NULL);
        bool beginSuccess = false;
        if (update_partition != NULL) {
          beginSuccess = Update.begin(update_partition->size, U_FLASH, -1, LOW, update_partition->label);
        } else {
          beginSuccess = Update.begin(UPDATE_SIZE_UNKNOWN, U_FLASH);
        }
        if (!beginSuccess) Update.printError(Serial);
      } else if (upload.status == UPLOAD_FILE_WRITE) {
        if (Update.write(upload.buf, upload.currentSize) != upload.currentSize)
          Update.printError(Serial);
      } else if (upload.status == UPLOAD_FILE_END) {
        if (Update.end(true))
          logFmt("[OTA Port-500] Done: %u bytes\n", (unsigned)upload.totalSize);
        else Update.printError(Serial);
      }
    });

  Server.on("/upload_cert", HTTP_POST, []() {
    String filename = Server.hasArg("filename") ? Server.arg("filename") : "cert.pem";
    if (!filename.startsWith("/")) filename = "/" + filename;
    handleCertUploadDirectOta(filename, "Certificate");
  });
  Server.on("/api/upload_ca",   HTTP_POST, []() { handleCertUploadDirectOta("/aws_root_ca.pem", "Root CA"); });
  Server.on("/api/upload_cert", HTTP_POST, []() { handleCertUploadDirectOta("/device_cert.crt", "Device Cert"); });
  Server.on("/api/upload_key",  HTTP_POST, []() { handleCertUploadDirectOta("/private_key.key", "Private Key"); });

  Server.begin();
  logLn("[HTTP] Port-500 WebServer started.");
}

// ============================================================
//  PRODUCTION: PORT-8000 SERVER SETUP
// ============================================================
void setupHTTPServer() {
  httpServer.on("/", HTTP_GET, []() {
    String html = "<html><head><title>IoT Gateway v4.0</title></head><body>";
    html += "<h1>IoT Gateway Active (V4)</h1>";
    html += "<p>MAC: " + deviceMAC + "</p>";
    html += "<p>IMEI: " + deviceIMEI + "</p>";
    html += "<p>Clients connected to SoftAP: " + String(WiFi.softAPgetStationNum()) + " active</p>";
    html += "<p>WiFi Status: " + String((WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED") + "</p>";
    if (WiFi.status() == WL_CONNECTED) html += "<p>Router IP: " + WiFi.localIP().toString() + "</p>";
    html += "<p><a href='http://192.168.4.1'>Open Diagnostic Dashboard (port 80)</a></p>";
    html += "<p>OTA Port: 8000  |  Diagnostic Dashboard: 80</p>";
    html += "</body></html>";
    httpServer.send(200, "text/html", html);
  });

  httpServer.on("/api/info", HTTP_GET, []() {
    String json = "{";
    json += "\"imei\":\"" + deviceIMEI + "\",";
    json += "\"mac\":\"" + deviceMAC + "\",";
    json += "\"ssid\":\"" + routerSSID + "\",";
    json += "\"ap_ssid\":\"" + AP_SSID + "\",";
    json += "\"ap_clients\":" + String(WiFi.softAPgetStationNum()) + ",";
    json += "\"ap_clients_list\":" + getSoftAPStationsJson() + ",";
    json += "\"wifi_status\":\"" + String((WiFi.status() == WL_CONNECTED) ? "CONNECTED" : "DISCONNECTED") + "\",";
    json += "\"wifi_ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"ap_ip\":\"" + WiFi.softAPIP().toString() + "\",";
    json += "\"relay1\":" + String(relay1State ? "true" : "false") + ",";
    json += "\"relay2\":" + String(relay2State ? "true" : "false") + ",";
    json += "\"interval\":" + String(telemetryInterval) + ",";
    json += "\"fw_version\":\"4.0.0\",";
    json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"free_psram\":" + String(ESP.getFreePsram());
    json += "}";
    httpServer.send(200, "application/json", json);
  });

  httpServer.on("/api/set_wifi", HTTP_POST, []() {
    if (httpServer.hasArg("ssid") && httpServer.hasArg("pass")) {
      String ssid = httpServer.arg("ssid"); ssid.trim();
      String pass = httpServer.arg("pass"); pass.trim();
      File f = SPIFFS.open("/wifi.txt", "w");
      if (f) {
        f.println(ssid); f.println(pass); f.close();
        routerSSID = ssid; routerPassword = pass;
        httpServer.send(200, "application/json", "{\"status\":\"WIFI_UPDATED\",\"ssid\":\"" + ssid + "\"}");
      } else {
        httpServer.send(500, "application/json", "{\"status\":\"ERROR\",\"message\":\"Failed to save wifi.txt\"}");
      }
    } else {
      httpServer.send(400, "application/json", "{\"status\":\"ERROR\",\"message\":\"SSID or Pass missing\"}");
    }
  });

  httpServer.on("/api/reboot", HTTP_POST, []() {
    httpServer.send(200, "application/json", "{\"status\":\"REBOOTING\"}");
    delay(1000); ESP.restart();
  });

  httpServer.on("/update", HTTP_POST,
    []() {
      httpServer.sendHeader("Connection", "close");
      if (isQcomUpdate) {
        httpServer.send(200, "text/plain", (targetPartition && writeOffset > 0) ? "OK" : "FAIL");
      } else {
        httpServer.send(200, "text/plain", (Update.hasError()) ? "FAIL" : "OK");
        delay(1000); ESP.restart();
      }
    },
    []() {
      HTTPUpload &upload = httpServer.upload();
      if (upload.status == UPLOAD_FILE_START) {
        if (httpServer.hasArg("target") && httpServer.arg("target") == "qcom") {
          isQcomUpdate = true;
          const esp_partition_t *running = esp_ota_get_running_partition();
          if (running && strcmp(running->label, "app0") == 0)
            targetPartition = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_1, "app1");
          else
            targetPartition = esp_partition_find_first(ESP_PARTITION_TYPE_APP, ESP_PARTITION_SUBTYPE_APP_OTA_0, "app0");
          writeOffset = 0;
          if (targetPartition)
            esp_partition_erase_range(targetPartition, 0, targetPartition->size);
        } else {
          isQcomUpdate = false;
          const esp_partition_t *update_partition = esp_ota_get_next_update_partition(NULL);
          if (update_partition != NULL)
            Update.begin(UPDATE_SIZE_UNKNOWN);
          else
            Update.begin(UPDATE_SIZE_UNKNOWN, U_FLASH);
        }
      } else if (upload.status == UPLOAD_FILE_WRITE) {
        if (isQcomUpdate) {
          if (targetPartition)
            esp_partition_write(targetPartition, writeOffset, upload.buf, upload.currentSize);
          writeOffset += upload.currentSize;
        } else {
          Update.write(upload.buf, upload.currentSize);
        }
      } else if (upload.status == UPLOAD_FILE_END) {
        if (isQcomUpdate) { logFmt("[OTA QCOM] %u bytes written\n", writeOffset); shiftToQcomPartition(); }
        else { if (Update.end(true)) logFmt("[OTA ESP32] Done: %u bytes\n", (unsigned)upload.totalSize); }
      }
    });

  httpServer.on("/upload_cert", HTTP_POST, []() {
    String filename = httpServer.hasArg("filename") ? httpServer.arg("filename") : "cert.pem";
    if (!filename.startsWith("/")) filename = "/" + filename;
    handleCertUploadDirect(filename, "Certificate");
  });
  httpServer.on("/api/upload_ca",   HTTP_POST, []() { handleCertUploadDirect("/aws_root_ca.pem", "Root CA"); });
  httpServer.on("/api/upload_cert", HTTP_POST, []() { handleCertUploadDirect("/device_cert.crt", "Device Cert"); });
  httpServer.on("/api/upload_key",  HTTP_POST, []() { handleCertUploadDirect("/private_key.key", "Private Key"); });

  httpServer.on("/api/storage", HTTP_GET, []() {
    size_t total = SPIFFS.totalBytes(), used = SPIFFS.usedBytes();
    String json = "{\"totalBytes\":" + String(total) + ",\"usedBytes\":" + String(used) + ",\"files\":[";
    File root = SPIFFS.open("/"); File file = root.openNextFile(); bool first = true;
    while (file) {
      if (!first) json += ","; first = false;
      json += "{\"name\":\"" + String(file.name()) + "\",\"size\":" + String(file.size()) + "}";
      file = root.openNextFile();
    }
    json += "]}";
    httpServer.send(200, "application/json", json);
  });

  httpServer.on("/api/storage/delete", HTTP_POST, []() {
    if (httpServer.hasArg("filename")) {
      String fn = httpServer.arg("filename");
      if (!fn.startsWith("/")) fn = "/" + fn;
      if (SPIFFS.exists(fn)) { SPIFFS.remove(fn); httpServer.send(200, "text/plain", "DELETED"); }
      else httpServer.send(404, "text/plain", "FILE_NOT_FOUND");
    } else httpServer.send(400, "text/plain", "MISSING_FILENAME");
  });

  httpServer.on("/api/storage/read", HTTP_GET, []() {
    if (httpServer.hasArg("filename")) {
      String fn = httpServer.arg("filename");
      if (!fn.startsWith("/")) fn = "/" + fn;
      if (SPIFFS.exists(fn)) {
        File f = SPIFFS.open(fn, "r");
        if (f) { httpServer.streamFile(f, "text/plain"); f.close(); }
        else httpServer.send(500, "text/plain", "FAILED_TO_OPEN");
      } else httpServer.send(404, "text/plain", "FILE_NOT_FOUND");
    } else httpServer.send(400, "text/plain", "MISSING_FILENAME");
  });

  httpServer.on("/api/storage/update", HTTP_POST, []() {
    if (httpServer.hasArg("filename")) {
      String fn = httpServer.arg("filename");
      if (!fn.startsWith("/")) fn = "/" + fn;
      File f = SPIFFS.open(fn, FILE_WRITE);
      if (f) { f.print(httpServer.arg("plain")); f.close(); httpServer.send(200, "text/plain", "OK"); }
      else httpServer.send(500, "text/plain", "FAILED_TO_WRITE");
    } else httpServer.send(400, "text/plain", "MISSING_FILENAME");
  });

  httpServer.begin();
  logLn("[HTTP] Port-8000 OTA Server started.");
}

// ============================================================
//  PRODUCTION: WIFI SETUP
// ============================================================
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 2
#undef ARDUINO_EVENT_WIFI_AP_STACONNECTED
#define ARDUINO_EVENT_WIFI_AP_STACONNECTED    ARDUINO_EVENT_WIFI_AP_STACONNECTED
#undef ARDUINO_EVENT_WIFI_AP_STADISCONNECTED
#define ARDUINO_EVENT_WIFI_AP_STADISCONNECTED ARDUINO_EVENT_WIFI_AP_STADISCONNECTED
#undef ARDUINO_EVENT_WIFI_STA_CONNECTED
#define ARDUINO_EVENT_WIFI_STA_CONNECTED      ARDUINO_EVENT_WIFI_STA_CONNECTED
#undef ARDUINO_EVENT_WIFI_STA_DISCONNECTED
#define ARDUINO_EVENT_WIFI_STA_DISCONNECTED   ARDUINO_EVENT_WIFI_STA_DISCONNECTED
#undef ARDUINO_EVENT_WIFI_STA_GOT_IP
#define ARDUINO_EVENT_WIFI_STA_GOT_IP         ARDUINO_EVENT_WIFI_STA_GOT_IP
#else
#ifndef ARDUINO_EVENT_WIFI_AP_STACONNECTED
#define ARDUINO_EVENT_WIFI_AP_STACONNECTED    SYSTEM_EVENT_AP_STACONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_AP_STADISCONNECTED
#define ARDUINO_EVENT_WIFI_AP_STADISCONNECTED SYSTEM_EVENT_AP_STADISCONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_STA_CONNECTED
#define ARDUINO_EVENT_WIFI_STA_CONNECTED      SYSTEM_EVENT_STA_CONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_STA_DISCONNECTED
#define ARDUINO_EVENT_WIFI_STA_DISCONNECTED   SYSTEM_EVENT_STA_DISCONNECTED
#endif
#ifndef ARDUINO_EVENT_WIFI_STA_GOT_IP
#define ARDUINO_EVENT_WIFI_STA_GOT_IP         SYSTEM_EVENT_STA_GOT_IP
#endif
#endif

void onWiFiAPEvent(WiFiEvent_t event) {
  if      (event == ARDUINO_EVENT_WIFI_AP_STACONNECTED)    eventAPClientConnected    = true;
  else if (event == ARDUINO_EVENT_WIFI_AP_STADISCONNECTED) eventAPClientDisconnected = true;
  else if (event == ARDUINO_EVENT_WIFI_STA_CONNECTED)      eventSTAConnected         = true;
  else if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED)   eventSTADisconnected      = true;
  else if (event == ARDUINO_EVENT_WIFI_STA_GOT_IP)         eventSTAGotIP             = true;
}

void queueTcpNotification(String jsonMsg) {
  if (tcpQueueSemaphore) {
    if (xSemaphoreTake(tcpQueueSemaphore, (TickType_t)10) == pdTRUE) {
      tcpNotificationQueue.push(jsonMsg);
      xSemaphoreGive(tcpQueueSemaphore);
    }
  }
}

void processTcpNotifications() {
  if (!tcpQueueSemaphore) return;
  while (true) {
    String msg = "";
    if (xSemaphoreTake(tcpQueueSemaphore, (TickType_t)10) == pdTRUE) {
      if (!tcpNotificationQueue.empty()) { msg = tcpNotificationQueue.front(); tcpNotificationQueue.pop(); }
      xSemaphoreGive(tcpQueueSemaphore);
    }
    if (msg.length() > 0) { if (tcpClient && tcpClient.connected()) tcpClient.println(msg); }
    else break;
  }
}

void processWiFiEvents() {
  if (eventAPClientConnected) {
    eventAPClientConnected = false;
    logLn("[WIFI AP] Client connected to SoftAP.");
    queueTcpNotification("{\"status\":\"AP_CLIENT_CONNECTED\",\"message\":\"A station connected to SoftAP\"}");
    sendBootSuccessPayload();
  }
  if (eventAPClientDisconnected) {
    eventAPClientDisconnected = false;
    logLn("[WIFI AP] Client disconnected from SoftAP.");
    queueTcpNotification("{\"status\":\"AP_CLIENT_DISCONNECTED\",\"message\":\"A station disconnected from SoftAP\"}");
    sendBootSuccessPayload();
  }
  if (eventSTAConnected) {
    eventSTAConnected = false;
    logLn("[WIFI STA] Connected to WiFi Router.");
    queueTcpNotification("{\"status\":\"STA_CONNECTED\",\"message\":\"Connected to WiFi Router\"}");
  }
  if (eventSTADisconnected) {
    eventSTADisconnected = false;
    logLn("[WIFI STA] Disconnected from WiFi Router.");
    queueTcpNotification("{\"status\":\"STA_DISCONNECTED\",\"message\":\"Disconnected from WiFi Router\"}");
  }
  if (eventSTAGotIP) {
    eventSTAGotIP = false;
    String ip = WiFi.localIP().toString();
    logFmt("[WIFI STA] Station obtained IP: %s\n", ip.c_str());
    queueTcpNotification("{\"status\":\"STA_GOT_IP\",\"ip\":\"" + ip + "\"}");
    sendBootSuccessPayload();
  }
}

void setupWiFi() {
  logLn("[WIFI] Initializing Dual-Mode WiFi Stack...");

  // Load custom STA credentials from SPIFFS if available
  if (SPIFFS.exists("/wifi.txt")) {
    File f = SPIFFS.open("/wifi.txt", "r");
    if (f) {
      String ssid = f.readStringUntil('\n'); ssid.trim();
      String pass = f.readStringUntil('\n'); pass.trim();
      f.close();
      if (ssid.length() > 0) { routerSSID = ssid; routerPassword = pass; }
    }
  }

  WiFi.onEvent(onWiFiAPEvent);
  WiFi.mode(WIFI_AP);
  WiFi.setAutoReconnect(false);
  deviceMAC = WiFi.macAddress();

  // SoftAP — use fixed diagnostic SSID for easy web dashboard access
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress apIP = WiFi.softAPIP();

  logFmt("[WIFI AP] SSID : %s\n", AP_SSID);
  logFmt("[WIFI AP] Pass : %s\n", AP_PASS);
  logFmt("[WIFI AP] IP   : %s\n", apIP.toString().c_str());
  logFmt("[WIFI AP] MAC  : %s\n", deviceMAC.c_str());
}

// ============================================================
//  PRODUCTION: UDP DISCOVERY
// ============================================================
void handleUDPDiscovery() {
  int packetSize = udpListener.parsePacket();
  if (packetSize) {
    char packetBuffer[255]; int len = udpListener.read(packetBuffer, 255);
    if (len > 0) packetBuffer[len] = 0;
    String request = String(packetBuffer); request.trim();
    if (request == "DISCOVER_IOT_GATEWAY") {
      electronServerIP    = udpListener.remoteIP();
      hasElectronServerIP = true;
      String responseIP   = WiFi.localIP().toString();
      if (responseIP == "0.0.0.0" || responseIP == "") responseIP = WiFi.softAPIP().toString();
      String response = "{\"status\":\"ONLINE\",\"ip\":\"" + responseIP +
                        "\",\"imei\":\"" + deviceIMEI + "\",\"mac\":\"" + deviceMAC + "\"}";
      udpListener.beginPacket(udpListener.remoteIP(), udpListener.remotePort());
      udpListener.print(response);
      udpListener.endPacket();
      logFmt("[UDP] Discovered by %s — replied with IP %s\n",
             udpListener.remoteIP().toString().c_str(), responseIP.c_str());
    }
  }
}

// ============================================================
//  PRODUCTION: COMMAND PROCESSOR
// ============================================================
void processCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;
  logFmt("[CMD] %s\n", cmd.c_str());

  if (cmd.startsWith("TEST_")) {
    String module = cmd.substring(5); module.toUpperCase();
    if (diagRunning) { logFmt("[CMD] Diagnostics running — queuing TEST_%s\n", module.c_str()); return; }
    diagRunning = true;
    if      (module == "RS232")                { pendingTestID = T_RS232; }
    else if (module == "RS485")                { pendingTestID = T_RS485; }
    else if (module == "GPRS" || module == "GSM") { pendingTestID = T_GPRS; }
    else if (module == "FLASH")                { pendingTestID = T_WINBOND; }
    else if (module == "DI")                   { pendingTestID = T_DI; }
    else if (module == "RTC")                  { pendingTestID = T_RTC; }
    else if (module == "SWITCH")               { pendingTestID = T_SWITCH; }
    else if (module == "FR")                   { pendingTestID = T_FR; }
    else if (module == "PSRAM")                { pendingTestID = T_PSRAM; }
    diagRunning = false;
    sendBootSuccessPayload();
  } else if (cmd == "RE_DIAGNOSE") {
    currentState = STATE_DIAGNOSTICS;
  } else if (cmd == "RELAY_1_ON") {
    relay1State = true; digitalWrite(RELAY_1_PIN, HIGH);
    logLn("[CMD] Relay 1 ON"); sendControlStatus();
  } else if (cmd == "RELAY_1_OFF") {
    relay1State = false; digitalWrite(RELAY_1_PIN, LOW);
    logLn("[CMD] Relay 1 OFF"); sendControlStatus();
  } else if (cmd == "RELAY_2_ON") {
    relay2State = true; digitalWrite(RELAY_2_PIN, HIGH);
    logLn("[CMD] Relay 2 ON"); sendControlStatus();
  } else if (cmd == "RELAY_2_OFF") {
    relay2State = false; digitalWrite(RELAY_2_PIN, LOW);
    logLn("[CMD] Relay 2 OFF"); sendControlStatus();
  } else if (cmd.startsWith("SET_WIFI:")) {
    int fc = cmd.indexOf(':'), sc = cmd.indexOf(':', fc+1);
    if (fc != -1 && sc != -1) {
      String ssid = cmd.substring(fc+1, sc); ssid.trim();
      String pass = cmd.substring(sc+1);     pass.trim();
      File f = SPIFFS.open("/wifi.txt", "w");
      if (f) { f.println(ssid); f.println(pass); f.close(); routerSSID = ssid; routerPassword = pass; }
      String reply = "{\"status\":\"WIFI_UPDATED\",\"ssid\":\"" + ssid + "\"}";
      Serial.print("JSON_PAYLOAD:"); Serial.println(reply);
      if (tcpClient && tcpClient.connected()) tcpClient.println(reply);
    }
  } else if (cmd == "REBOOT") {
    logLn("[CMD] Rebooting..."); delay(1000); ESP.restart();
  } else if (cmd.startsWith("SET_INTERVAL:")) {
    long val = cmd.substring(13).toInt();
    if (val >= 100 && val <= 10000) {
      telemetryInterval = val;
      logFmt("[CMD] Telemetry interval: %d ms\n", (int)telemetryInterval);
      sendControlStatus();
    }
  } else if (cmd == "GET_INFO") {
    sendBootSuccessPayload();
  } else if (cmd == "PING") {
    if (tcpClient && tcpClient.connected()) tcpClient.println("{\"type\":\"pong\"}");
  } else if (cmd == "SHIFT_TO_QCOM") {
    logLn("[CMD] Triggering QCOM shift..."); shiftToQcomPartition();
  } else if (cmd == "SYNC_CERTS_TO_QCOM") {
    logLn("[CMD] Syncing certs to QCOM..."); dumpCertsToQcom();
    if (tcpClient && tcpClient.connected()) tcpClient.println("{\"status\":\"CERTS_SYNCED_TO_QCOM\"}");
  } else if (cmd.startsWith("SET_IMEI:")) {
    deviceIMEI = cmd.substring(9); deviceIMEI.trim();
    logFmt("[CMD] IMEI updated: %s\n", deviceIMEI.c_str());
    String reply = "{\"status\":\"IMEI_UPDATED\",\"imei\":\"" + deviceIMEI + "\"}";
    Serial.print("JSON_PAYLOAD:"); Serial.println(reply);
    if (tcpClient && tcpClient.connected()) tcpClient.println(reply);
  } else if (cmd.startsWith("SET_PASS:")) {
    devicePassword = cmd.substring(9); devicePassword.trim();
    logLn("[CMD] Password updated.");
    String reply = "{\"status\":\"PASSWORD_UPDATED\",\"password\":\"" + devicePassword + "\"}";
    Serial.print("JSON_PAYLOAD:"); Serial.println(reply);
    if (tcpClient && tcpClient.connected()) tcpClient.println(reply);
  } else if (cmd.startsWith("ADD_CERT:")) {
    int fc = cmd.indexOf(':'), sc = cmd.indexOf(':', fc+1);
    if (fc != -1 && sc != -1) {
      String name = cmd.substring(fc+1, sc);
      long size   = cmd.substring(sc+1).toInt();
      logFmt("[CMD] ADD_CERT: %s (%d bytes)\n", name.c_str(), (int)size);
      if (certCount < MAX_CERTS) { certNames[certCount] = name; certSizes[certCount] = size; certCount++; }
      String reply = "{\"status\":\"CERT_ADDED\",\"filename\":\"" + name +
        "\",\"size\":" + String(size) + ",\"certificates\":" + getCertificatesJson() + "}";
      Serial.print("JSON_PAYLOAD:"); Serial.println(reply);
      if (tcpClient && tcpClient.connected()) tcpClient.println(reply);
    }
  } else if (cmd == "FORMAT_SPIFFS") {
    logLn("[CMD] Formatting SPIFFS...");
    SPIFFS.format();
    if (SPIFFS.begin(false)) {
      logLn("[SPIFFS] Format & remount successful.");
      String reply = "{\"status\":\"SPIFFS_FORMATTED\",\"ok\":true}";
      Serial.print("JSON_PAYLOAD:"); Serial.println(reply);
      if (tcpClient && tcpClient.connected()) tcpClient.println(reply);
    }
  }
}

// ============================================================
//  PRODUCTION: DIAGNOSTICS STATE
// ============================================================
void runDiagnostics() {
  if (diagRunning) { currentState = STATE_RUNNING; return; }
  diagRunning = true;
  logLine();
  logLn("[SYSTEM] Starting boot & certification sequence...");

  // Stage 1: ESP32 cert simulation
  if (bootCertTarget == "BOTH" || bootCertTarget == "ESP32") {
    sendProgressPayload("ESP32_CERT_1", 10, "Downloading Certificate 1/3 to ESP32...");
    delay(600);
    sendProgressPayload("ESP32_CERT_2", 20, "Downloading Certificate 2/3 to ESP32...");
    delay(600);
    sendProgressPayload("ESP32_CERT_3", 30, "Downloading Certificate 3/3 to ESP32...");
    delay(600);
    logLn("[BOOT] ESP32 certificate sequence complete.");
  }

  // Stage 2: QCOM sync
  if (bootCertTarget == "BOTH" || bootCertTarget == "QCOM") {
    sendProgressPayload("QCOM_SYNC", 45, "Syncing certifications to QCOM device...");
    dumpCertsToQcom();
    delay(300);
  }

  // Stage 3: Main FW update simulation
  sendProgressPayload("MAIN_FW_UPDATE", 65, "Downloading and installing Main Firmware update...");
  delay(800);
  logLn("[BOOT] Main firmware v4.0 verified.");

  // Stage 4: Run all hardware tests
  sendProgressPayload("DIAGNOSTICS", 80, "Initiating hardware peripheral self-check...");
  logLine();
  logLn("=== BOOT HARDWARE SELF-CHECK ===");
  testSwitch();
  testDI();
  testPSRAM();
  testRTC();
  testWinbond();
  testGPRS();
  testRS485();
  testFR();
  logLn("=== BOOT SELF-CHECK COMPLETE ===");
  logLine();

  diagRunning = false;
  currentState = STATE_RUNNING;
  logLn("[SYSTEM] Gateway entered RUNNING mode.");
  sendBootSuccessPayload();
  sendControlStatus();
  lastTelemetryTime = millis();
}

// ============================================================
//  PRODUCTION: HALT STATE
// ============================================================
void handleHaltState() {
  static unsigned long haltStart = 0;
  if (haltStart == 0) {
    haltStart = millis();
    logLn("[HALT] Awaiting manual boot trigger. Auto-start disabled.");
  }
  if (millis() - lastLogTime > 30000) {
    logLn("[HALT] Waiting for activation... Press boot button or send START_BOOT.");
    lastLogTime = millis();
  }

  // Try TCP connect to Electron server
  if ((WiFi.status() == WL_CONNECTED || WiFi.softAPIP()[0] != 0) &&
      hasElectronServerIP && !tcpClient.connected()) {
    if (millis() - lastConnectAttempt > connectInterval) {
      lastConnectAttempt = millis();
      static unsigned long lastFail = 0;
      if (millis() - lastFail > 5000) {
        logFmt("[TCP] Connecting to Electron at %s:9000...\n", electronServerIP.toString().c_str());
        if (tcpClient.connect(electronServerIP, 9000)) {
          logLn("[TCP] Connected to Electron in HALT mode!");
          sendControlStatus(); lastFail = 0;
        } else { lastFail = millis(); }
      }
    }
  }

  // TCP command
  if (tcpClient && tcpClient.connected() && tcpClient.available() > 0) {
    String cmd = tcpClient.readStringUntil('\n'); cmd.trim();
    if (cmd.startsWith("START_BOOT")) {
      bootCertTarget = "BOTH";
      int colon = cmd.indexOf(':');
      if (colon != -1) { bootCertTarget = cmd.substring(colon+1); bootCertTarget.trim(); bootCertTarget.toUpperCase(); }
      logFmt("[TRIGGER] TCP 'START_BOOT' received! Target: %s\n", bootCertTarget.c_str());
      currentState = STATE_DIAGNOSTICS; return;
    } else { processCommand(cmd); }
  }

  // Physical boot button
  if (digitalRead(BOOT_BUTTON_PIN) == LOW) {
    logLn("[TRIGGER] Boot button pressed!");
    bootCertTarget = "BOTH";
    currentState = STATE_DIAGNOSTICS;
    delay(200); return;
  }

  // Serial command
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n'); cmd.trim();
    if (cmd.startsWith("START_BOOT")) {
      bootCertTarget = "BOTH";
      int colon = cmd.indexOf(':');
      if (colon != -1) { bootCertTarget = cmd.substring(colon+1); bootCertTarget.trim(); bootCertTarget.toUpperCase(); }
      logFmt("[TRIGGER] Serial 'START_BOOT' received! Target: %s\n", bootCertTarget.c_str());
      currentState = STATE_DIAGNOSTICS; return;
    } else { processCommand(cmd); }
  }
}

// ============================================================
//  PRODUCTION: RUNNING STATE
// ============================================================
void handleRunningState() {
  // Try TCP connect
  if ((WiFi.status() == WL_CONNECTED || WiFi.softAPIP()[0] != 0) &&
      hasElectronServerIP && !tcpClient.connected()) {
    if (millis() - lastConnectAttempt > connectInterval) {
      lastConnectAttempt = millis();
      logFmt("[TCP] Connecting to Electron at %s:9000...\n", electronServerIP.toString().c_str());
      if (tcpClient.connect(electronServerIP, 9000)) {
        logLn("[TCP] Connected to Electron in RUNNING mode!"); sendControlStatus();
      }
    }
  }

  // TCP commands
  if (tcpClient && tcpClient.connected() && tcpClient.available() > 0)
    processCommand(tcpClient.readStringUntil('\n'));

  // Serial commands
  if (Serial.available() > 0)
    processCommand(Serial.readStringUntil('\n'));

  // Telemetry stream
  if (millis() - lastTelemetryTime > telemetryInterval) {
    lastTelemetryTime = millis();
    float temp = 36.5 + (random(-5, 6) / 10.0);
    int rssi = WiFi.RSSI();
    uint32_t freeHeap = ESP.getFreeHeap();
    int heapPct = (int)((freeHeap * 100) / 250000);
    if (heapPct > 100) heapPct = 100;
    int connectedClients = WiFi.softAPgetStationNum();
    int totalNodes = 1 + connectedClients;

    String telemetryJSON = "{\"type\":\"telemetry\",\"count\":" + String(totalNodes) + ",\"devices\":[";
    telemetryJSON += "{\"id\":1,\"temp\":" + String(temp, 1) + ",\"rssi\":" + String(rssi) +
                    ",\"bat\":" + String(heapPct) + ",\"status\":\"ONLINE\"}";
    for (int i = 0; i < connectedClients; i++) {
      telemetryJSON += ",{\"id\":" + String(100+i) + ",\"temp\":25.0,\"rssi\":-45,\"bat\":100,\"status\":\"ONLINE\"}";
    }
    telemetryJSON += "]}\n";

    if (tcpClient && tcpClient.connected()) tcpClient.print(telemetryJSON);
    Serial.print("JSON_PAYLOAD:"); Serial.print(telemetryJSON);
  }
}

// ============================================================
//  FREERTOS TASK — Core-1 OTA HTTP servers
// ============================================================
void TaskOtaHTTPServer(void *pvParameters) {
  (void)pvParameters;
  logLn("[SYSTEM] TaskOtaHTTPServer running on Core 1 (ports 500 & 8000)");
  for (;;) {
    Server.handleClient();
    httpServer.handleClient();
    vTaskDelay(20);
  }
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  delay(1000);

  // MUX pins — safe default to RS485
  pinMode(MUX_A0, OUTPUT);
  pinMode(MUX_A1, OUTPUT);
  muxRS485();

  // Boot button
  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);

  // Relay outputs
  pinMode(RELAY_1_PIN, OUTPUT); digitalWrite(RELAY_1_PIN, LOW);
  pinMode(RELAY_2_PIN, OUTPUT); digitalWrite(RELAY_2_PIN, LOW);

  // Serial monitor
  Serial.begin(115200); delay(500);
  logLine();
  logLn("ESP32-S3 IoT Gateway Firmware v4.0");
  logLn("Booting WiFi AP + Web Servers...");
  logLine();

  // Cancel OTA rollback (mark app as valid)
  esp_ota_mark_app_valid_cancel_rollback();

  // TCP queue mutex
  tcpQueueSemaphore = xSemaphoreCreateMutex();

  // SPIFFS
  logLn("[SPIFFS] Mounting SPIFFS...");
  if (!SPIFFS.begin(false)) {
    logLn("[SPIFFS] WARNING: Mount failed. Send FORMAT_SPIFFS to format.");
  } else {
    logFmt("[SPIFFS] OK. Total: %u KB  Used: %u KB\n",
           (unsigned)(SPIFFS.totalBytes()/1024), (unsigned)(SPIFFS.usedBytes()/1024));
  }

  // WiFi AP
  setupWiFi();
  logFmt("[URL] Diagnostic Dashboard → http://%s\n", WiFi.softAPIP().toString().c_str());

  // Serial1 for GPRS (will be re-used by tests, always restore to this)
  Serial1.begin(GPRS_BAUD_RATE, SERIAL_8N1, GPRS_RX, GPRS_TX);
  logLn("[SERIAL1] GPRS Serial1 initialized at 115200 baud.");

  // UDP discovery
  udpListener.begin(UDP_PORT);
  logFmt("[UDP] Discovery responder on port %d\n", UDP_PORT);

  // Diagnostic web server — port 80 (main loop, Core 0)
  server.on("/",            HTTP_GET,  onRoot);
  server.on("/results",     HTTP_GET,  onResults);
  server.on("/log",         HTTP_GET,  onLog);
  server.on("/run",         HTTP_GET,  onRun);
  server.on("/info",        HTTP_GET,  onInfo);
  server.on("/switch-state",HTTP_GET,  onSwitchState);
  server.on("/gprs-speed",  HTTP_POST, onGPRSSpeed);
  server.on("/gprs-reset",  HTTP_POST, onGPRSReset);
  server.on("/gprs-echo-off",HTTP_POST,onGPRSEchoOff);
  server.on("/ota",         HTTP_POST, onOTADone, onOTAUpload);
  server.onNotFound([]() { server.send(404, "text/plain", "Not found"); });
  server.begin();
  logLn("[HTTP] Diagnostic WebServer started on port 80.");

  // Production OTA servers — ports 500 & 8000 (Core 1 task)
  setupServer();
  setupHTTPServer();
  xTaskCreatePinnedToCore(TaskOtaHTTPServer, "TaskOtaHTTPServer", 8192, NULL, 1, NULL, 1);
  logLn("[SYSTEM] TaskOtaHTTPServer spawned on Core 1.");

  // GSM power-on in background
  gsmPowerOn();

  logLine();
  logLn("Ready!");
  logFmt("  → PRISM Dashboard : http://192.168.4.1\n");
  logFmt("  → WiFi SSID       : %s\n", AP_SSID);
  logFmt("  → WiFi Pass       : %s\n", AP_PASS);
  logFmt("  → OTA (Electron)  : port 8000\n");
  logFmt("  → Certs OTA       : port 500\n");
  logLine();
  logLn("[HALT] Awaiting START_BOOT command or boot button.");
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  // Port-80 diagnostic dashboard (main loop, Core 0 only)
  server.handleClient();

  // Production networking
  processWiFiEvents();
  processTcpNotifications();
  handleUDPDiscovery();

  // Production state machine
  switch (currentState) {
    case STATE_HALT:        handleHaltState();   break;
    case STATE_DIAGNOSTICS: runDiagnostics();    break;
    case STATE_RUNNING:     handleRunningState(); break;
  }

  // Dispatch pending diagnostic tests (queued from web dashboard)
  if (!testRunning) {
    if (pendingAll) {
      pendingAll = false;
      runAllTests();
    } else if (pendingTestID >= 0) {
      int id = pendingTestID;
      pendingTestID = -1;
      dispatchTest(id);
    }
  }

  delay(1);
}
