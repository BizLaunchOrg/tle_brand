/** Digits only (no +) — required format for https://wa.me/ */
export const SITE_WHATSAPP_E164 = '2347062818542'

export const SITE_PHONE_TEL = 'tel:+2347062818542'

/** Human-readable for UI */
export const SITE_PHONE_DISPLAY = '+234 706 281 8542'

export const SITE_ADDRESS = {
  venue: 'Tobilicious by Lady Emma',
  line: '16 Kadiri street, Ikate, Surulere',
  area: 'Lagos, Nigeria',
} as const

/** Opens WhatsApp with this text prefilled (professional, from website). */
export const WHATSAPP_WEBSITE_PREFILL =
  "Hello TOBILICIOUS BY LADY EMMA, I'm reaching out from your website. I'd love to hear from you."

export function buildWhatsappUrl(message: string = WHATSAPP_WEBSITE_PREFILL): string {
  return `https://wa.me/${SITE_WHATSAPP_E164}?text=${encodeURIComponent(message)}`
}

export function googleMapsSearchUrl(): string {
  const q = encodeURIComponent(`${SITE_ADDRESS.venue}, ${SITE_ADDRESS.line}, ${SITE_ADDRESS.area}`)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
