# 🚀 Hướng dẫn Deploy Backend lên Render

## Bước 1: Tạo tài khoản Render
1. Truy cập [https://render.com](https://render.com)
2. Đăng ký bằng GitHub (khuyến nghị) hoặc email

## Bước 2: Tạo Web Service mới
1. Vào Dashboard → **New** → **Web Service**
2. Chọn **Build and deploy from a Git repository**
3. Kết nối GitHub repository của bạn
   
   **Nếu chưa có repo GitHub:**
   - Push code của bạn lên GitHub:
   ```bash
   cd KhoaLuanTotNghiep_ESP32_Attendance/backend
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

## Bước 3: Cấu hình Web Service
Điền các thông tin sau:

| Field | Value |
|-------|-------|
| **Name** | `hrm-backend` |
| **Region** | Singapore (gần Việt Nam nhất) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

## Bước 4: Thêm Environment Variables
Vào **Environment** → **Add Environment Variable**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | *Copy từ file config.env của bạn* |
| `JWT_SECRET` | *Copy từ file config.env của bạn* |
| `EMAIL_USER` | *Email của bạn (optional)* |
| `EMAIL_APP_PASSWORD` | *App password (optional)* |
| `PORT` | `10000` (Render sẽ tự set) |

## Bước 5: Deploy
1. Click **Create Web Service**
2. Đợi khoảng 2-5 phút để build và deploy

## Bước 6: Lấy URL Backend
Sau khi deploy xong, bạn sẽ có URL dạng:
```
https://hrm-backend-xxxx.onrender.com
```

## Bước 7: Cập nhật Frontend
Mở file `frontend/src/utils/configManager.js` và thay đổi:

```javascript
const PRODUCTION_API_URL = 'https://hrm-backend-xxxx.onrender.com/api';
```

Thay `hrm-backend-xxxx` bằng URL thực tế của bạn.

## Bước 8: Re-deploy Frontend
```bash
cd frontend
npm run build
vercel deploy --prod ./build
```

---

## ⚠️ Lưu ý quan trọng

### Free Tier Limitations:
- Render free tier sẽ **sleep sau 15 phút không hoạt động**
- Request đầu tiên sau khi sleep sẽ mất ~30 giây để "wake up"

### MongoDB Atlas:
- Nếu bạn chưa có MongoDB Cloud, tạo miễn phí tại [https://mongodb.com/atlas](https://mongodb.com/atlas)
- Chọn **M0 Sandbox (Free Forever)**
- Lấy connection string và dán vào `MONGODB_URI`

---

## 🔗 URLs sau khi deploy:

| Service | URL |
|---------|-----|
| Frontend (Vercel) | https://build-bzy75d4zg-thien222s-projects.vercel.app |
| Backend (Render) | *Sẽ có sau khi deploy* |

---

**Cần hỗ trợ?** Liên hệ qua Issues trên GitHub hoặc email.
