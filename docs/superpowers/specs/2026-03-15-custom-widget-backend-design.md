# Custom Widget + Widget Backend — Design Spec

**Date:** 2026-03-15
**Sub-project:** #1 of 4 (Widget Core)
**Status:** Draft

---

## 1. Overview

Build a custom AI Sales Agent widget that customers embed on their websites with a single line of code. The widget acts as an AI salesperson — it chats, speaks, and controls the customer's website (scrolls to products, highlights items, shows product cards).

This replaces the current ElevenLabs-based widget which has branding limitations and non-functional client tools.

### Простичко казано
Правим AI продавач, който клиентите слагат на сайта си с един ред код. Продавачът може да пише, да говори, и да показва продукти на сайта.

---

## 2. Key Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Scope | Chat + Voice + Site Control | Full vision for v1 — impressive product |
| Embed approach | Hybrid (iframe + bridge script) | Easy install, no CSS conflicts, full site control |
| Voice | OpenAI Realtime API (WebRTC) | Zero latency, real conversation feel |
| Chat LLM | Gemini 2.5 Flash (fixed) | Cheap, fast, good for sales. Professional base prompts with customization |
| Site awareness | Runtime DOM + pre-crawl fallback | Works from minute 1, improves over time |
| Site control | Medium scope | Scroll, highlight, navigate, product card popup, contact form, comparison |
| Widget UI | Adaptive/Brand-aware | Light/dark mode, custom colors/logo per customer |
| Backend | Node.js on Railway | Persistent server for WebSocket/voice, no timeout limits |
| Dashboard | Next.js on Vercel (existing) | Keeps working as-is for auth, billing, settings |
| Pricing | Per conversations | Keep existing 5 plans (Free/Starter/Pro/Business/Enterprise) |
| Communication modes | 3 modes: Chat, Hybrid, Full Voice | Customer chooses default in dashboard |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│  Customer's website (e.g. myshop.com)               │
│                                                     │
│  <script src="cdn.simplifyops.co/embed.js"          │
│          data-agent="agent_abc123">                  │
│                                                     │
│  embed.js loads:                                    │
│  ┌──────────────┐   ┌──────────────────┐            │
│  │  Bridge       │   │  Widget iframe   │            │
│  │  Script       │◄──│  (UI: chat,      │            │
│  │  (~2KB)       │   │   voice, cards)  │            │
│  │               │   │                  │            │
│  │ • scroll      │   │  Hosted on       │            │
│  │ • highlight   │   │  widget.         │            │
│  │ • navigate    │   │  simplifyops.co  │            │
│  │ • show card   │   └────────┬─────────┘            │
│  └──────────────┘            │                      │
└──────────────────────────────│──────────────────────┘
                               │
                    postMessage │  API calls
                               ▼
               ┌───────────────────────────┐
               │  Widget Backend (Railway)  │
               │  Node.js                   │
               │                           │
               │  • POST /api/chat (SSE)   │
               │  • POST /api/chat/hybrid  │
               │  • POST /api/voice/token  │
               │  • POST /api/session      │
               │  • GET  /api/config/:id   │
               │  • POST /api/context      │
               │  • GET  /api/health       │
               │                           │
               │  SSE + REST               │
               └─────────┬─────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌───────┐ ┌────────┐
        │ Supabase │ │Gemini │ │OpenAI  │
        │ Postgres │ │ API   │ │Realtime│
        │ (existing│ │       │ │  API   │
        │  DB)     │ │       │ │        │
        └──────────┘ └───────┘ └────────┘
```

**Note:** Railway backend connects to the **existing Supabase PostgreSQL** instance (same database used by the dashboard). This ensures shared data — conversations, businesses, billing — all in one place.

### Простичко казано
Посетителят вижда бутонче на сайта. Натиска го — отваря се прозорец с AI продавач. Продавачът знае какво има на сайта и може да го покаже. Всичко минава през наш сървър на Railway, който се свързва с AI моделите и записва в същата база данни, която ползва и dashboard-ът.

---

## 4. Widget Components

### 4.1 embed.js (~8-12KB gzipped)
The only thing on the customer's site. Includes bridge script bundled within. Responsibilities:
- Creates widget iframe
- Injects bridge script into page
- Loads agent config (colors, logo, default mode)
- Listens for postMessage commands from iframe

Customer installation:
```html
<script src="https://cdn.simplifyops.co/embed.js" data-agent="agent_abc123"></script>
```

### 4.2 Widget iframe (hosted on widget.simplifyops.co)
React application, compiled and optimized (~80-120KB gzipped). Contains:
- Chat message UI
- Voice waveform visualization
- Product card overlays
- Mode toggle (chat/hybrid/voice)
- Communicates with Railway backend for LLM/voice
- Sends site control commands to bridge via postMessage

### 4.3 Bridge script (~2KB, bundled in embed.js)
Executes site control commands on the customer's DOM:
- `scrollToElement(identifier)` — smooth scroll to element
- `highlightElement(identifier)` — visual highlight with overlay
- `navigateTo(url)` — navigate to another page (**same-origin only** for security)
- `showProductCard(data)` — popup overlay with product (image, price, button)
- `openContactForm()` — opens contact form
- `showComparison(products)` — side-by-side product comparison
- `getPageContext()` — scans current page, returns structure (products, sections, prices) to agent

**Element identification strategy:** `getPageContext()` scans the page and builds a map of interactive elements using multiple signals:
1. `data-product-id` or `data-section` attributes (if customer adds them — best accuracy)
2. Semantic HTML: `<h1>`, `<h2>`, `<section>`, `<article>`, product-like patterns (image + price + title)
3. Text content matching — LLM references products by name, bridge finds matching text on page
4. CSS class/ID as last resort

The LLM receives a simplified page map like: `[{name: "MacBook Pro M3", price: "$3,499", elementRef: "product-3", position: "below-fold"}]` and references elements by `elementRef`, not raw CSS selectors.

**Error handling for bridge commands:**
- If target element not found → silently skip, log warning to console
- `navigateTo()` only allows same-origin URLs → blocks external navigation attempts
- Malformed data in `showProductCard()` → shows fallback "Product unavailable" card
- All errors are non-fatal — widget continues working even if site control fails

### Простичко казано
Widget-ът се състои от 3 части: (1) малък скрипт на сайта на клиента, (2) прозорец с чата/voice-а, и (3) помощен скрипт, който може да показва и highlight-ва продукти на сайта. Ако нещо не се намери на страницата, widget-ът продължава да работи нормално — просто не показва това конкретно нещо.

---

## 5. Communication Modes

| Mode | User | Agent | Site Control | Technology |
|------|------|-------|--------------|------------|
| **Chat** | Types | Responds with text | Yes | Gemini 2.5 Flash (streaming via SSE) |
| **Hybrid** | Types | Speaks + text | Yes | Gemini 2.5 Flash → OpenAI TTS (streaming) |
| **Full Voice** | Speaks | Speaks | Yes | OpenAI Realtime API (WebRTC, direct) |

### Latency targets
| Mode | Target | How |
|------|--------|-----|
| Chat | ~300ms to first text | Gemini streaming via SSE |
| Hybrid | ~500ms to first sound | Gemini streaming → TTS streaming |
| Full Voice | ~300ms real-time | Direct WebRTC to OpenAI |

### Streaming protocol (Chat & Hybrid)
Chat and Hybrid modes use **Server-Sent Events (SSE)** for streaming:
```
event: text_delta
data: {"content": "Here's the perfect "}

event: text_delta
data: {"content": "laptop for you!"}

event: actions
data: {"actions": [{"type": "scrollToElement", "ref": "product-3"}, {"type": "highlightElement", "ref": "product-3"}]}

event: done
data: {}
```

For Hybrid mode, the backend simultaneously streams audio chunks:
```
event: audio_delta
data: {"audio": "<base64 encoded audio chunk>"}
```

### Voice architecture (Full Voice)
- Browser connects **directly** to OpenAI Realtime API via WebRTC
- Railway backend only provides ephemeral key + session config (system prompt, page context, function definitions)
- No audio relay through Railway — minimal latency, minimal server load

**Voice site control flow (function calling):**
1. OpenAI Realtime API emits `function_call` (e.g., `scrollToElement({ref: "product-3"})`)
2. Browser receives it via WebRTC data channel
3. Widget iframe parses the function call
4. Widget iframe sends `postMessage` to bridge script in parent window
5. Bridge script executes the action on the customer's DOM
6. Result sent back through same chain → OpenAI receives confirmation

### Customer chooses default mode in dashboard. End-user can switch freely.

### Fallback behavior
- If OpenAI Realtime API fails → auto-switch to Hybrid mode with message: "Voice is temporarily unavailable, switching to text with audio responses"
- If Hybrid TTS fails → auto-switch to Chat mode with message: "Audio responses temporarily unavailable"
- If Gemini API fails → show message in widget: "Our AI assistant is briefly unavailable. Please try again in a moment." + retry with exponential backoff (3 attempts)

### Простичко казано
Три начина за комуникация: (1) пишеш — агентът пише, (2) пишеш — агентът говори, (3) говориш — агентът говори. И в трите случая агентът може да показва неща на сайта. Ако voice спре да работи, автоматично превключва на chat — посетителят никога не вижда грешка.

---

## 6. Widget Backend (Railway)

### 6.1 Endpoints

**`POST /api/session`** — Create session token
- Receives: `agent_id` from widget
- Validates: agent exists, is active, has not exceeded conversation limit
- Checks: domain whitelist (if configured) via `Referer`/`Origin` header
- Returns: short-lived session token (opaque, 24-character random string)
- Token stored in Redis/memory with TTL of 30 minutes
- Token bound to: `agent_id` + visitor IP + user agent fingerprint
- All subsequent API calls require this token in `Authorization: Bearer <token>` header

**`POST /api/chat`** — Chat mode (SSE streaming)
- Auth: session token required
- Receives: user message + page context
- Adds: knowledge base data (from `site_data` if available) + system prompt
- Sends to: Gemini 2.5 Flash
- Returns: SSE stream with `text_delta`, `actions`, and `done` events
- Increments conversation count on first message of new conversation

**`POST /api/chat/hybrid`** — Hybrid mode (SSE streaming)
- Auth: session token required
- Same as chat, but Gemini response text is piped to OpenAI TTS API
- Returns: SSE stream with `text_delta`, `audio_delta`, `actions`, and `done` events

**`POST /api/voice/token`** — Full Voice mode
- Auth: session token required
- Generates ephemeral key for OpenAI Realtime API
- Configures session: system prompt, page context, function definitions for site control
- Returns: `{ ephemeralKey, sessionConfig }` — browser connects directly to OpenAI via WebRTC

**`GET /api/config/:agentId`** — Agent configuration (public)
- No auth required (public endpoint, CORS: `*`)
- Returns: branding, default mode, welcome message, allowed domains
- Cached in memory (5 min TTL)

**`POST /api/context`** — Page context processing
- Auth: session token required
- Called by widget iframe when widget opens and on every SPA navigation
- Receives: DOM context from bridge script (via iframe postMessage → API call)
- Parses: extracts products, prices, categories, sections
- Merges with pre-crawl data from DB if available
- Returns: structured page map for LLM context

**`GET /api/health`** — Health check
- Returns: `{ status: "ok", version, uptime, db: "connected" }`
- Used by Railway health checks and external monitoring

### 6.2 CORS configuration
- `GET /api/config/:agentId` → `Access-Control-Allow-Origin: *` (public)
- `POST /api/session` → `Access-Control-Allow-Origin: *` (needs to work from any customer site)
- All other endpoints → `Access-Control-Allow-Origin: widget.simplifyops.co` (only widget iframe)

### 6.3 Conversation tracking
- Every conversation logged to Supabase PostgreSQL (same DB as dashboard)
- Counts toward monthly conversation limit
- Records: messages, sentiment, intent, duration, cost

### 6.4 Billable conversation definition
A **billable conversation** starts when the visitor sends their **first message** (text or voice). Specifically:
- Widget opening does NOT count
- Welcome message from agent does NOT count
- Visitor sending first message = conversation starts = billable
- A conversation that is in-progress when the monthly limit is reached is **allowed to complete** — the limit is enforced at conversation start, not mid-conversation
- Conversation ends after 5 minutes of inactivity or when visitor closes widget

### Простичко казано
Сървърът на Railway е "мозъкът" — получава въпроси от посетителя, пита AI модела, и връща отговор заедно с команди какво да покаже на сайта. Също записва всеки разговор за статистика. Разговор се брои само когато посетителят реално напише или каже нещо — самото отваряне на widget-а не се брои.

---

## 7. Database Schema Changes

### Database: Existing Supabase PostgreSQL
Railway backend connects to the **same Supabase PostgreSQL instance** used by the Next.js dashboard. Connection via `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS for server-side operations) or direct connection string.

### Existing tables (keep as-is):
- `businesses` — customer accounts + agent settings
- `conversations` — every conversation
- `messages` — messages within conversations
- `conversation_costs` — cost per conversation

### Migration: `businesses` table changes
The existing `agent_id` column (currently storing ElevenLabs agent IDs) will be repurposed:
- Set all existing `agent_id` values to NULL (ElevenLabs IDs are no longer valid)
- Generate new unique `agent_id` values for existing businesses (format: `agent_<nanoid>`)
- Add new columns:

```sql
-- New columns in businesses
ALTER TABLE businesses
  ADD COLUMN default_mode TEXT NOT NULL DEFAULT 'chat'
    CHECK (default_mode IN ('chat', 'hybrid', 'voice')),
  ADD COLUMN welcome_message TEXT DEFAULT 'Hi! How can I help you today?',
  ADD COLUMN allowed_domains TEXT[] DEFAULT '{}';

-- Update existing agent_ids (old ElevenLabs IDs → new format)
-- Run as data migration script
```

### New table: `site_data`
```sql
CREATE TABLE site_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_title TEXT,
  products JSONB DEFAULT '[]',
  sections JSONB DEFAULT '[]',
  raw_context JSONB,
  source TEXT NOT NULL CHECK (source IN ('runtime', 'crawl')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, url)
);

CREATE INDEX idx_site_data_business ON site_data(business_id);
ALTER TABLE site_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view own site data"
  ON site_data FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
```

### New table: `agent_prompts`
```sql
CREATE TABLE agent_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('sales', 'support', 'booking', 'custom')),
  system_prompt TEXT NOT NULL,
  is_base_template BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Base templates have business_id = NULL
-- Customer prompts have business_id set
CREATE INDEX idx_agent_prompts_business ON agent_prompts(business_id);
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can manage own prompts"
  ON agent_prompts FOR ALL
  USING (
    business_id IS NULL  -- base templates visible to all
    OR business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );
```

### Простичко казано
Записваме кой е клиентът, как изглежда агентът му, какво знае за сайта, и какви разговори е водил. Добавяме и готови шаблони за промптове, които клиентът може да избере. Всичко е в една и съща база данни — dashboard-ът и widget backend-ът виждат едни и същи данни.

---

## 8. Security & Authentication

### Widget session flow:
1. `embed.js` loads → calls `GET /api/config/:agentId` (public, no auth)
2. Visitor interacts → widget calls `POST /api/session` with `agent_id`
3. Backend validates agent exists, checks domain whitelist, creates session token
4. Session token: opaque 24-character string, stored server-side with 30-min TTL
5. Token bound to: `agent_id` + visitor IP + user agent → prevents token theft
6. All subsequent API calls include `Authorization: Bearer <token>`
7. Token auto-refreshed on each valid request (sliding expiry)

### Abuse protection:
- Rate limiting per session (requests per minute, based on plan tier)
- Conversation limit enforcement — checked at conversation start, not mid-conversation
- When limit exhausted → widget shows: "Please contact us directly" with business contact info
- Domain whitelist (optional) — customer can restrict which domains the widget works on
- If domain not in whitelist → `POST /api/session` returns 403

### Dashboard → Railway authentication:
- Dashboard sends Supabase-issued JWT in `Authorization` header
- Railway backend validates JWT using `SUPABASE_JWT_SECRET`
- Same JWT format already used by existing Next.js API routes

### API keys:
- Existing `so_live_*` system stays for server-to-server communication
- Widget does NOT use API keys (public embed, protected by session tokens)

### Простичко казано
Widget-ът е защитен — посетителят получава временен "пропуск" (session token), който е валиден 30 минути. Има лимити колко заявки може да прави, брои разговорите, и може да работи само на определени сайтове ако клиентът иска. Ако разговор е започнат, той се довършва дори лимитът да свърши — не се прекъсва.

---

## 9. Embed Flow (Step by Step)

### When a visitor opens a site with the widget:
1. Page loads `embed.js` (8-12KB gzipped, fast)
2. `embed.js` reads `agent_id` from script tag
3. Calls `GET /api/config/:agentId` → gets colors, logo, welcome message, default mode
4. Creates small round button (bottom-right or customer's choice position)
5. Visitor clicks button → widget window opens (iframe from widget.simplifyops.co)
6. Widget calls `POST /api/session` → gets session token
7. Bridge script calls `getPageContext()` → scans page for products/sections
8. Widget calls `POST /api/context` with page data → backend processes and stores
9. Agent receives page context and displays welcome message
10. Visitor sends first message → **billable conversation starts**
11. Visitor types/speaks → agent responds (via SSE or WebRTC) and sends site control commands
12. Site control commands flow: backend → SSE/WebRTC → widget iframe → postMessage → bridge → DOM

### On SPA navigation (single-page apps):
- Bridge script detects URL change
- Calls `getPageContext()` again → sends updated context via `POST /api/context`
- Agent automatically knows about the new page content

### When a customer sets up their agent in the dashboard:
1. Signs up → gets business account
2. Goes to settings → picks colors, logo, welcome message
3. Chooses default mode (chat/hybrid/voice)
4. Customizes prompt (or starts from a template)
5. Optionally sets domain whitelist
6. Copies embed code → puts it on their site
7. Done — widget works

### Простичко казано
За посетителя: натиска бутонче, отваря се AI продавач, пита го какво търси, показва му продукти на сайта. Ако посетителят навигира на друга страница, AI-ят автоматично разбира какво е новото съдържание. За клиента: регистрира се, настройва с няколко клика, копира един ред код на сайта си — готово.

---

## 10. Monitoring & Health

### Railway backend:
- `GET /api/health` — health check endpoint (Railway auto-pings)
- Logs: structured JSON logs (request ID, duration, errors)
- Errors: logged with stack traces, aggregated by type
- Future: connect to external monitoring (UptimeRobot or similar)

### Key metrics to track:
- Response latency (p50, p95, p99) per endpoint
- Active conversations count
- LLM API error rates (Gemini, OpenAI)
- Session token creation rate (abuse detection)

### Простичко казано
Следим дали всичко работи — ако сървърът падне или AI моделите дават грешки, ще знаем веднага.

---

## 11. Out of Scope

**NOT included in this sub-project:**
- Site Analyzer (automatic full-site crawl) → sub-project #2
- Dashboard UI changes (agent settings UI, embed code generator) → sub-project #3
- Analytics dashboard → sub-project #4
- Email notifications → later
- Knowledge base file upload → later

### Простичко казано
Първо правим самия widget — това, което посетителят вижда и ползва. Dashboard-а, аналитиките и автоматичното сканиране на сайта идват после.

---

## 12. Tech Stack Summary

| Component | Technology | Hosting |
|-----------|-----------|---------|
| embed.js + bridge | Vanilla JS, compiled (~8-12KB gz) | CDN (Vercel/Cloudflare) |
| Widget iframe | React (compiled, ~80-120KB gz) | widget.simplifyops.co (Vercel) |
| Widget Backend | Node.js (Express/Fastify) | Railway |
| Database | PostgreSQL (shared) | Supabase (existing instance) |
| Chat LLM | Gemini 2.5 Flash | Google API |
| Voice | OpenAI Realtime API | OpenAI (direct WebRTC) |
| TTS (Hybrid) | OpenAI TTS API | OpenAI API |
| Auth (Dashboard) | Supabase Auth | Supabase |
| Auth (Widget) | Session tokens | Railway (server-side) |
| Billing | Stripe | Stripe |
| Dashboard | Next.js | Vercel |
