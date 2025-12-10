# 🚀 Manual Deployment Guide

## ❗ Problem: CI/CD không tự động deploy

Code đã được push thành công lên GitHub, nhưng Vercel/Render không tự động deploy.

## 🔧 Solutions:

### **Option 1: Trigger Deploy từ Dashboard (FASTEST)**

#### **A. Deploy Frontend (Vercel):**
1. Truy cập: https://vercel.com/dashboard
2. Select project: **KhoaLuanTotNghiep_ESP32_Attendance** (hoặc tên tương tự)
3. Click **"Deployments"** tab
4. Click nút **"Redeploy"** ở deployment mới nhất
5. Hoặc click **"Deploy"** → Select branch **main** → Deploy

#### **B. Deploy Backend (Render):**
1. Truy cập: https://dashboard.render.com/
2. Select service: Backend service của bạn
3. Click tab **"Manual Deploy"**
4. Click nút **"Deploy latest commit"** (màu xanh)
5. Hoặc vào **Settings** → **Build & Deploy** → Click **"Clear build cache & deploy"**

---

### **Option 2: Force Push để trigger CI/CD**

Nếu Option 1 không work, làm empty commit để force trigger:

```bash
# Tạo empty commit
git commit --allow-empty -m "trigger deploy"

# Push lên GitHub
git push origin main
```

Sau đó đợi 2-5 phút, CI/CD sẽ tự động chạy.

---

### **Option 3: Check và Fix CI/CD Integration**

#### **Vercel:**
1. Vào https://vercel.com/dashboard
2. Select project → **Settings** → **Git**
3. Kiểm tra:
   - ✅ **Connected to GitHub:** Phải là "Connected"
   - ✅ **Branch:** main
   - ✅ **Auto Deploy:** ON (Production Branch)

Nếu không connected:
- Click **"Connect Git Repository"**
- Choose GitHub repo
- Enable auto-deploy cho branch **main**

#### **Render:**
1. Vào https://dashboard.render.com/
2. Select service → **Settings** → **Build & Deploy**
3. Kiểm tra:
   - ✅ **Auto-Deploy:** Yes
   - ✅ **Branch:** main
   - ✅ **Build Command:** npm install
   - ✅ **Start Command:** node app.js (hoặc npm start)

Nếu Auto-Deploy = No:
- Change to **"Yes"**
- Click **"Save Changes"**

---

### **Option 4: Kiểm tra GitHub Webhooks**

Có thể webhook bị disconnect:

1. Vào GitHub repo: https://github.com/YOUR_USERNAME/KhoaLuanTotNghiep_ESP32_Attendance
2. Click **Settings** → **Webhooks**
3. Kiểm tra webhooks của Vercel và Render:
   - ✅ Màu xanh đặc (green dot) = Working
   - ⚠️ Màu vàng/đỏ = Failed → Click **Edit** → **Redeliver** recent delivery

---

## ✅ Quick Test sau khi Deploy:

### **Backend (Render):**
```bash
curl https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz
```
Hoặc mở link trong browser: https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz

Expected: `{"status":"healthy","timestamp":"..."}` hoặc tương tự

### **Frontend (Vercel):**
Mở trang web và:
1. **F5 (Hard Refresh):** Ctrl + Shift + R
2. **Test mode switch:** Login admin → Button phải xuất hiện ngay
3. **Test scroll:** Navigate trang → Chỉ scroll dọc
4. **Test LLM:** ChatBot → "EMP003 đã check in chưa" → Đúng intent

---

## 📝 Recommended Steps (DO NOW):

**1. Force deploy ngay bằng Option 2:**
```bash
cd /d d:\ProjectKLTN\KhoaLuanTotNghiep_ESP32_Attendance
git commit --allow-empty -m "trigger deploy - fix CI/CD"
git push origin main
```

**2. Vào Vercel Dashboard:**
- Manual deploy project
- URL: https://vercel.com/dashboard

**3. Vào Render Dashboard:**
- Manual deploy service
- URL: https://dashboard.render.com/

**4. Đợi 5-10 phút và F5 trang web**

---

## 🔍 Common Issues:

### **Issue 1: Vercel deployment stuck**
- **Solution:** Clear build cache trong Settings → Redeploy

### **Issue 2: Render service sleeping**
- **Solution:** Mở link backend để wake upWait 30-60s

### **Issue 3: Old cache on browser**
- **Solution:** Hard refresh (Ctrl + Shift + R) hoặc Clear browser cache

### **Issue 4: Wrong branch deployed**
- **Solution:** Check Settings → Ensure branch = "main"

---

## 📞 Debug Commands:

```bash
# Check current branch
git branch

# Check remote
git remote -v

# Check if push successful
git log origin/main --oneline -5

# Force sync
git fetch origin
git reset --hard origin/main
```

---

**Status:** Waiting for manual deployment  
**Next:** Deploy via Dashboard hoặc empty commit
