# Architecture Patterns: Multi-Tenant AI Voice SaaS

**Domain:** Multi-tenant AI voice assistant SaaS (B2B, merchant-facing)
**Researched:** 2026-03-13
**Confidence:** HIGH (ElevenLabs API verified via official docs) / MEDIUM (n8n patterns from training knowledge)

---

## Recommended Architecture

### Top-Level System View

```
┌─────────────────────────────────────────────────────────┐
│  Merchant Browser (Dashboard)                           │
│  Next.js 16 — Vercel                                    │
│  Auth: Neon Auth (Supabase-compatible)                  │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS REST
                 ▼
┌─────────────────────────────────────────────────────────┐
│  FastAPI Backend — Railway                              │
│  Agent Mgmt | Product Sync | Webhooks | Dashboard API   │
└────┬───────────────────────────┬────────────────────────┘
     │ asyncpg                   │ HTTP webhooks / API calls
     ▼                           ▼
┌──────────────┐       ┌─────────────────────────────────┐
│ Neon PG v17  │       │  ElevenLabs Conversational AI   │
│ (eu-central) │       │  Per-merchant agents            │
│ pgvector ext │       │  Per-agent knowledge bases      │
└──────────────┘       └────────────┬────────────────────┘
                                    │ post-call webhook
                                    ▼
                       ┌─────────────────────────────────┐
                       │  n8n Automation — Railway       │
                       │  Onboarding | Sync | Alerts     │
                       └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Merchant's Website (Customer-Facing)                   │
│  <script src="cdn.simplifyops.co/embed.js?store=UUID">  │
│  Loads isolated widget → connects to merchant's agent   │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Multi-Tenant Agent Isolation Strategy

### Recommendation: One ElevenLabs Agent Per Merchant

**Verdict: Per-merchant agent is the correct approach for v1.**

Two options were evaluated:

| Criterion | Per-Merchant Agent | Shared Agent + Dynamic Context |
|-----------|-------------------|-------------------------------|
| Knowledge base isolation | Hard boundary — each agent's KB is scoped | Shared KB or large prompt injection |
| Voice / personality config | Independent per merchant | Shared voice, overrides fragile |
| Conversation history isolation | Automatic | Requires custom session scoping |
| Prompt contamination risk | Zero | High — long shared prompt with all catalogs |
| ElevenLabs RAG | Per-agent KB, 100–500MB per agent (Pro/Scale) | Not viable at scale |
| Cost model | Per-agent-minute billing, predictable | Same billing, complexity overhead |
| Tool call routing | Agent knows its `store_id` by construction | Must inject `store_id` per-session |
| Cold start for new merchant | 1× API call to create agent | No extra API call |
| ElevenLabs API support | `POST /v1/convai/agents/create` — confirmed | Dynamic variables confirmed but limited |

**Rationale:** ElevenLabs Knowledge Base is per-agent. A merchant's 500-product catalog (as text/JSON) cannot be reliably injected as a dynamic variable per session — it would blow the context window. The per-agent model gives each merchant a clean knowledge base, their own voice, their own system prompt, and isolated analytics. This is also more defensible as a premium product offering ("your own AI agent").

**Dynamic variables are not discarded.** They are used within the per-merchant agent to inject session-level context that changes per customer interaction: customer name, cart contents, current page URL. This is the correct layered approach.

### Agent Lifecycle

```
Merchant Signs Up
       │
       ▼
POST /v1/convai/agents/create
  conversation_config.agent:
    first_message: "Hi! I'm [store_name]'s assistant..."
    prompt: {
      prompt: "[merchant system prompt]",
      llm: "gpt-4o-mini",
      knowledge_base: []   // populated after product sync
    }
  conversation_config.tts:
    voice_id: "[merchant chosen voice]"
       │
       ▼
Store agent_id in stores.elevenlabs_agent_id
       │
       ▼
Trigger initial product sync
  → build product text document
  → POST /v1/convai/knowledge-base/text
  → attach knowledge_base doc id to agent via PATCH /v1/convai/agents/{agent_id}
       │
       ▼
Merchant installs embed.js → customers can talk
```

---

## 2. Product Knowledge Base Architecture

### Knowledge Base as Text Document Per Merchant

ElevenLabs supports per-agent knowledge bases with RAG (vector retrieval). Each merchant's products are serialized as a structured text document and uploaded to ElevenLabs.

**Document format (product catalog text):**

```
STORE: Acme Footwear
PRODUCTS:

[ID:1001] Nike Air Max 270 | Category: Sneakers | Price: $129.99
Tags: running, cushioned, men, women | Available sizes: 7-13
Description: Lightweight everyday running shoe with Max Air heel unit.

[ID:1002] Adidas Ultraboost 22 | Category: Sneakers | Price: $189.99
...
```

This format is LLM-readable and survives RAG chunking well. Products become discrete retrievable chunks.

**RAG retrieval during live conversation (confirmed ~500ms latency per ElevenLabs docs):**

```
User: "Do you have any red running shoes under $150?"
       │
       ▼
ElevenLabs RAG → vector search over merchant's KB
       │
       ▼
Relevant product chunks injected into LLM context
       │
       ▼
Agent responds with specific product names and prices
```

**Knowledge base update strategy:**

| Trigger | Action |
|---------|--------|
| Shopify `products/create` webhook | Append new product to KB document, re-upload |
| Shopify `products/update` webhook | Rebuild and re-upload KB document |
| Shopify `products/delete` webhook | Rebuild and re-upload KB document |
| Manual "Sync Now" in dashboard | Full rebuild and re-upload |
| n8n scheduled sync (daily) | Full rebuild as safety net |

**KB document storage:** Store the rendered text document in Neon (`stores.kb_document_text`) so it can be regenerated without re-querying Shopify. Store the ElevenLabs KB document ID in `stores.elevenlabs_kb_doc_id` for targeted updates.

**Embedding column in `products` table:** The existing `embedding VECTOR(1536)` column in the products table supports an optional secondary path: FastAPI can serve real-time product search via pgvector (the `search_products` endpoint already exists). This is used by ElevenLabs server tool calls for queries more complex than what RAG alone handles (e.g., "show me three products under $50 in stock").

### Two-Layer Product Retrieval

```
Layer 1: ElevenLabs RAG (primary)
  - Handles general browsing and recommendation questions
  - Low latency, no round-trip to FastAPI
  - Covers ~80% of customer queries

Layer 2: FastAPI server tool call → pgvector search (precision)
  - Used for: exact price filters, availability checks, cart operations
  - Agent calls: GET /api/products/search?store_id={store_id}&query={q}&max_price={p}
  - store_id is embedded in the tool URL at agent creation time: /api/products/search?store_id=UUID_HERE
  - Returns structured JSON: [{id, title, price, url, image}]
```

---

## 3. Widget embed.js Architecture

### One Script, Many Merchants

**CDN delivery strategy:**

```
<script src="https://cdn.simplifyops.co/embed.js" data-store-id="STORE_UUID"></script>
```

OR using a query param approach:

```
<script src="https://cdn.simplifyops.co/embed.js?s=STORE_UUID" async defer></script>
```

The `data-store-id` attribute approach is preferred — it avoids query string caching issues with most CDNs.

**What embed.js does at runtime:**

```javascript
// embed.js (minified, served from CDN or Vercel Edge)
(function() {
  const script = document.currentScript;
  const storeId = script.getAttribute('data-store-id') ||
                  new URLSearchParams(script.src.split('?')[1] || '').get('s');

  if (!storeId) return console.warn('[SimplifyOps] Missing data-store-id');

  // 1. Fetch widget config from FastAPI (cached 5 min)
  fetch(`https://api.simplifyops.co/api/widget/${storeId}/config`)
    .then(r => r.json())
    .then(config => {
      if (!config.enabled) return;

      // 2. Inject widget CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.simplifyops.co/widget.css';
      document.head.appendChild(link);

      // 3. Mount widget container
      const container = document.createElement('div');
      container.id = 'simplifyops-widget';
      document.body.appendChild(container);

      // 4. Load widget JS bundle (ElevenLabs @react SDK compiled to vanilla JS)
      const widgetScript = document.createElement('script');
      widgetScript.src = 'https://cdn.simplifyops.co/widget-bundle.js';
      widgetScript.onload = () => {
        window.SimplifyOpsWidget.init({
          storeId: storeId,
          agentId: config.agent_id,          // from FastAPI
          widgetColor: config.widget_color,   // merchant customization
          position: config.widget_position,
          greeting: config.greeting_message,
        });
      };
      document.head.appendChild(widgetScript);
    })
    .catch(err => console.warn('[SimplifyOps] Widget load failed', err));
})();
```

**Widget config endpoint (new, additive):**

```
GET /api/widget/{store_id}/config
→ {
    enabled: true,
    agent_id: "el_agent_xxx",     // the ElevenLabs agent ID for this store
    widget_color: "#256af4",
    widget_position: "bottom-right",
    greeting_message: "Hi! ...",
    voice_id: "el_voice_xxx"
  }
```

This endpoint is **public** (no auth) but the `store_id` is a UUID that cannot be guessed. Rate-limit aggressively (100 req/min per IP). Response must include `Cache-Control: public, max-age=300`.

**Why the agent_id comes from FastAPI, not hardcoded in embed.js:** The widget can be invalidated or updated centrally. If a merchant is suspended, `enabled: false` is returned and the widget silently does nothing. The CDN-cached `embed.js` itself never changes — only the per-store config changes.

**CDN strategy:**

- `embed.js` and `widget-bundle.js`: Vercel Edge Network (already hosting frontend). Deploy as Next.js API route or as static asset to `public/`. Alternatively use Cloudflare R2 + Workers.
- `widget.css`: Same CDN as embed.js
- Per-store config: FastAPI on Railway, NOT cached at CDN level (config must be live). FastAPI response includes `Cache-Control: public, max-age=300` for browser-side caching only.

**Versioning:** embed.js URL never contains a version hash (merchants paste it once, forever). widget-bundle.js DOES include a content hash for cache busting on deploy.

---

## 4. n8n Integration Architecture

### How n8n Connects to FastAPI and Neon

n8n runs as a separate service on Railway. It integrates with the rest of the system via two mechanisms:

**Mechanism A: FastAPI calls n8n via HTTP webhook triggers**

```
FastAPI event (merchant signs up)
  → POST https://n8n.railway.internal/webhook/merchant-onboarding
  → Payload: { store_id, user_email, shop_domain, plan }
  → n8n workflow runs:
       1. HTTP Request node → POST /v1/convai/agents/create (ElevenLabs)
       2. Postgres node → UPDATE stores SET elevenlabs_agent_id = $1
       3. HTTP Request node → POST /api/stores/{id}/sync (FastAPI, trigger product sync)
       4. Send email (Resend/SendGrid) → Welcome email to merchant
```

**Mechanism B: n8n uses Postgres node to read/write Neon directly**

n8n has a native Postgres node (confirmed available). For automation workflows that need to query or update the database without going through FastAPI (e.g., scheduled syncs, analytics aggregation), n8n connects to Neon via `DATABASE_URL_DIRECT`. This is acceptable for internal automation but must NOT be used for user-facing operations — those must go through FastAPI where auth/validation lives.

**n8n workflow catalog for v1:**

| Workflow | Trigger | What It Does |
|----------|---------|--------------|
| Merchant Onboarding | Webhook from FastAPI POST /onboarding | Create ElevenLabs agent → store agent_id → sync products → send welcome email |
| Product Sync Scheduled | Cron: 2 AM daily | Query stores needing sync → call FastAPI sync endpoint per store |
| Shopify Sync Webhook | Webhook from FastAPI product webhook | Rebuild KB document → re-upload to ElevenLabs |
| Post-Call Analysis | ElevenLabs post-call webhook (or FastAPI forwards) | Store transcript → call OpenAI for analysis → update analytics |
| Usage Alert | Cron: every hour | Query daily_analytics → send alert if conversation count near plan limit |
| Billing Events | Webhook from Stripe (via FastAPI) | Update subscription_tier in stores table |

**n8n-to-FastAPI authentication:** Use a shared secret header (`X-N8N-Secret: <env var>`). FastAPI validates on internal endpoints prefixed `/internal/`.

**Important constraint:** n8n workflows that call ElevenLabs directly (e.g., agent creation) duplicate knowledge from FastAPI. Prefer routing through FastAPI endpoints so business logic stays in one place. n8n handles orchestration and scheduling, not business logic.

---

## 5. Voice Conversation Data Flow (End-to-End)

### Phase 1: Widget Load (customer visits merchant's site)

```
1. Browser parses <script data-store-id="UUID">
2. embed.js IIFE runs immediately
3. GET /api/widget/{UUID}/config  (FastAPI, cached 5min)
4. Response: { agent_id, widget_color, position, enabled: true }
5. Widget bundle injected into DOM
6. Floating mic button rendered
```

### Phase 2: Conversation Start (customer clicks mic)

```
7. Browser requests microphone permission
8. Widget calls ElevenLabs @elevenlabs/react: conversation.startSession({
     agentId: config.agent_id,
     connectionType: "webrtc",
     dynamicVariables: {
       page_url: window.location.href,
       store_name: config.store_name,
       // optional: cart_contents if merchant injects cart data
     },
     clientTools: {
       addToCart: async ({product_id, variant_id}) => {
         // call merchant's Shopify cart API directly
         return await addToShopifyCart(product_id, variant_id);
       },
       navigateToProduct: async ({product_url}) => {
         window.location.href = product_url;
       }
     }
   })
9. WebRTC connection established: Browser ↔ ElevenLabs servers
```

### Phase 3: Live Conversation (real-time, all in ElevenLabs)

```
10. Customer speaks → ElevenLabs ASR transcribes
11. Transcript fed to LLM (gpt-4o-mini or configured model)
12. LLM decides: answer from knowledge base OR call a server tool
13a. IF knowledge base answer:
     - ElevenLabs RAG: vector search over merchant's KB (~500ms)
     - LLM generates response with product details
     - ElevenLabs TTS synthesizes voice response
     - Audio streamed back to browser via WebRTC
13b. IF server tool call (product search, availability check):
     - ElevenLabs calls: GET https://api.simplifyops.co/api/products/search
       ?store_id=UUID&query="red running shoes"&max_price=150
     - FastAPI queries Neon: pgvector similarity + SQL filter
     - Returns [{id, title, price, url, in_stock}]
     - ElevenLabs injects result into LLM context
     - LLM generates response
     - TTS + WebRTC stream
13c. IF client tool call (add to cart, navigate):
     - ElevenLabs sends tool invocation over WebRTC to browser
     - Widget JavaScript executes the function
     - Returns result to ElevenLabs (if expects_response: true)
14. Conversation continues in real-time loop
```

### Phase 4: Conversation End

```
15. Customer or agent ends session
16. WebRTC connection closed
17. ElevenLabs sends post-call webhook:
    POST https://api.simplifyops.co/webhook/elevenlabs/post-call
    {
      type: "post_call_transcription",
      data: {
        agent_id: "el_agent_xxx",
        conversation_id: "conv_xxx",
        transcript: [...],
        metadata: { duration_seconds, cost }
      }
    }
18. FastAPI post-call handler:
    a. Look up store_id from agent_id: SELECT id FROM stores WHERE elevenlabs_agent_id = $1
    b. Call OpenAI GPT-4o-mini for shopping intent analysis
    c. INSERT INTO conversations (store_id, transcript, intent, sentiment, ...)
    d. UPSERT daily_analytics
    e. Optionally: forward event to n8n webhook for additional automation
```

**Latency budget for live conversation:**
- ASR: ~200ms (ElevenLabs)
- LLM + RAG: ~800ms total (500ms RAG + 300ms generation)
- Server tool call path: +300-500ms (FastAPI pgvector query on Neon)
- TTS streaming: starts within ~200ms of LLM completion
- Total perceived latency: 1.0-1.5s per turn (acceptable for voice)

---

## 6. Shopify Product Sync Architecture

### Recommendation: Webhooks Primary, Scheduled Polling as Safety Net

**Webhooks (primary — real-time):**

Shopify sends webhooks for `products/create`, `products/update`, `products/delete`. FastAPI already has the handler at `/shopify/webhooks/products/{action}`. This handler needs to be extended to:

1. Update the `products` table (existing behavior)
2. Regenerate the merchant's KB text document
3. Re-upload the KB document to ElevenLabs (PATCH agent's knowledge_base)

HMAC verification is already implemented (`shopify_service.verify_hmac`).

**Scheduled polling (safety net — n8n cron, daily at 2 AM):**

Shopify webhooks are not 100% reliable — they can miss events under load. A daily full sync via n8n cron ensures the KB stays current. The sync calls `POST /api/stores/{store_id}/sync` for each active store (already implemented, just needs the KB re-upload step added).

**Data normalization layer:**

Shopify products have complex variant/option structures. The normalization pipeline (already partially in `shopify_service.py`) must produce a flat representation:

```python
def normalize_shopify_product(raw: dict) -> dict:
    return {
        "id": raw["id"],
        "title": raw["title"],
        "description": strip_html(raw.get("body_html", "")),
        "product_type": raw.get("product_type", ""),
        "tags": raw.get("tags", "").split(", "),
        "price_min": min(float(v["price"]) for v in raw["variants"]),
        "price_max": max(float(v["price"]) for v in raw["variants"]),
        "variants": [{"id": v["id"], "title": v["title"], "price": v["price"],
                      "available": v["inventory_quantity"] > 0}
                     for v in raw["variants"]],
        "image": raw["images"][0]["src"] if raw.get("images") else None,
    }
```

The `variants` list enables the agent to answer "do you have this in size M?" precisely.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Frontend (Next.js/Vercel) | Merchant dashboard UI, auth, onboarding | FastAPI (REST), Neon Auth |
| FastAPI (Railway) | Business logic, agent management, API, webhooks | Neon DB, ElevenLabs API, Shopify API, n8n |
| embed.js + widget-bundle.js (CDN/Vercel) | Customer-facing voice UI | FastAPI (config endpoint), ElevenLabs (WebRTC) |
| ElevenLabs Conversational AI | Real-time voice, LLM, RAG, TTS/ASR | FastAPI (server tools), widget (client tools), post-call webhook |
| n8n (Railway) | Automation, scheduled jobs, notifications | FastAPI (internal endpoints), Neon DB (direct), external APIs |
| Neon PostgreSQL | Persistent state, product data, analytics | FastAPI (asyncpg), n8n (Postgres node) |
| Shopify | Product catalog, OAuth | FastAPI (webhooks in, API calls out) |

---

## Database Schema Changes (Additive Only)

The following columns and tables must be added to the existing Neon schema. All changes are additive — no existing columns removed or renamed.

### Migration 002: Agent Management

```sql
-- Add ElevenLabs agent tracking to stores table
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS elevenlabs_kb_doc_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS kb_document_text TEXT,
  ADD COLUMN IF NOT EXISTS kb_last_synced_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS agent_type VARCHAR(50) DEFAULT 'online_store',
  ADD COLUMN IF NOT EXISTS agent_status VARCHAR(50) DEFAULT 'pending',
  -- agent_status: pending | creating | active | error
  ADD COLUMN IF NOT EXISTS store_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_stores_agent_id ON stores(elevenlabs_agent_id);
```

### Migration 003: Widget Configuration

The existing `settings` JSONB column on `stores` already holds widget config (color, position, voice_id, greeting). This is sufficient — no new table needed. Add one column for plan-level feature gating:

```sql
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS usage_minutes_this_month INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_conversations_this_month INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP DEFAULT date_trunc('month', NOW());
```

### Migration 004: Agent Types (for tiered pricing)

```sql
CREATE TABLE IF NOT EXISTS agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,          -- online_store, business_service, sales_lead
  display_name VARCHAR(100) NOT NULL,
  system_prompt_template TEXT NOT NULL,     -- {{store_name}}, {{store_url}} placeholders
  default_first_message TEXT NOT NULL,
  allowed_tiers TEXT[] DEFAULT '{starter,growth,scale}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data: INSERT agent_templates for each agent type
```

### Summary of New Columns on `stores`

| Column | Type | Purpose |
|--------|------|---------|
| `elevenlabs_agent_id` | VARCHAR(255) | ElevenLabs agent identifier |
| `elevenlabs_kb_doc_id` | VARCHAR(255) | Knowledge base document ID in ElevenLabs |
| `kb_document_text` | TEXT | Rendered product catalog text (cache) |
| `kb_last_synced_at` | TIMESTAMP | When KB was last uploaded to ElevenLabs |
| `agent_type` | VARCHAR(50) | online_store / business_service / sales_lead |
| `agent_status` | VARCHAR(50) | pending / creating / active / error |
| `store_name` | VARCHAR(255) | Display name (for agent greeting) |
| `website_url` | VARCHAR(500) | Non-Shopify URL (for website scraper) |
| `usage_minutes_this_month` | INT | Voice minutes consumed, for plan limits |
| `usage_conversations_this_month` | INT | Conversations this billing cycle |
| `usage_reset_at` | TIMESTAMP | When usage counters reset |

---

## Build Order (Dependency Graph)

What must exist before what can be built:

```
Layer 0 (Exists):
  ✓ FastAPI server, Neon DB, stores table, products table
  ✓ Shopify OAuth + product sync
  ✓ Post-call webhook (basic)
  ✓ ElevenLabs WebRTC widget (single agent)

Layer 1 (Foundation — build first):
  → Migration 002: Add agent columns to stores
  → FastAPI: AgentService class (create, update, delete ElevenLabs agents)
  → FastAPI: KnowledgeBaseService (build text doc, upload to ElevenLabs)
  → FastAPI: POST /internal/agents/create (called by n8n onboarding workflow)
  → FastAPI: GET /api/widget/{store_id}/config (public, no auth)

Layer 2 (depends on Layer 1):
  → n8n: Merchant Onboarding workflow (uses /internal/agents/create)
  → Product sync: extend existing sync to rebuild + re-upload KB
  → embed.js + widget-bundle.js (uses /api/widget/{store_id}/config)
  → Widget fetches agent_id dynamically instead of hardcoded env var

Layer 3 (depends on Layer 2):
  → Dashboard: Agent configuration page (voice, personality, knowledge)
  → Dashboard: Embed code generator (shows <script> tag with store_id)
  → Server tools: extend /api/products/search for ElevenLabs tool calls
    (needs: tool URL embedded in agent at creation time)
  → Client tools: add-to-cart, navigate-to-product in widget-bundle.js

Layer 4 (depends on Layer 3):
  → Agent preview/test page in dashboard
  → n8n: Product sync automation workflows
  → n8n: Post-call analysis pipeline (extend existing webhook)
  → Usage tracking: increment counters on each conversation end

Layer 5 (depends on Layer 4):
  → Pricing enforcement: check usage_conversations vs plan limits
  → Migration 003 + 004: usage tracking + agent templates tables
  → Agent types: different system prompts per type (online_store vs service)
  → Website scraper for non-Shopify merchants
```

---

## Architecture Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Single Agent with Context Injection
**What:** One ElevenLabs agent for all merchants, inject store context via dynamic variables.
**Why bad:** Dynamic variables are passed from the CLIENT. The customer's browser would need to receive the full product catalog to inject it, which is a security/performance disaster. RAG knowledge base is per-agent only — cannot be shared.
**Instead:** One agent per merchant, created at onboarding.

### Anti-Pattern 2: Storing agent_id Only in Frontend Env Vars
**What:** Current state — `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` is a single global value.
**Why bad:** Does not scale to multi-tenant, exposes agent IDs client-side unnecessarily.
**Instead:** Serve `agent_id` from `/api/widget/{store_id}/config` endpoint. Widget never has the agent_id until it requests config at runtime.

### Anti-Pattern 3: Rebuilding KB on Every Product Webhook
**What:** Immediately re-upload the full KB document on each product change event.
**Why bad:** ElevenLabs re-indexing takes seconds. A burst of Shopify webhooks (bulk import of 200 products) would trigger 200 re-uploads and potentially hit rate limits.
**Instead:** Debounce KB rebuilds. On webhook, mark `stores.kb_needs_rebuild = true`. A separate process (n8n cron every 5 min, or FastAPI background task) checks for dirty stores and rebuilds.

### Anti-Pattern 4: n8n Containing Business Logic
**What:** Putting product normalization, agent creation logic, auth checks inside n8n workflows.
**Why bad:** n8n workflows are hard to test, hard to version, hidden from code review.
**Instead:** n8n orchestrates — it calls FastAPI endpoints. FastAPI contains all business logic. n8n is limited to: scheduling, retry logic, notifications, chaining API calls.

### Anti-Pattern 5: Widget Making Direct ElevenLabs API Calls Without store_id Validation
**What:** Widget has the agent_id and calls ElevenLabs directly with no server validation.
**Why bad:** Cannot enforce plan limits, cannot detect if merchant is suspended, cannot track usage.
**Instead:** Widget fetches config from FastAPI first. FastAPI gate-checks the store status before returning `agent_id`. FastAPI post-call webhook tracks every conversation for usage billing.

---

## Scalability Considerations

| Concern | At 100 merchants | At 1K merchants | At 10K merchants |
|---------|-----------------|-----------------|-----------------|
| ElevenLabs agents | 100 agents, trivial | 1K agents, fine | 10K agents — verify ElevenLabs workspace limits |
| KB re-uploads | No issue | No issue | Batch/debounce required |
| Neon DB pool | min=2, max=10 sufficient | Increase max_size to 20 | Consider read replicas |
| FastAPI Railway | Single instance fine | 2 replicas | Horizontal scale + Redis for rate limiting |
| embed.js CDN | Vercel Edge, unlimited | Vercel Edge | Vercel Edge |
| Widget config endpoint | Vercel Edge cache helps | Add Redis cache layer | Redis + CDN cache |
| n8n workflows | Single n8n instance | Single instance | Multiple workers |

---

## Sources

- ElevenLabs Agent Creation API: https://elevenlabs.io/docs/eleven-agents/api-reference/agents/create.mdx — HIGH confidence (official docs)
- ElevenLabs Dynamic Variables: https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables.mdx — HIGH confidence
- ElevenLabs Knowledge Base RAG: https://elevenlabs.io/docs/eleven-agents/customization/knowledge-base/rag.mdx — HIGH confidence
- ElevenLabs Server Tools: https://elevenlabs.io/docs/eleven-agents/customization/tools/server-tools.mdx — HIGH confidence
- ElevenLabs Client Tools: https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools.mdx — HIGH confidence
- ElevenLabs Post-Call Webhooks: https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks.mdx — HIGH confidence
- ElevenLabs Knowledge Base text create: https://elevenlabs.io/docs/eleven-agents/api-reference/knowledge-base/create-from-text.mdx — HIGH confidence
- n8n Postgres node capability: MEDIUM confidence (training knowledge, unverified in this session)
- Multi-tenant JS widget CDN patterns: MEDIUM confidence (industry standard pattern, training knowledge)
