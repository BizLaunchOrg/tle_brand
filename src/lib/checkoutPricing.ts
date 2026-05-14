/** Defaults when `shop_settings` row is missing (see Admin → Account). */
export const CHECKOUT_DELIVERY_FEE_NGN = 4_000
export const CHECKOUT_PROCESSING_FEE_NGN = 1_200

/** @deprecated Percent-based processing removed; flat fee from shop settings. */
export const CHECKOUT_PROCESSING_PERCENT = 0

/** VAT on the processing line only; `processingVatPercent` is 0–100. */
export function computeProcessingVatNgn(processingBaseNgn: number, processingVatPercent: number): number {
  const base = Math.max(0, Math.round(processingBaseNgn))
  const rate = Math.max(0, Math.min(100, Number(processingVatPercent)))
  if (!Number.isFinite(rate) || rate <= 0) return 0
  return Math.round((base * rate) / 100)
}

export function computeCheckoutTotalWithFlatFees(
  subtotalNgn: number,
  deliveryNgn: number,
  processingNgn: number,
  processingVatPercent = 0,
): {
  deliveryNgn: number
  processingNgn: number
  processingVatNgn: number
  totalNgn: number
} {
  const d = Math.max(0, Math.round(deliveryNgn))
  const p = Math.max(0, Math.round(processingNgn))
  const v = computeProcessingVatNgn(p, processingVatPercent)
  return {
    deliveryNgn: d,
    processingNgn: p,
    processingVatNgn: v,
    totalNgn: Math.max(0, Math.round(subtotalNgn)) + d + p + v,
  }
}
