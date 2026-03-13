/**
 * AI Voice Shopping Assistant — Storefront Widget Embed Script
 *
 * Standalone vanilla JS widget for Shopify storefronts via Theme App Extension.
 * Uses ElevenLabs Conversational AI SDK for real voice conversations.
 *
 * Usage: <script src="https://your-app.com/widget-embed.js" data-store-id="xxx"></script>
 */
(function () {
  "use strict";

  // ==============================
  // Configuration
  // ==============================

  const SCRIPT_TAG = document.currentScript;
  const STORE_ID = SCRIPT_TAG?.getAttribute("data-store-id") || "";
  const API_BASE =
    SCRIPT_TAG?.getAttribute("data-api-url") || "https://api.simplifyopsco.tech";
  const WIDGET_POSITION =
    SCRIPT_TAG?.getAttribute("data-position") || "bottom-right";

  // ElevenLabs SDK CDN (version-pinned)
  const ELEVENLABS_SDK_URL =
    "https://cdn.jsdelivr.net/npm/@elevenlabs/client@0.15.1/dist/index.umd.js";

  // ==============================
  // Styles (CSS custom properties for dynamic theming)
  // ==============================

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    #avsa-widget-container {
      --avsa-color: #256af4;
      --avsa-safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    #avsa-widget-container * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Floating Button */
    #avsa-trigger-btn {
      position: fixed;
      ${WIDGET_POSITION.includes("left") ? "left: 24px" : "right: 24px"};
      ${WIDGET_POSITION.includes("top") ? "top: 24px" : `bottom: calc(24px + var(--avsa-safe-bottom, 0px))`};
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--avsa-color, #256af4);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), 0 0 0 0 rgba(37, 106, 244, 0.25);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.3s ease;
      animation: avsa-pulse 2s ease-in-out infinite;
    }

    #avsa-trigger-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(0, 0, 0, 0.3), 0 0 0 8px rgba(37, 106, 244, 0.12);
    }

    #avsa-trigger-btn.active {
      animation: none;
      background: #ef4444;
    }

    @keyframes avsa-pulse {
      0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 0 0 rgba(37, 106, 244, 0.25); }
      50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 0 12px rgba(37, 106, 244, 0); }
    }

    #avsa-trigger-btn svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    /* Top-positioned variants */
    #avsa-trigger-btn.avsa-top { top: 24px; bottom: unset; }
    #avsa-panel.avsa-top { top: 100px; bottom: unset; }

    /* Voice Panel */
    #avsa-panel {
      position: fixed;
      ${WIDGET_POSITION.includes("left") ? "left: 24px" : "right: 24px"};
      ${WIDGET_POSITION.includes("top") ? "top: 100px" : "bottom: 100px"};
      width: 380px;
      max-height: 560px;
      background: rgba(15, 15, 25, 0.97);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      z-index: 999998;
      overflow: hidden;
      display: none;
      flex-direction: column;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }

    #avsa-panel.visible {
      display: flex;
      opacity: 1;
      transform: translateY(0);
    }

    /* Panel Header */
    .avsa-header {
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .avsa-header-text h3 {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .avsa-header-text p {
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
    }

    .avsa-powered-by {
      font-size: 10px;
      color: rgba(255,255,255,0.25);
      text-align: right;
    }

    /* Voice Visualizer */
    .avsa-voice-area {
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .avsa-waveform {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      height: 60px;
    }

    .avsa-waveform .bar {
      width: 4px;
      border-radius: 2px;
      background: var(--avsa-color, #256af4);
      transition: height 0.1s ease;
    }

    .avsa-waveform.speaking .bar {
      background: #6366f1;
    }

    .avsa-waveform.listening .bar {
      background: #22c55e;
    }

    .avsa-status {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }

    .avsa-status.listening { color: #22c55e; }
    .avsa-status.speaking { color: var(--avsa-color, #256af4); }
    .avsa-status.error { color: #ef4444; }
    .avsa-status.connecting { color: rgba(255,255,255,0.5); }

    /* Transcript */
    .avsa-transcript {
      padding: 0 20px 16px;
      max-height: 120px;
      overflow-y: auto;
      display: none;
    }

    .avsa-transcript-bubble {
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
      padding: 10px 14px;
      color: rgba(255,255,255,0.8);
      font-size: 13px;
      line-height: 1.5;
      border-left: 3px solid var(--avsa-color, #256af4);
    }

    /* Recommendations Area */
    .avsa-recs {
      padding: 0 16px 16px;
      overflow-y: auto;
      max-height: 260px;
    }

    .avsa-recs-title {
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px;
    }

    .avsa-rec-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 12px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }

    .avsa-rec-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(37, 106, 244, 0.25);
    }

    .avsa-rec-card img {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      background: rgba(255, 255, 255, 0.05);
    }

    .avsa-rec-info { flex: 1; min-width: 0; }

    .avsa-rec-info .title {
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .avsa-rec-info .type {
      color: rgba(255,255,255,0.4);
      font-size: 12px;
      margin-top: 2px;
    }

    .avsa-rec-info .price {
      color: var(--avsa-color, #256af4);
      font-size: 14px;
      font-weight: 600;
      margin-top: 4px;
    }

    .avsa-add-btn {
      padding: 6px 14px;
      background: var(--avsa-color, #256af4);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
      white-space: nowrap;
    }

    .avsa-add-btn:hover { opacity: 0.85; }
    .avsa-add-btn.added { background: #22c55e; }

    /* Responsive */
    @media (max-width: 440px) {
      #avsa-panel {
        left: 8px;
        right: 8px;
        width: auto;
        bottom: 96px;
      }
    }
  `;

  // ==============================
  // Widget HTML
  // ==============================

  function createWidget() {
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    const container = document.createElement("div");
    container.id = "avsa-widget-container";

    container.innerHTML = `
      <button id="avsa-trigger-btn" aria-label="Voice Shopping Assistant">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>

      <div id="avsa-panel">
        <div class="avsa-header">
          <div class="avsa-header-text">
            <h3>Voice Shopping Assistant</h3>
            <p id="avsa-subtitle">Tap to speak — I'll help you find products</p>
          </div>
          <div class="avsa-powered-by">Powered by<br>ElevenLabs AI</div>
        </div>

        <div class="avsa-voice-area">
          <div class="avsa-waveform" id="avsa-waveform"></div>
          <div class="avsa-status" id="avsa-status">Tap the mic to start talking</div>
        </div>

        <div class="avsa-transcript" id="avsa-transcript">
          <div class="avsa-transcript-bubble" id="avsa-transcript-text"></div>
        </div>

        <div class="avsa-recs" id="avsa-recs" style="display:none;">
          <div class="avsa-recs-title">Recommended for you</div>
          <div id="avsa-recs-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Create waveform bars
    const waveform = document.getElementById("avsa-waveform");
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = "8px";
      waveform.appendChild(bar);
    }

    return container;
  }

  // ==============================
  // ElevenLabs Conversational AI
  // ==============================

  let conversation = null;   // ElevenLabs Conversation instance
  let agentId = null;        // Fetched from /api/widget/config
  let isActive = false;
  let animationFrame = null;
  let audioContext = null;
  let analyser = null;

  /**
   * Fetch widget config from backend and initialize the widget.
   * Fetches per-store config from /api/widget/config and initializes the widget.
   */
  async function initWidget() {
    try {
      const res = await fetch(
        `${API_BASE}/api/widget/config?store_id=${encodeURIComponent(STORE_ID)}`
      );

      if (!res.ok) {
        console.warn("[AVSA] Widget config returned non-200:", res.status);
        showFallbackState("default");
        return;
      }

      const cfg = await res.json();

      // Apply dynamic visual config (color, position)
      applyWidgetConfig(cfg);

      // Check if agent is available
      if (!cfg.enabled || !cfg.has_agent) {
        showFallbackState(
          cfg.status === "active" ? "disabled" : "not_configured"
        );
        return;
      }

      // Store agent ID for voice sessions
      agentId = cfg.agent_id;

      // Apply greeting message if provided
      if (cfg.greeting_message) {
        const subtitle = document.getElementById("avsa-subtitle");
        if (subtitle) {
          subtitle.textContent = cfg.greeting_message;
        }
      }

      // Dynamically load the ElevenLabs SDK
      const script = document.createElement("script");
      script.src = ELEVENLABS_SDK_URL;
      script.onload = () => {
        console.log("[AVSA] Widget initialized. ElevenLabs SDK loaded.");
      };
      script.onerror = () => {
        console.warn("[AVSA] Failed to load ElevenLabs SDK from CDN.");
      };
      document.head.appendChild(script);
    } catch (err) {
      console.warn("[AVSA] Could not fetch widget config:", err);
      showFallbackState("default");
    }
  }

  /**
   * Apply widget visual config from backend response.
   * Updates CSS custom properties and positioning dynamically.
   * Supports all 4 corner positions: bottom-right, bottom-left, top-right, top-left.
   */
  function applyWidgetConfig(cfg) {
    const container = document.getElementById("avsa-widget-container");
    const btn = document.getElementById("avsa-trigger-btn");
    const panel = document.getElementById("avsa-panel");

    if (!container) return;

    // Set CSS custom property for dynamic color
    if (cfg.widget_color) {
      container.style.setProperty("--avsa-color", cfg.widget_color);
    }

    // Reposition based on cfg.widget_position
    const pos = cfg.widget_position || "bottom-right";

    if (btn) {
      // Horizontal position
      if (pos.includes("left")) {
        btn.style.left = "24px";
        btn.style.right = "unset";
      } else {
        btn.style.right = "24px";
        btn.style.left = "unset";
      }

      // Vertical position
      if (pos.includes("top")) {
        btn.style.top = "24px";
        btn.style.bottom = "unset";
        btn.classList.add("avsa-top");
      } else {
        btn.style.bottom = "calc(24px + var(--avsa-safe-bottom, 0px))";
        btn.style.top = "unset";
        btn.classList.remove("avsa-top");
      }
    }

    if (panel) {
      // Horizontal position
      if (pos.includes("left")) {
        panel.style.left = "24px";
        panel.style.right = "unset";
      } else {
        panel.style.right = "24px";
        panel.style.left = "unset";
      }

      // Vertical position
      if (pos.includes("top")) {
        panel.style.top = "100px";
        panel.style.bottom = "unset";
        panel.classList.add("avsa-top");
      } else {
        panel.style.bottom = "100px";
        panel.style.top = "unset";
        panel.classList.remove("avsa-top");
      }
    }
  }

  /**
   * Show graceful fallback state when agent is unavailable.
   */
  function showFallbackState(reason) {
    const btn = document.getElementById("avsa-trigger-btn");
    const status = document.getElementById("avsa-status");

    // Disable the button visually
    if (btn) {
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
      btn.onclick = null; // Remove click handler
      btn.setAttribute("aria-label", "Voice assistant unavailable");
    }

    const messages = {
      disabled: "Voice assistant is currently disabled",
      not_configured: "Voice assistant is not set up yet",
      limit_exceeded: "Voice assistant is temporarily unavailable",
      default: "Voice assistant is unavailable",
    };

    // Update status if panel is visible
    if (status) {
      status.textContent = messages[reason] || messages.default;
      status.className = "avsa-status";
    }

    console.warn("[AVSA] Fallback state:", reason);
  }

  async function startElevenLabsConversation() {
    if (!agentId) {
      updateStatus("Voice AI not configured yet", "error");
      return;
    }

    // Check if SDK is loaded
    const ElevenLabs = window.ElevenLabs || window.ElevenLabsClient;
    if (!ElevenLabs || !ElevenLabs.Conversation) {
      updateStatus("Loading voice AI...", "connecting");
      // Retry after SDK loads
      setTimeout(startElevenLabsConversation, 1500);
      return;
    }

    updateStatus("Connecting...", "connecting");

    try {
      // Request microphone with clear status
      updateStatus("Requesting microphone access...", "connecting");

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr) {
        if (micErr.name === "NotAllowedError") {
          const status = document.getElementById("avsa-status");
          if (status) {
            status.innerHTML =
              'Microphone access is needed for voice shopping. Please allow microphone access in your browser settings and try again. <span style="text-decoration:underline;cursor:pointer" id="avsa-retry-mic">Try Again</span>';
            status.className = "avsa-status error";

            // Attach retry handler
            const retryEl = document.getElementById("avsa-retry-mic");
            if (retryEl) {
              retryEl.addEventListener("click", function () {
                startElevenLabsConversation();
              });
            }
          }
          // Keep panel open so user can read the message
          return;
        } else if (micErr.name === "NotFoundError") {
          updateStatus(
            "No microphone found. Please connect a microphone to use voice shopping.",
            "error"
          );
          // Keep panel open
          return;
        } else {
          throw micErr; // Re-throw unexpected mic errors
        }
      }

      // Fetch a fresh signed URL (15-min TTL) for each conversation
      let signed_url;
      try {
        const urlRes = await fetch(
          `${API_BASE}/api/voice/signed-url?store_id=${encodeURIComponent(STORE_ID)}`
        );
        if (!urlRes.ok) {
          const errBody = await urlRes.json().catch(() => ({}));
          const detail = errBody.detail || "";

          if (urlRes.status === 503 && detail.includes("not active")) {
            showFallbackState("disabled");
            return;
          }
          if (urlRes.status === 503 && detail.includes("not configured")) {
            showFallbackState("not_configured");
            return;
          }

          // Generic non-200
          updateStatus(
            "Could not connect to voice assistant. Please try again later.",
            "error"
          );
          return;
        }
        const urlData = await urlRes.json();
        signed_url = urlData.signed_url;
      } catch (fetchErr) {
        console.warn("[AVSA] Signed URL fetch error:", fetchErr);
        updateStatus(
          "Connection error. Please check your internet and try again.",
          "error"
        );
        return;
      }

      // Start ElevenLabs conversation session via signed URL (API key stays server-side)
      conversation = await ElevenLabs.Conversation.startSession({
        signedUrl: signed_url,

        onConnect: ({ conversationId }) => {
          console.log("[AVSA] Connected. Session:", conversationId);
          updateStatus("Listening... Speak now!", "listening");
          setWaveformMode("listening");
        },

        onDisconnect: () => {
          console.log("[AVSA] Disconnected.");
          stopVoice();
        },

        onError: (message, context) => {
          console.warn("[AVSA] Voice error:", message, context);
          updateStatus("Voice error — please try again", "error");
          stopVoice();
        },

        onModeChange: ({ mode }) => {
          // mode: "listening" | "speaking"
          if (mode === "speaking") {
            updateStatus("Thinking...", "speaking");
            setWaveformMode("speaking");
            animateSpeakingWaveform();
          } else {
            updateStatus("Listening...", "listening");
            setWaveformMode("listening");
          }
        },

        onMessage: ({ message, source }) => {
          // source: "ai" | "user"
          if (source === "ai") {
            showTranscript(message);
            // Trigger product search based on what the AI says
            const keywords = extractProductKeywords(message);
            if (keywords) {
              fetchRecommendationsByQuery(keywords);
            }
          }
        },
      });
    } catch (err) {
      console.warn("[AVSA] Failed to start conversation:", err);
      updateStatus("Could not connect to Voice AI", "error");
      stopVoice();
    }
  }

  function stopElevenLabsConversation() {
    if (conversation) {
      try {
        conversation.endSession().catch(() => {});
      } catch (_) {
        // Ignore errors during cleanup
      }
      conversation = null;
    }
  }

  // ==============================
  // Toggle
  // ==============================

  function toggleVoice() {
    const btn = document.getElementById("avsa-trigger-btn");
    const panel = document.getElementById("avsa-panel");

    if (isActive) {
      stopVoice();
      btn.classList.remove("active");
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="white"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="white"/></svg>`;
      panel.classList.remove("visible");
      isActive = false;
    } else {
      panel.classList.add("visible");
      btn.classList.add("active");
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z" fill="white" rx="2"/></svg>`;
      isActive = true;
      startVoice();
    }
  }

  async function startVoice() {
    // iOS Safari fix: create AudioContext inside user gesture handler
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    // Fetch product context for initial recommendations
    const productContext = getCurrentProductContext();
    if (productContext.productId) {
      fetchRecommendations(productContext.productId);
    }
    // Start AI conversation
    await startElevenLabsConversation();
  }

  function stopVoice() {
    stopElevenLabsConversation();
    stopWaveformAnimation();
    updateStatus("Tap the mic to start talking", "");
    resetWaveform();

    const btn = document.getElementById("avsa-trigger-btn");
    const panel = document.getElementById("avsa-panel");
    if (btn) {
      btn.classList.remove("active");
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="white"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="white"/></svg>`;
    }
    if (panel) panel.classList.remove("visible");
    isActive = false;
  }

  // ==============================
  // Waveform Animation
  // ==============================

  function setWaveformMode(mode) {
    const waveform = document.getElementById("avsa-waveform");
    if (!waveform) return;
    waveform.className = `avsa-waveform ${mode}`;
  }

  function animateSpeakingWaveform() {
    stopWaveformAnimation();
    const bars = document.querySelectorAll("#avsa-waveform .bar");
    let t = 0;

    function frame() {
      t += 0.15;
      bars.forEach((bar, i) => {
        const height = 8 + Math.abs(Math.sin(t + i * 0.4)) * 42;
        bar.style.height = height + "px";
      });
      animationFrame = requestAnimationFrame(frame);
    }
    frame();
  }

  function stopWaveformAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  }

  function resetWaveform() {
    stopWaveformAnimation();
    const bars = document.querySelectorAll("#avsa-waveform .bar");
    bars.forEach((bar) => (bar.style.height = "8px"));
    const waveform = document.getElementById("avsa-waveform");
    if (waveform) waveform.className = "avsa-waveform";
  }

  // ==============================
  // Transcript
  // ==============================

  function showTranscript(text) {
    const container = document.getElementById("avsa-transcript");
    const el = document.getElementById("avsa-transcript-text");
    if (!container || !el) return;
    el.textContent = text;
    container.style.display = "block";
  }

  // ==============================
  // Product Context Detection
  // ==============================

  function getCurrentProductContext() {
    const context = { productId: null, title: "", url: window.location.href };

    try {
      const metaProductId = document.querySelector('meta[property="og:product:id"]');
      if (metaProductId) {
        context.productId = metaProductId.getAttribute("content");
      }

      if (typeof window.ShopifyAnalytics !== "undefined" && window.ShopifyAnalytics.meta) {
        const meta = window.ShopifyAnalytics.meta;
        if (meta.product) {
          context.productId = meta.product.id;
          context.title = meta.product.type || "";
        }
      }

      const urlMatch = window.location.pathname.match(/\/products\/([^/?]+)/);
      if (urlMatch && !context.productId) {
        context.title = urlMatch[1].replace(/-/g, " ");
      }
    } catch (err) {
      console.warn("[AVSA] Product context detection error:", err);
    }

    return context;
  }

  function extractProductKeywords(aiMessage) {
    // Simple keyword extraction from AI messages mentioning products
    const lower = aiMessage.toLowerCase();
    const patterns = [
      /(?:recommend|suggest|show|find|looking for|try)\s+([a-z\s]+)/i,
      /(?:product|item|style)\s+(?:called|named)?\s+"?([^"]+)"?/i,
    ];
    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        return match[1].trim();
      }
    }
    return null;
  }

  // ==============================
  // Recommendations
  // ==============================

  async function fetchRecommendations(productId) {
    try {
      const response = await fetch(
        `${API_BASE}/api/recommendations?product_id=${productId}&store_id=${encodeURIComponent(STORE_ID)}&limit=4`
      );
      if (!response.ok) {
        console.warn("[AVSA] Recommendation fetch returned:", response.status);
        return;
      }
      const data = await response.json();
      if (data.recommendations && data.recommendations.length > 0) {
        renderRecommendations(data.recommendations);
      }
    } catch (err) {
      console.warn("[AVSA] Recommendation fetch error:", err);
    }
  }

  async function fetchRecommendationsByQuery(query) {
    try {
      const response = await fetch(
        `${API_BASE}/api/products/search?store_id=${encodeURIComponent(STORE_ID)}&query=${encodeURIComponent(query)}&limit=4`
      );
      if (!response.ok) {
        console.warn("[AVSA] Product search returned:", response.status);
        return;
      }
      const data = await response.json();
      if (data.products && data.products.length > 0) {
        renderRecommendations(data.products);
      }
    } catch (err) {
      console.warn("[AVSA] Product search error:", err);
    }
  }

  function renderRecommendations(recs) {
    const container = document.getElementById("avsa-recs");
    const list = document.getElementById("avsa-recs-list");
    if (!container || !list) return;

    list.innerHTML = recs
      .map(
        (rec) => `
        <div class="avsa-rec-card" data-product-id="${rec.id}">
          <img src="${rec.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect fill="%23333" width="56" height="56"/><text x="28" y="32" text-anchor="middle" fill="%23666" font-size="10">No img</text></svg>'}" alt="${rec.title}" loading="lazy" />
          <div class="avsa-rec-info">
            <div class="title">${rec.title}</div>
            <div class="type">${rec.recommendation_type === "complementary" ? "Goes great with" : rec.recommendation_type === "similar" ? "Similar style" : "Popular pick"}</div>
            <div class="price">$${parseFloat(rec.price || 0).toFixed(2)}</div>
          </div>
          <button class="avsa-add-btn" onclick="window.__avsa_addToCart(${rec.id})">Add</button>
        </div>
      `
      )
      .join("");

    container.style.display = "block";
  }

  // ==============================
  // Shopify Cart Integration
  // ==============================

  window.__avsa_addToCart = async function (productId) {
    const btn = document.querySelector(
      `.avsa-rec-card[data-product-id="${productId}"] .avsa-add-btn`
    );

    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, quantity: 1 }),
      });

      if (response.ok) {
        if (btn) {
          btn.textContent = "Added";
          btn.classList.add("added");
          setTimeout(() => {
            btn.textContent = "Add";
            btn.classList.remove("added");
          }, 2000);
        }
      } else {
        // Try with variant ID
        try {
          const productRes = await fetch(`/products/${productId}.js`);
          if (productRes.ok) {
            const product = await productRes.json();
            const variantId = product.variants?.[0]?.id;
            if (variantId) {
              await fetch("/cart/add.js", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: variantId, quantity: 1 }),
              });
              if (btn) {
                btn.textContent = "Added";
                btn.classList.add("added");
              }
            }
          }
        } catch (variantErr) {
          console.warn("[AVSA] Variant fallback error:", variantErr);
          if (btn) btn.textContent = "Error";
        }
      }
    } catch (err) {
      console.warn("[AVSA] Add to cart error:", err);
      if (btn) btn.textContent = "Error";
    }
  };

  // ==============================
  // Utilities
  // ==============================

  function updateStatus(text, className) {
    const el = document.getElementById("avsa-status");
    if (el) {
      el.textContent = text;
      el.className = "avsa-status" + (className ? " " + className : "");
    }
  }

  // ==============================
  // Init
  // ==============================

  function init() {
    createWidget();
    document
      .getElementById("avsa-trigger-btn")
      .addEventListener("click", toggleVoice);

    // Fetch widget config and initialize from backend
    initWidget();

    console.log("[AVSA] Widget v3.0 loaded for store:", STORE_ID);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
