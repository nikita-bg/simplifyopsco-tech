# Deployment Guide — Vocalize AI

This guide covers deploying the Vocalize AI platform to production using Railway (Backend + Shopify App) and Vercel (Frontend).

## Architecture Overview

The platform consists of 3 services:

1. **Backend API** (FastAPI/Python) — Railway
2. **Frontend** (Next.js) — Vercel
3. **Shopify App** (Remix) — Railway

## Prerequisites

- Railway account (for backend + Shopify app)
- Vercel account (for frontend)
- Neon PostgreSQL database (already configured)
- Domain: `simplifyopsco.tech` with DNS access
- API Keys: ElevenLabs, OpenAI, Shopify, Stripe

## Environment Variables

### Backend (Railway)

```bash
# Database
DATABASE_URL=postgresql://...  # Neon pooled connection
DATABASE_URL_DIRECT=postgresql://...  # Neon direct connection

# AI Services
ELEVENLABS_API_KEY=...
ELEVENLABS_AGENT_ID=...
OPENAI_API_KEY=...

# Shopify
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_SCOPES=read_products,read_orders,read_customers
SHOPIFY_APP_URL=https://api.simplifyopsco.tech

# Security
ENCRYPTION_KEY=...  # Fernet key for token encryption
WEBHOOK_SECRET=...
ALLOWED_ORIGINS=https://simplifyopsco.tech,https://www.simplifyopsco.tech

# Frontend
FRONTEND_URL=https://simplifyopsco.tech

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...

# Production
ENVIRONMENT=production
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

### Frontend (Vercel)

```bash
NEXT_PUBLIC_API_URL=https://api.simplifyopsco.tech
NEON_AUTH_BASE_URL=https://ep-frosty-mountain-alfd3om6.c-3.eu-central-1.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=...  # Min 32 chars
```

### Shopify App (Railway)

```bash
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SCOPES=read_products,read_orders,read_customers
HOST=https://shopify.simplifyopsco.tech
DATABASE_URL=postgresql://...  # Neon PostgreSQL (same as backend)
SESSION_SECRET=...  # Min 32 chars
```

## Deployment Steps

### 1. Deploy Backend to Railway

```bash
# Login to Railway
railway login

# Create new project
railway init

# Link to backend service
railway link

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set ELEVENLABS_API_KEY="..."
# ... (set all backend env vars)

# Deploy
railway up

# Configure custom domain
railway domain add api.simplifyopsco.tech
```

### 2. Deploy Shopify App to Railway

```bash
# Create separate service in same Railway project
railway service create shopify-app

# Link to shopify service
railway link

# Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set SHOPIFY_API_KEY="..."
# ... (set all Shopify app env vars)

# Deploy
railway up

# Configure custom domain
railway domain add shopify.simplifyopsco.tech
```

### 3. Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Navigate to frontend directory
cd frontend

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
# Project Settings > Environment Variables
```

### 4. Configure DNS

Add these DNS records to your domain:

```
Type  Name      Value
----  ----      -----
A     @         76.76.21.21  (Vercel)
A     www       76.76.21.21  (Vercel)
CNAME api       api.simplifyopsco.tech.railway.app
CNAME shopify   shopify.simplifyopsco.tech.railway.app
```

### 5. Configure Stripe Webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.simplifyopsco.tech/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret and set as `STRIPE_WEBHOOK_SECRET`

### 6. Verify Deployment

#### Backend Health Check
```bash
curl https://api.simplifyopsco.tech/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "AI Voice Shopping Assistant API",
  "version": "1.0.0",
  "checks": {
    "database": "connected",
    "environment": "production"
  }
}
```

#### Frontend
Visit: https://simplifyopsco.tech

#### Shopify App
Visit: https://shopify.simplifyopsco.tech

## Database Migrations

Migrations run automatically on Railway deployment via `CMD` in Dockerfile.

To run manually:

```bash
# Backend (Neon)
railway run alembic upgrade head

# Shopify App (Prisma)
cd ai-voice-shopping-assistant
railway run npx prisma migrate deploy
```

## Monitoring & Logs

### Railway Logs
```bash
# Backend
railway logs

# Shopify App
railway logs -s shopify-app
```

### Vercel Logs
Visit: https://vercel.com/dashboard → Your Project → Deployments

## Rollback

### Railway
```bash
# List deployments
railway deployments

# Rollback to specific deployment
railway rollback <deployment-id>
```

### Vercel
Visit: https://vercel.com/dashboard → Your Project → Deployments → Promote to Production

## Security Checklist

- [ ] All API keys are set in environment variables (not in code)
- [ ] `.env` files are in `.gitignore`
- [ ] CORS origins are restricted to production domains
- [ ] Database uses SSL connections
- [ ] Stripe webhook secret is configured
- [ ] HTTPS is enabled on all domains
- [ ] Encryption key is 32+ bytes (Fernet)
- [ ] Session secrets are 32+ characters
- [ ] DEBUG=false in production
- [ ] Rate limiting is enabled

## Support

For deployment issues:
- Railway: https://railway.app/help
- Vercel: https://vercel.com/support
- Neon: https://neon.tech/docs

For application issues:
- GitHub: https://github.com/simplifyops/vocalize-ai/issues
