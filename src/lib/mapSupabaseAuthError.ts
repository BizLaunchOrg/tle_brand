/** User-facing copy for Supabase Auth errors (no raw API text in the UI). */

type AuthErrorLike = {
  message: string
  status?: number
}

export function mapSupabaseAuthError(
  error: AuthErrorLike,
  context: 'login' | 'signup' | 'account_email' | 'account_password',
): string {
  const raw = (error.message || '').trim()
  const msg = raw.toLowerCase()
  const status = error.status

  if (
    status === 0 ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('networkerror')
  ) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  if (msg.includes('too many requests') || msg.includes('rate limit') || msg.includes('email rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }

  if (context === 'account_email') {
    if (
      msg.includes('same') &&
      (msg.includes('email') || msg.includes('old') || msg.includes('new'))
    ) {
      return 'Enter a different email address than your current one.'
    }
    if (
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('user already exists') ||
      msg.includes('email address is already registered') ||
      msg.includes('already been taken')
    ) {
      return 'That email is already in use. Try another address.'
    }
    if (msg.includes('invalid email') || msg.includes('invalid format') || msg.includes('validate email')) {
      return 'Enter a valid email address.'
    }
    if (status !== undefined && status >= 500) {
      return 'The service is temporarily unavailable. Please try again later.'
    }
    return 'Could not update email. Please try again.'
  }

  if (context === 'account_password') {
    if (msg.includes('same') && msg.includes('password')) {
      return 'Choose a new password that is different from your current one.'
    }
    if (msg.includes('password') && (msg.includes('least') || msg.includes('short') || msg.includes('weak'))) {
      return 'Password does not meet requirements. Use a stronger password.'
    }
    if (status !== undefined && status >= 500) {
      return 'The service is temporarily unavailable. Please try again later.'
    }
    return 'Could not update password. Please try again.'
  }

  if (context === 'login') {
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return 'Please confirm your email before signing in.'
    }
    if (
      msg.includes('invalid login credentials') ||
      msg.includes('invalid credentials') ||
      msg.includes('invalid_grant')
    ) {
      return 'Invalid email or password.'
    }
    if (status === 400 && !raw) {
      return 'Invalid email or password.'
    }
  }

  if (context === 'signup') {
    if (
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('user already exists') ||
      msg.includes('email address is already registered')
    ) {
      return 'An account with this email already exists. Try signing in instead.'
    }
    if (msg.includes('invalid email')) {
      return 'Enter a valid email address.'
    }
    if (msg.includes('password') && (msg.includes('least') || msg.includes('short') || msg.includes('weak'))) {
      return 'Password does not meet requirements. Use a stronger password.'
    }
  }

  if (status !== undefined && status >= 500) {
    return 'The service is temporarily unavailable. Please try again later.'
  }

  return context === 'login'
    ? 'Unable to sign in. Please check your details and try again.'
    : 'Unable to create an account. Please try again.'
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  return Boolean(url && key)
}
