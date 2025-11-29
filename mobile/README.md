# HR Management Mobile App

Mobile application for HR Management System built with React Native and Expo.

## Features

- 🔐 Authentication (Login/Logout)
- 📊 Dashboard with today's attendance and quick stats
- ⏰ Attendance tracking (View history, Check-in/Check-out)
- 💰 Payroll viewing (Monthly salary breakdown)
- 📅 Leave management (Apply, view, cancel leave requests)
- 👤 Profile management

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure API URL in `config.js`:
```javascript
const DEFAULT_API_URL = 'http://YOUR_SERVER_IP:3000/api';
```

3. Start the app:
```bash
npm start
```

4. Scan QR code with Expo Go app on your phone

## Project Structure

```
mobile/
├── screens/          # Screen components
│   ├── auth/        # Login screen
│   ├── HomeScreen.js
│   ├── AttendanceScreen.js
│   ├── PayrollScreen.js
│   ├── LeaveScreen.js
│   └── ProfileScreen.js
├── navigation/       # Navigation setup
├── services/         # API services
├── contexts/         # React contexts (Auth)
└── config.js         # Configuration
```

## API Integration

The app connects to the same backend as the web frontend. Make sure:
- Backend is running on port 3000
- CORS is configured to allow mobile app requests
- API endpoints match the backend routes

## Notes

- Date picker in ApplyLeaveScreen needs to be implemented with a proper date picker component
- Some features may need additional backend endpoints
- Test on both iOS and Android devices







