import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '../../src/services/sessionStore.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  it('creates a session and returns a 24-char token', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    expect(token).toHaveLength(24);
  });

  it('retrieves a valid session', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.get(token);
    expect(session).not.toBeNull();
    expect(session!.agentId).toBe('agent_abc123');
  });

  it('returns null for invalid token', () => {
    expect(store.get('invalid-token')).toBeNull();
  });

  it('refreshes TTL on access', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const s1 = store.get(token);
    expect(s1!.lastActivity).toBeGreaterThanOrEqual(s1!.createdAt);
  });

  it('validates visitor identity (IP + UA)', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.validate(token, '1.2.3.4', 'Mozilla/5.0');
    expect(session).not.toBeNull();
  });

  it('rejects mismatched IP', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.validate(token, '5.6.7.8', 'Mozilla/5.0');
    expect(session).toBeNull();
  });

  it('rejects mismatched user agent', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    const session = store.validate(token, '1.2.3.4', 'DifferentAgent');
    expect(session).toBeNull();
  });

  it('updates session data', () => {
    const token = store.create({
      agentId: 'agent_abc123',
      businessId: 'biz-uuid',
      visitorIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    });
    store.update(token, { conversationId: 'conv-123' });
    const session = store.get(token);
    expect(session!.conversationId).toBe('conv-123');
  });
});
