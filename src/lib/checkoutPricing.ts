/** Defaults when `shop_settings` row is missing (see Admin → Account). */
export const CHECKOUT_DELIVERY_FEE_NGN = 4_000
export const CHECKOUT_PROCESSING_FEE_NGN = 1_200

/** @deprecated Percent-based processing removed; flat fee from shop settings. */
export const CHECKOUT_PROCESSING_PERCENT = 0

export type CheckoutVatOptions = {
  /** Percent VAT on products subtotal (0-100). */
  salesVatPercent?: number
}

/** VAT on goods as a percent of subtotal. */
export function computeSalesVatNgnFromPercent(subtotalNgn: number, percent: number): number {
  const p = Math.max(0, Math.min(100, Number(percent)))
  const v = Math.round(subtotalNgn * p / 100)
  return Math.min(v, 50_000_000)
}

export function computeCheckoutTotalWithFees(
  subtotalNgn: number,
  deliveryNgn: number,
  processingNgn: number,
  vatOpts: CheckoutVatOptions = {},
): {
  deliveryNgn: number
  processingNgn: number
  salesVatNgn: number
  totalNgn: number
} {
  const d = Math.max(0, Math.round(deliveryNgn))
  const p = Math.max(0, Math.round(processingNgn))
  const sub = Math.max(0, Math.round(subtotalNgn))
  const salesV = computeSalesVatNgnFromPercent(sub, vatOpts.salesVatPercent ?? 0)
  return {
    deliveryNgn: d,
    processingNgn: p,
    salesVatNgn: salesV,
    totalNgn: sub + salesV + d + p,
  }
}
