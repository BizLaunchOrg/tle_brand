import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export const DEFAULT_DELIVERY_FEE_NGN = 4_000
export const DEFAULT_PROCESSING_FEE_NGN = 1_200

export type ShopFees = {
  deliveryFeeNgn: number
  processingFeeNgn: number
}

export type ShopAccountSettings = ShopFees & {
  /** Canonical origin for push deep links; null if unset. */
  publicAppUrl: string | null
}

function clampFee(n: unknown, fallback: number): number {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v) || v < 0) return fallback
  return Math.min(v, 50_000_000)
}

/** Match Edge Function admin-push-hook: origin only, no trailing path. */
export function normalizeStorePublicUrl(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) {
    if (s.startsWith('//')) s = `https:${s}`
    else if (/^localhost\b|^127\./i.test(s)) s = `http://${s}`
    else s = `https://${s}`
  }
  try {
    const u = new URL(s)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

type ShopSettingsRow = {
  delivery_fee_ngn: unknown
  processing_fee_ngn: unknown
  public_app_url?: string | null
}

async function fetchShopSettingsRow(): Promise<ShopSettingsRow | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select('delivery_fee_ngn, processing_fee_ngn, public_app_url')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) return null
  return data as ShopSettingsRow
}

export async function fetchShopFees(): Promise<ShopFees> {
  const row = await fetchShopSettingsRow()
  if (!row) {
    return { deliveryFeeNgn: DEFAULT_DELIVERY_FEE_NGN, processingFeeNgn: DEFAULT_PROCESSING_FEE_NGN }
  }
  return {
    deliveryFeeNgn: clampFee(row.delivery_fee_ngn, DEFAULT_DELIVERY_FEE_NGN),
    processingFeeNgn: clampFee(row.processing_fee_ngn, DEFAULT_PROCESSING_FEE_NGN),
  }
}

export async function fetchShopAccountSettings(): Promise<ShopAccountSettings> {
  const row = await fetchShopSettingsRow()
  if (!row) {
    return {
      deliveryFeeNgn: DEFAULT_DELIVERY_FEE_NGN,
      processingFeeNgn: DEFAULT_PROCESSING_FEE_NGN,
      publicAppUrl: null,
    }
  }
  const fees = {
    deliveryFeeNgn: clampFee(row.delivery_fee_ngn, DEFAULT_DELIVERY_FEE_NGN),
    processingFeeNgn: clampFee(row.processing_fee_ngn, DEFAULT_PROCESSING_FEE_NGN),
  }
  const raw = row.public_app_url
  const publicAppUrl =
    raw == null || typeof raw !== 'string' || !raw.trim() ? null : normalizeStorePublicUrl(raw)
  return { ...fees, publicAppUrl }
}

export async function updateShopFees(
  deliveryFeeNgn: number,
  processingFeeNgn: number,
  publicAppUrlInput?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const d = clampFee(deliveryFeeNgn, DEFAULT_DELIVERY_FEE_NGN)
  const p = clampFee(processingFeeNgn, DEFAULT_PROCESSING_FEE_NGN)

  const patch: Record<string, unknown> = {
    delivery_fee_ngn: d,
    processing_fee_ngn: p,
    updated_at: new Date().toISOString(),
  }

  if (publicAppUrlInput !== undefined) {
    const raw = publicAppUrlInput == null ? '' : publicAppUrlInput.trim()
    const normalized = raw === '' ? null : normalizeStorePublicUrl(raw)
    if (raw !== '' && !normalized) {
      return { ok: false, message: 'Public site URL looks invalid. Use your live origin, e.g. https://your-app.vercel.app' }
    }
    patch.public_app_url = normalized
  }

  const { error } = await getSupabase().from('shop_settings').update(patch).eq('id', 'default')

  if (error) return { ok: false, message: 'Could not save settings. Are you signed in as an admin?' }
  return { ok: true }
}
