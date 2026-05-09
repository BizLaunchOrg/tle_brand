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

export async function fetchOrdersForAdmin(limit = 200): Promise<AdminOrderRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as AdminOrderRow[]
}
