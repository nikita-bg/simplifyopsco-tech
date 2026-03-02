# 🚀 Пълен Deployment - Backend + Frontend

## Архитектура

```
┌─────────────────────────────────────────┐
│  simplifyopsco.tech (Netlify)          │
│  Frontend: Next.js                      │
└───────────────┬─────────────────────────┘
                │ API Calls
                ↓
┌─────────────────────────────────────────┐
│  *.up.railway.app (Railway)            │
│  Backend: FastAPI + Python              │
└─────────────────────────────────────────┘
```

---

## ЧАСТ 1: Deploy Backend на Railway (15 мин)

### Стъпка 1: Създай Railway Account

1. Отвори: https://railway.app/
2. Sign up with GitHub
3. Authorize Railway да достъпва твоите repos

### Стъпка 2: Create New Project

1. Кликни **"New Project"**
2. Избери **"Deploy from GitHub repo"**
3. Намери и избери: **`simplifyopsco-tech`**
4. Railway автоматично ще detect-не Python и ще започне build

### Стъпка 3: Configure Environment Variables

След като проектът е създаден:

1. Кликни на твоя service → **Variables** таб
2. Добави тези променливи:

```env
OPENAI_API_KEY=твоят_нов_openai_ключ_тук
ELEVENLABS_API_KEY=твоят_elevenlabs_ключ
ENVIRONMENT=production
DEBUG=False
WEBHOOK_SECRET=генерирай_силен_secret_тук
ALLOWED_ORIGINS=https://simplifyopsco.tech,https://www.simplifyopsco.tech
```

**За генериране на WEBHOOK_SECRET:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Стъпка 4: Deploy!

Railway автоматично ще build-не и deploy-не backend-а!

След няколко минути ще получиш URL като:
```
https://simplifyopsco-tech-production.up.railway.app
```

### Стъпка 5: Test Backend

Отвори в браузър:
```
https://твоят-railway-url.up.railway.app/
```

Трябва да видиш:
```json
{
  "service": "AI Voice Receptionist",
  "status": "running",
  "version": "2.0.0",
  "conversations_count": 8
}
```

✅ **Backend е готов!** Копирай Railway URL-а, ще ти трябва за frontend.

---

## ЧАСТ 2: Deploy Frontend на Netlify (10 мин)

### Стъпка 1: Update Frontend API URL

Сега че backend е на Railway, трябва да кажем на frontend-а къде е API-то.

В Netlify dashboard:

1. Отвори твоя site → **Site configuration** → **Environment variables**
2. Добави:

```
NEXT_PUBLIC_API_URL=https://твоят-railway-url.up.railway.app
```

**ВАЖНО:** Замени `твоят-railway-url.up.railway.app` с реалния Railway URL!

### Стъпка 2: Update Build Settings

В Netlify → **Build & deploy** → **Continuous deployment**:

```
Base directory:    frontend
Build command:     npm run build
Publish directory: frontend/out
```

### Стъпка 3: Deploy Frontend

1. Кликни **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
2. Изчакай 2-3 минути
3. Отвори https://simplifyopsco.tech

✅ **Frontend е готов!**

---

## ЧАСТ 3: Свързване на Backend и Frontend

### Провери че CORS е правилен

В Railway environment variables, провери:

```
ALLOWED_ORIGINS=https://simplifyopsco.tech,https://www.simplifyopsco.tech
```

Ако не е така, обнови и redeploy backend-а.

---

## 🧪 Тестване на Интеграцията

### Test 1: Frontend Loading

Отвори https://simplifyopsco.tech

Трябва да видиш:
- ✅ Landing page се зарежда
- ✅ Навигация работи (Home, Dashboard, Pricing)

### Test 2: Backend API Connection

Отвори https://simplifyopsco.tech/dashboard

В Developer Console (F12) провери Network tab:
- ✅ Заявки към Railway backend (напр. `/api/dashboard/stats`)
- ✅ Status Code: 200 OK
- ✅ Данни се зареждат

Ако има CORS грешки:
1. Провери `ALLOWED_ORIGINS` в Railway
2. Redeploy backend-а

---

## 🎯 Финален Checklist

Backend (Railway):
- [ ] Deploy-нат успешно
- [ ] Health check работи (`/` endpoint)
- [ ] Environment variables конфигурирани
- [ ] CORS включва simplifyopsco.tech

Frontend (Netlify):
- [ ] Deploy-нат успешно
- [ ] `NEXT_PUBLIC_API_URL` сочи към Railway
- [ ] Custom domain (simplifyopsco.tech) работи
- [ ] Dashboard зарежда данни от backend

---

## 📊 Мониторинг и Logs

### Railway Logs

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# View logs
railway logs
```

### Netlify Logs

В Netlify dashboard → Functions logs

---

## 🔧 Troubleshooting

### Frontend не може да се свърже с Backend

1. Провери Network tab в Chrome DevTools (F12)
2. Виж какъв е URL-а на API заявката
3. Ако е `undefined` или грешен:
   - Провери `NEXT_PUBLIC_API_URL` в Netlify
   - Redeploy frontend

### CORS Errors

Ако видиш:
```
Access to fetch at '...' from origin 'https://simplifyopsco.tech'
has been blocked by CORS policy
```

Fix:
1. Railway → Variables → Провери `ALLOWED_ORIGINS`
2. Трябва да включва: `https://simplifyopsco.tech`
3. Redeploy backend

### Backend Crash

Провери Railway logs:
```bash
railway logs
```

Често срещани причини:
- Липсва environment variable
- Invalid OpenAI API key
- Port binding issue

---

## 🎉 Success!

След успешен deployment:

- **Frontend:** https://simplifyopsco.tech
- **Backend:** https://твоят-railway-url.up.railway.app
- **API Docs:** https://твоят-railway-url.up.railway.app/docs

Приложението работи напълно! 🚀

---

## 💰 Costs

- **Netlify:** Free tier (100GB bandwidth/month)
- **Railway:** $5/month starter plan (500 hours free trial)

---

## Следващи стъпки

1. **Configure ElevenLabs webhook** да сочи към Railway URL
2. **Add monitoring** (Sentry за errors)
3. **Setup database** (PostgreSQL в Railway за persistent storage)

Въпроси? Питай ме! 💪
