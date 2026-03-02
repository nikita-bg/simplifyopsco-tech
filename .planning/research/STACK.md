# Stack Research: Voice AI Platform

**Domain:** Voice AI Conversational Platform
**Research Date:** 2026-03-02
**Milestone:** v1 Working Demo

## Recommended Stack

### Frontend
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| Framework | **Next.js 15** | Best Vercel integration, serverless functions, SSR for SEO | High |
| Styling | **Tailwind CSS** (existing) | Already implemented, modern utility-first approach | High |
| UI Components | **Radix UI + shadcn/ui** | Accessible, unstyled primitives, matches dark mode design | Medium |
| State | **Zustand** | Lightweight, less boilerplate than Redux, good for voice state | High |
| Real-time | **WebSocket** (native) | Low-latency audio streaming, duplex communication | High |

### Voice & LLM
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| Speech-to-Text | **ElevenLabs Conversational AI** | Client API provided, voice cloning, low latency | High |
| Text-to-Speech | **ElevenLabs TTS** | Same provider for consistency, natural voices | High |
| LLM Reasoning | **OpenAI GPT-4o** | Already in n8n workflows, fast, good reasoning | High |
| Fallback LLM | **Claude 3.5 Sonnet** (Anthropic) | Better reasoning for complex queries, backup option | Medium |

### Backend & Database
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| Platform | **Vercel (all-in-one)** | Next.js native, serverless functions, edge network, <50ms cold start | High |
| Database | **Supabase** | Auth + PostgreSQL + Realtime + Edge Functions + Vector (pgvector) | High |
| Vector Store | **Supabase pgvector** | Native PostgreSQL extension, no separate service needed | High |
| Alternative Vector | **Pinecone** (if needed) | Dedicated vector DB if pgvector insufficient | Low |

### Workflows & Automation
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| Workflows | **n8n (existing)** | Already designed RAG pipelines, visual builder | High |
| n8n Hosting | **n8n Cloud** or **Self-hosted** | Cloud for simplicity, self-hosted for control | Medium |
| Webhook Integration | **Vercel Edge Functions** | Connect n8n → Supabase via webhooks | High |

### RAG Pipeline
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| Embeddings | **OpenAI text-embedding-3-small** | Fast, cost-effective, good performance | High |
| Vector Search | **Supabase pgvector** | Integrated with DB, SQL-based similarity search | High |
| Chunking | **LangChain RecursiveCharacterTextSplitter** | Industry standard, good for various document types | Medium |
| Document Loading | **LangChain Loaders** | PDF, DOCX, Google Drive support | Medium |

### Web Automation
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| DOM Manipulation | **Native JavaScript** | Direct control, no dependencies needed | High |
| Smooth Scrolling | **GSAP or ScrollToPlugin** | Smooth animations for better UX | Medium |
| Form Handling | **React Hook Form** (if using React) | Lightweight, good performance | Medium |

### Analytics & Monitoring
| Component | Recommendation | Rationale | Confidence |
|-----------|---------------|-----------|------------|
| Analytics Backend | **Supabase PostgreSQL** | Store conversation data, metrics directly in DB | High |
| Real-time Dashboard | **Supabase Realtime** | Live updates without polling | High |
| Charts | **Recharts** or **Chart.js** | Already styled in dashboard.html | Medium |
| Error Tracking | **Sentry** | Voice AI needs good error monitoring | Medium |

## What NOT to Use

### ❌ Avoid Firebase
- **Why:** Supabase provides same features with better SQL, open-source, and already committed to Supabase in constraints

### ❌ Avoid Separate Vector DB (initially)
- **Why:** Supabase pgvector sufficient for v1, avoids another service to manage
- **When to reconsider:** If >1M vectors or complex hybrid search needed

### ❌ Avoid Twilio Voice API
- **Why:** ElevenLabs provides direct voice agent API, Twilio adds complexity
- **When to reconsider:** If phone call integration needed (v2+)

### ❌ Avoid Real-time Databases (Firestore, Redis)
- **Why:** Supabase Realtime + PostgreSQL handles all use cases
- **Exception:** Redis could be useful for rate limiting in v2

### ❌ Avoid Custom ASR/TTS
- **Why:** ElevenLabs is production-ready, custom models require ML expertise
- **When to reconsider:** Cost optimization at scale (v3+)

## Version Compatibility (2026)

```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "tailwindcss": "^4.0.0",
  "@supabase/supabase-js": "^2.50.0",
  "openai": "^4.75.0",
  "elevenlabs-js": "^0.12.0",
  "zustand": "^5.0.0",
  "langchain": "^0.3.0"
}
```

## Integration Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (Next.js 15 + Tailwind)                        │
│ ├── Voice Widget (WebSocket → ElevenLabs)               │
│ ├── Dashboard (Supabase Realtime)                       │
│ └── Landing Page (Static)                               │
└────────────┬────────────────────────────────────────────┘
             │
             ├→ Vercel Edge Functions (API Routes)
             │  ├── /api/conversation (WebSocket handler)
             │  ├── /api/bookings (CRUD)
             │  └── /api/analytics (Queries)
             │
             ├→ Supabase (Backend as a Service)
             │  ├── PostgreSQL (Users, Conversations, Bookings)
             │  ├── Auth (Email/Password + Google OAuth)
             │  ├── pgvector (Knowledge Base embeddings)
             │  └── Edge Functions (Webhooks from n8n)
             │
             ├→ ElevenLabs API
             │  ├── Speech-to-Text
             │  ├── Text-to-Speech
             │  └── Conversational AI Agent
             │
             ├→ OpenAI API
             │  ├── GPT-4o (Reasoning, Intent)
             │  └── text-embedding-3-small (RAG)
             │
             └→ n8n Workflows
                ├── Google Drive → Vector Store sync
                ├── Manual document ingestion
                └── RAG pipeline automation
```

## Sources

Research based on:
- [Supabase ElevenLabs Integration](https://elevenlabs.io/agents/integrations/supabase)
- [Vercel ElevenLabs Integration](https://vercel.com/docs/ai/elevenlabs)
- [Building Real-Time AI Voice Assistant with ElevenLabs](https://neon.com/guides/pulse)
- [Best Developer Tools for 2026 Tech Stack](https://www.buildmvpfast.com/blog/best-developer-tools-2026-tech-stack)
