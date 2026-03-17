/**
 * WooCommerce Product & Order sync.
 * Uses WooCommerce REST API v3 with Basic Auth.
 */
import { supabase } from '../db.js';
import { decrypt } from './decryption.js';
import { generateProductEmbeddings } from './embedProducts.js';

interface StoreConnection {
  business_id: string;
  shop_domain: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
}

async function wooFetch(siteUrl: string, auth: string, endpoint: string, params?: Record<string, string>) {
  const url = new URL(`${siteUrl}/wp-json/wc/v3/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`WooCommerce API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function syncWooProducts(conn: StoreConnection): Promise<{ synced: number; errors: string[] }> {
  const consumerKey = decrypt(conn.api_key_encrypted);
  const consumerSecret = decrypt(conn.api_secret_encrypted);
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const errors: string[] = [];
  let totalSynced = 0;
  let page = 1;
  const BATCH_SIZE = 50;

  try {
    const allProducts: any[] = [];

    // Paginate through all products
    while (true) {
      const products = await wooFetch(conn.shop_domain, auth, 'products', {
        per_page: '100',
        page: page.toString(),
      });

      if (!Array.isArray(products) || products.length === 0) break;
      allProducts.push(...products);
      page++;
      if (products.length < 100) break;
    }

    // Process in batches for embedding generation
    for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
      const batch = allProducts.slice(i, i + BATCH_SIZE);

      const productsForEmbedding = batch.map(p => ({
        title: p.name,
        description: p.short_description?.replace(/<[^>]*>/g, '') || p.description?.replace(/<[^>]*>/g, '') || null,
        tags: (p.tags || []).map((t: any) => t.name),
        price: p.price ? parseFloat(p.price) : null,
      }));

      const embeddings = await generateProductEmbeddings(productsForEmbedding);

      const rows = batch.map((p: any, idx: number) => {
        const stockQty = p.stock_quantity ?? 0;

        return {
          business_id: conn.business_id,
          platform_product_id: p.id.toString(),
          title: p.name,
          description: p.short_description?.replace(/<[^>]*>/g, '') || p.description?.replace(/<[^>]*>/g, '') || null,
          price: p.price ? parseFloat(p.price) : null,
          compare_at_price: p.regular_price && p.sale_price ? parseFloat(p.regular_price) : null,
          currency: 'USD',
          images: (p.images || []).map((img: any) => img.src),
          variants: (p.variations || []).map((v: any) => ({
            title: v.attributes?.map((a: any) => a.option).join(' / ') || 'Default',
            price: v.price,
            sku: v.sku,
            inventory_qty: v.stock_quantity,
          })),
          inventory_status: p.stock_status === 'instock' ? 'in_stock' : p.stock_status === 'onbackorder' ? 'limited' : 'out_of_stock',
          product_url: p.permalink || null,
          tags: (p.tags || []).map((t: any) => t.name),
          is_active: p.status === 'publish',
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
  } catch (err: any) {
    errors.push(err.message || 'Unknown error during WooCommerce product sync');
  }

  return { synced: totalSynced, errors };
}

export async function syncWooOrders(conn: StoreConnection): Promise<{ synced: number; errors: string[] }> {
  const consumerKey = decrypt(conn.api_key_encrypted);
  const consumerSecret = decrypt(conn.api_secret_encrypted);
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  const errors: string[] = [];
  let totalSynced = 0;

  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const orders = await wooFetch(conn.shop_domain, auth, 'orders', {
      per_page: '100',
      after: sixtyDaysAgo.toISOString(),
    });

    if (!Array.isArray(orders)) return { synced: 0, errors: ['Invalid orders response'] };

    const rows = orders.map((o: any) => ({
      business_id: conn.business_id,
      platform_order_id: o.id.toString(),
      order_number: `#${o.number}`,
      customer_email: o.billing?.email || null,
      customer_name: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || null,
      status: mapWooOrderStatus(o.status),
      financial_status: o.payment_method ? 'paid' : null,
      fulfillment_status: o.status === 'completed' ? 'fulfilled' : 'unfulfilled',
      tracking_number: o.meta_data?.find((m: any) => m.key === '_tracking_number')?.value || null,
      tracking_url: o.meta_data?.find((m: any) => m.key === '_tracking_url')?.value || null,
      total_price: o.total ? parseFloat(o.total) : null,
      currency: o.currency || 'USD',
      line_items: (o.line_items || []).map((li: any) => ({
        title: li.name,
        quantity: li.quantity,
        price: li.price,
        image_url: li.image?.src || null,
      })),
      order_date: o.date_created,
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
    errors.push(err.message || 'Unknown error during WooCommerce order sync');
  }

  return { synced: totalSynced, errors };
}

function mapWooOrderStatus(status: string): string {
  switch (status) {
    case 'pending':
    case 'on-hold': return 'pending';
    case 'processing': return 'processing';
    case 'completed': return 'delivered';
    case 'cancelled': return 'cancelled';
    case 'refunded': return 'refunded';
    default: return 'pending';
  }
}
