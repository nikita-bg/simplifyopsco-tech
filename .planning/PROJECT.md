# SimplifyOps Voice AI Platform

## Current Milestone: v2.0 B2B2C Platform Launch

**Goal:** Transform SimplifyOps from impressive demo to revenue-generating multi-tenant platform

**Target features:**
- Multi-tenant architecture with Supabase RLS data isolation
- Widget distribution system (embeddable <script> tag)
- Self-service configuration dashboard
- Stripe billing with usage-based pricing
- Production monitoring and cost controls

## What This Is

A B2B2C SaaS platform that enables businesses to add intelligent voice AI assistants to their websites. The AI assistant can understand speech, navigate the website, answer questions, book appointments, and provide personalized customer service - all through natural voice conversation powered by ElevenLabs and LLM reasoning.

v1.0 delivered a **working demo**. v2.0 transforms this into a platform businesses can actually purchase and install.

## Core Value

Businesses can offer sophisticated voice-powered customer experiences on their websites without building AI infrastructure, giving them a competitive edge through conversational interfaces that guide visitors, answer questions, and convert leads.

## Requirements

### Validated

(None yet — ship v1 demo to validate)

### Active

**v2.0 - B2B2C Platform (Current Milestone)**

**Multi-Tenancy & Security:**
- [ ] Supabase RLS enforces 100% data isolation between businesses
- [ ] Each business has unique API key for widget authentication
- [ ] PII redaction in conversation transcripts (SSN, credit cards)
- [ ] Rate limiting prevents abuse (100 req/min per business)
- [ ] GDPR-compliant data deletion system

**Widget Distribution:**
- [ ] Businesses can copy <script> tag and install on any website
- [ ] Widget loads from CDN with Shadow DOM isolation
- [ ] Widget fetches business-specific configuration via API key
- [ ] Widget integrates ElevenLabs @elevenlabs/react SDK
- [ ] Widget has text input fallback when voice fails

**Configuration Dashboard:**
- [ ] Business can select ElevenLabs voice (50+ options with preview)
- [ ] Business can customize agent personality (system prompt templates)
- [ ] Business can set working hours (outside hours = message mode)
- [ ] Business can upload knowledge base documents (PDF/DOCX/TXT)
- [ ] Business can customize widget branding (color, logo, position)

**Voice Reliability:**
- [ ] Echo cancellation prevents self-triggering
- [ ] WebSocket auto-reconnects with exponential backoff
- [ ] Barge-in allows user to interrupt AI mid-sentence
- [ ] Connection quality indicator (green/yellow/red)
- [ ] <1000ms target latency maintained under load

**Monetization:**
- [ ] Stripe subscription management (Starter/Pro/Business tiers)
- [ ] Usage tracking counts conversations per business
- [ ] Overage billing for conversations beyond plan limit
- [ ] Hard limit blocks sessions at 2x plan (prevent abuse)
- [ ] Billing dashboard shows usage and costs

**Monitoring:**
- [ ] Real-time cost tracking per conversation
- [ ] Latency monitoring (P50/P95/P99 for STT/LLM/TTS/RAG)
- [ ] Error tracking with Sentry integration
- [ ] Usage alerts at 50%/80%/100% of plan limits
- [ ] Circuit breaker pauses system if monthly cost exceeds $10K

### Out of Scope

**Deferred to v3.0+ (Post-Launch Features):**
- Phone call integration (Twilio PSTN) — wait for 30%+ customer requests
- NPM package (@simplifyops/react) — v2.1 if demand exists
- WordPress plugin — v2.2 based on market feedback
- Agency white-label portal — wait for first 5 agencies
- Multi-language support — v2.5 if international demand >25%
- Custom ASR/TTS models — v3.0 cost optimization at 10K+ customers
- No-code flow builder (Voiceflow-style) — v3.0 if enterprise deals require
- SSO/SAML authentication — v2.5 when first enterprise deal needs it

**Explicitly Excluded (Never):**
- Mobile native apps (web-first, responsive design sufficient)
- Video calling (voice-only focus, different product category)
- Live chat fallback (reduces voice adoption, conflicting UX)

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
*Last updated: 2026-03-05 after starting milestone v2.0 (B2B2C Platform Launch)*
