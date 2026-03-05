# Architecture Research: Multi-Tenant Voice AI Widget Platform

**Domain:** B2B2C SaaS Platform (Voice AI Widget Distribution)
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

This architecture transforms SimplifyOps from a single-tenant demo into a multi-tenant B2B2C platform where businesses purchase subscriptions and install embeddable widgets on their websites. The architecture integrates three core systems:

1. **Multi-tenancy layer** (Supabase RLS + business_id pattern)
2. **Widget distribution system** (CDN-hosted Shadow DOM with API key auth)
3. **Existing voice infrastructure** (Next.js + ElevenLabs + n8n)

**Key architectural principle:** Add multi-tenancy without breaking existing voice core. New features integrate through clear boundaries, not rewrites.

---

## Current Architecture (v1.0 Baseline)

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Browser)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Landing   │  │  Dashboard   │  │ VoiceWidget  │            │
│  │    Pages    │  │    (Auth)    │  │  Component   │            │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                │                  │                    │
├─────────┴────────────────┴──────────────────┴────────────────────┤
│                      API LAYER (Next.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  API Routes (App Router)                                │    │
│  │  /api/voice/token   /api/conversations   /api/bookings  │    │
│  │  /api/analytics     /api/knowledge       /api/chat      │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   DATA + EXTERNAL SERVICES                       │
│  ┌──────────────┐  ┌────────────┐  ┌──────────────┐             │
│  │   Supabase   │  │ ElevenLabs │  │     n8n      │             │
│  │  (Postgres   │  │   (Voice   │  │  (Workflows) │             │
│  │   + Auth +   │  │Conversation│  │  RAG + Sync  │             │
│  │   pgvector)  │  │   Agent)   │  │              │             │
│  └──────────────┘  └────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Current Database Schema

**Tables:**
- `profiles` - User profiles (extends auth.users)
- `conversations` - Voice conversation sessions
- `messages` - Conversation transcripts
- `knowledge_base` - RAG embeddings (pgvector)
- `bookings` - Appointment bookings
- `available_slots` - Business hours configuration

**Current RLS pattern:**
```sql
-- Example: conversations RLS (v1.0)
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);
```

**Limitation:** All data belongs to authenticated users. No concept of "businesses" or "tenants."

### Current ElevenLabs Integration

**Flow:**
1. Client requests signed URL: `GET /api/voice/token`
2. Server fetches from ElevenLabs: `GET /v1/convai/conversation/get_signed_url?agent_id={agentId}`
3. Client starts conversation: `useConversation().startSession({ signedUrl })`
4. Client tools execute: `scrollToSection`, `navigateTo`, `scheduleBooking`

**Limitation:** Single agent_id hardcoded in env vars. All conversations use same ElevenLabs agent.

---

## Multi-Tenant Architecture (v2.0 Target)

### System Overview with Multi-Tenancy

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS CUSTOMER SITES                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │  ecommerce.com │  │  dentist.com   │  │  saas-app.com  │     │
│  │                │  │                │  │                │     │
│  │  <script>      │  │  <script>      │  │  <script>      │     │
│  │   apiKey:      │  │   apiKey:      │  │   apiKey:      │     │
│  │   so_biz_A123  │  │   so_biz_B456  │  │   so_biz_C789  │     │
│  │  </script>     │  │  </script>     │  │  </script>     │     │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘     │
│           │                   │                    │             │
│           └───────────────────┴────────────────────┘             │
│                               │                                  │
├───────────────────────────────┴──────────────────────────────────┤
│                       CDN LAYER (Vercel Edge)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  https://cdn.simplifyops.tech/widget.js                 │    │
│  │  - Loads Shadow DOM widget                              │    │
│  │  - Fetches config using API key                         │    │
│  │  - Initializes ElevenLabs conversation                  │    │
│  │  Bundle size: <50KB gzipped                             │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                   PLATFORM LAYER (Next.js)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NEW: Widget API Routes                                 │    │
│  │  GET  /api/widget/config?api_key=xxx                    │    │
│  │  GET  /api/widget/token?api_key=xxx                     │    │
│  │  POST /api/widget/session?api_key=xxx                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NEW: Business Management Routes                        │    │
│  │  /api/businesses/config (update voice, branding, hours) │    │
│  │  /api/businesses/usage  (track conversation counts)     │    │
│  │  /api/businesses/billing (Stripe webhooks)              │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  EXISTING: Core API Routes (Modified for multi-tenancy) │    │
│  │  /api/conversations  (now filtered by business_id)      │    │
│  │  /api/bookings       (now filtered by business_id)      │    │
│  │  /api/knowledge      (now filtered by business_id)      │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NEW: Dashboard for Business Owners                     │    │
│  │  /dashboard/settings  (voice, personality, branding)    │    │
│  │  /dashboard/install   (copy <script> tag)               │    │
│  │  /dashboard/billing   (Stripe subscription)             │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                  DATA LAYER (Supabase Multi-Tenant)              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NEW TABLE: businesses                                  │    │
│  │  - id (UUID, PK)                                        │    │
│  │  - owner_id (FK → auth.users)                           │    │
│  │  - api_key_hash (hashed API key for widget auth)       │    │
│  │  - agent_id (ElevenLabs agent per business)            │    │
│  │  - voice_id (ElevenLabs voice selection)               │    │
│  │  - system_prompt (agent personality)                   │    │
│  │  - branding (JSONB: color, logo, position)             │    │
│  │  - working_hours (JSONB)                                │    │
│  │  - plan_tier (free/starter/pro/business)               │    │
│  │  - conversation_count (usage tracking)                 │    │
│  │  - conversation_limit (plan limit)                     │    │
│  │  - stripe_subscription_id                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MODIFIED TABLES (add business_id column + RLS update)  │    │
│  │  - conversations (+ business_id FK)                     │    │
│  │  - messages (inherit via conversation FK)              │    │
│  │  - knowledge_base (+ business_id FK)                   │    │
│  │  - bookings (+ business_id FK)                         │    │
│  │  - available_slots (+ business_id FK)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  RLS Policies: business_id filtering                    │    │
│  │  WHERE business_id IN (                                 │    │
│  │    SELECT id FROM businesses WHERE owner_id = auth.uid()│    │
│  │  )                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Widget Loader** | Bootstrap widget on external sites, inject Shadow DOM, fetch config | Vanilla JS bundle (<50KB), hosted on Vercel Edge |
| **Shadow DOM Container** | Style isolation, prevent CSS conflicts with host site | Web Components API with `attachShadow({ mode: 'closed' })` |
| **Widget API Middleware** | Authenticate API keys, resolve business_id, rate limiting | Next.js middleware with API key hash validation |
| **Business Config Service** | Manage per-business settings (voice, branding, hours) | API routes + Supabase businesses table |
| **Multi-Tenant RLS** | Enforce data isolation at database level | Supabase RLS policies with business_id filtering |
| **ElevenLabs Proxy** | Generate per-business signed URLs with business-specific agent_id | Server-side API route with business lookup |
| **Usage Tracker** | Count conversations per business, enforce limits | Database trigger + API route |
| **Stripe Integration** | Subscription management, usage-based billing | Webhooks + Stripe SDK |

---

## Integration Points

### 1. Widget Embed → Config API

**Flow:**
```
1. Host site loads: <script src="https://cdn.simplifyops.tech/widget.js"></script>
2. Script reads: window.SimplifyOpsConfig = { apiKey: 'so_live_abc123' }
3. Widget fetches: GET /api/widget/config?api_key=so_live_abc123
4. Response:
   {
     "business_id": "uuid-123",
     "branding": { "color": "#256AF4", "logo": "url", "position": "bottom-right" },
     "working_hours": { "enabled": true, "schedule": {...} }
   }
5. Widget renders Shadow DOM with business branding
```

**Integration point:** NEW `/api/widget/config` route
**Touches existing:** None (isolated)
**Security:** API key validation, rate limiting (100 req/min per business)

### 2. Widget Voice Session → ElevenLabs Proxy

**Flow:**
```
1. User clicks "Start Conversation" in widget
2. Widget requests: GET /api/widget/token?api_key=so_live_abc123
3. Server:
   a. Validates API key → resolves business_id
   b. Looks up business.agent_id from database
   c. Requests signed URL from ElevenLabs for THAT agent_id
   d. Returns signed URL to widget
4. Widget starts conversation with business-specific agent
```

**Integration point:** MODIFY `/api/voice/token` to accept `api_key` param
**Touches existing:** Extends current signed URL logic (backward compatible)
**Security:** Signed URLs valid 15 minutes, origin allowlist per business

### 3. Conversation Logging → Multi-Tenant Database

**Flow:**
```
1. Widget ends conversation
2. Widget posts: POST /api/widget/session
   {
     "api_key": "so_live_abc123",
     "messages": [...],
     "duration": 180
   }
3. Server:
   a. Validates API key → resolves business_id
   b. Creates conversation record with business_id
   c. Creates message records (inherited via conversation FK)
   d. Increments business.conversation_count
4. RLS automatically filters: business owner sees only their conversations
```

**Integration point:** MODIFY `/api/conversations` to accept API key auth
**Touches existing:** Add business_id to INSERT, rest unchanged
**Security:** RLS policies prevent cross-tenant access

### 4. Knowledge Base Upload → Tenant Isolation

**Flow:**
```
1. Business owner uploads PDF in /dashboard/knowledge
2. Frontend: POST /api/knowledge
3. Server:
   a. Authenticates user (Supabase Auth)
   b. Resolves business_id from auth.uid()
   c. Triggers n8n workflow with business_id
4. n8n workflow:
   a. Chunks document
   b. Generates embeddings
   c. Inserts to knowledge_base with business_id
5. Widget RAG queries filter by business_id automatically (RLS)
```

**Integration point:** MODIFY `/api/knowledge` to include business_id
**Touches existing:** n8n workflow receives business_id parameter
**Security:** RLS ensures business A cannot query business B's knowledge

### 5. Dashboard → Business Management

**Flow:**
```
1. Business owner logs in (Supabase Auth)
2. Dashboard fetches: GET /api/businesses/me
3. Response:
   {
     "id": "uuid-123",
     "api_key": "so_live_abc123",  // Display for copying
     "voice_id": "sarah",
     "plan_tier": "pro",
     "conversation_count": 750,
     "conversation_limit": 1000
   }
4. Owner updates settings: PATCH /api/businesses/me
5. Changes reflect in widget within 30 seconds (cache TTL)
```

**Integration point:** NEW `/api/businesses/*` routes
**Touches existing:** None (isolated)
**Security:** Owner can only modify their own businesses (RLS)

---

## Data Flow Diagrams

### Widget Installation Flow

```
[Business Owner]
    ↓ (Signs up, creates account)
[POST /api/auth/signup] → [Supabase Auth]
    ↓ (Trigger: create business record)
[businesses table INSERT] ← [Database trigger]
    ↓ (Generate API key)
[Hashed API key stored in businesses.api_key_hash]
    ↓ (Owner views dashboard)
[GET /dashboard/install] → [Display <script> tag with API key]
    ↓ (Owner copies to their site)
[ecommerce.com adds <script> to footer]
```

### Widget Runtime Flow

```
[End User visits ecommerce.com]
    ↓
[Browser loads widget.js from CDN]
    ↓
[widget.js reads window.SimplifyOpsConfig.apiKey]
    ↓
[GET /api/widget/config?api_key=xxx]
    ↓ (Middleware: validateApiKey())
[Resolve business_id, check rate limit]
    ↓ (Database query)
[SELECT * FROM businesses WHERE api_key_hash = hash(xxx)]
    ↓ (Return config)
[{ branding, voice_id, working_hours }]
    ↓
[Widget renders Shadow DOM with branding]
    ↓ (User starts conversation)
[GET /api/widget/token?api_key=xxx]
    ↓
[ElevenLabs API: get_signed_url for business.agent_id]
    ↓
[Widget: useConversation().startSession({ signedUrl })]
    ↓ (Conversation happens)
[Client tools execute: scrollToSection, scheduleBooking, etc.]
    ↓ (Conversation ends)
[POST /api/widget/session with messages + duration]
    ↓
[INSERT conversations (business_id, session_id, ...)]
[INSERT messages (conversation_id, role, content, ...)]
[UPDATE businesses SET conversation_count = conversation_count + 1]
    ↓
[Business owner views /dashboard/conversations]
[RLS filters: WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())]
```

### Booking Flow (Multi-Tenant)

```
[End user on dentist.com asks to schedule appointment]
    ↓
[ElevenLabs agent calls scheduleBooking() client tool]
    ↓
[POST /api/bookings]
    ↓ (Widget passes api_key in request)
[Middleware: validateApiKey() → resolve business_id]
    ↓
[INSERT bookings (business_id, customer_name, booking_date, ...)]
    ↓ (RLS check on INSERT)
[Verify business_id matches authenticated business]
    ↓
[Return confirmation to widget]
    ↓
[Agent speaks: "Booking confirmed for Tuesday at 2pm"]
```

---

## Architectural Patterns

### Pattern 1: API Key Authentication Middleware

**What:** Stateless authentication for widget API requests using hashed API keys.

**When to use:** Widget requests where user auth (JWT) is not available.

**Trade-offs:**
- ✅ Simple, no session management
- ✅ Stateless, scales horizontally
- ⚠️ API key exposure risk (mitigated by HTTPS + rate limiting)
- ⚠️ No user-level permissions (business-level only)

**Example:**
```typescript
// middleware/apiKeyAuth.ts
export async function validateApiKey(apiKey: string): Promise<string | null> {
  if (!apiKey.startsWith('so_live_') && !apiKey.startsWith('so_test_')) {
    return null;
  }

  const hash = await hashApiKey(apiKey);

  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('api_key_hash', hash)
    .single();

  return data?.id ?? null;
}

// In API route
export async function GET(request: Request) {
  const apiKey = new URL(request.url).searchParams.get('api_key');
  const businessId = await validateApiKey(apiKey);

  if (!businessId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Proceed with businessId context
}
```

### Pattern 2: Supabase RLS with business_id

**What:** Database-level tenant isolation using Row-Level Security policies.

**When to use:** All multi-tenant tables where businesses should never see each other's data.

**Trade-offs:**
- ✅ Security enforced at database level (defense-in-depth)
- ✅ Automatic filtering, no application-level logic
- ✅ Prevents accidental data leaks
- ⚠️ Complex policies can impact query performance (mitigated by indexes)
- ⚠️ Must add business_id to ALL relevant tables

**Example:**
```sql
-- Add business_id column
ALTER TABLE conversations ADD COLUMN business_id UUID REFERENCES businesses(id);
CREATE INDEX conversations_business_id_idx ON conversations(business_id);

-- RLS policy for business owners
CREATE POLICY "Business owners can view their conversations"
  ON conversations FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- RLS policy for widget API (service role)
-- Applied when using supabase admin client with business_id filter
CREATE POLICY "Service can access with explicit business_id"
  ON conversations FOR ALL
  USING (true)
  WITH CHECK (business_id = current_setting('app.business_id')::UUID);
```

### Pattern 3: Shadow DOM for Widget Isolation

**What:** Encapsulate widget styles and DOM in Shadow DOM to prevent conflicts with host site.

**When to use:** Embeddable widgets that must work on any website regardless of existing CSS.

**Trade-offs:**
- ✅ Complete style isolation
- ✅ No CSS class name collisions
- ✅ Prevents host site from breaking widget
- ⚠️ Cannot use host site styles (must bundle everything)
- ⚠️ Larger bundle size (includes CSS)
- ⚠️ Accessibility considerations (screen readers need proper ARIA)

**Example:**
```typescript
// widget-loader.js
(function() {
  const config = window.SimplifyOpsConfig;

  // Create Shadow DOM container
  const container = document.createElement('div');
  container.id = 'simplifyops-widget';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Inject bundled CSS
  const style = document.createElement('style');
  style.textContent = `/* All widget styles */`;
  shadow.appendChild(style);

  // Inject widget HTML
  const widgetRoot = document.createElement('div');
  widgetRoot.innerHTML = `<div class="widget-panel">...</div>`;
  shadow.appendChild(widgetRoot);

  // Initialize widget with config
  initWidget(shadow, config);
})();
```

### Pattern 4: Per-Business ElevenLabs Agent

**What:** Each business has a dedicated ElevenLabs agent with custom voice, personality, and knowledge base.

**When to use:** Businesses need different agent behaviors and cannot share one agent.

**Trade-offs:**
- ✅ Complete customization per business
- ✅ Isolated conversation history
- ✅ Different knowledge bases per business
- ⚠️ Must create agent via ElevenLabs API on business signup
- ⚠️ Higher complexity managing multiple agents
- ⚠️ Potential cost (verify ElevenLabs pricing for multiple agents)

**Example:**
```typescript
// On business creation
async function createBusiness(ownerId: string, businessName: string) {
  // 1. Create ElevenLabs agent
  const agentResponse = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    body: JSON.stringify({
      name: `${businessName} Assistant`,
      voice_id: 'default_voice',
      system_prompt: 'You are a helpful assistant.'
    })
  });
  const { agent_id } = await agentResponse.json();

  // 2. Create business record
  const { data } = await supabase
    .from('businesses')
    .insert({
      owner_id: ownerId,
      name: businessName,
      agent_id: agent_id,
      api_key_hash: await hashApiKey(generateApiKey())
    })
    .select()
    .single();

  return data;
}
```

### Pattern 5: Optimistic UI with Shadow DOM Configuration

**What:** Widget fetches configuration asynchronously but renders immediately with defaults, then updates when config loads.

**When to use:** Widget must appear instantly without blocking on API calls.

**Trade-offs:**
- ✅ Fast perceived load time
- ✅ Widget appears immediately
- ⚠️ Brief flash as branding updates
- ⚠️ Complexity handling state transitions

**Example:**
```typescript
// widget.js
async function initWidget() {
  // Render immediately with defaults
  renderWidget({
    color: '#256AF4',  // Default primary color
    position: 'bottom-right',
    loading: true
  });

  // Fetch config in background
  const config = await fetch(`/api/widget/config?api_key=${apiKey}`).then(r => r.json());

  // Update with business branding
  updateWidgetBranding(config.branding);
}
```

---

## Database Schema Changes

### New Tables

#### `businesses` table

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,

  -- Authentication
  api_key_hash TEXT UNIQUE NOT NULL,  -- Hashed API key

  -- ElevenLabs Integration
  agent_id TEXT NOT NULL,  -- ElevenLabs agent ID (unique per business)
  voice_id TEXT DEFAULT 'sarah',
  system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',

  -- Widget Configuration
  branding JSONB DEFAULT '{
    "color": "#256AF4",
    "logo": null,
    "position": "bottom-right"
  }'::jsonb,
  working_hours JSONB DEFAULT '{
    "enabled": false,
    "timezone": "UTC",
    "schedule": {}
  }'::jsonb,

  -- Billing
  plan_tier TEXT DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  conversation_count INTEGER DEFAULT 0,
  conversation_limit INTEGER DEFAULT 25,  -- Free tier limit
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX businesses_owner_id_idx ON businesses(owner_id);
CREATE INDEX businesses_api_key_hash_idx ON businesses(api_key_hash);

-- RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their businesses"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can update their businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
```

### Modified Tables (Add business_id)

**Pattern applied to:** `conversations`, `knowledge_base`, `bookings`, `available_slots`

```sql
-- Example: conversations
ALTER TABLE conversations ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
CREATE INDEX conversations_business_id_idx ON conversations(business_id);

-- Update RLS policy
DROP POLICY "Users can view their own conversations" ON conversations;

CREATE POLICY "Business owners can view their conversations"
  ON conversations FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert their conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );
```

**Migration strategy:**
1. Add `business_id` column (nullable initially)
2. Backfill existing data: Create default business per user, update rows
3. Make `business_id` NOT NULL
4. Update RLS policies
5. Deploy application code changes

---

## Project Structure (New Components)

```
next-app/src/
├── app/
│   ├── api/
│   │   ├── widget/                 # NEW: Widget API endpoints
│   │   │   ├── config/route.ts     # Get business configuration
│   │   │   ├── token/route.ts      # Get ElevenLabs signed URL
│   │   │   └── session/route.ts    # Log conversation session
│   │   ├── businesses/             # NEW: Business management
│   │   │   ├── me/route.ts         # Get/update current business
│   │   │   ├── usage/route.ts      # Get usage stats
│   │   │   └── api-key/route.ts    # Regenerate API key
│   │   ├── voice/
│   │   │   └── token/route.ts      # MODIFIED: Accept api_key param
│   │   ├── conversations/
│   │   │   └── route.ts            # MODIFIED: Filter by business_id
│   │   ├── bookings/
│   │   │   └── route.ts            # MODIFIED: Filter by business_id
│   │   └── knowledge/
│   │       └── route.ts            # MODIFIED: Filter by business_id
│   ├── dashboard/
│   │   ├── install/                # NEW: Installation instructions
│   │   │   └── page.tsx            # Display <script> tag
│   │   ├── billing/                # NEW: Stripe billing
│   │   │   └── page.tsx            # Subscription management
│   │   └── settings/
│   │       └── page.tsx            # MODIFIED: Business config
├── components/
│   └── voice/
│       └── VoiceWidget.tsx         # EXISTING: No changes needed
├── lib/
│   ├── middleware/                 # NEW: Shared middleware
│   │   ├── apiKeyAuth.ts           # API key validation
│   │   └── rateLimiter.ts          # Rate limiting
│   ├── services/                   # NEW: Business services
│   │   ├── businessService.ts      # Business CRUD operations
│   │   ├── elevenLabsService.ts    # Agent creation/management
│   │   └── usageService.ts         # Conversation counting
│   └── supabase/
│       ├── client.ts               # EXISTING: Client-side
│       ├── server.ts               # EXISTING: Server-side
│       └── admin.ts                # EXISTING: Admin client
├── widget/                         # NEW: Embeddable widget source
│   ├── src/
│   │   ├── index.ts                # Entry point
│   │   ├── loader.ts               # Script loader
│   │   ├── shadowDOM.ts            # Shadow DOM setup
│   │   └── voice.ts                # Voice conversation logic
│   ├── styles/
│   │   └── widget.css              # Bundled CSS
│   ├── build.ts                    # Build script (esbuild)
│   └── package.json                # Widget dependencies
└── middleware.ts                   # MODIFIED: Add API key routes

public/
└── widget/                         # NEW: Built widget assets
    ├── widget.js                   # Bundled widget (<50KB)
    └── widget.css                  # Bundled styles
```

**Build process:**
```json
// package.json
{
  "scripts": {
    "build:widget": "node widget/build.ts",
    "build": "npm run build:widget && next build"
  }
}
```

**Widget build (esbuild):**
```typescript
// widget/build.ts
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['widget/src/index.ts'],
  bundle: true,
  minify: true,
  target: 'es2020',
  format: 'iife',
  outfile: 'public/widget/widget.js',
  external: [],  // Bundle everything
  define: {
    'process.env.API_URL': JSON.stringify(process.env.NEXT_PUBLIC_API_URL)
  }
});
```

---

## Security Boundaries

### 1. API Key Authentication

**Boundary:** Widget API routes vs. Dashboard routes

**Implementation:**
- Widget routes (`/api/widget/*`): Authenticate via `api_key` query param
- Dashboard routes (`/api/businesses/*`): Authenticate via Supabase Auth session
- Never mix authentication methods in same route

**Validation:**
```typescript
// Widget request
if (!apiKey) return error(401);
const businessId = await validateApiKey(apiKey);

// Dashboard request
const session = await getServerSession();
if (!session) return redirect('/login');
```

### 2. Rate Limiting

**Boundary:** Per-business request limits

**Implementation:**
- Redis-based rate limiter (Upstash on Vercel)
- Limit: 100 requests/minute per business
- Key: `ratelimit:${businessId}`

**Example:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

async function checkRateLimit(businessId: string) {
  const { success } = await ratelimit.limit(businessId);
  if (!success) {
    throw new Error('Rate limit exceeded');
  }
}
```

### 3. RLS Policy Enforcement

**Boundary:** Database query access

**Implementation:**
- ALL multi-tenant tables have RLS enabled
- Policies check `business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())`
- Widget API uses admin client with explicit business_id filter

**Pattern:**
```typescript
// Dashboard query (user authenticated)
const { data } = await supabase
  .from('conversations')
  .select('*');  // RLS automatically filters by business ownership

// Widget API query (service role)
const { data } = await supabaseAdmin
  .from('conversations')
  .select('*')
  .eq('business_id', businessId);  // Explicit filter required
```

### 4. CORS and Origin Validation

**Boundary:** Widget embed security

**Implementation:**
- CORS headers allow all origins for `/api/widget/*`
- Optional: Business can configure allowed domains in `businesses.allowed_domains`
- ElevenLabs agent has domain allowlist (up to 10 domains per agent)

**Example:**
```typescript
export async function GET(request: Request) {
  const origin = request.headers.get('origin');
  const businessId = await validateApiKey(apiKey);

  // Optional: Check if origin is allowed
  const business = await getBusiness(businessId);
  if (business.allowed_domains?.length > 0) {
    if (!business.allowed_domains.includes(origin)) {
      return error(403, 'Domain not allowed');
    }
  }

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST',
    }
  });
}
```

### 5. PII Redaction

**Boundary:** Conversation transcript storage

**Implementation:**
- Regex-based redaction before storing messages
- Redact: SSNs, credit cards, emails, phone numbers
- Store redacted version, never log originals

**Example:**
```typescript
function redactPII(text: string): string {
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN REDACTED]')
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[CARD REDACTED]')
    .replace(/\b[\w.-]+@[\w.-]+\.\w{2,}\b/g, '[EMAIL REDACTED]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REDACTED]');
}
```

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 businesses** | Single Supabase project, no special optimizations needed. Monitor RLS query performance with EXPLAIN ANALYZE. |
| **100-1K businesses** | Add Redis caching for business configs (30s TTL). Consider Vercel Edge Functions for widget.js delivery. Monitor Supabase connection pool. |
| **1K-10K businesses** | Implement CDN caching (Cloudflare) for `/api/widget/config`. Consider Supabase read replicas for analytics queries. Separate n8n instance for RAG workflows. |
| **10K+ businesses** | Shard by business_id (schema-per-tenant or database-per-tenant). Consider managed ElevenLabs enterprise plan. Implement queue system (BullMQ) for async workflows. |

### Scaling Priorities

**1. First bottleneck: Widget config API latency**

**What breaks:** 1K+ businesses making config requests → Supabase connection exhaustion

**How to fix:**
- Add Redis cache: `GET /api/widget/config` → check Redis → fallback to Supabase
- Cache TTL: 30 seconds (config changes rare)
- Invalidate on business update

**2. Second bottleneck: ElevenLabs signed URL rate limits**

**What breaks:** High concurrent conversation starts → ElevenLabs API rate limit (unknown, likely 100-1000 req/s)

**How to fix:**
- Implement signed URL caching (safe for 14 minutes, expires in 15)
- Queue system for burst handling
- Enterprise plan with higher limits

**3. Third bottleneck: Supabase RLS query performance**

**What breaks:** Complex RLS policies with JOINs → slow queries (>100ms)

**How to fix:**
- Add composite indexes on (business_id, created_at)
- Denormalize frequently accessed data (e.g., business name in conversations)
- Use materialized views for analytics dashboards

---

## Anti-Patterns

### Anti-Pattern 1: Client-Side API Key Exposure

**What people do:** Include API key in widget JavaScript bundle

**Why it's wrong:** API keys visible in browser DevTools, can be stolen and abused

**Do this instead:**
```typescript
// ❌ BAD
const API_KEY = 'so_live_abc123';  // Hardcoded in bundled JS

// ✅ GOOD
const API_KEY = window.SimplifyOpsConfig.apiKey;  // Host site provides
// Add rate limiting per API key to limit abuse
```

### Anti-Pattern 2: Shared ElevenLabs Agent Across Businesses

**What people do:** Use single agent_id for all businesses, differentiate by system prompt injection

**Why it's wrong:**
- Conversation history mixed across businesses
- Knowledge base not isolated
- Cannot customize per-business voice

**Do this instead:**
Create dedicated ElevenLabs agent per business on signup:
```typescript
// ✅ GOOD
const agent = await createElevenLabsAgent({
  name: `${businessName} Assistant`,
  voice_id: business.voice_id,
  system_prompt: business.system_prompt
});

await supabase
  .from('businesses')
  .update({ agent_id: agent.id })
  .eq('id', businessId);
```

### Anti-Pattern 3: Application-Level Tenant Filtering

**What people do:** Filter by business_id in application code, trust RLS as backup

**Why it's wrong:**
- One forgotten `.eq('business_id', ...)` = data leak
- No defense-in-depth
- Difficult to audit

**Do this instead:**
```typescript
// ✅ GOOD: RLS policies are PRIMARY security mechanism
-- Database enforces isolation
CREATE POLICY "Enforce business_id filter"
  ON conversations FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

// Application code as secondary check
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('business_id', businessId);  // Explicit for clarity, RLS already enforces
```

### Anti-Pattern 4: Synchronous ElevenLabs Agent Creation

**What people do:** Create agent in signup API route, block until complete

**Why it's wrong:**
- Slow signup flow (ElevenLabs API can take 2-5 seconds)
- Timeout risk
- Poor UX

**Do this instead:**
```typescript
// ✅ GOOD: Async agent creation
async function handleSignup(email, password) {
  // 1. Create user immediately
  const user = await createUser(email, password);

  // 2. Create business with placeholder agent_id
  const business = await createBusiness(user.id, { agent_id: 'pending' });

  // 3. Queue agent creation job
  await queueJob('create-elevenlabs-agent', { businessId: business.id });

  // 4. Return success immediately
  return { userId: user.id, businessId: business.id };
}

// Background job
async function createAgentJob(businessId) {
  const agent = await createElevenLabsAgent(...);
  await updateBusiness(businessId, { agent_id: agent.id });
}
```

### Anti-Pattern 5: No Widget Version Management

**What people do:** Single `widget.js` file, updated in place

**Why it's wrong:**
- Breaking changes affect all deployed widgets immediately
- No rollback capability
- Cannot test new versions incrementally

**Do this instead:**
```typescript
// ✅ GOOD: Versioned widget URLs
https://cdn.simplifyops.tech/widget/v1.0.0/widget.js  // Immutable
https://cdn.simplifyops.tech/widget/v1.1.0/widget.js  // New version
https://cdn.simplifyops.tech/widget/latest/widget.js  // Points to stable

// Business can opt into version
<script src="https://cdn.simplifyops.tech/widget/v1.0.0/widget.js"></script>

// Or auto-update (risky)
<script src="https://cdn.simplifyops.tech/widget/latest/widget.js"></script>
```

---

## Build Order (Dependency-Ordered)

### Phase 1: Foundation (Week 1)

**Goal:** Multi-tenancy database schema + RLS

**Tasks:**
1. Create `businesses` table migration
2. Add `business_id` to existing tables (conversations, knowledge_base, bookings, available_slots)
3. Update RLS policies for all tables
4. Create database indexes for performance
5. Test data isolation (business A cannot query business B)

**Deliverables:**
- Migration files in `supabase/migrations/`
- RLS policies validated
- Test suite for tenant isolation

**Dependencies:** None (foundation for everything)

### Phase 2: API Key Authentication (Week 1)

**Goal:** Secure widget authentication mechanism

**Tasks:**
1. Implement API key generation (`generateApiKey()`, hash storage)
2. Create middleware: `validateApiKey(apiKey) → businessId`
3. Add rate limiter (Upstash Redis)
4. Create `/api/businesses/me` route (create/read business)
5. Dashboard: Display API key in UI

**Deliverables:**
- `lib/middleware/apiKeyAuth.ts`
- `lib/middleware/rateLimiter.ts`
- `/api/businesses/me/route.ts`

**Dependencies:** Phase 1 (needs businesses table)

### Phase 3: Widget Distribution (Week 2)

**Goal:** Embeddable widget working on external sites

**Tasks:**
1. Create widget source in `widget/src/`
2. Build pipeline (esbuild) → `public/widget/widget.js`
3. Implement Shadow DOM container
4. Create `/api/widget/config` route (fetch branding, working hours)
5. Test widget on test domain

**Deliverables:**
- `widget/src/index.ts` (widget entry point)
- `public/widget/widget.js` (<50KB bundle)
- Working demo on test domain

**Dependencies:** Phase 2 (needs API key auth)

### Phase 4: ElevenLabs Multi-Tenant Integration (Week 2)

**Goal:** Per-business voice agents

**Tasks:**
1. Implement `createElevenLabsAgent()` service
2. Create `/api/widget/token` route (per-business signed URLs)
3. Update business creation flow to create ElevenLabs agent
4. Modify VoiceWidget to use new token endpoint
5. Test multi-tenant conversations

**Deliverables:**
- `lib/services/elevenLabsService.ts`
- `/api/widget/token/route.ts`
- Updated business creation flow

**Dependencies:** Phase 2 (needs business_id), Phase 3 (widget needs token endpoint)

### Phase 5: Configuration Dashboard (Week 3)

**Goal:** Business owners can customize widget

**Tasks:**
1. Create `/dashboard/settings` UI (voice selection, personality, branding)
2. Implement `/api/businesses/me` PATCH route (update config)
3. Create `/dashboard/install` page (display <script> tag)
4. Voice preview component (test voices before saving)
5. Working hours configuration UI

**Deliverables:**
- `/app/dashboard/settings/page.tsx`
- `/app/dashboard/install/page.tsx`
- Configuration update API

**Dependencies:** Phase 2 (needs business management API)

### Phase 6: Usage Tracking (Week 3)

**Goal:** Count conversations per business, enforce limits

**Tasks:**
1. Modify `/api/widget/session` to increment `conversation_count`
2. Create `/api/businesses/usage` route (get current usage)
3. Implement hard limit check (block at 2x plan limit)
4. Dashboard: Display usage stats
5. Email alerts at 80%, 100% of limit

**Deliverables:**
- `lib/services/usageService.ts`
- `/api/businesses/usage/route.ts`
- Usage display in dashboard

**Dependencies:** Phase 4 (needs conversation logging)

### Phase 7: Stripe Billing (Week 4)

**Goal:** Subscription management + overage billing

**Tasks:**
1. Create Stripe products (Starter/Pro/Business)
2. Implement checkout flow (`/api/billing/checkout`)
3. Webhook handler (`/api/webhooks/stripe`)
4. Update `businesses` table on subscription events
5. Calculate overage charges

**Deliverables:**
- `/api/billing/*` routes
- Stripe webhook handler
- `/dashboard/billing/page.tsx`

**Dependencies:** Phase 6 (needs usage tracking for overage calculation)

### Phase 8: Monitoring & Optimization (Week 4)

**Goal:** Production-ready monitoring

**Tasks:**
1. Sentry integration for error tracking
2. Latency monitoring (P50/P95/P99)
3. Cost tracking per conversation
4. Circuit breaker for runaway costs
5. Performance optimization (caching, indexes)

**Deliverables:**
- Sentry error tracking
- Monitoring dashboard
- Cost alerts

**Dependencies:** All previous phases (monitors entire system)

---

## Sources

**Multi-Tenant Architecture:**
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Supabase Row Level Security: Complete Guide (2026)](https://designrevision.com/blog/supabase-row-level-security)
- [Supabase RLS Best Practices: Production Patterns for Secure Multi-Tenant Apps](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Supabase Multi Tenancy - Simple and Fast](https://roughlywritten.substack.com/p/supabase-multi-tenancy-simple-and)

**Widget Architecture:**
- [Embeddable Web Applications with Shadow DOM](https://www.viget.com/articles/embedable-web-applications-with-shadow-dom)
- [Building Embeddable React Widgets: Production-Ready Guide](https://makerkit.dev/blog/tutorials/embeddable-widgets-react)
- [The Hidden Technique That Made Our Web Widgets Bulletproof](https://medium.com/@rijulrajtkeey2/the-hidden-technique-that-made-our-web-widgets-bulletproof-f42baec76afd)

**Authentication:**
- [Secure Next.js Auth: 2026 Patterns & Best Practices](https://createbytes.com/insights/nextjs-authentication-authorization-patterns)
- [Next.js JWT Authentication: Complete Guide to Secure Your App in 2026](https://dev.to/sizan_mahmud0_e7c3fd0cb68/nextjs-jwt-authentication-complete-guide-to-secure-your-app-in-2026-15jc)
- [Building authentication in Next.js App Router: The complete guide for 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026)

**ElevenLabs Integration:**
- [Agent authentication | ElevenLabs Documentation](https://elevenlabs.io/docs/conversational-ai/customization/authentication)
- [Get signed URL | ElevenLabs Documentation](https://elevenlabs.io/docs/conversational-ai/api-reference/conversations/get-signed-url)
- [React SDK | ElevenLabs Documentation](https://elevenlabs.io/docs/conversational-ai/libraries/react)

**B2B2C SaaS Patterns:**
- [The developer's guide to SaaS multi-tenant architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
- [SaaS Multi-Tenancy 2026: Architectures, Patterns & Testing](https://www.qabash.com/saas-multi-tenancy-architecture-testing-2026/)
- [Multi-Tenant SaaS Architecture: Complete Guide, Models, Design Patterns](https://codeboxr.com/multi-tenant-saas-architecture-complete-guide-models-design-patterns-and-scaling-strategy/)

---

## Summary: Integration Architecture

**Key Integration Strategy:** Additive, not destructive.

**What stays the same:**
- VoiceWidget component (no changes)
- ElevenLabs conversation flow (extends with per-business agents)
- n8n workflows (adds business_id parameter)
- Existing API routes (add business_id filtering)

**What's new:**
- `businesses` table + RLS policies
- Widget API routes (`/api/widget/*`)
- Widget distribution system (Shadow DOM + CDN)
- Business management dashboard
- API key authentication middleware

**Critical paths:**
1. **Widget embed** → Config API → Shadow DOM render → Voice session → Conversation logging
2. **Business owner** → Settings dashboard → Update config → Widget reflects changes (30s cache)
3. **Billing** → Stripe webhook → Update business plan → Enforce conversation limits

**Data flows isolated by:**
- RLS policies (database-level)
- API key validation (API-level)
- Rate limiting (request-level)

**Build order follows dependencies:**
Foundation (DB schema) → Auth (API keys) → Distribution (widget) → Integration (ElevenLabs) → Management (dashboard) → Monetization (billing) → Monitoring

---

*Architecture research for: SimplifyOps B2B2C Voice AI Platform*
*Researched: 2026-03-05*
*Next step: Use this architecture to inform requirements breakdown and phase planning*
