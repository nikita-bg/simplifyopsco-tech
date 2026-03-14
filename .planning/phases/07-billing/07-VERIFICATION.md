---
phase: 07-billing
verified: 2026-03-14T12:00:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
human_verification:
  - test: "Stripe Checkout redirect"
    expected: "Clicking Upgrade on a non-current plan POSTs to /api/stripe/checkout and redirects browser to Stripe Checkout page"
    why_human: "Requires live Stripe credentials and a real browser redirect — not testable programmatically"
  - test: "Stripe Customer Portal link"
    expected: "Clicking Manage Subscription POSTs to /api/stripe/portal and opens the Stripe Customer Portal"
    why_human: "Requires live Stripe Customer Portal to be configured in the Stripe Dashboard"
  - test: "Trial expiry prompt in sidebar and billing page"
    expected: "When trial_ends_at is in the past, the sidebar shows 'Trial expired — choose a plan' warning and billing page shows red expired banner"
    why_human: "Requires a store with past trial_ends_at in a real or test DB — cannot be driven programmatically"
  - test: "invoice.paid billing cycle reset in production"
    expected: "When Stripe fires invoice.paid webhook, minutes_used resets to 0 and limit_reached agents become active"
    why_human: "Requires live Stripe webhook delivery — unit tests cover the handler logic, but end-to-end requires Stripe Dashboard configuration"
---

# Phase 7: Billing Verification Report

**Phase Goal:** Merchants are on the right subscription tier with accurate usage tracking and self-service billing management
**Verified:** 2026-03-14T12:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Subscription endpoint returns minutes_used/minutes_limit (not sessions) | VERIFIED | `main.py:1877,1891-1892` — query selects `minutes_used`, response uses `minutes_used`/`minutes_limit`; `sessions_used` nowhere in response |
| 2 | Tier limits consistent everywhere: trial=30, starter=100, growth=400, scale=2000 | VERIFIED | `stripe_service.py:15-20` — single TIER_LIMITS dict; imported by `main.py:62` and `automation_service.py:20`; 11/11 billing tests pass |
| 3 | On invoice.paid webhook, minutes_used resets to 0 for the store | VERIFIED | `stripe_service.py:126-153` — `invoice.paid` handler UPDATEs `minutes_used = 0, billing_period_start = NOW()`; test_invoice_paid_resets_minutes_used passes |
| 4 | At 110% of tier limit, agent_status is set to limit_reached | VERIFIED | `main.py:461-477` (post-call, integer arithmetic `*10 >= *11`); `automation_service.py:139-156` (daily check, same logic); both tests pass |
| 5 | Trial stores with expired trial_ends_at are prompted to upgrade | VERIFIED | `main.py:1882-1886` computes `is_trial_expired`; `billing/page.tsx:194-216` renders red expired banner; `DashboardSidebar.tsx:103-106` renders sidebar warning |
| 6 | New stores have trial_ends_at = NOW() + 14 days at creation | VERIFIED | `main.py:1574-1581` (widget-based creation) and `main.py:1774-1776` (onboarding creation) both include `trial_ends_at = NOW() + INTERVAL '14 days'` |
| 7 | 80% usage alert email is working (Phase 4) | VERIFIED | `automation_service.py:158-198` — `if minutes_used < limit * 0.8: continue`, then calls `email_service.send_usage_alert()`; logic intact and untouched by Phase 7 |
| 8 | Billing page shows plan cards with correct prices/minute limits | VERIFIED | `billing/page.tsx:22-45` — PLANS constant has Starter $39/100min, Growth $99/400min, Scale $299/2000min |
| 9 | Sidebar shows usage warning at 70%+ or trial expiry | VERIFIED | `DashboardSidebar.tsx:45-62,101-119` — fetches subscription data, renders warning widget above nav when `minutes_used/minutes_limit > 0.7 OR is_trial_expired` |

**Score:** 9/9 truths verified

---

### Required Artifacts

| Artifact | Provided | Status | Details |
|----------|---------|--------|---------|
| `backend/tests/test_billing.py` | 11 TDD tests: subscription endpoint, invoice.paid, 110% enforcement, shared TIER_LIMITS | VERIFIED | 386 lines, 11 tests, all passing (confirmed by live run) |
| `backend/stripe_service.py` | TIER_LIMITS constant, invoice.paid handler | VERIFIED | TIER_LIMITS at lines 15-20; invoice.paid handler at lines 126-153 |
| `backend/automation_service.py` | 110% enforcement in daily_usage_check, imports shared TIER_LIMITS | VERIFIED | `from backend.stripe_service import TIER_LIMITS` at line 20; enforcement at lines 139-156 |
| `backend/main.py` | Fixed subscription endpoint (minutes-based), trial_ends_at at store creation, 110% post-call enforcement | VERIFIED | Subscription endpoint at lines 1860-1923; store creation at lines 1574-1581 and 1774-1776; post-call at lines 461-477 |
| `frontend/src/app/dashboard/billing/page.tsx` | Plan cards, usage meter, trial banner, upgrade/portal flow | VERIFIED | 376 lines; all UI sections present and wired to API |
| `frontend/src/components/DashboardSidebar.tsx` | Usage warning widget at 70%+ or trial expiry | VERIFIED | Widget at lines 101-119; subscription fetch at lines 51-62 |

---

### Key Link Verification

#### Plan 01 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `backend/stripe_service.py` | `stores.minutes_used` | invoice.paid resets minutes_used = 0 | WIRED | `stripe_service.py:138-143` — `SET minutes_used = 0, billing_period_start = NOW()` |
| `backend/automation_service.py` | `stores.agent_status` | 110% check sets agent_status = limit_reached | WIRED | `automation_service.py:141-145` — `UPDATE stores SET agent_status = 'limit_reached'` |
| `backend/main.py` | `stores.minutes_used` | subscription endpoint reads minutes_used column | WIRED | `main.py:1868-1869` — SELECT includes `minutes_used`; line 1877 assigns it; line 1891 returns it |
| `backend/main.py` | `stores.trial_ends_at` | store creation INSERT sets trial_ends_at | WIRED | `main.py:1578-1579` and `1774-1775` — both INSERT statements include `trial_ends_at = NOW() + INTERVAL '14 days'` |

#### Plan 02 Key Links

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `billing/page.tsx` | `/api/stores/{store_id}/subscription` | apiFetch in useEffect | WIRED | `billing/page.tsx:66` — `apiFetch(\`/api/stores/${storeId}/subscription\`)` inside `fetchSubscription` called from `useEffect` |
| `billing/page.tsx` | `/api/stripe/checkout` | POST with store_id and plan | WIRED | `billing/page.tsx:82-88` — `apiFetch("/api/stripe/checkout", { method: "POST", body: ... })` in handleUpgrade; redirects to `checkout_url` |
| `billing/page.tsx` | `/api/stripe/portal` | POST with store_id | WIRED | `billing/page.tsx:101-110` — `apiFetch("/api/stripe/portal", { method: "POST", body: ... })` in openCustomerPortal; redirects to `portal_url` |

All key links: WIRED.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| BIL-01 | 07-01, 07-02 | Three subscription tiers: Starter ($39), Growth ($99), Scale ($299) | SATISFIED | `billing/page.tsx:22-45` PLANS constant; `stripe_service.py:22-26` PLAN_MAP |
| BIL-02 | 07-01, 07-02 | Included conversation minutes per tier (100/400/2000) | SATISFIED | `stripe_service.py:15-20` TIER_LIMITS; billing page PLANS array minutes values |
| BIL-03 | 07-01 | Usage tracking: minutes used per merchant per billing cycle | SATISFIED | `main.py:454` updates `minutes_used` on each post-call webhook; invoice.paid resets it |
| BIL-04 | 07-02 | Usage meter visible in dashboard ("67 of 100 minutes used") | SATISFIED | `billing/page.tsx:219-245` — "X of Y minutes" display with color-coded progress bar |
| BIL-05 | Phase 4 (not Phase 7) | Warning email at 80% usage (n8n automation) | SATISFIED (Phase 4) | `automation_service.py:158-198` — 80% threshold check and `email_service.send_usage_alert()` call intact |
| BIL-06 | 07-01 | Soft limit: 10% overage buffer before disabling (not hard cutoff) | SATISFIED | `main.py:469` — `*10 >= *11` integer arithmetic for 110%; `automation_service.py:139` same logic |
| BIL-07 | 07-02 | Upgrade prompt in-app when limit approached/reached | SATISFIED | `DashboardSidebar.tsx:101-119` — warning at 70%+; `billing/page.tsx:233-244` — warning text at 80%+ and 100%+ |
| BIL-08 | 07-01, 07-02 | Stripe Customer Portal for self-service billing management | SATISFIED | `billing/page.tsx:97-120` — openCustomerPortal calls `/api/stripe/portal`; backend `stripe_service.py:58-71` |
| BIL-09 | 07-01, 07-02 | 14-day free trial, no credit card required | SATISFIED | `main.py:1579,1775` — both store creation paths set `trial_ends_at = NOW() + INTERVAL '14 days'`; trial banner shown in billing page |

**BIL-05 note:** BIL-05 was implemented in Phase 4 and is NOT claimed by Phase 7 plans. It was verified as still intact and functioning in `automation_service.py`. REQUIREMENTS.md correctly marks it "Pending" (meaning the n8n automation version was the original plan; the in-process APScheduler version delivers equivalent functionality via Phase 4's `daily_usage_check`). This is a documentation discrepancy in REQUIREMENTS.md, not a code gap.

**All 9 phase-7 requirement IDs (BIL-01 through BIL-09) are accounted for.** No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `billing/page.tsx` | 112 | `console.error("Failed to fetch subscription:", ...)` | Info | Normal error logging, not a stub |
| `billing/page.tsx` | 94 | `console.error("Checkout failed:", ...)` | Info | Normal error logging, not a stub |
| `billing/page.tsx` | 111-113 | `alert(...)` fallback when portal not configured | Warning | Alert dialogs are non-ideal UX but functional; no in-page error state |
| `main.py` | 459 | `datetime.utcnow()` deprecation (pre-existing) | Info | Not introduced by Phase 7; pre-existing warning documented in CLAUDE.md |

No blocker anti-patterns. The `alert()` usage (lines 111-113 in billing/page.tsx) is a minor UX concern but does not block the goal.

---

### Human Verification Required

#### 1. Stripe Checkout Redirect

**Test:** With Stripe env vars configured, click Upgrade on any non-current plan card on the billing page.
**Expected:** Browser redirects to Stripe Checkout with the correct plan pre-selected. After payment, `checkout.session.completed` webhook fires and `subscription_tier` updates in DB.
**Why human:** Requires live Stripe credentials, configured products, and a real browser session.

#### 2. Stripe Customer Portal

**Test:** With a paid subscriber store, click "Manage Subscription" on the billing page.
**Expected:** Browser redirects to the Stripe Customer Portal. Subscription changes made there fire `customer.subscription.updated` webhook and update the store's `subscription_tier` in DB.
**Why human:** Requires Stripe Customer Portal to be enabled in Stripe Dashboard with a return URL configured.

#### 3. Trial Expiry UX End-to-End

**Test:** Set a store's `trial_ends_at` to a past timestamp in the DB. Open the billing page and sidebar.
**Expected:** Billing page shows the red "Trial Expired" banner with "Choose a Plan" button. Sidebar shows "Trial expired — choose a plan" warning linking to billing page.
**Why human:** Requires DB access to create a past `trial_ends_at` and a real browser session to observe the UI.

#### 4. invoice.paid Webhook End-to-End

**Test:** With a paid subscriber store at or near usage limit, simulate an invoice.paid Stripe webhook (via Stripe Dashboard -> Send test webhook or `stripe trigger invoice.paid`).
**Expected:** `minutes_used` resets to 0 in DB. If agent was `limit_reached`, it becomes `active` again.
**Why human:** Requires Stripe CLI or Dashboard to trigger the webhook against the running server with correct signature.

---

### Gaps Summary

No gaps. All automated checks pass:

- 11 billing tests pass (confirmed by live test run)
- 335 total backend tests pass with no regressions
- TypeScript compiles without errors
- All 9 requirement IDs (BIL-01 through BIL-09) have implementation evidence
- All key links are wired (both backend logic and frontend API calls)
- TIER_LIMITS is a single source of truth in `stripe_service.py`, imported by both `main.py` and `automation_service.py`
- BIL-05 (80% email alert from Phase 4) remains intact in `automation_service.py:158-198`

4 items flagged for human verification due to reliance on live Stripe configuration — these are external dependency items, not implementation gaps.

---

### Commit Verification

All commits documented in SUMMARY files confirmed present in git history:

| Commit | Description |
|--------|-------------|
| `cf198bf` | test(07-01): add failing billing tests (TDD RED) |
| `1df45f2` | feat(07-01): implement billing infrastructure (TDD GREEN) |
| `5dd70e3` | fix(07-01): update subscription test fixtures for minutes-based response |
| `de37f08` | feat(07-02): rebuild billing page with plan cards, usage meter, and upgrade flow |
| `4e32dae` | feat(07-02): add usage warning indicator in dashboard sidebar |

---

_Verified: 2026-03-14T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
