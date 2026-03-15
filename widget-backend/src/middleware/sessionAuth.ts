import type { Request, Response, NextFunction } from 'express';
import type { SessionStore } from '../services/sessionStore.js';

export function createSessionAuth(store: SessionStore) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'missing_session_token' });
      return;
    }
    const token = authHeader.slice(7);
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';
    const session = store.validate(token, ip, ua);
    if (!session) {
      res.status(401).json({ error: 'invalid_session' });
      return;
    }
    // Attach session to request for route handlers
    (req as any).session = session;
    (req as any).sessionToken = token;
    next();
  };
}
