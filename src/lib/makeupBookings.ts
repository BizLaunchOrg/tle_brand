import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export type MakeupBookingRow = {
  id: string
  created_at: string
  status: 'pending' | 'accepted' | 'rejected'
  source: string
  service_name: string
  service_price: string
  preferred_date: string
  preferred_time: string
  customer_name: string
  customer_phone: string
  customer_email: string
  location_venue: string
  skin_type: string
  allergies: string
  notes: string
}

export type MakeupBookingPayload = {
  source: 'landing' | 'makeup'
  service_name: string
  service_price: string
  preferred_date: string
  preferred_time: string
  customer_name: string
  customer_phone: string
  customer_email: string
  location_venue: string
  skin_type: string
  allergies: string
  notes: string
}

export async function insertMakeupBooking(
  payload: MakeupBookingPayload,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Booking is not available (server not configured).' }
  const { data, error } = await getSupabase()
    .from('makeup_bookings')
    .insert({
      source: payload.source,
      service_name: payload.service_name,
      service_price: payload.service_price,
      preferred_date: payload.preferred_date,
      preferred_time: payload.preferred_time,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_email: payload.customer_email,
      location_venue: payload.location_venue,
      skin_type: payload.skin_type,
      allergies: payload.allergies,
      notes: payload.notes,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data?.id) return { ok: false, message: 'Could not save booking. Please try again.' }
  return { ok: true, id: data.id as string }
}

export async function fetchMakeupBookingsForAdmin(limit = 200): Promise<MakeupBookingRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('makeup_bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as MakeupBookingRow[]
}

export async function fetchMakeupBookingByIdForAdmin(id: string): Promise<MakeupBookingRow | null> {
  if (!isSupabaseConfigured() || !id.trim()) return null
  const { data, error } = await getSupabase().from('makeup_bookings').select('*').eq('id', id).maybeSingle()

  if (error || !data) return null
  return data as MakeupBookingRow
}

export async function updateMakeupBookingStatus(
  id: string,
  status: 'pending' | 'accepted' | 'rejected',
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase().from('makeup_bookings').update({ status }).eq('id', id.trim())
  if (error) return { ok: false, message: 'Update failed.' }
  return { ok: true }
}
