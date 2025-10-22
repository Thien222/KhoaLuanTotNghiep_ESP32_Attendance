# 🚨 CẢNH BÁO BẢO MẬT - HÀNH ĐỘNG KHẨN CẤP

GitHub đã phát hiện **MongoDB credentials bị lộ** trong repository public!

---

## ✅ BƯỚC 1: ĐỔI MẬT KHẨU MONGODB NGAY (QUAN TRỌNG NHẤT!)

### Truy cập MongoDB Atlas:
1. Đăng nhập: https://cloud.mongodb.com/
2. Vào **Database Access** (menu bên trái)
3. Tìm user `farenabc123`
4. Click nút **Edit** bên phải user
5. Click **Edit Password**
6. Tạo mật khẩu mới (gợi ý dùng **Autogenerate Secure Password**)
7. **Copy mật khẩu mới** (quan trọng!)
8. Click **Update User**

### Hoặc tạo user mới:
1. **Delete** user cũ `farenabc123`
2. Click **Add New Database User**
3. Tạo username mới và password mới
4. Cấp quyền **Read and write to any database**
5. Click **Add User**

---

## ✅ BƯỚC 2: CẬP NHẬT MẬT KHẨU MỚI VÀO PROJECT

### Cập nhật `backend/config.env`:
```env
MONGODB_URI=mongodb+srv://NEW_USERNAME:NEW_PASSWORD@cluster0.l0erdhn.mongodb.net/fingerprint_db?retryWrites=true&w=majority&appName=Cluster0
```

**Thay `NEW_USERNAME` và `NEW_PASSWORD` bằng thông tin mới!**

---

## ✅ BƯỚC 3: XÓA CREDENTIALS KHỎI GIT HISTORY

### Option 1: Sử dụng BFG Repo-Cleaner (Khuyến nghị)

1. **Download BFG:**
   - https://rtyley.github.io/bfg-repo-cleaner/
   - Tải file `bfg-1.14.0.jar`

2. **Tạo file thay thế:**
```powershell
# Tạo file chứa text cần thay thế
"mongodb+srv://farenabc123:thien123" > passwords.txt
```

3. **Chạy BFG:**
```powershell
java -jar bfg-1.14.0.jar --replace-text passwords.txt .git
```

4. **Xóa refs cũ:**
```powershell
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

5. **Force push:**
```powershell
git push --force
```

---

### Option 2: Sử dụng git filter-branch (Cách thủ công)

```powershell
# Xóa backend/.env khỏi toàn bộ lịch sử
git filter-branch --force --index-filter `
  "git rm --cached --ignore-unmatch backend/.env README.md" `
  --prune-empty --tag-name-filter cat -- --all

# Xóa refs cũ
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
git push origin --force --tags
```

---

## ✅ BƯỚC 4: CẤU HÌNH LẠI GIT

### Thêm vào .gitignore (ĐÃ LÀM):
```
backend/config.env
backend/.env
```

### Chỉ commit file example:
```powershell
git add backend/config.env.example
git add .gitignore
git commit -m "Security: Remove credentials and add config example"
git push
```

---

## ✅ BƯỚC 5: KIỂM TRA BẢO MẬT

1. **Kiểm tra GitHub:**
   - Vào repository trên GitHub
   - Đảm bảo không còn alert màu đỏ
   - Kiểm tra file history không còn credentials cũ

2. **Kiểm tra MongoDB:**
   - Vào MongoDB Atlas → Network Access
   - Đảm bảo chỉ cho phép IP tin cậy
   - Không dùng `0.0.0.0/0` (Allow from anywhere)

3. **Thay đổi JWT_SECRET:**
```env
JWT_SECRET=NEW_RANDOM_SECRET_KEY_HERE
```

---

## 📝 CHECKLIST

- [ ] Đã đổi mật khẩu MongoDB
- [ ] Đã cập nhật `backend/config.env` với password mới
- [ ] Đã xóa credentials khỏi Git history (BFG hoặc filter-branch)
- [ ] Đã force push lên GitHub
- [ ] GitHub không còn hiển thị secret scanning alert
- [ ] Đã giới hạn IP truy cập MongoDB (Network Access)
- [ ] Đã thay JWT_SECRET mới
- [ ] Backend chạy bình thường với credentials mới

---

## ⚠️ LƯU Ý

- **KHÔNG BAO GIỜ** commit file `.env` hoặc `config.env` vào Git
- **LUÔN LUÔN** dùng file `.example` để share config structure
- Sau khi fix, **ĐỔI LẠI TẤT CẢ CREDENTIALS** để đảm bảo an toàn
- Cân nhắc enable **2FA** cho MongoDB Atlas và GitHub

---

## 🆘 NẾU CẦN TRỢ GIÚP

1. BFG không chạy → Cài Java: https://www.java.com/download/
2. Git filter-branch lỗi → Backup code trước khi chạy
3. Force push bị reject → Tắt branch protection trên GitHub (Settings → Branches)

---

**Cập nhật:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

