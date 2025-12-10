# 📱 Deploy Mobile App - Kết nối Backend Production

## 🎯 Vấn đề hiện tại
- Mobile app đang hardcode URL backend local: `http://192.168.1.164:3000/api`
- Mỗi lần đổi WiFi phải sửa code và rebuild
- Cần kết nối với backend đã deploy trên Render

---

## ✅ Giải pháp: Sử dụng Backend Production URL

### **Bước 1: Cập nhật config.js**

File: `mobile/config.js`

```javascript
// API Configuration
// Production backend URL (Render)
const PRODUCTION_API_URL = 'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';

// Development backend URL (Local)
const DEVELOPMENT_API_URL = 'http://192.168.1.164:3000/api';

// Automatically use production URL
// If you want to test locally, change __DEV__ to false
const IS_DEV_MODE = false; // Set to false for production builds

export const getAPIUrl = () => {
  return IS_DEV_MODE ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;
};

export const API_CONFIG = {
  baseURL: getAPIUrl(),
  timeout: 30000, // Increased for production (Render may need time to wake up)
};
```

**Giải thích:**
- `PRODUCTION_API_URL`: URL backend đã deploy trên Render
- `DEVELOPMENT_API_URL`: URL local để test (khi cần)
- `IS_DEV_MODE`: Switch giữa dev và production
  - `false` → Dùng production (Render)
  - `true` → Dùng local

---

### **Bước 2: Build và Deploy Mobile App**

#### **Option 1: Build APK (Android) với Expo** ⭐ Khuyến nghị

1. **Cài đặt Expo CLI (nếu chưa có)**
```bash
npm install -g eas-cli
```

2. **Login vào Expo**
```bash
eas login
```

3. **Cấu hình EAS Build**

Tạo/cập nhật file `mobile/eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

4. **Build APK**
```bash
cd mobile
eas build --platform android --profile production
```

5. **Tải APK**
- Sau khi build xong, Expo sẽ cung cấp link download APK
- Tải về và cài đặt trên điện thoại Android

---

#### **Option 2: Build Local với Expo (Nhanh hơn)** 🚀

1. **Build APK local**
```bash
cd mobile
npx expo export --platform android
```

2. **Tạo APK bằng Android Studio**
- Cần cài Android Studio
- Có thể compile thành APK để cài đặt trực tiếp

---

#### **Option 3: Publish lên Expo Go** 📲 Dùng cho test nhanh

1. **Publish app**
```bash
cd mobile
npx expo publish
```

2. **Sử dụng**
- Cài app **Expo Go** từ Google Play / App Store
- Scan QR code để chạy app
- **Lưu ý**: Cần internet để load app từ Expo servers

---

### **Bước 3: Tối ưu cho Production**

#### **3.1. Tăng timeout cho API**

File: `mobile/services/api.js`

```javascript
const api = axios.create({
  baseURL: getAPIUrl(),
  timeout: 30000, // 30 seconds (Render free tier cần thời gian wake up)
  headers: {
    'Content-Type': 'application/json',
  },
});
```

#### **3.2. Thêm retry logic cho Network errors**

Thêm vào `mobile/services/api.js`:

```javascript
// Add retry logic for network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Retry on network error (max 3 times)
    if (error.message === 'Network Error' && !config._retry) {
      config._retry = true;
      config._retryCount = config._retryCount || 0;
      
      if (config._retryCount < 3) {
        config._retryCount++;
        console.log(`Retry attempt ${config._retryCount}...`);
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return api(config);
      }
    }
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    
    return Promise.reject(error);
  }
);
```

---

## 🎨 Giải pháp nâng cao: Settings Screen

Nếu muốn cho phép user thay đổi backend URL trong app (không cần rebuild):

### **Tạo Settings Screen**

File: `mobile/screens/SettingsScreen.js`

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    loadApiUrl();
  }, []);

  const loadApiUrl = async () => {
    const url = await AsyncStorage.getItem('api_url');
    if (url) {
      setApiUrl(url);
    } else {
      setApiUrl('https://khoaluantotnghiep-esp32-attendance.onrender.com/api');
    }
  };

  const saveApiUrl = async () => {
    await AsyncStorage.setItem('api_url', apiUrl);
    alert('API URL saved! Please restart the app.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>Backend API URL:</Text>
      <TextInput
        style={styles.input}
        value={apiUrl}
        onChangeText={setApiUrl}
        placeholder="Enter backend URL"
      />
      <Button title="Save" onPress={saveApiUrl} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
});

export default SettingsScreen;
```

### **Cập nhật config.js để đọc từ AsyncStorage**

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTION_API_URL = 'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';
const DEVELOPMENT_API_URL = 'http://192.168.1.164:3000/api';

export const getAPIUrl = async () => {
  try {
    const savedUrl = await AsyncStorage.getItem('api_url');
    if (savedUrl) {
      return savedUrl;
    }
  } catch (error) {
    console.error('Error getting saved API URL:', error);
  }
  
  // Default to production
  return PRODUCTION_API_URL;
};
```

---

## 📊 So sánh các phương pháp Build

| Phương pháp | Ưu điểm | Nhược điểm | Khuyến nghị |
|-------------|---------|------------|-------------|
| **EAS Build** | - APK chính thức<br>- Tự động sign<br>- Có thể publish lên Store | - Cần account Expo<br>- Build trên cloud (chậm hơn) | ⭐⭐⭐⭐⭐ Production |
| **Expo Go** | - Nhanh nhất<br>- Không cần build<br>- Update realtime | - Cần Expo Go app<br>- Cần internet<br>- Không phải standalone | ⭐⭐⭐ Testing |
| **Local Build** | - Build nhanh<br>- Không phụ thuộc cloud | - Cần setup Android SDK<br>- Phức tạp hơn | ⭐⭐ Development |

---

## 🚀 Quy trình Deploy Hoàn chỉnh

### **1. Development → Production**

```bash
# Bước 1: Cập nhật config
# Set IS_DEV_MODE = false trong config.js

# Bước 2: Test local trước
cd mobile
npm start

# Bước 3: Build APK
eas build --platform android --profile production

# Bước 4: Download và test APK

# Bước 5: (Optional) Publish lên Google Play Store
```

### **2. Cập nhật nhanh (OTA Update)**

Nếu dùng Expo, có thể update app mà không cần rebuild:

```bash
cd mobile
npx expo publish
```

User chỉ cần mở app, nó sẽ tự động download update mới!

---

## 📱 Tải và cài đặt APK

### **Cho người dùng:**

1. **Enable "Unknown Sources"**
   - Settings → Security → Unknown Sources → Enable

2. **Download APK**
   - Link từ EAS Build hoặc file APK trực tiếp

3. **Cài đặt**
   - Tap vào file APK → Install

---

## 🔗 URLs sau khi deploy

| Service | URL |
|---------|-----|
| **Backend** | https://khoaluantotnghiep-esp32-attendance.onrender.com/api |
| **Web Frontend** | https://build-bzy75d4zg-thien222s-projects.vercel.app |
| **Mobile App** | APK file hoặc Expo Go QR code |

---

## 💡 Tips

1. **Test backend trước:**
   ```bash
   curl https://khoaluantotnghiep-esp32-attendance.onrender.com/api/test
   ```

2. **Wake up backend trước khi test mobile:**
   - Truy cập web frontend hoặc backend URL
   - Đợi 30 giây để backend wake up

3. **Debug network issues:**
   - Check console logs trong `api.js`
   - Test với Postman trước

4. **Version control:**
   - Update version trong `package.json` và `app.json` mỗi lần build

---

**Tác giả:** Antigravity AI  
**Ngày tạo:** 2025-12-10
