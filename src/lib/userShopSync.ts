import { cartLineKey } from '../data/products.ts'
import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'
import type { PersistedCartLine } from './shopStorage.ts'

/** Merge local + server lines: same line key keeps the higher quantity. */
export function mergeCartLines(local: PersistedCartLine[], remote: PersistedCartLine[]): PersistedCartLine[] {
  const map = new Map<string, PersistedCartLine>()
  const keyOf = (l: PersistedCartLine) => cartLineKey(l.slug, l.variantId)

  for (const l of local) {
    map.set(keyOf(l), { slug: l.slug, variantId: l.variantId, quantity: l.quantity })
  }
  for (const r of remote) {
    const k = keyOf(r)
    const existing = map.get(k)
    if (!existing) {
      map.set(k, { slug: r.slug, variantId: r.variantId, quantity: r.quantity })
    } else {
      map.set(k, {
        ...existing,
        quantity: Math.max(existing.quantity, r.quantity),
      })
    }
  }
  return Array.from(map.values())
}

export function mergeFavoriteSlugs(local: string[], remote: string[]): string[] {
  const set = new Set<string>()
  for (const s of remote) set.add(s)
  for (const s of local) set.add(s)
  return Array.from(set)
}

export async function fetchUserCartItems(userId: string): Promise<PersistedCartLine[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('user_cart_items')
    .select('product_slug, variant_id, quantity')
    .eq('user_id', userId)

  if (error || !data) return []

  return data.map((row) => ({
    slug: row.product_slug as string,
    variantId: (row.variant_id as string) ? (row.variant_id as string) : undefined,
    quantity: Number(row.quantity) || 1,
  }))
}

export async function fetchUserFavoriteSlugs(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase().from('user_favorites').select('product_slug').eq('user_id', userId)

  if (error || !data) return []
  return data.map((r) => r.product_slug as string)
}

export async function replaceUserCartItems(userId: string, lines: PersistedCartLine[]): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sb = getSupabase()
  const { error: delErr } = await sb.from('user_cart_items').delete().eq('user_id', userId)
  if (delErr) return
  if (lines.length === 0) return

  const rows = lines.map((l) => ({
    user_id: userId,
    product_slug: l.slug,
    variant_id: l.variantId ?? '',
    quantity: Math.min(999, Math.max(1, Math.floor(l.quantity))),
  }))

  const { error: insErr } = await sb.from('user_cart_items').insert(rows)
  void insErr
}

export async function replaceUserFavorites(userId: string, slugs: string[]): Promise<void> {
  if (!isSupabaseConfigured()) return
  const sb = getSupabase()
  const { error: delErr } = await sb.from('user_favorites').delete().eq('user_id', userId)
  if (delErr) return
  if (slugs.length === 0) return

  const rows = slugs.map((product_slug) => ({ user_id: userId, product_slug }))
  const { error: insErr } = await sb.from('user_favorites').insert(rows)
  void insErr
}

export type ShippingPayload = {
  fullName: string
  phone: string
  email: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode?: string
  country: string
  /** Set when checkout used a location-based fee */
  deliveryOptionId?: string
  deliveryOptionLabel?: string
}

export type OrderLinePayload = {
  slug: string
  variantId?: string
  /** Finish / shade label at checkout (snapshot) */
  variantLabel?: string
  name: string
  price: string
  quantity: number
  /** Primary image URL at checkout */
  image?: string
  /** Product category at checkout */
  category?: string
  badge?: string
  /** Optional size or other variant text if added later */
  size?: string
}

export async function createOrder(params: {
  userId: string
  email: string
  shipping: ShippingPayload
  lineItems: OrderLinePayload[]
  subtotalNgn: number
  deliveryNgn: number
  processingNgn: number
  salesVatNgn: number
  totalNgn: number
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Checkout is not configured.' }
  }

  // No online payment gateway yet: treat a successful checkout as paid so admin + stats match reality.
  // When you add Paystack/Stripe, set status from the provider (e.g. pending → paid) instead of forcing here.
  const sb = getSupabase()
  const baseRow = {
    user_id: params.userId,
    email: params.email,
    shipping: params.shipping,
    line_items: params.lineItems,
    subtotal_ngn: params.subtotalNgn,
    delivery_ngn: params.deliveryNgn,
    processing_ngn: params.processingNgn,
    total_ngn: params.totalNgn,
    status: 'paid' as const,
    payment_status: 'paid' as const,
    delivery_status: 'pending' as const,
  }
  const withVatRow = {
    ...baseRow,
    sales_vat_ngn: params.salesVatNgn,
    processing_vat_ngn: 0,
  }

  let { data, error } = await sb.from('orders').insert(withVatRow).select('id').maybeSingle()

  const msg = (error?.message ?? '').toLowerCase()
  const missingVatColumn =
    msg.includes('sales_vat_ngn') ||
    msg.includes('processing_vat_ngn') ||
    (msg.includes('schema cache') && msg.includes('column'))
  if (error && missingVatColumn && !msg.includes('row-level security')) {
    const second = await sb.from('orders').insert(baseRow).select('id').maybeSingle()
    data = second.data
    error = second.error
  }

  if (error || !data?.id) {
    return { ok: false, message: 'Could not place order. Please try again.' }
  }

  return { ok: true, id: data.id as string }
}
