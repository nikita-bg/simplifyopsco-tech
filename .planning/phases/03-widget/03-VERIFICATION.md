---
phase: 03-widget
verified: 2026-03-13T21:30:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Embed script tag on a real or test merchant page"
    expected: "Correct agent loads for the store — voice session connects and AI speaks"
    why_human: "End-to-end ElevenLabs WebRTC session requires live credentials and a browser"
  - test: "Widget fallback state on a page with no agent configured"
    expected: "Button appears dimmed and shows 'Voice assistant is not set up yet' — no JS errors"
    why_human: "Visual rendering and absence of console errors requires browser inspection"
  - test: "iOS Safari audio context"
    expected: "Tapping the widget button in iOS Safari launches the voice session without autoplay policy errors"
    why_human: "Device-level audio policy behaviour cannot be verified from source code alone"
  - test: "Microphone permission denied flow"
    expected: "Panel stays open with descriptive message and a clickable Try Again link"
    why_human: "Requires browser permission prompt interaction"
---

# Phase 3: Widget Verification Report

**Phase Goal:** Merchants can embed a single script tag and their customers can talk to the AI voice assistant
**Verified:** 2026-03-13T21:30:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/widget/config?store_id=X returns per-store agent_id, widget_color, widget_position, greeting_message, and enabled state | VERIFIED | `get_widget_config` at line 1081 in main.py; returns full WidgetConfigResponse model |
| 2 | Widget config endpoint returns agent_id=null when agent is disabled or store not found | VERIFIED | Line 1131: `exposed_agent_id = agent_id if (agent_status == "active" and enabled) else None` |
| 3 | Widget config and signed-url endpoints return Access-Control-Allow-Origin: * header for cross-origin widget access | VERIFIED | Line 1086 and 1185 in main.py: `response.headers["Access-Control-Allow-Origin"] = "*"` on both endpoints |
| 4 | Widget config returns sensible defaults (blue color, bottom-right, enabled) when store has no settings | VERIFIED | Lines 1137-1138: defaults `#256af4` and `bottom-right`; test_missing_settings_uses_defaults confirms |
| 5 | Widget fetches config from /api/widget/config on init and applies color, position, and greeting dynamically | VERIFIED | `initWidget()` at line 373 fetches config; `applyWidgetConfig()` at line 430 applies CSS custom properties and positioning |
| 6 | Widget works in all 4 corner positions (bottom-right, bottom-left, top-right, top-left) | VERIFIED | Lines 447-485: `pos.includes("left")` and `pos.includes("top")` branching; `.avsa-top` CSS class handles top variants |
| 7 | Widget shows a polite fallback message when agent is disabled, not configured, or backend returns error | VERIFIED | `showFallbackState()` at line 493; reason-based messages map: disabled, not_configured, limit_exceeded, default |
| 8 | Microphone permission denied shows a clear user-facing prompt instead of a silent failure | VERIFIED | Lines 545-564: NotAllowedError and NotFoundError caught with descriptive messages; panel kept open with Try Again link |
| 9 | iOS Safari AudioContext is created and resumed inside the click handler, not at module level | VERIFIED | Lines 698-703 inside `startVoice()`: `new (window.AudioContext || window.webkitAudioContext)()` inside click handler |
| 10 | ElevenLabs SDK is loaded from a version-pinned CDN URL, not @latest | VERIFIED | Line 25: `@elevenlabs/client@0.15.1/dist/index.umd.js` |
| 11 | Widget uses signed URL from backend — ElevenLabs API key never reaches the browser | VERIFIED | Lines 576-601: fetches `/api/voice/signed-url` and passes `signed_url` to ElevenLabs SDK |
| 12 | Single embed.js script tag with data-store-id loads correct agent per merchant | VERIFIED | Line 17: `STORE_ID = SCRIPT_TAG?.getAttribute("data-store-id")`; store_id passed to all backend fetches |

**Score:** 12/12 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/models.py` | WidgetConfigResponse Pydantic model | VERIFIED | Lines 278-287; `has_agent`, `enabled`, `agent_id`, `widget_color`, `widget_position`, `greeting_message`, `status` all present |
| `backend/main.py` | /api/widget/config endpoint with wildcard CORS | VERIFIED | Lines 1080-1141; substantive implementation with DB query, settings parsing, security gating |
| `backend/tests/test_widget_config.py` | Tests for widget config endpoint, min 80 lines | VERIFIED | 174 lines; 10 tests across 8 test classes covering all specified behaviours |
| `frontend/public/widget-embed.js` | Production widget with dynamic config, 4-corner positioning, iOS fix, mic permission UI, graceful fallback, min 600 lines | VERIFIED | 984 lines; all required functions present: initWidget, applyWidgetConfig, showFallbackState |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `/api/widget/config` | `stores` table | `db.fetchrow SELECT elevenlabs_agent_id, agent_status, settings` | WIRED | main.py line 1096-1099: exact SELECT pattern matches |
| `/api/widget/config response` | StoreSettings model | settings JSONB fields mapped to response | WIRED | Lines 1115-1140: defensive JSON parse, defaults applied, all 3 fields returned |
| `widget-embed.js initWidget()` | `/api/widget/config` | fetch on init | WIRED | Line 376: `${API_BASE}/api/widget/config?store_id=${...}` |
| `widget-embed.js startVoice()` | `/api/voice/signed-url` | fetch for signed URL before ElevenLabs session | WIRED | Lines 578-613: fetches URL, reads `urlData.signed_url`, passes to ElevenLabs SDK |
| `widget-embed.js startVoice()` | `AudioContext` | created inside click handler for iOS Safari | WIRED | Lines 698-703 inside `startVoice()` function body |
| `widget-embed.js` | `showFallbackState()` | called on non-200 responses, disabled agents, config errors | WIRED | Lines 381, 392, 421, 585, 589: showFallbackState called in all error/disabled paths |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| WDG-01 | 03-01, 03-02 | Single embed.js script tag with data-store-id loads correct agent per merchant | SATISFIED | widget-embed.js line 17 reads data-store-id; all API calls pass STORE_ID |
| WDG-02 | 03-01, 03-02 | Widget fetches config from /api/widget/config (agent_id, color, position, greeting) | SATISFIED | /api/widget/config endpoint exists and returns all four fields; widget fetches on init |
| WDG-03 | 03-01, 03-02 | Widget uses signed URL (from backend) to connect to ElevenLabs WebRTC | SATISFIED | widget-embed.js lines 578-613; ElevenLabs API key never in widget |
| WDG-04 | 03-01, 03-02 | Widget customizable: color, position (4 corners), avatar | SATISFIED | applyWidgetConfig() handles 4 corners; --avsa-color CSS custom property applied dynamically |
| WDG-05 | 03-02 | Microphone permission handling with clear user prompts | SATISFIED | NotAllowedError and NotFoundError caught with descriptive messages and Try Again option |
| WDG-06 | 03-02 | Mobile-optimized voice UI (iOS Safari audio context handling) | SATISFIED | AudioContext created inside user gesture handler at lines 698-703; env(safe-area-inset-bottom) applied |
| WDG-07 | 03-01, 03-02 | Graceful fallback when agent is disabled or merchant exceeds plan limits | SATISFIED | showFallbackState() with disabled/not_configured/limit_exceeded/default reason messages |

No orphaned requirements — all 7 WDG requirements are claimed in plans and implemented.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/public/widget-embed.js` | 829 | `return null` | INFO | Legitimate return in `extractProductFromText()` helper — not a stub |

No blockers or warnings found. The `return null` at line 829 is a valid early return in a regex pattern-matching helper, not a stub implementation.

---

### Human Verification Required

#### 1. End-to-end voice session via embed script tag

**Test:** Paste `<script src="http://localhost:3000/widget-embed.js" data-store-id="<active-store-uuid>"></script>` on a test HTML page, open it in a browser, click the widget button, and speak.
**Expected:** Voice session connects to the correct merchant's ElevenLabs agent and the AI responds.
**Why human:** Requires live ElevenLabs credentials, browser microphone access, and WebRTC session establishment.

#### 2. Fallback state visual rendering

**Test:** Embed the widget with a store_id that has no active agent. Open the page and click the widget button.
**Expected:** Widget button appears at 50% opacity with `cursor: not-allowed`, clicking does nothing, status area shows "Voice assistant is not set up yet".
**Why human:** Visual opacity, cursor style, and absence of JS errors require browser inspection.

#### 3. iOS Safari AudioContext behaviour

**Test:** Open a page with the embedded widget in iOS Safari. Tap the widget button.
**Expected:** Audio session starts without "The AudioContext was not allowed to start" console errors.
**Why human:** iOS Safari AudioContext policy enforcement is device/OS-level behaviour not verifiable from source.

#### 4. Microphone permission denied UX

**Test:** Click the widget button and deny microphone permission when the browser prompts.
**Expected:** Panel stays open (does not auto-close), shows the descriptive message with "Try Again" underlined, clicking "Try Again" re-prompts for permission.
**Why human:** Requires browser permission prompt interaction and visual confirmation.

---

### Gaps Summary

No gaps found. All 12 observable truths are verified against the actual codebase. All 4 artifacts exist, are substantive (not stubs), and are wired correctly. All 7 WDG requirements are satisfied with implementation evidence.

The widget system is structurally complete. Four items are flagged for human verification because they require browser interaction, live credentials, or device-level behaviour — none of these represent code deficiencies.

---

_Verified: 2026-03-13T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
