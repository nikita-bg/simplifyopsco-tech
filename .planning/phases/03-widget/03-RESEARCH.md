# Phase 3: Widget - Research

**Researched:** 2026-03-13
**Domain:** Vanilla JS embed widget, multi-tenant config API, ElevenLabs signed URL WebRTC, iOS Safari audio handling
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WDG-01 | Single embed.js script tag with `data-store-id` loads correct agent per merchant | Existing widget already reads `data-store-id` from `document.currentScript`; backend already has per-store lookup in `/api/voice/config` and `/api/voice/signed-url`. Gap: config endpoint lacks widget_color/position/greeting fields. |
| WDG-02 | Widget fetches config from FastAPI `/api/widget/config` (agent_id, color, position, greeting) | New endpoint needed. Current `/api/voice/config` only returns `agent_id` and `has_agent`. Must be extended or replaced with a new `/api/widget/config` endpoint that reads `settings` JSONB from stores table. |
| WDG-03 | Widget uses signed URL (from backend) to connect to ElevenLabs WebRTC — API key never in browser | Already implemented: `elevenlabs_service.get_signed_url(agent_id)` is called by `/api/voice/signed-url`. Widget already fetches this endpoint before calling `ElevenLabs.Conversation.startSession({ signedUrl })`. |
| WDG-04 | Widget customizable: color, position (4 corners), avatar | `StoreSettings` model already has `widget_color` and `widget_position` fields stored in `stores.settings` JSONB. Widget CSS is generated dynamically from these values but currently reads them only from script tag attributes. Must be fetched from backend. |
| WDG-05 | Microphone permission handling with clear user prompts | Widget already has `NotAllowedError` catch for `getUserMedia`. Needs visible UI state for: denied, pending, granted. |
| WDG-06 | Mobile-optimized voice UI (iOS Safari audio context handling) | iOS requires AudioContext.resume() inside a user gesture handler (button click). The widget's `startVoice` is already called from a click handler — but AudioContext must also be created/resumed inside that handler, not at module init time. |
| WDG-07 | Graceful fallback when agent is disabled or merchant exceeds plan limits | Backend already returns 503 with `"Agent is not active"` for non-active `agent_status`. Widget must detect this HTTP status and render a polite fallback UI state instead of a JS error. |
</phase_requirements>

---

## Summary

The existing `frontend/public/widget-embed.js` is a well-structured vanilla JS embed that covers ~70% of the Phase 3 requirements. It already: loads via script tag, reads `data-store-id`, fetches a signed URL from the backend, uses `ElevenLabs.Conversation.startSession({ signedUrl })`, renders a panel with waveform visualization, and handles basic microphone permission errors.

The critical gaps are: (1) the widget currently reads color/position from HTML attributes rather than fetching them from the backend per-store config — so config changes in the dashboard don't propagate automatically; (2) there is no `/api/widget/config` endpoint that bundles all merchant customization fields into one response; (3) iOS Safari audio context must be explicitly resumed inside the button click handler to avoid "context suspended" errors; and (4) non-200 responses from the backend (503 when agent is disabled) are not handled gracefully — the widget just calls `updateStatus("Voice AI unavailable", "error")` with no descriptive fallback.

The backend already has all the data needed: `stores.settings` JSONB holds `widget_color`, `widget_position`, `greeting_message`, and `enabled`. The `stores.agent_status` column tracks whether the agent is active. The fix is wiring these up: one new backend endpoint + widget config-fetch logic.

**Primary recommendation:** Extend the existing widget-embed.js rather than rewriting it. Add a new `/api/widget/config` backend endpoint. Wire the widget to fetch its visual config from that endpoint on init and apply it dynamically. Fix iOS AudioContext and graceful fallback.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@elevenlabs/client` | 0.15.1 (latest) | Browser SDK for ElevenLabs Conversational AI via WebRTC | Official SDK — exposes `Conversation.startSession({ signedUrl })` |
| Vanilla JS (IIFE) | ES2020+ | Widget bundle format | No framework dependency means works on any merchant site |
| FastAPI | 0.115.12 (existing) | New `/api/widget/config` endpoint | Existing backend — no new framework needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsDelivr CDN | — | Serve `@elevenlabs/client` UMD bundle | Widget dynamically injects the SDK script tag; pinning to a version is safer than `@latest` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dynamic SDK injection | Bundle SDK into widget-embed.js | Bundling adds 200KB+ to widget, slowing merchant sites; CDN injection is standard pattern |
| New `/api/widget/config` endpoint | Extend `/api/voice/config` | Extension risks backward compat; new clean endpoint is easier to test |

**Installation:** No new packages. Widget is vanilla JS. Backend is FastAPI. Widget already loads `@elevenlabs/client` from jsDelivr CDN dynamically.

---

## Architecture Patterns

### How the Existing Widget Works (What to Preserve)

```
merchant site
  <script src="https://dashboard.simplifyopsco.tech/widget-embed.js"
          data-store-id="<uuid>"
          data-api-url="https://api.simplifyopsco.tech">
  </script>

widget-embed.js (IIFE, ~770 lines)
  1. Reads data-store-id, data-api-url from document.currentScript
  2. createWidget() — injects CSS + HTML into DOM
  3. initElevenLabs() — fetches /api/voice/config?store_id=X (gets agent_id)
  4. On click: startVoice()
     a. getUserMedia({ audio: true })
     b. GET /api/voice/signed-url?store_id=X
     c. ElevenLabs.Conversation.startSession({ signedUrl })
```

### What Must Change

```
1. NEW: GET /api/widget/config?store_id=X
   Returns: { agent_id, has_agent, enabled, widget_color, widget_position,
              greeting_message, status }
   Replaces: init call to /api/voice/config
   Source: stores.settings JSONB + stores.agent_status + stores.elevenlabs_agent_id

2. EXTEND: Widget init sequence
   initWidget() fetches /api/widget/config
   -> applies widget_color and widget_position to injected CSS dynamically
   -> if !enabled or !has_agent: render fallback state, hide mic button
   -> if agent_id: proceed to SDK load

3. FIX: iOS AudioContext
   Create AudioContext inside startVoice() click handler (not at module level)
   Call audioContext.resume() before getUserMedia

4. FIX: Graceful fallback on 503
   After /api/voice/signed-url returns non-200:
   - 503 "Agent is not active": show "Voice assistant is temporarily unavailable"
   - 503 "Voice AI not configured": show "Voice assistant not set up yet"
   - network error: show "Cannot connect, please try again"
```

### Recommended Project Structure (changes only)

```
backend/
  main.py          # Add /api/widget/config endpoint
  models.py        # Add WidgetConfig response model

frontend/
  public/
    widget-embed.js  # Modify existing file
```

### Pattern 1: New `/api/widget/config` Endpoint

**What:** Single public endpoint for widget initialization — no auth required (it's consumed by the browser on merchant sites, like a CDN config)
**When to use:** Widget init on every page load
**Example:**

```python
# Source: existing /api/voice/config pattern in backend/main.py:1079
@app.get("/api/widget/config")
async def get_widget_config(store_id: str = ""):
    """
    Public endpoint for widget initialization.
    Returns per-store config: agent_id, visual settings, enabled state.
    No auth required — consumed by widget on merchant storefront.
    """
    if not store_id:
        return {"has_agent": False, "enabled": False, "agent_id": None,
                "widget_color": "#256af4", "widget_position": "bottom-right",
                "greeting_message": None, "status": "no_store_id"}

    try:
        row = await db.fetchrow(
            """SELECT elevenlabs_agent_id, agent_status, settings
               FROM stores WHERE id = $1::uuid""",
            store_id,
        )
    except Exception:
        return {"has_agent": False, "enabled": False, "agent_id": None,
                "widget_color": "#256af4", "widget_position": "bottom-right",
                "greeting_message": None, "status": "error"}

    if not row:
        return {"has_agent": False, "enabled": False, "agent_id": None,
                "widget_color": "#256af4", "widget_position": "bottom-right",
                "greeting_message": None, "status": "store_not_found"}

    settings = row.get("settings") or {}
    if isinstance(settings, str):
        import json
        settings = json.loads(settings)

    agent_status = row.get("agent_status", "none")
    agent_id = row.get("elevenlabs_agent_id")
    enabled = settings.get("enabled", True)

    return {
        "has_agent": bool(agent_id),
        "enabled": enabled,
        "agent_id": agent_id if agent_status == "active" and enabled else None,
        "widget_color": settings.get("widget_color", "#256af4"),
        "widget_position": settings.get("widget_position", "bottom-right"),
        "greeting_message": settings.get("greeting_message"),
        "status": agent_status,
    }
```

### Pattern 2: Widget CORS for Third-Party Embeds

**What:** The backend's `/api/widget/config` and `/api/voice/signed-url` endpoints must be accessible from any merchant's domain.
**Key finding:** The current `ALLOWED_ORIGINS` in `config.py` is a comma-separated string used by FastAPI CORSMiddleware with `allow_credentials=True`. For the widget-specific endpoints (no cookies/auth), setting `allow_origins=["*"]` on those specific routes is safe and standard — it cannot be combined with `allow_credentials=True` but the widget endpoints don't use credentials.
**Pattern:** Add per-route CORS override for widget endpoints OR move widget endpoints to a separate router with `allow_origins=["*"]` and `allow_credentials=False`.

```python
# Option A: Add response header manually on widget endpoints (simplest)
from fastapi.responses import JSONResponse

@app.get("/api/widget/config")
async def get_widget_config(store_id: str = "", response: Response = None):
    response.headers["Access-Control-Allow-Origin"] = "*"
    # ... rest of handler
```

### Pattern 3: iOS Safari AudioContext Fix

**What:** iOS Safari blocks AudioContext from starting unless created inside a user gesture handler.
**When it breaks:** If AudioContext is created at module level or outside the click handler.
**Fix:** Create and resume inside the click-triggered `startVoice()` function.

```javascript
// Source: webrtchacks.com/autoplay-restrictions-and-webrtc/ + MDN AudioContext docs
async function startVoice() {
  // iOS fix: create AudioContext inside user gesture handler
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (iOS Safari starts context suspended)
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  // Now it's safe to call getUserMedia
  await startElevenLabsConversation();
}
```

### Pattern 4: Graceful Fallback on Non-Active Agent

**What:** When the backend signals the agent is unavailable, show a polite static message instead of an error.
**When to use:** 503 from `/api/widget/config` OR when `enabled: false` in config response.

```javascript
// Source: pattern derived from existing widget stopVoice() and updateStatus()
function showFallbackState(reason) {
  const btn = document.getElementById("avsa-trigger-btn");
  const panel = document.getElementById("avsa-panel");
  const status = document.getElementById("avsa-status");

  // Disable the mic button visually
  if (btn) {
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    btn.setAttribute("disabled", "true");
    btn.setAttribute("aria-label", "Voice assistant unavailable");
  }

  // Show panel with informational message (don't auto-open, update status)
  if (status) {
    const messages = {
      disabled: "Voice assistant is currently disabled",
      limit_exceeded: "Voice assistant is temporarily unavailable",
      not_configured: "Voice assistant is not set up yet",
      default: "Voice assistant is unavailable",
    };
    status.textContent = messages[reason] || messages.default;
    status.className = "avsa-status";
  }
}
```

### Anti-Patterns to Avoid

- **Do not embed `widget_color`/`widget_position` only in script tag attributes.** If the merchant changes their color in the dashboard, the old hardcoded value in the embed code on their site won't update. Always fetch from backend on init.
- **Do not create AudioContext at module top level.** iOS Safari will throw or silently suspend it. Create inside click handler.
- **Do not use `@latest` CDN tag for ElevenLabs SDK in production.** A breaking SDK release would break all widgets simultaneously. Pin to a specific version: `@elevenlabs/client@0.15.1`.
- **Do not use `allow_origins=["*"]` with `allow_credentials=True`.** These are mutually exclusive in the CORS spec. Widget endpoints don't need credentials.
- **Do not throw a JS error on 503 from the signed URL endpoint.** The widget is embedded on customer storefronts — a JS exception is visible and damaging. Always catch and show fallback UI.
- **Do not expose `agent_id` in the widget config response when the agent is disabled.** Even if you have the ID, return `null` so a determined user can't manually construct a signed URL request.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebRTC voice session | Custom WebRTC signaling | `ElevenLabs.Conversation.startSession({ signedUrl })` | ElevenLabs handles ICE negotiation, STUN/TURN, codec selection, reconnection |
| Audio waveform visualization | Web Audio API AnalyserNode tap | The existing sine-wave animation in widget-embed.js | ElevenLabs SDK provides `onModeChange` (listening/speaking) — use mode to drive animation; no need for actual audio analysis |
| Widget delivery/CDN | Custom file server for embed.js | `frontend/public/widget-embed.js` served by Vercel | Vercel already serves files from `public/` with correct headers and global CDN |

**Key insight:** The ElevenLabs `Conversation` object handles all the hard WebRTC + voice streaming complexity. The widget's job is just UI state machine (idle → connecting → listening → speaking → error) driven by SDK callbacks.

---

## Common Pitfalls

### Pitfall 1: iOS Safari AudioContext Suspended State
**What goes wrong:** `audioContext.state === "suspended"` — no audio plays, waveform doesn't animate, conversation appears to connect but user hears nothing.
**Why it happens:** iOS requires AudioContext creation AND resume to happen within a user gesture event stack. Promises break the gesture chain.
**How to avoid:** Create `new AudioContext()` and call `.resume()` before the first `await` in the click handler. Do not create AudioContext in module init.
**Warning signs:** Works on desktop, fails silently on iPhone. Console shows "AudioContext was not allowed to start".

### Pitfall 2: CORS Blocking Widget API Calls
**What goes wrong:** `fetch(/api/widget/config)` fails on merchant sites with CORS error. Backend's current `ALLOWED_ORIGINS` only allows `localhost:3000` and the SimplifyOps dashboard domain.
**Why it happens:** Widget runs on arbitrary merchant domains (e.g., `mystore.com`) not in the allowlist.
**How to avoid:** Widget-specific backend endpoints must return `Access-Control-Allow-Origin: *`. These endpoints are unauthenticated and return only non-sensitive config (no secret keys).
**Warning signs:** Works on the SimplifyOps dashboard but fails when embedded on merchant's Shopify store.

### Pitfall 3: Config Cache Miss on Color/Position Changes
**What goes wrong:** Merchant updates their widget color in the dashboard, but embedded widget on their site still shows old color.
**Why it happens:** Widget reads color from script tag attributes (hardcoded at embed time), not from backend on each page load.
**How to avoid:** Widget must fetch config from `/api/widget/config` on every init and apply color/position dynamically to injected CSS. Script tag attributes should only be fallbacks.
**Warning signs:** Dashboard settings save successfully but the live widget doesn't update.

### Pitfall 4: JS Exception on Merchant Storefront
**What goes wrong:** Unhandled promise rejection or uncaught exception appears in browser console on merchant's customer-facing store.
**Why it happens:** Any network failure (backend down, store_id invalid, 503 from ElevenLabs API) that propagates as an exception rather than a handled state.
**How to avoid:** ALL fetch calls in widget-embed.js must be wrapped in try/catch. All error states must call `showFallbackState()`, never throw. Use `console.warn` not `console.error` for non-critical issues.
**Warning signs:** Merchant complains that widget "broke something on my site" — usually a global error tracker caught the exception.

### Pitfall 5: ElevenLabs SDK `window.ElevenLabs` Name
**What goes wrong:** `window.ElevenLabs` or `window.ElevenLabsClient` undefined even after script loaded.
**Why it happens:** The CDN UMD build may export under a different global name. The existing widget checks both `window.ElevenLabs` and `window.ElevenLabsClient` but the actual export name depends on the SDK version.
**How to avoid:** After loading the CDN script, check for the actual export by inspecting the UMD wrapper. As of `@elevenlabs/client@0.15.1`, the global is available under `window.ElevenLabsClient`. Add a version-pinned CDN URL.
**Warning signs:** "Loading voice AI..." spinner that never resolves; console shows SDK loaded but `Conversation` is undefined.

### Pitfall 6: Position CSS Bug on Mobile
**What goes wrong:** Widget panel overlaps the browser's URL bar or bottom navigation on mobile.
**Why it happens:** `bottom: 100px` is fine on desktop but insufficient on mobile where the browser chrome takes extra space. iOS Safari's dynamic viewport height (the "100vh" bug) means fixed-position elements shift when the address bar appears/disappears.
**How to avoid:** Use CSS custom property `--avsa-safe-bottom: env(safe-area-inset-bottom, 0px)` and add `padding-bottom: var(--avsa-safe-bottom)` to the trigger button position. For 4-corner support: also handle `top-left` and `top-right` positions (not just bottom).
**Warning signs:** Widget button is partially hidden under the home indicator on iPhone.

---

## Code Examples

Verified patterns from existing codebase and official sources:

### Existing Widget Config Init (current — needs updating)
```javascript
// Source: frontend/public/widget-embed.js:365-389 (current implementation)
function initElevenLabs() {
  fetch(`${API_BASE}/api/voice/config?store_id=${STORE_ID}`)
    .then((r) => r.json())
    .then((cfg) => {
      agentId = cfg.agent_id || null;
      // NOTE: no color/position/greeting applied here — gap to fix
    })
    .catch((err) => {
      console.warn("[AVSA] Could not fetch voice config:", err);
    });
}
```

### New Widget Config Init (target pattern)
```javascript
// Target pattern for Phase 3
async function initWidget() {
  try {
    const res = await fetch(`${API_BASE}/api/widget/config?store_id=${STORE_ID}`);
    if (!res.ok) {
      showFallbackState("default");
      return;
    }
    const cfg = await res.json();

    // Apply visual config from backend (not hardcoded script attrs)
    applyWidgetConfig(cfg);

    if (!cfg.enabled || !cfg.has_agent) {
      showFallbackState("disabled");
      return;
    }

    agentId = cfg.agent_id;
    // Pre-load SDK now that we know we have a valid agent
    loadElevenLabsSDK();
  } catch (err) {
    console.warn("[AVSA] Widget config fetch failed:", err);
    showFallbackState("default");
  }
}

function applyWidgetConfig(cfg) {
  // Dynamically update CSS variables
  const color = cfg.widget_color || WIDGET_COLOR;
  const position = cfg.widget_position || WIDGET_POSITION;
  document.documentElement.style.setProperty("--avsa-color", color);
  // Reposition trigger button based on position
  const btn = document.getElementById("avsa-trigger-btn");
  if (btn && position.includes("left")) {
    btn.style.left = "24px";
    btn.style.right = "unset";
  }
}
```

### ElevenLabs `Conversation.startSession` with `signedUrl`
```javascript
// Source: ElevenLabs JS SDK docs + existing widget-embed.js:421
conversation = await ElevenLabs.Conversation.startSession({
  signedUrl: signed_url,      // obtained from our backend, never hardcoded
  connectionType: "webrtc",   // or "websocket" — webrtc is preferred for voice

  onConnect: ({ conversationId }) => { /* ... */ },
  onDisconnect: () => { /* ... */ },
  onError: (message, context) => { /* ... */ },
  onModeChange: ({ mode }) => { /* mode: "listening" | "speaking" */ },
  onMessage: ({ message, source }) => { /* source: "ai" | "user" */ },
});
```

### Signed URL Backend Call (existing — verified working)
```python
# Source: backend/elevenlabs_service.py:150
async def get_signed_url(self, agent_id: str) -> str:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url",
            params={"agent_id": agent_id},
            headers=self._headers(),
        )
        response.raise_for_status()
        return response.json().get("signed_url", "")
```

### iOS AudioContext Resume (fix pattern)
```javascript
// Source: MDN Web Audio API + webrtchacks.com/autoplay-restrictions-and-webrtc/
async function startVoice() {
  // MUST happen inside click event handler — iOS Safari requires user gesture
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  // Now safe to getUserMedia
  await startElevenLabsConversation();
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `agentId` in script tag attribute | Per-store agent from DB via `/api/widget/config` | Phase 3 | Multi-tenant: each merchant's customers get their merchant's agent |
| Color/position hardcoded in script tag | Color/position fetched from backend | Phase 3 | Dashboard config changes propagate to all embedded widgets automatically |
| Static CORS allowlist | Wildcard CORS on public widget endpoints | Phase 3 | Widget works on any merchant domain |
| Silent JS errors | Graceful fallback UI states | Phase 3 | No broken experiences on merchant storefronts |

**Deprecated/outdated in this codebase:**
- `/api/voice/config`: currently used by the widget but lacks visual config fields. Will be superseded by `/api/widget/config` (can coexist for backward compat during transition).

---

## Open Questions

1. **4-corner position support (top-left, top-right)**
   - What we know: Current widget only supports left/right (bottom always). Requirements say 4 corners.
   - What's unclear: CSS for top positions — panel would need to render below the trigger button (not above).
   - Recommendation: Add `top-left` and `top-right` position handling in widget CSS. Panel: `top: 100px` when button is at top.

2. **CDN URL for widget-embed.js**
   - What we know: Currently at `frontend/public/widget-embed.js` served by Vercel.
   - What's unclear: Whether the URL `dashboard.simplifyopsco.tech/widget-embed.js` is what merchants will use, or if Railway/backend serves it.
   - Recommendation: Keep serving from Vercel `public/` folder — Vercel CDN is global and already configured. Backend URL in script: `https://dashboard.simplifyopsco.tech/widget-embed.js`.

3. **`@elevenlabs/client` UMD export name**
   - What we know: Package version 0.15.1, ESM and CJS confirmed. UMD availability not confirmed from jsDelivr metadata.
   - What's unclear: Exact `window.*` global name for the UMD/IIFE browser build.
   - Recommendation: During Wave 0 (setup), verify the actual CDN URL and global name by loading `https://cdn.jsdelivr.net/npm/@elevenlabs/client@0.15.1/dist/index.umd.js` and checking the export. Existing widget tries `window.ElevenLabs || window.ElevenLabsClient` which covers both known variants.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio (existing) |
| Config file | `backend/pytest.ini` or `pyproject.toml` (existing) |
| Quick run command | `cd backend && python -m pytest tests/test_widget_config.py -x -q` |
| Full suite command | `cd backend && python -m pytest tests/ -v` (74 existing + new tests) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WDG-01 | `GET /api/widget/config?store_id=X` returns per-store agent_id | unit (FastAPI TestClient) | `pytest tests/test_widget_config.py::TestWidgetConfig::test_returns_per_store_agent -x` | ❌ Wave 0 |
| WDG-02 | Config endpoint returns color, position, greeting from settings JSONB | unit | `pytest tests/test_widget_config.py::TestWidgetConfig::test_returns_visual_config -x` | ❌ Wave 0 |
| WDG-03 | Signed URL is fetched from backend, never returns raw agent_id in widget flow | unit | `pytest tests/test_voice_signed_url.py -x` | ✅ exists |
| WDG-04 | `enabled=False` in config causes widget to show fallback | unit (mock DB) | `pytest tests/test_widget_config.py::TestWidgetConfig::test_disabled_returns_no_agent_id -x` | ❌ Wave 0 |
| WDG-05 | Microphone permission denied returns 4xx-equivalent error path | manual (browser) | N/A — requires live browser + mic denial | manual only |
| WDG-06 | iOS AudioContext not auto-tested (requires Safari + iOS device) | manual | N/A — requires physical device | manual only |
| WDG-07 | 503 from signed URL endpoint when agent_status != active | unit | `pytest tests/test_agent_endpoints.py::TestSignedUrl -x` | ✅ partially exists |

### Sampling Rate
- **Per task commit:** `cd backend && python -m pytest tests/test_widget_config.py tests/test_voice_signed_url.py -x -q`
- **Per wave merge:** `cd backend && python -m pytest tests/ -v`
- **Phase gate:** Full suite green (74+ tests) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/test_widget_config.py` — covers WDG-01, WDG-02, WDG-04 (new endpoint tests)
- [ ] Manual test plan for WDG-05 (mic permission UI), WDG-06 (iOS Safari), WDG-07 (fallback UI) — requires browser

---

## Sources

### Primary (HIGH confidence)
- `frontend/public/widget-embed.js` — full existing widget implementation analyzed
- `backend/main.py:1079-1162` — existing `/api/voice/config` and `/api/voice/signed-url` endpoints
- `backend/elevenlabs_service.py` — `get_signed_url()` method
- `backend/models.py` — `StoreSettings` model with widget fields
- `migrations/001_shopify_schema.sql` — `stores.settings JSONB` schema
- `migrations/002_agent_infrastructure.sql` — `stores.agent_status`, `stores.elevenlabs_agent_id`

### Secondary (MEDIUM confidence)
- [ElevenLabs Signed URL API](https://elevenlabs.io/docs/api-reference/conversations/get-signed-url) — 15-min TTL confirmed
- [ElevenLabs Agent Auth](https://elevenlabs.io/docs/agents-platform/customization/authentication) — signed URL flow confirmed
- [jsDelivr @elevenlabs/client](https://www.jsdelivr.com/package/npm/@elevenlabs/client) — version 0.15.1 confirmed (March 10, 2026)
- [webrtcHacks Autoplay Restrictions](https://webrtchacks.com/autoplay-restrictions-and-webrtc/) — iOS AudioContext user gesture requirement
- [FastAPI CORS docs](https://fastapi.tiangolo.com/tutorial/cors/) — wildcard + credentials mutual exclusion

### Tertiary (LOW confidence — needs validation)
- ElevenLabs UMD global export name (`window.ElevenLabsClient`) — inferred from existing widget code, not verified from official docs
- iOS AudioContext `webkitAudioContext` prefix still needed in 2026 — likely true for older iOS but not verified against iOS 17+ changelog

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing codebase fully analyzed, no guesswork
- Architecture: HIGH — gap analysis is derived from direct code inspection; new endpoint pattern follows existing codebase conventions exactly
- Pitfalls: HIGH for CORS/iOS/error handling (verified from official sources); MEDIUM for SDK export name (single-source)

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (ElevenLabs SDK API is stable; iOS Safari behavior unlikely to change materially)
