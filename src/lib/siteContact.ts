/** Digits only (no +) — required format for https://wa.me/ */
export const SITE_WHATSAPP_E164 = '2347062818542'

export const SITE_PHONE_TEL = 'tel:+2347062818542'

/** Human-readable for UI */
export const SITE_PHONE_DISPLAY = '+234 706 281 8542'

export const SITE_ADDRESS = {
  venue: 'TLE BRAND',
  line: '16 Kadiri Street, Ikate, Surulere',
  area: 'Lagos, Nigeria',
} as const

/** Opens WhatsApp with this text prefilled (professional, from website). */
export const WHATSAPP_WEBSITE_PREFILL =
  "Hello TOBILICIOUS BY LADY EMMA, I'm reaching out from your website. I'd love to hear from you."

export function buildWhatsappUrl(message: string = WHATSAPP_WEBSITE_PREFILL): string {
  return `https://wa.me/${SITE_WHATSAPP_E164}?text=${encodeURIComponent(message)}`
}

export function googleMapsSearchUrl(): string {
  // Use the provided short Google Maps link to ensure the correct pinned location.
  return 'https://maps.app.goo.gl/gDbcPPwGZjh9qnrDA?g_st=iwb'
}
