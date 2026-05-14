import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export type AdminOrderRow = {
  id: string
  user_id: string
  email: string
  shipping: Record<string, unknown>
  line_items: unknown
  subtotal_ngn: number
  delivery_ngn: number | null
  processing_ngn: number | null
  sales_vat_ngn: number | null
  processing_vat_ngn: number | null
  total_ngn: number | null
  status: string
  payment_status?: string | null
  delivery_status?: string | null
  created_at: string
  shipping_slip_printed_at?: string | null
}

export async function fetchOrdersForAdmin(limit = 500): Promise<AdminOrderRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as AdminOrderRow[]
}

export async function fetchOrderById(orderId: string): Promise<AdminOrderRow | null> {
  if (!isSupabaseConfigured() || !orderId.trim()) return null
  const { data, error } = await getSupabase().from('orders').select('*').eq('id', orderId.trim()).maybeSingle()
  if (error || !data) return null
  return data as AdminOrderRow
}

/** Maps split fields to legacy `status` for customer webhooks / emails. */
export function computeLegacyOrderStatus(
  paymentStatus: string,
  deliveryStatus: string,
  isCancelled: boolean,
): string {
  if (isCancelled) return 'cancelled'
  if (paymentStatus.toLowerCase() === 'unpaid') return 'pending'
  const d = deliveryStatus.toLowerCase()
  if (d === 'delivered') return 'delivered'
  if (d === 'processing') return 'processing'
  return 'paid'
}

export async function updateOrderDeliveryStatus(
  orderId: string,
  deliveryStatus: 'pending' | 'processing' | 'delivered',
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const supabase = getSupabase()
  const { data: row, error: fetchErr } = await supabase
    .from('orders')
    .select('status,payment_status')
    .eq('id', orderId)
    .maybeSingle()
  if (fetchErr || !row) return { ok: false, message: 'Order not found.' }
  const cur = row as { status: string; payment_status: string }
  if (String(cur.status).toLowerCase() === 'cancelled') {
    return { ok: false, message: 'Cancelled orders cannot be changed here.' }
  }
  const payment = String(cur.payment_status ?? 'paid').toLowerCase() === 'unpaid' ? 'unpaid' : 'paid'
  const legacy = computeLegacyOrderStatus(payment, deliveryStatus, false)
  const { error } = await supabase
    .from('orders')
    .update({ delivery_status: deliveryStatus, status: legacy })
    .eq('id', orderId)
  if (error) return { ok: false, message: 'Update failed.' }
  return { ok: true }
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: 'paid' | 'unpaid',
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const supabase = getSupabase()
  const { data: row, error: fetchErr } = await supabase
    .from('orders')
    .select('status,delivery_status')
    .eq('id', orderId)
    .maybeSingle()
  if (fetchErr || !row) return { ok: false, message: 'Order not found.' }
  const cur = row as { status: string; delivery_status: string }
  if (String(cur.status).toLowerCase() === 'cancelled') {
    return { ok: false, message: 'Cancelled orders cannot be changed here.' }
  }
  const delivery = String(cur.delivery_status ?? 'pending').toLowerCase()
  const dNorm =
    delivery === 'delivered' || delivery === 'processing' || delivery === 'pending' ? delivery : 'pending'
  const legacy = computeLegacyOrderStatus(paymentStatus, dNorm, false)
  const { error } = await supabase
    .from('orders')
    .update({ payment_status: paymentStatus, status: legacy })
    .eq('id', orderId)
  if (error) return { ok: false, message: 'Update failed.' }
  return { ok: true }
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const s = status.toLowerCase()
  const supabase = getSupabase()
  if (s === 'cancelled') {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', payment_status: 'unpaid', delivery_status: 'pending' })
      .eq('id', orderId)
    if (error) return { ok: false, message: 'Update failed.' }
    return { ok: true }
  }
  const payment: 'paid' | 'unpaid' =
    s === 'pending' || s === 'awaiting_payment' ? 'unpaid' : 'paid'
  let delivery: 'pending' | 'processing' | 'delivered' = 'pending'
  if (s === 'delivered' || s === 'completed' || s === 'fulfilled') delivery = 'delivered'
  else if (s === 'processing' || s === 'shipped') delivery = 'processing'
  else if (s === 'paid') delivery = 'pending'
  const { error } = await supabase
    .from('orders')
    .update({
      status: computeLegacyOrderStatus(payment, delivery, false),
      payment_status: payment,
      delivery_status: delivery,
    })
    .eq('id', orderId)
  if (error) return { ok: false, message: 'Update failed.' }
  return { ok: true }
}

export async function markShippingSlipPrinted(
  orderId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase()
    .from('orders')
    .update({ shipping_slip_printed_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) return { ok: false, message: 'Could not save confirmation.' }
  return { ok: true }
}
