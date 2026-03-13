---
phase: 03-widget
plan: 01
subsystem: api
tags: [fastapi, cors, widget, pydantic, pytest]

# Dependency graph
requires:
  - phase: 01-agent-infra
    provides: stores table with elevenlabs_agent_id, agent_status, settings JSONB
provides:
  - "GET /api/widget/config endpoint returning per-store agent_id, visual settings, enabled state"
  - "WidgetConfigResponse Pydantic model"
  - "Wildcard CORS on /api/widget/config and /api/voice/signed-url"
affects: [03-widget-plan-02, embed-js, frontend-widget-preview]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Per-endpoint wildcard CORS via Response.headers for public widget endpoints"]

key-files:
  created:
    - backend/tests/test_widget_config.py
  modified:
    - backend/models.py
    - backend/main.py

key-decisions:
  - "Per-endpoint wildcard CORS instead of global middleware change (preserves allow_credentials=True for dashboard)"
  - "Default widget color #256af4 (project primary) not #6366f1 (legacy StoreSettings indigo)"
  - "agent_id only exposed when agent_status=active AND enabled=True (security)"
  - "Renamed httpx response variable in signed-url to avoid shadowing FastAPI Response param"

patterns-established:
  - "Widget-facing endpoints use Response.headers['Access-Control-Allow-Origin'] = '*' for cross-origin access"
  - "Settings JSONB parsed defensively: handles str, dict, or None"

requirements-completed: [WDG-01, WDG-02, WDG-03, WDG-04, WDG-07]

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 3 Plan 1: Widget Config Endpoint Summary

**GET /api/widget/config endpoint with per-store agent_id, visual settings, and wildcard CORS for cross-origin widget embedding**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T20:48:07Z
- **Completed:** 2026-03-13T20:51:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- New /api/widget/config endpoint returns per-store config (agent_id, color, position, greeting, enabled) for embed.js initialization
- Agent_id protected: only exposed when agent_status=active AND enabled=True; null otherwise
- Wildcard CORS (Access-Control-Allow-Origin: *) on both /api/widget/config and /api/voice/signed-url
- 10 new tests covering all edge cases, 258 total backend tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: WidgetConfigResponse model and /api/widget/config endpoint with wildcard CORS** - `7712191` (feat)
2. **Task 2: Widget config endpoint tests** - `7db1e5e` (test)

## Files Created/Modified
- `backend/models.py` - Added WidgetConfigResponse model with project primary color #256af4
- `backend/main.py` - Added GET /api/widget/config endpoint, wildcard CORS on widget/config and voice/signed-url
- `backend/tests/test_widget_config.py` - 10 tests: no store_id, invalid UUID, store not found, active agent, disabled agent, inactive status, missing settings, CORS headers

## Decisions Made
- Per-endpoint wildcard CORS via Response.headers instead of changing global CORSMiddleware (dashboard endpoints still use allow_credentials=True)
- Default widget color set to #256af4 (project primary per CLAUDE.md) instead of StoreSettings legacy #6366f1
- Agent_id is security-gated: only exposed when both agent_status="active" AND settings.enabled=True
- Renamed httpx local variable in signed-url endpoint to avoid shadowing FastAPI Response parameter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Signed-url CORS test initially failed because settings.ELEVENLABS_API_KEY was empty in test env, causing 503 before CORS header could be set. Fixed by mocking settings in the test to provide a test API key.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- /api/widget/config endpoint ready for embed.js to consume (Plan 03-02)
- Wildcard CORS ensures the widget can fetch config from any merchant domain
- Response model documented for embed.js client-side parsing

## Self-Check: PASSED

- All 4 files verified present on disk
- Both task commits (7712191, 7db1e5e) verified in git history

---
*Phase: 03-widget*
*Completed: 2026-03-13*
