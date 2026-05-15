import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export interface UserAddress {
  id: string
  user_id: string
  name: string
  full_name: string
  phone: string
  street: string
  landmark: string | null
  city: string
  state: string
  created_at: string
}

export async function fetchUserAddresses(): Promise<UserAddress[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('user_addresses')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching addresses:', error)
    return []
  }
  return data as UserAddress[]
}

export async function saveUserAddress(address: Omit<UserAddress, 'id' | 'user_id' | 'created_at'>): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  
  const { data: { session } } = await getSupabase().auth.getSession()
  if (!session?.user?.id) return { ok: false, message: 'Not logged in.' }

  const { data, error } = await getSupabase()
    .from('user_addresses')
    .insert({
      ...address,
      user_id: session.user.id
    })
    .select('id')
    .single()

  if (error) return { ok: false, message: error.message }
  return { ok: true, id: data.id }
}

export async function deleteUserAddress(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await getSupabase()
    .from('user_addresses')
    .delete()
    .eq('id', id)
  
  return !error
}
