/**
 * Business Settings API
 *
 * GET: Fetch current business settings for authenticated user
 * PATCH: Update business settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user's business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (businessError || !business) {
    return NextResponse.json(
      { error: 'Business not found. Please contact support.' },
      { status: 404 }
    );
  }

  // Return business settings
  return NextResponse.json({
    id: business.id,
    name: business.name,
    voiceId: business.voice_id,
    systemPrompt: business.system_prompt,
    branding: business.branding,
    workingHours: business.working_hours,
    agentId: business.agent_id,
    planTier: business.plan_tier,
    conversationCount: business.conversation_count,
    conversationLimit: business.conversation_limit,
    apiKeyPrefix: business.api_key_prefix,
    isActive: business.is_active,
    status: business.status,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  const updates = await request.json();

  // Validate and sanitize updates
  const allowedFields = ['name', 'voice_id', 'system_prompt', 'branding', 'working_hours'];
  const sanitizedUpdates: Record<string, any> = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      // Convert camelCase to snake_case for database
      const dbField = field;
      sanitizedUpdates[dbField] = updates[field];
    }
  }

  // Ensure we have something to update
  if (Object.keys(sanitizedUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Update business
  const { data, error } = await supabase
    .from('businesses')
    .update({
      ...sanitizedUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('[Business Settings] Update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    business: {
      id: data.id,
      name: data.name,
      voiceId: data.voice_id,
      systemPrompt: data.system_prompt,
      branding: data.branding,
      workingHours: data.working_hours,
    },
  });
}
