import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export const DEFAULT_DELIVERY_FEE_NGN = 4_000
export const DEFAULT_PROCESSING_FEE_NGN = 1_200

export type ShopFees = {
  deliveryFeeNgn: number
  processingFeeNgn: number
}

function clampFee(n: unknown, fallback: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 0) return fallback
  return Math.min(v, 50_000_000)
}

export async function fetchShopFees(): Promise<ShopFees> {
  if (!isSupabaseConfigured()) {
    return { deliveryFeeNgn: DEFAULT_DELIVERY_FEE_NGN, processingFeeNgn: DEFAULT_PROCESSING_FEE_NGN }
  }
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select('delivery_fee_ngn, processing_fee_ngn')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) {
    return { deliveryFeeNgn: DEFAULT_DELIVERY_FEE_NGN, processingFeeNgn: DEFAULT_PROCESSING_FEE_NGN }
  }
  return {
    deliveryFeeNgn: clampFee(data.delivery_fee_ngn, DEFAULT_DELIVERY_FEE_NGN),
    processingFeeNgn: clampFee(data.processing_fee_ngn, DEFAULT_PROCESSING_FEE_NGN),
  }
}

export async function updateShopFees(
  deliveryFeeNgn: number,
  processingFeeNgn: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const d = clampFee(deliveryFeeNgn, DEFAULT_DELIVERY_FEE_NGN)
  const p = clampFee(processingFeeNgn, DEFAULT_PROCESSING_FEE_NGN)
  const { error } = await getSupabase()
    .from('shop_settings')
    .update({
      delivery_fee_ngn: d,
      processing_fee_ngn: p,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')

  if (error) return { ok: false, message: 'Could not save fees. Are you signed in as an admin?' }
  return { ok: true }
}
