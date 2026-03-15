# SimplifyOps Widget — E2E Test Checklist

Run after deploying (Tasks 24–26). All tests require the widget backend to be live.

## Setup

```bash
# 1. Build the widget
cd widget && npm run build

# 2. Build embed.js
cd ../embed && npm run build

# 3. Open the test page (needs a web server, not file://)
npx serve ..   # from project root, or use Live Server in VS Code
# then open: http://localhost:3000/test/e2e-test.html
```

---

## Step 1: embed.js → bridge → iframe communication

Open `test/e2e-test.html` in Chrome. Check the left-side console panel.

- [ ] **Launcher appears** — "PASS: launcher button present" in console
- [ ] **Iframe present** — "PASS: iframe present" in console
- [ ] **Widget sends so:ready** — appears in console after clicking launcher
- [ ] **Page context delivered** — "PASS: pageContext received (3 products)" in console
- [ ] **Products detected** — 3 products with `data-product-id` found
- [ ] **Sections detected** — 4 sections (`hero`, `pricing`, `features`, `contact`)

---

## Step 2: Chat flow

> Requires: backend live at `https://widget-backend.simplifyops.co`

1. Open widget → Chat mode
2. Type: `"What plans do you offer?"`
   - [ ] Streaming text response appears
   - [ ] Gemini mentions pricing (uses page context)
3. Type: `"Highlight the pricing section"`
   - [ ] `so:highlightElement` seen in test console
   - [ ] Blue border flashes on pricing section
4. Type: `"Scroll to contact form"`
   - [ ] `so:scrollToElement` seen in test console
   - [ ] Page scrolls to contact section

---

## Step 3: Hybrid flow (chat + voice)

1. Switch widget to **Live** (hybrid) mode
2. Type: `"Tell me about the Pro plan"`
   - [ ] Text response streams in
   - [ ] Audio plays automatically after response completes
   - [ ] "Speaking..." indicator shown while audio plays
   - [ ] Input disabled during playback
3. Type: `"Compare all plans"`
   - [ ] `showComparison` action fires
   - [ ] Comparison overlay appears in widget with 3 products

---

## Step 4: Voice flow

1. Switch to **Voice** mode
2. Click mic button
   - [ ] Status changes to "Connecting..."
   - [ ] Browser requests mic permission (first time)
   - [ ] Status changes to "Listening..."
   - [ ] Waveform animates
3. Say: `"Show me the Pro plan"`
   - [ ] Status changes to "Speaking..."
   - [ ] Agent responds via voice
   - [ ] `showProductCard` fires — ProductCard overlay appears in widget
4. Click mic button to stop
   - [ ] Status returns to "Tap to start"

---

## Step 5: Conversation limits

> Requires: a free-tier agent with conversation limit configured in Supabase

1. Use the test agent to start 25 conversations (can script this with repeated sessions)
2. Start the 26th conversation:
   - [ ] Backend returns 429 with `limitReached: true`
   - [ ] Widget shows error message
3. Start conversation #10 normally, THEN add more conversations from another browser:
   - [ ] Conversation #10 completes without interruption (in-progress not affected)

---

## Step 6: Fallback behaviour

### Voice → Hybrid fallback
1. Start a Voice session
2. Kill the OpenAI Realtime API connection (use browser DevTools → Network → offline, then back)
   - [ ] Widget detects disconnection
   - [ ] Error status shows with "Tap to retry"

### TTS → Chat fallback
> This is handled backend-side; if TTS fails, the SSE stream omits `audio_delta` events.
1. Temporarily remove `OPENAI_API_KEY` from Railway env vars
2. Send a message in Hybrid mode:
   - [ ] Text response still streams
   - [ ] No audio plays (graceful degradation, no error shown)
3. Re-add the key when done

---

## Bridge Action Tests (use test console buttons)

With the widget open on the test page, click each console button and verify:

| Button | Expected result |
|--------|----------------|
| `scrollTo product-1` | Page scrolls to first product card |
| `highlight hero`     | Blue border flashes on hero section |
| `navigateTo /pricing`| (confirm dialog) page navigates |
| `showProductCard`    | Product card overlay appears in bridge area |
| `showComparison`     | Comparison overlay appears in bridge area |
| `openContactForm`    | Page scrolls to contact form |

---

## Quick smoke test (pre-deployment)

```bash
# Run all unit tests
cd widget && npx vitest run

# TypeScript check across all packages
cd widget && npx tsc --noEmit
cd ../widget-backend && npx tsc --noEmit
cd ../embed && npx tsc --noEmit
```

All should pass before deploying.
