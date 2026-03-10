# 🚂 Deploy ЦЯЛОТО приложение на Railway

## Защо Railway е по-добър за това?

✅ Поддържа Python backend (FastAPI)
✅ Поддържа Node.js frontend (Next.js)
✅ Всичко на едно място
✅ Автоматичен HTTPS
✅ Custom domains (free)
✅ Лесна конфигурация

---

## 🎯 Deploy Backend + Frontend на Railway

### Вариант A: Monorepo (Едно Railway Service)

Railway може да deploy-не и двете от един repo, но е по-добре да използваш 2 services.

### Вариант B: Два Services (ПРЕПОРЪЧВАМ)

Създай 2 отделни services в Railway:
1. Backend Service (Python/FastAPI)
2. Frontend Service (Node.js/Next.js)

---

## 📋 Стъпка по Стъпка

### ЧАСТ 1: Setup Railway Account

1. **Отвори:** https://railway.app/
2. **Sign up** with GitHub
3. **Create New Project**

---

### ЧАСТ 2: Deploy Backend (Service 1)

**Стъпка 1:** В Railway project, кликни **"+ New"**

**Стъпка 2:** Избери **"GitHub Repo"** → `simplifyopsco-tech`

**Стъпка 3:** Railway ще detect-не Python и ще deploy-не

**Стъпка 4:** Configure Settings

Кликни на service → **Settings**:

- **Root Directory:** `/` (default)
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

**Стъпка 5:** Add Environment Variables

Кликни **Variables** → **Raw Editor**:

```env
OPENAI_API_KEY=твоят_openai_ключ
ELEVENLABS_API_KEY=твоят_elevenlabs_ключ
ENVIRONMENT=production
DEBUG=False
WEBHOOK_SECRET=генериран_secret
ALLOWED_ORIGINS=https://simplifyopsco.tech,${{RAILWAY_PUBLIC_DOMAIN}}
```

**Стъпка 6:** Enable Public Domain

Settings → **Networking** → **Generate Domain**

Копирай URL-а (напр. `backend-production-abc123.up.railway.app`)

✅ **Backend е готов!**

---

### ЧАСТ 3: Deploy Frontend (Service 2)

**Стъпка 1:** В същия Railway project, кликни **"+ New"** → **"GitHub Repo"**

Избери **СЪЩОТО** repo: `simplifyopsco-tech`

**Стъпка 2:** Configure Frontend Settings

Кликни на новия service → **Settings**:

- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

**Стъпка 3:** Remove Static Export

Railway може да пусне Next.js със SSR, така че обнови `frontend/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Remove 'output: export' for Railway SSR support
};

export default nextConfig;
```

**Стъпка 4:** Add Environment Variables

В frontend service → **Variables**:

```env
NEXT_PUBLIC_API_URL=https://твоят-backend-railway-url.up.railway.app
```

**Стъпка 5:** Enable Public Domain

Settings → **Networking** → **Generate Domain**

**Стъпка 6:** Add Custom Domain (simplifyopsco.tech)

Settings → **Networking** → **Custom Domain** → Добави `simplifyopsco.tech`

Railway ще ти даде CNAME записи за DNS:

```
CNAME: simplifyopsco.tech → твоят-frontend.up.railway.app
```

✅ **Frontend е готов!**

---

## 🎉 Готово! Тествай:

1. **Backend API:** https://твоят-backend.up.railway.app/
2. **Frontend:** https://simplifyopsco.tech
3. **Dashboard:** https://simplifyopsco.tech/dashboard

---

## 💰 Цена на Railway

- **Free Trial:** $5 credit
- **После:** ~$5-10/month за двете services
- **Custom Domain:** Free

---

## 🔄 Auto-Deploy при Git Push

Railway автоматично ще re-deploy и backend и frontend при всеки `git push`!

```bash
git add .
git commit -m "Update feature"
git push
```

→ Railway deploy-ва автоматично! 🚀

---

## ⚡ Бърз Deploy (Сега!)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link project
railway link

# 4. Deploy backend
railway up

# 5. Deploy frontend (от frontend/ директория)
cd frontend
railway up
```

---

## 🆚 Railway vs Netlify + Railway

| Feature | Railway (Цялото app) | Netlify (Frontend) + Railway (Backend) |
|---------|---------------------|----------------------------------------|
| Setup време | 10 минути | 20 минути |
| Цена | $5-10/месец | $5/месец (Railway) + Free (Netlify) |
| Управление | 1 dashboard | 2 dashboards |
| Auto-deploy | ✅ | ✅ |
| Custom domain | ✅ Free | ✅ Free (Netlify) |
| Python support | ✅ | ❌ (само Railway) |

**Препоръка:** Railway за цялото приложение е по-просто! 🎯

---

## 🔧 Troubleshooting

### Frontend не намира Backend

Провери:
- `NEXT_PUBLIC_API_URL` в frontend service variables
- CORS settings в backend `ALLOWED_ORIGINS`

### Build Failed

Railway logs:
```bash
railway logs
```

Често срещани причини:
- Липсва `package.json` (frontend)
- Липсва `requirements.txt` (backend)
- Wrong root directory

---

## ✅ Success Checklist

Backend:
- [ ] Deploy-нат на Railway
- [ ] Public domain generated
- [ ] Environment variables добавени
- [ ] Health check работи (`/` endpoint)

Frontend:
- [ ] Deploy-нат на Railway
- [ ] Root directory = `frontend`
- [ ] `NEXT_PUBLIC_API_URL` конфигуриран
- [ ] Custom domain (simplifyopsco.tech) добавен
- [ ] DNS CNAME добавен

---

Въпроси? Питай ме! 💪
