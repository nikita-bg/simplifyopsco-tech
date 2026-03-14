---
phase: 04-automation
plan: 02
subsystem: api
tags: [apscheduler, resend, email, elevenlabs, webhook, usage-tracking, automation, httpx, fastapi, cron]

# Dependency graph
requires:
  - phase: 04-automation/04-01
    provides: AutomationService singleton, EmailService.send_usage_alert, APScheduler lifecycle, ElevenLabsService singleton
  - phase: 02-knowledge-base
    provides: KBService.trigger_kb_rebuild, kb_service singleton

provides:
  - AutomationService.daily_kb_resync scheduled job (3 AM UTC, per-store error isolation)
  - AutomationService.daily_usage_check scheduled job (9 AM UTC, 80% threshold alerts)
  - AutomationService.register_webhooks_for_store (wired into run_onboarding)
  - ElevenLabsService.register_webhook (platform_settings.webhooks via update_agent)
  - post_call_webhook: store resolution from agent_id + minutes_used increment (ceil(duration/60))
  - Tier limits: trial=30, starter=100, growth=400, scale=2000 minutes

affects:
  - future billing phase (minutes_used accurately tracked per store for enforcement)
  - daily_analytics (conversation counts already tracked; minutes now also tracked)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - APScheduler cron jobs registered before scheduler.start() in service.start()
    - Per-store error isolation in scheduled jobs (try/except per row, never abort loop)
    - register_webhook as thin wrapper over update_agent (no new HTTP call pattern)
    - math.ceil(duration/60) for minute rounding in post-call webhook
    - Store-from-agent-id resolution: SELECT id FROM stores WHERE elevenlabs_agent_id = $1

key-files:
  created: []
  modified:
    - backend/automation_service.py (daily_kb_resync, daily_usage_check, register_webhooks_for_store, start() job registration, run_onboarding webhook step)
    - backend/elevenlabs_service.py (register_webhook method)
    - backend/main.py (post_call_webhook: store resolution from agent_id, minutes_used increment)
    - backend/tests/test_automation.py (17 new tests: TestScheduledSync, TestUsageAlerts, TestSchedulerJobs, TestElevenLabsWebhook, TestWebhookRegistration, TestPostCallUsageTracking)

key-decisions:
  - "register_webhook wraps update_agent — no new HTTP method needed, ElevenLabs webhooks live in platform_settings"
  - "Tier limits use roadmap MINUTES values (30/100/400/2000) not legacy session counts"
  - "math.ceil(duration/60) for minute tracking — merchant pays for partial minutes, consistent with telco billing convention"
  - "Store resolution from agent_id in post-call webhook enables ElevenLabs to call without store_id in metadata"
  - "register_webhooks_for_store wired into run_onboarding step 5 — every new agent auto-gets post-call webhook"

requirements-completed: [AUT-03, AUT-04, AUT-05]

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 4 Plan 2: Usage Monitoring and Webhook Registration Summary

**Scheduled KB resync (3 AM UTC) + usage alert checks (9 AM UTC) + ElevenLabs post-call webhook registration wired into onboarding + conversation minute tracking via ceil(duration/60)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T00:22:00Z
- **Completed:** 2026-03-14T00:26:00Z
- **Tasks:** 2 (TDD: 4 commits total — 2x RED + 2x GREEN)
- **Files modified:** 4

## Accomplishments

- Two APScheduler cron jobs added: `daily_kb_resync` (3 AM UTC) rebuilds KB for all active stores with per-store error isolation; `daily_usage_check` (9 AM UTC) sends Resend alerts at 80% of tier minute limit
- `ElevenLabsService.register_webhook` added as thin wrapper over `update_agent` with `platform_settings.webhooks`
- Webhook registration wired into `run_onboarding` — every new agent automatically receives the post-call webhook
- Post-call webhook now resolves `store_id` from `elevenlabs_agent_id` when absent in payload, then increments `minutes_used` via `ceil(duration/60)`
- 17 new tests across 5 test classes; full suite 288 tests (0 regressions)

## Task Commits

Each task committed atomically:

1. **Task 1 (RED): Add failing tests for scheduled sync and usage alerts** — `b6dc2e8`
2. **Task 1 (GREEN): daily_kb_resync, daily_usage_check, APScheduler job registration** — `b747127`
3. **Task 2 (RED): Add failing tests for webhook registration and usage tracking** — `5f52f70`
4. **Task 2 (GREEN): register_webhook, register_webhooks_for_store, post-call usage tracking** — `1792ce9`

## Files Created/Modified

- `backend/automation_service.py` — Added `register_webhooks_for_store`, `daily_kb_resync`, `daily_usage_check`; updated `start()` to register cron jobs; wired webhook registration into `run_onboarding` as step 5
- `backend/elevenlabs_service.py` — Added `register_webhook(agent_id, webhook_url)` wrapping `update_agent` with platform_settings.webhooks; graceful error handling returns `{}`
- `backend/main.py` — Updated `post_call_webhook`: store resolution from `elevenlabs_agent_id`, `minutes_used` increment via `math.ceil(duration/60)`, both wrapped in try/except with WARNING log
- `backend/tests/test_automation.py` — 17 new tests: TestScheduledSync (3), TestUsageAlerts (5), TestSchedulerJobs (2), TestElevenLabsWebhook (2), TestWebhookRegistration (2), TestPostCallUsageTracking (3)

## Decisions Made

- **register_webhook wraps update_agent:** ElevenLabs webhook config lives in `platform_settings.webhooks` — no new HTTP endpoint needed, reuses existing PATCH method
- **Roadmap minute limits (not legacy session counts):** trial=30, starter=100, growth=400, scale=2000 — aligns with billing page copy and future enforcement
- **ceil(duration/60) for minute billing:** Partial minutes round up — industry standard for voice/telephony billing, prevents gaming the system with many short calls
- **Store resolution from agent_id:** ElevenLabs sends `agent_id` in post-call payload; resolving store via lookup enables webhook to work even when `store_id` is not in metadata

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- backend/automation_service.py: FOUND
- backend/elevenlabs_service.py: FOUND
- backend/main.py: FOUND
- backend/tests/test_automation.py: FOUND
- .planning/phases/04-automation/04-02-SUMMARY.md: FOUND (this file)
- Commit b6dc2e8 (RED tests T1): FOUND
- Commit b747127 (GREEN impl T1): FOUND
- Commit 5f52f70 (RED tests T2): FOUND
- Commit 1792ce9 (GREEN impl T2): FOUND

---
*Phase: 04-automation*
*Completed: 2026-03-14*
