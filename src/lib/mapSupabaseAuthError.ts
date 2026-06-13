/** User-facing copy for Supabase Auth errors (no raw API text in the UI). */

type AuthErrorLike = {
  message: string
  status?: number
  code?: string
}

export function mapSupabaseAuthError(
  error: AuthErrorLike,
  context: 'login' | 'signup' | 'account_email' | 'account_password',
): string {
  const raw = (error.message || '').trim()
  const msg = raw.toLowerCase()
  const status = error.status
  const code = (error.code || '').toLowerCase()

  if (
    status === 0 ||
    msg.includes('failed to fetch') ||
    msg.includes('network') ||
    msg.includes('load failed') ||
    msg.includes('networkerror')
  ) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  if (
    msg.includes('too many requests') ||
    msg.includes('rate limit') ||
    msg.includes('email rate limit') ||
    code.includes('over_email_send_rate_limit')
  ) {
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
      code === 'email_exists' ||
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('user already exists') ||
      msg.includes('email address is already registered') ||
      msg.includes('already been taken') ||
      msg.includes('email address is already')
    ) {
      return 'That email is already in use. Try another address.'
    }
    if (msg.includes('invalid email') || msg.includes('invalid format') || msg.includes('validate email')) {
      return 'Enter a valid email address.'
    }
    if (
      msg.includes('redirect') ||
      msg.includes('not allowed') ||
      msg.includes('url configuration') ||
      code.includes('redirect')
    ) {
      return 'Email could not be sent — the site redirect URL may need to be added in Supabase (Authentication → URL Configuration). Contact support if this keeps happening.'
    }
    if (
      msg.includes('error sending') ||
      msg.includes('confirmation email') ||
      msg.includes('smtp') ||
      msg.includes('mail') ||
      msg.includes('email provider')
    ) {
      return 'Could not send the confirmation email. Check that the new address is correct, or try again in a few minutes.'
    }
    if (
      msg.includes('session') ||
      msg.includes('jwt') ||
      msg.includes('not authenticated') ||
      msg.includes('login required') ||
      code.includes('session_not_found')
    ) {
      return 'Your session expired. Sign out, sign in again, then update your email.'
    }
    if (msg.includes('reauthenticate') || msg.includes('recent login') || code.includes('reauthentication')) {
      return 'For security, sign out, sign in again with your password, then update your email.'
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
