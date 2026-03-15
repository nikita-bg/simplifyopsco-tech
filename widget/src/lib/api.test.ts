import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAgentConfig,
  createSession,
  sendChat,
  sendHybrid,
  getVoiceToken,
  sendContext,
} from './api';
import type { PageContext } from './types';

const BACKEND = 'https://widget-backend.simplifyopsco.tech';

const mockPageContext: PageContext = {
  url: 'https://example.com',
  title: 'Example',
  products: [],
  sections: [],
};

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ─── getAgentConfig ────────────────────────────────────────────────────────

describe('getAgentConfig', () => {
  it('calls correct URL and returns config', async () => {
    const config = {
      agentId: 'agent_123',
      businessName: 'Acme',
      primaryColor: '#ff0000',
      defaultMode: 'chat',
      welcomeMessage: 'Hello',
    };
    vi.stubGlobal('fetch', mockFetch(config));

    const result = await getAgentConfig('agent_123');

    expect(fetch).toHaveBeenCalledWith(`${BACKEND}/api/config/agent_123`);
    expect(result.agentId).toBe('agent_123');
    expect(result.businessName).toBe('Acme');
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 404));
    await expect(getAgentConfig('agent_bad')).rejects.toThrow('Config fetch failed: 404');
  });
});

// ─── createSession ─────────────────────────────────────────────────────────

describe('createSession', () => {
  it('POSTs agent_id and returns session with token', async () => {
    vi.stubGlobal('fetch', mockFetch({ token: 'tok_abc123' }));

    const session = await createSession('agent_123');

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/session`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ agent_id: 'agent_123' }),
      })
    );
    expect(session.token).toBe('tok_abc123');
    expect(session.agentId).toBe('agent_123');
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 403));
    await expect(createSession('agent_bad')).rejects.toThrow('Session creation failed: 403');
  });
});

// ─── sendChat ──────────────────────────────────────────────────────────────

describe('sendChat', () => {
  it('POSTs to /api/chat with Authorization header', async () => {
    const mockResponse = { ok: true, status: 200, json: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const res = await sendChat('tok_abc', 'Hello', mockPageContext);

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/chat`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer tok_abc',
        }),
        body: JSON.stringify({ message: 'Hello', pageContext: mockPageContext }),
      })
    );
    expect(res).toBe(mockResponse);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 401));
    await expect(sendChat('bad', 'msg')).rejects.toThrow('Chat request failed: 401');
  });

  it('works without pageContext', async () => {
    const mockResponse = { ok: true, status: 200, json: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await sendChat('tok_abc', 'Hello');
    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/chat`,
      expect.objectContaining({ body: JSON.stringify({ message: 'Hello', pageContext: undefined }) })
    );
  });
});

// ─── sendHybrid ────────────────────────────────────────────────────────────

describe('sendHybrid', () => {
  it('POSTs to /api/chat/hybrid with Authorization header', async () => {
    const mockResponse = { ok: true, status: 200, json: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const res = await sendHybrid('tok_abc', 'Hello');

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/chat/hybrid`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok_abc' }),
      })
    );
    expect(res).toBe(mockResponse);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 500));
    await expect(sendHybrid('tok', 'msg')).rejects.toThrow('Hybrid request failed: 500');
  });
});

// ─── getVoiceToken ─────────────────────────────────────────────────────────

describe('getVoiceToken', () => {
  it('POSTs to /api/voice/token and returns token data', async () => {
    const tokenData = { ephemeralKey: 'ek_test', sessionConfig: {} };
    vi.stubGlobal('fetch', mockFetch(tokenData));

    const result = await getVoiceToken('tok_abc', mockPageContext);

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/voice/token`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok_abc' }),
      })
    );
    expect(result.ephemeralKey).toBe('ek_test');
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 403));
    await expect(getVoiceToken('tok', mockPageContext)).rejects.toThrow(
      'Voice token request failed: 403'
    );
  });
});

// ─── sendContext ───────────────────────────────────────────────────────────

describe('sendContext', () => {
  it('POSTs page context to /api/context', async () => {
    const mockResponse = { ok: true, status: 200, json: vi.fn() };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    await sendContext('tok_abc', mockPageContext);

    expect(fetch).toHaveBeenCalledWith(
      `${BACKEND}/api/context`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok_abc' }),
        body: JSON.stringify(mockPageContext),
      })
    );
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, 500));
    await expect(sendContext('tok', mockPageContext)).rejects.toThrow(
      'Context upload failed: 500'
    );
  });
});
