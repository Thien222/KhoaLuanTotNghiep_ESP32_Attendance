# 📋 HỆ THỐNG QUẢN LÝ NHÂN SỰ VÀ CHẤM CÔNG BẰNG VÂN TAY ESP32

> **Đề tài Khóa luận Tốt nghiệp** - Hệ thống quản lý nhân sự tích hợp chấm công bằng vân tay qua thiết bị ESP32, với giao diện Web, Mobile và Chatbot AI thông minh.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/PhuongNgo03112003/ChamConngTinhLuong-tt)
[![License](https://img.shields.io/badge/License-Academic-blue)](LICENSE)

---

## 📖 MÔ TẢ DỰ ÁN

Hệ thống quản lý nhân sự toàn diện với các tính năng:
- ✅ **Chấm công tự động bằng vân tay** qua thiết bị ESP32
- ✅ **Quản lý nhân viên** (thêm, sửa, xóa, phân quyền)
- ✅ **Tính lương tự động** dựa trên chấm công, ngày phép, tăng ca
- ✅ **Quản lý nghỉ phép và tăng ca** với workflow phê duyệt
- ✅ **Chatbot AI** hỗ trợ tra cứu lương, ngày phép, thông tin nhân viên
- ✅ **Chat nội bộ** giữa nhân viên và quản lý
- ✅ **Dashboard thống kê** real-time với biểu đồ và báo cáo
- ✅ **Ứng dụng Mobile** (React Native) cho nhân viên

---

## 🚀 DEMO & DEPLOY LINKS

### 📦 GitHub Repository
- **Source Code:** [https://github.com/PhuongNgo03112003/ChamConngTinhLuong-tt](https://github.com/PhuongNgo03112003/ChamConngTinhLuong-tt)

### 🌐 Frontend Web Application
- **Demo:** [https://your-frontend-demo.vercel.app](https://your-frontend-demo.vercel.app)
- **Production:** [https://your-production-url.com](https://your-production-url.com)

### 📱 Mobile Application
- **Android APK:** [Download APK](https://your-apk-download-link.com)
- **iOS:** (Đang phát triển)

### 🔧 Backend API
- **API Base URL:** [https://khoaluantotnghiep-esp32-attendance.onrender.com/api](https://khoaluantotnghiep-esp32-attendance.onrender.com/api)
- **API Documentation:** [Swagger/Postman Collection](https://your-api-docs-link.com)

### 📸 Video Demo
- **YouTube:** [Xem video demo hệ thống](https://youtube.com/watch?v=your-video-id)
- **Screen Recording:** [Link Google Drive](https://drive.google.com/your-folder)

---

## 📸 HÌNH ẢNH MÀN HÌNH

### 🖥️ Giao diện Web

#### 1. Trang Đăng nhập
![Login Screen](screenshots/web/login.png)
*Giao diện đăng nhập với phân quyền Manager/Employee/Accountant*

#### 2. Dashboard Quản lý
![Dashboard](screenshots/web/dashboard.png)
*Dashboard tổng quan với thống kê real-time, biểu đồ chấm công, và thông báo*

#### 3. Quản lý Nhân viên
![Employee Management](screenshots/web/employee-management.png)
*Danh sách nhân viên với tính năng tìm kiếm, lọc, và đăng ký vân tay*

#### 4. Chấm công
![Attendance](screenshots/web/attendance.png)
*Lịch sử chấm công với lọc theo tháng, xuất Excel, và thống kê*

#### 5. Tính lương
![Payroll](screenshots/web/payroll.png)
*Quản lý lương với tính toán tự động, điều chỉnh, và lịch sử*

#### 6. Chatbot AI
![Chatbot](screenshots/web/chatbot.png)
*Chatbot thông minh hỗ trợ tra cứu lương, ngày phép, thông tin nhân viên*

#### 7. Chat Nội bộ
![Internal Chat](screenshots/web/internal-chat.png)
*Hệ thống chat nội bộ với phân quyền và thông báo real-time*

### 📱 Giao diện Mobile

#### 1. Màn hình Home
![Mobile Home](screenshots/mobile/home.png)
*Dashboard mobile với thông tin chấm công hôm nay*

#### 2. Chấm công Mobile
![Mobile Attendance](screenshots/mobile/attendance.png)
*Xem lịch sử chấm công và thống kê trên mobile*

#### 3. Lương Mobile
![Mobile Payroll](screenshots/mobile/payroll.png)
*Xem chi tiết lương theo tháng trên mobile*

### 🔌 Thiết bị ESP32

#### 1. ESP32 Hardware
![ESP32 Device](screenshots/esp32/device.jpg)
*Thiết bị ESP32 với module vân tay và màn hình OLED*

#### 2. Màn hình ESP32
![ESP32 Display](screenshots/esp32/display.jpg)
*Màn hình hiển thị trạng thái chấm công trên ESP32*

---

## 🛠️ CÔNG NGHỆ SỬ DỤNG

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Authentication:** JWT (JSON Web Token)
- **Real-time:** Socket.IO
- **AI/ML:** OpenAI API (GPT-4o-mini)
- **Email:** Nodemailer (Gmail SMTP)
- **Scheduling:** node-cron (Auto-completion attendance)

### Frontend Web
- **Framework:** React 18
- **UI Library:** Ant Design 5
- **Routing:** React Router v6
- **State Management:** React Context API
- **Charts:** Recharts
- **Calendar:** FullCalendar
- **Real-time:** Socket.IO Client

### Mobile App
- **Framework:** React Native
- **Platform:** Expo
- **Navigation:** React Navigation
- **State Management:** React Context API

### ESP32 Firmware
- **Platform:** PlatformIO
- **Board:** ESP32 DevKit
- **Libraries:**
  - Adafruit Fingerprint Library
  - WiFiMulti (Multi-WiFi support)
  - NTP Client (Time synchronization)
  - HTTPClient (REST API calls)

### DevOps & Deployment
- **Backend Hosting:** Render.com
- **Frontend Hosting:** Vercel
- **Database:** MongoDB Atlas
- **Version Control:** Git

---

## 📁 CẤU TRÚC DỰ ÁN

```
KhoaLuanTotNghiep_ESP32_Attendance/
├── backend/                    # Backend API (Node.js/Express)
│   ├── controllers/           # Business logic controllers
│   ├── models/                # MongoDB schemas
│   ├── routes/                # API routes
│   ├── middleware/            # Auth, error handling
│   ├── services/              # Business services (AI, email, etc.)
│   ├── socket/                # Socket.IO server
│   ├── utils/                 # Helper functions
│   ├── scripts/               # Database scripts
│   └── app.js                 # Main server file
│
├── frontend/                   # Web Frontend (React)
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── contexts/          # React contexts
│   │   ├── services/          # API services
│   │   └── utils/             # Utilities
│   └── public/                # Static files
│
├── mobile/                     # Mobile App (React Native/Expo)
│   ├── screens/               # Screen components
│   ├── navigation/            # Navigation setup
│   ├── services/              # API services
│   └── contexts/              # React contexts
│
├── esp32_vantay/              # ESP32 Firmware
│   ├── src/
│   │   └── main.cpp           # Main firmware code
│   └── platformio.ini         # PlatformIO config
│
└── docs/                      # Documentation
    ├── PhanTichHeThong_Code.md
    └── class_diagram.puml
```

---

## ⚙️ CÀI ĐẶT VÀ CẤU HÌNH

### Yêu cầu hệ thống
- Node.js >= 18.x
- MongoDB >= 6.0 (hoặc MongoDB Atlas)
- Git
- PlatformIO (cho ESP32)
- ESP32 DevKit + Fingerprint Sensor + OLED Display

### 1. Clone repository

```bash
git clone https://github.com/PhuongNgo03112003/ChamConngTinhLuong-tt.git
cd ChamConngTinhLuong-tt
```

### 2. Backend Setup

```bash
cd backend

# Cài đặt dependencies
npm install

# Tạo file config.env từ template
cp config.env.example config.env

# Chỉnh sửa config.env với thông tin của bạn:
# - MONGODB_URI: Connection string MongoDB
# - JWT_SECRET: Secret key cho JWT
# - EMAIL_USER & EMAIL_APP_PASSWORD: Gmail credentials
# - IP_MACHINE: IP máy chủ backend
# - IP_ESP32: IP thiết bị ESP32

# Chạy seed data (tùy chọn)
npm run seed:all

# Khởi động server
npm run dev        # Development mode
npm start          # Production mode
```

Backend sẽ chạy tại: `http://localhost:3000`

### 3. Frontend Setup

```bash
cd frontend

# Cài đặt dependencies
npm install

# Cấu hình API URL trong src/config.js
# Đặt BACKEND_URL = 'http://localhost:3000/api'

# Khởi động development server
npm start
```

Frontend sẽ chạy tại: `http://localhost:3001`

### 4. Mobile App Setup

```bash
cd mobile

# Cài đặt dependencies
npm install

# Cấu hình API URL trong config.js
# Đặt DEFAULT_API_URL = 'http://YOUR_SERVER_IP:3000/api'

# Khởi động Expo
npm start

# Quét QR code bằng Expo Go app trên điện thoại
```

### 5. ESP32 Firmware Setup

```bash
cd esp32_vantay

# Mở project trong PlatformIO
# Hoặc sử dụng VS Code với extension PlatformIO

# Cấu hình WiFi trong src/main.cpp:
# - Thêm SSID và password vào mảng WIFI_LIST
# - Cấu hình server URL (hoặc để ESP32 tự động lấy từ backend)

# Upload firmware lên ESP32
pio run -t upload

# Xem serial monitor
pio device monitor
```

---

## 🔐 TÀI KHOẢN MẶC ĐỊNH

### Admin/Manager
- **Username:** `admin`
- **Password:** `admin123`
- **Quyền:** Quản lý toàn bộ hệ thống

### Employee (Demo)
- **Username:** `EMP001`
- **Password:** `EMP001` (hoặc mật khẩu được gửi qua email khi đăng ký vân tay)
- **Quyền:** Xem thông tin cá nhân, chấm công, lương

---

## 📚 TÍNH NĂNG CHI TIẾT

### 1. Chấm công bằng Vân tay (ESP32)
- ✅ Quét vân tay tự động, không cần nút bấm
- ✅ Logic tự động: Lần 1 = Check-in, Lần 2 = Check-out
- ✅ Đồng bộ thời gian qua NTP
- ✅ Kết nối WiFi tự động (Multi-WiFi support)
- ✅ Hiển thị trạng thái trên OLED
- ✅ Gửi dữ liệu real-time lên server

### 2. Quản lý Nhân viên
- ✅ CRUD nhân viên (thêm, sửa, xóa, tìm kiếm)
- ✅ Đăng ký vân tay qua ESP32
- ✅ Quản lý lương và lịch sử tăng lương
- ✅ Phân quyền (Manager/Accountant/Employee)
- ✅ Quản lý nhân viên nghỉ việc

### 3. Tính lương Tự động
- ✅ Tính lương dựa trên chấm công thực tế
- ✅ Trừ lương đi muộn, nghỉ không phép
- ✅ Cộng tăng ca (OT)
- ✅ Tính phụ cấp, thuế
- ✅ Lương "snapshot" (đã chốt) vs "real-time" (tạm tính)
- ✅ Tính lương "What-if" (nếu nghỉ thêm X ngày)

### 4. Quản lý Nghỉ phép & Tăng ca
- ✅ Đơn nghỉ phép với workflow phê duyệt
- ✅ Đơn tăng ca
- ✅ Lịch sử và thống kê
- ✅ Thông báo real-time cho Manager

### 5. Chatbot AI
- ✅ Tra cứu lương: "Lương tháng này của tôi"
- ✅ Tra cứu ngày phép: "Tôi còn bao nhiêu ngày phép?"
- ✅ Thông tin nhân viên: "Thông tin của nhân viên EMP001"
- ✅ Dự báo lương: "Nếu nghỉ thêm 2 ngày thì lương còn bao nhiêu?"
- ✅ Fallback regex khi OpenAI lỗi

### 6. Chat Nội bộ
- ✅ Chat giữa nhân viên và quản lý
- ✅ Phân quyền: Employee chỉ chat với Manager/Accountant
- ✅ Real-time notifications
- ✅ Đếm tin nhắn chưa đọc
- ✅ Lịch sử tin nhắn

### 7. Dashboard & Thống kê
- ✅ Thống kê chấm công real-time
- ✅ Biểu đồ xu hướng
- ✅ Báo cáo theo tháng/năm
- ✅ Thông báo và alerts

---

## 🔧 CẤU HÌNH NÂNG CAO

### Time Machine (Test Mode)
Hệ thống hỗ trợ "Time Machine" để test với ESP32 thật:
- Cho phép set thời gian ảo trên server
- Test các trường hợp: đi muộn, tăng ca, nghỉ phép
- **Lưu ý:** Chỉ bật trong môi trường test, tắt trong production

```env
ENABLE_TEST_MODE=true
```

### Auto-completion Attendance
Hệ thống tự động hoàn tất chấm công cho nhân viên quên check-out:
- Chạy cron job mỗi ngày vào giờ kết thúc ca (mặc định: 17:00)
- Tự động tạo check-out nếu thiếu

### Email Notifications
- Gửi email khi đăng ký vân tay thành công (kèm thông tin đăng nhập)
- Gửi email thông báo đơn nghỉ phép/tăng ca
- Cấu hình trong `backend/config.env`

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### ESP32 không kết nối được server
1. Kiểm tra ESP32 và server cùng mạng WiFi
2. Kiểm tra IP server trong config ESP32
3. Kiểm tra firewall/port 3000
4. Xem log serial monitor ESP32

### MongoDB connection error
1. Kiểm tra `MONGODB_URI` trong `config.env`
2. Kiểm tra MongoDB Atlas whitelist IP
3. Kiểm tra username/password

### Frontend không kết nối backend
1. Kiểm tra `BACKEND_URL` trong `src/config.js`
2. Kiểm tra CORS settings trong backend
3. Kiểm tra backend đang chạy

---

## 📝 API DOCUMENTATION

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký (Admin only)
- `GET /api/auth/me` - Lấy thông tin user hiện tại

### Employees
- `GET /api/employees` - Lấy danh sách nhân viên
- `POST /api/employees` - Tạo nhân viên mới
- `PUT /api/employees/:id` - Cập nhật nhân viên
- `DELETE /api/employees/:id` - Xóa nhân viên
- `GET /api/enroll?id=X` - Đăng ký vân tay cho nhân viên

### Attendance
- `POST /api/attendance/add` - Thêm chấm công (ESP32)
- `GET /api/attendance` - Lấy lịch sử chấm công
- `GET /api/attendance/stats` - Thống kê chấm công

### Payroll
- `GET /api/payroll` - Lấy danh sách lương
- `POST /api/payroll/generate` - Tạo bảng lương tháng
- `GET /api/payroll/my-payroll` - Lương của tôi

Xem thêm trong file `backend/routes/` hoặc Postman Collection.

---

## 🤝 ĐÓNG GÓP

Mọi đóng góp đều được chào đón! Vui lòng:
1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 LICENSE

Dự án này được phát triển cho mục đích học tập và nghiên cứu (Khóa luận Tốt nghiệp).

---

## 👨‍💻 TÁC GIẢ

- **Sinh viên:** [Tên của bạn]
- **MSSV:** [Mã số sinh viên]
- **Giảng viên hướng dẫn:** [Tên giảng viên]
- **Trường:** [Tên trường]
- **Năm:** 2024-2025

---

## 📞 LIÊN HỆ

- **Email:** your-email@example.com
- **GitHub:** [@PhuongNgo03112003](https://github.com/PhuongNgo03112003)
- **Repository:** [ChamConngTinhLuong-tt](https://github.com/PhuongNgo03112003/ChamConngTinhLuong-tt)
- **LinkedIn:** [Your LinkedIn](https://linkedin.com/in/your-profile)

---

## 🙏 LỜI CẢM ƠN

Cảm ơn các thư viện và công cụ mã nguồn mở đã hỗ trợ:
- React, Node.js, Express.js
- MongoDB, Mongoose
- Ant Design
- Socket.IO
- OpenAI API
- PlatformIO
- Và tất cả các contributors khác

---

**⭐ Nếu dự án này hữu ích, hãy cho một star! ⭐**


