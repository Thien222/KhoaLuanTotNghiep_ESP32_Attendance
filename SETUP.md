# 🔧 HƯỚNG DẪN SETUP

## ⚠️ QUAN TRỌNG: Cấu hình Environment Variables

Trước khi chạy project, bạn **PHẢI** tạo file cấu hình với credentials thật:

### 1. Backend Configuration

Tạo file `backend/config.env` từ template:

```bash
cd backend
cp config.env.example config.env
```

Sau đó chỉnh sửa `config.env` với thông tin thật của bạn:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
JWT_SECRET=your_strong_jwt_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password
IP_MACHINE=192.168.1.100
IP_ESP32=192.168.1.101
```

### 2. Config.json (Optional)

Nếu sử dụng `config.json`, tạo từ template:

```bash
cp config.json.example config.json
```

Và điền thông tin thật.

---

## 🚀 Chạy Project

### Backend:
```bash
cd backend
npm install
npm start
```

### Frontend:
```bash
cd frontend
npm install
npm start
```

---

## 📝 Lưu ý

- **KHÔNG commit** `config.env` hoặc `config.json` lên GitHub
- File `.gitignore` đã được cấu hình để loại trừ các file sensitive
- Luôn sử dụng environment variables cho credentials

