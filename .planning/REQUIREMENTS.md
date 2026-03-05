# SimplifyOps v2.0 B2B2C Platform Launch - Requirements

**Milestone:** v2.0 B2B2C Platform Launch
**Goal:** Transform SimplifyOps from impressive demo to revenue-generating multi-tenant platform
**Created:** 2026-03-05
**Status:** Active

---

## 1. Functional Requirements

### 1.1 Multi-Tenancy & Security

**MT-01: Business Account Management**
- **Description:** Each business owner can create and manage a business account
- **Acceptance Criteria:**
  - User can sign up and create business profile
  - Auto-generates unique API key on business creation
  - Business profile includes: name, owner_id, plan_tier
  - API key displayed once on creation, then masked in UI
- **Priority:** MUST-HAVE
- **Source:** ARCHITECTURE.md (Database Schema), PITFALLS.md (API Key Auth)

**MT-02: API Key Authentication**
- **Description:** Widget embeds authenticate using business-specific API keys
- **Acceptance Criteria:**
  - API keys follow format: `so_live_{32-char-nanoid}`
  - Keys stored as bcrypt hash (never plaintext)
  - Validation middleware resolves `api_key` → `business_id`
  - Invalid API key returns HTTP 401 with clear error message
- **Priority:** MUST-HAVE
- **Source:** ARCHITECTURE.md (API Key Authentication Pattern), STACK.md (nanoid + bcrypt)

**MT-03: Row-Level Security (RLS) Data Isolation**
- **Description:** 100% data isolation between businesses at database level
- **Acceptance Criteria:**
  - All multi-tenant tables have `business_id` column with foreign key constraint
  - RLS policies enforce: `WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())`
  - Business A cannot query Business B's data (verified by automated test)
  - RLS enabled on: conversations, messages, knowledge_base, bookings, available_slots
  - Database indexes on `business_id` for performance (query time <100ms)
- **Priority:** MUST-HAVE
- **Source:** ARCHITECTURE.md (Multi-Tenant Database), PITFALLS.md (Pitfall #1, #2, #3)
- **Testing:** Create 2 test businesses, attempt cross-tenant queries, expect zero results

**MT-04: Rate Limiting per Business**
- **Description:** Prevent abuse through per-business request limits
- **Acceptance Criteria:**
  - Free/Starter: 100 requests/minute per business
  - Pro/Business: 500 requests/minute per business
  - Rate limiter uses Upstash Redis with sliding window algorithm
  - Exceeded limit returns HTTP 429 with clear message
  - Widget shows user-friendly error: "High traffic. Please try again in a moment."
- **Priority:** MUST-HAVE
- **Source:** FEATURES.md (Table Stakes), ARCHITECTURE.md (Security Boundaries)

**MT-05: PII Redaction in Transcripts**
- **Description:** Automatically remove sensitive information before storing conversations
- **Acceptance Criteria:**
  - Redact patterns: SSN (XXX-XX-XXXX), credit cards (16 digits), emails, phone numbers
  - Replacement text: `[SSN REDACTED]`, `[CARD REDACTED]`, `[EMAIL REDACTED]`, `[PHONE REDACTED]`
  - Redaction happens before database INSERT
  - Original unredacted content never logged or stored
  - Uses @redactpii/node library (<1ms processing time)
- **Priority:** MUST-HAVE (GDPR compliance)
- **Source:** FEATURES.md (Differentiators), STACK.md (PII Redaction), PITFALLS.md (Security Mistakes)

**MT-06: GDPR-Compliant Data Deletion**
- **Description:** Business owners and end users can request complete data deletion
- **Acceptance Criteria:**
  - API endpoint: `DELETE /api/businesses/:id/data` (requires owner auth)
  - Deletes all: conversations, messages, knowledge_base, bookings for business_id
  - Cascade deletes via foreign key constraints (ON DELETE CASCADE)
  - Deletion completes within 30 days of request
  - Confirmation email sent when deletion complete
- **Priority:** SHOULD-HAVE (v2.0), MUST-HAVE (before EU launch)
- **Source:** PROJECT.md (Requirements), FEATURES.md (Table Stakes)

---

### 1.2 Widget Distribution

**INSTALL-01: Embeddable Script Tag Widget**
- **Description:** Businesses install widget on any website via copy-paste script tag
- **Acceptance Criteria:**
  - Installation code format:
    ```html
    <script>
      window.SimplifyOpsConfig = { apiKey: 'so_live_...' };
      var s = document.createElement('script');
      s.src = 'https://cdn.simplifyops.tech/widget.js';
      s.async = true;
      document.head.appendChild(s);
    </script>
    ```
  - Widget loads asynchronously without blocking page render
  - Widget bundle size <50KB gzipped
  - Works on any domain (CORS enabled for widget endpoints)
  - Tested on: WordPress, Shopify, custom HTML sites
- **Priority:** MUST-HAVE (critical blocker for B2B2C launch)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (The One Thing Rule), ARCHITECTURE.md (Widget Distribution)

**INSTALL-02: Shadow DOM Style Isolation**
- **Description:** Widget styles don't conflict with host site CSS
- **Acceptance Criteria:**
  - Widget uses closed Shadow DOM: `attachShadow({ mode: 'closed' })`
  - All CSS bundled inside Shadow DOM
  - Reset inheritable properties: `all: initial` on `:host`
  - Explicit z-index: `2147483647` to ensure top layer
  - Widget appearance consistent across: Bootstrap, Tailwind, WordPress themes
  - Tested on 5 different real-world sites with aggressive global CSS
- **Priority:** MUST-HAVE
- **Source:** ARCHITECTURE.md (Widget Architecture), PITFALLS.md (Pitfall #9)

**INSTALL-03: Widget Configuration API**
- **Description:** Widget fetches business-specific config on load
- **Acceptance Criteria:**
  - Endpoint: `GET /api/widget/config?api_key=xxx`
  - Returns: `{ business_id, branding, working_hours, voice_id, system_prompt }`
  - Response time <100ms (P95)
  - Cache-Control: `private, no-cache, must-revalidate` (no CDN caching)
  - Configuration changes reflect in widget within 60 seconds
- **Priority:** MUST-HAVE
- **Source:** ARCHITECTURE.md (Integration Points #1), PITFALLS.md (Pitfall #4)

**INSTALL-04: Widget Version Management**
- **Description:** Support multiple widget versions without breaking existing installations
- **Acceptance Criteria:**
  - Versioned URLs: `cdn.simplifyops.tech/widget-v1.0.0.js` (immutable)
  - Latest stable: `cdn.simplifyops.tech/widget.js` → redirects to current version
  - Cache headers for versioned files: `Cache-Control: public, max-age=31536000, immutable`
  - Breaking changes require new major version (v2.x.x)
  - Old versions supported for 90 days after new version release
  - Email notification to customers 30 days before version deprecation
- **Priority:** SHOULD-HAVE (v2.0), MUST-HAVE (before v2.1)
- **Source:** FEATURES.md (Widget Embedding), PITFALLS.md (Anti-Pattern #5)

---

### 1.3 Configuration Dashboard

**CONFIG-01: Voice Selection Interface**
- **Description:** Business can choose from 50+ ElevenLabs voices
- **Acceptance Criteria:**
  - Dropdown with voice names and descriptions
  - "Preview" button plays 10-second sample per voice
  - Default voice: "Rachel" (professional, neutral)
  - Save button updates `businesses.voice_id`
  - Voice change reflects in widget within 60 seconds
  - UI shows last saved voice and timestamp
- **Priority:** MUST-HAVE
- **Source:** PROJECT.md (Requirements), FINAL_IMPLEMENTATION_PLAN.md (Sprint 2)

**CONFIG-02: Agent Personality Customization**
- **Description:** Business customizes AI agent system prompt
- **Acceptance Criteria:**
  - Textarea editor with 500 character limit
  - Pre-built templates: "E-commerce Sales", "Healthcare Receptionist", "SaaS Support", "Professional Services"
  - Preview shows how agent introduces itself
  - Character counter with validation
  - Save updates `businesses.system_prompt`
  - Changes apply to new conversations immediately
- **Priority:** MUST-HAVE
- **Source:** PROJECT.md (Requirements), ARCHITECTURE.md (Business Config Service)

**CONFIG-03: Working Hours Configuration**
- **Description:** Set business hours; outside hours shows message mode
- **Acceptance Criteria:**
  - Time picker for each day of week (Mon-Sun)
  - Timezone selector (auto-detects user timezone)
  - Toggle: "Always available" vs "Set hours"
  - Outside hours message: "We're currently closed. Leave a message and we'll respond during business hours."
  - Saves to `businesses.working_hours` (JSONB format)
  - Widget respects hours in real-time
- **Priority:** SHOULD-HAVE (v2.0)
- **Source:** PROJECT.md (Requirements), ARCHITECTURE.md (Database Schema)

**CONFIG-04: Knowledge Base Upload**
- **Description:** Upload documents for RAG-powered answers
- **Acceptance Criteria:**
  - File uploader: PDF, DOCX, TXT (max 10MB per file)
  - Multiple file selection (up to 10 files at once)
  - Progress indicator during upload and processing
  - Triggers n8n workflow: chunk → embed → pgvector
  - Document list shows: filename, upload date, status (processing/ready/failed)
  - Delete button removes document from knowledge base
  - Processing complete within 2 minutes for 10-page PDF
  - Knowledge available in widget RAG within 3 minutes of upload
- **Priority:** MUST-HAVE
- **Source:** PROJECT.md (Requirements), ARCHITECTURE.md (Integration Points #4)

**CONFIG-05: Widget Branding Customization**
- **Description:** Customize widget appearance to match brand
- **Acceptance Criteria:**
  - Color picker for primary color (hex input + visual picker)
  - Logo uploader: PNG/SVG, 64x64px recommended, max 500KB
  - Position selector: bottom-left, bottom-right
  - Live preview iframe shows changes in real-time
  - Default branding: SimplifyOps blue (#256AF4)
  - Saves to `businesses.branding` (JSONB)
  - Preview updates without page refresh (postMessage API)
- **Priority:** SHOULD-HAVE (v2.0)
- **Source:** PROJECT.md (Requirements), FEATURES.md (Widget Branding)

**CONFIG-06: Installation Instructions**
- **Description:** Clear copy-paste instructions for widget installation
- **Acceptance Criteria:**
  - Page: `/dashboard/install`
  - Shows complete script tag with business's API key
  - One-click "Copy to Clipboard" button
  - Installation guides for: WordPress, Shopify, Webflow, HTML
  - Test section: "Preview widget on this page" (live demo)
  - Verification: "Widget successfully installed" badge when first conversation detected
- **Priority:** MUST-HAVE
- **Source:** ARCHITECTURE.md (Build Order Phase 5), FINAL_IMPLEMENTATION_PLAN.md

---

### 1.4 Voice Reliability

**VOICE-01: Echo Cancellation**
- **Description:** Prevent widget from responding to its own voice output
- **Acceptance Criteria:**
  - Mute microphone input during TTS playback
  - Voice Activity Detection (VAD) prevents self-triggering
  - Tested with speakers (not just headphones) - zero false triggers
  - Fallback: Push-to-talk mode if echo persists after 3 attempts
  - User notification: "Echo detected. Switching to push-to-talk mode."
- **Priority:** MUST-HAVE (core functionality)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (Sprint 2, Part D), PROJECT.md (Requirements)

**VOICE-02: WebSocket Auto-Reconnection**
- **Description:** Gracefully handle network interruptions
- **Acceptance Criteria:**
  - Exponential backoff reconnection: 1s, 2s, 4s, 8s, max 30s
  - Connection quality indicator: green (good), yellow (degraded), red (disconnecting)
  - Preserve conversation state across reconnections
  - Jitter buffer smooths network variations
  - Reconnect completes within 3 seconds on network restore
  - Tested on throttled networks: 3G, high latency (500ms), packet loss (10%)
- **Priority:** MUST-HAVE
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (VOICE-02), PROJECT.md (Requirements)

**VOICE-03: Barge-in / Interruption Handling**
- **Description:** User can interrupt AI mid-sentence naturally
- **Acceptance Criteria:**
  - Detect user speech during AI response (Voice Activity Detection)
  - Immediately stop TTS playback
  - Resume listening for user input
  - Context-aware: AI understands it was interrupted
  - Works smoothly without awkward pauses or cut-offs
  - ElevenLabs Conversational AI handles natively (verify implementation)
- **Priority:** SHOULD-HAVE (v2.0)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (VOICE-03), PROJECT.md (Requirements)

**VOICE-04: Text Input Fallback**
- **Description:** Automatic fallback when voice fails
- **Acceptance Criteria:**
  - Voice fails 2+ times → show "Switch to text mode?" prompt
  - Text input field appears with same conversation context
  - User can type message and receive text response
  - Option to retry voice mode at any time
  - Analytics track voice failure rate per business
- **Priority:** MUST-HAVE (accessibility + reliability)
- **Source:** PROJECT.md (Requirements), FEATURES.md (Widget Distribution)

**VOICE-05: Latency Monitoring**
- **Description:** Track and maintain <1000ms target latency
- **Acceptance Criteria:**
  - Measure P50, P95, P99 for: STT (<300ms), RAG (<100ms), LLM (<800ms), TTS (<300ms)
  - Total target: <1200ms (budget allows margin)
  - Dashboard shows real-time latency breakdown
  - Alert if P99 exceeds 2000ms (critical threshold)
  - Slack notification for latency spikes
  - Per-business latency tracking to identify problem accounts
- **Priority:** MUST-HAVE (quality metric)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (Sprint 3, Part C), PROJECT.md (Requirements)

---

### 1.5 Monetization

**BILL-01: Stripe Subscription Management**
- **Description:** Businesses subscribe to pricing tiers
- **Acceptance Criteria:**
  - Pricing tiers:
    - Free: $0, 25 conversations/month, no credit card
    - Starter: $49/month, 200 conversations/month
    - Pro: $199/month, 1,000 conversations/month
    - Business: $699/month, 5,000 conversations/month
    - Enterprise: Custom pricing, unlimited conversations
  - Stripe Checkout integration for upgrades
  - Webhook handlers: `subscription.created`, `subscription.updated`, `subscription.deleted`
  - Updates `businesses.plan_tier` and `businesses.stripe_subscription_id`
  - Customer portal for self-service: change plan, update payment, view invoices
- **Priority:** MUST-HAVE (revenue generation)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (Pricing Strategy), PROJECT.md (Requirements)

**BILL-02: Usage Tracking & Overage Billing**
- **Description:** Track conversations, enforce limits, charge overages
- **Acceptance Criteria:**
  - Increment `businesses.conversation_count` on conversation completion
  - Stripe Billing Meters API records each conversation as usage event
  - Overage charges:
    - Starter: $0.50 per conversation over 200
    - Pro: $0.35 per conversation over 1,000
    - Business: $0.25 per conversation over 5,000
  - Hard limit at 2x plan (blocks new conversations with clear message)
  - Monthly counter resets on subscription renewal date
  - Usage events include business_id dimension for filtering
- **Priority:** MUST-HAVE
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (Sprint 3, Part A), FEATURES.md (Usage Tracking)

**BILL-03: Usage Alerts**
- **Description:** Proactive notifications when approaching limits
- **Acceptance Criteria:**
  - Email alerts at: 50%, 80%, 90%, 100%, 150% of plan limit
  - Dashboard banner when >80% used
  - Alert content includes: current usage, limit, projected overage cost, upgrade CTA
  - Upgrade prompt in widget when >90% used (admin sees message)
  - Daily summary email at 150%+ usage
- **Priority:** MUST-HAVE (prevent surprise bills)
- **Source:** FEATURES.md (Usage Alerts), FINAL_IMPLEMENTATION_PLAN.md

**BILL-04: Billing Dashboard**
- **Description:** Transparent usage and cost visibility
- **Acceptance Criteria:**
  - Current plan display with features
  - Usage gauge: "750 / 1,000 conversations (75% used)" with color coding
  - Projected overage: "On track for ~$25 in overage charges this month"
  - Invoice history with download links
  - Upgrade/downgrade buttons with instant effect
  - Cancel flow includes offboarding survey and data export option
- **Priority:** MUST-HAVE
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (Sprint 3, Part A), FEATURES.md

**BILL-05: Idempotent Webhook Processing**
- **Description:** Prevent duplicate charges from webhook retries
- **Acceptance Criteria:**
  - `webhook_events` table stores: `stripe_event_id` (PK), `processed_at`, `event_type`
  - Check if event already processed before handling
  - Database transaction wraps webhook processing (atomic updates)
  - Returns HTTP 200 immediately if already processed
  - Returns HTTP 200 after successful processing
  - Logs all webhook events for debugging
- **Priority:** MUST-HAVE (prevents billing disasters)
- **Source:** PITFALLS.md (Pitfall #5), STACK.md (Stripe)

---

### 1.6 Monitoring & Observability

**SYS-01: Error Tracking with Sentry**
- **Description:** Capture and diagnose production errors
- **Acceptance Criteria:**
  - Sentry integration on: API routes, Edge Functions, client-side widget
  - Capture: WebSocket disconnects, API failures, timeout errors
  - Group errors by: error type, business_id, affected endpoint
  - Alert on critical errors: >10 errors/minute
  - Source maps auto-uploaded via Vercel integration
  - Error context includes: business_id, conversation_id, user actions
- **Priority:** MUST-HAVE (production readiness)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (Sprint 3, Part C), STACK.md (Monitoring)

**SYS-02: Real-Time Cost Tracking**
- **Description:** Track ElevenLabs + OpenAI costs per conversation
- **Acceptance Criteria:**
  - Table: `conversation_costs` with columns: conversation_id, elevenlabs_cost, openai_cost, total_cost
  - Dashboard widget: "Average cost per conversation: $0.21"
  - Alert if any conversation exceeds $1 (anomaly detection)
  - Monthly cost summary per business
  - Global cost tracking with budget safeguards
- **Priority:** MUST-HAVE (financial control)
- **Source:** PROJECT.md (Requirements), FINAL_IMPLEMENTATION_PLAN.md (Part B)

**SYS-03: Circuit Breaker for Runaway Costs**
- **Description:** Auto-pause if costs exceed thresholds
- **Acceptance Criteria:**
  - Per-business monthly cap: $500 default (configurable)
  - Global circuit breaker: Pause all if monthly cost >$10,000
  - Email + Slack alert when approaching threshold (80%)
  - Emergency shutdown when threshold exceeded
  - Dashboard shows "Paused due to cost threshold" with admin override option
- **Priority:** MUST-HAVE (prevent financial disasters)
- **Source:** PROJECT.md (Requirements), FEATURES.md (Differentiators)

**SYS-04: Uptime Monitoring**
- **Description:** Ensure 99.9% uptime SLA
- **Acceptance Criteria:**
  - Health check endpoint: `GET /api/health` returns 200 with system status
  - Monitor: Widget CDN, Voice API, Database connectivity, ElevenLabs availability
  - External monitoring: UptimeRobot or Vercel Analytics
  - Incident alerts via email + Slack
  - Status page for customer visibility (optional v2.1)
- **Priority:** SHOULD-HAVE (v2.0), MUST-HAVE (Pro+ tier)
- **Source:** FEATURES.md (Table Stakes), FINAL_IMPLEMENTATION_PLAN.md

**SYS-05: Usage Analytics Dashboard**
- **Description:** Business owners track widget engagement
- **Acceptance Criteria:**
  - Metrics: total conversations, unique users, avg conversation duration, completion rate
  - Charts: conversations over time (daily/weekly/monthly)
  - Conversation list with filters: date range, status (completed/abandoned)
  - Transcript viewer with playback (if audio stored)
  - Export conversations as CSV
- **Priority:** SHOULD-HAVE (v2.0)
- **Source:** ARCHITECTURE.md (Current Architecture), FINAL_IMPLEMENTATION_PLAN.md

---

## 2. Non-Functional Requirements

### 2.1 Performance

**PERF-01: Widget Load Time**
- **Target:** Widget appears on host site within 2 seconds (P95)
- **Measurement:** Time from script tag execution to first paint
- **Constraints:**
  - Widget bundle <50KB gzipped
  - Async loading prevents blocking host page
  - CDN delivery from 119+ edge locations (Vercel)
- **Source:** FEATURES.md (Widget Embedding), STACK.md (CDN)

**PERF-02: Configuration API Latency**
- **Target:** `GET /api/widget/config` responds in <100ms (P95)
- **Measurement:** Server response time (TTFB)
- **Constraints:**
  - No CDN caching (always fresh config)
  - Database query optimized with business_id index
  - Redis caching for frequently accessed configs (30s TTL)
- **Source:** ARCHITECTURE.md (Scaling Priorities)

**PERF-03: Voice Response Latency**
- **Target:** End-to-end voice response <1200ms (P99)
- **Breakdown:**
  - STT: <300ms
  - RAG query: <100ms
  - LLM inference: <800ms
  - TTS: <300ms
- **Measurement:** Latency monitoring per component
- **Constraints:** Alert if P99 >2000ms (degraded UX)
- **Source:** PROJECT.md (Requirements), STACK.md (Latency Monitoring Targets)

**PERF-04: Database Query Performance**
- **Target:** All queries with business_id filter execute in <50ms
- **Measurement:** `EXPLAIN ANALYZE` shows index usage
- **Constraints:**
  - Composite indexes on (business_id, created_at) for time-range queries
  - RLS policies optimized to avoid subquery performance hits
  - Connection pool sized for 100+ concurrent businesses
- **Source:** PITFALLS.md (Performance Traps), ARCHITECTURE.md (Scaling Considerations)

**PERF-05: Concurrent User Capacity**
- **Target:** Support 500 concurrent voice conversations across all businesses
- **Measurement:** Load testing with realistic multi-tenant traffic
- **Constraints:**
  - Per-business limits prevent resource exhaustion
  - Horizontal scaling via Vercel serverless (auto-scales)
  - WebSocket connection pooling with Redis pub/sub
- **Source:** ARCHITECTURE.md (Scaling Considerations), PITFALLS.md (Pitfall #6)

### 2.2 Security

**SEC-01: Data Isolation Guarantee**
- **Target:** Zero cross-tenant data leaks (verified by automated testing)
- **Measurement:** Daily automated test suite attempts cross-tenant access
- **Implementation:**
  - RLS policies on ALL multi-tenant tables
  - business_id validated on every WebSocket message
  - Automated test: Business A uploads "SECRET_PHRASE_A", Business B searches, expects zero results
- **Source:** PITFALLS.md (Pitfall #2, #3), ARCHITECTURE.md (RLS Pattern)

**SEC-02: API Key Security**
- **Target:** API keys never exposed in client-side code or logs
- **Implementation:**
  - Keys hashed with bcrypt before storage
  - ElevenLabs API key proxied through backend (never in widget)
  - Widget API keys transmitted via HTTPS only
  - No API keys in error messages or stack traces
- **Source:** PITFALLS.md (Pitfall #10), STACK.md (API Key Auth)

**SEC-03: PII Protection**
- **Target:** Zero PII stored in unredacted form
- **Implementation:**
  - Automatic redaction before database insert
  - Redact: SSN, credit cards, emails, phone numbers
  - Processing time <1ms (no UX impact)
  - Audit logs never contain PII
- **Source:** PROJECT.md (Requirements), STACK.md (PII Redaction)

**SEC-04: Webhook Signature Verification**
- **Target:** 100% of Stripe webhooks verified before processing
- **Implementation:**
  - Verify `stripe-signature` header using Stripe library
  - Reject unsigned or mismatched signatures
  - Log all rejected webhooks for security monitoring
- **Source:** STACK.md (Stripe), FINAL_IMPLEMENTATION_PLAN.md

**SEC-05: Rate Limiting Defense**
- **Target:** Prevent DDoS and API abuse
- **Implementation:**
  - Per-business: 100-500 req/min (tier-based)
  - Per-IP (unauthenticated): 10 req/min
  - Implemented at edge (Vercel Middleware) before hitting serverless functions
  - Returns HTTP 429 with Retry-After header
- **Source:** FEATURES.md (Table Stakes), ARCHITECTURE.md (Security Boundaries)

### 2.3 Scalability

**SCALE-01: Multi-Tenant Database Design**
- **Target:** Support 10,000+ businesses on single Supabase project
- **Implementation:**
  - business_id indexed on all tables
  - RLS policies optimized to avoid N+1 queries
  - Connection pool: 100 connections (scales with Supabase plan)
  - Periodic VACUUM and ANALYZE for index health
- **Source:** ARCHITECTURE.md (Scaling Considerations), PITFALLS.md

**SCALE-02: Widget CDN Distribution**
- **Target:** <100ms widget load time globally (P95)
- **Implementation:**
  - Vercel Edge Network: 119 Points of Presence
  - Immutable caching for versioned widget.js (1 year cache)
  - GZIP compression + minification (target <50KB)
- **Source:** STACK.md (CDN), FEATURES.md (Widget Embedding)

**SCALE-03: Horizontal Auto-Scaling**
- **Target:** Auto-scale to handle 10x traffic spikes
- **Implementation:**
  - Vercel serverless functions scale automatically
  - No server management required
  - Cold start <100ms (Vercel Edge)
- **Source:** ARCHITECTURE.md (System Overview)

### 2.4 Reliability

**REL-01: Uptime SLA**
- **Target:** 99.9% uptime (43 minutes downtime/month max)
- **Measurement:** External monitoring with UptimeRobot
- **Dependencies:**
  - Vercel: 99.99% uptime SLA
  - Supabase: 99.9% uptime SLA (Pro tier)
  - ElevenLabs: Third-party dependency (no SLA control)
- **Source:** FINAL_IMPLEMENTATION_PLAN.md, FEATURES.md (Table Stakes)

**REL-02: Data Durability**
- **Target:** Zero data loss from system failures
- **Implementation:**
  - Supabase automatic backups (daily)
  - Point-in-time recovery (7 days on Pro tier)
  - Foreign key constraints prevent orphaned records
  - Transaction wrapping for critical operations
- **Source:** ARCHITECTURE.md (Database Schema)

**REL-03: Graceful Degradation**
- **Target:** Voice failure doesn't break entire widget
- **Implementation:**
  - Voice fails 2+ times → auto-switch to text mode
  - WebSocket disconnect → show reconnecting UI, not crash
  - ElevenLabs API down → queue requests, notify user
- **Source:** PROJECT.md (Requirements), PITFALLS.md

### 2.5 Compliance

**COMP-01: GDPR Compliance**
- **Requirements:**
  - Explicit consent banner before recording voice
  - Data Processing Agreements (DPAs) with ElevenLabs, OpenAI
  - Data deletion API (complete within 30 days)
  - Auto-delete transcripts after 90 days (configurable)
  - Right to data export (JSON/CSV format)
- **Source:** FEATURES.md (Table Stakes), STACK.md (PII Redaction)

**COMP-02: PCI DSS (for payments)**
- **Requirements:**
  - Never store credit card details (Stripe handles)
  - Use Stripe Checkout (PCI-compliant)
  - HTTPS-only for all payment flows
- **Source:** Implied from Stripe integration

**COMP-03: Accessibility (ADA/WCAG)**
- **Requirements:**
  - Keyboard navigation for widget controls
  - Screen reader compatible (ARIA labels)
  - Text fallback for voice-only features
  - Voice control serves accessibility use case
- **Source:** FINAL_IMPLEMENTATION_PLAN.md (The Moat: Accessibility)

---

## 3. Success Criteria

**Launch Readiness (v2.0 Complete):**
- [ ] Widget installs on WordPress, Shopify, HTML site successfully
- [ ] 2 test businesses created, zero cross-tenant data access verified
- [ ] Stripe subscription flow completes end-to-end (test mode)
- [ ] Voice latency P99 <1200ms sustained under 50 concurrent conversations
- [ ] Configuration changes reflect in widget within 60 seconds
- [ ] API keys never visible in client-side code (verified by security audit)
- [ ] PII redaction operational (manual verification with test SSN)
- [ ] Error tracking active (Sentry capturing errors with business_id context)

**Business Metrics (First 90 Days):**
- [ ] 100+ businesses signed up (Week 4 target)
- [ ] 500+ total signups (Week 12 target)
- [ ] 75+ paid customers (Week 8 target)
- [ ] <5% monthly churn rate
- [ ] NPS score >50
- [ ] 40%+ activation rate (installed widget + first conversation)

**Technical Health Metrics:**
- [ ] P99 latency remains <1500ms
- [ ] Uptime >99.9%
- [ ] Cost per conversation <$0.25
- [ ] Zero critical security incidents
- [ ] Widget load time P95 <2 seconds globally

**Revenue Metrics (End of Month 3):**
- [ ] MRR: $30,000+ (200 paid customers × $150 ARPA)
- [ ] CAC <$150 (customer acquisition cost)
- [ ] LTV:CAC ratio >5:1
- [ ] Gross margin: 25-30% (blended across tiers)

---

## 4. Out of Scope (Explicitly Deferred)

### 4.1 Deferred to v2.1+ (Post-Launch)

**Features deferred based on customer validation:**
- **NPM Package (`@simplifyops/react`)** — Defer to v2.1 if React demand exists
- **WordPress Plugin** — v2.2 based on market feedback (script tag works on WordPress already)
- **Shopify App Store** — v2.1 submission (script tag works but app store improves discoverability)
- **Referral Program** — v2.1 when first 100 paid customers achieved
- **Advanced Team Permissions** — Start with Admin/Viewer roles, add Editor if requested 20+ times

**Source:** PROJECT.md (Out of Scope), FEATURES.md (Anti-Features)

### 4.2 Deferred to v2.5+ (Enterprise Features)

**Features requiring enterprise customers:**
- **SSO/SAML Authentication** — Wait for first enterprise deal that needs it
- **Multi-Language Support** — English-first, add Spanish/French if international demand >25%
- **White-Label Portal** — Wait for first 5 agencies, then build custom domain + logo upload
- **Advanced Analytics** — Export to data warehouse, custom dashboards (enterprise tier feature)

**Source:** PROJECT.md (Out of Scope), FEATURES.md (Anti-Features)

### 4.3 Deferred to v3.0+ (Major New Capabilities)

**Features requiring significant R&D:**
- **Phone Call Integration (Twilio PSTN)** — Wait for 30%+ customer requests
- **Custom ASR/TTS Models** — Cost optimization at 10K+ customers, not needed now
- **No-Code Flow Builder** — Complex to build, most customers satisfied with system prompt templates
- **Advanced Workflow Customization** — Wait for enterprise deals requiring it

**Source:** PROJECT.md (Out of Scope), FINAL_IMPLEMENTATION_PLAN.md (Out of Scope section)

### 4.4 Explicitly Excluded (Never Build)

**Features that don't align with product strategy:**
- **Mobile Native Apps** — Web-first approach, responsive design sufficient
- **Video Calling** — Different product category, voice-only focus
- **Live Chat Fallback** — Reduces voice adoption, conflicting UX
- **Standalone Chatbot** — Voice is the differentiator, not text-only chat

**Source:** PROJECT.md (Explicitly Excluded), FEATURES.md (Anti-Features)

---

## 5. Requirement Dependencies

**Dependency Graph:**

```
FOUNDATION (Sprint 1):
└─ MT-03 (RLS Implementation)
   ├─ MT-01 (Business Accounts)
   ├─ MT-02 (API Key Auth)
   └─ Blocks: ALL Widget Distribution features

WIDGET DISTRIBUTION (Sprint 2):
└─ INSTALL-01 (Script Tag Widget)
   ├─ Requires: MT-02, MT-03
   ├─ INSTALL-02 (Shadow DOM)
   ├─ INSTALL-03 (Config API)
   └─ Blocks: Voice features, Billing

CONFIGURATION (Sprint 2):
└─ CONFIG-01 to CONFIG-06
   ├─ Requires: MT-01 (Business Management)
   └─ Integrates with: INSTALL-03 (Config API)

VOICE RELIABILITY (Sprint 2):
└─ VOICE-01 to VOICE-05
   ├─ Requires: INSTALL-01 (Widget working)
   └─ Parallel with: CONFIG features

MONETIZATION (Sprint 3):
└─ BILL-01 (Stripe Subscriptions)
   ├─ Requires: MT-01 (Business IDs)
   ├─ BILL-02 (Usage Tracking)
   ├─ BILL-03 (Alerts)
   ├─ BILL-04 (Dashboard)
   └─ BILL-05 (Idempotency)

MONITORING (Sprint 3):
└─ SYS-01 to SYS-05
   └─ Parallel with: All other features (observability layer)
```

---

## 6. Traceability Matrix

Linking requirements to research findings:

| Requirement ID | Source Document(s) | Research Confidence |
|----------------|-------------------|---------------------|
| MT-01 to MT-06 | ARCHITECTURE.md (Database Schema), FEATURES.md (Table Stakes) | HIGH |
| INSTALL-01 to INSTALL-04 | ARCHITECTURE.md (Widget Distribution), PITFALLS.md | HIGH |
| CONFIG-01 to CONFIG-06 | PROJECT.md (Active Requirements), FINAL_IMPLEMENTATION_PLAN.md | HIGH |
| VOICE-01 to VOICE-05 | FINAL_IMPLEMENTATION_PLAN.md (Voice Reliability Engineering) | MEDIUM (ElevenLabs API features) |
| BILL-01 to BILL-05 | STACK.md (Stripe Billing), PITFALLS.md (Webhook Race Conditions) | HIGH |
| SYS-01 to SYS-05 | STACK.md (Monitoring), FINAL_IMPLEMENTATION_PLAN.md | HIGH |
| PERF-01 to PERF-05 | ARCHITECTURE.md (Scaling), PITFALLS.md (Latency Death Spiral) | HIGH |
| SEC-01 to SEC-05 | PITFALLS.md (Security), ARCHITECTURE.md (Security Boundaries) | HIGH |

---

## 7. Requirement Prioritization

### MoSCoW Method:

**MUST-HAVE (Critical for v2.0 Launch):**
- All MT (Multi-Tenancy) requirements
- INSTALL-01, INSTALL-02, INSTALL-03
- CONFIG-01, CONFIG-02, CONFIG-04, CONFIG-06
- VOICE-01, VOICE-02, VOICE-04, VOICE-05
- All BILL requirements
- SYS-01, SYS-02, SYS-03
- All PERF requirements
- All SEC requirements

**SHOULD-HAVE (Improves v2.0, not blockers):**
- INSTALL-04 (Version Management) — can add in v2.1
- CONFIG-03 (Working Hours) — nice-to-have
- CONFIG-05 (Branding) — differentiator but not critical
- VOICE-03 (Barge-in) — quality improvement
- SYS-04 (Uptime Monitoring) — good practice
- SYS-05 (Analytics Dashboard) — engagement metric

**COULD-HAVE (v2.1+):**
- Advanced team permissions
- NPM package
- WordPress plugin
- Referral program

**WON'T-HAVE (Out of Scope):**
- Phone call integration
- Mobile native apps
- Video calling
- Live chat fallback

---

## Appendix: Requirement Validation Checklist

Before marking any requirement as "done", verify:

**For all requirements:**
- [ ] Acceptance criteria met (100% of bullets)
- [ ] Automated test exists and passes
- [ ] Manual testing completed on 3+ scenarios
- [ ] Documentation updated (if user-facing)
- [ ] Security review completed (if security-related)
- [ ] Performance benchmarked (if performance-related)

**For multi-tenancy requirements:**
- [ ] RLS policy exists and tested
- [ ] Cross-tenant access test passes (zero results)
- [ ] Database migration safe (doesn't break existing tables)
- [ ] Rollback plan documented and tested

**For widget requirements:**
- [ ] Tested on WordPress, Shopify, HTML sites
- [ ] Shadow DOM isolation verified (no CSS conflicts)
- [ ] API keys not exposed in client code
- [ ] Widget bundle size <50KB gzipped

**For billing requirements:**
- [ ] Stripe test mode end-to-end flow passes
- [ ] Idempotency verified (webhook retry doesn't duplicate charge)
- [ ] Usage tracking matches Stripe metered billing
- [ ] Reconciliation job shows <1% drift

**For monitoring requirements:**
- [ ] Sentry capturing errors with business_id context
- [ ] Alerts configured and tested (email + Slack)
- [ ] Dashboard displays metrics in real-time
- [ ] Latency tracking shows P50/P95/P99 breakdown

---

**Document Status:** ACTIVE
**Last Updated:** 2026-03-05
**Next Review:** After Sprint 1 completion
**Owner:** Development Team

**This document is the source of truth for v2.0 B2B2C Platform Launch. All implementation must trace back to a requirement listed here.**
