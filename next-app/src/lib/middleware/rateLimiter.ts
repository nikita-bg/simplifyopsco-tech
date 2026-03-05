/**
 * Rate Limiting Middleware
 *
 * Implements per-business rate limiting using Upstash Redis.
 * Prevents abuse and ensures fair resource allocation across tenants.
 *
 * Limits:
 * - Free tier: 50 req/min
 * - Starter tier: 100 req/min
 * - Pro tier: 500 req/min
 * - Business+ tier: 1000 req/min
 *
 * Uses sliding window algorithm for smooth rate limiting.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client (uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env)
const redis = Redis.fromEnv();

// Rate limit configurations per plan tier
const RATE_LIMITS = {
  free: {
    requests: 50,
    window: '1 m', // 1 minute
  },
  starter: {
    requests: 100,
    window: '1 m',
  },
  pro: {
    requests: 500,
    window: '1 m',
  },
  business: {
    requests: 1000,
    window: '1 m',
  },
  enterprise: {
    requests: 5000,
    window: '1 m',
  },
} as const;

// Create rate limiters for each tier
const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.free.requests, RATE_LIMITS.free.window),
    analytics: true,
    prefix: 'ratelimit:free',
  }),
  starter: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.starter.requests, RATE_LIMITS.starter.window),
    analytics: true,
    prefix: 'ratelimit:starter',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.pro.requests, RATE_LIMITS.pro.window),
    analytics: true,
    prefix: 'ratelimit:pro',
  }),
  business: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.business.requests, RATE_LIMITS.business.window),
    analytics: true,
    prefix: 'ratelimit:business',
  }),
  enterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(RATE_LIMITS.enterprise.requests, RATE_LIMITS.enterprise.window),
    analytics: true,
    prefix: 'ratelimit:enterprise',
  }),
};

export type PlanTier = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds until retry (if limited)
}

/**
 * Check rate limit for a business
 * @param businessId The business ID to check
 * @param planTier The business's plan tier
 * @returns Rate limit result
 */
export async function checkRateLimit(
  businessId: string,
  planTier: PlanTier = 'free'
): Promise<RateLimitResult> {
  const limiter = rateLimiters[planTier];

  if (!limiter) {
    console.error(`[Rate Limit] Invalid plan tier: ${planTier}`);
    // Fallback to free tier if invalid
    return checkRateLimit(businessId, 'free');
  }

  try {
    const result = await limiter.limit(businessId);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error('[Rate Limit] Error checking limit:', error);

    // On error, allow request but log
    // Better to allow traffic than block due to infra issues
    return {
      success: true,
      limit: RATE_LIMITS[planTier].requests,
      remaining: RATE_LIMITS[planTier].requests,
      reset: Date.now() + 60000, // 1 minute from now
    };
  }
}

/**
 * Create rate limit response headers
 * Following standard rate limit headers: https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.retryAfter && {
      'Retry-After': result.retryAfter.toString(),
    }),
  };
}

/**
 * Create 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      message: `Rate limit exceeded. Maximum ${result.limit} requests per minute.`,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result),
      },
    }
  );
}

/**
 * Get current rate limit status for a business (without consuming a request)
 * Useful for dashboard display
 */
export async function getRateLimitStatus(
  businessId: string,
  planTier: PlanTier = 'free'
): Promise<RateLimitResult> {
  // TODO: Implement getRemaining() method when available in @upstash/ratelimit
  // For now, we use checkRateLimit but this counts as a request
  return checkRateLimit(businessId, planTier);
}

/**
 * Reset rate limit for a business (admin only)
 * Useful for support cases or testing
 */
export async function resetRateLimit(
  businessId: string,
  planTier: PlanTier = 'free'
): Promise<void> {
  const key = `ratelimit:${planTier}:${businessId}`;

  try {
    await redis.del(key);
    console.log(`[Rate Limit] Reset for business ${businessId} (${planTier})`);
  } catch (error) {
    console.error('[Rate Limit] Error resetting limit:', error);
    throw error;
  }
}

/**
 * Get plan limits for display/documentation
 */
export function getPlanLimits(): typeof RATE_LIMITS {
  return RATE_LIMITS;
}

/**
 * Validate if a plan tier exists
 */
export function isValidPlanTier(tier: string): tier is PlanTier {
  return tier in RATE_LIMITS;
}
