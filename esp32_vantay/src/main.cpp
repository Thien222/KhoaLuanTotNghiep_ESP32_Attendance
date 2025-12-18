/************************************************************
 * ESP32 Fingerprint + OLED I2C (SDA=16, SCL=17)  [AUTO MODE]
 * - KHÔNG dùng nút. Luồng auto:
 *   + Lần 1 trong ngày = IN
 *   + Lần 2 trong ngày = OUT
 *   + Lần 3 trở đi     = ĐÃ HOÀN TẤT HÔM NAY (không gửi server nữa)
 * - Chỉ mark NVS sau khi server xác nhận OK (tránh lệch).
 * - Có cooldown chống double-tap cùng ngón tay.
 * - Tự động lấy config từ backend (KHÔNG CẦN HARDCODE IP)
 * - Hardware Watchdog Timer để tự restart khi bị treo
 ************************************************************/

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WebServer.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <Preferences.h>
#include <time.h>
#include <esp_task_wdt.h>  // Hardware Watchdog Timer

// ================== Simple JSON Parser (không cần ArduinoJson) ==================
String getJsonStringValue(const String &json, const String &key)
{
  String searchKey = "\"" + key + "\"";
  int keyPos = json.indexOf(searchKey);
  if (keyPos < 0)
    return "";

  int colonPos = json.indexOf(":", keyPos);
  if (colonPos < 0)
    return "";

  int startQuote = json.indexOf("\"", colonPos);
  if (startQuote < 0)
    return "";

  int endQuote = json.indexOf("\"", startQuote + 1);
  if (endQuote < 0)
    return "";

  return json.substring(startQuote + 1, endQuote);
}

bool getJsonBoolValue(const String &json, const String &key)
{
  String searchKey = "\"" + key + "\"";
  int keyPos = json.indexOf(searchKey);
  if (keyPos < 0)
    return false;

  int colonPos = json.indexOf(":", keyPos);
  if (colonPos < 0)
    return false;

  int valueStart = colonPos + 1;
  while (valueStart < json.length() && (json[valueStart] == ' ' || json[valueStart] == '\t'))
  {
    valueStart++;
  }

  if (valueStart < json.length() && json.substring(valueStart, valueStart + 4) == "true")
  {
    return true;
  }
  return false;
}

String getJsonNestedValue(const String &json, const String &parentKey, const String &childKey)
{
  String searchParent = "\"" + parentKey + "\"";
  int parentPos = json.indexOf(searchParent);
  if (parentPos < 0)
    return "";

  int braceStart = json.indexOf("{", parentPos);
  if (braceStart < 0)
    return "";

  int braceEnd = braceStart;
  int braceCount = 1;
  for (int i = braceStart + 1; i < json.length() && braceCount > 0; i++)
  {
    if (json[i] == '{')
      braceCount++;
    else if (json[i] == '}')
      braceCount--;
    if (braceCount == 0)
    {
      braceEnd = i;
      break;
    }
  }

  String nestedJson = json.substring(braceStart, braceEnd + 1);
  return getJsonStringValue(nestedJson, childKey);
}

// ====== OLED ======
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_ADDR 0x3C
#define I2C_SDA 16
#define I2C_SCL 17
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ====== BUZZER (active, on/off) ======
#define BUZZER_PIN 15
inline void buzzOn() { digitalWrite(BUZZER_PIN, HIGH); }
inline void buzzOff() { digitalWrite(BUZZER_PIN, LOW); }
static void beepOnce(int onMs)
{
  buzzOn();
  delay(onMs);
  buzzOff();
}
static void beepTick()
{
  beepOnce(180);
  delay(80);
  beepOnce(180);
}
static void beepPrompt() { beepOnce(80); }
static void beepSuccess() { beepTick(); }
static void beepSuccessEnroll()
{
  beepOnce(200);
  delay(80);
  beepOnce(200);
  delay(80);
  beepOnce(200);
}
static void beepShort() { /*beepOnce(50);*/ }
static void beepError() { /*beepOnce(300);*/ }

// ===== OLED helpers =====
String __last1, __last2, __last3;
void oledInit()
{
  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR))
  {
    Serial.println("✗ OLED init fail");
    return;
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.display();
}

void oledPrintCenter(const String &l1, const String &l2 = "", const String &l3 = "")
{
  if (l1 == __last1 && l2 == __last2 && l3 == __last3)
    return;
  __last1 = l1;
  __last2 = l2;
  __last3 = l3;
  display.clearDisplay();
  int16_t x, y;
  uint16_t w, h;
  auto draw = [&](int row, const String &s)
  {
    display.getTextBounds(s, 0, 0, &x, &y, &w, &h);
    int cx = (SCREEN_WIDTH - w) / 2;
    if (cx < 0)
      cx = 0;
    display.setCursor(cx, 14 * row);
    display.print(s);
  };
  draw(0, l1);
  draw(1, l2);
  draw(2, l3);
  display.display();
}

// ================== WI-FI (đa mạng) ==================
WiFiMulti wifiMulti;
struct WifiCred
{
  const char *ssid;
  const char *pass;
};
WifiCred WIFI_LIST[] = {
    {"hihi", "abcdef12"},
    {"Phuc Tran L2", "06111219"},
    {"Comie Lau ", "88888888"},
    // Thêm WiFi khác nếu cần:
    // {"WiFi_2", "password2"},
    // {"WiFi_3", "password3"}
};
const int WIFI_COUNT = sizeof(WIFI_LIST) / sizeof(WIFI_LIST[0]);

// ====== Clear WiFi credentials từ NVS ======
void clearWiFiCredentials()
{
  Serial.println("Clearing WiFi credentials from NVS...");
  WiFi.disconnect(true); // true = erase stored credentials
  delay(500);
  WiFi.mode(WIFI_OFF);
  delay(100);
  WiFi.mode(WIFI_STA);
  Serial.println("✓ WiFi credentials cleared");
}

bool connectWiFiMulti(unsigned long overallTimeoutMs = 30000)
{
  // Option: Tự động clear WiFi credentials nếu không kết nối được
  // Set true để tự động clear WiFi credentials cũ nếu kết nối thất bại
  const bool AUTO_CLEAR_WIFI_ON_FAIL = false; // Đổi thành true nếu cần

  // Clear WiFi credentials cũ nếu được yêu cầu
  if (AUTO_CLEAR_WIFI_ON_FAIL)
  {
    Serial.println("⚠️ AUTO_CLEAR_WIFI_ON_FAIL is enabled");
    clearWiFiCredentials();
  }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false); // QUAN TRỌNG: Không lưu WiFi credentials vào flash (tránh xung đột với credentials cũ)
  WiFi.disconnect();      // Disconnect trước khi scan
  delay(500);             // Tăng delay để đảm bảo disconnect hoàn tất

  // === DEBUG: Scan WiFi networks ===
  Serial.println("\n=== Scanning WiFi networks ===");
  oledPrintCenter("Dang quet Wi-Fi", "Vui long cho...");
  int n = WiFi.scanNetworks();
  Serial.printf("Found %d networks:\n", n);
  bool foundTarget = false;

  for (int i = 0; i < n; i++)
  {
    String ssid = WiFi.SSID(i);
    int rssi = WiFi.RSSI(i);
    bool encrypted = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
    Serial.printf("  [%d] SSID: '%s' (RSSI: %d dBm, %s)\n",
                  i, ssid.c_str(), rssi, encrypted ? "Encrypted" : "Open");

    // So sánh với danh sách WiFi cần kết nối
    for (int j = 0; j < WIFI_COUNT; j++)
    {
      String targetSSID = String(WIFI_LIST[j].ssid);
      // So sánh không phân biệt hoa thường và trim spaces
      ssid.trim();
      targetSSID.trim();
      if (ssid.equalsIgnoreCase(targetSSID))
      {
        foundTarget = true;
        Serial.printf("    ✓ MATCH FOUND: '%s' (target: '%s')\n",
                      ssid.c_str(), targetSSID.c_str());
      }
    }
  }
  Serial.println("=== End scan ===\n");

  if (!foundTarget && n > 0)
  {
    Serial.println("⚠️ WARNING: Target SSID not found in scan list!");
    Serial.println("Available SSIDs shown above. Check if SSID name is correct.");
    Serial.println("Target SSIDs:");
    for (int i = 0; i < WIFI_COUNT; i++)
    {
      Serial.printf("  - '%s'\n", WIFI_LIST[i].ssid);
    }
    oledPrintCenter("SSID not found", "Check Serial", "for list");
    delay(2000);
  }
  else if (n == 0)
  {
    Serial.println("⚠️ WARNING: No networks found!");
    oledPrintCenter("No WiFi found", "Check range", "");
    delay(2000);
  }

  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);

  // Clear và add lại vào WiFiMulti
  wifiMulti = WiFiMulti(); // Reset WiFiMulti

  Serial.println("Adding WiFi networks to WiFiMulti:");
  for (int i = 0; i < WIFI_COUNT; ++i)
  {
    wifiMulti.addAP(WIFI_LIST[i].ssid, WIFI_LIST[i].pass);
    Serial.printf("  [%d] Added: '%s'\n", i, WIFI_LIST[i].ssid);
  }

  Serial.println("→ Connecting Wi-Fi (multi)...");
  oledPrintCenter("Dang ket noi Wi-Fi", "(multi)...");

  unsigned long t0 = millis();
  int lastStatus = -1;
  while (millis() - t0 < overallTimeoutMs)
  {
    // wifiMulti.run() trả về WL_CONNECTED nếu kết nối thành công
    uint8_t result = wifiMulti.run();
    wl_status_t status = WiFi.status();

    // Print status mỗi 3 giây để debug
    if ((millis() - t0) % 3000 < 500 && (int)status != lastStatus)
    {
      Serial.printf("  Status: %d", (int)status);
      switch (status)
      {
      case WL_IDLE_STATUS:
        Serial.println(" (IDLE)");
        break;
      case WL_NO_SSID_AVAIL:
        Serial.println(" (NO SSID)");
        break;
      case WL_SCAN_COMPLETED:
        Serial.println(" (SCAN COMPLETED)");
        break;
      case WL_CONNECTED:
        Serial.println(" (CONNECTED)");
        break;
      case WL_CONNECT_FAILED:
        Serial.println(" (CONNECT FAILED)");
        break;
      case WL_CONNECTION_LOST:
        Serial.println(" (CONNECTION LOST)");
        break;
      case WL_DISCONNECTED:
        Serial.println(" (DISCONNECTED)");
        break;
      default:
        Serial.println();
        break;
      }
      lastStatus = (int)status;
    }

    // Kiểm tra cả result và status
    if (result == WL_CONNECTED || status == WL_CONNECTED)
    {
      String ip = WiFi.localIP().toString();
      Serial.printf("\n✓ Wi-Fi: '%s'  IP=%s  RSSI=%d\n",
                    WiFi.SSID().c_str(), ip.c_str(), WiFi.RSSI());
      oledPrintCenter("Wi-Fi OK", WiFi.SSID(), "IP: " + ip);
      return true;
    }

    delay(500);
    if ((millis() - t0) % 2000 < 500)
    {
      Serial.print(".");
    }
  }

  Serial.printf("\n✗ Wi-Fi failed (status=%d)\n", WiFi.status());
  oledPrintCenter("Wi-Fi FAIL", "Thu fallback...");

  // === FALLBACK: Thử connect trực tiếp với WiFi.begin() ===
  Serial.println("\n=== Trying direct WiFi.begin() as fallback ===");
  for (int i = 0; i < WIFI_COUNT; i++)
  {
    Serial.printf("\nTrying direct connect: '%s'\n", WIFI_LIST[i].ssid);
    WiFi.disconnect();
    delay(100);
    WiFi.begin(WIFI_LIST[i].ssid, WIFI_LIST[i].pass);

    unsigned long fallbackStart = millis();
    int attempts = 0;
    while (millis() - fallbackStart < 15000)
    { // 15 seconds timeout
      wl_status_t status = WiFi.status();
      if (status == WL_CONNECTED)
      {
        String ip = WiFi.localIP().toString();
        Serial.printf("✓ Direct connect OK: '%s'  IP=%s  RSSI=%d\n",
                      WiFi.SSID().c_str(), ip.c_str(), WiFi.RSSI());
        oledPrintCenter("Wi-Fi OK (direct)", WiFi.SSID(), "IP: " + ip);
        return true;
      }
      else if (status == WL_CONNECT_FAILED || status == WL_NO_SSID_AVAIL)
      {
        Serial.printf("  ✗ Connect failed (status=%d)\n", status);
        break;
      }
      delay(500);
      if (attempts++ % 4 == 0)
      {
        Serial.print(".");
      }
    }
    Serial.println("  Timeout");
  }

  Serial.println("\n✗ All connection methods failed!");
  Serial.println("\n💡 TROUBLESHOOTING:");
  Serial.println("   1. Check if SSID and password are correct in code");
  Serial.println("   2. Check if WiFi router is in range");
  Serial.println("   3. Check Serial output above for available WiFi networks");
  Serial.println("   4. If SSID not found, check if WiFi name has special characters");
  Serial.println("   5. Clear WiFi credentials: GET http://<ESP32_IP>/wipe-wifi");
  Serial.println("   6. Or manually clear: Set AUTO_CLEAR_WIFI_ON_FAIL = true in code");
  Serial.println("   7. Restart ESP32 after clearing WiFi credentials");

  oledPrintCenter("Wi-Fi FAIL", "Check Serial", "or /wipe-wifi");
  return false;
}

// ================== NTP time (UTC+7) ==================
bool timeReady = false;
void syncTimeOnce()
{
  if (timeReady)
    return;
  configTime(7 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  for (int i = 0; i < 20; ++i)
  {
    time_t now = time(nullptr);
    if (now > 1700000000)
    {
      timeReady = true;
      break;
    }
    delay(500);
  }
  Serial.println(timeReady ? "✓ NTP time synced" : "✗ NTP not ready");
}

String fmtDate(time_t t)
{
  struct tm tm;
  localtime_r(&t, &tm);
  char buf[16];
  strftime(buf, sizeof(buf), "%d/%m/%Y", &tm);
  return String(buf);
}

String fmtTime(time_t t)
{
  struct tm tm;
  localtime_r(&t, &tm);
  char buf[16];
  strftime(buf, sizeof(buf), "%H:%M:%S", &tm);
  return String(buf);
}

String todayKey()
{
  time_t t = time(nullptr);
  struct tm tm;
  localtime_r(&t, &tm);
  char buf[9];
  strftime(buf, sizeof(buf), "%Y%m%d", &tm);
  return String(buf);
}

/**
 * Kiểm tra thời gian chấm công hợp lệ (NEW - Timeline v2.0)
 * Check-in: 7h00 - 24h00
 * Check-out: Luôn OK (server sẽ xử lý logic phức tạp)
 * @param isCheckIn: true = check-in, false = check-out
 * @return: 0 = OK, 1 = Too early (< 7h)
 */
int validateAttendanceTime(bool isCheckIn)
{
  if (!timeReady)
  {
    return 0; // Nếu chưa sync time, cho phép (để không block)
  }

  time_t now = time(nullptr);
  struct tm tm;
  localtime_r(&now, &tm);

  int hour = tm.tm_hour;

  if (isCheckIn)
  {
    // Check-in: Chỉ cho phép từ 7h00 trở đi
    // Nếu < 7h: quá sớm
    if (hour < 7)
    {
      return 1; // Too early
    }
    return 0; // OK
  }
  else
  {
    // Check-out: Luôn OK, server sẽ xử lý logic
    // (về sớm < 16h56, sau 24h tính tròn 23h59, OT từ 19h)
    return 0;
  }
}

// ================== BACKEND URL (PRODUCTION - Render.com) ==================
// ⚠️ LƯU Ý: Render free tier sẽ ngủ sau 15 phút không hoạt động
// Request đầu tiên sau khi ngủ có thể mất 30-60 giây
const char *DEFAULT_SERVER_URL = "https://khoaluantotnghiep-esp32-attendance.onrender.com/api"; // Production Render
String serverUrl = DEFAULT_SERVER_URL;
String fingerprintEndpoint = serverUrl + "/fingerprint";
String attendanceEndpoint = serverUrl + "/attendance/fingerprint"; // Changed from /attendance/add

// ================== WEBSERVER + NVS ==================
WebServer webServer(80);
Preferences prefs;

void sendCORS()
{
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  webServer.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions()
{
  sendCORS();
  webServer.send(204);
}

// ====== Helper: Force HTTPS for Render URLs ======
String forceHttpsForRender(const String &url) {
  // If URL contains "render.com" or "onrender.com", force HTTPS
  if (url.indexOf("render.com") > 0 || url.indexOf("onrender.com") > 0) {
    if (url.startsWith("http://")) {
      String fixed = "https://" + url.substring(7);
      Serial.println("⚠️ Converted HTTP to HTTPS for Render: " + fixed);
      return fixed;
    }
  }
  return url;
}

// ====== Load/Save Server URL từ NVS ======
void loadServerUrl()
{
  prefs.begin("app", false);
  String loadedUrl = prefs.getString("serverUrl", DEFAULT_SERVER_URL);
  serverUrl = forceHttpsForRender(loadedUrl); // Force HTTPS for Render
  fingerprintEndpoint = serverUrl + "/fingerprint";
  attendanceEndpoint = serverUrl + "/attendance/fingerprint";
  prefs.end();
  Serial.printf("Loaded serverUrl from NVS: %s\n", serverUrl.c_str());
}

void saveServerUrl(const String &url)
{
  String fixedUrl = forceHttpsForRender(url); // Force HTTPS for Render
  prefs.begin("app", false);
  prefs.putString("serverUrl", fixedUrl);
  prefs.end();
  serverUrl = fixedUrl;
  fingerprintEndpoint = serverUrl + "/fingerprint";
  attendanceEndpoint = serverUrl + "/attendance/fingerprint";
  Serial.printf("✓ Saved serverUrl to NVS: %s\n", serverUrl.c_str());
}

// ====== Tự động lấy config từ backend ======
bool getServerConfigFromBackend()
{
  String esp32IP = WiFi.localIP().toString();

  Serial.println("\n==========================================");
  Serial.println("🔍 Getting server config from backend...");
  Serial.println("ESP32 IP: " + esp32IP);
  Serial.println("==========================================");

  // ========== THỬ RENDER PRODUCTION TRƯỚC ==========
  Serial.println("\n🌐 Trying Render production server first...");
  String renderUrl = "https://khoaluantotnghiep-esp32-attendance.onrender.com/esp32-discovery";
  Serial.println("URL: " + renderUrl);
  oledPrintCenter("Connecting...", "Render Server", "Please wait...");
  
  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // Skip certificate validation
  secureClient.setTimeout(30000); // 30 seconds timeout (Render có thể cần wake up)
  
  HTTPClient https;
  if (https.begin(secureClient, renderUrl)) {
    https.setTimeout(30000); // 30 seconds
    
    Serial.println("  Connecting to Render (may take 30-60s if sleeping)...");
    unsigned long startTime = millis();
    int httpCode = https.GET();
    unsigned long elapsed = millis() - startTime;
    
    if (httpCode == 200) {
      String payload = https.getString();
      Serial.println("✅ Render OK (" + String(elapsed) + "ms)");
      Serial.println("Response: " + payload.substring(0, 150));
      
      if (getJsonBoolValue(payload, "success")) {
        String discoveredUrl = getJsonStringValue(payload, "serverUrl");
        if (discoveredUrl.length() > 0) {
          https.end();
          
          if (discoveredUrl != serverUrl) {
            saveServerUrl(discoveredUrl);
          }
          
          String fpEndpoint = getJsonStringValue(payload, "fingerprintEndpoint");
          String attEndpoint = getJsonStringValue(payload, "attendanceEndpoint");
          if (fpEndpoint.length() > 0) fingerprintEndpoint = fpEndpoint;
          if (attEndpoint.length() > 0) attendanceEndpoint = attEndpoint;
          
          Serial.println("\n==========================================");
          Serial.println("✅ CONNECTED TO RENDER PRODUCTION!");
          Serial.println("==========================================");
          Serial.println("Server URL: " + serverUrl);
          Serial.println("Fingerprint: " + fingerprintEndpoint);
          Serial.println("Attendance: " + attendanceEndpoint);
          Serial.println("==========================================");
          oledPrintCenter("Render OK!", "Production", "Ready");
          return true;
        }
      }
    } else {
      Serial.println("❌ Render HTTP " + String(httpCode) + " (" + String(elapsed) + "ms)");
      if (httpCode < 0) {
        Serial.println("   Error: " + https.errorToString(httpCode));
      }
    }
    https.end();
  }
  
  // ========== FALLBACK: THỬ LOCAL NETWORK ==========
  Serial.println("\n🔍 Falling back to local network discovery...");
  
  // Lấy subnet hiện tại (ví dụ: 192.168.2.x)
  IPAddress localIP = WiFi.localIP();
  String subnet = String(localIP[0]) + "." + String(localIP[1]) + "." + String(localIP[2]);
  Serial.println("Subnet: " + subnet + ".x");

  // Danh sách server IPs để thử
  String serverIPs[] = {
      subnet + ".28",  // Server có thể ở .28 trên cùng subnet
      subnet + ".100", 
      subnet + ".1",   
      subnet + ".2",   
      "172.20.2.28",   
      "172.20.10.7",   
      "192.168.1.100", 
      "192.168.0.100"  
  };

  HTTPClient http;
  for (int i = 0; i < 8; i++)
  {
    String discoveryUrl = "http://" + serverIPs[i] + ":3000/esp32-discovery";
    Serial.print("  [" + String(i + 1) + "] " + serverIPs[i] + ":3000 ... ");

    http.begin(discoveryUrl);
    http.setTimeout(2000);
    http.setConnectTimeout(2000);

    unsigned long startTime = millis();
    int httpCode = http.GET();
    unsigned long elapsed = millis() - startTime;

    if (httpCode == 200)
    {
      String payload = http.getString();
      Serial.println("✅ OK (" + String(elapsed) + "ms)");

      if (getJsonBoolValue(payload, "success"))
      {
        String discoveredUrl = getJsonStringValue(payload, "serverUrl");
        if (discoveredUrl.length() > 0)
        {
          http.end();

          if (discoveredUrl != serverUrl)
          {
            saveServerUrl(discoveredUrl);
          }

          String fpEndpoint = getJsonStringValue(payload, "fingerprintEndpoint");
          String attEndpoint = getJsonStringValue(payload, "attendanceEndpoint");
          if (fpEndpoint.length() > 0) fingerprintEndpoint = fpEndpoint;
          if (attEndpoint.length() > 0) attendanceEndpoint = attEndpoint;

          Serial.println("\n==========================================");
          Serial.println("✅ CONNECTED TO LOCAL SERVER!");
          Serial.println("==========================================");
          Serial.println("Server URL: " + serverUrl);
          Serial.println("==========================================");
          oledPrintCenter("Local OK!", serverIPs[i], "Ready");
          return true;
        }
      }
    }
    else if (httpCode > 0)
    {
      Serial.println("❌ HTTP " + String(httpCode));
    }
    else
    {
      Serial.println("❌ " + http.errorToString(httpCode));
    }
    http.end();
    delay(50);
  }

  // Không tìm thấy server - dùng default (Render)
  Serial.println("\n⚠️ No server found. Using default: " + serverUrl);
  oledPrintCenter("Using default", "Render server", "");
  return false;
}

volatile bool needReRegister = false;

// ====== Handle /config endpoint (để update từ web) ======
void handleConfig()
{
  sendCORS();
  if (!webServer.hasArg("url"))
  {
    // Return current config (manual JSON construction)
    String response = "{\"serverUrl\":\"" + serverUrl + "\",\"fingerprintEndpoint\":\"" + fingerprintEndpoint + "\",\"status\":\"ok\"}";
    webServer.send(200, "application/json", response);
    return;
  }

  String url = webServer.arg("url");
  if (!url.startsWith("http"))
  {
    webServer.send(400, "application/json", "{\"error\":\"url must start with http/https\"}");
    return;
  }

  // Extract serverUrl from fingerprintEndpoint
  int apiPos = url.indexOf("/api");
  if (apiPos > 0)
  {
    String newServerUrl = url.substring(0, apiPos + 4);
    if (newServerUrl != serverUrl)
    {
      saveServerUrl(newServerUrl);
      fingerprintEndpoint = url;
      attendanceEndpoint = newServerUrl + "/attendance/add";
      needReRegister = true;
      Serial.printf("✓ New serverUrl saved via /config: %s\n", serverUrl.c_str());
      oledPrintCenter("Config updated", "Via /config", serverUrl);
    }
  }

  webServer.send(200, "application/json", String("{\"serverUrl\":\"") + serverUrl + "\",\"fingerprintEndpoint\":\"" + fingerprintEndpoint + "\"}");
}

// ================== UART + CẢM BIẾN (TX=26, RX=25) ==================
static const int FP_RX_PIN = 25;
static const int FP_TX_PIN = 26;
HardwareSerial fingerSerial(2);
Adafruit_Fingerprint finger(&fingerSerial);

// ================== Base64 ==================
static const char b64_alphabet[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789+/";

String base64_encode(const uint8_t *data, size_t len)
{
  String out;
  int val = 0, valb = -6;
  for (size_t i = 0; i < len; i++)
  {
    val = (val << 8) + data[i];
    valb += 8;
    while (valb >= 0)
    {
      out += b64_alphabet[(val >> valb) & 0x3F];
      valb -= 6;
    }
  }
  if (valb > -6)
    out += b64_alphabet[((val << 8) >> (valb + 8)) & 0x3F];
  while (out.length() % 4)
    out += '=';
  return out;
}

// ================== HTTP helper ==================
// Static clients - MUST be properly cleaned up to avoid memory leaks!
static WiFiClientSecure secureClient;
static WiFiClient plainClient;

// Cleanup function to free SSL memory
void cleanupSSLClient() {
  secureClient.stop();
  delay(10); // Give time for cleanup
}

bool httpPostJson(const String &url, const String &body, int &outCode, String &outResp)
{
  // Free memory before starting new connection
  cleanupSSLClient();
  delay(50); // Extra delay for memory cleanup
  
  // Print free heap for debugging
  Serial.printf("Free heap before request: %d bytes\n", ESP.getFreeHeap());
  
  HTTPClient http;
  bool okBegin = false;
  
  Serial.printf("POST to: %s\n", url.c_str());
  
  if (url.startsWith("https://"))
  {
    // Check if we have enough memory for SSL (needs ~40KB)
    if (ESP.getFreeHeap() < 50000) {
      Serial.println("⚠️ Low memory! Forcing garbage collection...");
      cleanupSSLClient();
      delay(100);
      Serial.printf("Free heap after cleanup: %d bytes\n", ESP.getFreeHeap());
    }
    
    secureClient.setInsecure(); // Skip certificate verification
    secureClient.setTimeout(30000); // 30 seconds timeout (reduced from 60)
    okBegin = http.begin(secureClient, url);
    Serial.println("Using HTTPS (WiFiClientSecure)");
  }
  else
  {
    plainClient.setTimeout(15000);
    okBegin = http.begin(plainClient, url);
    Serial.println("Using HTTP (WiFiClient)");
  }
  
  if (!okBegin) {
    Serial.println("http.begin() failed!");
    cleanupSSLClient(); // Cleanup on failure
    return false;
  }
  
  http.setReuse(false); // Don't reuse connection - helps with memory
  http.setTimeout(30000); // 30 seconds timeout
  http.addHeader("Content-Type", "application/json");
  
  Serial.printf("Sending body: %s\n", body.c_str());
  outCode = http.POST(body);
  outResp = http.getString();
  
  if (outCode <= 0)
    Serial.printf("HTTP error %d: %s\n", outCode, http.errorToString(outCode).c_str());
  else
    Serial.printf("HTTP %d, resp len=%d\n", outCode, outResp.length());
  
  http.end();
  
  // IMPORTANT: Cleanup SSL connection after use to free memory
  cleanupSSLClient();
  Serial.printf("Free heap after request: %d bytes\n", ESP.getFreeHeap());
  
  return true;
}

String baseFromServerUrl(const String &s)
{
  int p = s.indexOf("/api");
  if (p > 0)
    return s.substring(0, p);
  return s;
}

bool isPrivateLanUrl(const String &url)
{
  if (!url.startsWith("http://"))
    return false;
  int p = url.indexOf("://");
  String host = url.substring(p + 3);
  int c = host.indexOf('/');
  if (c >= 0)
    host = host.substring(0, c);
  int col = host.indexOf(':');
  if (col >= 0)
    host = host.substring(0, col);
  return host.startsWith("192.168.") || host.startsWith("10.") ||
         host.startsWith("172.16.") || host.startsWith("172.17.") ||
         host.startsWith("172.18.") || host.startsWith("172.19.") ||
         host.startsWith("172.2") || host.startsWith("172.3");
}

// ================== Self-register vào server ==================
unsigned long nextRegisterMs = 0;
bool registeredOk = false;

bool registerEsp32ToServer()
{
  String base = baseFromServerUrl(serverUrl);
  String url = base + "/esp32-register";
  String body = String("{\"ip\":\"") + WiFi.localIP().toString() + "\"}";
  int code = 0;
  String resp;

  Serial.println("\n==========================================");
  Serial.println("📝 Registering ESP32 to server...");
  Serial.println("ESP32 IP: " + WiFi.localIP().toString());
  Serial.println("Server URL: " + serverUrl);
  Serial.println("Register URL: " + url);
  Serial.println("==========================================");

  bool ok = httpPostJson(url, body, code, resp);
  Serial.printf("register => %d\n", code);

  if (code > 0)
  {
    Serial.println("Response: " + resp.substring(0, 200));
  }

  // Parse response to get server URL if different
  if (ok && code >= 200 && code < 300)
  {
    // Parse JSON without ArduinoJson library
    if (getJsonBoolValue(resp, "success"))
    {
      String newServerUrl = getJsonNestedValue(resp, "data", "serverUrl");
      if (newServerUrl.length() > 0 && newServerUrl != serverUrl)
      {
        saveServerUrl(newServerUrl);
        String newFingerprintEndpoint = getJsonNestedValue(resp, "data", "fingerprintEndpoint");
        String newAttendanceEndpoint = getJsonNestedValue(resp, "data", "attendanceEndpoint");
        if (newFingerprintEndpoint.length() > 0)
          fingerprintEndpoint = newFingerprintEndpoint;
        if (newAttendanceEndpoint.length() > 0)
          attendanceEndpoint = newAttendanceEndpoint;
        Serial.println("✅ Updated config from registration response");
      }
    }
  }

  return ok && code >= 200 && code < 300;
}

void tryRegisterIfLan()
{
  if (WiFi.status() != WL_CONNECTED)
    return;
  if (!isPrivateLanUrl(serverUrl))
    return;
  if (millis() < nextRegisterMs && !needReRegister)
    return;

  oledPrintCenter("Dang dang ky", "ESP32 → server...");
  registeredOk = registerEsp32ToServer();
  needReRegister = false;
  nextRegisterMs = millis() + (registeredOk ? 60000UL : 5000UL);
  oledPrintCenter(registeredOk ? "Dang ky OK" : "Dang ky FAIL", baseFromServerUrl(serverUrl));
}

// ================== tiện ích cảm biến ==================
const char *fpErr(uint8_t code)
{
  switch (code)
  {
  case FINGERPRINT_OK:
    return "OK";
  case FINGERPRINT_PACKETRECIEVEERR:
    return "PACKET";
  case FINGERPRINT_NOFINGER:
    return "NOFINGER";
  case FINGERPRINT_IMAGEFAIL:
    return "IMAGEFAIL";
  case FINGERPRINT_IMAGEMESS:
    return "IMAGEMESS";
  case FINGERPRINT_FEATUREFAIL:
    return "FEATUREFAIL";
  case FINGERPRINT_INVALIDIMAGE:
    return "INVALIDIMAGE";
  case FINGERPRINT_ENROLLMISMATCH:
    return "ENROLLMISMATCH";
  case FINGERPRINT_BADLOCATION:
    return "BADLOCATION";
  case FINGERPRINT_FLASHERR:
    return "FLASHERR";
  case FINGERPRINT_NOTFOUND:
    return "NOTFOUND";
  case FINGERPRINT_DELETE:
    return "DELETE_OK";
  default:
    return "UNKNOWN";
  }
}

bool slotOccupied(uint16_t id) { return finger.loadModel(id) == FINGERPRINT_OK; }

bool deleteFingerprint(uint16_t id)
{
  uint8_t r = finger.deleteModel(id);
  Serial.printf("deleteModel(%u) => %u (%s)\n", id, r, fpErr(r));
  return r == FINGERPRINT_OK;
}

// ================== Gửi template ==================
bool sendTemplate(uint8_t id)
{
  if (finger.loadModel(id) != FINGERPRINT_OK)
  {
    Serial.println("  ✗ loadModel");
    beepError();
    return false;
  }
  if (finger.getModel() != FINGERPRINT_OK)
  {
    Serial.println("  ✗ getModel");
    beepError();
    return false;
  }
  uint8_t buf[1024];
  int len = 0;
  unsigned long t0 = millis();
  while (millis() - t0 < 3000 && len < (int)sizeof(buf))
  {
    if (fingerSerial.available())
      buf[len++] = fingerSerial.read();
    else
      delay(2);
  }
  if (len == 0)
  {
    Serial.println("  ✗ empty template");
    return false;
  }
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("  ✗ Wi-Fi not connected");
    beepError();
    return false;
  }
  String b64 = base64_encode(buf, len);
  Serial.printf("template bytes read: %d (b64 len=%d)\n", len, b64.length());
  String body = "{\"fingerId\":" + String(id) + ",\"template\":\"" + b64 + "\"}";
  int code = 0;
  String resp;
  bool begun = httpPostJson(fingerprintEndpoint, body, code, resp);
  if (!begun)
  {
    Serial.println("  ✗ http.begin");
    beepError();
    return false;
  }
  bool ok = (code >= 200 && code < 300);
  Serial.printf("  → POST %s => %d\n", fingerprintEndpoint.c_str(), code);
  if (!ok)
    Serial.println(resp);
  return ok;
}

// ===== Gửi điểm danh về server (AUTO/IN/OUT) =====
bool sendAttendance(uint16_t id, const char *action, int &codeOut, String &respOut)
{
  if (WiFi.status() != WL_CONNECTED)
    return false;
  String body = String("{\"fingerId\":") + id + ",\"action\":\"" + action + "\"}";
  bool okBegin = httpPostJson(attendanceEndpoint, body, codeOut, respOut);
  Serial.printf("POST attendance(%s) => %d, resp=%s\n", action, codeOut, respOut.c_str());
  return okBegin && codeOut >= 200 && codeOut < 300;
}

bool sendAttendance(uint16_t id, const char *action)
{
  int code = 0;
  String resp;
  return sendAttendance(id, action, code, resp);
}

// ================== Enroll ==================
bool waitFinger(uint16_t timeoutMs)
{
  unsigned long t0 = millis();
  while (millis() - t0 < timeoutMs)
  {
    if (finger.getImage() == FINGERPRINT_OK)
      return true;
    delay(80);
  }
  return false;
}

bool enrollFingerprint(uint8_t id)
{
  if (slotOccupied(id))
  {
    Serial.printf("ID #%u dang co mau -> xoa truoc\n", id);
    if (!deleteFingerprint(id))
    {
      Serial.println("✗ Khong the xoa slot cu -> huy enroll");
      oledPrintCenter("ENROLL FAIL", "Khong xoa duoc ID cu");
      return false;
    }
  }
  Serial.printf("→ Enroll ID #%u\n", id);
  oledPrintCenter("ENROLL ID #" + String(id), "Dat ngon tay lan 1");
  beepPrompt();
  if (!waitFinger(10000))
  {
    Serial.println("  ✗ Timeout 1");
    oledPrintCenter("ENROLL FAIL", "Timeout buoc 1");
    beepError();
    return false;
  }
  uint8_t r = finger.image2Tz(1);
  if (r != FINGERPRINT_OK)
  {
    Serial.printf("  ✗ image2Tz(1): %s\n", fpErr(r));
    oledPrintCenter("ENROLL FAIL", "image2Tz(1)");
    beepError();
    return false;
  }
  oledPrintCenter("Nhat tay ra", "Roi dat lai...");
  unsigned long t = millis();
  while (finger.getImage() != FINGERPRINT_NOFINGER && millis() - t < 5000)
    delay(50);
  oledPrintCenter("ENROLL ID #" + String(id), "Dat ngon tay lan 2");
  beepPrompt();
  if (!waitFinger(10000))
  {
    Serial.println("  ✗ Timeout 2");
    oledPrintCenter("ENROLL FAIL", "Timeout buoc 2");
    beepError();
    return false;
  }
  r = finger.image2Tz(2);
  if (r != FINGERPRINT_OK)
  {
    Serial.printf("  ✗ image2Tz(2): %s\n", fpErr(r));
    oledPrintCenter("ENROLL FAIL", "image2Tz(2)");
    beepError();
    return false;
  }
  r = finger.createModel();
  if (r != FINGERPRINT_OK)
  {
    Serial.printf("  ✗ createModel: %s\n", fpErr(r));
    oledPrintCenter("ENROLL FAIL", "createModel");
    beepError();
    return false;
  }
  r = finger.storeModel(id);
  Serial.printf("  storeModel(%u) => %u (%s)\n", id, r, fpErr(r));
  if (r != FINGERPRINT_OK)
  {
    oledPrintCenter("ENROLL FAIL", String("store=") + fpErr(r));
    return false;
  }
  Serial.println("  ✓ Model stored");
  beepSuccessEnroll();
  oledPrintCenter("ENROLL OK", "Dang gui server...");
  if (!sendTemplate(id))
  {
    Serial.println("  ✗ HTTP error");
    oledPrintCenter("ENROLL OK", "Gui server FAIL");
    beepError();
    return false;
  }
  oledPrintCenter("ENROLL HOAN TAT", "ID #" + String(id));
  return true;
}

// ================== HTTP endpoints (ESP32) ==================
void handleEnroll()
{
  sendCORS();
  if (!webServer.hasArg("id"))
  {
    webServer.send(400, "application/json", "{\"error\":\"Missing id\"}");
    return;
  }
  uint16_t id = webServer.arg("id").toInt();
  if (id < 1 || id > 127)
  {
    webServer.send(400, "application/json", "{\"error\":\"id must be 1-127\"}");
    return;
  }
  if (enrollFingerprint(id))
    webServer.send(200, "application/json", "{\"message\":\"Quet thanh cong!\",\"id\":" + String(id) + "}");
  else
    webServer.send(500, "application/json", "{\"message\":\"Quet khong thanh cong!\"}");
}

void handleHealth()
{
  sendCORS();
  // Manual JSON construction
  String response = "{\"ok\":true,\"ip\":\"" + WiFi.localIP().toString() +
                    "\",\"serverUrl\":\"" + serverUrl +
                    "\",\"fingerprintEndpoint\":\"" + fingerprintEndpoint + "\"}";
  webServer.send(200, "application/json", response);
}

void handleDelete()
{
  sendCORS();
  if (!webServer.hasArg("id"))
  {
    webServer.send(400, "application/json", "{\"error\":\"Missing id\"}");
    return;
  }
  uint16_t id = webServer.arg("id").toInt();
  uint8_t r = finger.deleteModel(id);
  String msg = String("{\"id\":") + id + ",\"code\":" + r + ",\"desc\":\"" + fpErr(r) + "\"}";
  int http = (r == FINGERPRINT_OK) ? 200 : 500;
  webServer.send(http, "application/json", msg);
}

void handleRoot()
{
  sendCORS();
  String ip = WiFi.localIP().toString();
  String html =
      "<html><body style='font-family:monospace'>"
      "<h3>ESP32 Fingerprint (AUTO)</h3>"
      "<p>IP ESP32: " +
      ip + "</p>"
           "<p>Server URL: " +
      serverUrl + "</p>"
                  "<p>Fingerprint Endpoint: " +
      fingerprintEndpoint + "</p>"
                            "<ul>"
                            "<li>GET /healthz</li>"
                            "<li>GET /config?url=http%3A%2F%2F&lt;SERVER_IP&gt;%3A3000%2Fapi%2Ffingerprint</li>"
                            "<li>GET /enroll?id=&lt;so_id&gt;</li>"
                            "<li>GET /delete?id=&lt;so_id&gt;</li>"
                            "<li>GET /wipe-local  (xoa cache diem danh NVS)</li>"
                            "<li>GET /wipe-all    (xoa tat ca mau + cache)</li>"
                            "<li>GET /wipe-wifi   (xoa WiFi credentials, restart ESP32)</li>"
                            "</ul>"
                            "</body></html>";
  webServer.send(200, "text/html", html);
}

void handleFavicon()
{
  sendCORS();
  webServer.send(204);
}

void handleNotFound()
{
  sendCORS();
  String msg = String("{\"error\":\"not found\",\"path\":\"") + webServer.uri() + "\"}";
  webServer.send(404, "application/json", msg);
}

// ==== XÓA TOÀN BỘ MẪU TRONG CẢM BIẾN + DỌN NVS ====
void wipeNvsAttendance()
{
  prefs.begin("att", false);
  prefs.clear();
  prefs.end();
}

void handleWipeLocal()
{
  sendCORS();
  wipeNvsAttendance();
  webServer.send(200, "application/json", "{\"ok\":true,\"wipe\":\"att\"}");
  oledPrintCenter("XOA CACHE OK", "att cleared");
  beepTick();
}

void handleWipeAll()
{
  sendCORS();
  uint8_t r = finger.emptyDatabase();
  bool okSensor = (r == FINGERPRINT_OK);
  wipeNvsAttendance();
  String msg = String("{\"okSensor\":") + (okSensor ? "true" : "false") +
               ",\"code\":" + r + ",\"desc\":\"" + fpErr(r) + "\"}";
  webServer.send(okSensor ? 200 : 500, "application/json", msg);
  oledPrintCenter(okSensor ? "XOA TAT CA OK" : "XOA TAT CA FAIL");
  if (okSensor)
    beepTick();
  else
    beepError();
}

void handleWipeWiFi()
{
  sendCORS();
  clearWiFiCredentials();
  webServer.send(200, "application/json", "{\"ok\":true,\"wipe\":\"wifi\",\"message\":\"WiFi credentials cleared. ESP32 will restart.\"}");
  oledPrintCenter("XOA WiFi OK", "Restarting...");
  beepTick();
  delay(2000);
  ESP.restart(); // Restart để áp dụng thay đổi
}

// ====== Điểm danh: NVS helpers ======
bool alreadyCheckedToday(uint16_t id)
{
  String key = "a_" + String(id);
  String today = todayKey();
  prefs.begin("att", true);
  String last = prefs.isKey(key.c_str()) ? prefs.getString(key.c_str()) : "";
  prefs.end();
  return (last == today);
}

void markCheckedToday(uint16_t id)
{
  String key = "a_" + String(id);
  String today = todayKey();
  prefs.begin("att", false);
  prefs.putString(key.c_str(), today);
  prefs.end();
}

bool alreadyCheckedOutToday(uint16_t id)
{
  String key = "b_" + String(id);
  String today = todayKey();
  prefs.begin("att", true);
  String last = prefs.isKey(key.c_str()) ? prefs.getString(key.c_str()) : "";
  prefs.end();
  return (last == today);
}

void markCheckedOutToday(uint16_t id)
{
  String key = "b_" + String(id);
  String today = todayKey();
  prefs.begin("att", false);
  prefs.putString(key.c_str(), today);
  prefs.end();
}

// ----- AUTO attendance guards -----
#define COOLDOWN_MS 3000
static uint16_t lastScanId = 0;
static unsigned long lastScanAt = 0;

// ================== SETUP / LOOP ==================
void setup()
{
  Serial.begin(115200);
  delay(100);
  Serial.println("=== ESP32 Fingerprint (LAN + OLED) AUTO ===");

  oledInit();
  pinMode(BUZZER_PIN, OUTPUT);
  buzzOff();

  // ====== KHỞI TẠO CẢM BIẾN VÂN TAY TRƯỚC ======
  // (Trước khi kết nối WiFi/HTTPS để tránh vấn đề RAM/timeout)
  uint32_t BAUDS[] = {57600, 115200, 38400, 19200, 9600};
  bool sensorOk = false;
  
  oledPrintCenter("Kiem tra sensor...", "", "");
  Serial.println("Initializing fingerprint sensor...");
  
  for (uint8_t i = 0; i < sizeof(BAUDS) / sizeof(BAUDS[0]) && !sensorOk; i++)
  {
    fingerSerial.begin(BAUDS[i], SERIAL_8N1, FP_RX_PIN, FP_TX_PIN);
    finger.begin(BAUDS[i]);
    delay(150);
    for (int k = 0; k < 3 && !sensorOk; k++)
    {
      if (finger.verifyPassword())
      {
        Serial.printf("✓ Sensor ready @ %lu bps (RX=%d,TX=%d)\n", BAUDS[i], FP_RX_PIN, FP_TX_PIN);
        sensorOk = true;
      }
      else
        delay(150);
    }
  }

  if (!sensorOk)
  {
    Serial.println("✗ Sensor not found");
    oledPrintCenter("Sensor NOT FOUND", "Kiem tra RX/TX/nguon");
    while (true)
      delay(1000);
  }

  oledPrintCenter("Sensor OK!", "Ket noi WiFi...", "");
  delay(500);

  // Load server URL from NVS
  loadServerUrl();
  Serial.printf("Current serverUrl: %s\n", serverUrl.c_str());

  if (!connectWiFiMulti(30000))
    while (true)
      delay(1000);

  syncTimeOnce();

  // ====== Lấy config từ backend (SAU KHI sensor đã OK) ======
  oledPrintCenter("Dang lay config", "tu backend...");
  getServerConfigFromBackend();
  delay(1000);

  nextRegisterMs = millis() + 1000;

  // Web server
  webServer.on("/enroll", HTTP_GET, handleEnroll);
  webServer.on("/enroll", HTTP_OPTIONS, handleOptions);
  webServer.on("/delete", HTTP_GET, handleDelete);
  webServer.on("/delete", HTTP_OPTIONS, handleOptions);
  webServer.on("/config", HTTP_GET, handleConfig);
  webServer.on("/config", HTTP_OPTIONS, handleOptions);
  webServer.on("/healthz", HTTP_GET, handleHealth);
  webServer.on("/", HTTP_GET, handleRoot);
  webServer.on("/favicon.ico", HTTP_GET, handleFavicon);
  webServer.on("/wipe-local", HTTP_GET, handleWipeLocal);
  webServer.on("/wipe-all", HTTP_GET, handleWipeAll);
  webServer.on("/wipe-wifi", HTTP_GET, handleWipeWiFi);
  webServer.on("/wipe-wifi", HTTP_OPTIONS, handleOptions);
  webServer.onNotFound(handleNotFound);
  webServer.begin();

  // ====== HARDWARE WATCHDOG TIMER ======
  // Nếu loop() không chạy trong 30 giây, ESP32 sẽ tự restart
  Serial.println("🐕 Setting up Hardware Watchdog Timer (30s)...");
  esp_task_wdt_init(30, true); // 30 second timeout, panic on timeout
  esp_task_wdt_add(NULL);      // Add current task to watchdog
  Serial.println("✅ Watchdog enabled - ESP32 will auto-restart if stuck");

  Serial.printf("🆓 Free heap after setup: %d bytes\n", ESP.getFreeHeap());
  
  oledPrintCenter("Dat ngon tay de", "DIEM DANH (AUTO)", "1=IN, 2=OUT");
}

// ==================== COMMAND POLLING SYSTEM ====================
// Poll server for pending commands and execute them

// Forward declaration
void processCommandPayload(const String &payload);

void reportCommandCompletion(const String &commandId, int fingerprintId, bool success, const String &result)
{
  String url = serverUrl + "/esp32/commands/complete";
  String body = "{\"commandId\":\"" + commandId + "\",\"fingerprintId\":" + String(fingerprintId) + 
                ",\"success\":" + (success ? "true" : "false") + 
                ",\"result\":\"" + result + "\"}";
  
  int code = 0;
  String resp;
  httpPostJson(url, body, code, resp);
  Serial.printf("📤 Reported command completion: %s, code=%d\n", success ? "SUCCESS" : "FAILED", code);
}

void pollAndExecuteCommands()
{
  if (WiFi.status() != WL_CONNECTED) return;

  // Build poll URL
  String pollUrl = serverUrl + "/esp32/commands/poll";
  
  HTTPClient http;
  bool beginSuccess = false;

  // --- FIX MEMORY LEAK: Dùng biến cục bộ (Stack) thay vì new (Heap) ---
  // Memory sẽ tự động được giải phóng khi function kết thúc
  if (pollUrl.startsWith("https://")) {
    WiFiClientSecure client;   // Stack allocation - tự động cleanup
    client.setInsecure();      // Bỏ qua check SSL
    client.setTimeout(10000);
    beginSuccess = http.begin(client, pollUrl);
    
    if (!beginSuccess) {
      Serial.println("❌ Poll: HTTPS begin failed");
      return;
    }
    
    http.setTimeout(10000);
    int httpCode = http.GET();
    
    if (httpCode != 200) {
      if (httpCode > 0) {
        Serial.printf("Poll commands: HTTP %d\n", httpCode);
      }
      http.end();
      return;
    }
    
    String payload = http.getString();
    http.end();
    
    // Process payload (moved inside scope for HTTPS)
    processCommandPayload(payload);
    
  } else {
    WiFiClient client;         // Stack allocation - tự động cleanup
    client.setTimeout(5000);
    beginSuccess = http.begin(client, pollUrl);
    
    if (!beginSuccess) {
      Serial.println("❌ Poll: HTTP begin failed");
      return;
    }
    
    http.setTimeout(10000);
    int httpCode = http.GET();
    
    if (httpCode != 200) {
      if (httpCode > 0) {
        Serial.printf("Poll commands: HTTP %d\n", httpCode);
      }
      http.end();
      return;
    }
    
    String payload = http.getString();
    http.end();
    
    // Process payload
    processCommandPayload(payload);
  }
}

// Helper function to process command payload
void processCommandPayload(const String &payload)
{
  // Parse response
  if (!getJsonBoolValue(payload, "hasCommand")) {
    return; // No pending commands
  }
  
  String commandId = getJsonStringValue(payload, "commandId");
  String command = getJsonStringValue(payload, "command");
  int fingerprintId = 0;
  
  // Parse fingerprintId
  int fpIdx = payload.indexOf("\"fingerprintId\":");
  if (fpIdx >= 0) {
    int start = fpIdx + 16;
    String fpStr = "";
    while (start < (int)payload.length() && (isdigit(payload[start]) || payload[start] == ' ')) {
      if (isdigit(payload[start])) fpStr += payload[start];
      start++;
    }
    fingerprintId = fpStr.toInt();
  }
  
  Serial.printf("\n📥 Received command: %s for ID %d\n", command.c_str(), fingerprintId);
  Serial.printf("   CommandId: %s\n", commandId.c_str());
  
  if (command == "enroll" && fingerprintId > 0) {
    oledPrintCenter("ENROLL COMMAND", "ID #" + String(fingerprintId), "Dat ngon tay...");
    beepPrompt();
    delay(500);
    
    // Execute enrollment
    bool success = enrollFingerprint(fingerprintId);
    
    // Report completion back to server
    reportCommandCompletion(commandId, fingerprintId, success, success ? "Enrollment successful" : "Enrollment failed");
    
    if (success) {
      oledPrintCenter("ENROLL OK!", "ID #" + String(fingerprintId), "Da gui server");
      beepSuccessEnroll();
    } else {
      oledPrintCenter("ENROLL FAIL", "ID #" + String(fingerprintId), "Thu lai sau");
      beepError();
    }
    
    delay(2000);
  }
  else if (command == "delete" && fingerprintId > 0) {
    oledPrintCenter("DELETE COMMAND", "ID #" + String(fingerprintId), "Dang xu ly...");
    
    bool success = deleteFingerprint(fingerprintId);
    reportCommandCompletion(commandId, fingerprintId, success, success ? "Delete successful" : "Delete failed");
    
    delay(1000);
  }
}
void loop()
{
  // ====== WATCHDOG RESET - Phải gọi mỗi vòng loop để tránh restart ======
  esp_task_wdt_reset();
  
  // ====== WIFI RECONNECT - Tự động kết nối lại nếu mất WiFi ======
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 10000) { // Check mỗi 10 giây
    lastWiFiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ WiFi disconnected! Reconnecting...");
      oledPrintCenter("WiFi mat ket noi", "Dang ket noi lai...");
      
      // Cố gắng kết nối lại
      WiFi.disconnect();
      delay(100);
      if (!connectWiFiMulti(15000)) {
        Serial.println("❌ WiFi reconnect failed. Will retry...");
        oledPrintCenter("WiFi FAIL", "Thu lai sau 10s");
      } else {
        Serial.println("✅ WiFi reconnected!");
        oledPrintCenter("WiFi OK!", WiFi.localIP().toString());
        delay(1000);
      }
    }
  }
  
  // ====== MEMORY MONITOR - Log và cảnh báo nếu memory thấp ======
  static unsigned long lastMemCheck = 0;
  if (millis() - lastMemCheck > 10000) { // Check mỗi 10 giây để dễ debug
    lastMemCheck = millis();
    uint32_t freeHeap = ESP.getFreeHeap();
    Serial.printf(">>> Free Heap: %u bytes\n", freeHeap);
    
    // Nếu memory quá thấp, cleanup và cảnh báo
    if (freeHeap < 30000) {
      Serial.println("⚠️ LOW MEMORY! Cleaning up...");
      cleanupSSLClient();
      delay(100);
      Serial.printf("🆓 Free heap after cleanup: %u bytes\n", ESP.getFreeHeap());
      
      // Nếu vẫn thấp, restart ESP32
      if (ESP.getFreeHeap() < 20000) {
        Serial.println("🔄 Memory critical! Restarting ESP32...");
        oledPrintCenter("MEMORY LOW", "Dang khoi dong lai...");
        delay(2000);
        ESP.restart();
      }
    }
  }
  
  webServer.handleClient();
  tryRegisterIfLan();

  // Nhắc nhở màn hình trong khi rảnh
  static unsigned long lastUi = 0;
  if (millis() - lastUi > 2000)
  {
    oledPrintCenter("Dat ngon tay de", "DIEM DANH (AUTO)", "1=IN, 2=OUT");
    lastUi = millis();
  }

  // ========== POLL COMMANDS FROM SERVER (every 3 seconds) ==========
  static unsigned long lastCommandPoll = 0;
  if (millis() - lastCommandPoll > 3000)
  {
    lastCommandPoll = millis();
    
    // Chỉ poll nếu WiFi connected để tránh stuck
    if (WiFi.status() == WL_CONNECTED) {
      pollAndExecuteCommands();
    }
  }

  // Định kỳ check config mới (mỗi 5 phút)
  static unsigned long lastConfigCheck = 0;
  if (millis() - lastConfigCheck > 300000)
  { // 5 minutes
    Serial.println("\n🔄 Periodic config check...");
    if (WiFi.status() == WL_CONNECTED) {
      getServerConfigFromBackend();
    }
    lastConfigCheck = millis();
  }

  // IDENTIFY (AUTO)
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)
  {
    delay(80);
    return;
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK)
  {
    oledPrintCenter("Anh khong ro", "Thu lai nhe");  // Khong dau
    delay(200);
    return;
  }

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)
  {
    if (p == FINGERPRINT_NOTFOUND)
    {
      oledPrintCenter("KHONG TIM THAY", "Hay ENROLL lai");
      beepError();
      delay(600);
    }
    else
    {
      delay(100);
    }
    return;
  }

  // Có ID
  uint16_t id = finger.fingerID;
  unsigned long nowms = millis();

  // Cooldown chống double-tap cùng ngón
  if (id == lastScanId && (nowms - lastScanAt) < COOLDOWN_MS)
  {
    delay(200);
    return;
  }

  lastScanId = id;
  lastScanAt = nowms;

  time_t now = time(nullptr);
  String sTime = timeReady ? fmtTime(now) : "--:--:--";
  String sDate = timeReady ? fmtDate(now) : "--/--/----";

  bool hasIn = alreadyCheckedToday(id);
  bool hasOut = alreadyCheckedOutToday(id);

  // Nếu đã hoàn tất trong ngày → chỉ báo, không gửi server
  if (hasIn && hasOut)
  {
    oledPrintCenter("DA HOAN TAT", "HOM NAY ROI", sTime + "  " + sDate);
    beepShort();
    delay(900);
    return;
  }

  // Quyết định action auto theo NVS local
  const char *action = "auto"; // luôn auto; server quyết định in/out

  // *** REMOVED CLIENT-SIDE TIME VALIDATION ***
  // ESP32 không validate time nữa - để server xử lý hoàn toàn
  // Server sẽ dùng Time Machine (virtual time) để validate
  // Điều này cho phép test với thời gian ảo từ UI

  // Gửi server
  int code = 0;
  String resp;
  bool ok = sendAttendance(id, action, code, resp);

  // Phân tích phản hồi đơn giản bằng contains
  auto contains = [&](const char *needle)
  { return resp.indexOf(needle) >= 0; };

  // Xử lý các trường hợp đặc biệt trước (kể cả khi code 400/404/403/500)
  // Vì server có thể trả về các code này với thông tin hữu ích

  // [NEW] Xử lý DELETE_FINGER command - Ghost Fingerprint Fix
  // Khi server trả về command: DELETE_FINGER, nghĩa là ID này không tồn tại trong DB
  // -> Xóa luôn khỏi cảm biến để tránh lỗi lần sau
  if (contains("\"command\":\"DELETE_FINGER\""))
  {
    // Parse ID từ response
    int idIdx = resp.indexOf("\"id\":");
    uint16_t deleteId = id; // Default là ID vừa quét
    if (idIdx >= 0)
    {
      int start = idIdx + 5;
      int end = start;
      while (end < (int)resp.length() && (isdigit(resp[end])))
        end++;
      if (end > start)
      {
        deleteId = resp.substring(start, end).toInt();
      }
    }

    Serial.printf("⚠️ GHOST FINGERPRINT: Deleting ID #%u from sensor...\n", deleteId);
    oledPrintCenter("XOA VAN TAY", "ID #" + String(deleteId), "Khong co trong he thong");  // Khong dau

    // Xóa khỏi cảm biến
    if (deleteFingerprint(deleteId))
    {
      Serial.printf("✓ Deleted ID #%u from sensor\n", deleteId);
      oledPrintCenter("DA XOA VAN TAY", "ID #" + String(deleteId), "Lien he Admin");  // Khong dau
      beepError();
    }
    else
    {
      Serial.printf("✗ Failed to delete ID #%u\n", deleteId);
      oledPrintCenter("XOA THAT BAI", "ID #" + String(deleteId), "Thu lai");  // Khong dau
      beepError();
    }
    delay(2000);
    return;
  }

  // [NEW] Xử lý blocked từ server (ngoài giờ làm việc)
  if (contains("\"what\":\"blocked\""))
  {
    String msg = getJsonStringValue(resp, "message");
    String subMsg = getJsonStringValue(resp, "sub_message");
    if (msg.length() == 0)
      msg = "Ngoai gio lam";  // Khong dau
    if (subMsg.length() == 0)
      subMsg = "";
    oledPrintCenter(msg, subMsg, sTime + "  " + sDate);
    beepShort();
    delay(1500);
    return;
  }

  // [NEW] Xử lý lỗi 404 - Employee not found (legacy)
  if (code == 404 && contains("Employee not found"))
  {
    int msgIdx = resp.indexOf("\"message\":\"");
    String errorMsg = "NV khong ton tai";
    if (msgIdx >= 0)
    {
      int start = msgIdx + 11;
      int end = resp.indexOf("\"", start);
      if (end > start)
      {
        String fullMsg = resp.substring(start, end);
        if (fullMsg.indexOf("fingerprint ID") >= 0)
          errorMsg = "Chua enroll van tay";  // Khong dau
      }
    }
    oledPrintCenter("LOI", errorMsg, sTime + "  " + sDate);
    beepError();
    delay(1500);
    return;
  }

  // [NEW] Xử lý lỗi 403 - Employee not enrolled
  if (code == 403 && (contains("not enrolled") || contains("enroll-required")))
  {
    oledPrintCenter("CHUA ENROLL", "Can enroll van tay", sTime + "  " + sDate);  // Khong dau
    beepError();
    delay(1500);
    return;
  }

  // [NEW] Xử lý lỗi 500 - Server error (validation error, etc.)
  if (code == 500)
  {
    int msgIdx = resp.indexOf("\"message\":\"");
    String errorMsg = "LOI SERVER";
    if (msgIdx >= 0)
    {
      int start = msgIdx + 11;
      int end = resp.indexOf("\"", start);
      if (end > start)
      {
        String fullMsg = resp.substring(start, end);
        if (fullMsg.indexOf("ValidationError") >= 0)
          errorMsg = "LOI DU LIEU";
        else if (fullMsg.length() < 20)
          errorMsg = fullMsg;
      }
    }
    oledPrintCenter(errorMsg, "Thu lai nhe", sTime + "  " + sDate);  // Khong dau
    beepError();
    delay(1500);
    return;
  }

  if (contains("\"needInFirst\":true"))
  {
    oledPrintCenter("CHUA DIEM DANH", "Khong the KET THUC", sTime + "  " + sDate);  // Khong dau
    beepShort();
    delay(900);
    return;
  }

  // [UPDATED] Xử lý too-early từ server (fallback nếu ESP32 validation miss)
  if (contains("\"what\":\"too-early\"") || contains("\"what\":\"tooEarly\""))
  {
    // Hiển thị thông báo rõ ràng
    oledPrintCenter("CHUA TOI GIO", "Cham cong tu 7h00", sTime + "  " + sDate);  // Khong dau
    beepShort();
    delay(1500);
    return;
  }

  if (contains("\"what\":\"ignored\""))
  {
    oledPrintCenter("THAO TAC QUA NHANH", "Cho vai giay...", sTime + "  " + sDate);  // Khong dau
    beepShort();
    delay(900);
    return;
  }

  if (contains("\"what\":\"error\""))
  {
    // Parse error message nếu có
    int msgIdx = resp.indexOf("\"message\":\"");
    String errorMsg = "";
    if (msgIdx >= 0)
    {
      int start = msgIdx + 11;
      int end = resp.indexOf("\"", start);
      if (end > start)
        errorMsg = resp.substring(start, end);
    }
    if (errorMsg.length() > 0 && errorMsg.length() < 20)
    {
      oledPrintCenter("LOI", errorMsg, sTime + "  " + sDate);
    }
    else
    {
      oledPrintCenter("LOI SERVER", "Thu lai nhe", sTime + "  " + sDate);  // Khong dau
    }
    beepError();
    delay(900);
    return;
  }

  // Nếu không phải lỗi đặc biệt và code không phải 200-299 → lỗi kết nối/server
  if (!ok)
  {
    // Chỉ hiển thị "GUI SERVER FAIL" nếu thực sự là lỗi kết nối hoặc code 500 (đã xử lý ở trên)
    if (code == 0)
    {
      oledPrintCenter("GUI SERVER FAIL", "Thu lai nhe", sTime + "  " + sDate);  // Khong dau
      beepError();
      delay(900);
      return;
    }
    // Code 400/404/403/500 đã xử lý ở trên, còn lại là lỗi khác
    oledPrintCenter("LOI", "Code: " + String(code), sTime + "  " + sDate);
    beepError();
    delay(900);
    return;
  }

  if (contains("\"what\":\"in\"") || contains("\"what\":\"in-exists\""))
  {
    // Đã check-in (mới hoặc tồn tại) -> mark IN local
    if (!hasIn)
      markCheckedToday(id);

    // Parse message và sub_message từ server response (NEW ESP32 Protocol)
    String line1 = getJsonStringValue(resp, "message");
    String line2 = getJsonStringValue(resp, "sub_message");

    // Fallback nếu không có message mới
    if (line1.length() == 0)
    {
      line1 = contains("\"in-exists\"") ? "DA DIEM DANH" : "DIEM DANH OK";
    }
    if (line2.length() == 0)
    {
      line2 = "ID #" + String(id);

      // Kiểm tra có thông tin trễ không (legacy support)
      int lateIdx = resp.indexOf("\"lateMinutes\":");
      if (lateIdx >= 0)
      {
        int start = lateIdx + 14;
        int end = start;
        while (end < (int)resp.length() && (isdigit(resp[end]) || resp[end] == '.'))
          end++;
        if (end > start)
        {
          int lateMin = resp.substring(start, end).toInt();
          if (lateMin >= 120)
          {
            line2 = "Tre >= 2h - Mat cong";  // Khong dau (Mat = Mat, cong = cong)
          }
          else if (lateMin > 0)
          {
            line2 = "Tre " + String(lateMin) + "p";
          }
        }
      }
    }

    oledPrintCenter(line1, line2, sTime + "  " + sDate);
    beepSuccess();
    delay(1200);
    return;
  }

  if (contains("\"what\":\"out\""))
  {
    // Đã check-out
    if (!hasIn)
      markCheckedToday(id);
    if (!hasOut)
      markCheckedOutToday(id);

    // Parse message và sub_message từ server response (NEW ESP32 Protocol)
    String line1 = getJsonStringValue(resp, "message");
    String line2 = getJsonStringValue(resp, "sub_message");

    // Fallback nếu không có message mới
    if (line1.length() == 0)
    {
      line1 = "KET THUC CA LAM";
    }
    if (line2.length() == 0)
    {
      line2 = "Hen gap lai";  // Khong dau

      // Kiểm tra có thông tin OT không (legacy support)
      int otIdx = resp.indexOf("\"overtimeHours\":");
      if (otIdx >= 0)
      {
        int start = otIdx + 16;
        int end = start;
        while (end < (int)resp.length() && (isdigit(resp[end]) || resp[end] == '.'))
          end++;
        if (end > start)
        {
          float otHours = resp.substring(start, end).toFloat();
          if (otHours > 0)
          {
            int otH = (int)otHours;
            line2 = "OT: " + String(otH) + "h";

            // Thêm tiền OT nếu có
            int otSalaryIdx = resp.indexOf("\"otSalary\":");
            if (otSalaryIdx >= 0)
            {
              int sStart = otSalaryIdx + 11;
              int sEnd = sStart;
              while (sEnd < (int)resp.length() && (isdigit(resp[sEnd])))
                sEnd++;
              if (sEnd > sStart)
              {
                int otSalary = resp.substring(sStart, sEnd).toInt();
                if (otSalary > 0)
                {
                  line2 += " - +" + String(otSalary / 1000) + "k";
                }
              }
            }
          }
        }
      }
    }

    oledPrintCenter(line1, line2, sTime + "  " + sDate);
    beepSuccess();
    delay(1200);
    return;
  }

  if (contains("\"what\":\"done\""))
  {
    // Server nói đã xong trong ngày
    markCheckedToday(id);
    markCheckedOutToday(id);
    oledPrintCenter("DA HOAN TAT", "HOM NAY ROI", sTime + "  " + sDate);
    beepShort();
    delay(900);
    return;
  }

  if (contains("\"tooSoon\":true"))
  {
    int idx = resp.indexOf("\"wait\":");
    String waitStr = "";
    if (idx >= 0)
    {
      int j = idx + 7;
      while (j < (int)resp.length() && isspace(resp[j]))
        j++;
      while (j < (int)resp.length() && isDigit(resp[j]))
      {
        waitStr += resp[j];
        j++;
      }
    }
    String line2 = "Cho them " + (waitStr.length() ? waitStr : String("vai")) + "s";  // Khong dau
    oledPrintCenter("QUET KET THUC QUA SOM", line2, sTime + "  " + sDate);  // Khong dau
    beepShort();
    delay(900);
    return;
  }

  // Các trường hợp khác
  oledPrintCenter("DA GHI NHAN", "ID #" + String(id), sTime + "  " + sDate);
  beepShort();
  delay(800);
}
