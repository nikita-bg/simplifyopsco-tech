---
phase: 01-agent-infrastructure
plan: 02
subsystem: api
tags: [elevenlabs, fastapi, agent-crud, signed-url, pydantic, httpx, tdd]

# Dependency graph
requires:
  - phase: 01-agent-infrastructure-01
    provides: "ElevenLabsService singleton, 6 Pydantic agent models, DB schema with agent columns"
provides:
  - "Agent CRUD endpoints: POST create, GET info, PATCH update, DELETE cleanup"
  - "GET /api/agents/templates listing all seeded templates"
  - "Per-store signed URL resolution from DB (with global fallback)"
  - "Per-store voice config resolution from DB (with global fallback)"
  - "27 new tests (11 service unit + 16 endpoint integration)"
affects: [02-knowledge-base, 03-widget, 05-onboarding, 06-agent-configuration, 07-billing]

# Tech tracking
tech-stack:
  added: [pytest-asyncio]
  patterns: [elevenlabs-first-then-db, pending-active-failed-lifecycle, per-store-agent-resolution, jsonb-parse-helper]

key-files:
  created:
    - backend/tests/test_elevenlabs_service.py
    - backend/tests/test_agent_endpoints.py
  modified:
    - backend/main.py

key-decisions:
  - "Update ElevenLabs FIRST then DB to prevent config drift (per research pitfall #4)"
  - "Per-store signed URL with global fallback preserves backward compatibility for existing widget"
  - "Used pytest-asyncio for ElevenLabs service unit tests (Python 3.14 deprecated get_event_loop)"

patterns-established:
  - "ElevenLabs-first-then-DB update pattern: always write to external API before persisting locally"
  - "Agent lifecycle: none -> pending -> active (or failed) with DB status tracking"
  - "_parse_jsonb helper for asyncpg JSONB handling (string or dict)"
  - "Per-store resource resolution with global env var fallback for backward compat"

requirements-completed: [AGT-01, AGT-02, AGT-03, AGT-04, AGT-05, AGT-06]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 1 Plan 02: Agent CRUD Endpoints and Signed URL Refactor Summary

**FastAPI agent CRUD endpoints with ElevenLabs-first update pattern, per-store signed URL resolution, and 27 comprehensive tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T18:39:18Z
- **Completed:** 2026-03-13T18:45:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 6 agent management endpoints in main.py: create (POST), get (GET), update (PATCH), delete (DELETE), templates (GET), plus refactored signed-url and voice-config
- Agent create follows pending -> active lifecycle with rollback to 'failed' on API error
- Agent update writes to ElevenLabs FIRST, then DB -- prevents config drift per research pitfall #4
- Per-store signed URL and voice config resolution from DB with backward-compatible global fallback
- 27 new tests (11 service unit + 16 endpoint integration), 176 total backend tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent CRUD endpoints, template listing, signed URL refactor** - `261dc6c` (feat)
2. **Task 2: Comprehensive tests for ElevenLabs service and agent endpoints** - `484c721` (test)

_Note: TDD RED commit `04639e6` contains initial failing tests before endpoint implementation._

## Files Created/Modified
- `backend/main.py` - 6 new agent endpoints + refactored voice/signed-url + _parse_jsonb helper
- `backend/tests/test_elevenlabs_service.py` - 11 async unit tests for ElevenLabsService CRUD methods
- `backend/tests/test_agent_endpoints.py` - 16 integration tests for all agent endpoints including error cases

## Decisions Made
- Update ElevenLabs FIRST then DB to prevent config drift -- if ElevenLabs call fails, DB stays clean
- Per-store signed URL with global fallback preserves backward compatibility for existing widget deployments
- Used pytest-asyncio for service tests since Python 3.14 deprecated asyncio.get_event_loop()
- Template listing requires only authentication (not store ownership) since templates are global resources

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed signed URL test needing settings mock**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** test_per_store_agent and test_inactive_agent failed because settings.ELEVENLABS_API_KEY was empty in test env, causing early 503 before per-store logic ran
- **Fix:** Added `patch("backend.main.settings")` mock to signed URL tests to set API key
- **Files modified:** backend/tests/test_agent_endpoints.py
- **Verification:** All 16 endpoint tests pass
- **Committed in:** 261dc6c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test fix necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Endpoints are ready when migrations from Plan 01 are applied.

## Next Phase Readiness
- All agent CRUD endpoints operational via API
- Per-store signed URL ready for widget integration (Phase 3)
- Agent templates endpoint ready for onboarding flow (Phase 5)
- Agent update/delete endpoints ready for configuration UI (Phase 6)
- 176 backend tests passing with zero regressions

## Self-Check: PASSED

- All 4 files found (1 main.py, 2 test files, 1 summary)
- All 3 commits verified (04639e6, 261dc6c, 484c721)
- test_elevenlabs_service.py: 261 lines (min 80 required)
- test_agent_endpoints.py: 381 lines (min 100 required)
- 176 backend tests pass with zero regressions

---
*Phase: 01-agent-infrastructure*
*Completed: 2026-03-13*
