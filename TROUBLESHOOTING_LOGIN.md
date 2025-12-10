# 🔧 Troubleshooting: Không đăng nhập được sau khi Deploy

## 🎯 Vấn đề
Sau khi deploy backend lên Render và frontend lên Vercel, đăng nhập không hoạt động hoặc gặp lỗi timeout.

---

## 🔍 Nguyên nhân phổ biến

### 1. **Backend Render đã Sleep** (⭐ Phổ biến nhất)
**Triệu chứng:**
- Đợi lâu (30-50 giây) rồi mới hiện lỗi
- Request timeout
- Frontend không kết nối được với backend

**Nguyên nhân:**
- Render Free Tier tự động **sleep sau 15 phút không hoạt động**
- Request đầu tiên cần ~30-50 giây để "wake up"

**Giải pháp:**

#### ✅ Giải pháp tức thời: Wake up thủ công
1. Mở browser và truy cập:
   ```
   https://khoaluantotnghiep-esp32-attendance.onrender.com/api
   ```
2. Đợi 30-50 giây cho backend wake up
3. Thử đăng nhập lại

#### ✅ Giải pháp dài hạn: Keep-Alive Service (Đã tích hợp)
Backend đã được tích hợp **keep-alive service** tự động ping mỗi 10 phút để giữ server luôn hoạt động.

**Kiểm tra:**
- Xem logs trên Render Dashboard
- Tìm dòng: `💚 Keep-alive ping successful`

**Cấu hình thêm (optional):**
Thêm environment variable `BACKEND_URL` trên Render:
```
BACKEND_URL=https://khoaluantotnghiep-esp32-attendance.onrender.com
```

---

### 2. **JWT_SECRET không khớp**
**Triệu chứng:**
- Đăng nhập thành công nhưng bị "Unauthorized" ngay sau đó
- Token invalid error

**Nguyên nhân:**
- `JWT_SECRET` trên Render khác với `JWT_SECRET` ban đầu
- Token được tạo với secret cũ, verify với secret mới

**Giải pháp:**
1. Truy cập Render Dashboard → Web Service → Environment
2. Kiểm tra `JWT_SECRET` phải giống với local config
3. Nếu thay đổi, cần logout tất cả user và đăng nhập lại

---

### 3. **MongoDB Connection Error**
**Triệu chứng:**
- "Database connection failed"
- "MONGODB_URI not found"
- Backend start nhưng không kết nối DB

**Giải pháp:**
1. Kiểm tra trên Render → Environment:
   - `MONGODB_URI` hoặc `MONGO_URI` phải có
2. Kiểm tra MongoDB Atlas:
   - Database cluster có đang chạy không?
   - IP Whitelist: Thêm `0.0.0.0/0` để cho phép mọi IP (production)
3. Test connection string local trước khi deploy

---

### 4. **CORS Issues**
**Triệu chứng:**
- "CORS policy error" trong browser console
- Frontend và backend khác domain

**Giải pháp:**
Backend đã cấu hình `cors: '*'` (cho phép mọi origin), nhưng nếu vẫn gặp lỗi:

1. Kiểm tra file `app.js` line 39-43:
```javascript
app.use(cors({
  origin: '*',  // Hoặc chỉ định cụ thể frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

2. Nếu muốn bảo mật hơn, thay `'*'` bằng:
```javascript
origin: 'https://build-bzy75d4zg-thien222s-projects.vercel.app'
```

---

### 5. **Frontend gọi sai URL**
**Triệu chứng:**
- Network error
- 404 Not Found

**Giải pháp:**
Kiểm tra file `frontend/src/utils/configManager.js`:

```javascript
// Line 7
const PRODUCTION_API_URL = process.env.REACT_APP_API_URL || 
  'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';
```

**Lưu ý:** URL phải kết thúc bằng `/api`

---

## 🛠️ Các bước kiểm tra đầy đủ

### Bước 1: Kiểm tra Backend có hoạt động không
```bash
curl https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz
```

Kết quả mong đợi:
```json
{"ok":true,"timestamp":"2025-12-10T04:52:45.123Z"}
```

### Bước 2: Kiểm tra logs trên Render
1. Truy cập Render Dashboard
2. Click vào Web Service
3. Xem tab **Logs**
4. Tìm:
   - ✅ `MongoDB connected successfully`
   - ✅ `Server running on port 10000`
   - ❌ Bất kỳ error nào

### Bước 3: Test login endpoint
```bash
curl -X POST https://khoaluantotnghiep-esp32-attendance.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Bước 4: Kiểm tra Environment Variables
Trên Render → Environment, cần có:
- ✅ `NODE_ENV=production`
- ✅ `MONGODB_URI` (hoặc `MONGO_URI`)
- ✅ `JWT_SECRET`
- ✅ `PORT=10000` (tự động)

---

## 🚀 Re-deploy nếu cần

Nếu đã thay đổi code hoặc environment variables:

### Backend (Render):
1. Push code lên GitHub:
```bash
cd backend
git add .
git commit -m "Fix login issues"
git push origin main
```

2. Render sẽ tự động re-deploy (hoặc Manual Deploy)

### Frontend (Vercel):
```bash
cd frontend
npm run build
vercel deploy --prod ./build
```

---

## 📊 Monitoring & Prevention

### 1. Sử dụng UptimeRobot (Free)
- Tạo tài khoản tại: https://uptimerobot.com
- Thêm monitor cho backend URL
- Ping mỗi 5 phút → Giữ backend luôn hoạt động

### 2. Kiểm tra logs định kỳ
- Truy cập Render Dashboard mỗi ngày
- Xem có error không

### 3. Setup alerts
- Render có email alerts khi service down
- Enable trong Settings → Notifications

---

## 💡 Tips

1. **Test local trước khi deploy**
   - Chạy backend với `NODE_ENV=production` local
   - Test login với production database

2. **Sử dụng Postman**
   - Test API endpoints trước khi deploy
   - Export collection để test nhanh

3. **Version control**
   - Luôn commit code trước khi deploy
   - Tag version: `git tag v1.0.0`

---

## 🆘 Cần hỗ trợ?

Nếu vẫn gặp vấn đề:

1. **Kiểm tra Render Status**: https://status.render.com
2. **Kiểm tra MongoDB Atlas Status**: https://status.cloud.mongodb.com
3. **Check browser console** (F12) để xem lỗi cụ thể
4. **Share logs** từ Render Dashboard

---

**Cập nhật:** 2025-12-10
