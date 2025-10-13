# ESP32 Code Fixes for Fingerprint Attendance

## Vấn đề hiện tại:
1. **Lỗi search vân tay**: `fingerFastSearch/search => 23 (UNKNOWN)`
2. **ESP32 gửi request sai endpoint**: Đang gửi đến `/api/attendance/add` thay vì `/api/fingerprint`

## Các sửa đổi cần thiết trong code ESP32:

### 1. Sửa endpoint gửi attendance
**Tìm và thay đổi trong code ESP32:**

```cpp
// TÌM DÒNG NÀY:
String url = base + "/api/attendance/add";

// THAY THÀNH:
String url = base + "/api/fingerprint";
```

### 2. Sửa format gửi data
**Tìm và thay đổi trong code ESP32:**

```cpp
// TÌM DÒNG NÀY:
String body = String("{\"fingerId\":") + id + ",\"action\":\"" + action + "\"}";

// THAY THÀNH:
String body = String("{\"fingerId\":") + id + ",\"action\":\"" + action + "\"}";
```

### 3. Thêm debug logging
**Thêm vào đầu hàm `sendAttendance`:**

```cpp
bool sendAttendance(uint16_t id, const char *action, int &codeOut, String &respOut)
{
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  String base = baseFromServerUrl(serverUrl);
  String url = base + "/api/fingerprint";  // Sửa endpoint
  String body = String("{\"fingerId\":") + id + ",\"action\":\"" + action + "\"}";
  
  Serial.printf("Sending to: %s\n", url.c_str());
  Serial.printf("Body: %s\n", body.c_str());
  
  bool okBegin = httpPostJson(url, body, codeOut, respOut);
  Serial.printf("POST attendance(%s) => %d, resp=%s\n", action, codeOut, respOut.c_str());
  return okBegin && codeOut >= 200 && codeOut < 300;
}
```

### 4. Sửa lỗi search vân tay
**Thêm vào hàm `loop()` trước khi search:**

```cpp
void loop()
{
  webServer.handleClient();
  tryRegisterIfLan();

  // Thêm delay để cảm biến ổn định
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < 100) {
    delay(10);
    return;
  }
  lastCheck = millis();

  // IDENTIFY (AUTO)
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) {
    delay(80);
    return;
  }

  Serial.println("Finger detected, processing...");
  
  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.printf("image2Tz failed: %d (%s)\n", p, fpErr(p));
    oledPrintCenter("Anh khong ro", "Thu lai nhe");
    delay(200);
    return;
  }

  // Thử fast search trước
  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK) {
    Serial.printf("Fast search failed: %d (%s), trying normal search\n", p, fpErr(p));
    
    // Cập nhật templateCount
    if (finger.getTemplateCount() == FINGERPRINT_OK) {
      Serial.printf("Templates on sensor: %u\n", finger.templateCount);
      if (finger.templateCount > 0) {
        p = finger.fingerSearch();
        Serial.printf("Normal search result: %d (%s)\n", p, fpErr(p));
      } else {
        Serial.println("No templates found on sensor!");
        oledPrintCenter("CHUA ENROLL", "Hay enroll truoc");
        beepError();
        delay(1000);
        return;
      }
    } else {
      Serial.println("Cannot get template count!");
    }
  }
  
  // ... rest of the code
}
```

### 5. Thêm kiểm tra kết nối cảm biến
**Thêm vào hàm `setup()` sau khi init cảm biến:**

```cpp
// Kiểm tra cảm biến có hoạt động không
if (finger.getParameters() == FINGERPRINT_OK) {
  Serial.printf("Sensor params: status=0x%02X, systemID=0x%04X, cap=%u\n",
                finger.status_reg, finger.system_id, finger.capacity);
} else {
  Serial.println("Cannot get sensor parameters!");
}

if (finger.getTemplateCount() == FINGERPRINT_OK) {
  Serial.printf("Templates on sensor: %u\n", finger.templateCount);
  if (finger.templateCount == 0) {
    Serial.println("WARNING: No fingerprints enrolled!");
    oledPrintCenter("CHUA ENROLL", "Hay enroll truoc");
  }
} else {
  Serial.println("Cannot get template count!");
}
```

## Test sau khi sửa:

1. **Upload code mới lên ESP32**
2. **Kiểm tra Serial Monitor** xem có lỗi gì không
3. **Enroll vân tay** bằng cách truy cập: `http://192.168.1.30/enroll?id=1`
4. **Test chấm công** bằng cách quét vân tay trên ESP32
5. **Kiểm tra backend logs** xem có nhận được request không

## Endpoints backend đã sẵn sàng:

- `POST /api/fingerprint` - Nhận request từ ESP32
- `POST /api/attendance/fingerprint` - Alternative endpoint
- `POST /esp32-register` - ESP32 registration
- `GET /api/esp32-status` - Debug status
- `DELETE /api/attendance/today` - Xóa attendance hôm nay (để test)
