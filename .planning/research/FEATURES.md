# Feature Landscape

**Domain:** AI Voice Assistant SaaS — B2B merchant self-service platform
**Project:** SimplifyOps
**Researched:** 2026-03-13
**Confidence note:** WebSearch and Brave Search unavailable. Analysis based on training data (cutoff August 2025) + deep codebase reading. Confidence is MEDIUM overall — core patterns are well-established in the conversational AI SaaS space by this date, but specific competitive benchmarks are unverified. Flag for validation against Bland.ai, Retell.ai, ElevenLabs Conversational, and Voiceflow before launch.

---

## 1. Merchant Self-Service Agent Configuration

### Table Stakes

Features merchants expect immediately. Missing any of these = they abandon during trial.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Voice selection (male/female/tone) | First thing every merchant asks — "does it sound like us?" | Low | ElevenLabs has 100+ voices; present a curated shortlist of 8-12 with previews. Avoid presenting all 100+. |
| Greeting message customization | Merchants want their brand voice, not a generic opener | Low | Single text field + preview. Already in `StoreSettings.greeting_message`. |
| Widget color + position | Visual fit to store brand — merchants notice immediately | Low | Already in `StoreSettings`. Color picker + 4 position options (corners). |
| Enable/disable toggle | Merchants need to pause for sales events, holidays, maintenance | Low | Already in `StoreSettings.enabled`. Needs to propagate to embed.js. |
| Language selection | Non-English stores won't convert without this | Low | ElevenLabs supports 28+ languages. Single dropdown. |
| Embed code / install instructions | How they actually go live — must be copy-paste simple | Low | One `<script>` tag with `store_id`. Should auto-generate on onboarding. |

### Differentiators

Competitive advantage — not expected, but high-value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Agent "personality" presets | Instead of raw prompt editing, merchants pick "Friendly & Casual", "Professional", "Energetic Sales" — preset translates to ElevenLabs system prompt template | Medium | Hides complexity. Most merchants cannot write system prompts. Preset library of 5-8 personas per agent type. |
| Live preview widget in dashboard | Merchant can talk to their agent before going live — removes fear | Medium | Embed the actual widget in an iframe with the current config. Critical for "aha moment". |
| Business hours schedule | Agent active only Mon-Fri 9-5, or 24/7 — prevents bad CX when merchant is offline | Medium | Cron-style or simple time-range UI. Paired with "offline message". |
| Escalation / handoff message | "I'll connect you with a human" when agent can't help — prevents abandonment | Low | Simple text field + optional email/link. Table stakes for service businesses, differentiator for e-commerce. |
| Agent response speed tuning | "How fast does it reply?" — some merchants want thoughtful pauses, some want instant | Low | ElevenLabs `stability` + `similarity_boost` params. Expose as slider labeled "Response style: Quick → Thoughtful". |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Raw system prompt editor | 95% of merchants have no idea what a system prompt is — it causes anxiety and wrong configurations | Use personality presets backed by templates merchants never see |
| "Advanced settings" accordion with 20+ options | Paradox of choice — merchants don't configure anything, or configure things that break the agent | Surface 3-5 key settings, hide everything else behind a "Contact support" path |
| Per-product override settings | Extremely high complexity for marginal gain at v1 | Use knowledge base entries with agent-level instructions instead |
| A/B testing for agent voices | Valid idea, but requires enough traffic to be meaningful — most v1 merchants won't have it | Defer to v2, offer simple voice swap with before/after comparison instead |

---

## 2. Voice Agent Knowledge Base Management

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shopify auto-sync | Shopify merchants expect zero manual work — "it just knows my catalog" | High | Shopify webhook `products/create`, `products/update`, `products/delete` + initial bulk sync. Already partially built in `shopify_service.py`. |
| Manual product add/edit (non-Shopify) | Non-Shopify merchants have no other option | Medium | Simple form: name, description, price, URL, category. Stored as knowledge base entries in Neon. |
| Sync status indicator | "Is my catalog up to date?" — merchants will worry without this | Low | Last synced timestamp + product count. Green/yellow/red status badge. |
| Manual re-sync trigger | "My products changed and the agent doesn't know" — safety valve | Low | "Sync Now" button calling the same bulk-sync endpoint. Crucial for trust. |
| Product count visible | Merchants need to confirm the agent knows all their products | Low | "Your agent knows 142 products" — shown prominently on knowledge base page. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Website scraper for non-Shopify | URL → agent knows the whole store without manual entry | High | Firecrawl or similar crawler → product extraction via OpenAI → knowledge base. This is the non-Shopify acquisition channel's key feature. |
| Custom FAQ / knowledge entries | Agent can answer "What's your return policy?" or "Do you ship internationally?" — prevents frustration | Low | Simple CRUD text entries alongside products. Label as "Custom Q&A". Critical for service businesses. |
| Knowledge base search preview | Merchant types a query and sees what the agent would retrieve — builds trust in the system | Medium | Vector similarity search on the merchant's own knowledge base. Shows "Your agent would find these 3 results." |
| Exclusion list | Merchant can mark products as "don't recommend this" (out of stock, discontinued) without deleting | Low | Boolean flag per product in the DB. Agent system prompt includes exclusion IDs or category. |
| Product priority / featured items | Merchant can boost certain products — "always mention this collection first" | Low | Simple priority field 1-10 per product group. Translates to ordering in agent context window. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| CSV import as primary method | High friction, error-prone, merchants skip it | Make auto-sync + scraper primary; offer CSV as a fallback export/import only |
| Real-time inventory sync | Requires Shopify inventory-level webhooks, adds cost, and agents rarely need exact inventory counts | Sync product availability (in stock / out of stock) daily; don't sync exact quantities |
| Embedding model selection | Merchants don't understand embeddings | Pick one model (OpenAI `text-embedding-3-small`), hide it entirely |
| Chunking strategy UI | Zero value for merchants | Handle automatically server-side based on content type |

---

## 3. Analytics Merchants Actually Care About

### Research finding (MEDIUM confidence)
Based on patterns from Intercom, Drift, Tidio, and conversational AI platforms: merchants care about *business outcomes*, not technical metrics. Conversation count is vanity; revenue attribution is what drives renewal decisions.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Total conversations (daily/weekly/monthly) | "Is anyone using this?" — first question every merchant asks | Low | Already in `DashboardStats`. Add trend vs previous period ("+12% vs last week"). |
| Conversations chart over time | Visual proof that engagement exists or is growing | Low | Already in `call_data` on dashboard. |
| Average conversation duration | Proxy for engagement quality — too short = not helpful, too long = frustrating | Low | Derived from `duration_seconds` in `ConversationRecord`. |
| Top intents / what customers asked about | Merchants want to know what customers want — business intelligence | Low | Already in `intent_data`. Make it readable: "47% of conversations were product searches." |
| Recent conversation list | Merchants want to read actual transcripts — "what did my customers say?" | Low | Already in `recent_conversations`. Add click-through to full transcript. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Add-to-cart rate | "Is the agent actually selling?" — closest proxy to revenue impact | Medium | Track via ElevenLabs post-call webhook `cart_actions`. Show as percentage of conversations. Already partially tracked. |
| Conversion attribution | "This agent contributed to X orders this week" — makes ROI tangible and justifies renewal | High | Requires correlating conversation sessions with Shopify order IDs. Needs Shopify order webhook. This is the single most important retention metric. |
| Customer satisfaction signal | Did the customer find what they wanted? Proxy via conversation completion vs abandonment | Medium | Classify conversations as "resolved" / "abandoned" / "escalated" via GPT-4o-mini post-call. Show as satisfaction score. |
| Unanswered questions log | "Your agent couldn't answer these 23 questions this week" — actionable insight for knowledge base improvement | Medium | Flag conversations where agent said "I don't know" or similar. Display as list with "Add to FAQ" button. |
| Peak usage hours | When are customers using voice? Helps merchants plan | Low | Aggregate conversation timestamps by hour of day. Heatmap or bar chart. |
| Agent ROI estimate | "$X in assisted revenue this month" — even a rough estimate dramatically increases renewal rates | High | Requires order attribution. Use average order value × conversations with cart adds as a floor estimate. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Response latency metrics | Merchants don't care about milliseconds — they care about outcomes | Surface only if p99 latency is bad enough to affect CX |
| Token usage charts | Completely meaningless to merchants | Show this only on internal admin view for cost monitoring |
| Confusion matrix / NLU accuracy | This is internal quality monitoring, not merchant-facing | Turn into "Agent accuracy score" — a single percentage if surfaced at all |
| Per-product analytics at v1 | High complexity, low insight value until conversation volume is significant | Show "top products discussed" as a simple list for now |
| Real-time conversation monitoring | Low value at v1 traffic levels, high infrastructure cost | Post-call analytics is sufficient; add live monitoring at v2 |

---

## 4. Pricing and Packaging for AI SaaS with Per-Usage Components

### Research finding (MEDIUM confidence)
The established pattern for AI SaaS with usage components (confirmed by Intercom's 2024 pricing restructure, Bland.ai, Retell.ai, and ElevenLabs own pricing): flat subscription for access + usage credits for consumption. Pure pay-per-conversation fails at acquisition (too much friction); pure flat subscription fails at scale (margin collapse). Hybrid wins.

### Recommended Model for SimplifyOps

**Structure:** Monthly subscription tier (unlocks features) + conversation minutes included + overage rate

```
Starter   $39/mo  → 100 conversation minutes/mo + 1 agent + Shopify only
Growth    $99/mo  → 400 conversation minutes/mo + 1 agent + Shopify + website scraper
Scale    $299/mo  → 2,000 conversation minutes/mo + 3 agents + all agent types + priority support
```

**Overage:** $0.08/minute over included (ElevenLabs charges ~$0.05-0.11/min; margin is tight — model this carefully)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 14-day free trial, no card required | Industry standard — card-required trials see 60%+ lower signup rates | Low | Already in PROJECT.md. Enforce via trial_end timestamp in DB. |
| Usage meter visible in dashboard | Merchants need to know how many minutes they've used to avoid surprise charges | Low | "You've used 67 of 100 minutes this month." Progress bar. |
| Warning at 80% usage | Prevents angry surprise bills — proactive communication is table stakes | Low | n8n automation: check usage daily, email at 80% threshold. |
| Upgrade prompt in dashboard | When merchant hits limit, show upgrade path immediately in-app | Low | Banner/modal: "You've reached your limit. Upgrade to Growth for 4x the minutes." |
| Stripe Customer Portal | Merchants expect self-service billing management (cancel, update card, view invoices) | Low | Already using Stripe; enable Customer Portal. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rollover minutes (partial) | Unused minutes roll over 1 month — reduces churn from merchants who had a slow month | Medium | Cap rollover at 50% of monthly allotment. Requires usage tracking with carry-forward logic. |
| Annual plan discount | 2 months free (~17% off) — reduces churn, improves cash flow | Low | Stripe supports annual billing natively. Show annual toggle on pricing page. |
| Add-on conversation packs | Merchants can buy extra minutes without upgrading tier — reduces forced-upgrade churn | Low | Stripe one-time purchase for credit bundle. E.g., 200 extra minutes for $15. |
| Agent-type gating | Different agent types (Lead Gen, Service, E-commerce) are tier-gated — creates upgrade path | Low | Store `allowed_agent_types` per plan in config. Already in PROJECT.md plan. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Per-conversation pricing (primary model) | Creates anxiety — merchants avoid enabling the agent if every conversation costs money | Use minutes-included model; hide per-conversation cost |
| Immediate hard cutoff at usage limit | Merchant's live widget goes dead mid-day — catastrophic trust failure | Soft limit: allow 10% overage buffer, then send email, then disable after 24h |
| Feature-locked analytics (no analytics on free trial) | Merchants need to see value during trial to convert — hiding analytics prevents conversion | Give full analytics during trial; gate only on usage volume |
| Complex 7-tier pricing | Decision paralysis — merchants don't upgrade, they leave | 3 tiers maximum. The current Starter/Growth/Scale is correct. |

---

## 5. Onboarding Flow — Getting to "Aha Moment"

### Research finding (MEDIUM confidence)
The "aha moment" for an AI voice product is hearing the agent talk about YOUR products. Not a demo, not a generic agent — YOUR agent, with YOUR catalog. Every minute between signup and that moment is churn risk.

### The SimplifyOps "Aha Moment"
Merchant hears the agent say: "Welcome to [their store name]! Looking for something specific?" — with the right voice and their catalog already loaded.

**Target time to aha moment: under 5 minutes.**

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Single-page onboarding (not multi-step wizard) | Multi-step wizards have 40-70% drop-off per step | Medium | Collect: store name, website URL, store type (Shopify/website/service). One form, one submit. |
| Auto-create agent on signup | Merchant should have a working agent before they finish reading the welcome email | High | n8n workflow: signup event → create ElevenLabs agent → populate with default knowledge → update DB. The #1 architectural requirement from PROJECT.md. |
| Shopify "connect in 1 click" | Shopify merchants expect OAuth, not API key copy-paste | Medium | Shopify OAuth install flow → auto-sync products → agent knows catalog within 2 minutes. |
| Progress indicator during setup | "Your agent is being created (30 seconds)" — prevents abandonment during async operations | Low | Show spinner with progress messages: "Creating agent... Syncing products... Almost ready!" |
| Welcome email with embed code | Merchant should receive actionable next steps immediately | Low | n8n: post-creation → send transactional email with embed snippet + link to dashboard. |
| Default sensible configuration | Merchant shouldn't have to configure anything to go live | Low | Sensible defaults: friendly female voice, blue widget, bottom-right, English, generic greeting. Merchant can customize after live. |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Try it now" live demo on landing page | Visitor talks to a demo agent before signing up — removes fear of the unknown, highest-converting landing page element for voice products | Medium | Embed a generic demo agent on the landing page. Merchant prospects experience the product before paying. Mentioned in PROJECT.md as a go-to-market item. |
| In-dashboard interactive tutorial | First-time dashboard visit shows a tooltip tour: "Here's your embed code → Here's your knowledge base → Here's your analytics" | Low | Use a library like Shepherd.js or Intro.js. Dismissible, skippable. |
| "Your store is live" moment | After first conversation is detected, send a push/email: "Your first customer just talked to your agent!" — creates emotional hook | Medium | n8n: webhook on first conversation → trigger celebration email/in-app notification. |
| Video walkthrough (2 min) | Not everyone reads — embedded Loom-style video of "install in 3 steps" | Low | Record once, embed on onboarding page and welcome email. |
| Shopify App Store presence | Most Shopify merchants discover tools in the App Store — being there is a distribution channel | High | The `ai-voice-shopping-assistant/` scaffold already exists. Polish and submit. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Requiring credit card before trial | Kills 60%+ of signups that would have converted after trial | Card on file only at trial-end conversion |
| Making merchants write system prompts during onboarding | Immediately alienates non-technical merchants — they'll close the tab | Use auto-generated prompts from store type + personality preset |
| Multiple DNS/code install steps | Each step is a potential churn point for non-technical merchants | One `<script>` tag only. No DNS records, no backend integration required for basic. |
| Forcing product sync before any access | "You must sync 500 products before you can test the agent" — blocks aha moment | Let merchant talk to the agent immediately with default knowledge; sync in background |
| Email-only onboarding with no in-app guidance | Merchants who skip email onboarding have no recovery path | In-app "Setup Checklist" widget showing completion percentage |

---

## 6. Agent Types for Different Business Niches

### Research finding (MEDIUM confidence)
Segment-specific agents are a proven differentiation strategy in the conversational AI platform space (Voiceflow, Tidio, Intercom all segment by use case). The key insight: different agent types need fundamentally different system prompts, knowledge structures, and success metrics. Pretending one agent type fits all degrades quality for every segment.

### Agent Type: Online Store / E-commerce

**Core job:** Product discovery → recommendation → add-to-cart
**Primary metrics:** Add-to-cart rate, product click-through, conversation-to-purchase
**Knowledge structure:** Product catalog, categories, pricing, promotions, shipping/returns policy
**System prompt focus:** "Help customers find products, recommend based on preferences, answer product questions"
**Required features:**
- Shopify sync (deep integration)
- Product recommendation engine (already in `recommendation_engine.py`)
- Cart action tracking via post-call webhook

| Feature | Complexity | Priority |
|---------|------------|----------|
| Product search by natural language | Medium | P0 |
| "Do you have X under $Y?" queries | Low (prompt engineering) | P0 |
| Complementary product suggestions | Medium | P1 |
| Current promotions / sale items | Low | P1 |
| Out-of-stock handling with alternatives | Low | P1 |
| Order status queries (if Shopify connected) | High | P2 |

### Agent Type: Service Business / Appointment Booking

**Core job:** Answer service questions → qualify intent → book appointment or capture lead
**Primary metrics:** Qualification rate, booking rate, lead capture rate
**Knowledge structure:** Services offered, pricing, availability, FAQs, location/contact
**System prompt focus:** "Help customers understand our services, qualify their needs, collect contact info or direct to booking"
**Required features:**
- Custom FAQ/knowledge entries (critical — service businesses have unique Q&A)
- Lead capture form integration (name, email, phone, service interest)
- Calendar booking link or redirect

| Feature | Complexity | Priority |
|---------|------------|----------|
| Service description Q&A | Low | P0 |
| Pricing range questions | Low | P0 |
| Lead capture (name + contact + need) | Medium | P0 |
| Booking link / calendar redirect | Low | P1 |
| "Is [service] right for me?" qualification | Low (prompt engineering) | P1 |
| Appointment reminder integration | High | P2 (defer) |

### Agent Type: Sales / Lead Generation

**Core job:** Qualify visitors as prospects → capture contact info → hand off to sales team
**Primary metrics:** Lead capture rate, qualification rate, email list growth
**Knowledge structure:** Value proposition, pricing tiers, competitor positioning, objection handling
**System prompt focus:** "Engage visitors, understand their problem, position the product as the solution, collect contact info for follow-up"
**Required features:**
- Lead capture with CRM webhook (HubSpot/Mailchimp/webhook URL)
- Objection handling playbook in knowledge base
- Conversation summary emailed to merchant post-lead

| Feature | Complexity | Priority |
|---------|------------|----------|
| Visitor intent qualification | Low (prompt engineering) | P0 |
| Contact capture (name, email, company, pain point) | Medium | P0 |
| Value prop delivery | Low (prompt engineering) | P0 |
| CRM/email webhook on lead capture | Medium | P1 |
| Lead quality scoring | Medium | P1 |
| Follow-up email automation | High | P2 (defer) |

### Feature-to-Plan Matrix

| Agent Type | Starter ($39) | Growth ($99) | Scale ($299) |
|------------|---------------|--------------|--------------|
| Online Store | Yes | Yes | Yes |
| Service Business | No | Yes | Yes |
| Sales / Lead Gen | No | No | Yes |
| Custom (all types combined) | No | No | Yes |

*Rationale: Gate agent types by plan to create a clear upgrade path. E-commerce is the primary acquisition channel (Shopify), so it's on every plan.*

---

## Feature Dependencies

```
Shopify Product Sync → Online Store Agent (Sync must work before agent knows catalog)
Agent Creation API → All agent types (No agent = no features)
Per-merchant ElevenLabs agent → Agent configuration (Can't configure shared agent)
Knowledge Base entries → Agent knowledge (KB must exist before agent can answer)
Post-call webhook → Analytics (No webhook = no data)
Usage tracking → Billing (Must track minutes to charge correctly)
Conversion attribution → ROI analytics (Requires Shopify order webhook)
Lead capture → Lead Gen agent type (Core to that agent's purpose)
```

---

## MVP Feature Priority Matrix

### P0 — Launch Blockers (Without these, no launch)

1. Multi-tenant agent creation (one ElevenLabs agent per merchant)
2. Shopify product sync (auto, via webhook)
3. Agent embed.js loading correct agent by store_id
4. Onboarding: signup → agent created → embed code shown (under 5 min)
5. Usage tracking (minutes per merchant per month)

### P1 — High Value, Close After Launch

6. Website scraper for non-Shopify merchants
7. Agent personality presets (5-8 options)
8. Conversion attribution via Shopify order correlation
9. Unanswered questions log (actionable analytics)
10. Business hours scheduling
11. In-dashboard live agent preview/test

### P2 — Differentiators, Post-Launch

12. Lead capture CRM webhook
13. Annual billing plan
14. Rollover minutes
15. "Your first customer" celebration notification
16. Order status queries via Shopify API

### Defer to v2

17. Custom LLM fine-tuning
18. Real-time conversation monitoring
19. White-label / reseller
20. Appointment booking integration
21. AI-generated marketing content

---

## Sources

**Confidence assessment:**
- Agent configuration best practices: MEDIUM — derived from ElevenLabs Conversational AI documentation patterns (training data) and comparison with Voiceflow, Bland.ai, Retell.ai positioning
- Analytics metrics: MEDIUM — derived from Intercom, Drift, Tidio public case studies and SaaS analytics literature
- Pricing model: MEDIUM — derived from Bland.ai ($0.09/min), Retell.ai ($0.07/min), ElevenLabs (per-character/minute), and Intercom's 2024 usage-based restructure
- Onboarding patterns: MEDIUM — derived from SaaS onboarding research (Samuel Hulick / UserOnboard, Wes Bush / Product-Led Growth)
- Agent types: HIGH — directly informed by PROJECT.md requirements and established conversational AI use case taxonomy

**Verification recommended before launch:**
- ElevenLabs pricing per minute for agents: verify at https://elevenlabs.io/pricing (may have changed)
- Competitor feature sets: check Bland.ai dashboard, Retell.ai, Synthflow.ai for feature benchmarking
- Shopify App Store requirements: verify submission checklist at https://shopify.dev/docs/apps/launch/app-reviews
