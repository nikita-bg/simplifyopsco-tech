import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAgentId,
  getOwnScript,
  fetchAgentConfig,
  clearConfigCache,
  createLauncherButton,
  createWidgetIframe,
  openWidget,
  closeWidget,
  setupMessageRouter,
  watchSPANavigation,
} from '../src/embed';

// ─── helpers ─────────────────────────────────────────────────────────────────

const WIDGET_ORIGIN = 'https://widget.simplifyopsco.tech';
const BACKEND_URL = 'https://widget-backend.simplifyopsco.tech';

const defaultConfig = {
  agentId: 'agent_test123',
  primaryColor: '#6366f1',
  welcomeMessage: 'Hi!',
  defaultMode: 'chat' as const,
  position: 'bottom-right' as const,
  allowedDomains: [],
};

function appendScript(agentId?: string): HTMLScriptElement {
  const s = document.createElement('script');
  if (agentId) s.dataset.agent = agentId;
  document.body.appendChild(s);
  return s;
}

// ─── getAgentId ───────────────────────────────────────────────────────────────

describe('getAgentId()', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('reads agent id from script data-agent attribute', () => {
    appendScript('agent_abc123');
    expect(getAgentId()).toBe('agent_abc123');
  });

  it('returns null when no script with data-agent exists', () => {
    document.body.innerHTML = '<p>nothing here</p>';
    expect(getAgentId()).toBeNull();
  });
});

// ─── fetchAgentConfig ─────────────────────────────────────────────────────────

describe('fetchAgentConfig()', () => {
  beforeEach(() => {
    clearConfigCache();
    global.fetch = vi.fn();
  });
  afterEach(() => {
    clearConfigCache();
    vi.restoreAllMocks();
  });

  it('fetches config from correct URL', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        primaryColor: '#ff0000',
        defaultMode: 'hybrid',
        welcomeMessage: 'Hello!',
        allowedDomains: ['myshop.com'],
      }),
    });

    const cfg = await fetchAgentConfig('agent_xyz');
    expect(global.fetch).toHaveBeenCalledWith(`${BACKEND_URL}/api/config/agent_xyz`);
    expect(cfg.primaryColor).toBe('#ff0000');
    expect(cfg.defaultMode).toBe('hybrid');
    expect(cfg.agentId).toBe('agent_xyz');
  });

  it('applies defaults for missing optional fields', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const cfg = await fetchAgentConfig('agent_defaults');
    expect(cfg.primaryColor).toBe('#6366f1');
    expect(cfg.defaultMode).toBe('chat');
    expect(cfg.position).toBe('bottom-right');
  });

  it('throws on non-ok response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    await expect(fetchAgentConfig('bad_agent')).rejects.toThrow('404');
  });
});

// ─── createLauncherButton ─────────────────────────────────────────────────────

describe('createLauncherButton()', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('creates a button element with correct aria-label', () => {
    const btn = createLauncherButton(defaultConfig);
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('aria-label')).toBe('Open AI assistant');
  });

  it('applies primary color as background', () => {
    const btn = createLauncherButton({ ...defaultConfig, primaryColor: '#ff5500' });
    expect(btn.style.background).toBe('rgb(255, 85, 0)');
  });

  it('positions bottom-right by default', () => {
    const btn = createLauncherButton(defaultConfig);
    expect(btn.style.right).toBe('24px');
    expect(btn.style.bottom).toBe('24px');
  });

  it('positions bottom-left when configured', () => {
    const btn = createLauncherButton({ ...defaultConfig, position: 'bottom-left' });
    expect(btn.style.left).toBe('24px');
  });

  it('shows logo image when logoUrl is set', () => {
    const btn = createLauncherButton({ ...defaultConfig, logoUrl: 'https://example.com/logo.png' });
    expect(btn.querySelector('img')).not.toBeNull();
  });

  it('shows SVG icon when no logoUrl', () => {
    const btn = createLauncherButton(defaultConfig);
    expect(btn.querySelector('svg')).not.toBeNull();
  });
});

// ─── createWidgetIframe ───────────────────────────────────────────────────────

describe('createWidgetIframe()', () => {
  it('creates an iframe with correct src', () => {
    const iframe = createWidgetIframe(defaultConfig);
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.src).toContain('agent_test123');
    expect(iframe.src).toContain('mode=chat');
  });

  it('iframe is initially hidden', () => {
    const iframe = createWidgetIframe(defaultConfig);
    expect(iframe.style.display).toBe('none');
  });

  it('has microphone permission', () => {
    const iframe = createWidgetIframe(defaultConfig);
    expect(iframe.getAttribute('allow')).toContain('microphone');
  });
});

// ─── openWidget / closeWidget ─────────────────────────────────────────────────

describe('openWidget() / closeWidget()', () => {
  let iframe: HTMLIFrameElement;
  let btn: HTMLButtonElement;

  beforeEach(() => {
    iframe = createWidgetIframe(defaultConfig);
    btn = createLauncherButton(defaultConfig);
    document.body.appendChild(iframe);
    document.body.appendChild(btn);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('openWidget shows the iframe', () => {
    openWidget(iframe, btn);
    expect(iframe.style.display).toBe('block');
  });

  it('openWidget sets aria-expanded=true on button', () => {
    openWidget(iframe, btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('closeWidget sets aria-expanded=false and hides iframe after delay', async () => {
    vi.useFakeTimers();
    openWidget(iframe, btn);
    closeWidget(iframe, btn, defaultConfig);
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    vi.advanceTimersByTime(250);
    expect(iframe.style.display).toBe('none');
    vi.useRealTimers();
  });
});

// ─── setupMessageRouter ───────────────────────────────────────────────────────

describe('setupMessageRouter()', () => {
  let iframe: HTMLIFrameElement;
  let btn: HTMLButtonElement;

  beforeEach(() => {
    iframe = createWidgetIframe(defaultConfig);
    btn = createLauncherButton(defaultConfig);
    document.body.appendChild(iframe);
    document.body.appendChild(btn);
    setupMessageRouter(iframe, btn, defaultConfig);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  function dispatchMessage(data: object, origin = WIDGET_ORIGIN) {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  }

  it('ignores messages from unknown origins', () => {
    // open widget first so close would be detectable
    openWidget(iframe, btn);
    dispatchMessage({ type: 'so:close' }, 'https://evil.com');
    // still open
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes widget on so:close message', () => {
    vi.useFakeTimers();
    openWidget(iframe, btn);
    dispatchMessage({ type: 'so:close' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    vi.useRealTimers();
  });

  it('does not throw on unknown message types', () => {
    expect(() => dispatchMessage({ type: 'unknownType' })).not.toThrow();
  });
});

// ─── watchSPANavigation ───────────────────────────────────────────────────────

describe('watchSPANavigation()', () => {
  let iframe: HTMLIFrameElement;
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let mockContentWindow: { postMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    iframe = createWidgetIframe(defaultConfig);
    mockContentWindow = { postMessage: vi.fn() };
    postMessageSpy = mockContentWindow.postMessage;
    // contentWindow is read-only in jsdom — override via defineProperty
    Object.defineProperty(iframe, 'contentWindow', {
      get: () => mockContentWindow,
      configurable: true,
    });
    watchSPANavigation(iframe);
  });

  it('sends pageContext to iframe on pushState navigation', () => {
    history.pushState({}, '', '/new-page');
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'so:pageContext' }),
      WIDGET_ORIGIN,
    );
  });

  it('does not send pageContext if URL did not change', () => {
    postMessageSpy.mockClear();
    history.pushState({}, '', window.location.pathname); // same URL
    expect(postMessageSpy).not.toHaveBeenCalled();
  });
});
