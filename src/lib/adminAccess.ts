import type { User as SupabaseUser } from '@supabase/supabase-js'
import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

/** Supabase Dashboard → User → set app_metadata e.g. { "role": "admin" }. */
export function hasAdminJwtClaim(user: SupabaseUser): boolean {
  const app = user.app_metadata as Record<string, unknown> | undefined
  if (!app) return false
  if (app.role === 'admin') return true
  if (app.admin === true) return true
  return false
}

/** Row in public.admin_users for this auth user. */
export async function isUserInAdminAllowlist(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { data, error } = await getSupabase()
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return data != null
}

export async function resolveAdminAccess(user: SupabaseUser | null): Promise<boolean> {
  if (!user) return false
  if (hasAdminJwtClaim(user)) return true
  return isUserInAdminAllowlist(user.id)
}
