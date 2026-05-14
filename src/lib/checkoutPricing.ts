/** Defaults when `shop_settings` row is missing (see Admin → Account). */
export const CHECKOUT_DELIVERY_FEE_NGN = 4_000
export const CHECKOUT_PROCESSING_FEE_NGN = 1_200

/** @deprecated Percent-based processing removed; flat fee from shop settings. */
export const CHECKOUT_PROCESSING_PERCENT = 0

export type CheckoutFlatFeeVatOptions = {
  /** Whole naira: VAT on products once per order (0 = none). */
  salesVatFlatNgn?: number
}

/** VAT on goods as a fixed ₦ amount per order (not a percent of subtotal). */
export function computeSalesVatNgnFromFlat(flatNgn: number): number {
  const v = Math.round(Number(flatNgn))
  if (!Number.isFinite(v) || v <= 0) return 0
  return Math.min(v, 50_000_000)
}

export function computeCheckoutTotalWithFlatFees(
  subtotalNgn: number,
  deliveryNgn: number,
  processingNgn: number,
  vatOpts: CheckoutFlatFeeVatOptions = {},
): {
  deliveryNgn: number
  processingNgn: number
  salesVatNgn: number
  totalNgn: number
} {
  const d = Math.max(0, Math.round(deliveryNgn))
  const p = Math.max(0, Math.round(processingNgn))
  const sub = Math.max(0, Math.round(subtotalNgn))
  const salesV = computeSalesVatNgnFromFlat(vatOpts.salesVatFlatNgn ?? 0)
  return {
    deliveryNgn: d,
    processingNgn: p,
    salesVatNgn: salesV,
    totalNgn: sub + salesV + d + p,
  }
}
