# SimplifyOps - AI Voice Shopping Assistant

## Project Overview
B2B SaaS platform that adds AI-powered voice assistants to any website/Shopify store. Users install a script tag or Shopify app to enable voice-based product browsing, recommendations, and checkout assistance.

## Architecture

### Frontend (Next.js 16 + Tailwind v4)
- **Location**: `frontend/`
- **Framework**: Next.js 16.1.6 with React 19, React Compiler enabled
- **Auth**: Neon Auth (`@neondatabase/auth`) with dark theme overrides in `globals.css`
- **Voice**: ElevenLabs WebRTC (`@elevenlabs/react`)
- **Charts**: Recharts 3.7.0
- **Deploy**: Vercel

### Backend (FastAPI + Python)
- **Location**: `backend/`
- **Framework**: FastAPI 0.115.12 + Uvicorn
- **Database**: Neon PostgreSQL (asyncpg)
- **AI**: OpenAI GPT-4o-mini for intent analysis
- **Payments**: Stripe
- **Deploy**: Railway

### Shopify App (React Router v7 + Prisma)
- **Location**: `ai-voice-shopping-assistant/`
- **Framework**: React Router v7 (formerly Remix) + Vite
- **ORM**: Prisma with PostgreSQL
- **Deploy**: Railway

### Database (Neon PostgreSQL v17)
- **Project ID**: `green-brook-97532777`
- **Region**: `aws-eu-central-1`
- **Public schema tables**: stores, products, product_recommendations, conversations, daily_analytics, audit_logs, Session, _prisma_migrations
- **Auth schema** (`neon_auth`): user, session, account, verification, jwks, organization, member, invitation, project_config

## Commands

### Frontend
```bash
cd frontend && npm run dev     # Dev server on :3000
cd frontend && npm run build   # Production build
cd frontend && npx playwright test  # E2E visual tests
```

### Backend
```bash
cd backend && python -m pytest tests/ -v  # Run all tests (74 tests)
cd backend && uvicorn main:app --reload   # Dev server on :8000
```

### Shopify App
```bash
cd ai-voice-shopping-assistant && npm run dev
```

## Key Patterns
- **Dark theme**: Background `#0f1115`, surface `#181b21`, primary `#256af4`
- **Font**: Space Grotesk (Google Fonts)
- **Auth**: Neon Auth with custom dark CSS overrides via `[data-better-auth-ui]` wrapper + `[data-slot]` selectors
- **Responsive**: `lg:` breakpoint for desktop sidebar, `sm:` for mobile menu, hamburger pattern on both landing + dashboard
- **API URL**: `NEXT_PUBLIC_API_URL` env var, fallback `http://localhost:8000`

## Testing
- **Backend**: pytest with 74 tests across 6 modules
- **Frontend**: Playwright e2e visual audit (13 tests) in `frontend/e2e/`
- **Playwright config**: `frontend/playwright.config.ts`

## Warnings to Watch
- `datetime.utcnow()` deprecation in `backend/main.py:460` — use `datetime.now(datetime.UTC)` instead
- Neon Auth CSS overrides need `!important` due to component's built-in styles
