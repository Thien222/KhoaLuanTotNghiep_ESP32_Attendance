# 🚀 Quick Start: Build APK cho Android

## ✅ Cách nhanh nhất để có APK

### **Option 1: Build với EAS (Expo)** ⭐ Khuyến nghị

```bash
# Bước 1: Cài EAS CLI (chỉ cần 1 lần)
npm install -g eas-cli

# Bước 2: Di chuyển vào thư mục mobile
cd mobile

# Bước 3: Login Expo (tạo account miễn phí tại expo.dev)
eas login

# Bước 4: Build APK
eas build --platform android --profile production

# Sau khi build xong (5-10 phút), tải APK về và cài đặt
```

---

### **Option 2: Test nhanh với Expo Go** 📲

```bash
# Bước 1: Cài Expo Go trên điện thoại
# - Android: Google Play Store
# - iOS: App Store

# Bước 2: Start app
cd mobile
npx expo start

# Bước 3: Scan QR code bằng Expo Go app
```

---

## 📱 Cài đặt APK trên điện thoại

1. **Enable cài đặt từ nguồn không xác định**
   - Vào **Settings** → **Security** → Enable **Unknown Sources**

2. **Download APK** 
   - Link từ EAS build hoặc transfer file trực tiếp

3. **Cài đặt**
   - Tap vào file APK → **Install**

---

## 🔄 Update app sau này

### **Nếu dùng EAS Build:**
```bash
# Rebuild APK
cd mobile
eas build --platform android --profile production
```

### **Nếu dùng Expo Go:**
- App tự động update khi bạn `npx expo start`
- Không cần làm gì cả!

---

## 💡 Lưu ý

### **Backend đã wake up chưa?**
Trước khi test mobile app, hãy:
1. Mở web: https://build-bzy75d4zg-thien222s-projects.vercel.app
2. Hoặc truy cập: https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz
3. Đợi 30 giây để backend wake up

### **Config hiện tại:**
- ✅ Backend URL: `https://khoaluantotnghiep-esp32-attendance.onrender.com/api`
- ✅ Timeout: 30 giây (cho phép backend wake up)
- ✅ Auto-retry on network errors

---

## 📊 Build thành công?

Sau khi build, bạn sẽ có:
- ✅ File APK (Android)
- ✅ Link download từ Expo
- ✅ QR code để cài đặt

Share APK cho users và họ có thể cài đặt ngay!

---

**Build time:** ~5-10 phút (EAS) | ~instant (Expo Go)
