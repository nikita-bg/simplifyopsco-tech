import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client before importing conversation service
vi.mock('../../src/services/db.js', () => {
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockSingle = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle, eq: vi.fn() });
  const mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
  const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

  const mockFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: vi.fn(),
  });

  return {
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
    },
  };
});

import { canStartConversation, startConversation, endConversation } from '../../src/services/conversation.js';
import { supabase } from '../../src/services/db.js';

describe('canStartConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when under limit', async () => {
    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { conversation_count: 5, conversation_limit: 100 },
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqMock }),
    } as any);

    const result = await canStartConversation('biz-123');
    expect(result).toBe(true);
  });

  it('returns false when at limit', async () => {
    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { conversation_count: 100, conversation_limit: 100 },
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqMock }),
    } as any);

    const result = await canStartConversation('biz-123');
    expect(result).toBe(false);
  });

  it('returns false when business not found', async () => {
    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqMock }),
    } as any);

    const result = await canStartConversation('nonexistent');
    expect(result).toBe(false);
  });

  it('returns false when over limit', async () => {
    const eqMock = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { conversation_count: 150, conversation_limit: 100 },
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq: eqMock }),
    } as any);

    const result = await canStartConversation('biz-123');
    expect(result).toBe(false);
  });
});

describe('startConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns conversationId on success', async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.rpc).mockImplementation(rpcMock);

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'conv-uuid-123' },
            error: null,
          }),
        }),
      }),
    } as any);

    const result = await startConversation('biz-123', 'session-token-abc');
    expect(result).not.toBeNull();
    expect(result!.conversationId).toBe('conv-uuid-123');
  });

  it('returns null when insert fails', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'error' } }),
        }),
      }),
    } as any);

    const result = await startConversation('biz-123', 'session-token-abc');
    expect(result).toBeNull();
  });
});
