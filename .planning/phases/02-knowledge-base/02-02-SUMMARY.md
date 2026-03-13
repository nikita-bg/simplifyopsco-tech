---
phase: 02-knowledge-base
plan: 02
subsystem: api
tags: [fastapi, endpoints, crud, server-tool, elevenlabs, semantic-search, knowledge-base]

# Dependency graph
requires:
  - phase: 02-knowledge-base
    provides: KBService (sync, embed, search, trigger_kb_rebuild), Pydantic models (ManualProductCreate, ManualProductUpdate, KBSyncStatus, ProductSearchResult), config (ELEVENLABS_TOOL_SECRET)
provides:
  - Manual product CRUD endpoints (POST/PUT/DELETE /api/stores/{id}/products)
  - KB sync status endpoint (GET /api/stores/{id}/kb/status with char warning)
  - KB sync now endpoint (POST /api/stores/{id}/kb/sync with 202)
  - Server tool product search endpoint (POST /api/tools/product-search)
  - Shopify webhook and product sync KB rebuild integration
affects: [03-widget, 07-billing]

# Tech tracking
tech-stack:
  added: []
  patterns: [server tool shared-secret auth via X-Tool-Secret header, negative IDs for manual products to avoid Shopify BIGINT collision, background KB rebuild after any product change]

key-files:
  created: []
  modified:
    - backend/main.py
    - backend/tests/test_kb_endpoints.py

key-decisions:
  - "Negative sequential IDs for manual products (MIN(id) - 1) to avoid collision with Shopify BIGINT IDs"
  - "X-Tool-Secret header auth for server tool (machine-to-machine, not user auth)"
  - "80% warning threshold (240k of 300k chars) on sync status endpoint"
  - "Server tool returns formatted results with name/price/description/category for agent consumption"

patterns-established:
  - "Shared-secret auth: X-Tool-Secret header for machine-to-machine ElevenLabs tool calls"
  - "Manual product negative IDs: MIN(id) - 1 pattern for collision-free sequential IDs"
  - "KB rebuild on every product change: webhook, sync, manual CRUD all trigger background rebuild"

requirements-completed: [KB-01, KB-04, KB-05, KB-06, KB-07]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 2 Plan 2: KB Management Endpoints Summary

**Manual product CRUD, sync status/now endpoints, server tool product search with shared-secret auth, and Shopify webhook KB rebuild integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T19:53:27Z
- **Completed:** 2026-03-13T19:58:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 7 new/modified endpoints: manual product create/update/delete, KB sync status, KB sync now, server tool product search, extended Shopify webhook
- Server tool authenticates via X-Tool-Secret header and returns agent-formatted product results
- Sync status endpoint returns char limit warning flag at 80% of 300k character budget
- Shopify webhook and product sync endpoints now trigger KB rebuild in background
- 18 new tests across 5 test classes with zero regressions (248 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: KB management endpoints -- manual CRUD, sync status, sync now, webhook extension** - `745dd25` (test, RED), `4c4e8c0` (feat, GREEN)
2. **Task 2: Server tool endpoint and comprehensive KB endpoint tests** - `9c9eecb` (feat)

## Files Created/Modified
- `backend/main.py` - Added KB management endpoints (manual CRUD, sync status, sync now, server tool), extended Shopify webhook and product sync with KB rebuild
- `backend/tests/test_kb_endpoints.py` - 18 tests: TestManualProducts (6), TestSyncStatus (3), TestSyncNow (2), TestServerTool (5), TestWebhookKBRebuild (2)

## Decisions Made
- **Negative sequential IDs for manual products**: Using `MIN(id) - 1` starting from 0 going negative avoids any collision with Shopify product IDs (which are BIGINT in the billions). Simple, deterministic, no sequence table needed.
- **X-Tool-Secret header auth for server tool**: The product search endpoint is called by ElevenLabs agent during conversation (machine-to-machine), not by merchants. Uses a shared secret header instead of user session auth.
- **80% warning threshold on sync status**: Returns `is_warning: true` when char_count >= 240,000 (80% of 300k ElevenLabs KB limit), giving merchants advance notice before hitting the hard limit.
- **Formatted results for agent consumption**: Server tool returns `{name, price, description (truncated 200 chars), category}` -- optimized for voice agent to speak product details naturally.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required for this plan. ELEVENLABS_TOOL_SECRET environment variable will be needed at runtime when server tool is called (set during deployment).

## Next Phase Readiness
- All KB endpoints are complete and tested, ready for Plan 03 (dashboard UI)
- Server tool endpoint is live and ready for ElevenLabs agent calls once agent is configured
- Manual product CRUD enables non-Shopify merchants to manage their catalog
- Sync status provides health monitoring data for the dashboard

---
*Phase: 02-knowledge-base*
*Completed: 2026-03-13*

## Self-Check: PASSED

All 3 files verified present. All 3 task commits (745dd25, 4c4e8c0, 9c9eecb) confirmed in git log. 248 tests passing (230 existing + 18 new).
