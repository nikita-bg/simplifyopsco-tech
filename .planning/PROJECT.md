# SimplifyOps Voice AI Platform

## What This Is

A B2B2C SaaS platform that enables businesses to add intelligent voice AI assistants to their websites. The AI assistant can understand speech, navigate the website, answer questions, book appointments, and provide personalized customer service - all through natural voice conversation powered by ElevenLabs and LLM reasoning.

The current site serves as a **working demo** to showcase the product's capabilities to potential business customers.

## Core Value

Businesses can offer sophisticated voice-powered customer experiences on their websites without building AI infrastructure, giving them a competitive edge through conversational interfaces that guide visitors, answer questions, and convert leads.

## Requirements

### Validated

(None yet — ship v1 demo to validate)

### Active

**v1 - Working Demo (Priority)**

**Voice AI Assistant:**
- [ ] User can activate voice assistant on demo site (configurable: auto/button)
- [ ] Assistant can listen and transcribe speech (ElevenLabs Speech-to-Text)
- [ ] Assistant can understand intent and context (LLM reasoning)
- [ ] Assistant can respond with natural voice (ElevenLabs Text-to-Speech)
- [ ] Assistant can play multiple roles (receptionist, sales consultant, support agent)
- [ ] Assistant personality is configurable

**Web Automation:**
- [ ] Assistant can scroll page to relevant sections on voice command
- [ ] Assistant can navigate between pages
- [ ] Assistant can open modals/popups
- [ ] Assistant can fill forms with voice-provided data
- [ ] Assistant can read and synthesize page content

**Knowledge Base (RAG):**
- [ ] Assistant can answer questions from knowledge base
- [ ] Admin can manually add documents to knowledge base
- [ ] Knowledge base auto-syncs from Google Drive
- [ ] Knowledge base uses vector search (RAG pattern)

**Booking System:**
- [ ] User can book appointments via voice
- [ ] Internal calendar system stores appointments
- [ ] Business owner can configure available time slots
- [ ] Business owner can configure booking duration

**Analytics Dashboard:**
- [ ] Dashboard shows total conversation count
- [ ] Dashboard shows sentiment analysis (positive/neutral/negative)
- [ ] Dashboard shows intent analysis (what users are asking about)
- [ ] Dashboard shows conversion rate (leads/bookings from conversations)
- [ ] Dashboard shows conversation history with transcripts
- [ ] Dashboard shows call duration metrics

**Authentication:**
- [ ] Business owner can sign up with email/password
- [ ] Business owner can sign in with Google OAuth
- [ ] Business owner can access protected dashboard
- [ ] Sessions persist securely

**Demo Site:**
- [ ] Landing page showcases voice assistant capabilities
- [ ] Voice widget displays beautifully (glassmorphic design)
- [ ] Voice widget shows active state (waveform, speaking indicator)
- [ ] Demo site explains product value to potential customers

### Out of Scope

**Deferred to v2 (Multi-tenant Platform):**
- Multiple business accounts with isolation
- Widget installation system (embed code, NPM, WordPress plugin)
- Per-business configuration UI (voice selection, personality, knowledge base)
- Per-business analytics and data isolation
- Billing and subscription management
- White-label options

**Explicitly Excluded:**
- Mobile native apps (web-first approach)
- Video calls (voice only)
- Real-time chat fallback (voice-only interaction)
- Multi-language support in v1 (English first)

## Context

**Existing Assets:**
- [landing-page.html](../landing-page.html) - Marketing page for "Vocalize AI"
- [dashboard.html](../dashboard.html) - Analytics dashboard with metrics, charts, conversation table
- [voice-widget.html](../voice-widget.html) - Voice assistant UI overlay (visual only, needs backend)
- n8n workflow for Voice Agent RAG (Google Drive → Vector Store)
- ElevenLabs API key provided: `sk_371b4c3461eab91f33b4b61f54eedabe913513845349bae3`

**Technical Foundation:**
- n8n workflows already designed for RAG pipeline
- Frontend uses Tailwind CSS + Material Symbols
- Dark mode glassmorphic design language established
- HTML/CSS frontend (may need React/Next.js for dynamic features)

**Business Model:**
- SimplifyOps sells voice widget to businesses
- Businesses install widget on their sites
- End customers interact with assistant on business sites
- Current site is the demo that sells the product

## Constraints

- **Voice Provider**: ElevenLabs (API already provided, voice cloning available)
- **Workflow Engine**: n8n (existing RAG workflows must integrate)
- **Database**: Supabase (for users, conversations, bookings, analytics)
- **Deployment**: Vercel (entire application, including serverless functions)
- **LLM**: OpenAI (already used in n8n workflows) or Claude
- **Timeline**: v1 demo needs to be functional to sell to first customers
- **Budget**: Minimize costs - use serverless, start with single-tenant

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1 = Demo only, v2 = Multi-tenant | Faster path to showing value; demo can sell before building full platform | — Pending |
| Vercel for everything | Simpler deployment, serverless scales with usage, Next.js ready | — Pending |
| ElevenLabs for voice | Best quality, voice cloning for customization, already have API | — Pending |
| Supabase for data | Auth + Database + Realtime in one, fast setup, generous free tier | — Pending |
| Keep existing HTML for landing/widget UI | Good design already done, can progressively enhance | — Pending |
| n8n for RAG workflows | Already designed, visual workflow management for non-code changes | — Pending |

---
*Last updated: 2026-03-02 after initial project definition*
