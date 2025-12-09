# ESP32 Troubleshooting Guide

## Lỗi: DNS Failed / Connection Refused

### Lỗi thường gặp:
```
[E][WiFiGeneric.cpp:1583] hostByName(): DNS Failed for 1192.168.1.166
HTTP error -1: connection refused
POST attendance(auto) => -1
```

### Nguyên nhân:
1. **Server URL trong ESP32 bị lưu sai** (IP format không đúng)
2. **Server không chạy** hoặc không truy cập được
3. **ESP32 và Server không cùng mạng WiFi**
4. **Firewall chặn kết nối**

### Cách sửa:

#### Bước 1: Kiểm tra Server có đang chạy không
```bash
# Kiểm tra server đang chạy trên port 3000
netstat -ano | findstr :3000
# Hoặc
curl http://localhost:3000/healthz
```

#### Bước 2: Kiểm tra IP Server
- Xem file `config.json`: `server.ip` và `server.port`
- Hoặc kiểm tra IP thực tế của máy chạy server:
  ```bash
  ipconfig  # Windows
  ifconfig  # Linux/Mac
  ```

#### Bước 3: Xóa Server URL cũ trong ESP32

**Cách 1: Qua Web Interface (Khuyến nghị)**
1. Kết nối ESP32 vào WiFi
2. Mở trình duyệt, truy cập: `http://<ESP32_IP>/wipe-wifi`
3. ESP32 sẽ xóa WiFi credentials và restart
4. Sau khi restart, ESP32 sẽ tự động discovery lại server URL

**Cách 2: Qua Serial Monitor**
1. Mở Serial Monitor (115200 baud)
2. Gửi lệnh reset hoặc restart ESP32
3. ESP32 sẽ tự động thử discovery server URL khi khởi động

#### Bước 4: Đảm bảo Server có endpoint discovery
Server cần có endpoint `/esp32-discovery` hoặc `/api/esp32-config` để ESP32 tự động lấy config.

Kiểm tra trong `backend/app.js`:
- `GET /esp32-discovery` - Trả về server URL
- `GET /api/esp32-config?ip=<ESP32_IP>` - Trả về config cho ESP32

#### Bước 5: Kiểm tra cùng mạng WiFi
- ESP32 và Server phải cùng mạng WiFi
- Kiểm tra IP của ESP32: Xem Serial Monitor hoặc router admin
- Kiểm tra IP của Server: `ipconfig` hoặc `ifconfig`

#### Bước 6: Kiểm tra Firewall
- Tắt Windows Firewall tạm thời để test
- Hoặc mở port 3000 trong Firewall:
  ```bash
  # Windows
  netsh advfirewall firewall add rule name="Node.js Server" dir=in action=allow protocol=TCP localport=3000
  ```

### Debug Steps:

1. **Xem Serial Monitor của ESP32:**
   - Kiểm tra WiFi đã kết nối chưa
   - Kiểm tra IP của ESP32
   - Kiểm tra server URL đang dùng
   - Xem log discovery process

2. **Kiểm tra Server Logs:**
   ```bash
   # Xem log khi ESP32 gọi API
   # Server sẽ log: "Received fingerprint attendance from ESP32"
   ```

3. **Test kết nối thủ công:**
   ```bash
   # Từ máy khác trong cùng mạng, test:
   curl http://<SERVER_IP>:3000/healthz
   curl http://<SERVER_IP>:3000/esp32-discovery
   ```

### Cấu hình lại Server URL thủ công (nếu cần):

Nếu ESP32 không tự động discovery được, có thể set thủ công qua code:

1. Sửa `DEFAULT_SERVER_URL` trong `esp32_vantay/src/main.cpp`:
   ```cpp
   const char *DEFAULT_SERVER_URL = "http://192.168.1.100:3000/api";
   ```
   (Thay `192.168.1.100` bằng IP thực tế của server)

2. Upload lại code vào ESP32

3. ESP32 sẽ dùng URL này làm fallback nếu không discovery được

### Kiểm tra nhanh:

1. **ESP32 đã kết nối WiFi?**
   - Serial Monitor: "Wi-Fi OK"
   - OLED: "Wi-Fi OK" với IP

2. **Server đang chạy?**
   - Browser: `http://localhost:3000/healthz` → `{"ok":true}`

3. **Cùng mạng?**
   - ESP32 IP: `192.168.1.xxx`
   - Server IP: `192.168.1.xxx` (cùng subnet)

4. **Server URL đúng?**
   - Serial Monitor: "Loaded serverUrl from NVS: http://..."
   - Kiểm tra IP trong URL có đúng không

### Lưu ý:
- IP `1192.168.1.166` là SAI (thiếu dấu chấm)
- IP đúng phải là: `192.168.1.166`
- Nếu thấy IP sai, cần xóa NVS và để ESP32 discovery lại







