/**
 * Shopify Product & Order sync.
 * Uses Shopify Admin REST API (2024-01 version).
 */
import { supabase } from '../db.js';
import { decrypt } from './decryption.js';
import { generateProductEmbeddings } from './embedProducts.js';

interface StoreConnection {
  business_id: string;
  shop_domain: string;
  access_token_encrypted: string;
}

interface SyncResult {
  productsSynced: number;
  ordersSynced: number;
  errors: string[];
}

const API_VERSION = '2024-01';

async function shopifyFetch(shop: string, token: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`https://${shop}/admin/api/${API_VERSION}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Fetches all products from Shopify (paginated) and upserts into products table.
 */
export async function syncShopifyProducts(conn: StoreConnection): Promise<{ synced: number; errors: string[] }> {
  const token = decrypt(conn.access_token_encrypted);
  const errors: string[] = [];
  let totalSynced = 0;
  let pageInfo: string | null = null;
  const BATCH_SIZE = 50; // Embedding batch size

  try {
    // Paginate through all products
    let hasMore = true;
    const allProducts: any[] = [];

    while (hasMore) {
      const params: Record<string, string> = { limit: '250' };
      if (pageInfo) params.page_info = pageInfo;

      const data = await shopifyFetch(conn.shop_domain, token, 'products.json', params);
      const products = data.products || [];
      allProducts.push(...products);

      // Check for pagination (Link header would be ideal, but we simplify)
      hasMore = products.length === 250;
      if (hasMore && products.length > 0) {
        // Use since_id pagination
        params.since_id = products[products.length - 1].id.toString();
        pageInfo = null; // Reset page_info when using since_id
      }
    }

    // Process in batches for embedding generation
    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);

      const productsForEmbedding = batch.map(p => ({
        title: p.title,
        description: p.body_html?.replace(/<[^>]*>/g, '') || null, // Strip HTML
        tags: p.tags ? p.tags.split(', ') : [],
        price: p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : null,
      }));

      const embeddings = await generateProductEmbeddings(productsForEmbedding);

      const rows = batch.map((p: any, idx: number) => {
        const variant = p.variants?.[0];
        const inventoryQty = variant?.inventory_quantity ?? 0;

        return {
          business_id: conn.business_id,
          platform_product_id: p.id.toString(),
          title: p.title,
          description: p.body_html?.replace(/<[^>]*>/g, '') || null,
          price: variant?.price ? parseFloat(variant.price) : null,
          compare_at_price: variant?.compare_at_price ? parseFloat(variant.compare_at_price) : null,
          currency: 'USD', // Shopify doesn't return currency per-product easily
          images: (p.images || []).map((img: any) => img.src),
          variants: (p.variants || []).map((v: any) => ({
            title: v.title,
            price: v.price,
            sku: v.sku,
            inventory_qty: v.inventory_quantity,
          })),
          inventory_status: inventoryQty > 10 ? 'in_stock' : inventoryQty > 0 ? 'limited' : 'out_of_stock',
          product_url: p.handle ? `https://${conn.shop_domain}/products/${p.handle}` : null,
          tags: p.tags ? p.tags.split(', ') : [],
          is_active: p.status === 'active',
          embedding: embeddings[idx] ? JSON.stringify(embeddings[idx]) : null,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('products')
        .upsert(rows, { onConflict: 'business_id,platform_product_id' });

      if (error) {
        errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
      } else {
        totalSynced += rows.length;
      }
    }

    // Deactivate products that were removed from Shopify
    const syncedIds = allProducts.map(p => p.id.toString());
    if (syncedIds.length > 0) {
      await supabase
        .from('products')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('business_id', conn.business_id)
        .not('platform_product_id', 'is', null)
        .not('platform_product_id', 'in', `(${syncedIds.join(',')})`);
    }

  } catch (err: any) {
    errors.push(err.message || 'Unknown error during product sync');
  }

  return { synced: totalSynced, errors };
}

/**
 * Fetches recent orders (last 60 days) from Shopify and upserts into orders table.
 */
export async function syncShopifyOrders(conn: StoreConnection): Promise<{ synced: number; errors: string[] }> {
  const token = decrypt(conn.access_token_encrypted);
  const errors: string[] = [];
  let totalSynced = 0;

  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const data = await shopifyFetch(conn.shop_domain, token, 'orders.json', {
      status: 'any',
      created_at_min: sixtyDaysAgo.toISOString(),
      limit: '250',
    });

    const orders = data.orders || [];

    const rows = orders.map((o: any) => ({
      business_id: conn.business_id,
      platform_order_id: o.id.toString(),
      order_number: o.name || `#${o.order_number}`,
      customer_email: o.email || o.contact_email || null,
      customer_name: o.customer
        ? `${o.customer.first_name || ''} ${o.customer.last_name || ''}`.trim()
        : null,
      status: mapShopifyOrderStatus(o),
      financial_status: o.financial_status || null,
      fulfillment_status: o.fulfillment_status || 'unfulfilled',
      tracking_number: o.fulfillments?.[0]?.tracking_number || null,
      tracking_url: o.fulfillments?.[0]?.tracking_url || null,
      total_price: o.total_price ? parseFloat(o.total_price) : null,
      currency: o.currency || 'USD',
      line_items: (o.line_items || []).map((li: any) => ({
        title: li.title,
        quantity: li.quantity,
        price: li.price,
        image_url: li.image?.src || null,
      })),
      order_date: o.created_at,
      shipped_at: o.fulfillments?.[0]?.created_at || null,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('orders')
        .upsert(rows, { onConflict: 'business_id,platform_order_id' });

      if (error) {
        errors.push(`Orders upsert: ${error.message}`);
      } else {
        totalSynced = rows.length;
      }
    }
  } catch (err: any) {
    errors.push(err.message || 'Unknown error during order sync');
  }

  return { synced: totalSynced, errors };
}

function mapShopifyOrderStatus(order: any): string {
  if (order.cancelled_at) return 'cancelled';
  if (order.financial_status === 'refunded') return 'refunded';
  if (order.fulfillment_status === 'fulfilled') {
    // Check if delivered (Shopify doesn't have a direct "delivered" status)
    return 'shipped';
  }
  if (order.fulfillment_status === 'partial') return 'processing';
  return 'pending';
}
