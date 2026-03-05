# Pitfalls Research

**Domain:** Adding Multi-Tenancy, Widget Distribution & Billing to Existing Voice AI Application
**Researched:** 2026-03-05
**Confidence:** HIGH (Based on official documentation, real-world experiences, and integration-specific patterns)

## Critical Pitfalls

### Pitfall 1: RLS Enabled Without Policies (Silent Data Access Denial)

**What goes wrong:**
Tables have RLS enabled but no policies created. Every API query returns empty results with no error messages. The application appears broken but the database is "working correctly" - it's just blocking everything. Developers waste hours debugging application logic when the issue is missing database policies.

**Why it happens:**
Adding multi-tenancy to an existing database requires enabling RLS on all tables, but developers focus on the "enable RLS" step and forget that RLS enabled WITHOUT policies means "deny all by default". The existing application was built without RLS awareness, so there's no policy infrastructure in place.

**How to avoid:**
1. Create policies BEFORE enabling RLS on production tables
2. Use this migration pattern:
   ```sql
   -- Step 1: Add business_id column (doesn't break anything)
   ALTER TABLE conversations ADD COLUMN business_id UUID;

   -- Step 2: Create policies (still no effect yet)
   CREATE POLICY "tenant_isolation" ON conversations
   FOR ALL USING (business_id = current_setting('app.current_business_id')::UUID);

   -- Step 3: Enable RLS (now policies are active)
   ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
   ```
3. Test each table in development with RLS enabled and actual queries before production migration
4. Create a verification script that checks: table has RLS enabled → table has at least one policy → queries return expected data

**Warning signs:**
- Empty result sets after migration with no errors
- Queries that worked pre-migration now return no rows
- Tests passing but production failing silently
- User reports "nothing shows up" after deployment

**Phase to address:**
Sprint 1 (Platform Stabilization) - Task: MT-03 Supabase RLS Implementation. Must include policy creation verification before RLS enablement.

---

### Pitfall 2: WebSocket Connection State Leaks Between Tenants

**What goes wrong:**
Voice conversations from Business A accidentally receive audio/transcripts meant for Business B. The WebSocket server maintains connection pools that don't properly scope state to tenant_id, causing cross-tenant data leakage during high concurrency. A user might hear another business's voice responses or see their conversation transcripts.

**Why it happens:**
The existing single-tenant system authenticates individual users but doesn't scope WebSocket connection state by business_id. When adding multi-tenancy, developers add business_id to the database but forget that WebSocket connections maintain in-memory state (active conversations, audio buffers, transcript caches) that isn't automatically isolated. Under load, race conditions cause connections to cross-reference the wrong business context.

**How to avoid:**
1. Store business_id in WebSocket connection metadata at authentication time:
   ```javascript
   // In WebSocket connection handler
   socket.metadata = {
     userId: auth.uid(),
     businessId: await getBusinessIdFromApiKey(apiKey),
     connectionId: generateUniqueId()
   };
   ```
2. Join business-specific rooms/channels: `socket.join(`business-${businessId}`)`
3. Validate business_id on EVERY message/event before processing
4. Never use shared state across connections without business_id scoping
5. Include business_id in all Redis cache keys: `conversation:${businessId}:${conversationId}`
6. Test with concurrent connections from multiple test businesses under load

**Warning signs:**
- Intermittent cross-tenant data appearing in logs/monitoring
- Conversation transcripts showing wrong business context
- Audio playback errors with "audio not found" after tenant switch
- Rate limiting triggering for wrong business
- Analytics showing conversations for wrong tenant

**Phase to address:**
Sprint 1 (Platform Stabilization) - Immediately after MT-03. Requires WebSocket middleware refactor to add business_id scoping before any multi-tenant traffic.

---

### Pitfall 3: Forgotten RLS on Vector Embeddings Table (Knowledge Base Data Leak)

**What goes wrong:**
All database tables get RLS enabled except `knowledge_base` / vector embeddings table. Business A's RAG queries can accidentally retrieve Business B's proprietary documents and knowledge base content. This is a catastrophic data breach - businesses uploaded confidential pricing, product details, customer data that's now accessible to competitors using the same platform.

**Why it happens:**
The pgvector extension table was added separately from core application tables. Developers enable RLS on conversations, bookings, messages but forget about the embeddings table because it's accessed through a different code path (n8n workflow, RAG pipeline). The table "works" without RLS in single-tenant, so it's not tested during multi-tenancy migration.

**How to avoid:**
1. Audit ALL tables - create a checklist including:
   - Core tables: conversations, messages, bookings ✓
   - Extension tables: knowledge_base, embeddings ✓
   - System tables: available_slots, configurations ✓
   - Audit tables: conversation_costs, analytics_events ✓
2. Add business_id to vector similarity search queries:
   ```sql
   SELECT * FROM embeddings
   WHERE business_id = current_setting('app.current_business_id')::UUID
   ORDER BY embedding <-> query_embedding
   LIMIT 10;
   ```
3. Test RAG queries from multiple test businesses - verify zero overlap
4. Add automated test: "Business A uploads 'SECRET_PHRASE_A', Business B searches for it, should return zero results"

**Warning signs:**
- RAG responses containing information from wrong business domain
- Knowledge base document counts don't match uploaded files per business
- Search results showing file names that don't belong to tenant
- Vector similarity returning documents with different business_id

**Phase to address:**
Sprint 1 (Platform Stabilization) - Part of MT-03. Must include explicit testing of RAG isolation before Sprint 1 completion.

---

### Pitfall 4: Widget CDN Caching Breaks Configuration Updates

**What goes wrong:**
Business updates their voice settings, branding, or system prompt in the dashboard, but the widget continues showing old configuration for 1+ hours. The CDN caches widget.js and configuration responses, so changes don't propagate. Businesses think the platform is broken when their configuration "doesn't work".

**Why it happens:**
Adding CDN distribution for widget performance introduces aggressive caching without versioning strategy. Developer sets Cache-Control: max-age=3600 to reduce origin requests, but forgets that configuration changes need immediate propagation. The config API endpoint `/api/widget/config?api_key=X` gets cached at CDN edge, returning stale data even after database updates.

**How to avoid:**
1. Use versioned widget URLs with immutable caching:
   - Static widget code: `cdn.simplifyops.tech/widget-v1.2.3.js` (cache: 1 year)
   - Configuration API: `api.simplifyops.tech/widget/config` (cache: 60 seconds or no-cache)
2. Separate static widget code (cacheable) from dynamic configuration (not cacheable):
   ```javascript
   // widget-v1.0.0.js is immutable and cached forever
   // Fetches fresh config on load
   const config = await fetch('/api/widget/config?api_key=' + apiKey, {
     cache: 'no-cache'
   });
   ```
3. Use cache headers correctly:
   - Widget JS: `Cache-Control: public, max-age=31536000, immutable`
   - Config API: `Cache-Control: private, no-cache, must-revalidate`
4. Include widget version in installation code:
   ```html
   <script src="https://cdn.simplifyops.tech/widget-v1.0.0.js"></script>
   ```
5. Implement automatic widget version upgrades for non-breaking changes
6. For breaking changes, maintain multiple versions: v1.x.x and v2.x.x simultaneously

**Warning signs:**
- Support tickets: "I changed my settings but nothing happened"
- Configuration updates require waiting 1+ hours to see changes
- Hard refresh (Ctrl+F5) works but normal refresh doesn't
- New businesses see correct config but existing ones see old config

**Phase to address:**
Sprint 2 (Widget Distribution) - Task: INSTALL-01 Widget Embed Code. Must implement versioning and caching strategy from day one. Cannot be added later without breaking existing installations.

---

### Pitfall 5: Stripe Webhook Race Condition (Stale Subscription Status)

**What goes wrong:**
User completes Stripe checkout, gets redirected to dashboard showing "Payment successful" but their plan is still "Free" for 10-30 seconds. The webhook arrives asynchronously after the redirect, causing a race condition. Users refresh frantically, open support tickets, or assume payment failed and try again (double charging risk).

**Why it happens:**
Stripe checkout redirects immediately after payment, but the webhook that creates the subscription can arrive seconds later due to network latency. The application frontend calls `/api/billing/status` which queries the database before the webhook has updated it. This is a race condition between two async systems (redirect vs webhook).

**How to avoid:**
1. Never trust subscription status immediately after checkout redirect
2. Implement optimistic UI with polling:
   ```javascript
   // On checkout success page
   const checkSubscriptionStatus = async () => {
     const response = await fetch('/api/billing/status');
     if (response.status === 'active') {
       showSuccessState();
     } else {
       // Poll every 2 seconds for up to 30 seconds
       setTimeout(checkSubscriptionStatus, 2000);
     }
   };
   ```
3. Use Stripe checkout session ID to confirm payment before webhook:
   ```javascript
   // Verify payment completed with Stripe API directly
   const session = await stripe.checkout.sessions.retrieve(sessionId);
   if (session.payment_status === 'paid') {
     // Payment confirmed, subscription will arrive via webhook soon
   }
   ```
4. Store webhook processing status:
   ```sql
   CREATE TABLE webhook_events (
     stripe_event_id TEXT PRIMARY KEY,
     processed_at TIMESTAMP,
     event_type TEXT
   );
   ```
5. Make webhook handlers idempotent - check if event already processed:
   ```javascript
   if (await isEventProcessed(event.id)) {
     return res.status(200).send('Already processed');
   }
   ```
6. Use database transactions for webhook processing to prevent partial updates

**Warning signs:**
- Users reporting "payment succeeded but no access"
- Duplicate subscription records in database
- Webhook retries creating multiple charges
- Support tickets immediately after successful checkouts
- Billing status showing "Free" despite Stripe showing "Active"

**Phase to address:**
Sprint 3 (Monetization) - Task: BILL-01 Stripe Integration. Must implement idempotency and race condition handling before production billing launch.

---

### Pitfall 6: Latency Death Spiral Under Multi-Tenant Load

**What goes wrong:**
Voice response latency is 800ms with 10 concurrent conversations but degrades to 3000ms+ at 50 concurrent conversations. Users experience robotic, frustrating conversations. Churn increases. The existing single-tenant system performed well but multi-tenancy introduces resource contention that causes non-linear latency degradation.

**Why it happens:**
ElevenLabs API, OpenAI API, and Supabase all have rate limits per account, not per tenant. With single-tenant, 10 conversations meant 10 API calls. With 50 businesses × 2 conversations each = 100 concurrent API calls hitting the same rate limits. The existing architecture doesn't queue or throttle per-business, causing cascading timeouts. Additionally, database connection pool is sized for single-tenant traffic.

**How to avoid:**
1. Implement per-business rate limiting BEFORE multi-tenant launch:
   ```javascript
   // Max 5 concurrent conversations per business
   const businessRateLimit = new Map(); // businessId -> activeCount

   if (businessRateLimit.get(businessId) >= 5) {
     return res.status(429).json({ error: 'Too many concurrent conversations' });
   }
   ```
2. Use separate API keys per business tier (if provider supports):
   - Free/Starter: Shared pool with strict limits
   - Pro/Business: Dedicated API keys or higher rate limits
3. Monitor P95/P99 latency per business and globally:
   ```javascript
   // Alert if P99 latency > 1500ms
   metrics.histogram('voice.latency', latency, { business_id });
   ```
4. Increase Supabase connection pool size for multi-tenant load:
   - Single tenant: 10 connections sufficient
   - Multi-tenant: 50-100 connections needed
5. Implement graceful degradation:
   - If latency > 2000ms, show "High traffic - switching to text mode"
   - Queue low-priority requests (analytics) during high load
6. Test with realistic concurrent load: 50 businesses × 3 conversations = 150 concurrent WebSocket connections

**Warning signs:**
- Latency increases non-linearly with concurrent users
- ElevenLabs/OpenAI rate limit errors in logs
- Supabase connection pool exhaustion errors
- Some businesses experience great performance while others timeout
- P99 latency > 2x P50 latency (indicates queue buildup)
- User complaints about "AI is slow" or "keeps pausing"

**Phase to address:**
Sprint 1 (Platform Stabilization) - Before multi-tenant launch. Sprint 2 (Widget Distribution) - Continuous monitoring with Part D: Voice Reliability Engineering (VOICE-02 WebSocket Resilience).

---

### Pitfall 7: Usage Tracking Counter Drift (Billing Disputes)

**What goes wrong:**
Business's dashboard shows "850 conversations used" but Stripe charges them for "920 conversations". Usage tracking counter gets out of sync with actual API usage, leading to billing disputes, refund requests, and trust erosion. Some businesses discover they were undercharged and refuse to pay back-bills.

**Why it happens:**
Conversation counting happens in multiple places (WebSocket close, API endpoint, Stripe webhook) without atomic increments. Race conditions, failed transactions, and crash-before-increment scenarios cause drift. Additionally, existing conversation table doesn't have proper completed_at timestamps for billing periods.

**How to avoid:**
1. Single source of truth for usage - increment in ONE place only:
   ```javascript
   // Only increment in WebSocket 'close' event after conversation completes
   await db.conversations.update({
     where: { id: conversationId },
     data: {
       completed_at: new Date(),
       billed: false  // Mark for billing processing
     }
   });
   ```
2. Use Stripe metered billing with their usage API:
   ```javascript
   // Send usage to Stripe immediately (idempotent with event IDs)
   await stripe.billing.meterEvents.create({
     event_name: 'conversation_completed',
     payload: {
       stripe_customer_id: customer.id,
       value: '1'
     },
     identifier: conversationId  // Idempotency key
   });
   ```
3. Implement reconciliation job that runs daily:
   ```sql
   -- Compare database count vs Stripe usage
   SELECT business_id,
          COUNT(*) as db_count,
          stripe_usage_count
   FROM conversations
   WHERE completed_at >= date_trunc('month', CURRENT_DATE)
   AND completed_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
   GROUP BY business_id;
   ```
4. Never decrement counters - only append corrections:
   ```javascript
   // Wrong: counter -= 1
   // Right: Add adjustment record
   await db.usage_adjustments.create({
     business_id,
     adjustment: -1,
     reason: 'Conversation failed to complete'
   });
   ```
5. Store conversation timestamps for billing period verification:
   - Track: started_at, completed_at, billed_at, billing_period_month
6. Use Stripe's webhook to confirm usage was recorded:
   - Listen to `invoice.created` and verify usage matches expectations

**Warning signs:**
- Dashboard usage count doesn't match Stripe invoice
- Businesses requesting refunds for "incorrect charges"
- Usage count decreases (should only increase)
- Missing conversations in billing period queries
- Stripe meter events showing failed delivery
- Reconciliation job reports > 1% drift between sources

**Phase to address:**
Sprint 3 (Monetization) - Task: BILL-02 Usage Tracking. Must implement single-source-of-truth pattern and reconciliation before first billing cycle.

---

### Pitfall 8: Shared Database Migration Breaks Existing Tables

**What goes wrong:**
Adding business_id columns to existing tables accidentally breaks the main business website's blog_posts, team_members, or other unrelated tables. A migration meant for voice AI tables runs against the shared Supabase project and breaks production features on the main marketing site. Website goes down during voice AI deployment.

**Why it happens:**
The Supabase project is shared with the main business site (as noted in STATE.md: "Supabase shared with main business site - DO NOT drop existing tables"). Migration scripts don't specify table names explicitly and use patterns like "ALTER ALL TABLES" or assume all tables need business_id. The existing blog_posts table doesn't need multi-tenancy but gets caught in the migration.

**How to avoid:**
1. Explicitly whitelist tables for multi-tenancy migration:
   ```sql
   -- SAFE: Specify exact tables
   ALTER TABLE conversations ADD COLUMN business_id UUID;
   ALTER TABLE messages ADD COLUMN business_id UUID;
   ALTER TABLE bookings ADD COLUMN business_id UUID;
   ALTER TABLE knowledge_base ADD COLUMN business_id UUID;

   -- DANGEROUS: Don't use wildcards
   -- DO NOT: ALTER ALL TABLES IN SCHEMA public ADD COLUMN business_id UUID;
   ```
2. Create a separate schema for voice AI tables:
   ```sql
   CREATE SCHEMA voice_ai;
   -- Move voice tables to separate schema
   ALTER TABLE conversations SET SCHEMA voice_ai;
   ```
3. Test migrations on a clone of production database first:
   - Snapshot production DB to staging
   - Run migration on staging
   - Verify blog_posts, main site tables unaffected
4. Add migration rollback plan:
   ```sql
   -- Up migration
   ALTER TABLE conversations ADD COLUMN business_id UUID;

   -- Down migration (must be tested!)
   ALTER TABLE conversations DROP COLUMN business_id;
   ```
5. Use Supabase migration system with explicit table targets:
   ```bash
   supabase migration new add_business_id_to_voice_tables
   # Edit migration file with ONLY voice AI tables
   ```

**Warning signs:**
- Migration adds columns to unexpected tables
- Main website features break after deployment
- Blog posts, team pages return errors after migration
- Supabase dashboard shows business_id on non-voice tables
- RLS enabled on tables that don't need isolation

**Phase to address:**
Sprint 1 (Platform Stabilization) - Before MT-03 RLS Implementation. Must audit all tables and explicitly scope migration to voice AI tables only.

---

### Pitfall 9: Widget Shadow DOM Doesn't Prevent CSS Inheritance

**What goes wrong:**
Widget installs successfully but appears broken on certain customer sites - buttons are huge, fonts are wrong, z-index issues cause widget to appear behind site content. The widget inherits CSS from the host site despite using Shadow DOM. Businesses complain "widget looks broken on my site" and uninstall.

**Why it happens:**
Shadow DOM provides style encapsulation but inheritable CSS properties (font-family, color, line-height, etc.) still cascade into Shadow DOM. Additionally, host site's global CSS reset or normalize.css affects Shadow DOM elements. The widget was tested on simplifyops.tech's clean design system but breaks on customer sites with aggressive global styles.

**How to avoid:**
1. Reset all inheritable CSS properties inside Shadow DOM:
   ```css
   :host {
     all: initial;
     display: block;
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
     font-size: 16px;
     line-height: 1.5;
     color: #000000;
   }
   ```
2. Use explicit z-index management:
   ```css
   :host {
     position: fixed;
     z-index: 2147483647; /* Max z-index to ensure top layer */
   }
   ```
3. Test widget on problematic sites before launch:
   - Bootstrap sites (aggressive resets)
   - WordPress sites (theme conflicts)
   - Sites with CSS-in-JS (styled-components, emotion)
   - Sites with Tailwind CSS (utility class conflicts)
4. Use closed Shadow DOM for maximum isolation:
   ```javascript
   const shadow = element.attachShadow({ mode: 'closed' });
   ```
5. Bundle all CSS inside Shadow DOM - never rely on external styles:
   ```javascript
   shadow.innerHTML = `
     <style>${widgetCssString}</style>
     <div class="widget-root">...</div>
   `;
   ```
6. Provide CSS override API for customers who need customization:
   ```html
   <script>
   window.SimplifyOpsConfig = {
     apiKey: 'so_live_...',
     customCSS: `.widget-button { background: red; }`
   };
   </script>
   ```

**Warning signs:**
- Support tickets with screenshots showing broken widget UI
- Widget works on test site but not on customer site
- Font sizes/families don't match widget design
- Widget appears behind other content (z-index issues)
- Buttons or inputs have unexpected styling
- Layout breaks on mobile devices but not desktop

**Phase to address:**
Sprint 2 (Widget Distribution) - Task: INSTALL-01 Widget Embed Code. Must test Shadow DOM isolation on multiple real-world sites before launch.

---

### Pitfall 10: ElevenLabs API Key Exposure in Widget Code

**What goes wrong:**
Widget JavaScript includes ElevenLabs API key directly in client-side code. Malicious actors extract the key from browser DevTools, use it for unlimited voice generation, and rack up thousands of dollars in API charges. SimplifyOps's API bill explodes from $500/month to $50,000/month.

**Why it happens:**
Existing single-tenant demo hardcodes ElevenLabs API key in frontend for simplicity. When building the embeddable widget, developers copy this pattern without realizing the key is now exposed on thousands of customer websites. Anyone can View Source → find API key → use it for their own projects.

**How to avoid:**
1. Never include provider API keys in widget JavaScript:
   ```javascript
   // WRONG - API key visible in client code
   const elevenlabs = new ElevenLabs({ apiKey: 'sk_371b4...' });

   // RIGHT - Proxy through backend
   const audio = await fetch('/api/voice/tts', {
     method: 'POST',
     headers: { 'X-Widget-API-Key': widgetApiKey },
     body: JSON.stringify({ text })
   });
   ```
2. Implement backend proxy for all voice API calls:
   ```javascript
   // /api/voice/tts endpoint
   export default async function handler(req, res) {
     const business = await validateApiKey(req.headers['x-widget-api-key']);

     // Use SimplifyOps's ElevenLabs key, NOT business's key
     const audio = await elevenlabs.textToSpeech({
       apiKey: process.env.ELEVENLABS_API_KEY,
       text: req.body.text
     });

     // Track usage for billing
     await incrementUsage(business.id, 'tts_call');

     return res.send(audio);
   }
   ```
3. Use signed URLs or temporary tokens for voice agent access:
   ```javascript
   // Generate temporary token that expires in 1 hour
   const token = await generateTempToken({
     businessId: business.id,
     expiresIn: 3600
   });

   // Widget uses temporary token, not API key
   const connection = new WebSocket(`wss://api.simplifyops.tech/voice?token=${token}`);
   ```
4. Implement rate limiting per widget API key:
   ```javascript
   // 100 requests per minute per business
   const rateLimiter = new RateLimiter({ max: 100, window: 60000 });
   if (!rateLimiter.check(business.id)) {
     return res.status(429).json({ error: 'Rate limit exceeded' });
   }
   ```
5. Monitor for abnormal usage patterns:
   ```javascript
   // Alert if any business uses > 10x their normal rate
   if (currentUsage > averageUsage * 10) {
     await alertSecurityTeam(`Suspicious usage: ${business.id}`);
     await temporarilyDisableApiKey(business.apiKey);
   }
   ```

**Warning signs:**
- ElevenLabs usage suddenly spikes 10x without corresponding customer growth
- API usage from unexpected IP addresses or geographies
- Single business using 100x more than their plan limit
- ElevenLabs API key found in GitHub repositories or paste sites
- Conversations created from domains not associated with any business

**Phase to address:**
Sprint 2 (Widget Distribution) - CRITICAL blocker before INSTALL-01. Must implement backend proxy and remove all API keys from client code before any widget distribution.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip RLS indexes on business_id | Faster initial migration | Slow queries at 100+ businesses, 10x latency increase | Never - indexes are required |
| Share Supabase connection pool across all businesses | Simple configuration | Connection exhaustion under load, cascading failures | Never - multi-tenancy needs larger pool |
| Store widget config in localStorage instead of API call | Faster widget load, fewer API calls | Stale configuration, no centralized updates possible | Only for non-critical settings like UI state |
| Use single global rate limiter instead of per-business | Simpler implementation | One bad actor affects all businesses | Testing only - production needs per-business limits |
| Embed API keys in widget for "faster" development | Skip building proxy API | Massive security vulnerability, unlimited API abuse | Never - not even in development |
| Skip Stripe webhook idempotency checks | Faster webhook processing | Duplicate charges, billing disputes, refund costs | Never - webhooks retry automatically |
| Use setTimeout for voice latency instead of performance.now() | Works in simple cases | Inaccurate latency measurements, missed optimizations | Never - need precise measurements |
| Skip business_id validation in WebSocket handlers | Fewer lines of code | Cross-tenant data leakage, catastrophic breach | Never - validates on every message |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase RLS | Testing policies in SQL Editor (bypasses RLS) | Test with actual Supabase client SDK from application code |
| ElevenLabs API | Calling from client-side widget JavaScript | Always proxy through backend, never expose API keys |
| Stripe Webhooks | Synchronous processing in webhook handler | Return 200 immediately, process async in queue |
| n8n RAG Workflow | Assuming single tenant, no business_id in embeddings | Add business_id to all n8n workflow inputs and vector storage |
| Vercel Edge Functions | Using Node.js APIs not available in Edge Runtime | Check Edge Runtime compatibility, use fetch instead of axios |
| WebSocket on Vercel | Assuming persistent connections | Vercel serverless has 60s timeout, implement reconnection logic |
| Supabase Realtime | Subscribing to tables without RLS filtering | Realtime respects RLS but subscriptions need explicit business_id filter |
| ElevenLabs Conversational AI | Expecting <500ms latency always | Account for network variability, 75ms model time ≠ end-to-end latency |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No indexes on business_id columns | Query performance degrades over time | Add indexes before migration: `CREATE INDEX idx_conversations_business_id ON conversations(business_id)` | >1000 rows per table |
| Fetching all business data for analytics | Dashboard loads in 100ms at launch, 10s after 3 months | Implement pagination and date range filters from day 1 | >10K conversations total |
| Loading entire knowledge base for RAG | Fast searches with 10 documents per business | Use vector similarity limit + business_id index: `LIMIT 10` | >100 documents per business |
| Single global WebSocket server | Works fine with 50 connections | Horizontal scaling with Redis Pub/Sub for multi-instance coordination | >500 concurrent connections |
| Storing conversation audio in Supabase Storage | Simple implementation, works initially | Move to dedicated CDN (Cloudflare R2, S3) with lifecycle policies | >10GB audio per business |
| Synchronous LLM calls in WebSocket handler | Simple code, acceptable latency when new | Stream LLM responses with async generators | >30 concurrent conversations |
| No connection pooling for Supabase | Works with low traffic | Configure pool size based on expected concurrent businesses × 2 | >50 concurrent API requests |
| Linear scan of widget installations | Fast when tracking 10 businesses | Add business_id + domain indexes for installation verification | >1000 widget installations |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| No PII redaction in conversation transcripts | GDPR violations, storing SSNs, credit cards | Implement regex-based redaction: `text.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN]')` before storage |
| Widget allows arbitrary WebSocket connections | Business A can connect to Business B's conversations | Validate API key matches business_id for conversation on every WebSocket message |
| Knowledge base documents accessible via direct URL | Competitor can enumerate and download all businesses' documents | Use signed URLs with expiration: `signedUrl = signUrl(fileId, expiresIn: 3600)` |
| No rate limiting on widget API endpoint | DDoS attacks, API abuse, infinite billing | Implement per-business rate limits: 100 req/min standard, 500 req/min Pro tier |
| API keys stored in plaintext | Database breach exposes all API keys | Hash API keys: store `bcrypt.hash(apiKey)`, validate with `bcrypt.compare()` |
| CORS wildcard (*) for widget API | Any domain can call API, not just installed widgets | Implement origin validation: check request origin against business's registered domains |
| No CSP (Content Security Policy) in widget | XSS attacks from host site compromise widget | Implement strict CSP: `script-src 'self' cdn.simplifyops.tech; connect-src wss://api.simplifyops.tech` |
| Storing ElevenLabs responses without validation | Malicious audio injection, voice phishing | Validate audio content-type and size before storing/serving |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Configuration changes require widget reinstall | Business updates voice, nothing happens until they re-copy script tag | Widget fetches config on load, changes propagate within 60 seconds |
| No visual feedback during voice processing | User speaks, nothing happens for 2 seconds, user thinks it broke | Show "Listening...", "Thinking...", "Speaking..." status indicators |
| Widget blocks page content on load | Host site's main CTA button hidden behind widget | Load widget collapsed, animate open only on first interaction |
| Error messages too technical | "WebSocket connection failed (1006)" confuses users | "Voice connection lost. Switching to text mode. [Retry]" |
| No offline fallback | Widget shows loading spinner forever when offline | Detect offline state, show "You appear to be offline" message immediately |
| Voice activation without permission prompt | Browser blocks microphone, user sees blank widget | Show permission prompt UI before attempting to access microphone |
| Configuration dashboard updates take effect "eventually" | Business changes voice, tests widget, hears old voice, assumes broken | Show "Changes may take up to 60 seconds to appear" notice |
| No conversation history in dashboard | Business can't review what customers said | Implement conversation playback with transcript + audio player |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **RLS Enabled:** Table has RLS enabled — verify at least one policy exists and queries return data with actual API key
- [ ] **Multi-Tenancy:** Added business_id column — verify foreign key constraint exists and ON DELETE CASCADE configured
- [ ] **API Key Auth:** Generated API keys for businesses — verify keys are hashed before storage, not plaintext
- [ ] **Widget Distribution:** Created widget.js file — verify API keys are NOT embedded in client code
- [ ] **Usage Tracking:** Incrementing conversation counter — verify idempotency (increment only once per conversation, even with retries)
- [ ] **Stripe Billing:** Webhook handler receives events — verify idempotency key checking prevents duplicate processing
- [ ] **Rate Limiting:** Per-business rate limiter — verify limits apply to WebSocket connections AND HTTP API endpoints
- [ ] **Vector Search:** RAG returns relevant results — verify business_id filter applied to prevent cross-tenant results
- [ ] **Latency Monitoring:** Tracking P95 latency — verify broken down by component (STT, LLM, TTS, RAG) not just end-to-end
- [ ] **WebSocket State:** Connection stores business_id — verify business_id validated on EVERY message, not just connection open
- [ ] **CDN Caching:** Widget loads fast — verify versioned URLs prevent stale code, config API has no-cache headers
- [ ] **Error Recovery:** Voice fails gracefully — verify fallback to text mode works, user sees helpful message
- [ ] **Shadow DOM:** Widget styles isolated — verify tested on Bootstrap, WordPress, Tailwind sites with aggressive global CSS
- [ ] **Database Indexes:** Queries perform well — verify `EXPLAIN ANALYZE` shows index usage for business_id filters
- [ ] **Billing Reconciliation:** Usage matches Stripe — verify daily reconciliation job compares database vs Stripe counts

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS Policy Data Leak | HIGH (legal, reputation) | 1. Immediately disable affected API keys 2. Audit access logs to determine exposure scope 3. Notify affected businesses within 72 hours (GDPR) 4. Offer free credit/extended service 5. Implement monitoring to prevent recurrence |
| API Key Exposed in Widget | HIGH (financial, $10K-$50K) | 1. Rotate ElevenLabs API key immediately 2. Identify fraudulent usage in logs 3. Implement backend proxy 4. Deploy new widget version to all customers 5. Request ElevenLabs credit for fraudulent usage |
| Usage Tracking Drift | MEDIUM (trust, billing disputes) | 1. Pause billing for affected businesses 2. Run reconciliation query to find drift amount 3. Issue credits for overcharges 4. Fix single-source-of-truth counter 5. Implement daily drift monitoring |
| Widget CDN Cache Issues | LOW (frustration, support load) | 1. Implement immediate cache purge API 2. Add version query param to force refresh: `widget.js?v=timestamp` 3. Notify affected businesses of workaround 4. Fix caching headers for future deployments |
| WebSocket Cross-Tenant Leak | HIGH (catastrophic, shutdown risk) | 1. Immediately shut down WebSocket server 2. Audit all connections for business_id leakage 3. Implement per-message business_id validation 4. Load test with concurrent multi-tenant traffic 5. External security audit before re-launch |
| Latency Death Spiral | MEDIUM (churn risk) | 1. Implement emergency rate limiting (reduce to 50% capacity) 2. Scale infrastructure horizontally (add instances) 3. Analyze latency breakdown to find bottleneck 4. Implement per-business quotas 5. Communicate proactively with affected businesses |
| Shared DB Migration Breaks Main Site | HIGH (revenue loss, all traffic down) | 1. Rollback migration immediately 2. Restore from backup if needed 3. Test migration on staging clone of production 4. Re-run migration with explicit table list only 5. Implement migration approval process |
| Stripe Webhook Duplicates | MEDIUM (refunds, support load) | 1. Query for duplicate subscription records 2. Identify overcharged customers 3. Issue refunds through Stripe 4. Fix idempotency checking in webhook handler 5. Add monitoring for duplicate event IDs |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS Enabled Without Policies | Sprint 1 (Platform Stabilization) | Test queries return data with multiple test businesses, verify policies exist for all RLS-enabled tables |
| WebSocket Connection State Leaks | Sprint 1 (Platform Stabilization) | Load test with 50 concurrent connections from 10 different businesses, verify zero cross-tenant events |
| Forgotten RLS on Vector Embeddings | Sprint 1 (Platform Stabilization) | RAG query from Business A for Business B's document returns zero results |
| Widget CDN Caching Breaks Config | Sprint 2 (Widget Distribution) | Change configuration, verify widget reflects change within 60 seconds without cache purge |
| Stripe Webhook Race Condition | Sprint 3 (Monetization) | Complete checkout, verify UI shows processing state and polls for subscription confirmation |
| Latency Death Spiral Under Load | Sprint 1 & Sprint 2 | Load test with 100 concurrent conversations, verify P99 latency remains <1500ms |
| Usage Tracking Counter Drift | Sprint 3 (Monetization) | Run reconciliation job after 100 conversations, verify <1% drift between database and Stripe |
| Shared Database Migration Breaks Existing Tables | Sprint 1 (Platform Stabilization) | Migration runs on staging, verify blog_posts and main site tables unchanged |
| Widget Shadow DOM CSS Inheritance | Sprint 2 (Widget Distribution) | Install widget on 5 different customer sites (Bootstrap, WordPress, Tailwind), verify styling correct |
| ElevenLabs API Key Exposure | Sprint 2 (Widget Distribution) | View Source on widget, verify no API keys present, all calls proxy through backend |

## Sources

**Supabase RLS Multi-Tenancy:**
- [Supabase Row Level Security (RLS): Complete Guide (2026)](https://designrevision.com/blog/supabase-row-level-security)
- [Supabase: Support Multi-Tenancy With Detail + Template Project](https://medium.com/@itsuki.enjoy/supabase-support-multi-tenancy-with-detail-template-project-34f3a3d97ee4)
- [Multi-Tenant Applications with RLS on Supabase (Postgres)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Supabase RLS Best Practices: Production Patterns](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Docs: RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

**Widget Security & Shadow DOM:**
- [Web Components & Lit in mixed stacks - Security Pitfalls & Fixes](https://www.sachith.co.uk/web-components-lit-in-mixed-stacks-security-pitfalls-fixes-practical-guide-feb-15-2026/)
- [Building Embeddable React Widgets: Production-Ready Guide](https://makerkit.dev/blog/tutorials/embeddable-widgets-react)
- [Shadow DOM & Security - Exploring the boundary](https://speakerdeck.com/masatokinugawa/shadow-dom-and-security-exploring-the-boundary-between-light-and-shadow)

**Stripe Billing & Webhooks:**
- [Stripe Webhooks: Solving Race Conditions](https://www.pedroalonso.net/blog/stripe-webhooks-deep-dive/)
- [The Race Condition You're Probably Shipping With Stripe Webhooks](https://dev.to/belazy/the-race-condition-youre-probably-shipping-right-now-with-stripe-webhooks-mj4)
- [Billing webhook race condition solution guide](https://excessivecoding.com/blog/billing-webhook-race-condition-solution-guide)
- [Stripe Documentation: Recording Usage for Billing](https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage)
- [Stripe Documentation: Migrate to Billing Meters](https://docs.stripe.com/billing/subscriptions/usage-based-legacy/migration-guide)

**WebSocket Multi-Tenant Isolation:**
- [Tenant isolation in multi-tenant systems](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems)
- [Architecting Secure Multi-Tenant Data Isolation](https://medium.com/@justhamade/architecting-secure-multi-tenant-data-isolation-d8f36cb0d25e)
- [Scalable WebSocket Architecture](https://blog.hathora.dev/scalable-websocket-architecture/)

**Voice AI Latency & Scaling:**
- [How do you optimize latency for Conversational AI?](https://elevenlabs.io/blog/how-do-you-optimize-latency-for-conversational-ai)
- [ElevenLabs Documentation: Latency Optimization](https://elevenlabs.io/docs/best-practices/latency-optimization)
- [Engineering for Real-Time Voice Agent Latency](https://cresta.com/blog/engineering-for-real-time-voice-agent-latency)
- [What Latency Really Means in Voice AI](https://signalwire.com/blogs/industry/what-latency-means-voice-ai)
- [Designing concurrent pipelines for real-time voice AI](https://www.gladia.io/blog/concurrent-pipelines-for-voice-ai)

**CDN Caching & Versioning:**
- [CDN JS Best Practices: Minification, Versioning & Cache-Bust Rules](https://blog.blazingcdn.com/en-us/cdn-js-best-practices-minification-versioning-cache-bust-rules)
- [CDN for Files at Scale: Versioning, Integrity and Cache Busting](https://blog.blazingcdn.com/en-us/cdn-for-files-at-scale-versioning-integrity-cache-busting)

**Multi-Tenant Migration Challenges:**
- [Migrating an application to multi-tenancy](https://djangowaves.com/tips-tricks/migrate-an-application-to-multi-tenancy/)
- [Migrate Multi-Tenant Environments With Atlas](https://atlasgo.io/blog/2022/10/27/multi-tenant-support)
- [People's experiences with approaches to multitenancy](https://blog.arkency.com/peoples-experiences-with-approaches-to-multitenancy/)

---
*Pitfalls research for: Adding Multi-Tenancy, Widget Distribution & Billing to Existing Voice AI Application*
*Researched: 2026-03-05*
*Context: SimplifyOps v2.0 B2B2C Platform Launch - Integration-specific risks when transforming single-tenant demo into multi-tenant SaaS*
