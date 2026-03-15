import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/testApp.js';

// Mock supabase
vi.mock('../../src/services/db.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              agent_id: 'agent_test123',
              name: 'Test Biz',
              default_mode: 'chat',
              welcome_message: 'Hello!',
              branding: { color: '#ff0000', logo: null, position: 'bottom-right' },
              allowed_domains: [],
              is_active: true,
              status: 'active',
            },
            error: null,
          }),
        }),
      }),
    }),
  },
}));

describe('GET /api/config/:agentId', () => {
  it('returns agent config', async () => {
    const app = getTestApp();
    const res = await request(app).get('/api/config/agent_test123');
    expect(res.status).toBe(200);
    expect(res.body.agentId).toBe('agent_test123');
    expect(res.body.defaultMode).toBe('chat');
    expect(res.body.branding).toBeDefined();
    expect(res.body.welcomeMessage).toBe('Hello!');
  });
});
