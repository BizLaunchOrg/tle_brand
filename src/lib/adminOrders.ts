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
  total_ngn: number | null
  status: string
  created_at: string
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

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase().from('orders').update({ status }).eq('id', orderId)
  if (error) return { ok: false, message: 'Update failed.' }
  return { ok: true }
}
