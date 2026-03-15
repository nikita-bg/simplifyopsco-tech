import type { Request, Response, NextFunction } from 'express';
import type { SessionData } from '../types/index.js';

// Requests per minute per plan tier
const RATE_LIMITS: Record<string, number> = {
  free: 10,
  starter: 20,
  pro: 40,
  business: 60,
  enterprise: 120,
};

const DEFAULT_LIMIT = 10;
const WINDOW_MS = 60_000; // 1 minute sliding window

interface WindowEntry {
  timestamps: number[];
}

// In-memory store: sessionToken → sliding window
const windows = new Map<string, WindowEntry>();

// Cleanup old entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of windows.entries()) {
    entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      windows.delete(key);
    }
  }
}, 5 * 60_000);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const session: SessionData | undefined = (req as any).session;
  const token: string | undefined = (req as any).sessionToken;

  if (!session || !token) {
    // No session = not authenticated; let auth middleware handle it
    next();
    return;
  }

  const planTier = (session as any).planTier || 'free';
  const limit = RATE_LIMITS[planTier] ?? DEFAULT_LIMIT;
  const now = Date.now();

  let entry = windows.get(token);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(token, entry);
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter(t => now - t < WINDOW_MS);

  if (entry.timestamps.length >= limit) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
    res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000).toString());
    res.status(429).json({ error: 'rate_limit_exceeded' });
    return;
  }

  entry.timestamps.push(now);
  next();
}
