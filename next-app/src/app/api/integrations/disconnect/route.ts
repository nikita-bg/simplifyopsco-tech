/**
 * Disconnect Integration API
 * POST /api/integrations/disconnect
 *
 * Removes store connection and all synced products/orders for the business.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const admin = createAdminClient();

  // Delete synced data and connection
  await admin.from('products').delete().eq('business_id', business.id);
  await admin.from('orders').delete().eq('business_id', business.id);
  await admin.from('sync_logs').delete().eq('business_id', business.id);
  await admin.from('store_connections').delete().eq('business_id', business.id);

  return NextResponse.json({ success: true });
}
