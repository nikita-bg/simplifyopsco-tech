---
phase: 04-automation
plan: 01
subsystem: api
tags: [apscheduler, resend, email, automation, onboarding, httpx, fastapi, background-tasks]

# Dependency graph
requires:
  - phase: 01-agents
    provides: ElevenLabsService.create_agent, agent_templates table, elevenlabs_service singleton
  - phase: 02-knowledge-base
    provides: KBService.trigger_kb_rebuild, kb_service singleton
  - phase: 03-widget
    provides: widget-embed.js script tag, store agent_status flow

provides:
  - AutomationService with AsyncIOScheduler lifecycle (start/stop in FastAPI lifespan)
  - run_onboarding workflow: agent creation -> KB sync -> welcome email (fire-and-forget)
  - EmailService with send_welcome_email (embed snippet) and send_usage_alert via raw httpx -> Resend API
  - RESEND_API_KEY and RESEND_FROM_EMAIL settings in config.py
  - BackgroundTasks trigger on POST /api/stores/create

affects:
  - 04-automation/04-02 (usage monitoring — will use email_service.send_usage_alert)
  - future billing phase (automation hooks for subscription events)

# Tech tracking
tech-stack:
  added:
    - apscheduler==3.11.2 (AsyncIOScheduler for in-process scheduling)
  patterns:
    - Raw httpx for Resend API (consistent with elevenlabs_service.py pattern — no SDK)
    - BackgroundTasks for fire-and-forget onboarding (non-blocking response)
    - Top-level try/except in background tasks (never crash BackgroundTasks runner)
    - Graceful email failure (log + return False, never raise)
    - Non-blocking KB sync (catch + log + continue)
    - Recoverable agent failure state (agent_status='failed', skip email)

key-files:
  created:
    - backend/email_service.py
    - backend/automation_service.py
    - backend/tests/test_automation.py
  modified:
    - backend/config.py (RESEND_API_KEY, RESEND_FROM_EMAIL)
    - backend/main.py (lifespan scheduler start/stop, BackgroundTasks on store creation)
    - .env.example (Resend placeholder vars)

key-decisions:
  - "Use raw httpx for Resend API (consistent with elevenlabs_service.py — no SDK dependency)"
  - "APScheduler 3.x AsyncIOScheduler (4.x not available); start() is synchronous but safe in async lifespan"
  - "BackgroundTasks for onboarding (not APScheduler jobs) — simpler, no job persistence needed for per-request triggers"
  - "Top-level try/except in run_onboarding prevents any unhandled exception from crashing FastAPI BackgroundTasks"
  - "KB sync failure is non-blocking: logged as warning, email still sent"
  - "Agent creation failure is hard stop: agent_status='failed' set, email NOT sent, KB NOT attempted"
  - "owner_email resolved from neon_auth.users_sync at workflow start when not passed by caller"

patterns-established:
  - "Email graceful failure: wrap httpx call in try/except, return {'sent': False} on any exception"
  - "Onboarding error isolation: each step (agent, KB, email) has independent error handling with appropriate severity"
  - "APScheduler lifecycle: start in lifespan startup after db.connect(), stop in shutdown before db.disconnect()"

requirements-completed: [AUT-01, AUT-02, AUT-06]

# Metrics
duration: 18min
completed: 2026-03-14
---

# Phase 4 Plan 1: Automation Foundation Summary

**APScheduler-based in-process onboarding workflow with Resend email delivery: agent creation -> KB sync -> embed snippet welcome email, with per-step error isolation via raw httpx**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-14T00:00:00Z
- **Completed:** 2026-03-14T00:18:00Z
- **Tasks:** 2 (TDD: 3 commits for Task 1)
- **Files modified:** 6

## Accomplishments

- Full onboarding workflow implemented: new store -> ElevenLabs agent -> KB sync -> Resend welcome email with embed snippet
- Error isolation: agent failure sets agent_status='failed' without sending email; KB failure logs warning and continues
- APScheduler AsyncIOScheduler wired into FastAPI lifespan (start on startup, stop on shutdown)
- 13 new tests, all passing; full suite 271 tests (0 regressions)
- Resend email service using raw httpx consistent with existing codebase pattern

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Add failing tests** - `7885979` (test)
2. **Task 1 (GREEN): email_service + automation_service** - `05a020f` (feat)
3. **Task 2: Wire automation into FastAPI** - `0fa9f44` (feat)

## Files Created/Modified

- `backend/email_service.py` - EmailService with send_welcome_email (embed snippet, dashboard link) and send_usage_alert (usage stats, upgrade CTA); raw httpx to Resend API; graceful failure handling
- `backend/automation_service.py` - AutomationService with AsyncIOScheduler lifecycle; run_onboarding (agent -> KB -> email); per-step error isolation; module singleton
- `backend/tests/test_automation.py` - 13 tests across TestEmailService, TestOnboardingWorkflow, TestAutomationLifecycle
- `backend/config.py` - Added RESEND_API_KEY (Optional[str] = None) and RESEND_FROM_EMAIL (str = "onboarding@simplifyops.co")
- `backend/main.py` - Import automation_service; lifespan: start/stop scheduler + Scheduler [OK] print; POST /api/stores/create: BackgroundTasks param + run_onboarding trigger
- `.env.example` - Added RESEND_API_KEY and RESEND_FROM_EMAIL placeholders

## Decisions Made

- **Raw httpx for Resend:** No SDK dependency, consistent with elevenlabs_service.py pattern established in Phase 1
- **BackgroundTasks over APScheduler jobs for onboarding:** Per-request triggers don't need job persistence; BackgroundTasks is simpler and already wired into FastAPI
- **APScheduler 3.x (not 4.x):** APScheduler 4.x was not available; 3.11.2 with AsyncIOScheduler works well with asyncio event loop
- **owner_email resolved in workflow:** Caller passes None; workflow fetches from neon_auth.users_sync — decouples endpoint from auth layer

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- APScheduler was not installed — installed apscheduler==3.11.2 (Rule 3: blocking dependency). plan mentioned to fall back to 3.10+ if 4.x unavailable, so this was anticipated.

## User Setup Required

External services require configuration before welcome emails work:

- `RESEND_API_KEY`: Add to Railway backend environment (key is in local .env)
- `RESEND_FROM_EMAIL`: Set to `onboarding@simplifyops.co` (must be a verified sender domain in Resend dashboard)
- Verify sender domain `simplifyops.co` in Resend Dashboard -> Domains before emails will actually deliver

## Next Phase Readiness

- 04-02 (Usage Monitoring) can use `email_service.send_usage_alert` directly — singleton is ready
- APScheduler is running and can accept scheduled jobs from 04-02
- Welcome email flow complete; all new stores will automatically receive embed snippet on creation

## Self-Check: PASSED

- backend/email_service.py: FOUND
- backend/automation_service.py: FOUND
- backend/tests/test_automation.py: FOUND
- .planning/phases/04-automation/04-01-SUMMARY.md: FOUND
- Commit 7885979 (RED tests): FOUND
- Commit 05a020f (GREEN implementation): FOUND
- Commit 0fa9f44 (Task 2 wiring): FOUND

---
*Phase: 04-automation*
*Completed: 2026-03-14*
