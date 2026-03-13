# Requirements: SimplifyOps AI Voice SaaS

**Defined:** 2026-03-13
**Core Value:** Any merchant can have a working, personalized AI voice sales assistant live on their website in under 10 minutes — no code, no technical help needed.

## v1 Requirements

### Security (SEC)

- [ ] **SEC-01**: All leaked credentials rotated (Neon DB password, Shopify API secret, OpenAI key, ElevenLabs key)
- [ ] **SEC-02**: Pre-commit secret scanning (gitleaks) prevents future credential leaks
- [ ] **SEC-03**: ElevenLabs API key never reaches the browser — signed URL pattern (15-min TTL)
- [ ] **SEC-04**: Environment variables managed securely (Railway secrets, Vercel env)

### Agent System (AGT)

- [ ] **AGT-01**: Each merchant gets their own ElevenLabs agent on signup (via Agent Create API)
- [ ] **AGT-02**: Agent can be updated (voice, greeting, personality) via Agent Update API
- [ ] **AGT-03**: Agent can be deleted when merchant churns (via Agent Delete API)
- [ ] **AGT-04**: Agent status tracked in DB (`stores.elevenlabs_agent_id`, `stores.agent_status`)
- [ ] **AGT-05**: Agent guardrails set at creation (max_duration_seconds, daily_limit, blocked topics)
- [ ] **AGT-06**: Agent templates exist per type: Online Store, Service Business, Lead Gen

### Knowledge Base (KB)

- [ ] **KB-01**: Shopify products auto-sync to ElevenLabs agent knowledge base (webhook-driven)
- [ ] **KB-02**: Products transformed to natural language format for optimal RAG retrieval
- [ ] **KB-03**: Knowledge base character count tracked per merchant (300k limit warning at 80%)
- [ ] **KB-04**: Manual product add/edit for non-Shopify merchants (name, description, price, URL)
- [ ] **KB-05**: Sync status visible in dashboard (last synced, product count, health badge)
- [ ] **KB-06**: Manual "Sync Now" button for immediate re-sync
- [ ] **KB-07**: pgvector embeddings for precision product search via server tools

### Widget (WDG)

- [ ] **WDG-01**: Single embed.js script tag with `data-store-id` loads correct agent per merchant
- [ ] **WDG-02**: Widget fetches config from FastAPI `/api/widget/config` (agent_id, color, position, greeting)
- [ ] **WDG-03**: Widget uses signed URL (from backend) to connect to ElevenLabs WebRTC
- [ ] **WDG-04**: Widget customizable: color, position (4 corners), avatar
- [ ] **WDG-05**: Microphone permission handling with clear user prompts
- [ ] **WDG-06**: Mobile-optimized voice UI (iOS Safari audio context handling)
- [ ] **WDG-07**: Graceful fallback when agent is disabled or merchant exceeds plan limits

### Onboarding (ONB)

- [ ] **ONB-01**: Single-page signup form (store name, website URL, store type)
- [ ] **ONB-02**: Agent auto-created within 30 seconds of signup (n8n workflow)
- [ ] **ONB-03**: Shopify 1-click connect via OAuth install flow
- [ ] **ONB-04**: Progress indicator during async agent creation ("Creating agent... Syncing products...")
- [ ] **ONB-05**: Welcome email with embed code snippet sent automatically
- [ ] **ONB-06**: Default sensible agent config (friendly voice, blue widget, bottom-right, English)
- [ ] **ONB-07**: Time to "aha moment" under 5 minutes from signup

### Agent Configuration (CFG)

- [ ] **CFG-01**: Voice selection from curated shortlist (8-12 voices with previews)
- [ ] **CFG-02**: Greeting message customization (text field + preview)
- [ ] **CFG-03**: Widget color picker + position selector (4 corners)
- [ ] **CFG-04**: Enable/disable toggle (propagates to embed.js)
- [ ] **CFG-05**: Language selection (28+ ElevenLabs-supported languages)
- [ ] **CFG-06**: Embed code auto-generated and copy-paste ready
- [ ] **CFG-07**: Agent personality presets (5-8 presets: Friendly, Professional, Energetic, etc.)
- [ ] **CFG-08**: Live preview — merchant can test their agent in-dashboard before going live

### Billing (BIL)

- [ ] **BIL-01**: Three subscription tiers: Starter ($39), Growth ($99), Scale ($299)
- [ ] **BIL-02**: Included conversation minutes per tier (100/400/2000)
- [ ] **BIL-03**: Usage tracking: minutes used per merchant per billing cycle
- [ ] **BIL-04**: Usage meter visible in dashboard ("67 of 100 minutes used")
- [ ] **BIL-05**: Warning email at 80% usage (n8n automation)
- [ ] **BIL-06**: Soft limit: 10% overage buffer before disabling (not hard cutoff)
- [ ] **BIL-07**: Upgrade prompt in-app when limit approached/reached
- [ ] **BIL-08**: Stripe Customer Portal for self-service billing management
- [ ] **BIL-09**: 14-day free trial, no credit card required

### Automation (AUT)

- [ ] **AUT-01**: n8n deployed on Railway alongside backend
- [ ] **AUT-02**: Onboarding workflow: signup → create agent → sync products → send email
- [ ] **AUT-03**: Product sync workflow: Shopify webhook → rebuild KB document
- [ ] **AUT-04**: Usage alert workflow: daily check → email at 80% threshold
- [ ] **AUT-05**: Post-call analysis: ElevenLabs webhook → conversation analysis → analytics update
- [ ] **AUT-06**: Error handler workflow for failed pipelines (prevents half-configured state)

### Analytics (ANL)

- [ ] **ANL-01**: Total conversations with trend vs previous period
- [ ] **ANL-02**: Average conversation duration
- [ ] **ANL-03**: Top intents / what customers asked about (readable format)
- [ ] **ANL-04**: Recent conversations list with full transcript click-through
- [ ] **ANL-05**: Peak usage hours visualization
- [ ] **ANL-06**: Unanswered questions log ("Your agent couldn't answer these 23 questions")

### Design (DSN)

- [ ] **DSN-01**: Landing page glassmorphism + premium minimal redesign
- [ ] **DSN-02**: Dashboard glassmorphism cards with consistent design tokens
- [ ] **DSN-03**: Sidebar consistent sizing across all breakpoints
- [ ] **DSN-04**: "Try it now" live demo agent on landing page
- [ ] **DSN-05**: Mobile-responsive across 375px, 768px, 1024px, 1440px

### Database (DB)

- [ ] **DB-01**: Additive migrations: agent columns on `stores` table (agent_id, kb_doc_id, agent_status, etc.)
- [ ] **DB-02**: pgvector extension enabled, product embeddings column
- [ ] **DB-03**: Agent templates table for agent type presets
- [ ] **DB-04**: Usage tracking columns (minutes_used, billing_period_start)

## v2 Requirements (Deferred)

### Advanced Analytics
- **ANL-07**: Conversion attribution (conversation → Shopify order)
- **ANL-08**: Agent ROI estimate ($X in assisted revenue)
- **ANL-09**: Per-product analytics (top discussed products)

### Advanced Agent
- **AGT-07**: Website scraper for non-Shopify merchants
- **AGT-08**: Custom FAQ / knowledge entries
- **AGT-09**: Business hours scheduling
- **AGT-10**: Escalation / handoff to human message
- **AGT-11**: Service Business and Lead Gen agent types (Growth/Scale tiers)

### Advanced Billing
- **BIL-10**: Annual billing plan (2 months free)
- **BIL-11**: Add-on conversation packs
- **BIL-12**: Rollover minutes (50% cap)

### Growth
- **GRO-01**: Shopify App Store submission
- **GRO-02**: "First customer" celebration notification
- **GRO-03**: In-dashboard interactive tutorial (Shepherd.js)
- **GRO-04**: Lead capture CRM webhook (HubSpot/Mailchimp)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first; mobile browser support is sufficient for v1 |
| White-label / reseller | High complexity, small market at launch; defer to v2 |
| Multi-language dashboard UI | Agent speaks many languages; dashboard stays English |
| Video calls / screen sharing | Voice-only product — v1 focus |
| Custom LLM fine-tuning | GPT-4o-mini sufficient for product Q&A |
| Real-time conversation monitoring | Post-call analytics sufficient; live monitoring adds infra cost |
| Raw system prompt editor | 95% of merchants can't write prompts; use personality presets |
| CSV import as primary method | High friction; auto-sync + scraper are primary |
| Per-conversation pricing | Creates anxiety; use included minutes model |
| Redis (standalone) | Only if n8n queue mode requires it; evaluate post-launch |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 through SEC-04 | Phase 0 | Pending |
| AGT-01 through AGT-06 | Phase 1 | Pending |
| KB-01 through KB-07 | Phase 2 | Pending |
| DB-01 through DB-04 | Phase 1 | Pending |
| WDG-01 through WDG-07 | Phase 3 | Pending |
| AUT-01 through AUT-06 | Phase 4 | Pending |
| ONB-01 through ONB-07 | Phase 5 | Pending |
| CFG-01 through CFG-08 | Phase 6 | Pending |
| BIL-01 through BIL-09 | Phase 7 | Pending |
| ANL-01 through ANL-06 | Phase 8 | Pending |
| DSN-01 through DSN-05 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after research synthesis*
