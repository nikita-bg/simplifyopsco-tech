---
phase: 07-billing
plan: 01
subsystem: payments
tags: [stripe, billing, usage-enforcement, tdd, tier-limits, trial-expiry]

# Dependency graph
requires:
  - phase: 04-automation
    provides: daily_usage_check with 80% alert, minutes_used tracking in post-call webhook
provides:
  - TIER_LIMITS shared constant in stripe_service.py
  - invoice.paid webhook handler (minutes_used reset + agent_status restore)
  - 110% usage enforcement in post-call webhook and daily_usage_check
  - Subscription endpoint with minutes_used/minutes_limit response format
  - trial_ends_at set at store creation, is_trial_expired in subscription response
affects: [07-billing-plan-02, frontend-billing-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [integer-arithmetic-for-percentage-comparison, shared-constants-single-source-of-truth]

key-files:
  created:
    - backend/tests/test_billing.py
  modified:
    - backend/stripe_service.py
    - backend/automation_service.py
    - backend/main.py
    - backend/tests/test_api_store_settings.py

key-decisions:
  - "Integer arithmetic for 110% comparison (minutes*10 >= limit*11) to avoid floating-point precision issues"
  - "TIER_LIMITS defined in stripe_service.py as single source of truth, imported by automation_service.py"
  - "Direct logic unit tests for 110% enforcement instead of full HTTP integration tests (simpler mocking)"

patterns-established:
  - "Shared constants: TIER_LIMITS lives in stripe_service.py, imported by all consumers"
  - "Integer percentage comparison: multiply both sides to avoid float precision"

requirements-completed: [BIL-01, BIL-02, BIL-03, BIL-06, BIL-08, BIL-09]

# Metrics
duration: 9min
completed: 2026-03-14
---

# Phase 7 Plan 1: Billing Infrastructure Summary

**TDD billing backend: minutes-based subscription endpoint, invoice.paid cycle reset, 110% usage enforcement, trial expiry detection, shared TIER_LIMITS constant**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-14T11:22:13Z
- **Completed:** 2026-03-14T11:31:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Fixed subscription endpoint to return minutes_used/minutes_limit instead of legacy sessions_used/sessions_limit with correct tier limits (trial=30, starter=100, growth=400, scale=2000)
- Added invoice.paid webhook handler that resets minutes_used to 0 and restores agent_status from limit_reached to active
- Added 110% usage enforcement in both post-call webhook (real-time) and daily_usage_check (belt-and-suspenders)
- Set trial_ends_at = NOW() + 14 days at store creation (both creation paths) with is_trial_expired boolean in response
- Extracted TIER_LIMITS to stripe_service.py as single source of truth, imported by automation_service.py
- 11 new billing tests, 335 total tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1a: Write failing billing tests (RED)** - `cf198bf` (test)
2. **Task 1b: Implement billing infrastructure (GREEN)** - `1df45f2` (feat)
3. **Task 2: Fix regressions in existing tests** - `5dd70e3` (fix)

## Files Created/Modified
- `backend/tests/test_billing.py` - 11 TDD tests: subscription endpoint, invoice.paid, 110% enforcement, shared TIER_LIMITS
- `backend/stripe_service.py` - Added TIER_LIMITS constant and invoice.paid webhook handler
- `backend/automation_service.py` - Imports shared TIER_LIMITS, added 110% enforcement in daily_usage_check
- `backend/main.py` - Fixed subscription endpoint (minutes-based), added 110% post-call enforcement, trial_ends_at at store creation
- `backend/tests/test_api_store_settings.py` - Updated subscription test fixtures for new response format

## Decisions Made
- Used integer arithmetic (minutes*10 >= limit*11) for 110% comparison to avoid floating-point precision issues (Python's 100*1.1 = 110.00000000000001)
- TIER_LIMITS defined in stripe_service.py as single source of truth, not duplicated in automation_service.py
- Direct logic unit tests for 110% enforcement instead of full HTTP integration tests (simpler mocking, same coverage)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Floating-point precision in 110% comparison**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `minutes_used >= limit * 1.1` fails at exactly 110% because Python's `100 * 1.1 = 110.00000000000001`
- **Fix:** Changed to integer arithmetic: `minutes_used * 10 >= limit * 11`
- **Files modified:** backend/main.py, backend/automation_service.py, backend/tests/test_billing.py
- **Verification:** Tests pass for both boundary cases (110 minutes = below, 111 = at/above)
- **Committed in:** 1df45f2

**2. [Rule 1 - Bug] Existing test fixture missing new response fields**
- **Found during:** Task 2
- **Issue:** test_api_store_settings.py mock lacked minutes_used and trial_ends_at, causing KeyError
- **Fix:** Updated mock data and assertions to match new subscription endpoint response format
- **Files modified:** backend/tests/test_api_store_settings.py
- **Committed in:** 5dd70e3

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

**External services require manual configuration.** Stripe products and webhooks must be configured in the Stripe Dashboard:
- Create 3 products with monthly recurring prices: Starter $39, Growth $99, Scale $299
- Add webhook endpoint URL pointing to /api/stripe/webhook
- Set environment variables: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, STRIPE_SCALE_PRICE_ID

## Next Phase Readiness
- Billing backend infrastructure complete, ready for frontend billing UI (plan 07-02)
- Stripe webhooks need dashboard configuration before production use
- 80% usage alert email (Phase 4) preserved and working alongside new 110% enforcement

---
*Phase: 07-billing*
*Completed: 2026-03-14*
