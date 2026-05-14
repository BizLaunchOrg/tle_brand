import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export const DEFAULT_DELIVERY_FEE_NGN = 4_000
export const DEFAULT_PROCESSING_FEE_NGN = 1_200

export type DeliveryZone = {
  id: string
  label: string
  feeNgn: number
  /** Shown under the option at checkout (pickup address, etc.) */
  description?: string | null
}

export type ShopFees = {
  deliveryFeeNgn: number
  processingFeeNgn: number
  /** When non-empty, checkout uses these options instead of the flat delivery fee. */
  deliveryZones: DeliveryZone[]
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

function randomZoneId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `z_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeDeliveryZones(raw: unknown): DeliveryZone[] {
  if (!Array.isArray(raw)) return []
  const out: DeliveryZone[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : randomZoneId()
    const label = typeof o.label === 'string' ? o.label.trim() : ''
    const feeRaw = o.feeNgn
    const feeNgn = Math.round(Number(feeRaw))
    if (!label || !Number.isFinite(feeNgn) || feeNgn < 0 || feeNgn > 50_000_000) continue
    const desc =
      o.description == null
        ? null
        : typeof o.description === 'string'
          ? o.description.trim() || null
          : null
    out.push({ id, label, feeNgn, description: desc })
  }
  return out
}

type ShopSettingsRow = {
  delivery_fee_ngn: unknown
  processing_fee_ngn: unknown
  public_app_url?: string | null
  delivery_zones?: unknown
}

async function fetchShopSettingsRow(): Promise<ShopSettingsRow | null> {
  if (!isSupabaseConfigured()) return null
  const { data, error } = await getSupabase()
    .from('shop_settings')
    .select('delivery_fee_ngn, processing_fee_ngn, public_app_url, delivery_zones')
    .eq('id', 'default')
    .maybeSingle()

  if (error || !data) return null
  return data as ShopSettingsRow
}

export async function fetchShopFees(): Promise<ShopFees> {
  const row = await fetchShopSettingsRow()
  if (!row) {
    return {
      deliveryFeeNgn: DEFAULT_DELIVERY_FEE_NGN,
      processingFeeNgn: DEFAULT_PROCESSING_FEE_NGN,
      deliveryZones: [],
    }
  }
  return {
    deliveryFeeNgn: clampFee(row.delivery_fee_ngn, DEFAULT_DELIVERY_FEE_NGN),
    processingFeeNgn: clampFee(row.processing_fee_ngn, DEFAULT_PROCESSING_FEE_NGN),
    deliveryZones: normalizeDeliveryZones(row.delivery_zones),
  }
}

export async function fetchShopAccountSettings(): Promise<ShopAccountSettings> {
  const row = await fetchShopSettingsRow()
  if (!row) {
    return {
      deliveryFeeNgn: DEFAULT_DELIVERY_FEE_NGN,
      processingFeeNgn: DEFAULT_PROCESSING_FEE_NGN,
      deliveryZones: [],
      publicAppUrl: null,
    }
  }
  const fees = {
    deliveryFeeNgn: clampFee(row.delivery_fee_ngn, DEFAULT_DELIVERY_FEE_NGN),
    processingFeeNgn: clampFee(row.processing_fee_ngn, DEFAULT_PROCESSING_FEE_NGN),
    deliveryZones: normalizeDeliveryZones(row.delivery_zones),
  }
  const raw = row.public_app_url
  const publicAppUrl =
    raw == null || typeof raw !== 'string' || !raw.trim() ? null : normalizeStorePublicUrl(raw)
  return { ...fees, publicAppUrl }
}

export type UpdateShopFeesOptions = {
  publicAppUrlInput?: string | null
  /** When set, replaces `delivery_zones` in the database (can be []). */
  deliveryZones?: DeliveryZone[]
}

export async function updateShopFees(
  deliveryFeeNgn: number,
  processingFeeNgn: number,
  options?: UpdateShopFeesOptions,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const d = clampFee(deliveryFeeNgn, DEFAULT_DELIVERY_FEE_NGN)
  const p = clampFee(processingFeeNgn, DEFAULT_PROCESSING_FEE_NGN)

  const patch: Record<string, unknown> = {
    delivery_fee_ngn: d,
    processing_fee_ngn: p,
    updated_at: new Date().toISOString(),
  }

  const publicAppUrlInput = options?.publicAppUrlInput
  if (publicAppUrlInput !== undefined) {
    const raw = publicAppUrlInput == null ? '' : publicAppUrlInput.trim()
    const normalized = raw === '' ? null : normalizeStorePublicUrl(raw)
    if (raw !== '' && !normalized) {
      return { ok: false, message: 'Public site URL looks invalid. Use your live origin, e.g. https://your-app.vercel.app' }
    }
    patch.public_app_url = normalized
  }

  if (options?.deliveryZones !== undefined) {
    const input = options.deliveryZones
    for (let i = 0; i < input.length; i++) {
      const z = input[i]
      if (!z?.label?.trim()) {
        return { ok: false, message: `Location ${i + 1} needs a title.` }
      }
      const f = Math.round(Number(z.feeNgn))
      if (!Number.isFinite(f) || f < 0 || f > 50_000_000) {
        return { ok: false, message: `Location "${z.label.trim()}" needs a valid fee (0 for free).` }
      }
    }
    patch.delivery_zones = input.map((z) => ({
      id: typeof z.id === 'string' && z.id.trim() ? z.id.trim() : randomZoneId(),
      label: z.label.trim(),
      feeNgn: Math.round(Number(z.feeNgn)),
      description: z.description?.trim() ? z.description.trim() : null,
    }))
  }

  const { error } = await getSupabase().from('shop_settings').update(patch).eq('id', 'default')

  if (error) return { ok: false, message: 'Could not save settings. Are you signed in as an admin?' }
  return { ok: true }
}
