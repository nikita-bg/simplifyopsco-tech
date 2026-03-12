# Vocalize AI — Launch Readiness Plan
**Date:** 2026-03-12
**Status:** Approved
**Goal:** Get Vocalize AI fully production-ready for advertising and paying customers

---

## Context

Vocalize AI is a B2B SaaS platform — an AI voice shopping assistant for Shopify and non-Shopify stores. The platform consists of 3 deployed services:

- **Backend (FastAPI)** — `api.simplifyopsco.tech` — Railway
- **Frontend (Next.js)** — `simplifyopsco.tech` — Railway
- **Shopify App (Remix)** — `shopify.simplifyopsco.tech` — Railway

**Current state at design time:**
- Frontend: ✅ Running
- Backend: ✅ Running but `database: disconnected`
- Shopify App: ❌ Timing out

---

## Phase 1 — Infrastructure Fixes (Railway env vars)

### 1.1 Fix Database Connection

In Railway → Backend service → Variables, replace placeholder values with:

```
DATABASE_URL=postgresql://neondb_owner:npg_VAwGx9sF4dlU@ep-frosty-mountain-alfd3om6-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_DIRECT=postgresql://neondb_owner:npg_VAwGx9sF4dlU@ep-frosty-mountain-alfd3om6.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Neon project:** `green-brook-97532777` (Simplifyopsco, eu-central-1)

**Success criteria:** `curl https://api.simplifyopsco.tech/` returns `"database":"connected"`

### 1.2 Add Stripe Environment Variables

In Railway → Backend service → Variables, add:

```
STRIPE_SECRET_KEY=sk_live_...         (from Stripe Dashboard → Developers → API keys)
STRIPE_PUBLISHABLE_KEY=pk_live_...    (from Stripe Dashboard → Developers → API keys)
STRIPE_WEBHOOK_SECRET=whsec_...       (generated after webhook creation in Phase 2)
STRIPE_STARTER_PRICE_ID=price_1T5AivKBRQcqyCWjxY8dFGnZ
STRIPE_PRO_PRICE_ID=price_1T5AosKBRQcqyCWjebSFrWMY
```

**Stripe products:**
- SimplifyOps Starter: `prod_U3HHOWD5EBHYT6` / `price_1T5AivKBRQcqyCWjxY8dFGnZ` — €500/month
- SimplifyOps Professional: `prod_U3HNdXUCU43I1t` / `price_1T5AosKBRQcqyCWjebSFrWMY` — €800/month

---

## Phase 2 — Stripe Webhook

In Stripe Dashboard → Developers → Webhooks → Add endpoint:

```
URL: https://api.simplifyopsco.tech/api/stripe/webhook

Events:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

After creation, copy `whsec_...` and add as `STRIPE_WEBHOOK_SECRET` to Railway.

---

## Phase 3 — Shopify App Diagnosis & Fix

1. Open Railway → shopify-app service → Deployments → View logs
2. Identify root cause of timeout (likely missing env vars or build failure)
3. Ensure these variables are set:
   ```
   SHOPIFY_API_KEY=9db2313a78585eb57a2cc2b321919b41
   SHOPIFY_API_SECRET=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
   SCOPES=read_products,read_orders,read_customers
   HOST=https://shopify.simplifyopsco.tech
   DATABASE_URL=<same Neon connection string>
   SESSION_SECRET=<min 32 chars random string>
   NODE_ENV=production
   ```
4. Redeploy and verify `shopify.simplifyopsco.tech` responds

---

## Phase 4 — End-to-End Verification

Test the complete customer journey:

| Test | URL | Expected |
|------|-----|----------|
| Backend health | `api.simplifyopsco.tech/` | `database: connected` |
| Frontend loads | `simplifyopsco.tech` | Landing page |
| Sign up | `/auth/sign-up` | Creates account, redirects to dashboard |
| Pricing → checkout | `/pricing` → Starter button | Redirects to Stripe Checkout |
| Post-payment | Stripe test payment | Redirects back, subscription active |
| Dashboard billing | `/dashboard/billing` | Shows active plan |
| Shopify App | `shopify.simplifyopsco.tech` | OAuth redirect |

---

## Success Criteria

- [ ] `api.simplifyopsco.tech/` → `"database":"connected"`
- [ ] User can sign up and access dashboard
- [ ] Stripe checkout completes and subscription is recorded
- [ ] Shopify App responds and OAuth flow works
- [ ] All 3 services healthy in Railway dashboard

---

## Out of Scope

- Stripe account verification (separate Stripe process)
- Shopify App Store submission
- Marketing/advertising content
- Tax compliance setup (deferred — revisit at scale)
