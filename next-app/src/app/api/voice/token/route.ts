/**
 * ElevenLabs Conversation Token API
 *
 * Generates a signed conversation token server-side.
 * This is more secure than exposing the agent_id directly on the client,
 * as it prevents unauthorized usage of the agent.
 *
 * Two modes:
 * 1. Widget mode (api_key param): Uses business-specific agent_id
 * 2. Dashboard mode (session auth): Uses global demo agent_id
 */
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/middleware/apiKeyAuth';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

  if (!elevenLabsApiKey) {
    return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 500 });
  }

  let agentId: string | null = null;
  let businessId: string | null = null;

  // Check if request has API key (widget mode)
  const url = new URL(request.url);
  const widgetApiKey = url.searchParams.get('api_key');

  if (widgetApiKey) {
    // Widget mode: Authenticate and get business-specific agent_id
    const authResult = await authenticateApiKey(request);

    if (!authResult.success || !authResult.business) {
      return NextResponse.json(
        { error: authResult.error || 'authentication_failed' },
        { status: 401 }
      );
    }

    agentId = authResult.business.agent_id;
    businessId = authResult.business.id;

    // If business doesn't have agent_id yet, create one or use fallback
    if (!agentId) {
      // TODO: Create ElevenLabs agent for this business
      // For now, use global fallback
      agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || null;
    }
  } else {
    // Dashboard mode: Use session authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use global demo agent for dashboard preview
    agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || null;
  }

  if (!agentId) {
    return NextResponse.json({ error: 'Agent not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsApiKey,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('[ElevenLabs Token] Error:', response.status, errText);
      return NextResponse.json(
        { error: 'Failed to get conversation token' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      signedUrl: data.signed_url,
      agentId,
      businessId,
    });
  } catch (error) {
    console.error('[ElevenLabs Token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
