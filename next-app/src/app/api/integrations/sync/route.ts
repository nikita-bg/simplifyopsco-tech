/**
 * Sync Trigger API (Dashboard → Widget Backend)
 * POST /api/integrations/sync
 *
 * Triggers a manual sync for the authenticated user's business.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const WIDGET_BACKEND_URL = process.env.WIDGET_BACKEND_URL || 'http://localhost:3001';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  try {
    const response = await fetch(`${WIDGET_BACKEND_URL}/api/sync/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Sync failed' }));
      return NextResponse.json(error, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Sync Trigger] Error:', err);
    return NextResponse.json(
      { error: 'Could not reach sync service' },
      { status: 502 }
    );
  }
}
