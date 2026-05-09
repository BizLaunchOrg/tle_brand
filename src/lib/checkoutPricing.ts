/** Nationwide delivery (Nigeria). */
export const CHECKOUT_DELIVERY_FEE_NGN = 4_000

/** Processing / handling as a percent of cart subtotal. */
export const CHECKOUT_PROCESSING_PERCENT = 10

export function computeProcessingFeeNgn(subtotalNgn: number): number {
  return Math.round((subtotalNgn * CHECKOUT_PROCESSING_PERCENT) / 100)
}

export function computeCheckoutTotalNgn(subtotalNgn: number): {
  deliveryNgn: number
  processingNgn: number
  totalNgn: number
} {
  const deliveryNgn = CHECKOUT_DELIVERY_FEE_NGN
  const processingNgn = computeProcessingFeeNgn(subtotalNgn)
  return {
    deliveryNgn,
    processingNgn,
    totalNgn: subtotalNgn + deliveryNgn + processingNgn,
  }
}
