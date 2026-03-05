/**
 * Conversation Pre-check API
 *
 * Checks if a business can start a new conversation based on:
 * - Account status (active/suspended)
 * - Usage limits (hard limit not reached)
 *
 * Called by widget before initiating voice conversation
 *
 * GET /api/conversations/check?business_id=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { canStartConversation } from '@/lib/usage-tracking'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const businessId = request.nextUrl.searchParams.get('business_id')

  if (!businessId) {
    return NextResponse.json(
      { error: 'business_id required' },
      { status: 400 }
    )
  }

  const result = await canStartConversation(businessId)

  if (!result.allowed) {
    return NextResponse.json(
      {
        allowed: false,
        reason: result.reason,
      },
      { status: 403 }
    )
  }

  return NextResponse.json({
    allowed: true,
  })
}
