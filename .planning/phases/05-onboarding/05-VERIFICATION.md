---
phase: 05-onboarding
verified: 2026-03-14T12:30:00Z
status: gaps_found
score: 9/10 must-haves verified
gaps:
  - truth: "Onboarding status transitions through pending -> creating_agent -> syncing_kb -> sending_email -> complete"
    status: partial
    reason: "The backend code references onboarding_step, onboarding_error, and store_name columns in stores table INSERT and SELECT queries, but no migration file adds these columns to the DB schema. The stores table (001_shopify_schema.sql) only has: id, shop_domain, access_token_encrypted, owner_id, subscription_tier, stripe_customer_id, stripe_subscription_id, settings, created_at, updated_at. Migrations 002-004 add agent/KB columns but none adds onboarding_step, onboarding_error, or store_name. Production deployment would fail on the INSERT with 'column does not exist'."
    artifacts:
      - path: "migrations/005_onboarding_columns.sql"
        issue: "File does not exist — migration to add onboarding_step, onboarding_error, store_name columns to stores table is missing"
      - path: "migrations/001_shopify_schema.sql"
        issue: "stores CREATE TABLE lacks onboarding_step TEXT, onboarding_error TEXT, store_name TEXT columns"
    missing:
      - "Create migrations/005_onboarding_columns.sql with: ALTER TABLE stores ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'none'; ALTER TABLE stores ADD COLUMN IF NOT EXISTS onboarding_error TEXT; ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_name TEXT;"
human_verification:
  - test: "Full onboarding flow end-to-end under 5 minutes"
    expected: "New merchant signs up, form submits, progress indicator animates through steps, agent created, dashboard loads — all within 5 minutes"
    why_human: "End-to-end timing requires live ElevenLabs API, real DB, and real KB sync. Cannot verify programmatically."
  - test: "Shopify OAuth redirect flow"
    expected: "Clicking 'Connect Shopify Instead' and entering a domain triggers redirect to Shopify install URL, OAuth completes, and merchant lands in dashboard"
    why_human: "External OAuth flow with Shopify requires live credentials and real redirect."
  - test: "Progress indicator visual animation"
    expected: "Steps animate between pending (gray circle), in_progress (spinning loader), and completed (green checkmark) as polling updates arrive"
    why_human: "Visual/animation behavior cannot be verified programmatically."
---

# Phase 5: Onboarding Verification Report

**Phase Goal:** A new merchant goes from signup to hearing their AI agent talk about their products in under 5 minutes
**Verified:** 2026-03-14T12:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Signup form is a single page (store name, website URL, store type) with no unnecessary fields | VERIFIED | `Onboarding.tsx` renders store name input, website URL input, and store type select on one page in 'form' view. Three required fields, no extras. |
| 2 | After signup, agent is auto-created within 30 seconds and merchant sees a live progress indicator ("Creating agent... Syncing products...") | VERIFIED (partial human) | `OnboardingProgress.tsx` polls `/api/stores/{id}/onboarding-status` every 2 seconds with step indicators. `run_onboarding` updates DB at each step. Timing requires live environment. |
| 3 | Shopify merchants can connect via 1-click OAuth install flow without leaving onboarding | VERIFIED (human needed) | Onboarding.tsx `handleShopifyConnect` calls `/shopify/auth?shop=...`, receives `install_url`, redirects. Backend `GET /shopify/auth` exists (line 160 main.py). OAuth callback requires live Shopify. |
| 4 | Welcome email with embed code snippet is sent automatically on successful agent creation | VERIFIED | `email_service.send_welcome_email()` sends HTML email with `<script>` embed snippet (lines 49-52 email_service.py). Called in `run_onboarding` at `sending_email` step. |
| 5 | Default agent config (friendly voice, blue widget, bottom-right position, English) means agent works immediately with zero configuration | VERIFIED | `003_seed_agent_templates.sql` seeds 3 templates (online_store, service_business, lead_gen) each with `eleven_flash_v2_5` voice, English language, and sensible prompts. `run_onboarding` uses store_type to select the matching default template. |

**From PLAN 05-01 must_haves (truths):**

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 6 | POST /api/stores/create accepts store_name and store_type fields alongside site_url | VERIFIED | Lines 1727-1735 main.py extract store_name (optional, max 100 chars) and store_type (validated against VALID_STORE_TYPES). Returns all fields in response. |
| 7 | store_type from the form maps to the correct agent template | VERIFIED | automation_service.py line 229: `WHERE type = $1 AND is_default = TRUE` with store_type parameter. |
| 8 | GET /api/stores/{store_id}/onboarding-status returns current onboarding step and completion state | VERIFIED | Endpoint at line 1773 main.py returns step, completed_steps, is_complete, is_failed, error, has_agent. |
| 9 | Onboarding status transitions through pending -> creating_agent -> syncing_kb -> sending_email -> complete | PARTIAL | Code updates DB step at each stage (lines 240, 283, 297, 332 automation_service.py). **However: no migration adds onboarding_step, onboarding_error, store_name columns to stores table. Production INSERT will fail.** |
| 10 | Failed onboarding sets status to failed with a human-readable error reason | VERIFIED | Lines 257-260 automation_service.py: sets `onboarding_step='failed', onboarding_error='Agent creation failed: {exc}'`. Top-level catch also sets failed state (lines 346-350). |

**Score:** 9/10 truths verified (1 partial due to missing DB migration)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `backend/tests/test_onboarding.py` | Tests for onboarding status endpoint and enhanced store creation | VERIFIED | 9 tests across 3 classes: TestStoreCreateEnhanced (3), TestOnboardingStatus (3), TestRunOnboardingSteps (3). All 9 pass. |
| `backend/main.py` | Enhanced /api/stores/create + new /api/stores/{store_id}/onboarding-status endpoint | VERIFIED | VALID_STORE_TYPES (line 1708), enhanced create_store (line 1712), get_onboarding_status (line 1773). Contains "onboarding-status". |
| `backend/automation_service.py` | Step-by-step status updates during run_onboarding | VERIFIED | run_onboarding signature accepts store_type (line 195). DB executes at creating_agent, syncing_kb, sending_email, complete, failed steps. Contains "onboarding_step". |
| `frontend/src/components/Onboarding.tsx` | Enhanced form with store name, URL, type dropdown, and Shopify connect | VERIFIED | Single-page form with all three fields, "or" divider, Shopify connect button, progress state (line 230 renders OnboardingProgress). Contains "store_name". |
| `frontend/src/components/OnboardingProgress.tsx` | Progress indicator polling onboarding status | VERIFIED | Polls `/api/stores/${storeId}/onboarding-status` every 2 seconds (line 94), calls refetch() on completion (line 73), shows error state with retry. Contains "onboarding-status". |
| `migrations/005_onboarding_columns.sql` | Migration to add onboarding_step, onboarding_error, store_name columns | MISSING | No migration file exists. stores table schema in 001_shopify_schema.sql does not include these columns. Migrations 002-004 add other columns but not the onboarding ones. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `Onboarding.tsx (handleWebsiteCreate)` | `POST /api/stores/create` | `apiFetch with store_name, site_url, store_type in body` | VERIFIED | Line 57-63: `apiFetch("/api/stores/create", { method: "POST", body: JSON.stringify({ store_name, site_url, store_type }) })` |
| `OnboardingProgress.tsx` | `GET /api/stores/{storeId}/onboarding-status` | `polling fetch every 2 seconds via setInterval` | VERIFIED | Line 62: `apiFetch(\`/api/stores/${storeId}/onboarding-status\`)` inside setInterval(poll, 2000) at line 94. |
| `OnboardingProgress.tsx` | `store-context.tsx` | `calls refetch() when is_complete is true to transition to dashboard` | VERIFIED | Line 53: `const { refetch } = useStore()`. Line 73: `setTimeout(() => { refetch(); }, 1500)` when `data.is_complete`. |
| `main.py (POST /api/stores/create)` | `automation_service.py (run_onboarding)` | `BackgroundTasks passes store_type so template lookup uses it` | VERIFIED | Lines 1754-1759: `background_tasks.add_task(automation_service.run_onboarding, store_id, None, store_type)`. Pattern "run_onboarding.*store_type" present. |
| `automation_service.py (run_onboarding)` | `stores table (onboarding_step column)` | `UPDATE stores SET onboarding_step at each stage` | PARTIAL | Code executes correct UPDATE statements. Column does not exist in DB schema (no migration). |
| `main.py (GET onboarding-status)` | `stores table` | `SELECT onboarding_step, agent_status FROM stores` | PARTIAL | SELECT query correctly targets onboarding_step, onboarding_error, agent_status, store_name, elevenlabs_agent_id (line 1782). Columns do not exist in DB schema. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| ONB-01 | 05-01, 05-02 | Single-page signup form (store name, website URL, store type) | SATISFIED | Onboarding.tsx form view has all three fields on one page. POST /api/stores/create accepts and persists them. |
| ONB-02 | 05-01 | Agent auto-created within 30 seconds of signup | SATISFIED (human timing) | run_onboarding is fire-and-forget background task. ElevenLabs agent creation is the bottleneck. Timing verified by plan; human confirmation needed. |
| ONB-03 | 05-02 | Shopify 1-click connect via OAuth install flow | SATISFIED (human OAuth) | handleShopifyConnect in Onboarding.tsx calls /shopify/auth, receives install_url, redirects. Backend endpoint exists. OAuth flow requires live Shopify. |
| ONB-04 | 05-01, 05-02 | Progress indicator during async agent creation | SATISFIED | OnboardingProgress.tsx polls every 2 seconds with 4-step vertical list showing completed/in_progress/pending states. |
| ONB-05 | 05-01 | Welcome email with embed code snippet sent automatically | SATISFIED | email_service.send_welcome_email() sends HTML email with script tag embed snippet. Called in run_onboarding at sending_email step. |
| ONB-06 | 05-01, 05-02 | Default sensible agent config (friendly voice, blue widget, bottom-right, English) | SATISFIED | 003_seed_agent_templates.sql seeds defaults for all 3 store types. store_type parameter selects correct template. Agent uses eleven_flash_v2_5 voice and English. |
| ONB-07 | 05-02 | Time to "aha moment" under 5 minutes from signup | HUMAN NEEDED | Flow is complete and streamlined. Actual timing requires live environment test. |

All 7 requirement IDs (ONB-01 through ONB-07) are accounted for. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| (none found) | — | — | — | — |

No TODO/FIXME/placeholder comments found in modified files. No empty implementations. No stub return patterns. All handlers make real API calls and handle responses.

### Human Verification Required

#### 1. Full onboarding flow end-to-end under 5 minutes

**Test:** Sign up as a new merchant, complete the onboarding form, and time the full flow
**Expected:** Form submits in under 1 second, progress indicator shows step transitions, agent is live and responding within 30 seconds, user is auto-redirected to dashboard — total under 5 minutes
**Why human:** Requires live ElevenLabs API, real Neon DB with new onboarding columns (once migration is run), and real KB sync service. Cannot simulate timing programmatically.

#### 2. Shopify OAuth redirect flow

**Test:** Click "Connect Shopify Instead", enter a valid Shopify domain, click "Connect Shopify Store"
**Expected:** Browser redirects to Shopify install page; after approval, webhook/callback returns merchant to dashboard
**Why human:** External OAuth flow with Shopify requires live SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and configured redirect URL in Shopify Partners.

#### 3. Progress indicator visual animation

**Test:** Submit the onboarding form and watch the OnboardingProgress component
**Expected:** Steps animate correctly — first step shows spinning loader, subsequent steps show gray circles, completed steps show green checkmarks. Steps transition as polling returns updated status.
**Why human:** Visual/animation state rendering requires browser environment.

### Gaps Summary

One gap blocks full production readiness: **the DB migration for onboarding columns is missing.**

The backend code (main.py and automation_service.py) references three new columns on the `stores` table:
- `onboarding_step TEXT` — tracks the current onboarding pipeline step
- `onboarding_error TEXT` — stores error message on failure
- `store_name TEXT` — stores the merchant's chosen store name

These are used in the INSERT at line 1742-1746 of main.py and in the SELECT at line 1782. However, no migration file adds these columns. The existing migrations (001-004) do not include them. The first time `POST /api/stores/create` is called in production, the database will return `ERROR: column "store_name" of relation "stores" does not exist`.

All test passing is explained by the mocked DB in the test suite — tests mock `db.fetchrow` and `db.execute` as AsyncMocks so they never hit a real database schema.

**Fix required:** Create `migrations/005_onboarding_columns.sql` with three `ALTER TABLE stores ADD COLUMN IF NOT EXISTS` statements. This is a 6-line migration file.

---

_Verified: 2026-03-14T12:30:00Z_
_Verifier: Claude (gsd-verifier)_
