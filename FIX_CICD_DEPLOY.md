# 🔄 Fix CI/CD Auto-Deploy từ GitHub

## ❌ Vấn đề: 
Code đã push lên GitHub nhưng Vercel/Render không tự động deploy

---

## 🎯 Giải pháp cho Frontend (Vercel)

### **Option 1: Trigger Manual Deploy** ⚡ Nhanh nhất

#### **Cách 1: Vercel Dashboard**
1. Truy cập: https://vercel.com/dashboard
2. Chọn project: **hrm-frontend** hoặc tương tự
3. Click tab **Deployments**
4. Click **Redeploy** button
5. Chọn **Use existing Build Cache** → **Redeploy**

#### **Cách 2: Vercel CLI**
```bash
# Di chuyển vào frontend folder
cd frontend

# Deploy manually
vercel --prod

# Hoặc force rebuild
vercel --prod --force
```

---

### **Option 2: Enable Auto-Deploy** 🔄

#### **Kiểm tra Git Integration:**
1. Vào Vercel Dashboard → Project Settings
2. Tab **Git**
3. Kiểm tra:
   - ✅ **Production Branch:** `main` hoặc `master`
   - ✅ **Auto-deploy:** Enabled
   - ✅ **Deploy Hooks:** (optional)

#### **Nếu chưa kết nối GitHub:**
1. Vercel Dashboard → Add New Project
2. Import Git Repository
3. Chọn GitHub repo
4. **Root Directory:** `frontend` (nếu cần)
5. **Build Command:** `npm run build`
6. **Output Directory:** `build`
7. Deploy!

---

### **Option 3: Deploy Hook (Webhook)** 🪝

Nếu muốn trigger deploy bằng URL:

1. **Tạo Deploy Hook:**
   - Vercel Dashboard → Settings → Git → Deploy Hooks
   - Click **Create Hook**
   - Name: `manual-deploy`
   - Branch: `main`
   - Copy URL

2. **Trigger deploy:**
```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy/[YOUR_HOOK_URL]"
```

---

## 🎯 Giải pháp cho Backend (Render)

### **Option 1: Trigger Manual Deploy** ⚡

#### **Cách 1: Render Dashboard**
1. Truy cập: https://dashboard.render.com
2. Chọn service: **khoaluantotnghiep-esp32-attendance**
3. Click **Manual Deploy** → **Deploy latest commit**

#### **Cách 2: Trigger từ Git**
```bash
# Push empty commit để trigger deploy
git commit --allow-empty -m "Trigger Render deploy"
git push origin main
```

---

### **Option 2: Enable Auto-Deploy**

#### **Kiểm tra settings:**
1. Render Dashboard → Service → Settings
2. Tab **Build & Deploy**
3. Kiểm tra:
   - ✅ **Auto-Deploy:** Yes
   - ✅ **Branch:** `main`
   - ✅ **Root Directory:** `backend` (nếu có)

#### **Nếu Auto-Deploy bị tắt:**
1. Settings → Build & Deploy
2. **Auto-Deploy:** Toggle ON
3. Save Changes

---

## 🔍 Troubleshooting

### **1. Code đã push nhưng không deploy**

**Nguyên nhân:**
- Auto-deploy bị tắt
- Branch khác với production branch
- Build failed (check logs)

**Giải pháp:**
```bash
# 1. Check branch hiện tại
git branch

# 2. Đảm bảo đang ở main/master
git checkout main

# 3. Pull latest
git pull origin main

# 4. Push again
git push origin main

# 5. Nếu vẫn không deploy, trigger manual (xem trên)
```

---

### **2. Build thành công nhưng code cũ**

**Nguyên nhân:**
- Cache cũ
- Build cache chưa clear

**Giải pháp:**

#### **Vercel:**
```bash
# Force rebuild without cache
vercel --prod --force
```

Hoặc trong Vercel Dashboard:
- Redeploy → **Clear cache and redeploy**

#### **Render:**
- Dashboard → Manual Deploy → **Clear build cache & deploy**

---

### **3. Deploy failed**

**Kiểm tra logs:**

#### **Vercel:**
- Dashboard → Deployments → Click vào deployment → View Logs

#### **Render:**
- Dashboard → Service → Logs tab

**Common errors:**
- ❌ Build command fail → Check `package.json` scripts
- ❌ Dependencies missing → Run `npm install`
- ❌ Environment variables → Check Settings

---

## 📋 Checklist Deploy mới

Mỗi lần update code:

### **Frontend (Vercel):**
```bash
# 1. Make changes
# 2. Test local
cd frontend
npm start

# 3. Build test
npm run build

# 4. Commit & push
git add .
git commit -m "Update: [description]"
git push origin main

# 5. Wait for auto-deploy (2-3 phút)
# OR trigger manual if needed
```

### **Backend (Render):**
```bash
# 1. Make changes
# 2. Test local
cd backend
npm start

# 3. Commit & push
git add .
git commit -m "Update: [description]"
git push origin main

# 4. Render auto-deploys (5-10 phút)
# OR trigger manual in dashboard
```

---

## 🚀 Quick Commands

### **Deploy Frontend (Vercel):**
```bash
cd frontend
vercel --prod
```

### **Deploy Backend (Trigger Render):**
```bash
git commit --allow-empty -m "Deploy backend"
git push origin main
```

### **Check Deployment Status:**

**Vercel:**
```bash
vercel ls
```

**Render:**
- Check dashboard hoặc
- Check webhook logs

---

## 💡 Best Practices

1. **Always test local first**
   ```bash
   npm run build
   npm start
   ```

2. **Use meaningful commit messages**
   ```bash
   git commit -m "feat: Add new feature X"
   git commit -m "fix: Fix bug in Y"
   ```

3. **Check deployment logs**
   - Vercel: Dashboard → Deployments → Logs
   - Render: Dashboard → Logs tab

4. **Monitor build time**
   - Vercel: ~2-3 phút
   - Render: ~5-10 phút

5. **Enable notifications**
   - Vercel: Email on failed deployment
   - Render: Slack/Discord webhooks

---

## 🔗 Quick Links

| Service | Dashboard | Docs |
|---------|-----------|------|
| **Vercel** | https://vercel.com/dashboard | https://vercel.com/docs |
| **Render** | https://dashboard.render.com | https://render.com/docs |

---

## 📞 Support

Nếu vẫn gặp vấn đề:
1. Check service status
2. Review deployment logs
3. Clear cache và redeploy
4. Contact support nếu là platform issue

---

**Tạo:** 2025-12-10  
**Update:** Mỗi khi có vấn đề deploy
