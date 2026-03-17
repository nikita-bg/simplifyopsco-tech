# Custom Widget + Widget Backend — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom AI Sales Agent widget (embed.js + iframe + bridge) with a Node.js backend on Railway that supports Chat, Hybrid, and Full Voice modes.

**Architecture:** Three-layer system: (1) embed.js injects a bridge script + iframe onto customer sites, (2) widget iframe (React app on Vercel) handles UI, (3) Node.js backend on Railway handles AI (Gemini chat, OpenAI voice/TTS), session auth, and conversation tracking — all connected to the existing Supabase PostgreSQL database.

**Tech Stack:** Node.js/Express (Railway), React/Vite (widget iframe), Vanilla JS (embed.js), Supabase PostgreSQL, Gemini 2.5 Flash, OpenAI Realtime API (WebRTC), OpenAI TTS API, SSE streaming.

**Spec:** `docs/superpowers/specs/2026-03-15-custom-widget-backend-design.md`

---

## File Structure

### New: `widget-backend/` (Node.js server on Railway)

```
widget-backend/
├── package.json
├── tsconfig.json
├── .env.example
├── Dockerfile
├── src/
│   ├── index.ts                    # Express app + server startup
│   ├── config.ts                   # Environment variables loader
│   ├── routes/
│   │   ├── health.ts               # GET /api/health
│   │   ├── config.ts               # GET /api/config/:agentId
│   │   ├── session.ts              # POST /api/session
│   │   ├── chat.ts                 # POST /api/chat (SSE)
│   │   ├── hybrid.ts               # POST /api/chat/hybrid (SSE + audio)
│   │   ├── voice.ts                # POST /api/voice/token
│   │   └── context.ts              # POST /api/context
│   ├── middleware/
│   │   ├── cors.ts                 # CORS per-route config
│   │   ├── sessionAuth.ts          # Session token validation
│   │   └── rateLimiter.ts          # Per-session rate limiting
│   ├── services/
│   │   ├── db.ts                   # Supabase client for Railway
│   │   ├── sessionStore.ts         # In-memory session token store
│   │   ├── gemini.ts               # Gemini 2.5 Flash streaming client
│   │   ├── openaiTts.ts            # OpenAI TTS streaming
│   │   ├── openaiRealtime.ts       # OpenAI Realtime ephemeral key
│   │   ├── conversation.ts         # Conversation tracking + limits
│   │   ├── contextParser.ts        # Page context processing
│   │   └── promptBuilder.ts        # System prompt assembly
│   └── types/
│       └── index.ts                # Shared TypeScript types
├── tests/
│   ├── routes/
│   │   ├── health.test.ts
│   │   ├── config.test.ts
│   │   ├── session.test.ts
│   │   └── chat.test.ts
│   ├── services/
│   │   ├── sessionStore.test.ts
│   │   ├── conversation.test.ts
│   │   ├── contextParser.test.ts
│   │   └── promptBuilder.test.ts
│   └── helpers/
│       └── testApp.ts              # Express test helper
```

### New: `widget/` (React iframe app on Vercel)

```
widget/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root component + mode routing
│   ├── components/
│   │   ├── ChatView.tsx            # Chat mode UI
│   │   ├── HybridView.tsx          # Hybrid mode UI (text + audio playback)
│   │   ├── VoiceView.tsx           # Full voice mode UI
│   │   ├── MessageBubble.tsx       # Single message display
│   │   ├── ModeToggle.tsx          # Chat/Hybrid/Voice switcher
│   │   ├── ProductCard.tsx         # Product overlay card
│   │   ├── ComparisonView.tsx      # Side-by-side product comparison
│   │   ├── WaveformVisualizer.tsx  # Voice waveform animation
│   │   └── WidgetHeader.tsx        # Header with logo + close button
│   ├── hooks/
│   │   ├── useSession.ts           # Session token management
│   │   ├── useChat.ts              # Chat SSE streaming hook
│   │   ├── useHybrid.ts            # Hybrid SSE + audio hook
│   │   ├── useVoice.ts             # WebRTC voice hook
│   │   └── useBridge.ts            # postMessage bridge communication
│   ├── lib/
│   │   ├── api.ts                  # Backend API client
│   │   ├── sse.ts                  # SSE stream parser
│   │   └── types.ts                # Widget types
│   └── styles/
│       └── widget.css              # Widget styles (scoped)
```

### New: `embed/` (embed.js + bridge, compiled to single file)

```
embed/
├── package.json
├── rollup.config.js
├── src/
│   ├── embed.ts                    # Main embed script
│   └── bridge.ts                   # Bridge script (DOM control)
├── tests/
│   ├── bridge.test.ts
│   └── embed.test.ts
```

### Modified: `next-app/supabase/migrations/`

```
007_widget_tables.sql               # New: site_data + agent_prompts tables
008_widget_agent_ids.sql            # New: businesses table changes (default_mode, welcome_message, etc.)
```

### Modified: `next-app/src/lib/types/database.ts`

Add TypeScript types for new tables (`site_data`, `agent_prompts`) and new `businesses` columns.

---

## Chunk 1: Foundation — Railway Backend Setup + Database

### Простичко казано
Създаваме нов Node.js проект за widget сървъра и добавяме нови таблици в базата данни. Това е фундаментът — без него нищо друго не работи.

---

### Task 1: Initialize Railway Backend Project

**Files:**
- Create: `widget-backend/package.json`
- Create: `widget-backend/tsconfig.json`
- Create: `widget-backend/.env.example`
- Create: `widget-backend/Dockerfile`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p widget-backend
cd widget-backend
```

```json
{
  "name": "simplifyops-widget-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.98.0",
    "@google/genai": "^1.0.0",
    "openai": "^4.80.0",
    "nanoid": "^5.1.6",
    "helmet": "^8.1.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/cors": "^2.8.17",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^3.1.0",
    "supertest": "^7.1.0",
    "@types/supertest": "^6.0.2"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create .env.example**

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase (same instance as dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# OpenAI (TTS + Realtime API)
OPENAI_API_KEY=your-openai-api-key

# Widget iframe origin (for CORS)
WIDGET_ORIGIN=https://widget.simplifyops.co
```

- [ ] **Step 4: Create Dockerfile for Railway**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

- [ ] **Step 5: Install dependencies**

Run: `cd widget-backend && npm install`

- [ ] **Step 6: Commit**

```bash
git add widget-backend/package.json widget-backend/tsconfig.json widget-backend/.env.example widget-backend/Dockerfile
git commit -m "feat: initialize widget-backend Node.js project for Railway"
```

---

### Task 2: Express Server + Health Endpoint

**Files:**
- Create: `widget-backend/src/config.ts`
- Create: `widget-backend/src/index.ts`
- Create: `widget-backend/src/routes/health.ts`
- Create: `widget-backend/src/types/index.ts`
- Test: `widget-backend/tests/routes/health.test.ts`
- Test: `widget-backend/tests/helpers/testApp.ts`

- [ ] **Step 1: Write the test for health endpoint**

`tests/helpers/testApp.ts`:
```typescript
import { createApp } from '../../src/index.js';

export function getTestApp() {
  return createApp();
}
```

`tests/routes/health.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';

describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const app = getTestApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptime');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `cd widget-backend && npx vitest run tests/routes/health.test.ts`
Expected: FAIL (modules don't exist yet)

- [ ] **Step 3: Implement config, types, health route, and Express app**

`src/types/index.ts`:
```typescript
export interface SessionData {
  agentId: string;
  businessId: string;
  visitorIp: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
  conversationId: string | null;
}

export interface AgentConfig {
  agentId: string;
  businessName: string;
  defaultMode: 'chat' | 'hybrid' | 'voice';
  welcomeMessage: string;
  branding: {
    color: string;
    logo: string | null;
    position: string;
  };
  allowedDomains: string[];
}

export interface PageContext {
  url: string;
  title: string;
  products: ProductInfo[];
  sections: SectionInfo[];
}

export interface ProductInfo {
  name: string;
  price: string | null;
  imageUrl: string | null;
  elementRef: string;
  position: 'above-fold' | 'below-fold';
}

export interface SectionInfo {
  name: string;
  elementRef: string;
  type: 'header' | 'section' | 'article' | 'nav' | 'footer';
}

export interface SiteControlAction {
  type: 'scrollToElement' | 'highlightElement' | 'navigateTo' | 'showProductCard' | 'openContactForm' | 'showComparison';
  ref?: string;
  url?: string;
  data?: Record<string, unknown>;
}
```

`src/config.ts`:
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  widgetOrigin: process.env.WIDGET_ORIGIN || 'http://localhost:5173',
};
```

`src/routes/health.ts`:
```typescript
import { Router } from 'express';

const router = Router();

const startTime = Date.now();

router.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

export default router;
```

`src/index.ts`:
```typescript
import express from 'express';
import helmet from 'helmet';
import healthRouter from './routes/health.js';
import { config } from './config.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(healthRouter);
  return app;
}

// Only start server if this file is run directly (not imported in tests)
const isMainModule = import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`;
if (isMainModule) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Widget backend running on port ${config.port}`);
  });
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `cd widget-backend && npx vitest run tests/routes/health.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add widget-backend/src/ widget-backend/tests/
git commit -m "feat: add Express server with health endpoint"
```

---

### Task 3: Supabase Client for Railway

**Files:**
- Create: `widget-backend/src/services/db.ts`

- [ ] **Step 1: Create Supabase client**

`src/services/db.ts`:
```typescript
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Service role client — bypasses RLS (server-side only)
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
```

- [ ] **Step 2: Commit**

```bash
git add widget-backend/src/services/db.ts
git commit -m "feat: add Supabase service-role client for Railway backend"
```

---

### Task 4: Database Migrations — New Tables

**Files:**
- Create: `next-app/supabase/migrations/007_widget_tables.sql`
- Create: `next-app/supabase/migrations/008_widget_agent_ids.sql`
- Modify: `next-app/src/lib/types/database.ts`

- [ ] **Step 1: Create site_data and agent_prompts tables**

`next-app/supabase/migrations/007_widget_tables.sql`:
```sql
-- ============================================
-- Widget Tables: site_data + agent_prompts
-- ============================================
-- Part of Sub-project #1: Custom Widget + Widget Backend

-- 1. site_data — stores page context (products, sections) per URL
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

CREATE POLICY "Service role full access to site_data"
  ON site_data FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER site_data_updated_at
  BEFORE UPDATE ON site_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. agent_prompts — system prompt templates + customer customizations
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

-- Base templates have business_id = NULL, customer prompts have business_id set
CREATE INDEX idx_agent_prompts_business ON agent_prompts(business_id);
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view base templates and own prompts"
  ON agent_prompts FOR SELECT
  USING (
    business_id IS NULL
    OR business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Businesses can manage own prompts"
  ON agent_prompts FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Service role full access to agent_prompts"
  ON agent_prompts FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER agent_prompts_updated_at
  BEFORE UPDATE ON agent_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Insert base prompt templates
INSERT INTO agent_prompts (business_id, name, template_type, system_prompt, is_base_template) VALUES
(NULL, 'Sales Assistant', 'sales',
'You are a friendly and knowledgeable AI sales assistant. Your goal is to help visitors find the right product or service. Be conversational, ask clarifying questions, and use the site control tools to show relevant products. Never be pushy — guide, don''t pressure.',
true),

(NULL, 'Customer Support', 'support',
'You are a helpful customer support agent. Answer questions clearly and concisely. If you can find relevant information on the page, use site control tools to show it. If you cannot help, suggest the visitor contacts the business directly.',
true),

(NULL, 'Booking Assistant', 'booking',
'You are a booking assistant. Help visitors schedule appointments or consultations. Ask for their preferred date, time, and any relevant details. Be efficient and confirm all details before finalizing.',
true);
```

- [ ] **Step 2: Create businesses table changes migration**

`next-app/supabase/migrations/008_widget_agent_ids.sql`:
```sql
-- ============================================
-- Widget: Update businesses table for custom widget
-- ============================================
-- Adds: default_mode, welcome_message, allowed_domains (TEXT[])
-- Updates: agent_id values from ElevenLabs format to new agent_<nanoid> format

-- 0. Make conversations.user_id nullable (widget visitors are anonymous)
ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;

-- 1. Add service_role RLS policies for tables Railway backend writes to
CREATE POLICY "Service role full access to conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Add new columns
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS default_mode TEXT NOT NULL DEFAULT 'chat'
    CHECK (default_mode IN ('chat', 'hybrid', 'voice')),
  ADD COLUMN IF NOT EXISTS welcome_message TEXT DEFAULT 'Hi! How can I help you today?';

-- Note: allowed_domains already exists as JSONB in 004_multi_tenancy.sql
-- We keep it as JSONB for backward compatibility

-- 3. Clear old ElevenLabs agent_ids (they are no longer valid)
UPDATE businesses SET agent_id = NULL WHERE agent_id IS NOT NULL;

-- 4. Generate new agent_ids for all existing businesses
-- Format: agent_ + 21 random chars (nanoid-style)
-- Using PostgreSQL's gen_random_uuid() and encoding for URL-safe random strings
UPDATE businesses
SET agent_id = 'agent_' || replace(replace(
  encode(gen_random_bytes(16), 'base64'),
  '+', '-'), '/', '_')
WHERE agent_id IS NULL;

-- 5. Make agent_id NOT NULL and UNIQUE going forward
ALTER TABLE businesses
  ALTER COLUMN agent_id SET NOT NULL;

-- Add unique index for fast lookups by agent_id
CREATE UNIQUE INDEX IF NOT EXISTS businesses_agent_id_idx ON businesses(agent_id);
```

- [ ] **Step 3: Update TypeScript database types**

Add these types to `next-app/src/lib/types/database.ts` inside the `Tables` object, after `available_slots`:

```typescript
// Add to Database.public.Tables:
businesses: {
  Row: {
    id: string
    owner_id: string
    name: string
    api_key_hash: string
    api_key_prefix: string
    agent_id: string
    voice_id: string | null
    system_prompt: string | null
    branding: Record<string, any> | null
    working_hours: Record<string, any> | null
    allowed_domains: Record<string, any> | null
    plan_tier: 'free' | 'starter' | 'pro' | 'business' | 'enterprise'
    conversation_count: number
    conversation_limit: number
    billing_period_start: string | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    is_active: boolean
    status: 'active' | 'suspended' | 'cancelled'
    default_mode: 'chat' | 'hybrid' | 'voice'
    welcome_message: string
    metadata: Json
    created_at: string
    updated_at: string
  }
  Insert: { /* owner_id and name required, rest optional with defaults */ }
  Update: { /* all optional */ }
}
site_data: {
  Row: {
    id: string
    business_id: string
    url: string
    page_title: string | null
    products: Json
    sections: Json
    raw_context: Json | null
    source: 'runtime' | 'crawl'
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    business_id: string
    url: string
    page_title?: string | null
    products?: Json
    sections?: Json
    raw_context?: Json | null
    source: 'runtime' | 'crawl'
    created_at?: string
    updated_at?: string
  }
  Update: {
    page_title?: string | null
    products?: Json
    sections?: Json
    raw_context?: Json | null
    updated_at?: string
  }
}
agent_prompts: {
  Row: {
    id: string
    business_id: string | null
    name: string
    template_type: 'sales' | 'support' | 'booking' | 'custom'
    system_prompt: string
    is_base_template: boolean
    version: number
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    business_id?: string | null
    name: string
    template_type: 'sales' | 'support' | 'booking' | 'custom'
    system_prompt: string
    is_base_template?: boolean
    version?: number
    is_active?: boolean
  }
  Update: {
    name?: string
    system_prompt?: string
    is_active?: boolean
    version?: number
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add next-app/supabase/migrations/007_widget_tables.sql next-app/supabase/migrations/008_widget_agent_ids.sql next-app/src/lib/types/database.ts
git commit -m "feat: add widget database tables (site_data, agent_prompts) and update businesses"
```

---

## Chunk 2: Core Backend — Session Auth + Config + Chat

### Простичко казано
Правим системата за "пропуски" (session tokens) за посетители, endpoint-а който дава настройките на агента, и основния chat режим с Gemini AI.

---

### Task 5: Session Token Store

**Files:**
- Create: `widget-backend/src/services/sessionStore.ts`
- Test: `widget-backend/tests/services/sessionStore.test.ts`

- [ ] **Step 1: Write tests for session store**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '../../src/services/sessionStore.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  it('creates a session and returns a 24-char token', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    expect(token).toHaveLength(24);
  });

  it('retrieves a valid session', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.get(token);
    expect(session).not.toBeNull();
    expect(session!.agentId).toBe('agent_abc123');
  });

  it('returns null for invalid token', () => {
    expect(store.get('invalid-token')).toBeNull();
  });

  it('refreshes TTL on access', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const s1 = store.get(token);
    // lastActivity should be updated
    expect(s1!.lastActivity).toBeGreaterThanOrEqual(s1!.createdAt);
  });

  it('validates visitor identity (IP + UA)', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.validate(token, '1.2.3.4', 'Mozilla/5.0');
    expect(session).not.toBeNull();
  });

  it('rejects mismatched IP', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.validate(token, '5.6.7.8', 'Mozilla/5.0');
    expect(session).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

Run: `cd widget-backend && npx vitest run tests/services/sessionStore.test.ts`

- [ ] **Step 3: Implement SessionStore**

`src/services/sessionStore.ts`:
```typescript
import { randomBytes } from 'node:crypto';
import type { SessionData } from '../types/index.js';

interface CreateSessionInput {
  agentId: string;
  businessId: string;
  visitorIp: string;
  userAgent: string;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // cleanup every 5 min

export class SessionStore {
  private sessions = new Map<string, SessionData>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  create(input: CreateSessionInput): string {
    const token = randomBytes(18).toString('base64url').slice(0, 24);
    const now = Date.now();
    this.sessions.set(token, {
      agentId: input.agentId,
      businessId: input.businessId,
      visitorIp: input.visitorIp,
      userAgent: input.userAgent,
      createdAt: now,
      lastActivity: now,
      conversationId: null,
    });
    return token;
  }

  get(token: string): SessionData | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() - session.lastActivity > TTL_MS) {
      this.sessions.delete(token);
      return null;
    }
    session.lastActivity = Date.now();
    return session;
  }

  validate(token: string, ip: string, userAgent: string): SessionData | null {
    const session = this.get(token);
    if (!session) return null;
    if (session.visitorIp !== ip || session.userAgent !== userAgent) return null;
    return session;
  }

  update(token: string, updates: Partial<SessionData>): void {
    const session = this.sessions.get(token);
    if (session) Object.assign(session, updates);
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.sessions.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (now - session.lastActivity > TTL_MS) this.sessions.delete(token);
    }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**
- [ ] **Step 5: Commit**

---

### Task 6: Session Auth Middleware

**Files:**
- Create: `widget-backend/src/middleware/sessionAuth.ts`
- Create: `widget-backend/src/middleware/cors.ts`

- [ ] **Step 1: Implement session auth middleware**

`src/middleware/sessionAuth.ts`:
```typescript
import type { Request, Response, NextFunction } from 'express';
import type { SessionStore } from '../services/sessionStore.js';

export function createSessionAuth(store: SessionStore) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'missing_session_token' });
      return;
    }
    const token = authHeader.slice(7);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';
    const session = store.validate(token, ip, ua);
    if (!session) {
      res.status(401).json({ error: 'invalid_session' });
      return;
    }
    // Attach session to request for route handlers
    (req as any).session = session;
    (req as any).sessionToken = token;
    next();
  };
}
```

- [ ] **Step 2: Implement CORS middleware**

`src/middleware/cors.ts`:
```typescript
import cors from 'cors';
import { config } from '../config.js';

// Public endpoints — allow any origin
export const publicCors = cors({ origin: '*' });

// Widget-only endpoints — only allow widget iframe origin
export const widgetCors = cors({
  origin: config.widgetOrigin,
  credentials: false,
});
```

- [ ] **Step 3: Commit**

---

### Task 7: Config Endpoint — GET /api/config/:agentId

**Files:**
- Create: `widget-backend/src/routes/config.ts`
- Test: `widget-backend/tests/routes/config.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';

// Mock supabase
vi.mock('../../src/services/db.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              agent_id: 'agent_test123',
              name: 'Test Biz',
              default_mode: 'chat',
              welcome_message: 'Hello!',
              branding: { color: '#ff0000', logo: null, position: 'bottom-right' },
              allowed_domains: [],
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

describe('GET /api/config/:agentId', () => {
  it('returns agent config', async () => {
    const app = getTestApp();
    const res = await request(app).get('/api/config/agent_test123');
    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe('agent_test123');
    expect(res.body.defaultMode).toBe('chat');
    expect(res.body.branding).toBeDefined();
  });
});
```

- [ ] **Step 2: Implement config route**

`src/routes/config.ts`:
```typescript
import { Router } from 'express';
import { supabase } from '../services/db.js';
import { publicCors } from '../middleware/cors.js';
import type { AgentConfig } from '../types/index.js';

const router = Router();

// In-memory cache: agentId → { data, expiresAt }
const cache = new Map<string, { data: AgentConfig; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.get('/api/config/:agentId', publicCors, async (req, res) => {
  const { agentId } = req.params;

  // Check cache
  const cached = cache.get(agentId);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('agent_id, name, default_mode, welcome_message, branding, allowed_domains, is_active, status')
    .eq('agent_id', agentId)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'agent_not_found' });
    return;
  }

  if (!data.is_active || data.status !== 'active') {
    res.status(403).json({ error: 'agent_inactive' });
    return;
  }

  const config: AgentConfig = {
    agentId: data.agent_id,
    businessName: data.name,
    defaultMode: data.default_mode,
    welcomeMessage: data.welcome_message,
    branding: data.branding || { color: '#256AF4', logo: null, position: 'bottom-right' },
    allowedDomains: Array.isArray(data.allowed_domains) ? data.allowed_domains : [],
  };

  cache.set(agentId, { data: config, expiresAt: Date.now() + CACHE_TTL });
  res.json(config);
});

export default router;
```

- [ ] **Step 3: Register route in index.ts, run test, commit**

---

### Task 8: Session Endpoint — POST /api/session

**Files:**
- Create: `widget-backend/src/routes/session.ts`
- Test: `widget-backend/tests/routes/session.test.ts`

- [ ] **Step 1: Write test**

Test that `POST /api/session` with `{ agentId: "agent_xxx" }`:
- Returns 200 + `{ token: "..." }` when agent exists and is active
- Returns 404 when agent not found
- Returns 403 when domain not in whitelist

- [ ] **Step 2: Implement session route**

`src/routes/session.ts`:
```typescript
import { Router } from 'express';
import { supabase } from '../services/db.js';
import { publicCors } from '../middleware/cors.js';
import type { SessionStore } from '../services/sessionStore.js';

export function createSessionRouter(sessionStore: SessionStore) {
  const router = Router();

  router.post('/api/session', publicCors, async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) {
      res.status(400).json({ error: 'agent_id_required' });
      return;
    }

    // Look up agent
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, agent_id, allowed_domains, is_active, status, conversation_count, conversation_limit')
      .eq('agent_id', agentId)
      .single();

    if (error || !business) {
      res.status(404).json({ error: 'agent_not_found' });
      return;
    }

    if (!business.is_active || business.status !== 'active') {
      res.status(403).json({ error: 'agent_inactive' });
      return;
    }

    // Check domain whitelist
    const domains = Array.isArray(business.allowed_domains) ? business.allowed_domains : [];
    if (domains.length > 0) {
      const origin = req.headers.origin || req.headers.referer || '';
      const requestDomain = new URL(origin).hostname;
      if (!domains.some((d: string) => requestDomain === d || requestDomain.endsWith('.' + d))) {
        res.status(403).json({ error: 'domain_not_allowed' });
        return;
      }
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';

    const token = sessionStore.create({
      agentId: business.agent_id,
      businessId: business.id,
      visitorIp: ip,
      userAgent: ua,
    });

    res.json({ token });
  });

  return router;
}
```

- [ ] **Step 3: Update index.ts to create SessionStore and wire up routes**

Update `src/index.ts` to instantiate `SessionStore` and pass to `createSessionRouter` and `createSessionAuth`.

- [ ] **Step 4: Run tests, commit**

---

### Task 9: Gemini Chat Service

**Files:**
- Create: `widget-backend/src/services/gemini.ts`
- Create: `widget-backend/src/services/promptBuilder.ts`
- Test: `widget-backend/tests/services/promptBuilder.test.ts`

- [ ] **Step 1: Write prompt builder tests**

Test that `buildSystemPrompt()` correctly combines:
- Base prompt (from agent_prompts table)
- Business custom instructions
- Page context
- Site control function definitions

- [ ] **Step 2: Implement prompt builder**

`src/services/promptBuilder.ts`:
```typescript
import type { PageContext } from '../types/index.js';

const SITE_CONTROL_INSTRUCTIONS = `
You can control the customer's website using these actions. Include them in your response when relevant:
- scrollToElement(ref): Smooth scroll to a product or section
- highlightElement(ref): Visually highlight an element
- navigateTo(url): Navigate to another page (same site only)
- showProductCard(data): Show a product popup with image, price, buy button
- openContactForm(): Open the contact form
- showComparison(products): Show side-by-side product comparison

When referencing elements, use the "elementRef" values from the page context.
Always combine helpful text with relevant site control actions.
`;

export function buildSystemPrompt(
  basePrompt: string,
  customInstructions: string | null,
  pageContext: PageContext | null,
): string {
  let prompt = basePrompt;

  if (customInstructions) {
    prompt += '\n\n## Business-Specific Instructions\n' + customInstructions;
  }

  prompt += '\n\n## Site Control\n' + SITE_CONTROL_INSTRUCTIONS;

  if (pageContext) {
    prompt += '\n\n## Current Page Context\n';
    prompt += `Page: ${pageContext.title} (${pageContext.url})\n`;
    if (pageContext.products.length > 0) {
      prompt += '\nProducts on this page:\n';
      prompt += JSON.stringify(pageContext.products, null, 2);
    }
    if (pageContext.sections.length > 0) {
      prompt += '\nSections on this page:\n';
      prompt += JSON.stringify(pageContext.sections, null, 2);
    }
  }

  return prompt;
}
```

- [ ] **Step 3: Implement Gemini streaming service**

`src/services/gemini.ts`:
```typescript
import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

const genai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const SITE_CONTROL_FUNCTIONS = [
  { name: 'scrollToElement', description: 'Scroll to an element on the page', parameters: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] } },
  { name: 'highlightElement', description: 'Highlight an element', parameters: { type: 'object', properties: { ref: { type: 'string' } }, required: ['ref'] } },
  { name: 'navigateTo', description: 'Navigate to URL (same-origin only)', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'showProductCard', description: 'Show product card popup', parameters: { type: 'object', properties: { name: { type: 'string' }, price: { type: 'string' }, imageUrl: { type: 'string' }, ref: { type: 'string' } }, required: ['name', 'ref'] } },
  { name: 'openContactForm', description: 'Open the contact form', parameters: { type: 'object', properties: {} } },
  { name: 'showComparison', description: 'Compare products side by side', parameters: { type: 'object', properties: { products: { type: 'array', items: { type: 'object' } } }, required: ['products'] } },
];

export async function* streamChat(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'model'; content: string }>,
): AsyncGenerator<{ type: 'text_delta'; content: string } | { type: 'actions'; actions: any[] } | { type: 'done' }> {
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const response = await genai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: SITE_CONTROL_FUNCTIONS }],
    },
  });

  const actions: any[] = [];

  for await (const chunk of response) {
    if (chunk.candidates?.[0]?.content?.parts) {
      for (const part of chunk.candidates[0].content.parts) {
        if (part.text) {
          yield { type: 'text_delta', content: part.text };
        }
        if (part.functionCall) {
          actions.push({
            type: part.functionCall.name,
            ...part.functionCall.args,
          });
        }
      }
    }
  }

  if (actions.length > 0) {
    yield { type: 'actions', actions };
  }
  yield { type: 'done' };
}
```

- [ ] **Step 4: Run tests, commit**

---

### Task 10: Chat Endpoint — POST /api/chat (SSE)

**Files:**
- Create: `widget-backend/src/routes/chat.ts`
- Test: `widget-backend/tests/routes/chat.test.ts`

- [ ] **Step 1: Write test for SSE streaming response format**

- [ ] **Step 2: Implement chat route**

`src/routes/chat.ts`:
```typescript
import { Router } from 'express';
import { widgetCors } from '../middleware/cors.js';
import { createSessionAuth } from '../middleware/sessionAuth.js';
import { streamChat } from '../services/gemini.js';
import { buildSystemPrompt } from '../services/promptBuilder.js';
import { supabase } from '../services/db.js';
import type { SessionStore } from '../services/sessionStore.js';
import type { SessionData } from '../types/index.js';

export function createChatRouter(sessionStore: SessionStore) {
  const router = Router();
  const auth = createSessionAuth(sessionStore);

  router.post('/api/chat', widgetCors, auth, async (req, res) => {
    const session: SessionData = (req as any).session;
    const { message, pageContext, history = [] } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message_required' });
      return;
    }

    // Check conversation limit (only on first message of new conversation)
    if (!session.conversationId) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('conversation_count, conversation_limit')
        .eq('id', session.businessId)
        .single();

      if (biz && biz.conversation_count >= biz.conversation_limit) {
        res.status(429).json({ error: 'conversation_limit_reached' });
        return;
      }

      // Start new conversation
      const { data: conv } = await supabase
        .from('conversations')
        .insert({
          business_id: session.businessId,
          session_id: (req as any).sessionToken,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (conv) {
        session.conversationId = conv.id;
        sessionStore.update((req as any).sessionToken, { conversationId: conv.id });

        // Increment conversation count
        await supabase.rpc('increment_business_conversation_count', {
          business_uuid: session.businessId,
        });
      }
    }

    // Get system prompt
    const { data: business } = await supabase
      .from('businesses')
      .select('system_prompt')
      .eq('id', session.businessId)
      .single();

    const systemPrompt = buildSystemPrompt(
      business?.system_prompt || 'You are a helpful AI sales assistant.',
      null,
      pageContext || null,
    );

    // Build message history for Gemini
    const messages = [
      ...history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // SSE streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      let fullResponse = '';

      for await (const event of streamChat(systemPrompt, messages)) {
        if (event.type === 'text_delta') {
          fullResponse += event.content;
          res.write(`event: text_delta\ndata: ${JSON.stringify({ content: event.content })}\n\n`);
        } else if (event.type === 'actions') {
          res.write(`event: actions\ndata: ${JSON.stringify({ actions: event.actions })}\n\n`);
        } else if (event.type === 'done') {
          res.write(`event: done\ndata: {}\n\n`);
        }
      }

      // Save messages to DB (fire-and-forget)
      if (session.conversationId) {
        supabase.from('messages').insert([
          { conversation_id: session.conversationId, role: 'user', content: message },
          { conversation_id: session.conversationId, role: 'assistant', content: fullResponse },
        ]);
      }
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'ai_error' })}\n\n`);
    }

    res.end();
  });

  return router;
}
```

- [ ] **Step 3: Register in index.ts, run tests, commit**

---

### Task 11: Context Endpoint — POST /api/context

**Files:**
- Create: `widget-backend/src/services/contextParser.ts`
- Create: `widget-backend/src/routes/context.ts`
- Test: `widget-backend/tests/services/contextParser.test.ts`

- [ ] **Step 1: Write tests for context parser**

Test that `parsePageContext()` normalizes raw DOM data into structured `PageContext`.

- [ ] **Step 2: Implement context parser**

`src/services/contextParser.ts` — receives raw DOM scan from bridge, extracts products (name+price+image patterns), sections (headings, semantic HTML), assigns elementRefs.

- [ ] **Step 3: Implement context route**

`src/routes/context.ts` — receives page context from widget, parses it, stores/updates in `site_data` table, returns structured `PageContext` back to widget.

- [ ] **Step 4: Run tests, commit**

---

## Chunk 3: Advanced Backend — Hybrid, Voice, Conversation Tracking

### Простичко казано
Добавяме Hybrid режим (пишеш → агентът говори), Full Voice режим (говориш → агентът говори), и правилното проследяване на разговори за billing.

---

### Task 12: OpenAI TTS Service + Hybrid Endpoint

**Files:**
- Create: `widget-backend/src/services/openaiTts.ts`
- Create: `widget-backend/src/routes/hybrid.ts`

- [ ] **Step 1: Implement OpenAI TTS streaming service**

`src/services/openaiTts.ts` — takes text chunks from Gemini, streams them to OpenAI TTS API, yields base64-encoded audio chunks.

- [ ] **Step 2: Implement hybrid endpoint**

`src/routes/hybrid.ts` — same as chat, but pipes Gemini text through OpenAI TTS. SSE events include both `text_delta` and `audio_delta`.

- [ ] **Step 3: Register route, test manually, commit**

---

### Task 13: Voice Token Endpoint — POST /api/voice/token

**Files:**
- Create: `widget-backend/src/services/openaiRealtime.ts`
- Create: `widget-backend/src/routes/voice.ts`

- [ ] **Step 1: Implement OpenAI Realtime ephemeral key service**

`src/services/openaiRealtime.ts` — calls OpenAI API to create ephemeral key, configures session with system prompt + page context + function definitions for site control.

- [ ] **Step 2: Implement voice token route**

`src/routes/voice.ts`:
- Auth: session token required
- Builds system prompt with page context
- Calls OpenAI to get ephemeral key
- Returns `{ ephemeralKey, sessionConfig }`

- [ ] **Step 3: Register route, commit**

---

### Task 14: Conversation Tracking Service

**Files:**
- Create: `widget-backend/src/services/conversation.ts`
- Test: `widget-backend/tests/services/conversation.test.ts`

- [ ] **Step 1: Write tests for conversation limit checking**

Test `canStartConversation(businessId)` returns `true` when under limit, `false` when at/over limit.

- [ ] **Step 2: Implement conversation service**

`src/services/conversation.ts`:
- `canStartConversation(businessId)` — checks `conversation_count < conversation_limit`
- `startConversation(businessId, sessionId)` — creates conversation row, increments count
- `endConversation(conversationId, duration)` — marks completed, logs cost

- [ ] **Step 3: Refactor chat.ts to use conversation service (remove inline logic)**
- [ ] **Step 4: Run tests, commit**

---

### Task 15: Rate Limiter Middleware

**Files:**
- Create: `widget-backend/src/middleware/rateLimiter.ts`

- [ ] **Step 1: Implement in-memory rate limiter**

Simple sliding window per session token. Limits based on plan tier:
- free: 10 req/min
- starter: 20 req/min
- pro: 40 req/min
- business: 60 req/min
- enterprise: 120 req/min

- [ ] **Step 2: Apply to chat/hybrid/voice routes in index.ts**
- [ ] **Step 3: Commit**

---

### Task 16: Wire Up All Routes + Final index.ts

**Files:**
- Modify: `widget-backend/src/index.ts`

- [ ] **Step 1: Update index.ts to register all routes**

```typescript
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { SessionStore } from './services/sessionStore.js';
import healthRouter from './routes/health.js';
import configRouter from './routes/config.js';
import { createSessionRouter } from './routes/session.js';
import { createChatRouter } from './routes/chat.js';
import { createHybridRouter } from './routes/hybrid.js';
import { createVoiceRouter } from './routes/voice.js';
import { createContextRouter } from './routes/context.js';

export function createApp() {
  const app = express();
  const sessionStore = new SessionStore();

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  // Routes
  app.use(healthRouter);
  app.use(configRouter);
  app.use(createSessionRouter(sessionStore));
  app.use(createChatRouter(sessionStore));
  app.use(createHybridRouter(sessionStore));
  app.use(createVoiceRouter(sessionStore));
  app.use(createContextRouter(sessionStore));

  return app;
}
```

- [ ] **Step 2: Run all tests, commit**

---

## Chunk 4: Client-Side — embed.js + Bridge + Widget iframe

### Простичко казано
Правим трите неща, които посетителят вижда: (1) малък скрипт на сайта на клиента, (2) помощен скрипт който контролира сайта, (3) React приложение с чат/voice интерфейс.

---

### Task 17: Bridge Script

**Files:**
- Create: `embed/package.json`
- Create: `embed/src/bridge.ts`
- Test: `embed/tests/bridge.test.ts`

- [ ] **Step 1: Initialize embed project**

```json
{
  "name": "simplifyops-embed",
  "private": true,
  "scripts": {
    "build": "rollup -c",
    "test": "vitest run"
  },
  "devDependencies": {
    "rollup": "^4.30.0",
    "@rollup/plugin-typescript": "^12.1.0",
    "rollup-plugin-terser": "^7.0.2",
    "typescript": "^5.7.0",
    "vitest": "^3.1.0",
    "jsdom": "^26.0.0"
  }
}
```

- [ ] **Step 2: Write bridge tests**

Test `getPageContext()` — given a mock DOM with products (img + price + title pattern), verify it extracts them correctly. Test `scrollToElement()`, `highlightElement()`, `navigateTo()` (same-origin check).

- [ ] **Step 3: Implement bridge script**

`embed/src/bridge.ts`:
- `getPageContext()` — scans DOM for products, sections, headings. Uses `data-product-id`, semantic HTML, and text patterns. Returns structured context.
- `scrollToElement(ref)` — `element.scrollIntoView({ behavior: 'smooth' })`
- `highlightElement(ref)` — adds temporary overlay/border highlight
- `navigateTo(url)` — validates same-origin, then `window.location.href = url`
- `showProductCard(data)` — creates floating card overlay with image, price, CTA button
- `openContactForm()` — finds and scrolls to contact form, or shows fallback
- `showComparison(products)` — creates side-by-side comparison overlay
- Listens for `postMessage` from widget iframe, executes commands, sends results back

- [ ] **Step 4: Run tests, commit**

---

### Task 18: embed.js — Main Embed Script

**Files:**
- Create: `embed/src/embed.ts`
- Create: `embed/rollup.config.js`
- Test: `embed/tests/embed.test.ts`

- [ ] **Step 1: Implement embed.ts**

`embed/src/embed.ts`:
1. Reads `data-agent` from own script tag
2. Fetches config from `GET /api/config/:agentId`
3. Creates floating button (circle, bottom-right by default, branded color)
4. On click: creates iframe pointing to `widget.simplifyops.co?agent=xxx`
5. Injects bridge script listeners into parent page
6. Handles postMessage commands from iframe → routes to bridge functions
7. Provides `getPageContext()` result to iframe on request

- [ ] **Step 2: Create rollup config**

`embed/rollup.config.js` — bundles `embed.ts` + `bridge.ts` into single minified `embed.js` file (~8-12KB gzipped).

- [ ] **Step 3: Build and verify output size**

Run: `cd embed && npm run build`
Expected: `dist/embed.js` exists, gzipped < 15KB

- [ ] **Step 4: Commit**

---

### Task 19: Widget iframe — React App Setup

**Files:**
- Create: `widget/package.json`
- Create: `widget/vite.config.ts`
- Create: `widget/tsconfig.json`
- Create: `widget/index.html`
- Create: `widget/src/main.tsx`
- Create: `widget/src/App.tsx`
- Create: `widget/src/lib/types.ts`
- Create: `widget/src/lib/api.ts`
- Create: `widget/src/styles/widget.css`

- [ ] **Step 1: Initialize Vite + React project**

```bash
mkdir -p widget
cd widget
```

```json
{
  "name": "simplifyops-widget",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.3.0"
  }
}
```

- [ ] **Step 2: Create API client and types**

`widget/src/lib/api.ts` — functions for `createSession()`, `sendMessage()` (SSE), `getVoiceToken()`, `sendContext()`.

`widget/src/lib/types.ts` — shared widget types (Message, Mode, AgentConfig, etc.)

- [ ] **Step 3: Create App.tsx shell**

App reads `agent` from URL params, calls `createSession()`, renders mode-specific view (ChatView / HybridView / VoiceView), handles mode switching.

- [ ] **Step 4: Install deps, verify dev server starts**

Run: `cd widget && npm install && npm run dev`

- [ ] **Step 5: Commit**

---

### Task 20: Chat View Component

**Files:**
- Create: `widget/src/hooks/useChat.ts`
- Create: `widget/src/hooks/useSession.ts`
- Create: `widget/src/hooks/useBridge.ts`
- Create: `widget/src/lib/sse.ts`
- Create: `widget/src/components/ChatView.tsx`
- Create: `widget/src/components/MessageBubble.tsx`
- Create: `widget/src/components/WidgetHeader.tsx`
- Create: `widget/src/components/ModeToggle.tsx`

- [ ] **Step 1: Implement SSE parser**

`widget/src/lib/sse.ts` — parses SSE stream from fetch response body. Yields parsed events (`text_delta`, `actions`, `done`).

- [ ] **Step 2: Implement useSession hook**

Manages session token lifecycle — creates on mount, stores in state, provides `token` and `isReady`.

- [ ] **Step 3: Implement useChat hook**

`widget/src/hooks/useChat.ts`:
- `sendMessage(text)` — POSTs to `/api/chat` with SSE
- Accumulates `text_delta` events into current assistant message
- Processes `actions` events → sends to bridge via postMessage
- Manages `messages[]` state, `isStreaming` state

- [ ] **Step 4: Implement useBridge hook**

`widget/src/hooks/useBridge.ts` — sends postMessage to parent window (bridge), listens for responses.

- [ ] **Step 5: Build ChatView UI**

- Message list with auto-scroll
- Text input with send button
- Streaming indicator
- Product cards when `showProductCard` action received
- Header with logo, business name, close button
- Mode toggle (chat/hybrid/voice)

- [ ] **Step 6: Commit**

---

### Task 21: Voice View + Hybrid View Components

**Files:**
- Create: `widget/src/hooks/useVoice.ts`
- Create: `widget/src/hooks/useHybrid.ts`
- Create: `widget/src/components/VoiceView.tsx`
- Create: `widget/src/components/HybridView.tsx`
- Create: `widget/src/components/WaveformVisualizer.tsx`

- [ ] **Step 1: Implement useVoice hook**

`widget/src/hooks/useVoice.ts`:
- Fetches ephemeral key from `/api/voice/token`
- Creates WebRTC peer connection to OpenAI Realtime API
- Handles microphone input + audio output
- Receives function calls from OpenAI → sends to bridge via postMessage
- Returns function call results back to OpenAI

- [ ] **Step 2: Implement useHybrid hook**

`widget/src/hooks/useHybrid.ts`:
- Same text input as chat
- SSE stream includes `audio_delta` events
- Plays audio chunks using Web Audio API
- Shows text and plays audio simultaneously

- [ ] **Step 3: Build VoiceView UI**

- Large microphone button (push-to-talk or continuous)
- Waveform visualizer (reacts to audio levels)
- Transcript display (what user said + agent response)
- Fallback message if voice unavailable

- [ ] **Step 4: Build HybridView UI**

- Same as ChatView but with audio playback indicator
- Shows text messages while speaking them

- [ ] **Step 5: Build WaveformVisualizer**

Simple canvas-based waveform animation using `AnalyserNode` from Web Audio API.

- [ ] **Step 6: Commit**

---

### Task 22: Product Card + Comparison Components

**Files:**
- Create: `widget/src/components/ProductCard.tsx`
- Create: `widget/src/components/ComparisonView.tsx`

- [ ] **Step 1: Build ProductCard**

Floating card overlay: product image, name, price, "View" button. Appears when agent sends `showProductCard` action.

- [ ] **Step 2: Build ComparisonView**

Side-by-side comparison table for 2-3 products. Appears when agent sends `showComparison` action.

- [ ] **Step 3: Commit**

---

## Chunk 5: Integration & Deployment

### Простичко казано
Свързваме всичко заедно, тестваме край до край, и deploy-ваме на Railway (backend) + Vercel (widget iframe) + CDN (embed.js).

---

### Task 23: End-to-End Integration Testing

- [ ] **Step 1: Test embed.js → bridge → iframe communication**

Create a test HTML page with `embed.js`, verify:
- Button appears
- Click opens iframe
- Bridge scans page context
- Context sent to backend

- [ ] **Step 2: Test chat flow end-to-end**

- Widget opens → session created → user types → Gemini responds via SSE → text appears
- Site control actions execute (scroll, highlight)

- [ ] **Step 3: Test hybrid flow**

- User types → Gemini text + OpenAI TTS audio → both play

- [ ] **Step 4: Test voice flow**

- User clicks mic → WebRTC connects → voice conversation works
- Function calls trigger site control

- [ ] **Step 5: Test conversation limits**

- Free tier: verify 26th conversation is rejected
- Verify in-progress conversation completes even when limit reached

- [ ] **Step 6: Test fallback behavior**

- Kill voice → verify auto-switch to hybrid
- Kill TTS → verify auto-switch to chat

- [ ] **Step 7: Commit test files**

---

### Task 24: Railway Deployment Setup

- [ ] **Step 1: Create Railway project and service**

```bash
cd widget-backend
railway init
railway link
```

- [ ] **Step 2: Set environment variables on Railway**

```bash
railway variables set SUPABASE_URL=xxx
railway variables set SUPABASE_SERVICE_ROLE_KEY=xxx
railway variables set GEMINI_API_KEY=xxx
railway variables set OPENAI_API_KEY=xxx
railway variables set WIDGET_ORIGIN=https://widget.simplifyops.co
railway variables set NODE_ENV=production
```

- [ ] **Step 3: Deploy to Railway**

```bash
railway up
```

Verify: `curl https://<railway-url>/api/health` returns `{ status: "ok" }`

- [ ] **Step 4: Commit railway config if any**

---

### Task 25: Vercel Deployment — Widget iframe

- [ ] **Step 1: Configure Vercel project for widget/**

Create `widget/vercel.json` — set custom domain `widget.simplifyops.co`.

- [ ] **Step 2: Set environment variable**

Widget needs `VITE_API_URL` pointing to Railway backend URL.

- [ ] **Step 3: Deploy widget to Vercel**

```bash
cd widget
vercel --prod
```

- [ ] **Step 4: Verify widget loads at widget.simplifyops.co**

---

### Task 26: CDN Deployment — embed.js

- [ ] **Step 1: Build embed.js for production**

```bash
cd embed && npm run build
```

- [ ] **Step 2: Deploy to CDN**

Options:
- Vercel: add `embed/dist/embed.js` as static file at `cdn.simplifyops.co/embed.js`
- Or Cloudflare Pages/R2

- [ ] **Step 3: Test full flow from external site**

Add `<script src="https://cdn.simplifyops.co/embed.js" data-agent="agent_xxx">` to a test site. Verify everything works.

---

### Task 27: Run Database Migrations on Supabase

- [ ] **Step 1: Run migration 007 on staging**

```bash
cd next-app
npx supabase db push
```

- [ ] **Step 2: Verify tables created**

Check `site_data` and `agent_prompts` tables exist with correct columns.

- [ ] **Step 3: Run migration 008 on staging**

Verify `businesses.default_mode`, `businesses.welcome_message` columns added, `agent_id` values regenerated.

- [ ] **Step 4: Run on production after staging verified**

---

## Summary

| # | Task | What it does (простичко) |
|---|------|--------------------------|
| 1 | Init Railway project | Създава нов Node.js проект |
| 2 | Express + health | Сървърът тръгва и казва "работя" |
| 3 | Supabase client | Връзка към базата данни |
| 4 | DB migrations | Нови таблици за сайт данни и промптове |
| 5 | Session store | Пази "пропуски" за посетители |
| 6 | Session auth | Проверява дали пропускът е валиден |
| 7 | Config endpoint | Дава настройките на агента |
| 8 | Session endpoint | Създава нов пропуск |
| 9 | Gemini service | Говори с AI-а (чат) |
| 10 | Chat endpoint | Чат режим — пишеш, AI отговаря |
| 11 | Context endpoint | Обработва какво има на страницата |
| 12 | Hybrid endpoint | Пишеш → AI говори |
| 13 | Voice endpoint | Говориш → AI говори |
| 14 | Conversation tracking | Брои разговори за billing |
| 15 | Rate limiter | Защита от спам |
| 16 | Wire all routes | Свързва всички endpoints |
| 17 | Bridge script | Контролира сайта (scroll, highlight) |
| 18 | embed.js | Скриптът който клиентът слага |
| 19 | Widget React app | Основа на чат прозореца |
| 20 | Chat UI | Чат интерфейс |
| 21 | Voice + Hybrid UI | Voice и hybrid интерфейс |
| 22 | Product cards | Показване на продукти |
| 23 | E2E testing | Тестваме всичко заедно |
| 24 | Railway deploy | Backend на живо |
| 25 | Widget deploy | Widget iframe на живо |
| 26 | CDN deploy | embed.js на живо |
| 27 | DB migrations | Базата на живо |
