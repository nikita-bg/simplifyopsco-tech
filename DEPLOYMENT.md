# 🚀 Production Deployment Guide

## Pre-Deployment Security Checklist

### 1. Environment Variables
Update your `.env` file for production:

```env
# Production Settings
ENVIRONMENT=production
DEBUG=False
HOST=0.0.0.0
PORT=8000

# API Keys (NEVER commit these!)
OPENAI_API_KEY=sk-proj-your_real_key_here
ELEVENLABS_API_KEY=your_real_key_here

# Security
WEBHOOK_SECRET=generate_strong_random_secret_here
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# CRM (optional)
DEFAULT_CRM_API_URL=https://your-crm.com/api/leads
DEFAULT_CRM_BEARER_TOKEN=your_crm_token

# LightRAG
LIGHTRAG_WORKING_DIR=./lightrag_cache
LIGHTRAG_MODEL_NAME=gpt-4o-mini
```

### 2. Generate Strong Secrets

```bash
# Generate webhook secret (Linux/Mac)
openssl rand -hex 32

# Or use Python
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Deployment Options

### Option A: Railway (Recommended for Backend)

1. **Create Account:** https://railway.app/
2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

4. **Set Environment Variables:**
   ```bash
   railway variables set OPENAI_API_KEY=sk-proj-...
   railway variables set ELEVENLABS_API_KEY=...
   railway variables set WEBHOOK_SECRET=...
   railway variables set ENVIRONMENT=production
   railway variables set DEBUG=False
   railway variables set ALLOWED_ORIGINS=https://yourdomain.com
   ```

5. **Add `railway.json`:**
   ```json
   {
     "$schema": "https://railway.app/railway.schema.json",
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

---

### Option B: Render.com

1. **Create Account:** https://render.com/
2. **New Web Service** → Connect GitHub repo
3. **Settings:**
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. **Environment Variables:** Add all from `.env`
5. **Deploy!**

---

### Option C: Fly.io

1. **Install flyctl:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and Initialize:**
   ```bash
   fly auth login
   fly launch
   ```

3. **Set Secrets:**
   ```bash
   fly secrets set OPENAI_API_KEY=sk-proj-...
   fly secrets set ELEVENLABS_API_KEY=...
   fly secrets set WEBHOOK_SECRET=...
   fly secrets set ENVIRONMENT=production
   fly secrets set DEBUG=False
   ```

4. **Deploy:**
   ```bash
   fly deploy
   ```

---

## Frontend Deployment (Next.js on Netlify)

### 1. Prepare Frontend

Update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### 2. Deploy to Netlify

**Via Netlify UI:**
1. Go to https://app.netlify.com/
2. "Add new site" → "Import an existing project"
3. Connect GitHub → Select repo
4. **Build settings:**
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/.next`
5. **Environment variables:**
   - `NEXT_PUBLIC_API_URL`: Your backend URL
6. Deploy!

**Via Netlify CLI:**
```bash
cd frontend
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

---

## Post-Deployment

### 1. Test Endpoints

```bash
# Health check
curl https://your-backend-url.railway.app/

# Dashboard stats (should return data)
curl https://your-backend-url.railway.app/api/dashboard/stats
```

### 2. Configure ElevenLabs Webhook

1. Go to ElevenLabs Dashboard → Conversational AI
2. Set webhook URL: `https://your-backend-url.railway.app/webhook/elevenlabs/post-call`
3. Add header: `X-Webhook-Secret: your_webhook_secret_here`

### 3. Update CORS

Make sure your production frontend URL is in `ALLOWED_ORIGINS`:
```env
ALLOWED_ORIGINS=https://your-netlify-site.netlify.app,https://yourdomain.com
```

### 4. Monitor Logs

**Railway:**
```bash
railway logs
```

**Render:**
- Check dashboard → Logs tab

**Fly.io:**
```bash
fly logs
```

---

## Security Best Practices

### ✅ DO:
- Use HTTPS everywhere (provided by Railway/Render/Fly)
- Rotate API keys every 90 days
- Monitor error logs for suspicious activity
- Set up alerting (Sentry, Better Stack)
- Use strong webhook secrets (32+ characters)
- Keep dependencies updated

### ❌ DON'T:
- Commit `.env` file to git
- Share API keys in chat/email
- Use DEBUG=True in production
- Allow all origins with `*` in CORS
- Disable rate limiting
- Expose error stack traces to users

---

## Monitoring & Logging

### Add Sentry (Error Tracking)

```bash
pip install sentry-sdk[fastapi]
```

```python
# main.py
import sentry_sdk

if settings.is_production:
    sentry_sdk.init(
        dsn="your-sentry-dsn",
        traces_sample_rate=1.0,
    )
```

### Add Logging Service

Consider:
- **Better Stack** (formerly Logtail)
- **Datadog**
- **New Relic**

---

## Scaling Considerations

### Database Migration
When traffic grows, migrate from in-memory to PostgreSQL:

```bash
pip install sqlalchemy asyncpg
```

Railway/Render provide PostgreSQL add-ons.

### Redis for Rate Limiting
For multi-instance deployments:

```bash
pip install redis aioredis
```

### CDN for Frontend
Netlify includes CDN by default. For custom domains:
- Cloudflare
- Fastly
- AWS CloudFront

---

## Rollback Plan

If deployment fails:

1. **Railway/Render:** Use dashboard to rollback to previous deployment
2. **Fly.io:**
   ```bash
   fly releases
   fly deploy --image flyio/your-app:v<previous-version>
   ```
3. **Netlify:** Rollback in Deploys tab

---

## Support & Resources

- **Railway:** https://docs.railway.app/
- **Render:** https://render.com/docs
- **Fly.io:** https://fly.io/docs/
- **Netlify:** https://docs.netlify.com/
- **FastAPI:** https://fastapi.tiangolo.com/deployment/

---

**Last Updated:** 2026-03-02
