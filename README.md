# 🎓 HỆ THỐNG CHẤM CÔNG VÂN TAY ESP32

## 📋 MÔ TẢ DỰ ÁN

Hệ thống quản lý nhân sự và chấm công tự động sử dụng cảm biến vân tay ESP32, tích hợp backend Node.js và frontend React.

### ✨ Tính năng chính

- ✅ **Chấm công vân tay** với ESP32 + R503/R307
- ✅ **Quản lý nhân viên** (3 loại hợp đồng: Thực tập, Thử việc, Chính thức)
- ✅ **Tính lương tự động** với OT, phạt muộn, thưởng
- ✅ **Quản lý nghỉ phép** (12 ngày/năm, badge hiển thị quota)
- ✅ **Dashboard real-time** với thống kê
- ✅ **Quản lý ngày lễ** (x2, x3 lương nếu làm việc)
- ✅ **Cấu hình linh hoạt** (giờ làm, OT, phạt muộn, auto-checkout)
- ✅ **Profile hoàn thiện** (CCCD, BHXH, ngân hàng)

---

## 🚀 CÀI ĐẶT

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Cấu hình Environment Variables

Copy `backend/config.env.example` thành `backend/config.env` và điền thông tin:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
JWT_SECRET=your_strong_jwt_secret_key_here
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password
IP_MACHINE=192.168.1.100
IP_ESP32=192.168.1.101
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Chạy ứng dụng

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm start
```

---

## 📁 CẤU TRÚC PROJECT

```
KhoaLuanTotNghiep_ESP32_Attendance/
├── backend/              # Node.js Backend
│   ├── controllers/     # Business logic
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & error handling
│   ├── scripts/        # Utility scripts
│   └── config.env      # Environment config (NOT in git)
├── frontend/            # React Frontend
│   └── src/
│       ├── pages/      # Page components
│       ├── components/ # Reusable components
│       └── utils/      # Utilities
└── ESP32_FINGERPRINT_AUTO_COMPLETE.ino  # ESP32 code
```

---

## 🔐 BẢO MẬT

**⚠️ QUAN TRỌNG:** 
- File `config.env` và `config.json` chứa credentials thật - **KHÔNG commit lên GitHub**
- File `.gitignore` đã được cấu hình để loại trừ các file sensitive
- Luôn sử dụng environment variables cho credentials

---

## 📝 API DOCUMENTATION

Xem `README_COMPLETE.md` để biết chi tiết về API endpoints.

---

## 🤝 CONTRIBUTING

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 LICENSE

This project is for educational purposes.








