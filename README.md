# ESP32 Fingerprint Attendance System

A comprehensive MERN stack application for employee management with fingerprint-based attendance tracking using ESP32 microcontroller.

## 🚀 Features

### Core Functionality
- **Employee Management**: Add, view, edit, and delete employees
- **Fingerprint Enrollment**: Secure biometric enrollment process
- **Attendance Tracking**: Real-time check-in/check-out system
- **Manual Attendance**: Admin can manually record attendance
- **Security Validation**: Enforce enrollment before attendance

### Technical Features
- **MERN Stack**: MongoDB, Express.js, React, Node.js
- **ESP32 Integration**: Real-time communication with fingerprint sensor
- **OLED Display**: Visual feedback on ESP32 device
- **RESTful API**: Clean API design for frontend-backend communication
- **Real-time Updates**: Live attendance status updates

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ESP32 Device  │    │   Backend API   │    │  React Frontend │
│                 │    │                 │    │                 │
│ • Fingerprint   │◄──►│ • Express.js    │◄──►│ • Material-UI   │
│   Sensor        │    │ • MongoDB       │    │ • Axios         │
│ • OLED Display  │    │ • RESTful APIs  │    │ • Components    │
│ • WiFi Module   │    │ • Security      │    │ • State Mgmt    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- ESP32 development board
- Fingerprint sensor (AS608/AS608)
- OLED display (SSD1306)
- Buzzer for audio feedback

## 🛠️ Installation

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Thien222/KhoaLuanTotNghiep_ESP32_Attendance.git
   cd KhoaLuanTotNghiep_ESP32_Attendance
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Configuration**
   Create `.env` file in backend directory:
   ```env
   PORT=3000
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/fingerprint_db
   NODE_ENV=development
   ```

4. **Start backend server**
   ```bash
   npm start
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

### ESP32 Setup

1. **Hardware Connections**
   ```
   ESP32    Fingerprint Sensor
   GPIO 25  ──────► TX
   GPIO 26  ──────► RX
   GPIO 16  ──────► SDA (OLED)
   GPIO 17  ──────► SCL (OLED)
   GPIO 15  ──────► Buzzer
   ```

2. **Upload Code**
   - Open Arduino IDE
   - Install required libraries
   - Upload the ESP32 code to your device

3. **WiFi Configuration**
   - Update WiFi credentials in ESP32 code
   - Set server URL to your backend IP

## 🔧 API Endpoints

### Employee Management
- `POST /api/employees` - Add new employee
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance Management
- `POST /api/attendance/add` - Record attendance
- `GET /api/attendance/today` - Get today's attendance
- `GET /api/attendance/all` - Get all attendance records

### ESP32 Integration
- `POST /api/esp32-enroll` - Enroll fingerprint via ESP32
- `POST /api/esp32-attendance` - Record attendance via ESP32
- `GET /api/security/check-enrollment/:id` - Check enrollment status

## 🔒 Security Features

- **Enrollment Validation**: Must enroll fingerprint before attendance
- **Fingerprint Verification**: Secure biometric authentication
- **Data Validation**: Input sanitization and validation
- **Error Handling**: Comprehensive error management
- **Audit Logging**: Track all attendance activities

## 📱 Usage

### For Administrators
1. **Add Employees**: Use the "Add Employee" tab
2. **Enroll Fingerprints**: Click enroll button for each employee
3. **Monitor Attendance**: View real-time attendance records
4. **Manual Override**: Record attendance manually if needed

### For Employees
1. **First Time**: Admin must enroll your fingerprint
2. **Daily Check-in**: Place finger on sensor to check in
3. **Daily Check-out**: Place finger on sensor to check out
4. **Status Display**: Check OLED display for confirmation

## 🐛 Troubleshooting

### Common Issues

1. **ESP32 Connection Issues**
   - Check WiFi credentials
   - Verify server IP address
   - Ensure backend is running

2. **Fingerprint Sensor Problems**
   - Check wiring connections
   - Verify sensor power supply
   - Clean sensor surface

3. **Database Connection**
   - Verify MongoDB URI
   - Check network connectivity
   - Ensure database permissions

## 📊 Database Schema

### Employee Collection
```javascript
{
  name: String,
  employeeId: String (unique),
  fingerprintId: Number (unique),
  fingerprintEnrolled: Boolean,
  position: String,
  department: String,
  email: String (unique),
  phone: String,
  status: String
}
```

### Attendance Collection
```javascript
{
  employee: ObjectId (ref: Employee),
  fingerprintId: Number,
  date: Date,
  checkIn: {
    time: Date,
    status: String
  },
  checkOut: {
    time: Date,
    status: String
  },
  workingHours: Number,
  status: String
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Thien222**
- GitHub: [@Thien222](https://github.com/Thien222)

## 🙏 Acknowledgments

- ESP32 Arduino Core
- Adafruit Fingerprint Library
- Material-UI React Components
- MongoDB Atlas
- Express.js Framework

---

**Note**: This project is part of a graduation thesis (Khoá Luận Tốt Nghiệp) focusing on IoT-based attendance management systems.