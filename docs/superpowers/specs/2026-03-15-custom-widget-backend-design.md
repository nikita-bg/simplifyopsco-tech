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
               │  • POST /api/chat         │
               │  • POST /api/chat/hybrid  │
               │  • POST /api/voice/token  │
               │  • GET  /api/config/:id   │
               │  • POST /api/context      │
               │                           │
               │  WebSocket + REST         │
               └─────────┬─────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌───────┐ ┌────────┐
        │ Neon     │ │Gemini │ │OpenAI  │
        │ Postgres │ │ API   │ │Realtime│
        │          │ │       │ │  API   │
        └──────────┘ └───────┘ └────────┘
```

### Простичко казано
Посетителят вижда бутонче на сайта. Натиска го — отваря се прозорец с AI продавач. Продавачът знае какво има на сайта и може да го покаже. Всичко минава през наш сървър на Railway, който се свързва с AI моделите.

---

## 4. Widget Components

### 4.1 embed.js (~5-10KB)
The only thing on the customer's site. Responsibilities:
- Creates widget iframe
- Injects bridge script into page
- Loads agent config (colors, logo, default mode)
- Listens for postMessage commands from iframe

Customer installation:
```html
<script src="https://cdn.simplifyops.co/embed.js" data-agent="agent_abc123"></script>
```

### 4.2 Widget iframe (hosted on widget.simplifyops.co)
React application, compiled and optimized. Contains:
- Chat message UI
- Voice waveform visualization
- Product card overlays
- Mode toggle (chat/hybrid/voice)
- Communicates with Railway backend for LLM/voice
- Sends site control commands to bridge via postMessage

### 4.3 Bridge script (~2KB)
Executes site control commands on the customer's DOM:
- `scrollToElement(selector)` — smooth scroll to element
- `highlightElement(selector)` — visual highlight with overlay
- `navigateTo(url)` — navigate to another page
- `showProductCard(data)` — popup overlay with product (image, price, button)
- `openContactForm()` — opens contact form
- `showComparison(products)` — side-by-side product comparison
- `getPageContext()` — scans current page, returns structure (products, sections, prices) to agent

### Простичко казано
Widget-ът се състои от 3 части: (1) малък скрипт на сайта на клиента, (2) прозорец с чата/voice-а, и (3) помощен скрипт, който може да показва и highlight-ва продукти на сайта.

---

## 5. Communication Modes

| Mode | User | Agent | Site Control | Technology |
|------|------|-------|--------------|------------|
| **Chat** | Types | Responds with text | Yes | Gemini 2.5 Flash (streaming) |
| **Hybrid** | Types | Speaks + text | Yes | Gemini 2.5 Flash → OpenAI TTS (streaming) |
| **Full Voice** | Speaks | Speaks | Yes | OpenAI Realtime API (WebRTC, direct) |

### Latency targets
| Mode | Target | How |
|------|--------|-----|
| Chat | ~300ms to first text | Gemini streaming |
| Hybrid | ~500ms to first sound | Gemini streaming → TTS streaming |
| Full Voice | ~300ms real-time | Direct WebRTC to OpenAI |

### Voice architecture (Full Voice)
- Browser connects **directly** to OpenAI Realtime API via WebRTC
- Railway backend only provides ephemeral key + session config (system prompt, page context, function definitions)
- No audio relay through Railway — minimal latency, minimal server load

### Customer chooses default mode in dashboard. End-user can switch freely.

### Простичко казано
Три начина за комуникация: (1) пишеш — агентът пише, (2) пишеш — агентът говори, (3) говориш — агентът говори. И в трите случая агентът може да показва неща на сайта. Клиентът избира кой начин е по подразбиране.

---

## 6. Widget Backend (Railway)

### 6.1 Endpoints

**`POST /api/chat`** — Chat mode
- Receives: user message + page context
- Adds: knowledge base data + system prompt
- Sends to: Gemini 2.5 Flash
- Returns: streamed text + site control actions (JSON)

Response format:
```json
{
  "text": "Here's the perfect laptop for you!",
  "actions": [
    { "type": "scrollToElement", "selector": "#macbook-pro" },
    { "type": "highlightElement", "selector": "#macbook-pro" },
    { "type": "showProductCard", "data": { "name": "MacBook Pro", "price": "$3,499", "image": "..." } }
  ]
}
```

**`POST /api/chat/hybrid`** — Hybrid mode
- Same as chat, but response text is also sent to OpenAI TTS API
- Returns: text + audio stream simultaneously

**`POST /api/voice/token`** — Full Voice mode
- Generates ephemeral key for OpenAI Realtime API
- Configures session: system prompt, page context, function definitions for site control
- Browser connects directly to OpenAI via WebRTC

**`GET /api/config/:agentId`** — Agent configuration
- Returns: branding, default mode, system prompt, welcome message
- Cached for performance

**`POST /api/context`** — Page context processing
- Receives: DOM context from bridge script
- Parses: extracts products, prices, categories, sections
- Merges with pre-crawl data from DB if available

### 6.2 Conversation tracking
- Every conversation logged to Neon PostgreSQL
- Counts toward monthly conversation limit
- Records: messages, sentiment, intent, duration, cost

### Простичко казано
Сървърът на Railway е "мозъкът" — получава въпроси от посетителя, пита AI модела, и връща отговор заедно с команди какво да покаже на сайта. Също записва всеки разговор за статистика.

---

## 7. Database Schema Changes

### Existing tables (keep as-is):
- `businesses` — customer accounts + agent settings
- `conversations` — every conversation
- `messages` — messages within conversations
- `conversation_costs` — cost per conversation

### New fields in `businesses`:
- `default_mode` (enum: chat/hybrid/voice) — widget default mode
- `welcome_message` (text) — agent's first message

### New table: `site_data`
- Stores pre-crawl data for customer's website
- Products, categories, prices, URLs
- Updated periodically (when Site Analyzer sub-project is built)

### New table: `agent_prompts`
- Base prompt templates (sales, support, booking, etc.)
- Customer selects template and customizes
- Version history — can revert to previous version

### Простичко казано
Записваме кой е клиентът, как изглежда агентът му, какво знае за сайта, и какви разговори е водил. Добавяме и готови шаблони за промптове, които клиентът може да избере.

---

## 8. Security & Authentication

### Widget identification:
- Each agent has unique `agent_id` (public, in embed code)
- `agent_id` loads widget config (branding, welcome message)
- For API requests (chat, voice) — widget gets short-lived session token from backend
- Session token bound to `agent_id` + IP + user agent

### Abuse protection:
- Rate limiting per session (requests per minute, based on plan tier)
- Conversation limit enforcement — when exhausted, widget shows fallback message
- Domain whitelist (optional) — customer can restrict which domains the widget works on

### Dashboard authentication:
- Supabase Auth (existing, works)
- Dashboard communicates with Railway backend via JWT

### API keys:
- Existing `so_live_*` system stays for server-to-server
- Widget does NOT use API keys (public embed, protected by session tokens)

### Простичко казано
Widget-ът е защитен — има лимити колко заявки може да прави, брои разговорите, и може да работи само на определени сайтове ако клиентът иска. Никой не може да злоупотреби.

---

## 9. Embed Flow (Step by Step)

### When a visitor opens a site with the widget:
1. Page loads `embed.js` (5-10KB, fast)
2. `embed.js` reads `agent_id` from script tag
3. Asks backend: "Give me this agent's settings" → gets colors, logo, welcome message, default mode
4. Creates small round button (bottom-right or customer's choice)
5. Visitor clicks button → widget window opens (iframe)
6. Bridge script scans page: "What products do I see? What sections are there?"
7. Agent receives this info and says welcome message
8. Visitor types/speaks → agent responds and controls site

### When a customer sets up their agent in the dashboard:
1. Signs up → gets business account
2. Goes to settings → picks colors, logo, welcome message
3. Chooses default mode (chat/hybrid/voice)
4. Customizes prompt (or starts from a template)
5. Copies embed code → puts it on their site
6. Done — widget works

### Простичко казано
За посетителя: натиска бутонче, отваря се AI продавач, пита го какво търси, показва му продукти на сайта. За клиента: регистрира се, настройва с няколко клика, копира един ред код на сайта си — готово.

---

## 10. Out of Scope

**NOT included in this sub-project:**
- Site Analyzer (automatic full-site crawl) → sub-project #2
- Dashboard UI changes (agent settings UI, embed code generator) → sub-project #3
- Analytics dashboard → sub-project #4
- Email notifications → later
- Knowledge base file upload → later

### Простичко казано
Първо правим самия widget — това, което посетителят вижда и ползва. Dashboard-а, аналитиките и автоматичното сканиране на сайта идват после.

---

## 11. Tech Stack Summary

| Component | Technology | Hosting |
|-----------|-----------|---------|
| embed.js | Vanilla JS, compiled | CDN (Vercel/Cloudflare) |
| Widget iframe | React (compiled) | widget.simplifyops.co (Vercel) |
| Bridge script | Vanilla JS | Bundled with embed.js |
| Widget Backend | Node.js (Express/Fastify) | Railway |
| Database | PostgreSQL | Neon |
| Chat LLM | Gemini 2.5 Flash | Google API |
| Voice | OpenAI Realtime API | OpenAI (direct WebRTC) |
| TTS (Hybrid) | OpenAI TTS API | OpenAI API |
| Auth | Supabase Auth | Supabase |
| Billing | Stripe | Stripe |
| Dashboard | Next.js | Vercel |
