/**
 * AI Voice Shopping Assistant — Storefront Widget Embed Script
 *
 * This is a standalone vanilla JS widget that can be injected into any Shopify
 * storefront via Theme App Extension or script tag. It provides:
 *
 * - Floating voice button (configurable position/color)
 * - ElevenLabs Conversational AI voice interaction
 * - Product recommendation overlay
 * - Shopify AJAX Cart API integration (add-to-cart from voice)
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
    SCRIPT_TAG?.getAttribute("data-api-url") || "http://localhost:8000";
  const WIDGET_COLOR =
    SCRIPT_TAG?.getAttribute("data-color") || "#6366f1";
  const WIDGET_POSITION =
    SCRIPT_TAG?.getAttribute("data-position") || "bottom-right";

  // ==============================
  // Styles
  // ==============================

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    #avsa-widget-container * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Floating Button */
    #avsa-trigger-btn {
      position: fixed;
      ${WIDGET_POSITION === "bottom-left" ? "left: 24px" : "right: 24px"};
      bottom: 24px;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${WIDGET_COLOR};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25), 0 0 0 0 ${WIDGET_COLOR}40;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.3s ease;
      animation: avsa-pulse 2s ease-in-out infinite;
    }

    #avsa-trigger-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 32px rgba(0, 0, 0, 0.3), 0 0 0 8px ${WIDGET_COLOR}20;
    }

    #avsa-trigger-btn.active {
      animation: none;
      background: #ef4444;
    }

    @keyframes avsa-pulse {
      0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 0 0 ${WIDGET_COLOR}40; }
      50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 0 12px ${WIDGET_COLOR}00; }
    }

    #avsa-trigger-btn svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    /* Voice Panel */
    #avsa-panel {
      position: fixed;
      ${WIDGET_POSITION === "bottom-left" ? "left: 24px" : "right: 24px"};
      bottom: 100px;
      width: 380px;
      max-height: 520px;
      background: rgba(15, 15, 25, 0.95);
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
    }

    .avsa-header h3 {
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .avsa-header p {
      color: rgba(255, 255, 255, 0.5);
      font-size: 13px;
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
      background: ${WIDGET_COLOR};
      transition: height 0.1s ease;
    }

    .avsa-status {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      text-align: center;
    }

    .avsa-status.listening {
      color: #22c55e;
    }

    .avsa-status.speaking {
      color: ${WIDGET_COLOR};
    }

    /* Recommendations Area */
    .avsa-recs {
      padding: 0 16px 16px;
      overflow-y: auto;
      max-height: 280px;
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
      border-color: ${WIDGET_COLOR}40;
    }

    .avsa-rec-card img {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      background: rgba(255, 255, 255, 0.05);
    }

    .avsa-rec-info {
      flex: 1;
      min-width: 0;
    }

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
      color: ${WIDGET_COLOR};
      font-size: 14px;
      font-weight: 600;
      margin-top: 4px;
    }

    .avsa-add-btn {
      padding: 6px 14px;
      background: ${WIDGET_COLOR};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
      white-space: nowrap;
    }

    .avsa-add-btn:hover {
      opacity: 0.85;
    }

    .avsa-add-btn.added {
      background: #22c55e;
    }

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
    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.textContent = STYLES;
    document.head.appendChild(styleEl);

    // Container
    const container = document.createElement("div");
    container.id = "avsa-widget-container";

    // Floating button
    container.innerHTML = `
      <button id="avsa-trigger-btn" aria-label="Voice Shopping Assistant">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
      </button>

      <div id="avsa-panel">
        <div class="avsa-header">
          <h3>🎙️ Voice Shopping Assistant</h3>
          <p>Tap to speak — I'll help you find products</p>
        </div>

        <div class="avsa-voice-area">
          <div class="avsa-waveform" id="avsa-waveform"></div>
          <div class="avsa-status" id="avsa-status">Tap the mic to start talking</div>
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
  // Voice Interaction
  // ==============================

  let isActive = false;
  let mediaRecorder = null;
  let audioContext = null;
  let analyser = null;

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
    updateStatus("Connecting...", "");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio visualizer
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      animateWaveform();
      updateStatus("🎤 Listening... Speak now!", "listening");

      // Fetch product context (current page product)
      const productContext = getCurrentProductContext();

      // Fetch recommendations based on current product
      if (productContext.productId) {
        fetchRecommendations(productContext.productId);
      }

      // In production, this connects to ElevenLabs Conversational AI
      // For now, simulate listening
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

    } catch (err) {
      console.error("Voice error:", err);
      updateStatus("⚠️ Microphone access denied", "");
    }
  }

  function stopVoice() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((t) => t.stop());
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    updateStatus("Tap the mic to start talking", "");
    resetWaveform();
  }

  // ==============================
  // Waveform Animation
  // ==============================

  let animationFrame = null;

  function animateWaveform() {
    if (!analyser) return;

    const bars = document.querySelectorAll("#avsa-waveform .bar");
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      if (!analyser) return;
      analyser.getByteFrequencyData(dataArray);

      bars.forEach((bar, i) => {
        const value = dataArray[i] || 0;
        const height = Math.max(4, (value / 255) * 50);
        bar.style.height = height + "px";
      });

      animationFrame = requestAnimationFrame(draw);
    }
    draw();
  }

  function resetWaveform() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    const bars = document.querySelectorAll("#avsa-waveform .bar");
    bars.forEach((bar) => (bar.style.height = "8px"));
  }

  // ==============================
  // Product Context Detection
  // ==============================

  function getCurrentProductContext() {
    // Try to detect current product from Shopify page
    const context = { productId: null, title: "", price: "", url: window.location.href };

    // Shopify exposes product data in meta tags
    const metaProductId = document.querySelector('meta[property="og:product:id"]');
    if (metaProductId) {
      context.productId = metaProductId.getAttribute("content");
    }

    // Also try Shopify's global product object
    if (typeof window.ShopifyAnalytics !== "undefined" && window.ShopifyAnalytics.meta) {
      const meta = window.ShopifyAnalytics.meta;
      if (meta.product) {
        context.productId = meta.product.id;
        context.title = meta.product.type || "";
      }
    }

    // Fallback: parse from URL (/products/product-handle)
    const urlMatch = window.location.pathname.match(/\/products\/([^/?]+)/);
    if (urlMatch && !context.productId) {
      context.title = urlMatch[1].replace(/-/g, " ");
    }

    return context;
  }

  // ==============================
  // Recommendations
  // ==============================

  async function fetchRecommendations(productId) {
    try {
      const response = await fetch(
        `${API_BASE}/api/recommendations?product_id=${productId}&store_id=${STORE_ID}&limit=4`
      );
      const data = await response.json();

      if (data.recommendations && data.recommendations.length > 0) {
        renderRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error("Recommendation fetch error:", err);
    }
  }

  function renderRecommendations(recs) {
    const container = document.getElementById("avsa-recs");
    const list = document.getElementById("avsa-recs-list");

    list.innerHTML = recs
      .map(
        (rec) => `
        <div class="avsa-rec-card" data-product-id="${rec.id}">
          <img src="${rec.image || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect fill="%23333" width="56" height="56"/><text x="28" y="32" text-anchor="middle" fill="%23666" font-size="10">No img</text></svg>'}" alt="${rec.title}" loading="lazy" />
          <div class="avsa-rec-info">
            <div class="title">${rec.title}</div>
            <div class="type">${rec.recommendation_type === "complementary" ? "Goes great with" : rec.recommendation_type === "similar" ? "Similar style" : "Popular"}</div>
            <div class="price">$${rec.price.toFixed(2)}</div>
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
      // Use Shopify AJAX Cart API
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, quantity: 1 }),
      });

      if (response.ok) {
        if (btn) {
          btn.textContent = "✓ Added";
          btn.classList.add("added");
          setTimeout(() => {
            btn.textContent = "Add";
            btn.classList.remove("added");
          }, 2000);
        }
      } else {
        // If variant ID is needed, try first variant
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
              btn.textContent = "✓ Added";
              btn.classList.add("added");
            }
          }
        }
      }
    } catch (err) {
      console.error("Add to cart error:", err);
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
    console.log("[AI Voice Shopping Assistant] Widget loaded for store:", STORE_ID);
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
