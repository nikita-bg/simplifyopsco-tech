# Technology Stack

**Project:** SimplifyOps B2B2C Multi-Tenant SaaS Platform
**Researched:** 2026-03-05
**Confidence:** HIGH

## Existing Stack (Unchanged)

These technologies are already implemented and working. Do NOT re-research or modify:

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | App Router + TypeScript + Tailwind v4 |
| Supabase | Latest | Auth + PostgreSQL + pgvector for RAG |
| ElevenLabs API | Latest | Voice (STT + TTS + Conversational AI) |
| OpenAI API | Latest | LLM reasoning + embeddings |
| n8n | Self-hosted | RAG workflow automation |
| Vercel | Latest | Deployment + serverless functions |

---

## New Stack Additions for Multi-Tenant SaaS

### Widget Embedding & Distribution

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Shadow DOM** | Web Standard | Widget style isolation | 96% browser support, prevents host page CSS conflicts. Industry standard for embeddable widgets (used by Intercom, Zendesk, Drift). |
| **@elevenlabs/react** | ^2.36.0+ | ElevenLabs React SDK | Official SDK with WebRTC streaming, event-driven architecture, and client tools support. Rebranded from "Conversational AI" to "ElevenAgents" in v2.36.0 (Feb 2026). |
| **Webpack** | 5.x | Widget bundling | Essential for creating single-file widget.js bundle. Target <100KB gzipped (React + Tailwind achieves ~45KB). |

**Widget Architecture:**
```html
<!-- Customer embeds this -->
<script>
  (function() {
    window.SimplifyOpsConfig = { apiKey: 'so_live_...' };
    var s = document.createElement('script');
    s.src = 'https://cdn.simplifyops.tech/widget.js';
    s.async = true;
    document.head.appendChild(s);
  })();
</script>
```

**Widget Delivery:**
- Use Vercel Edge Functions to serve widget.js globally
- Enable 1-hour cache headers (`Cache-Control: public, max-age=3600`)
- Version URLs for breaking changes: `widget.v2.js`
- Vercel's Edge Network: 119 Points of Presence, 70ms avg TTFB

### Multi-Tenant Database & Security

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Supabase RLS Policies** | PostgreSQL 15+ | Multi-tenant data isolation | Industry-standard approach. Add `business_id` to all tables, enforce via RLS. MakerKit reports 3-minute queries reduced to 2ms with proper indexing. |
| **JWT Custom Claims** | Via Supabase Auth | Tenant context in tokens | Store `business_id` in JWT to avoid subqueries in RLS policies. Performance critical for <100ms query times. |
| **bcrypt** | ^5.1.1 | API key hashing | Industry standard for hashing API keys before storage. Never store plaintext keys. |

**RLS Pattern:**
```sql
-- Add to all tables
ALTER TABLE conversations ADD COLUMN business_id UUID REFERENCES businesses(id);
CREATE INDEX idx_conversations_business_id ON conversations(business_id);

-- RLS Policy
CREATE POLICY tenant_isolation ON conversations
  FOR ALL USING (
    business_id = (current_setting('request.jwt.claims')::json->>'business_id')::uuid
  );
```

**Defense-in-Depth Security:**
- Middleware provides fast rejection of invalid requests
- Data Access Layer provides the security guarantee
- NEVER rely on middleware alone (2026 best practice per WorkOS/Clerk)

### Authentication & Rate Limiting

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@upstash/ratelimit** | ^2.0.0+ | Rate limiting at edge | Built for Vercel Edge, uses Upstash Redis. Supports sliding window, token bucket. Zero cold starts. 1000 requests/sec capacity. |
| **Vercel KV** | Latest | Redis for rate limiting | Serverless Redis, global replication. Alternative: Upstash Redis directly. |
| **nanoid** | ^5.0.0 | API key generation | Secure, URL-safe ID generation. Use format: `so_live_${nanoid(32)}` for API keys. |

**Rate Limiting Strategy:**
- Implement in Edge Middleware (`middleware.ts`)
- Per-business limits: 100 req/min (configurable by tier)
- Per-IP limits: 10 req/min for unauthenticated
- Block at edge before hitting serverless functions (cost savings)

### Billing & Usage Tracking

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **stripe** | ^18.0.0+ | Payment processing | Industry standard. Native support for usage-based billing via Meters API (v2: 10,000 events/sec). |
| **@stripe/stripe-js** | ^6.0.0+ | Client-side Stripe | Official Stripe client for checkout flows. |
| **stripe webhooks** | Stripe API | Event-driven billing | Use `subscription.created`, `invoice.paid`, `customer.subscription.deleted` events. |

**Usage-Based Billing Implementation:**
```typescript
// Track usage
await stripe.billing.meterEvents.create({
  event_name: 'voice_conversation',
  payload: {
    stripe_customer_id: customer.id,
    value: '1', // increment by 1
  },
  timestamp: Math.floor(Date.now() / 1000),
});
```

**Pricing Model:**
- Base subscription (Stripe Products)
- Metered overages (Stripe Meters API)
- 1,000 events/sec in live mode (sufficient for launch)
- Pre-aggregate if exceeding limits (batch events)

### Monitoring & Observability

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@vercel/otel** | ^2.0.0+ | OpenTelemetry instrumentation | Official Vercel package. Auto-sends traces to Vercel observability. Works with standard OTLP exporters. |
| **@sentry/nextjs** | ^9.0.0+ | Error tracking | Official Next.js SDK. Captures serverless errors, client errors, source maps. Vercel integration available. |
| **Vercel Analytics** | Built-in | Core Web Vitals | Included with Vercel. Tracks TTFB, FCP, LCP automatically. |
| **Vercel Speed Insights** | Built-in | Real User Monitoring | Included with Vercel. Measures actual user experience. |

**OpenTelemetry Setup:**
```typescript
// next.config.js
import { withVercelOtel } from '@vercel/otel';

export default withVercelOtel({
  serviceName: 'simplifyops-voice-widget',
});
```

**Latency Monitoring Targets:**
- STT: <300ms (P99)
- RAG query: <100ms (P99)
- LLM inference: <800ms (P99)
- TTS: <300ms (P99)
- Total: <1200ms (P99)

**Sentry Configuration:**
- Capture errors from: API routes, Edge Functions, client-side
- Set up Vercel Drains for log forwarding (experimental 2026 feature)
- Source maps auto-uploaded via Vercel integration
- Experimental: Vercel Cron monitoring for scheduled tasks

### PII Redaction & Compliance

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **@redactpii/node** | ^1.0.0+ | PII redaction | Zero-dependency, <1ms regex redaction. Works offline. Patterns for SSN, credit cards, emails, phones. |
| **redact-pii** | ^1.4.0+ | Advanced PII detection | Google DLP integration for complex cases. Supports international IDs, non-Latin characters. Use for high-value data. |

**GDPR Compliance Pattern:**
```typescript
import { redact } from '@redactpii/node';

// Before storing conversation transcript
const sanitized = redact(transcript, {
  patterns: ['email', 'ssn', 'creditCard', 'phone'],
  replacement: '[REDACTED]'
});
```

**Compliance Checklist:**
- Explicit consent banner before recording
- Data Processing Agreements (DPAs) with ElevenLabs, OpenAI
- Auto-delete transcripts after 90 days
- User data export/delete API
- Data minimization (send only necessary data to APIs)

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **zod** | ^3.24.0+ | API validation | Validate widget config, API payloads. TypeScript-first schema validation. |
| **date-fns** | ^4.1.0+ | Date manipulation | Working hours logic, billing periods. Lighter than moment.js. |
| **sharp** | ^0.33.0+ | Image processing | Logo uploads, resizing for widget branding. Serverless-friendly. |
| **archiver** | ^7.0.0+ | Data export | GDPR data export as ZIP. Create backups of knowledge base. |
| **pg** | ^8.13.0+ | Direct PostgreSQL | Raw SQL for complex RLS testing. Direct connection to Supabase. |

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **webpack-bundle-analyzer** | Bundle size analysis | Visualize widget.js size. Target <100KB gzipped. |
| **Postman / Insomnia** | API testing | Test webhook handlers, simulate Stripe events. |
| **Supabase Studio** | Database management | Test RLS policies, view logs, manage auth. |
| **Stripe CLI** | Webhook testing | Local webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |

---

## Installation

```bash
# Widget Embedding
npm install @elevenlabs/react

# Multi-Tenancy & Security
npm install bcrypt nanoid @upstash/ratelimit

# Billing
npm install stripe @stripe/stripe-js

# Monitoring & Observability
npm install @vercel/otel @sentry/nextjs

# PII Redaction
npm install @redactpii/node redact-pii

# Supporting Libraries
npm install zod date-fns sharp archiver pg

# Dev Dependencies
npm install -D webpack-bundle-analyzer @types/bcrypt @types/pg
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| **Shadow DOM** | iframe | If you need complete sandboxing (payment forms). Shadow DOM is lighter and faster. |
| **Vercel Edge + Upstash** | Cloudflare Workers + KV | If already on Cloudflare. Vercel Edge is simpler with Next.js. |
| **Stripe Meters API** | Manual tracking in DB | If <100 customers or simple counting. Stripe scales better. |
| **@vercel/otel** | Custom OTLP exporter | If using non-Vercel observability platform (e.g., Datadog, New Relic). |
| **Supabase RLS** | App-level filtering | NEVER. RLS is security layer. App logic is convenience. Both required. |
| **@redactpii/node** | Google DLP API | If redacting non-English or complex PII. DLP is more accurate but slower/costly. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Standalone Edge Functions** | Product discontinued by Vercel | Vercel Functions with edge runtime |
| **Edge Runtime for CPU-intensive** | Limited compute, no Node.js APIs | Node.js runtime for image processing, heavy compute |
| **Client-side RLS enforcement** | Security vulnerability | PostgreSQL RLS policies (server-side) |
| **localStorage for API keys** | XSS vulnerability | Server-side session, httpOnly cookies |
| **moment.js** | Deprecated, 67KB bundle | date-fns (12KB) or native Intl.DateTimeFormat |
| **Custom auth middleware only** | Insufficient (2026 security audits) | Middleware + Data Access Layer verification |

---

## Stack Patterns by Variant

### If Widget Bundle Size Exceeds 100KB:
- Code-split ElevenLabs SDK (lazy load on first interaction)
- Use Preact instead of React (3KB vs 40KB)
- Extract Tailwind to external CSS (cache separately)
- Tree-shake unused ElevenLabs features

### If Rate Limiting at Scale (>10K req/sec):
- Use Vercel WAF Rate Limit Rules (hardware-accelerated)
- Pre-aggregate usage events before Stripe Meters
- Consider Cloudflare in front of Vercel for DDoS protection

### If Multi-Region Deployment Required:
- Upstash Redis: Global replication built-in
- Supabase: Add read replicas in target regions
- Vercel Edge: Already multi-region (119 PoPs)
- ElevenLabs: Uses Cloudflare edge, already global

### If HIPAA Compliance Needed (Healthcare Vertical):
- Upgrade to Supabase Pro (BAA available)
- Use `redact-pii` with Google DLP (PHI detection)
- Enable Supabase audit logs
- Implement end-to-end encryption for transcripts

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @elevenlabs/react ^2.36.0 | React 18+ | Renamed from "Conversational AI" in Feb 2026 |
| @upstash/ratelimit ^2.0.0 | Vercel Edge Runtime | Tested specifically for edge |
| stripe ^18.0.0 | Node.js 18+ | Meters API requires Stripe API v2 |
| @vercel/otel ^2.0.0 | Next.js 14+ | Auto-configured on Vercel |
| @sentry/nextjs ^9.0.0 | Next.js 16+ | Source maps via Vercel integration |
| sharp ^0.33.0 | Node.js 18+ | Native module, Vercel-compatible |

---

## Integration Points with Existing Stack

### Next.js App Router
- API routes: `/api/widget/config`, `/api/voice/ws`, `/api/webhooks/stripe`
- Edge Middleware: `middleware.ts` for rate limiting + API key validation
- Server Components: Dashboard configuration UI
- Client Components: Widget preview, analytics charts

### Supabase
- **Auth**: JWT custom claims for `business_id`
- **Database**: RLS policies on all tables with `business_id`
- **Realtime**: WebSocket for live dashboard updates
- **Storage**: Knowledge base PDFs, widget branding assets

### ElevenLabs
- **@elevenlabs/react**: Replaces custom WebRTC implementation
- **Conversational AI**: Native barge-in, echo cancellation
- **Client Tools**: Custom functions for booking, navigation

### Vercel
- **Edge Functions**: Widget delivery (`widget.js`)
- **Serverless Functions**: API routes, webhook handlers
- **Analytics**: Built-in observability
- **KV**: Rate limiting storage

---

## CDN & Edge Considerations

### Widget Delivery Strategy
1. **Build**: Webpack bundles `widget.js` (target <100KB gzipped)
2. **Deploy**: Vercel Edge Function serves file
3. **Cache**: 1-hour TTL (`Cache-Control: public, max-age=3600`)
4. **Versioning**: Breaking changes → `widget.v2.js`, `widget.v3.js`
5. **Rollback**: Keep previous versions available for 30 days

### Edge Runtime Constraints
- **No Node.js APIs**: Can't use `fs`, `child_process`
- **100ms execution limit**: Must be fast
- **HTTP-based OTLP export only**: For OpenTelemetry
- **Use SimpleSpanProcessor**: Flush traces before return
- **Suitable for**: Rate limiting, auth checks, redirects, cached responses
- **NOT suitable for**: Image processing, PDF generation, heavy compute

### Performance Optimization
- **Streaming responses**: Start rendering before auth completes (30-40% faster perceived load)
- **Edge caching**: Widget config cached at edge (low-latency fetch)
- **CDN distribution**: 119 global edge locations (Vercel)
- **WebSocket proximity**: Route to nearest region with Supabase Realtime

---

## API Key Authentication Pattern

### Generation
```typescript
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

const apiKey = `so_live_${nanoid(32)}`;
const hashedKey = await bcrypt.hash(apiKey, 10);

// Store hashed in businesses.api_key_hash
// Return plaintext ONCE to customer (never again)
```

### Validation (Edge Middleware)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

export async function middleware(req) {
  const apiKey = req.headers.get('x-api-key');

  // 1. Rate limit check (edge)
  const ratelimit = new Ratelimit({
    redis: kv,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
  });
  const { success } = await ratelimit.limit(apiKey);
  if (!success) return new Response('Rate limit exceeded', { status: 429 });

  // 2. API key validation (database check happens in API route)
  // Middleware only does fast checks
  return NextResponse.next();
}
```

### Verification (API Route - Data Access Layer)
```typescript
// app/api/widget/config/route.ts
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

export async function GET(req: Request) {
  const apiKey = req.headers.get('x-api-key');

  // Fetch business by API key hash
  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('api_key_hash', await bcrypt.hash(apiKey, 10))
    .single();

  if (!business) return new Response('Invalid API key', { status: 401 });

  // Return business-specific config
  return Response.json(business.widget_config);
}
```

**Security Layers:**
1. **Edge Middleware**: Rate limiting, obvious invalid requests
2. **API Route**: API key verification, RLS context setting
3. **Database RLS**: Row-level security, final enforcement

---

## Sources

### High Confidence (Official Docs + Context7)
- [ElevenLabs React SDK Documentation](https://elevenlabs.io/docs/conversational-ai/libraries/react) - Official SDK reference, v2.36.0 features
- [Stripe Usage-Based Billing Guide](https://docs.stripe.com/billing/subscriptions/usage-based) - Meters API implementation
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) - Official RLS patterns
- [Vercel OpenTelemetry Guide](https://nextjs.org/docs/app/guides/open-telemetry) - Next.js official instrumentation
- [Sentry Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/) - Official setup guide

### Medium Confidence (Production Guides + 2026 Patterns)
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - Production optimization patterns
- [Building Embeddable React Widgets (MakerKit)](https://makerkit.dev/blog/tutorials/embeddable-widgets-react) - Widget bundling guide
- [Next.js Auth Patterns 2026 (WorkOS)](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) - Defense-in-depth security
- [Rate Limiting with Vercel Edge (Upstash)](https://upstash.com/blog/edge-rate-limiting) - Edge middleware patterns
- [Vercel Edge Network Overview](https://vercel.com/docs/edge-network/overview) - CDN capabilities

### Medium Confidence (Web Search - Multiple Sources)
- Shadow DOM for widgets: 96% browser support, industry standard (Intercom, Zendesk)
- Webpack bundle optimization: Target <100KB gzipped for widgets
- PII redaction libraries: @redactpii/node (<1ms), Google DLP for complex cases
- Vercel Edge deprecation: Standalone Edge Functions discontinued, use edge runtime

### Implementation References
- [Vercel AI SDK Observability (SigNoz)](https://signoz.io/docs/vercel-ai-sdk-observability/) - OpenTelemetry patterns
- [Multi-Tenant RLS (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/) - Real-world implementation
- [Stripe Metered Billing (MakerKit)](https://makerkit.dev/docs/next-supabase-turbo/billing/metered-usage) - Next.js + Stripe example

---

**Confidence Assessment:**

| Area | Confidence | Reason |
|------|------------|--------|
| Widget Embedding | HIGH | Shadow DOM is industry standard, ElevenLabs SDK official, Webpack proven |
| Multi-Tenancy | HIGH | Supabase RLS is production-ready, documented patterns from MakerKit |
| Billing | HIGH | Stripe Meters API is official, 10K events/sec sufficient for scale |
| Monitoring | HIGH | Vercel + Sentry official integrations, OpenTelemetry standard |
| Rate Limiting | HIGH | Upstash built for Vercel Edge, production-tested |
| PII Redaction | MEDIUM | Libraries verified, but GDPR compliance requires legal review |

---

*Stack research for: SimplifyOps B2B2C Multi-Tenant SaaS Platform*
*Focus: New capabilities only (widget, multi-tenancy, billing, monitoring)*
*Researched: 2026-03-05*
