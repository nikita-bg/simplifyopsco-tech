/**
 * Widget Configuration API
 *
 * Returns business configuration for widget initialization.
 * Used by widget.js to fetch voice settings, branding, etc.
 *
 * Authentication: API key (query param or header)
 * Rate limiting: Applied per business
 *
 * GET /api/widget/config?api_key=so_live_...
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/middleware/apiKeyAuth';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/middleware/rateLimiter';

export const runtime = 'edge'; // Deploy to Edge for low latency

export async function GET(request: NextRequest) {
  // 1. Authenticate API key
  const authResult = await authenticateApiKey(request);

  if (!authResult.success || !authResult.business) {
    return NextResponse.json(
      {
        error: authResult.error || 'authentication_failed',
        message: 'Invalid or missing API key',
      },
      { status: 401 }
    );
  }

  const { business } = authResult;

  // 2. Check rate limit
  const rateLimit = await checkRateLimit(business.id, business.plan_tier as any);

  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'rate_limit_exceeded',
        message: `Rate limit exceeded. Maximum ${rateLimit.limit} requests per minute.`,
        retryAfter: rateLimit.retryAfter,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimit),
      }
    );
  }

  // 3. Check if business is active
  if (!business.is_active || business.status !== 'active') {
    return NextResponse.json(
      {
        error: 'business_inactive',
        message: 'Business account is not active. Please contact support.',
      },
      { status: 403 }
    );
  }

  // 4. Return widget configuration
  const config = {
    businessId: business.id,
    businessName: business.name,

    // Voice settings
    voiceId: business.voice_id || 'sarah',
    systemPrompt: business.system_prompt || 'You are a helpful AI assistant.',

    // Branding (parse JSONB)
    branding: business.branding || {
      color: '#256AF4',
      logo: null,
      position: 'bottom-right',
    },

    // Working hours (parse JSONB)
    workingHours: business.working_hours || {
      enabled: false,
      timezone: 'UTC',
      schedule: {},
    },

    // Plan info (for client-side feature gating)
    planTier: business.plan_tier,
    conversationCount: business.conversation_count,
    conversationLimit: business.conversation_limit,

    // WebSocket endpoint
    wsEndpoint: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace('http', 'ws')}/api/voice/ws`
      : 'ws://localhost:3000/api/voice/ws',
  };

  return NextResponse.json(config, {
    headers: {
      ...getRateLimitHeaders(rateLimit),
      'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      'Access-Control-Allow-Origin': '*', // Allow embedding from any domain
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
      },
    }
  );
}
