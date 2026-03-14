# Roadmap: SimplifyOps AI Voice SaaS

## Overview

SimplifyOps transforms from a single-agent prototype into a multi-tenant production SaaS where each merchant gets an isolated AI voice assistant. The build order follows the dependency chain: security lockdown first (leaked credentials in a public repo), then agent infrastructure (the dependency root for everything else), then knowledge base and widget (the customer-facing delivery mechanism), then automation and onboarding (the merchant acquisition pipeline), then configuration, billing, analytics, and design (the retention and monetization layers). Each phase delivers a coherent, testable capability that unlocks the next.

## Phases

**Phase Numbering:**
- Integer phases (0-9): Planned milestone work
- Decimal phases (e.g., 3.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 0: Security Lockdown** - Rotate all leaked credentials, add secret scanning, secure API key delivery
- [x] **Phase 1: Agent Infrastructure** - Multi-tenant ElevenLabs agent CRUD with DB schema and agent templates
- [ ] **Phase 2: Knowledge Base** - Product sync pipeline (Shopify + manual) with pgvector search and KB management
- [ ] **Phase 3: Widget** - Customer-facing embed.js that loads the correct agent per merchant via signed URLs
- [x] **Phase 4: Automation** - Python-native automation (APScheduler + Resend) for onboarding, sync, alerts, and post-call analysis (completed 2026-03-14)
- [x] **Phase 5: Onboarding** - Sub-5-minute signup-to-live flow with Shopify 1-click connect and progress indicators (completed 2026-03-14)
- [x] **Phase 6: Agent Configuration** - Merchant self-service agent customization (voice, personality, widget appearance, preview) (completed 2026-03-14)
- [ ] **Phase 7: Billing** - Stripe subscription tiers with usage tracking, enforcement, trial flow, and upgrade prompts
- [ ] **Phase 8: Analytics** - Conversation analytics dashboard with trends, intents, transcripts, and unanswered questions
- [ ] **Phase 9: Design Polish** - Glassmorphism redesign for landing page and dashboard, responsive fixes, live demo

## Phase Details

### Phase 0: Security Lockdown
**Goal**: All production credentials are rotated and the codebase can never leak secrets again
**Depends on**: Nothing (P0 emergency)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04
**Success Criteria** (what must be TRUE):
  1. All previously leaked credentials (Neon DB, Shopify API, OpenAI, ElevenLabs) are rotated and the old values no longer authenticate
  2. A developer cannot commit a file containing an API key or password -- pre-commit hook blocks it
  3. The ElevenLabs API key is never sent to the browser; widget connects via a signed URL with a 15-minute TTL
  4. All environment variables are managed through Railway secrets and Vercel env (no hardcoded values in code)
**Plans**: 2 plans

Plans:
- [x] 00-01-PLAN.md — Rotate all leaked credentials and install gitleaks pre-commit hook
- [x] 00-02-PLAN.md — Implement ElevenLabs signed URL endpoint and migrate frontend

### Phase 1: Agent Infrastructure
**Goal**: Each merchant has their own isolated ElevenLabs agent with full lifecycle management
**Depends on**: Phase 0
**Requirements**: AGT-01, AGT-02, AGT-03, AGT-04, AGT-05, AGT-06, DB-01, DB-02, DB-03, DB-04
**Success Criteria** (what must be TRUE):
  1. When a new merchant signs up, an ElevenLabs agent is created via the API and its agent_id is stored in the merchant's DB record
  2. A merchant's agent can be updated (voice, greeting, personality) and the changes propagate to ElevenLabs within seconds
  3. Agent deletion cleans up both the ElevenLabs resource and the DB record
  4. Each agent type (Online Store, Service Business, Lead Gen) has a pre-configured template with appropriate system prompt, guardrails, and defaults
  5. The Neon DB schema includes agent columns on stores, pgvector extension, agent templates table, and usage tracking columns -- all via additive migrations
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — DB schema migrations, ElevenLabs service module, and Pydantic models
- [x] 01-02-PLAN.md — Agent CRUD endpoints, signed URL refactor, and comprehensive tests

### Phase 2: Knowledge Base
**Goal**: Every agent knows its merchant's products and can answer product questions accurately
**Depends on**: Phase 1
**Requirements**: KB-01, KB-02, KB-03, KB-04, KB-05, KB-06, KB-07
**Success Criteria** (what must be TRUE):
  1. When a Shopify merchant connects their store, products auto-sync to their agent's ElevenLabs knowledge base via webhook within 60 seconds
  2. Products are transformed to natural language format optimized for RAG retrieval (not raw JSON)
  3. Non-Shopify merchants can manually add, edit, and remove products from their knowledge base via the dashboard
  4. The dashboard shows sync status (last synced timestamp, product count, KB character usage with warning at 80% of 300k limit)
  5. A "Sync Now" button triggers an immediate re-sync, and pgvector embeddings enable precision product search via server tools
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — DB migration, KB service module, ElevenLabs KB methods, Gemini embeddings, pgvector search
- [ ] 02-02-PLAN.md — KB API endpoints: webhook extension, manual CRUD, sync status, sync now, server tool
- [ ] 02-03-PLAN.md — Knowledge Base dashboard page with sync status, products, and sidebar nav

### Phase 3: Widget
**Goal**: Merchants can embed a single script tag and their customers can talk to the AI voice assistant
**Depends on**: Phase 1, Phase 2
**Requirements**: WDG-01, WDG-02, WDG-03, WDG-04, WDG-05, WDG-06, WDG-07
**Success Criteria** (what must be TRUE):
  1. A merchant pastes `<script src="embed.js" data-store-id="X">` on their website and the correct agent loads for that store
  2. The widget fetches per-store config (agent_id, color, position, greeting) from the backend and renders accordingly
  3. Voice connection uses a signed URL from the backend (never exposes ElevenLabs API key to browser)
  4. The widget works on mobile (including iOS Safari audio context handling) and handles microphone permissions with clear prompts
  5. When an agent is disabled or the merchant exceeds plan limits, the widget shows a graceful fallback instead of erroring
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — Backend /api/widget/config endpoint with response model, wildcard CORS, and tests
- [ ] 03-02-PLAN.md — Widget JS refactor: dynamic config, 4-corner positioning, iOS AudioContext, mic permissions, graceful fallback

### Phase 4: Automation
**Goal**: Core business workflows run automatically via Python-native automation (APScheduler + BackgroundTasks + Resend) without manual intervention
**Depends on**: Phase 1, Phase 2
**Requirements**: AUT-01, AUT-02, AUT-03, AUT-04, AUT-05, AUT-06
**Success Criteria** (what must be TRUE):
  1. APScheduler runs inside the FastAPI process with scheduled jobs for KB resync and usage alerts
  2. The onboarding workflow fires on signup and orchestrates agent creation, product sync, and welcome email delivery end-to-end
  3. Product sync workflows run on both a daily schedule and Shopify webhook triggers, keeping knowledge bases current
  4. Usage alert emails are sent automatically when a merchant hits 80% of their conversation minute limit
  5. Failed workflows are caught by an error handler that prevents merchants from ending up in a half-configured state
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Automation foundation: APScheduler lifecycle, Resend email service, onboarding workflow with error handling
- [ ] 04-02-PLAN.md — Scheduled jobs (daily KB resync + usage alerts) and ElevenLabs webhook registration with post-call usage tracking

### Phase 5: Onboarding
**Goal**: A new merchant goes from signup to hearing their AI agent talk about their products in under 5 minutes
**Depends on**: Phase 3, Phase 4
**Requirements**: ONB-01, ONB-02, ONB-03, ONB-04, ONB-05, ONB-06, ONB-07
**Success Criteria** (what must be TRUE):
  1. The signup form is a single page (store name, website URL, store type) with no unnecessary fields
  2. After signup, the agent is auto-created within 30 seconds and the merchant sees a live progress indicator ("Creating agent... Syncing products...")
  3. Shopify merchants can connect their store via 1-click OAuth install flow without leaving the onboarding experience
  4. A welcome email with the embed code snippet is sent automatically on successful agent creation
  5. Default agent config (friendly voice, blue widget, bottom-right position, English) means the agent works immediately with zero configuration
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Backend: enhanced store creation (store_name, store_type), onboarding status tracking, status polling endpoint
- [ ] 05-02-PLAN.md — Frontend: enhanced onboarding form with all fields, Shopify connect, and real-time progress indicator

### Phase 6: Agent Configuration
**Goal**: Merchants can fully customize their AI agent's voice, personality, and appearance without technical knowledge
**Depends on**: Phase 1, Phase 3
**Requirements**: CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, CFG-06, CFG-07, CFG-08
**Success Criteria** (what must be TRUE):
  1. A merchant can select from 8-12 curated voices with audio previews and customize the greeting message
  2. Widget appearance (color picker, 4-corner position selector) is configurable and changes reflect in the embed immediately
  3. The agent can be enabled/disabled via toggle (propagates to embed.js) and language can be changed from 28+ options
  4. Personality presets (Friendly, Professional, Energetic, etc.) let merchants shape agent behavior without writing prompts
  5. A live preview lets merchants test their agent in-dashboard before going live, and the embed code is auto-generated and copy-paste ready
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Backend APIs: agent config CRUD, curated voices, personality presets, embed code generation
- [ ] 06-02-PLAN.md — Frontend config page: voice picker, greeting, widget appearance, personality, language, preview, embed code

### Phase 7: Billing
**Goal**: Merchants are on the right subscription tier with accurate usage tracking and self-service billing management
**Depends on**: Phase 1, Phase 4
**Requirements**: BIL-01, BIL-02, BIL-03, BIL-04, BIL-05, BIL-06, BIL-07, BIL-08, BIL-09
**Success Criteria** (what must be TRUE):
  1. Three subscription tiers (Starter $39, Growth $99, Scale $299) are available with clearly defined conversation minute limits (100/400/2000)
  2. Per-merchant usage tracking accurately counts conversation minutes per billing cycle, visible in dashboard as "X of Y minutes used"
  3. At 80% usage, the merchant receives an automatic warning email; at 110% (soft limit with 10% buffer), the agent is disabled
  4. In-app upgrade prompts appear when usage limits are approached, and merchants can upgrade/downgrade via Stripe Customer Portal
  5. New merchants start with a 14-day free trial (no credit card required) with a clear trial-to-paid conversion flow
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Backend billing: fix subscription endpoint, invoice.paid billing reset, 110% usage enforcement, shared TIER_LIMITS, tests
- [ ] 07-02-PLAN.md — Frontend billing: plan cards, usage meter, upgrade via Stripe Checkout, trial banner, sidebar usage warning

### Phase 8: Analytics
**Goal**: Merchants can see how their AI agent performs and what their customers are asking about
**Depends on**: Phase 4
**Requirements**: ANL-01, ANL-02, ANL-03, ANL-04, ANL-05, ANL-06
**Success Criteria** (what must be TRUE):
  1. The dashboard shows total conversations with trend comparison to the previous period and average conversation duration
  2. Top customer intents are displayed in a readable format (not raw JSON) so merchants understand what people ask about
  3. A recent conversations list is available with click-through to full transcripts
  4. Peak usage hours are visualized so merchants know when their agent is busiest
  5. An "unanswered questions" log surfaces questions the agent could not answer, giving merchants actionable knowledge base improvement suggestions
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD

### Phase 9: Design Polish
**Goal**: The landing page and dashboard look premium and professional, matching the glassmorphism design direction
**Depends on**: Phase 5, Phase 6, Phase 8 (can overlap with late phases)
**Requirements**: DSN-01, DSN-02, DSN-03, DSN-04, DSN-05
**Success Criteria** (what must be TRUE):
  1. The landing page has a glassmorphism + premium minimal redesign that communicates "enterprise-grade AI" at first glance
  2. Dashboard cards use consistent glassmorphism design tokens across all pages
  3. The sidebar renders at consistent sizing across all breakpoints (375px, 768px, 1024px, 1440px) with no layout shifts
  4. A "Try it now" live demo agent on the landing page lets visitors experience the product before signing up
  5. All pages are mobile-responsive and tested across 375px, 768px, 1024px, and 1440px viewports
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD
- [ ] 09-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
Note: Phases 6, 7, 8 can potentially run in parallel after their dependencies are met.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Security Lockdown | 2/2 | Complete | 2026-03-13 |
| 1. Agent Infrastructure | 2/2 | Complete | 2026-03-13 |
| 2. Knowledge Base | 2/3 | In Progress|  |
| 3. Widget | 0/2 | Not started | - |
| 4. Automation | 2/2 | Complete   | 2026-03-14 |
| 5. Onboarding | 2/2 | Complete   | 2026-03-14 |
| 6. Agent Configuration | 2/2 | Complete   | 2026-03-14 |
| 7. Billing | 0/2 | Not started | - |
| 8. Analytics | 0/2 | Not started | - |
| 9. Design Polish | 0/3 | Not started | - |
