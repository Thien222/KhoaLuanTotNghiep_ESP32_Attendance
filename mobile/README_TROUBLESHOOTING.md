# Troubleshooting Guide

## Lỗi PlatformConstants / TurboModuleRegistry

Nếu gặp lỗi `PlatformConstants could not be found`:

1. **Xóa cache và restart:**
```bash
# Xóa cache
npx expo start --clear

# Hoặc xóa thủ công
Remove-Item -Recurse -Force .expo
npm start -- --clear
```

2. **Reinstall dependencies:**
```bash
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps
```

3. **Trong Expo Go app:**
   - Đóng app hoàn toàn
   - Mở lại và quét QR code mới

## Lỗi Module Not Found

Nếu thiếu module:
- Đảm bảo đã chạy `npm install`
- Kiểm tra `package.json` có module đó không
- Xóa `node_modules` và cài lại

## Lỗi SDK Version Mismatch

Nếu Expo Go báo lỗi SDK version:
- Kiểm tra `app.json` có `sdkVersion: "54.0.0"`
- Đảm bảo `package.json` có `expo: "~54.0.0"`
- Update Expo Go app trên điện thoại lên version mới nhất







