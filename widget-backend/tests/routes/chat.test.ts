import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock gemini before imports — factory must not reference outer variables
vi.mock('../../src/services/gemini.js', () => ({
  streamChat: async function* () {
    yield { type: 'text_delta', content: 'Hello! ' };
    yield { type: 'text_delta', content: 'How can I help?' };
    yield { type: 'actions', actions: [{ type: 'scrollToElement', ref: 'product-1' }] };
    yield { type: 'done' };
  },
}));

// Override supabase mock with inline functions (no outer variable refs)
vi.mock('../../src/services/db.js', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'businesses') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  system_prompt: 'You are a helpful sales assistant.',
                  conversation_count: 5,
                  conversation_limit: 25,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'conversations') {
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'conv-uuid-123' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'messages') {
        return {
          insert: () => Promise.resolve({ data: null, error: null }),
        };
      }
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
    },
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

import { createApp } from '../../src/index.js';
import type { SessionStore } from '../../src/services/sessionStore.js';

describe('POST /api/chat', () => {
  let app: ReturnType<typeof createApp>;
  let sessionStore: SessionStore;
  let token: string;

  beforeEach(() => {
    app = createApp();
    sessionStore = (app as any).sessionStore;

    // Create a session for testing — IP and UA must match what supertest sends
    token = sessionStore.create({
      agentId: 'agent_test123',
      businessId: 'biz-uuid-123',
      visitorIp: '127.0.0.1',
      userAgent: 'test-agent',
    });
  });

  it('returns 401 without session token', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('returns 400 without message', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', '127.0.0.1')
      .set('User-Agent', 'test-agent')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('message_required');
  });

  it('streams SSE response with text and actions', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', '127.0.0.1')
      .set('User-Agent', 'test-agent')
      .send({ message: 'Show me laptops' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    // Check text delta
    expect(res.text).toContain('event: text_delta');
    expect(res.text).toContain('Hello!');

    // Check actions
    expect(res.text).toContain('event: actions');
    expect(res.text).toContain('scrollToElement');

    // Check done
    expect(res.text).toContain('event: done');
  });
});
