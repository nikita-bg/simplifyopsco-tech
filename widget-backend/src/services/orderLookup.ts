/**
 * Order Lookup — finds orders by email or order number.
 * Used by AI when a customer asks "where is my order?"
 */
import { supabase } from './db.js';

export interface OrderResult {
  orderNumber: string;
  customerName: string | null;
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  totalPrice: number | null;
  currency: string;
  lineItems: Array<{ title: string; quantity: number; price: string }>;
  orderDate: string | null;
  shippedAt: string | null;
}

/**
 * Looks up an order by customer email and/or order number.
 */
export async function lookupOrder(
  businessId: string,
  email?: string,
  orderNumber?: string
): Promise<OrderResult | null> {
  let query = supabase
    .from('orders')
    .select('*')
    .eq('business_id', businessId);

  if (email && orderNumber) {
    query = query.eq('customer_email', email.toLowerCase()).eq('order_number', orderNumber);
  } else if (email) {
    query = query.eq('customer_email', email.toLowerCase());
  } else if (orderNumber) {
    query = query.eq('order_number', orderNumber);
  } else {
    return null;
  }

  const { data } = await query
    .order('order_date', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    orderNumber: data.order_number,
    customerName: data.customer_name,
    status: data.status,
    trackingNumber: data.tracking_number,
    trackingUrl: data.tracking_url,
    totalPrice: data.total_price,
    currency: data.currency || 'USD',
    lineItems: data.line_items || [],
    orderDate: data.order_date,
    shippedAt: data.shipped_at,
  };
}
