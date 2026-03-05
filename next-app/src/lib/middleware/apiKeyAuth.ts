/**
 * API Key Authentication Middleware
 *
 * Validates widget API keys and resolves business_id for multi-tenant requests.
 * Used for widget API routes: /api/widget/*
 *
 * Flow:
 * 1. Extract API key from request (header or query param)
 * 2. Validate format (fast, no DB)
 * 3. Look up business by API key hash (DB query)
 * 4. Check business status (active, not suspended)
 * 5. Return business context for request
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateApiKey, isValidApiKeyFormat, maskApiKey } from '../api-keys';

export interface ApiKeyAuthResult {
  success: boolean;
  businessId?: string;
  business?: BusinessContext;
  error?: ApiKeyError;
}

export interface BusinessContext {
  id: string;
  name: string;
  plan_tier: string;
  conversation_count: number;
  conversation_limit: number;
  is_active: boolean;
  status: string;
}

export type ApiKeyError =
  | 'missing_api_key'
  | 'invalid_format'
  | 'invalid_key'
  | 'business_not_found'
  | 'business_suspended'
  | 'business_inactive'
  | 'database_error';

/**
 * Extract API key from request
 * Supports both header and query parameter
 */
export function extractApiKey(request: NextRequest): string | null {
  // Try header first (preferred for security)
  const headerKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (headerKey) {
    return headerKey;
  }

  // Fallback to query parameter (for simple GET requests from widget)
  const url = new URL(request.url);
  const queryKey = url.searchParams.get('api_key');

  return queryKey;
}

/**
 * Authenticate request using API key and return business context
 * @param request Next.js request object
 * @returns Authentication result with business context
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiKeyAuthResult> {
  // 1. Extract API key
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return {
      success: false,
      error: 'missing_api_key',
    };
  }

  // 2. Validate format (fast check, no DB)
  if (!isValidApiKeyFormat(apiKey)) {
    console.warn('[API Key Auth] Invalid format:', maskApiKey(apiKey));
    return {
      success: false,
      error: 'invalid_format',
    };
  }

  // 3. Look up business in database
  try {
    const supabase = await createClient();

    // Query all businesses and validate in memory
    // (We can't hash the key client-side to query, so we need to check all hashes)
    const { data: businesses, error: queryError } = await supabase
      .from('businesses')
      .select('id, name, plan_tier, conversation_count, conversation_limit, is_active, status, api_key_hash')
      .eq('is_active', true);

    if (queryError) {
      console.error('[API Key Auth] Database error:', queryError);
      return {
        success: false,
        error: 'database_error',
      };
    }

    if (!businesses || businesses.length === 0) {
      return {
        success: false,
        error: 'business_not_found',
      };
    }

    // 4. Validate API key against each business's hash
    // NOTE: This is O(n) but acceptable for small-medium scale (<10K businesses)
    // For larger scale, consider caching or alternative indexing strategy
    for (const business of businesses) {
      const isValid = await validateApiKey(apiKey, business.api_key_hash);

      if (isValid) {
        // Found matching business!

        // 5. Check business status
        if (business.status === 'suspended') {
          return {
            success: false,
            error: 'business_suspended',
          };
        }

        if (business.status === 'cancelled' || !business.is_active) {
          return {
            success: false,
            error: 'business_inactive',
          };
        }

        // 6. Return business context
        return {
          success: true,
          businessId: business.id,
          business: {
            id: business.id,
            name: business.name,
            plan_tier: business.plan_tier,
            conversation_count: business.conversation_count,
            conversation_limit: business.conversation_limit,
            is_active: business.is_active,
            status: business.status,
          },
        };
      }
    }

    // No matching business found
    console.warn('[API Key Auth] Invalid key (no match):', maskApiKey(apiKey));
    return {
      success: false,
      error: 'invalid_key',
    };

  } catch (error) {
    console.error('[API Key Auth] Unexpected error:', error);
    return {
      success: false,
      error: 'database_error',
    };
  }
}

/**
 * Get error message for API key authentication error
 */
export function getApiKeyErrorMessage(error: ApiKeyError): string {
  const messages: Record<ApiKeyError, string> = {
    missing_api_key: 'API key is required. Please provide x-api-key header or api_key query parameter.',
    invalid_format: 'Invalid API key format. Expected: so_live_<32-chars> or so_test_<32-chars>',
    invalid_key: 'Invalid API key. Please check your API key and try again.',
    business_not_found: 'Business not found for this API key.',
    business_suspended: 'Business account is suspended. Please contact support.',
    business_inactive: 'Business account is inactive. Please contact support.',
    database_error: 'Internal server error. Please try again later.',
  };

  return messages[error] || 'Authentication failed.';
}

/**
 * Get HTTP status code for API key authentication error
 */
export function getApiKeyErrorStatus(error: ApiKeyError): number {
  const statusCodes: Record<ApiKeyError, number> = {
    missing_api_key: 401,
    invalid_format: 400,
    invalid_key: 401,
    business_not_found: 401,
    business_suspended: 403,
    business_inactive: 403,
    database_error: 500,
  };

  return statusCodes[error] || 401;
}

/**
 * Helper to create error response for API key authentication failures
 */
export function createApiKeyErrorResponse(error: ApiKeyError) {
  return new Response(
    JSON.stringify({
      error: error,
      message: getApiKeyErrorMessage(error),
    }),
    {
      status: getApiKeyErrorStatus(error),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
