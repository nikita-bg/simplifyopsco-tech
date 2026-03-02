# 🚀 Netlify Deployment - Step by Step Guide

## Problem: Getting 404 Error

You're seeing a 404 error because Netlify doesn't know where to find the built files. Here's how to fix it:

---

## ✅ Solution: Configure Netlify Properly

### Step 1: Go to Netlify Dashboard

1. Open https://app.netlify.com/
2. Select your site: **simplifyopsco-tech** (or the site connected to simplifyopsco.tech)

---

### Step 2: Update Build Settings

Click **Site configuration** → **Build & deploy** → **Continuous deployment** → **Edit settings**

**Set these EXACT values:**

```
Base directory:          frontend
Build command:           npm run build
Publish directory:       frontend/out
```

⚠️ **IMPORTANT:** Make sure there are NO typos!

---

### Step 3: Clear Cache & Redeploy

1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait 2-3 minutes for build to complete

---

### Step 4: Check Build Log

After deployment starts:

1. Click on the deploying build (it will say "Building...")
2. Click **Deploy log**
3. Look for these SUCCESS indicators:

```
✓ Compiled successfully
✓ Generating static pages
Route (app)
  ○ /
  ○ /dashboard
  ○ /pricing
```

If you see errors, copy them and send them to me!

---

## 🔧 Alternative: Use Netlify CLI (Faster!)

If the above doesn't work, deploy directly via CLI:

### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 2. Login to Netlify

```bash
netlify login
```

### 3. Link to Existing Site

```bash
netlify link
```

Select your **simplifyopsco-tech** site from the list.

### 4. Deploy!

```bash
cd frontend
npm run build
netlify deploy --prod --dir=out
```

This will deploy directly and give you a URL!

---

## 📋 Troubleshooting Checklist

If still getting 404:

- [ ] Build settings use `frontend` as base directory
- [ ] Publish directory is `frontend/out` (NOT just `out`)
- [ ] Build command is `npm run build`
- [ ] Cleared Netlify cache before deploying
- [ ] Build log shows "Compiled successfully"
- [ ] Build log shows "Generating static pages"
- [ ] No errors in build log

---

## 🎯 Expected Result

After successful deployment, you should see:

- **https://simplifyopsco.tech** → Landing page with "AI Voice Receptionist"
- **https://simplifyopsco.tech/dashboard** → Dashboard with analytics
- **https://simplifyopsco.tech/pricing** → Pricing page

---

## 🆘 Still Not Working?

Send me:
1. Screenshot of Build settings page
2. Full build log from Netlify
3. Any error messages you see

I'll help you debug! 🔍
