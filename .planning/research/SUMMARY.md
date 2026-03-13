# Project Research Summary

**Project:** SimplifyOps — AI Voice Shopping Assistant
**Domain:** Multi-tenant B2B SaaS (AI voice assistants for e-commerce and service businesses)
**Researched:** 2026-03-13
**Confidence:** MEDIUM-HIGH

## Executive Summary

SimplifyOps is a B2B platform that provisions per-merchant AI voice agents (powered by ElevenLabs Conversational AI) embedded on merchant websites via a single script tag. The existing codebase has a working prototype with a single shared agent, FastAPI backend, Next.js dashboard, and Shopify integration scaffolding. The core engineering challenge is transforming this single-tenant prototype into a multi-tenant production system where each merchant gets an isolated ElevenLabs agent with its own knowledge base, voice configuration, and usage tracking.

The recommended approach is to build outward from agent isolation: first, implement per-merchant agent creation via the ElevenLabs API (confirmed available, HIGH confidence), then layer on product sync to populate each agent's knowledge base, then build the embeddable widget that dynamically loads the correct agent, and finally wire up billing and onboarding automation via n8n. The existing stack (Next.js 16, FastAPI, Neon PostgreSQL, ElevenLabs, Stripe) is sufficient for v1 -- the only meaningful additions are pgvector for semantic product search, beautifulsoup4 for non-Shopify scraping, and n8n for workflow automation. No new infrastructure services are needed.

The top risks are: (1) leaked production credentials in git history that must be rotated before any other work, (2) the knowledge base 300k-character limit that caps catalogs at roughly 1,000 products per agent on non-enterprise plans, and (3) ElevenLabs burst pricing that can destroy margins during traffic spikes. All three have concrete mitigations documented in the research.

## Key Findings

### Stack Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Agent creation | ElevenLabs Agent API (`/v1/convai/agents/create`) | One agent per merchant; confirmed API with full CRUD |
| Vector search | Neon pgvector (not Pinecone/Qdrant) | Already available on Neon, no extra service, sufficient for <100K vectors/merchant |
| Product embeddings | OpenAI `text-embedding-3-small` (1536 dims) | $0.02/1M tokens, good quality for product search |
| Workflow automation | n8n on Railway | Handles onboarding orchestration, scheduled syncs, alerts |
| Website scraping | httpx + beautifulsoup4 + lxml | Server-side, structured data extraction (JSON-LD preferred) |
| Widget delivery | CDN/Vercel Edge static JS | Single `embed.js` serves all merchants via `data-store-id` |
| NOT using | LangChain, Pinecone, Puppeteer, Firebase, Redis (standalone) | Over-engineering for v1 scale |

### Feature Priority Matrix

**Must have (table stakes -- launch blockers):**
- Per-merchant agent creation with isolated knowledge base
- Shopify auto-sync (webhook-driven product catalog)
- Widget embed.js loading correct agent by store_id
- Onboarding flow: signup to working agent in under 5 minutes
- Usage tracking (minutes per merchant per billing cycle)
- Voice selection, greeting customization, widget color/position
- Enable/disable toggle, language selection
- Usage meter in dashboard with 80% warning

**Should have (differentiators -- high value, close after launch):**
- Website scraper for non-Shopify merchants
- Agent personality presets (hide system prompt complexity)
- Live preview widget in dashboard ("aha moment" accelerator)
- Business hours scheduling
- Custom FAQ/knowledge entries (critical for service businesses)
- Unanswered questions log (actionable analytics)
- Add-to-cart rate tracking

**Defer to v2+:**
- Custom LLM fine-tuning
- Real-time conversation monitoring
- White-label / reseller
- Appointment booking integration
- A/B testing for agent voices
- Per-product analytics
- Rollover minutes

### Architecture Overview

The system follows a hub-and-spoke model: FastAPI is the central hub handling all business logic, with ElevenLabs as the real-time voice processing spoke, n8n as the automation spoke, and the Next.js dashboard as the merchant interface. The critical architectural decision is **one ElevenLabs agent per merchant** (not a shared agent with dynamic context injection). This provides hard knowledge base isolation, independent voice/personality config, and clean analytics boundaries. The widget uses a two-phase load: `embed.js` fetches per-store config from FastAPI (including agent_id), then initializes ElevenLabs WebRTC. Product knowledge flows through two layers: ElevenLabs RAG for general browsing (80% of queries) and FastAPI server tools with pgvector for precision queries (price filters, availability).

**Major components:**
1. **FastAPI Backend** -- Agent lifecycle management, product sync, webhook handling, widget config API, usage tracking
2. **ElevenLabs Conversational AI** -- Real-time voice (ASR/TTS/LLM), per-agent RAG, server/client tool calls
3. **embed.js + widget-bundle.js** -- Customer-facing voice UI on merchant websites, isolated per store_id
4. **n8n Automation** -- Onboarding orchestration, scheduled product sync, usage alerts, post-call analysis pipeline
5. **Neon PostgreSQL + pgvector** -- Multi-tenant data store, product embeddings, analytics, usage counters
6. **Next.js Dashboard** -- Merchant self-service: agent config, knowledge base management, analytics, billing

### Critical Pitfalls (Top 5)

1. **Leaked credentials in git history** -- Neon DB password and Shopify API secret are in commit `98996c8` on a public repo. Rotate ALL credentials before any other work. Add gitleaks to pre-commit hooks.
2. **Shared agent contamination** -- Current prototype uses one global agent ID. Must implement per-merchant agent creation in Phase 1; every widget request must resolve store_id to the correct agent_id from the database.
3. **ElevenLabs API key exposure** -- Never send `xi-api-key` to the browser. Use signed URLs (15-min TTL) generated server-side. Domain allowlists as secondary protection.
4. **Knowledge base size limits** -- 300k characters caps catalogs at ~1,000 products. Must implement smart sync: natural language transformation, character count tracking, priority-based product selection for large catalogs.
5. **Burst pricing margin destruction** -- ElevenLabs charges 2x for concurrent calls exceeding plan limits. Set `max_duration_seconds` and `daily_limit` per agent. Price plans with 3-4x markup on ElevenLabs costs.

## Implications for Roadmap

### Phase 0: Credential Rotation and Security Hardening
**Rationale:** Leaked production credentials in a public repo is a P0 emergency. Nothing else matters until this is resolved.
**Delivers:** Rotated credentials, pre-commit secret scanning, secure environment variable management
**Avoids:** Pitfall 0 (data breach via exposed DB/API credentials)
**Research flag:** No research needed -- straightforward operational task

### Phase 1: Multi-Tenant Agent System
**Rationale:** Everything depends on per-merchant agent creation. Widget, product sync, analytics, billing -- all require a unique agent_id per store. This is the foundational layer.
**Delivers:** AgentService (create/update/delete ElevenLabs agents), KnowledgeBaseService, widget config API endpoint, DB migrations for agent columns, usage tracking on post-call webhook
**Addresses:** P0 features (agent creation, embed code generation, usage tracking)
**Avoids:** Pitfalls 1 (shared agent), 2 (API key exposure), 3 (tenant isolation), 14 (prompt injection via guardrails)
**Research flag:** Standard patterns -- ElevenLabs API is well-documented (HIGH confidence)

### Phase 2: Product Sync and Widget
**Rationale:** With agents created, they need knowledge (product sync) and a delivery mechanism (widget). These are tightly coupled -- the widget is useless without product knowledge, and product sync is useless without a widget to test it.
**Delivers:** Shopify webhook-driven KB sync, natural language product transformation, embed.js + widget-bundle.js, microphone permission handling, ElevenLabs fallback states
**Addresses:** P0 features (Shopify sync, widget), P1 features (website scraper foundation)
**Avoids:** Pitfalls 4 (KB limits), 5 (RAG latency), 9 (mic permission), 10 (KB quality), 13 (iOS audio), 15 (duplicate KB docs), 16 (ElevenLabs outage fallback)
**Research flag:** Needs research -- KB chunking strategy for large catalogs, widget cross-browser compatibility matrix

### Phase 3: Billing, Usage Enforcement, and n8n Production
**Rationale:** Before charging real money, usage tracking must be verified accurate and n8n must be production-hardened. Billing without usage data is either revenue leakage or customer trust destruction.
**Delivers:** Stripe subscription enforcement, plan limit checks, overage billing, n8n queue mode with Redis, error handler workflows, idempotent workflow design
**Addresses:** P0 features (pricing enforcement), P1 features (annual billing, add-on packs)
**Avoids:** Pitfalls 6 (burst pricing), 8 (n8n failures), 11 (usage tracking gap), 12 (underpriced plans)
**Research flag:** Needs research -- ElevenLabs actual per-minute costs from billing dashboard, n8n queue mode license requirements

### Phase 4: Onboarding and Merchant Experience
**Rationale:** With the core system working, optimize the path from signup to "aha moment" (hearing the agent talk about YOUR products). This is the retention lever.
**Delivers:** Single-page onboarding flow, auto-agent creation on signup, Shopify 1-click connect, progress indicators, welcome email with embed code, in-dashboard agent preview
**Addresses:** P1 features (personality presets, live preview, business hours), onboarding table stakes
**Avoids:** Pitfall 7 (script tag drop-off)
**Research flag:** Standard patterns -- SaaS onboarding is well-documented

### Phase 5: Analytics, Agent Types, and Growth Features
**Rationale:** With merchants onboarded and paying, add the features that drive retention and upgrades: actionable analytics, agent type differentiation (e-commerce vs service vs lead gen), and conversion attribution.
**Delivers:** Add-to-cart tracking, unanswered questions log, agent type templates with tier gating, custom FAQ entries, ROI estimates
**Addresses:** P1 features (conversion attribution, unanswered questions), P2 features (lead capture, agent types)
**Research flag:** Needs research -- Shopify order webhook for conversion attribution, CRM webhook patterns

### Phase Ordering Rationale

- **Security before features:** Credential rotation is non-negotiable as Phase 0.
- **Agent isolation before everything:** Per-merchant agents are the dependency root. Widget, sync, analytics, and billing all require a unique agent_id per store.
- **Sync and widget together:** They validate each other -- you cannot test product sync without a widget, and the widget is empty without synced products.
- **Billing before onboarding:** Usage enforcement must work before scaling merchant acquisition. Onboarding without billing leaks revenue.
- **Growth features last:** Agent types, advanced analytics, and CRM webhooks add value but do not block launch.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 2:** KB chunking for large catalogs (1000+ products), widget cross-browser testing matrix, signed URL flow implementation details
- **Phase 3:** ElevenLabs actual billing model verification, n8n queue mode configuration on Railway, Stripe metered billing for overage charges

Phases with standard patterns (skip research):
- **Phase 0:** Credential rotation -- operational, no research needed
- **Phase 1:** ElevenLabs agent CRUD -- API is fully documented with HIGH confidence
- **Phase 4:** SaaS onboarding -- well-established patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Existing stack is locked; new additions (pgvector, n8n) are well-documented |
| Features | MEDIUM | Feature priorities based on training data from comparable platforms (Bland.ai, Retell.ai, Voiceflow); validate against current competitors before launch |
| Architecture | HIGH | ElevenLabs API verified from official docs; per-merchant agent model is confirmed viable |
| Pitfalls | HIGH | Critical pitfalls verified from official ElevenLabs docs (KB limits, burst pricing, signed URLs); leaked credentials confirmed via git inspection |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **ElevenLabs per-minute pricing:** Exact cost per conversation minute needs verification from the billing dashboard. Margin calculations in STACK.md are estimates.
- **n8n queue mode licensing:** Whether queue mode (Redis-backed) requires an n8n enterprise license needs verification before Phase 3.
- **ElevenLabs workspace agent limits:** At 10K merchants, does ElevenLabs impose a maximum number of agents per workspace? Unverified.
- **Competitor feature benchmarking:** Feature priorities are based on training data, not live competitor analysis. Verify Bland.ai, Retell.ai, Synthflow.ai feature sets before finalizing roadmap.
- **Shopify App Store submission requirements:** The app scaffold exists but submission checklist compliance is unverified.

## Cost Model Summary

| Component | Starter ($39/mo) | Growth ($99/mo) | Scale ($299/mo) |
|-----------|-------------------|-----------------|-----------------|
| ElevenLabs minutes | 100 min (~$5-15) | 400 min (~$20-60) | 2,000 min (~$100-300) |
| OpenAI embeddings | ~$0.01 | ~$0.05 | ~$0.20 |
| OpenAI post-call analysis | ~$0.50 | ~$2.00 | ~$10.00 |
| Infrastructure (shared) | ~$2 | ~$2 | ~$2 |
| **Estimated COGS** | **$8-18** | **$24-64** | **$112-312** |
| **Gross margin** | **54-79%** | **35-76%** | **0-63%** |

**Warning:** Scale tier margins are thin if ElevenLabs costs trend high. Price with 3-4x markup on voice minutes. Overage at $0.15/min recommended (not $0.08/min as initially proposed).

## Sources

### Primary (HIGH confidence)
- ElevenLabs Agent API (create, update, delete, knowledge base, signed URLs, guardrails, burst pricing, post-call webhooks) -- official docs, verified
- Neon pgvector documentation -- production-ready extension
- Existing codebase analysis (FastAPI endpoints, DB schema, Shopify service, ElevenLabs React integration)
- Git history inspection (leaked credentials confirmed)

### Secondary (MEDIUM confidence)
- n8n deployment patterns on Railway (queue mode, Postgres node) -- training data, partially verified
- SaaS pricing models (Bland.ai, Retell.ai, Intercom usage-based restructure) -- training data
- Onboarding best practices (UserOnboard, Product-Led Growth literature) -- training data
- Multi-tenant widget CDN patterns -- industry standard, not project-specific verification

### Tertiary (LOW confidence)
- ElevenLabs per-minute cost estimates -- need billing dashboard verification
- Competitor feature sets (current as of research date) -- need live validation
- n8n enterprise license requirements for queue mode -- unverified

---
*Research completed: 2026-03-13*
*Ready for roadmap: yes*
