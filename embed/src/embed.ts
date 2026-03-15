/**
 * embed.ts — Main embed script loaded on the customer's website.
 * Injected as a single <script> tag; bundles bridge.ts via Rollup.
 *
 * Responsibilities:
 *  1. Read agent ID from own <script data-agent="..."> tag
 *  2. Fetch agent config (branding, colors, default mode)
 *  3. Create floating launcher button (bottom-right, branded color)
 *  4. On click: open widget iframe (widget.simplifyops.co)
 *  5. Route postMessage commands from iframe to bridge functions
 *  6. Respond to getPageContext requests from iframe
 */

import {
  getPageContext,
  scrollToElement,
  highlightElement,
  navigateTo,
  showProductCard,
  showComparison,
  openContactForm,
  initBridge,
  BridgeCommand,
} from './bridge';

// ─── Config types ─────────────────────────────────────────────────────────────

interface AgentConfig {
  agentId: string;
  primaryColor: string;
  logoUrl?: string;
  welcomeMessage: string;
  defaultMode: 'chat' | 'hybrid' | 'voice';
  position: 'bottom-right' | 'bottom-left';
  allowedDomains: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKEND_URL = 'https://widget-backend.simplifyops.co';
const WIDGET_ORIGIN = 'https://widget.simplifyops.co';
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 min

// ─── State ────────────────────────────────────────────────────────────────────

let _config: AgentConfig | null = null;
let _iframe: HTMLIFrameElement | null = null;
let _isOpen = false;

// ─── Script self-reference ────────────────────────────────────────────────────

export function getOwnScript(): HTMLScriptElement | null {
  // Current script during synchronous execution
  if (document.currentScript) {
    return document.currentScript as HTMLScriptElement;
  }
  // Fallback: find script with data-agent attribute
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[data-agent]'));
  return scripts[scripts.length - 1] ?? null;
}

export function getAgentId(): string | null {
  const script = getOwnScript();
  return script?.dataset.agent ?? null;
}

// ─── Config fetching ──────────────────────────────────────────────────────────

let _configCachedAt = 0;

export function clearConfigCache(): void {
  _config = null;
  _configCachedAt = 0;
}

export async function fetchAgentConfig(agentId: string): Promise<AgentConfig> {
  const now = Date.now();
  if (_config && _configCachedAt > 0 && now - _configCachedAt < CONFIG_CACHE_TTL) return _config;

  const res = await fetch(`${BACKEND_URL}/api/config/${agentId}`);
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  const data = await res.json();

  _config = {
    agentId,
    primaryColor: data.primaryColor ?? '#6366f1',
    logoUrl: data.logoUrl,
    welcomeMessage: data.welcomeMessage ?? 'Hi! How can I help you today?',
    defaultMode: data.defaultMode ?? 'chat',
    position: data.position ?? 'bottom-right',
    allowedDomains: data.allowedDomains ?? [],
  };
  _configCachedAt = now;
  return _config;
}

// ─── Launcher button ──────────────────────────────────────────────────────────

export function createLauncherButton(config: AgentConfig): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'so-widget-launcher';
  btn.setAttribute('aria-label', 'Open AI assistant');

  Object.assign(btn.style, {
    position: 'fixed',
    [config.position === 'bottom-left' ? 'left' : 'right']: '24px',
    bottom: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: config.primaryColor,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
    zIndex: '2147483640',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    padding: '0',
  });

  if (config.logoUrl) {
    const img = document.createElement('img');
    img.src = config.logoUrl;
    img.alt = '';
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.borderRadius = '50%';
    btn.appendChild(img);
  } else {
    // Default chat bubble SVG icon
    btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>`;
  }

  // Hover effects
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'scale(1.08)';
    btn.style.boxShadow = '0 6px 24px rgba(0,0,0,0.28)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 4px 16px rgba(0,0,0,0.22)';
  });

  return btn;
}

// ─── Widget iframe ────────────────────────────────────────────────────────────

export function createWidgetIframe(config: AgentConfig): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.id = 'so-widget-iframe';
  iframe.src = `${WIDGET_ORIGIN}?agent=${config.agentId}&mode=${config.defaultMode}`;
  iframe.title = 'AI Assistant';
  iframe.setAttribute('allow', 'microphone');

  const side = config.position === 'bottom-left' ? 'left' : 'right';
  Object.assign(iframe.style, {
    position: 'fixed',
    [side]: '24px',
    bottom: '96px',
    width: '380px',
    height: '600px',
    maxHeight: 'calc(100vh - 120px)',
    border: 'none',
    borderRadius: '16px',
    boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
    zIndex: '2147483641',
    background: 'transparent',
    display: 'none',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    opacity: '0',
    transform: 'translateY(8px)',
  });

  return iframe;
}

// ─── Open / close ─────────────────────────────────────────────────────────────

export function openWidget(iframe: HTMLIFrameElement, btn: HTMLButtonElement): void {
  iframe.style.display = 'block';
  // Trigger transition on next frame
  requestAnimationFrame(() => {
    iframe.style.opacity = '1';
    iframe.style.transform = 'translateY(0)';
  });
  btn.setAttribute('aria-expanded', 'true');
  _isOpen = true;

  // Update icon to close (X)
  btn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>`;
}

export function closeWidget(iframe: HTMLIFrameElement, btn: HTMLButtonElement, config: AgentConfig): void {
  iframe.style.opacity = '0';
  iframe.style.transform = 'translateY(8px)';
  setTimeout(() => { iframe.style.display = 'none'; }, 200);
  btn.setAttribute('aria-expanded', 'false');
  _isOpen = false;

  // Restore original icon
  if (config.logoUrl) {
    btn.innerHTML = `<img src="${config.logoUrl}" alt="" style="width:32px;height:32px;border-radius:50%;" />`;
  } else {
    btn.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>`;
  }
}

// ─── postMessage routing ──────────────────────────────────────────────────────

type IframeMessage = (BridgeCommand | { type: 'so:close' } | { type: 'so:ready' }) & {
  __soMsgId?: string;
};

export function setupMessageRouter(iframe: HTMLIFrameElement, btn: HTMLButtonElement, config: AgentConfig): void {
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.origin !== WIDGET_ORIGIN) return;

    const msg = event.data as IframeMessage;
    if (!msg?.type) return;

    // Widget lifecycle commands
    if (msg.type === 'so:close') {
      closeWidget(iframe, btn, config);
      return;
    }

    if (msg.type === 'so:ready') {
      // Widget iframe is ready — send initial page context
      const ctx = getPageContext();
      iframe.contentWindow?.postMessage(
        { type: 'so:pageContext', context: ctx },
        WIDGET_ORIGIN,
      );
      return;
    }

    // Bridge DOM commands — route through handleBridgeMessage
    const result = routeBridgeCommand(msg as BridgeCommand);

    // Send result back if needed (e.g. getPageContext)
    if (result !== undefined && msg.__soMsgId) {
      iframe.contentWindow?.postMessage(
        { __soResponse: true, __soMsgId: msg.__soMsgId, result },
        WIDGET_ORIGIN,
      );
    }
  });
}

function routeBridgeCommand(msg: BridgeCommand): unknown {
  switch (msg.type) {
    case 'getPageContext':
      return getPageContext();
    case 'scrollToElement':
      if (msg.ref) scrollToElement(msg.ref);
      break;
    case 'highlightElement':
      if (msg.ref) highlightElement(msg.ref);
      break;
    case 'navigateTo':
      if (msg.url) navigateTo(msg.url);
      break;
    case 'showProductCard':
      showProductCard(msg.data ?? {});
      break;
    case 'showComparison':
      showComparison(msg.products ?? []);
      break;
    case 'openContactForm':
      openContactForm();
      break;
    default:
      break;
  }
}

// ─── SPA navigation detection ─────────────────────────────────────────────────

export function watchSPANavigation(iframe: HTMLIFrameElement): void {
  let lastUrl = window.location.href;

  const notify = () => {
    if (window.location.href === lastUrl) return;
    lastUrl = window.location.href;

    const ctx = getPageContext();
    iframe.contentWindow?.postMessage(
      { type: 'so:pageContext', context: ctx },
      WIDGET_ORIGIN,
    );
  };

  // History API patching
  const origPushState = history.pushState.bind(history);
  const origReplaceState = history.replaceState.bind(history);

  history.pushState = (...args) => { origPushState(...args); notify(); };
  history.replaceState = (...args) => { origReplaceState(...args); notify(); };

  window.addEventListener('popstate', notify);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function init(): Promise<void> {
  const agentId = getAgentId();
  if (!agentId) {
    console.warn('[SimplifyOps] No data-agent attribute found on embed script tag.');
    return;
  }

  let config: AgentConfig;
  try {
    config = await fetchAgentConfig(agentId);
  } catch (err) {
    console.warn('[SimplifyOps] Failed to load agent config:', err);
    return;
  }

  // Create DOM elements
  const btn = createLauncherButton(config);
  const iframe = createWidgetIframe(config);
  _iframe = iframe;

  document.body.appendChild(iframe);
  document.body.appendChild(btn);

  // Toggle on button click
  btn.addEventListener('click', () => {
    if (_isOpen) {
      closeWidget(iframe, btn, config);
    } else {
      openWidget(iframe, btn);
    }
  });

  // Route postMessage commands
  setupMessageRouter(iframe, btn, config);

  // Watch SPA navigations
  watchSPANavigation(iframe);

  // Init bridge postMessage listener (accepts from widget origin)
  initBridge(WIDGET_ORIGIN);
}

// ─── Auto-init on DOM ready ───────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { void init(); });
  } else {
    void init();
  }
}
