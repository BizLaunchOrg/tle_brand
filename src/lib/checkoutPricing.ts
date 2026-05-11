/** Defaults when `shop_settings` row is missing (see Admin → Account). */
export const CHECKOUT_DELIVERY_FEE_NGN = 4_000
export const CHECKOUT_PROCESSING_FEE_NGN = 1_200

/** @deprecated Percent-based processing removed; flat fee from shop settings. */
export const CHECKOUT_PROCESSING_PERCENT = 0

export function computeCheckoutTotalWithFlatFees(
  subtotalNgn: number,
  deliveryNgn: number,
  processingNgn: number,
): { deliveryNgn: number; processingNgn: number; totalNgn: number } {
  const d = Math.max(0, Math.round(deliveryNgn))
  const p = Math.max(0, Math.round(processingNgn))
  return {
    deliveryNgn: d,
    processingNgn: p,
    totalNgn: Math.max(0, Math.round(subtotalNgn)) + d + p,
  }
}
