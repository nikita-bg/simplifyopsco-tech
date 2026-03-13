# SimplifyOps — AI Voice SaaS

## What This Is

B2B SaaS platform that adds a customizable AI voice assistant to any website or Shopify store. Merchants sign up, configure their agent (voice, personality, knowledge base), install a single script tag, and their customers can immediately browse products, get recommendations, and complete purchases via voice. No technical expertise required from the merchant.

## Core Value

**Any merchant can have a working, personalized AI voice sales assistant live on their website in under 10 minutes — no code, no technical help needed.**

## Requirements

### Validated (Already Built)

- ✓ Frontend: Next.js 16 + Tailwind v4 + Supabase auth (Vercel)
- ✓ Backend: FastAPI + Neon PostgreSQL + Railway
- ✓ Shopify App scaffold: React Router v7 + Prisma
- ✓ ElevenLabs WebRTC voice widget (single global agent)
- ✓ Post-call webhook — conversation analysis via OpenAI GPT-4o-mini
- ✓ Basic dashboard UI: overview, conversations, reports, billing, settings
- ✓ Stripe subscription management (basic — plans exist)
- ✓ Auth flow: sign-in, sign-up, onboarding (store creation)
- ✓ Basic analytics (daily stats, intent distribution)
- ✓ n8n 1.115.3 installed locally

### Active (Must Build for v1 Launch)

**Agent System (Core):**
- [ ] Multi-tenant agent architecture — each merchant gets their own ElevenLabs agent
- [ ] Agent creation API — auto-create agent when merchant onboards
- [ ] Per-agent knowledge base — agent knows the store's products
- [ ] Shopify product sync — real-time product catalog into agent knowledge
- [ ] Website product scraper — for non-Shopify merchants
- [ ] Agent types: Online Store, Business/Service, Sales/Lead Gen

**Agent Configuration (Merchant UX):**
- [ ] Agent configuration dashboard — voice, personality, language, goals
- [ ] Agent preview/test before going live
- [ ] Knowledge base management (add/edit/sync products)
- [ ] Embed code generator with customization (color, position, greeting)

**Widget (Customer-Facing):**
- [ ] Multi-tenant widget embed.js — loads correct agent per store_id
- [ ] Customizable widget UI (color, position, avatar)
- [ ] Conversation start/end handling
- [ ] Mobile-optimized voice UI

**Automation (n8n):**
- [ ] New merchant onboarding workflow (sign-up → create agent → send welcome → sync products)
- [ ] Product sync automation (scheduled + webhook-triggered)
- [ ] Alert workflows (usage limits, errors, billing events)
- [ ] Conversation analysis pipeline (post-call → analytics → insights)

**Design Redesign:**
- [ ] Landing page — glassmorphism + premium minimal redesign
- [ ] Dashboard — glassmorphism cards, better data visualization
- [ ] Sidebar fix — consistent sizing across all pages/breakpoints

**Pricing & Billing:**
- [ ] Agent-type based pricing tiers
- [ ] Usage tracking per merchant (conversations, minutes)
- [ ] Billing upgrade/downgrade flow
- [ ] Trial → paid conversion flow

**Go-to-Market:**
- [ ] Self-service onboarding (under 10 min from sign-up to live)
- [ ] Live demo on landing page (try the voice assistant)
- [ ] Analytics improvements (conversion tracking, ROI metrics for merchants)

### Out of Scope (v1)

- Mobile native app — web-first, mobile later
- White-label / reseller program — v2
- Multi-language dashboard UI — agent speaks many languages, dashboard is single-language
- Video calls / screen sharing — voice only for v1
- Custom LLM fine-tuning — GPT-4o-mini is sufficient for v1
- Real-time chat (text) — voice-first product
- AI-generated marketing content — not core to product

## Context

**Existing codebase state:**
- Single global ElevenLabs agent ID (`settings.ELEVENLABS_AGENT_ID`) — ALL merchants use same agent. This is the #1 architectural problem blocking launch.
- No per-merchant product knowledge — agent has no idea what any store sells
- Dashboard exists but is visual-only with mock data patterns
- Backend has all the right services (OpenAI, Stripe, Neon) but agent management is missing
- Shopify app scaffold exists but is not connected to main auth/agent system

**Tech stack (locked):**
- Frontend: Next.js 16 + React 19 + Tailwind v4 + Supabase auth → Vercel
- Backend: FastAPI 0.115 + asyncpg + Neon PostgreSQL → Railway
- Voice: ElevenLabs Conversational AI API (WebRTC)
- AI: OpenAI GPT-4o-mini (intent analysis, conversation processing)
- Payments: Stripe
- Automation: n8n 1.115.3 (local → deploy to Railway)
- Design direction: Glassmorphism + premium minimal (blue/purple palette)

**Business model:**
- Subscription SaaS with agent-type tiers
- 14-day free trial
- Plans: Starter ($39/mo), Growth ($99/mo), Scale ($299/mo)

## Constraints

- **Tech Stack**: Locked — Next.js + FastAPI + ElevenLabs + Supabase + Neon + Stripe
- **Deployment**: Vercel (frontend) + Railway (backend + n8n) + Neon (database)
- **ElevenLabs**: Agent creation/management via ElevenLabs API (paid per agent/minute)
- **Security**: Repo is PUBLIC — API keys must be rotated before launch (urgent)
- **Existing Data**: Neon DB project `green-brook-97532777` has existing schema, migrations must be additive

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ElevenLabs for voice | Best WebRTC conversational AI, already integrated | — Pending |
| Per-merchant ElevenLabs agent | True isolation, custom knowledge per merchant | — Pending |
| n8n for automation | Installed locally, visual workflow builder, no code for automations | — Pending |
| GPT-4o-mini for intelligence | Cost-effective, sufficient for product Q&A | — Pending |
| Glassmorphism design | User confirmed B+A style (glass + premium minimal) | — Pending |

---
*Last updated: 2026-03-13 after project initialization*
