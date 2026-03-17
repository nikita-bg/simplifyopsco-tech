/**
 * Sync Engine — orchestrates product/order sync across all connected stores.
 * Runs on cron (every 6 hours) and on-demand via /api/sync/trigger.
 */
import { supabase } from '../db.js';
import { syncShopifyProducts, syncShopifyOrders } from './shopifySync.js';
import { syncWooProducts, syncWooOrders } from './wooSync.js';

export interface SyncResult {
  businessId: string;
  productsSynced: number;
  ordersSynced: number;
  errors: string[];
  status: 'completed' | 'failed';
}

/**
 * Syncs a single business. Called by both cron and manual trigger.
 */
export async function syncBusiness(businessId: string): Promise<SyncResult> {
  const result: SyncResult = {
    businessId,
    productsSynced: 0,
    ordersSynced: 0,
    errors: [],
    status: 'completed',
  };

  // Get store connection
  const { data: connection, error: connError } = await supabase
    .from('store_connections')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single();

  if (connError || !connection) {
    result.errors.push('No active store connection found');
    result.status = 'failed';
    return result;
  }

  // Create sync log entry
  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({
      business_id: businessId,
      sync_type: 'full',
      status: 'started',
    })
    .select('id')
    .single();

  const syncLogId = syncLog?.id;

  try {
    if (connection.platform === 'shopify') {
      const [products, orders] = await Promise.all([
        syncShopifyProducts(connection),
        syncShopifyOrders(connection),
      ]);
      result.productsSynced = products.synced;
      result.ordersSynced = orders.synced;
      result.errors.push(...products.errors, ...orders.errors);
    } else if (connection.platform === 'woocommerce') {
      const [products, orders] = await Promise.all([
        syncWooProducts(connection),
        syncWooOrders(connection),
      ]);
      result.productsSynced = products.synced;
      result.ordersSynced = orders.synced;
      result.errors.push(...products.errors, ...orders.errors);
    } else if (connection.platform === 'manual') {
      // Manual products — nothing to sync
      return result;
    }

    if (result.errors.length > 0) {
      result.status = 'failed';
    }
  } catch (err: any) {
    result.errors.push(err.message || 'Unexpected sync error');
    result.status = 'failed';
  }

  // Update sync log
  if (syncLogId) {
    await supabase
      .from('sync_logs')
      .update({
        status: result.status,
        products_synced: result.productsSynced,
        orders_synced: result.ordersSynced,
        error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId);
  }

  console.log(
    `[Sync] Business ${businessId}: ${result.productsSynced} products, ${result.ordersSynced} orders, ${result.errors.length} errors`
  );

  return result;
}

/**
 * Syncs ALL active store connections. Called by cron.
 */
export async function syncAll(): Promise<void> {
  console.log('[Sync] Starting scheduled sync for all stores...');

  const { data: connections, error } = await supabase
    .from('store_connections')
    .select('business_id')
    .eq('is_active', true);

  if (error || !connections?.length) {
    console.log('[Sync] No active connections to sync');
    return;
  }

  // Sync sequentially to avoid overwhelming external APIs
  for (const conn of connections) {
    try {
      await syncBusiness(conn.business_id);
    } catch (err) {
      console.error(`[Sync] Failed for business ${conn.business_id}:`, err);
    }
  }

  console.log(`[Sync] Completed sync for ${connections.length} stores`);
}
