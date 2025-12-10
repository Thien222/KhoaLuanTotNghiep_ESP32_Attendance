# 🚀 DEPLOY PRODUCTION - COMPLETE GUIDE

## ❗ CURRENT SITUATION:
- ✅ Backend (Render): Deployed successfully
- ❌ Frontend (Vercel): NOT auto-deploying (stuck at old code from 16h ago)
- 🎯 Goal: Deploy ALL fixes to production NOW

---

## 🔥 IMMEDIATE SOLUTION - 3 METHODS:

### **METHOD 1: Install Vercel CLI & Deploy (FASTEST - 5 minutes)**

#### Step 1: Install Vercel CLI
```powershell
npm install -g vercel
```

#### Step 2: Login to Vercel
```powershell
vercel login
```
→ Follow browser prompts to authenticate

#### Step 3: Deploy to Production
```powershell
cd d:\ProjectKLTN\KhoaLuanTotNghiep_ESP32_Attendance\frontend
vercel --prod
```

Done! Deployment URL will be shown instantly.

---

### **METHOD 2: Manual Deploy via Vercel Dashboard (RECOMMENDED)**

#### Step 1: Go to Vercel Dashboard
URL: https://vercel.com/dashboard

#### Step 2: Find your project
Click on project: **KhoaLuanTotNghiep_ESP32_Attendance** (or similar name)

#### Step 3: Redeploy
**Option A: From Deployments Tab**
1. Click **"Deployments"** tab
2. Click **"..."** menu on latest deployment
3. Select **"Redeploy"**
4. Confirm

**Option B: Create New Deployment**
1. Click **"Deployments"** tab
2. Click **"..." menu** (top right)
3. Select **"Create Deployment"**
4. Branch: `main`
5. Click **"Deploy"**

Wait 2-3 minutes → Done!

---

### **METHOD 3: Fix Git Integration & Auto-Deploy (PERMANENT FIX)**

#### Step 1: Disconnect & Reconnect Git
1. Go to: https://vercel.com/dashboard → Select project
2. **Settings** → **Git**
3. Scroll to **"Connected Git Repository"**
4. Click **"Disconnect"** (if showing)
5. Click **"Connect Git Repository"**
6. Select **GitHub** → Authorize
7. Choose repository: **KhoaLuanTotNghiep_ESP32_Attendance**

#### Step 2: Configure Auto-Deploy
1. **Settings** → **Git** → **Production Branch**
2. Set to: `main`
3. **Auto-deploys**: Toggle **ON**
4. **Ignored Build Step**: Leave EMPTY or set to `false`
5. Click **"Save"**

#### Step 3: Trigger First Auto-Deploy
```bash
cd d:\ProjectKLTN\KhoaLuanTotNghiep_ESP32_Attendance
git commit --allow-empty -m "trigger vercel deploy"
git push origin main
```

Wait 3-5 minutes → Vercel will auto-deploy!

---

## 🔧 ALTERNATIVE: Deploy via GitHub Actions (ADVANCED)

If Vercel integration keeps failing, use GitHub Actions:

### Create workflow file:
File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Vercel

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install Vercel CLI
        run: npm install -g vercel
      
      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./frontend
      
      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./frontend
      
      - name: Deploy to Vercel
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./frontend
```

Then add `VERCEL_TOKEN` secret in GitHub repo settings.

---

## ✅ VERIFICATION CHECKLIST:

### After deployment completes:

#### 1. Check Deployment Status
- [ ] Vercel Dashboard → Deployments → Status = "Ready"
- [ ] Latest commit hash matches your local

#### 2. Test Frontend
```bash
# Open frontend URL (from Vercel)
# Hard refresh: Ctrl + Shift + R

# Test fixes:
- [ ] Mode switch button appears on login (no F5)
- [ ] No horizontal scroll
- [ ] LLM chatbot: "EMP003 đã check in chưa" → correct answer
```

#### 3. Test Backend
```bash
# Wake up backend (Render free tier sleeps)
curl https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz

# Should return: {"status":"healthy",...}
```

#### 4. Test Socket Features
- [ ] Chat real-time works
- [ ] Unread badge shows count
- [ ] Online/offline status works
- [ ] Notifications pop up

#### 5. Test Mobile App
```bash
# Make sure mobile config.js points to production backend
# File: mobile/config.js

export const IS_DEV_MODE = false; // Set to false
export const PRODUCTION_API_URL = 'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';
```

Rebuild mobile app if needed:
```bash
cd mobile
eas build --platform android --profile production
```

---

## 🆘 TROUBLESHOOTING:

### Issue 1: Vercel deployment fails
**Solution:**
1. Check build logs in Vercel Dashboard
2. Common issue: Missing environment variables
   - Go to **Settings → Environment Variables**
   - Add required vars (e.g., `REACT_APP_API_URL`)

### Issue 2: 404 on deployed site
**Solution:**
1. Check **Settings → General → Root Directory**
   - Should be: `frontend` (if your React app is in frontend folder)
2. Check **Settings → General → Framework Preset**
   - Should be: `Create React App` or `Vite` (depending on your setup)

### Issue 3: Old code still showing
**Solution:**
1. **Clear build cache:**
   - Settings → General → Scroll down
   - Click **"Clear Build Cache"**
   - Redeploy

### Issue 4: Auto-deploy still not working
**Solution:**
1. Check GitHub webhooks:
   - GitHub repo → Settings → Webhooks
   - Find Vercel webhook → Check recent deliveries
   - If failing: Click "Redeliver"

---

## 📱 MOBILE APP CONFIGURATION:

### Update mobile/config.js for production:

```javascript
// mobile/config.js
const IS_DEV_MODE = false; // IMPORTANT: Set to false for production

const LOCAL_IP = '192.168.1.164'; // Your local IP (for dev only)
const PRODUCTION_API_URL = 'https://khoaluantotnghiep-esp32-attendance.onrender.com/api';

export const getAPIUrl = () => {
  if (IS_DEV_MODE) {
    return `http://${LOCAL_IP}:3000/api`;
  }
  return PRODUCTION_API_URL;
};

export { IS_DEV_MODE };
```

---

## 🎯 RECOMMENDED WORKFLOW:

**For immediate deploy (NOW):**
→ Use **METHOD 2** (Manual deploy via dashboard)

**For permanent fix (LATER):**
→ Use **METHOD 3** (Fix Git integration)

**For advanced users:**
→ Use **METHOD 1** (Vercel CLI) - fastest for future deploys

---

## 📞 NEED HELP?

If deployment still fails:

1. **Check Vercel build logs:**
   - Dashboard → Deployments → Click failed deployment → "View logs"
   
2. **Check Render logs:**
   - Dashboard → Service → "Logs" tab
   
3. **Verify environment variables:**
   - Vercel: Settings → Environment Variables
   - Render: Settings → Environment

4. **Test locally first:**
   ```bash
   cd frontend
   npm install
   npm run build
   npm start
   ```

---

## ⚡ QUICK COMMANDS REFERENCE:

```bash
# Deploy frontend (Vercel CLI)
cd frontend && vercel --prod

# Check backend status
curl https://khoaluantotnghiep-esp32-attendance.onrender.com/healthz

# Force Git push trigger
git commit --allow-empty -m "deploy" && git push

# Rebuild mobile
cd mobile && eas build --platform android --profile production

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]
```

---

**PRIORITY: Use METHOD 2 RIGHT NOW to deploy immediately!**

Then fix Git integration later using METHOD 3.
