const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function phoneDigitsLen(phone: string): number {
  return phone.replace(/\D/g, "").length
}

/** Home booking step — name, phone. Location only if required. */
export function validateLandingBookingDetails(params: {
  name: string
  phone: string
  location: string
  isLocationRequired: boolean
}): string | null {
  if (!params.name.trim()) return "Please enter your full name."
  if (phoneDigitsLen(params.phone) < 7) {
    return "Please enter a valid phone number (at least 7 digits)."
  }
  if (params.isLocationRequired && !params.location.trim()) {
    return "Please enter your location or venue."
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
