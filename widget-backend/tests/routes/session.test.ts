import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock supabase before importing app
const mockSingle = vi.fn();
vi.mock('../../src/services/db.js', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

// Import after mock
import { createApp } from '../../src/index.js';

describe('POST /api/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when agentId is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/session')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('agent_id_required');
  });

  it('returns 404 when agent not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });
    const app = createApp();
    const res = await request(app)
      .post('/api/session')
      .send({ agentId: 'agent_nonexistent' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('agent_not_found');
  });

  it('returns token when agent exists and is active', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'biz-uuid-123',
        agent_id: 'agent_test123',
        allowed_domains: [],
        is_active: true,
        status: 'active',
        conversation_count: 5,
        conversation_limit: 25,
      },
      error: null,
    });
    const app = createApp();
    const res = await request(app)
      .post('/api/session')
      .send({ agentId: 'agent_test123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.token).toHaveLength(24);
  });

  it('returns 403 when agent is inactive', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'biz-uuid-123',
        agent_id: 'agent_test123',
        allowed_domains: [],
        is_active: false,
        status: 'suspended',
        conversation_count: 5,
        conversation_limit: 25,
      },
      error: null,
    });
    const app = createApp();
    const res = await request(app)
      .post('/api/session')
      .send({ agentId: 'agent_test123' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('agent_inactive');
  });
});
