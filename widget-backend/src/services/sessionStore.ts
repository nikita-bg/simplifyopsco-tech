import { randomBytes } from 'node:crypto';
import type { SessionData } from '../types/index.js';

interface CreateSessionInput {
  agentId: string;
  businessId: string;
  visitorIp: string;
  userAgent: string;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // cleanup every 5 min

export class SessionStore {
  private sessions = new Map<string, SessionData>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Allow Node to exit even if timer is active (important for tests)
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  create(input: CreateSessionInput): string {
    const token = randomBytes(18).toString('base64url').slice(0, 24);
    const now = Date.now();
    this.sessions.set(token, {
      agentId: input.agentId,
      businessId: input.businessId,
      visitorIp: input.visitorIp,
      userAgent: input.userAgent,
      createdAt: now,
      lastActivity: now,
      conversationId: null,
    });
    return token;
  }

  get(token: string): SessionData | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() - session.lastActivity > TTL_MS) {
      this.sessions.delete(token);
      return null;
    }
    session.lastActivity = Date.now();
    return session;
  }

  validate(token: string, ip: string, userAgent: string): SessionData | null {
    const session = this.get(token);
    if (!session) return null;
    if (session.visitorIp !== ip || session.userAgent !== userAgent) return null;
    return session;
  }

  update(token: string, updates: Partial<SessionData>): void {
    const session = this.sessions.get(token);
    if (session) Object.assign(session, updates);
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.sessions.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (now - session.lastActivity > TTL_MS) this.sessions.delete(token);
    }
  }
}
