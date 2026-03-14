---
phase: 06-agent-configuration
plan: 01
subsystem: api
tags: [fastapi, pydantic, elevenlabs, agent-config, voice, personality-presets]

requires:
  - phase: 01-agent-infrastructure
    provides: ElevenLabs agent CRUD, elevenlabs_service.py, stores table with agent_config/settings JSONB
provides:
  - GET /api/agent/config/{store_id} endpoint for full config retrieval
  - PUT /api/agent/config/{store_id} endpoint for config updates with ElevenLabs sync
  - GET /api/voices endpoint returning voices, languages, and personality presets
  - GET /api/agent/embed-code/{store_id} endpoint for embed snippet generation
  - agent_config_service.py module with curated voices, presets, languages
  - AgentConfigResponse, AgentConfigUpdate, VoiceOption, PersonalityPreset, LanguageOption, EmbedCodeResponse models
affects: [06-agent-configuration, frontend-config-page]

tech-stack:
  added: []
  patterns: [separated ElevenLabs-bound vs DB-only config fields, single-fetch catalog endpoint]

key-files:
  created:
    - backend/agent_config_service.py
  modified:
    - backend/models.py
    - backend/main.py
    - backend/tests/test_agent_config.py

key-decisions:
  - "GET /api/voices returns voices, languages, AND personality_presets in single response for one-fetch frontend hydration"
  - "Widget-only changes (color, position) skip ElevenLabs API call, only update settings JSONB"
  - "Personality preset system_prompt uses {store_name} placeholder replaced with shop_domain at PUT time"
  - "Enable/disable toggle propagates to both agent_status column and settings.enabled JSONB field"

patterns-established:
  - "Config separation: ElevenLabs-bound fields (voice, greeting, language, personality) vs DB-only fields (widget_color, widget_position, enabled)"
  - "Catalog endpoint pattern: GET /api/voices as public, no-auth endpoint for static configuration options"

requirements-completed: [CFG-01, CFG-02, CFG-03, CFG-04, CFG-05, CFG-06, CFG-07]

duration: 4min
completed: 2026-03-14
---

# Phase 06 Plan 01: Agent Config Backend API Summary

**4 config endpoints with curated voices, personality presets, ElevenLabs-separated updates, and embed code generation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T10:22:01Z
- **Completed:** 2026-03-14T10:26:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created agent_config_service.py with 10 curated ElevenLabs voices, 6 personality presets with system_prompt templates, 28 supported languages, and embed code generator
- Added 4 new API endpoints: GET/PUT agent config, GET voices catalog, GET embed code
- PUT endpoint intelligently separates ElevenLabs-bound vs DB-only changes, avoiding unnecessary API calls
- 27 new tests all passing, 324 total tests with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Agent config service module + Pydantic models + test stubs** - `9ff2c95` (feat)
2. **Task 2: Four API endpoints with full integration** - `a99ddcf` (feat)

## Files Created/Modified
- `backend/agent_config_service.py` - Curated voices, personality presets, languages, embed code generator
- `backend/models.py` - VoiceOption, PersonalityPreset, LanguageOption, AgentConfigResponse, AgentConfigUpdate, EmbedCodeResponse
- `backend/main.py` - 4 new endpoints: GET/PUT /api/agent/config, GET /api/voices, GET /api/agent/embed-code
- `backend/tests/test_agent_config.py` - 27 tests covering service functions, models, and all endpoints

## Decisions Made
- GET /api/voices returns voices + languages + personality_presets in one response (plan checker recommendation)
- Widget-only changes (color, position) do NOT call ElevenLabs API (avoids unnecessary API calls)
- Personality preset system_prompt has {store_name} placeholder, resolved to shop_domain at update time
- Enable/disable toggle updates both agent_status column and settings.enabled JSONB

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend API contract ready for frontend config page (Plan 02)
- All endpoints follow existing auth patterns (require_store_owner)
- Public GET /api/voices endpoint provides catalog data without auth

---
*Phase: 06-agent-configuration*
*Completed: 2026-03-14*
