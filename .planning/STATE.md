---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03-02-PLAN.md
last_updated: "2026-03-13T21:00:13.059Z"
last_activity: 2026-03-13 — Completed 03-02 (Widget Embed Refactor)
progress:
  total_phases: 10
  completed_phases: 3
  total_plans: 9
  completed_plans: 7
  percent: 78
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-13)

**Core value:** Any merchant can have a working, personalized AI voice sales assistant live on their website in under 10 minutes — no code, no technical help needed.
**Current focus:** Phase 3 - Widget (COMPLETE)

## Current Position

Phase: 3 of 10 (Widget) - COMPLETE
Plan: 2 of 2 in current phase (03-02 complete)
Status: Executing
Last activity: 2026-03-13 — Completed 03-02 (Widget Embed Refactor)

Progress: [████████░░] 78%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 4.1min
- Total execution time: 0.48 hours

**By Phase:**

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| Phase 01 | P01 | 2min | 2 | 4 |
| Phase 01 | P02 | 5min | 2 | 3 |
| Phase 02 | P01 | 7min | 2 | 8 |
| Phase 02 | P02 | 5min | 2 | 2 |
| Phase 02 | P03 | 3min | 3 | 2 |
| Phase 03 | P01 | 3min | 2 | 3 |
| Phase 03 | P02 | 4min | 2 | 1 |

**Recent Trend:**
- Last 5 plans: 7min, 5min, 3min, 3min, 4min
- Trend: Steady

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 0 is credential rotation (P0 emergency before any feature work)
- [Roadmap]: Agent infrastructure (Phase 1) is dependency root — widget, sync, billing all need agent_id per store
- [Roadmap]: Knowledge base and widget are separate phases (2, 3) despite tight coupling — KB can be tested via API before widget exists
- [Phase 01]: Used raw httpx for ElevenLabs CRUD (consistent with shopify_service.py pattern)
- [Phase 01]: JSONB for conversation_config matching ElevenLabs API payload format exactly
- [Phase 01]: UNIQUE(type, is_default) on agent_templates enforces one default per business type
- [Phase 01]: Update ElevenLabs FIRST then DB to prevent config drift (research pitfall #4)
- [Phase 01]: Per-store signed URL with global fallback preserves backward compatibility
- [Phase 01]: Used pytest-asyncio for service tests (Python 3.14 deprecated get_event_loop)
- [Phase 02]: Lazy Gemini client init to avoid import-time API key validation in tests
- [Phase 02]: Single text document per store for ElevenLabs KB (atomic rebuild)
- [Phase 02]: pgvector registered via asyncpg pool init callback
- [Phase 02]: PRODUCT_SEARCH_TOOL as module-level constant for agent server tool registration
- [Phase 02]: Description truncation at 500 chars to preserve 300k char budget
- [Phase 02]: Negative sequential IDs for manual products to avoid Shopify BIGINT collision
- [Phase 02]: X-Tool-Secret header auth for server tool (machine-to-machine)
- [Phase 02]: 80% warning threshold (240k chars) on sync status endpoint
- [Phase 02]: Inline form for product CRUD instead of modal (simpler UX)
- [Phase 02]: Custom relativeTime helper instead of library (no new npm dependencies)
- [Phase 02]: 3-second polling interval for sync status during sync
- [Phase 03]: Per-endpoint wildcard CORS via Response.headers (preserves allow_credentials on dashboard)
- [Phase 03]: Default widget color #256af4 (project primary) not legacy #6366f1
- [Phase 03]: agent_id security-gated: only exposed when active AND enabled
- [Phase 03]: CSS custom properties (--avsa-color) replace template literal color injection for runtime theming
- [Phase 03]: Mic permission errors keep panel open with retry instead of auto-closing
- [Phase 03]: All widget console.error replaced with console.warn for merchant storefronts

### Pending Todos

None yet.

### Blockers/Concerns

- [SEC] Leaked credentials in git history (commit 98996c8) — must be rotated before any deployment or feature work
- [KB] ElevenLabs 300k character KB limit caps catalogs at ~1,000 products — needs smart sync strategy in Phase 2
- [BIL] ElevenLabs burst pricing (2x for concurrent calls over plan) can destroy margins — guardrails needed in Phase 7

## Session Continuity

Last session: 2026-03-13T21:00:13.056Z
Stopped at: Completed 03-02-PLAN.md
Resume file: None
