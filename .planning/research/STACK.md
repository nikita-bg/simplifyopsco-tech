# Stack Research — SimplifyOps AI Voice SaaS

**Confidence:** HIGH (derived from Architecture + Pitfalls research + existing codebase analysis)

## Existing Stack (Locked)

| Layer | Technology | Version | Deploy |
|-------|-----------|---------|--------|
| Frontend | Next.js + React 19 + Tailwind v4 | 16.1.6 | Vercel |
| Auth | Supabase Auth | Latest | Supabase Cloud |
| Backend | FastAPI + Uvicorn | 0.115.12 | Railway |
| Database | Neon PostgreSQL | v17 | aws-eu-central-1 |
| Voice AI | ElevenLabs Conversational AI | WebRTC SDK | ElevenLabs Cloud |
| Intelligence | OpenAI GPT-4o-mini | Latest | OpenAI Cloud |
| Payments | Stripe | Latest | Stripe Cloud |
| Shopify App | React Router v7 + Prisma | Latest | Railway |
| Automation | n8n | 1.115.3 | Local → Railway |

## New Stack Components Needed

### 1. ElevenLabs Agent Management API

**Endpoints (confirmed from docs):**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create agent | POST | `https://api.elevenlabs.io/v1/convai/agents/create` |
| Get agent | GET | `https://api.elevenlabs.io/v1/convai/agents/{agent_id}` |
| Update agent | PATCH | `https://api.elevenlabs.io/v1/convai/agents/{agent_id}` |
| Delete agent | DELETE | `https://api.elevenlabs.io/v1/convai/agents/{agent_id}` |
| List agents | GET | `https://api.elevenlabs.io/v1/convai/agents` |
| Create signed URL | GET | `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id={id}` |
| Add KB doc | POST | `https://api.elevenlabs.io/v1/convai/agents/{agent_id}/add-to-knowledge-base` |

**Python client:** `elevenlabs` Python SDK (already a dependency)

**Key constraints:**
- Signed URL mandatory for widget (API key never in browser)
- KB limit: 20MB / 300k characters per agent (non-enterprise)
- RAG adds ~500ms latency
- Burst pricing 2x at 3x concurrency

**Confidence:** HIGH — verified from official ElevenLabs docs

### 2. Vector Search — Neon pgvector (Recommended)

**Why pgvector over Pinecone/Qdrant:**
- Already available on Neon PostgreSQL (just `CREATE EXTENSION vector`)
- No additional service to manage/pay for
- Same database = simpler queries, joins with product data
- Sufficient for product catalog search (< 100K vectors per merchant)

**Setup:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Product embeddings for semantic search
ALTER TABLE products ADD COLUMN embedding vector(1536);
CREATE INDEX ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Embedding generation:** OpenAI `text-embedding-3-small` (1536 dims, $0.02/1M tokens)

**When to consider external vector DB:** Only if a single merchant exceeds 100K products (unlikely for v1)

**Confidence:** HIGH — pgvector on Neon is production-ready

### 3. n8n Deployment on Railway

**Strategy:** Deploy n8n as separate Railway service alongside FastAPI backend

**Docker image:** `docker.io/n8nio/n8n:1.115.3`

**Required env vars:**
```
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
N8N_ENCRYPTION_KEY=<generate>
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=<neon-host>
DB_POSTGRESDB_DATABASE=n8n_workflows
DB_POSTGRESDB_USER=<user>
DB_POSTGRESDB_PASSWORD=<pass>
WEBHOOK_URL=https://n8n.simplifyopsco.tech
```

**Key workflows:**
1. **Onboarding**: Signup webhook → Create ElevenLabs agent → Sync products → Generate embed code → Send welcome email
2. **Product sync**: Scheduled (daily) + Shopify webhook triggered → Rebuild KB document
3. **Alerts**: Usage threshold → Email merchant + Slack notification
4. **Post-call processing**: ElevenLabs post-call webhook → Conversation analysis → Analytics update

**Production hardening:**
- Queue mode with Redis for reliability
- Error handler workflow for failed pipelines
- Idempotent workflow design (safe to retry)

**Confidence:** MEDIUM — n8n on Railway is documented but queue mode may need license check

### 4. Website Product Scraper

**For non-Shopify merchants:**

**Recommended approach:** Server-side scraping with:
- `httpx` (already in backend deps) for HTTP requests
- `beautifulsoup4` for HTML parsing
- Structured data extraction (JSON-LD `Product` schema, Open Graph tags)

**Pipeline:**
1. Merchant enters website URL
2. Backend crawls product pages (BFS, max 500 pages)
3. Extracts product data from structured markup (JSON-LD preferred)
4. Falls back to heuristic extraction if no structured data
5. Normalizes to SimplifyOps product schema
6. Generates KB document for ElevenLabs agent

**Libraries:**
```
httpx>=0.27.0       # Already installed
beautifulsoup4>=4.12
lxml>=5.0           # Fast HTML parser
```

**Confidence:** MEDIUM — approach is sound, but quality depends heavily on site structure

### 5. Widget embed.js Architecture

**Served from:** FastAPI static file or CDN (Vercel Edge)

**Architecture:**
```javascript
// Merchant installs this:
<script src="https://api.simplifyopsco.tech/widget.js" data-store-id="store_xxx"></script>

// Widget flow:
// 1. Read data-store-id from script tag
// 2. Fetch config: GET /api/widget/config?store_id=store_xxx
// 3. Server returns: { agent_id, color, position, greeting, signed_url }
// 4. Initialize ElevenLabs WebRTC with signed_url
// 5. Render floating button with merchant's brand color
```

**Security:** Signed URL from backend (15-min TTL), never expose ElevenLabs API key

**Confidence:** HIGH — standard pattern confirmed by Architecture research

## What NOT to Use

| Technology | Why Not |
|-----------|---------|
| Pinecone / Qdrant | Unnecessary — pgvector on Neon handles our scale |
| LangChain | Over-abstraction for simple RAG — direct ElevenLabs KB API is sufficient |
| Puppeteer / Playwright for scraping | Overkill — most product pages have structured data (JSON-LD) |
| Firebase / Supabase Realtime | Not needed — voice is via ElevenLabs WebRTC, not our infra |
| Redis (standalone) | Only needed if n8n queue mode is required — evaluate after launch |
| Custom LLM fine-tuning | GPT-4o-mini is sufficient for product Q&A in v1 |

## Cost Estimates (Per Merchant/Month)

| Component | Starter ($39) | Growth ($99) | Scale ($299) |
|-----------|--------------|-------------|-------------|
| ElevenLabs minutes | 100 min (~$5-15) | 300 min (~$15-45) | 1000 min (~$50-150) |
| OpenAI embeddings | ~$0.01 | ~$0.05 | ~$0.20 |
| Neon compute | Shared | Shared | Shared |
| n8n workflows | Shared | Shared | Shared |
| **Estimated COGS** | **~$5-15** | **~$15-50** | **~$50-150** |
| **Gross margin** | **~60-85%** | **~50-85%** | **~50-83%** |

**Note:** ElevenLabs per-minute pricing needs verification from their billing dashboard. Margins are estimates.

---
*Researched: 2026-03-13*
*Sources: ElevenLabs official docs, Neon pgvector docs, n8n deployment docs, existing codebase analysis*
