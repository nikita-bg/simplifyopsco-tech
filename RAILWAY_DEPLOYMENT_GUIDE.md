# 🚀 Пълен Railway Deployment Guide
## AI Voice Shopping Assistant - 3 Services

---

## 📋 **Преглед на Services:**

```
Railway Project: ai-voice-shopping-assistant
│
├─ Service 1: Backend (FastAPI)
│  ├─ Port: 8000
│  ├─ Domain: api.simplifyopsco.tech
│  └─ Start: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
│
├─ Service 2: Frontend (Next.js)
│  ├─ Port: 3000
│  ├─ Domain: simplifyopsco.tech
│  └─ Start: cd frontend && npm start
│
└─ Service 3: Shopify App (Remix)
   ├─ Port: 3001
   ├─ Domain: shopify.simplifyopsco.tech
   └─ Start: cd ai-voice-shopping-assistant && npm start
```

---

## 🎯 **DEPLOYMENT СТЪПКИ**

### **Preparation: Push код към GitHub**

```bash
git add .
git commit -m "feat: Add Railway production configuration for 3 services"
git push origin master
```

---

### **SERVICE 1: Backend (FastAPI)** 🐍

#### 1.1. Отвори Railway Dashboard
- https://railway.app/dashboard
- Избери проект: **ai-voice-shopping-assistant**

#### 1.2. Създай Backend Service
1. Кликни **"+ New Service"**
2. Избери **"GitHub Repo"**
3. Избери: **simplifyopsco-tech**
4. Service name: `backend`

#### 1.3. Configure Build Settings
**Settings → Deploy:**
- **Root Directory:** `.` (празно или root)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

#### 1.4. Environment Variables
**Settings → Variables** - Добави всички от `.env.production`:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
OPENAI_API_KEY=your_openai_api_key_here
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_client_secret_here
SHOPIFY_SCOPES=read_products,read_orders,read_customers
SHOPIFY_APP_URL=https://api.simplifyopsco.tech
HOST=0.0.0.0
DEBUG=False
ENVIRONMENT=production
DATABASE_URL=your_neon_pooled_connection_string_here
DATABASE_URL_DIRECT=your_neon_direct_connection_string_here
ENCRYPTION_KEY=your_fernet_encryption_key_here
WEBHOOK_SECRET=your_webhook_secret_here
ALLOWED_ORIGINS=https://simplifyopsco.tech,https://www.simplifyopsco.tech,https://*.up.railway.app
FRONTEND_URL=https://simplifyopsco.tech
```

#### 1.5. Custom Domain
**Settings → Networking → Custom Domain:**
- Add: `api.simplifyopsco.tech`
- Railway ще ти даде CNAME record за DNS

#### 1.6. Deploy!
- Кликни **"Deploy"** или изчакай auto-deploy
- Провери logs: **Deployments** tab → View logs
- Тествай: https://api.simplifyopsco.tech/

---

### **SERVICE 2: Frontend (Next.js)** ⚛️

#### 2.1. Създай Frontend Service
1. Кликни **"+ New Service"** (в същия проект)
2. Избери **"GitHub Repo"**
3. Избери: **simplifyopsco-tech**
4. Service name: `frontend`

#### 2.2. Configure Build Settings
**Settings → Deploy:**
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Watch Paths:** `frontend/**`

#### 2.3. Environment Variables
**Settings → Variables:**

```env
NEXT_PUBLIC_API_URL=https://api.simplifyopsco.tech
NODE_ENV=production
```

#### 2.4. Custom Domain
**Settings → Networking → Custom Domain:**
- Add: `simplifyopsco.tech`
- Add: `www.simplifyopsco.tech` (optional)

#### 2.5. Deploy!
- Auto-deploy след commit
- Тествай: https://simplifyopsco.tech/

---

### **SERVICE 3: Shopify App (Remix)** 🛍️

#### 3.1. Създай Shopify App Service
1. Кликни **"+ New Service"** (в същия проект)
2. Избери **"GitHub Repo"**
3. Избери: **simplifyopsco-tech**
4. Service name: `shopify-app`

#### 3.2. Configure Build Settings
**Settings → Deploy:**
- **Root Directory:** `ai-voice-shopping-assistant`
- **Build Command:** `npm install && npm run setup && npm run build`
- **Start Command:** `npm start`
- **Watch Paths:** `ai-voice-shopping-assistant/**`

#### 3.3. Environment Variables
**Settings → Variables:**

```env
# Shopify App Credentials
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_client_secret_here
SCOPES=read_products,read_orders,read_customers

# App URL (Railway generated or custom domain)
HOST=https://shopify.simplifyopsco.tech

# Database (Prisma uses SQLite for sessions)
DATABASE_URL=file:./prisma/dev.sqlite

# Backend API (за комуникация с FastAPI backend)
BACKEND_API_URL=https://api.simplifyopsco.tech

NODE_ENV=production
```

#### 3.4. Custom Domain
**Settings → Networking → Custom Domain:**
- Add: `shopify.simplifyopsco.tech`

#### 3.5. Deploy!
- Auto-deploy след commit
- Тествай: https://shopify.simplifyopsco.tech/

---

## 🔧 **DNS Configuration (Cloudflare/Namecheap/etc.)**

Добави CNAME records за simplifyopsco.tech:

```dns
Type    Name        Value
CNAME   api         [railway-backend-url].up.railway.app
CNAME   @           [railway-frontend-url].up.railway.app
CNAME   www         [railway-frontend-url].up.railway.app
CNAME   shopify     [railway-shopify-url].up.railway.app
```

Railway ще ти даде точните URLs в Settings → Networking.

---

## 📝 **ВАЖНО: Shopify Partners Configuration**

След deploy, отвори: https://partners.shopify.com/

### Обнови Shopify App URLs:

1. **App setup → Configuration**
2. **App URL:** `https://shopify.simplifyopsco.tech`
3. **Allowed redirection URL(s):**
   ```
   https://shopify.simplifyopsco.tech/api/auth/callback
   https://api.simplifyopsco.tech/shopify/callback
   ```

4. **App proxy (optional):**
   - Subpath: `apps/voice-assistant`
   - URL: `https://api.simplifyopsco.tech`

5. **Webhooks:**
   - Products: `https://api.simplifyopsco.tech/shopify/webhooks/products/{action}`
   - GDPR: `https://api.simplifyopsco.tech/shopify/gdpr`

---

## ✅ **Testing Checklist**

### Test 1: Backend Health
```bash
curl https://api.simplifyopsco.tech/
# Expected: {"service":"AI Voice Shopping Assistant","status":"running",...}
```

### Test 2: Frontend Loading
- Отвори: https://simplifyopsco.tech
- Провери дали Dashboard зарежда данни

### Test 3: Shopify App OAuth
- Отвори: https://shopify.simplifyopsco.tech
- Трябва да redirectne към Shopify login

### Test 4: Widget Embed
- Отвори: https://simplifyopsco.tech/install
- Въведи тестов URL
- Получи embed code
- Тествай widget-embed.js

---

## 🐛 **Troubleshooting**

### Backend не стартира:
```bash
railway logs --service backend
```
Често срещани проблеми:
- Missing environment variable
- Database connection timeout
- Port binding issue

### Frontend CORS errors:
- Провери `ALLOWED_ORIGINS` в Backend variables
- Провери `NEXT_PUBLIC_API_URL` в Frontend variables

### Shopify App не се свързва:
- Провери Shopify Partners URLs
- Провери `SHOPIFY_API_SECRET` (не API Key!)
- Провери HTTPS (Shopify изисква HTTPS)

---

## 💰 **Railway Costs**

- **Starter Plan:** $5/month
- **3 Services:** ~$10-15/month (зависи от usage)
- **Database:** Neon е external (вече настроен)

---

## 🎉 **Success Metrics**

След успешен deployment:
- ✅ Backend: https://api.simplifyopsco.tech/ → 200 OK
- ✅ Frontend: https://simplifyopsco.tech/ → Loads
- ✅ Shopify App: https://shopify.simplifyopsco.tech/ → OAuth ready
- ✅ Widget: `<script src="https://api.simplifyopsco.tech/widget-embed.js">`

---

## 📞 **Next Steps**

1. **Test в Shopify Development Store**
   - Install app-а
   - Тествай OAuth flow
   - Провери widget в theme

2. **Submit за Shopify App Store** (optional)
   - Попълни App listing
   - Privacy policy
   - Support email

3. **Marketing:**
   - Създай landing page с demo
   - Запиши demo video
   - Share в Shopify community

---

Въпроси? Питай ме! 💪
