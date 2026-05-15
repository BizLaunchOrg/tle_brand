const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function phoneDigitsLen(phone: string): number {
  return phone.replace(/\D/g, "").length
}

/** Home booking step — name, phone, email, location, skin type, allergies (use "None" if none). */
export function validateLandingBookingDetails(params: {
  name: string
  phone: string
  email: string
  location: string
  skinType: string
  allergies: string
}): string | null {
  if (!params.name.trim()) return "Please enter your full name."
  if (phoneDigitsLen(params.phone) < 7) {
    return "Please enter a valid phone number (at least 7 digits)."
  }
  const em = params.email.trim()
  if (!em || !EMAIL_RE.test(em)) return "Please enter a valid email address."
  if (!params.location.trim()) return "Please enter your location or venue."
  if (!params.skinType.trim()) return "Please select your skin type."
  if (!params.allergies.trim()) {
    return "Please note any allergies or concerns, or type None if not applicable."
  }
  return null
}

/** Makeup page booking — name, phone, email only. */
export function validateMakeupBookingDetails(params: {
  name: string
  phone: string
  email: string
}): string | null {
  if (!params.name.trim()) return "Please enter your full name."
  if (phoneDigitsLen(params.phone) < 7) {
    return "Please enter a valid phone number (at least 7 digits)."
  }
  const em = params.email.trim()
  if (!em || !EMAIL_RE.test(em)) return "Please enter a valid email address."
  return null
}
