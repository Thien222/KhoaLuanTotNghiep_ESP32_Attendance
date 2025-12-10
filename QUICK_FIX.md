## 🚀 Quick Fix: Deploy Keep-Alive Service

### 1. Commit & Push Code
```bash
cd d:\ProjectKLTN\KhoaLuanTotNghiep_ESP32_Attendance
git add .
git commit -m "Add keep-alive service to prevent Render sleep"
git push origin main
```

### 2. Render sẽ tự động re-deploy
- Truy cập: https://dashboard.render.com
- Xem Web Service đang deploy
- Đợi 2-5 phút

### 3. (Optional) Thêm Environment Variable
Trên Render Dashboard → Environment → Add:
```
Key: BACKEND_URL
Value: https://khoaluantotnghiep-esp32-attendance.onrender.com
```

### 4. Wake Up Backend Ngay Lập Tức
Mở trình duyệt và truy cập:
```
https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz
```

Đợi 30-50 giây để backend wake up, sau đó thử đăng nhập lại!

---

## ✅ Kết quả mong đợi

Sau khi deploy, backend sẽ:
- Tự động ping mỗi 10 phút
- Không bao giờ sleep (trong giờ hoạt động)
- Log: `💚 Keep-alive ping successful`
