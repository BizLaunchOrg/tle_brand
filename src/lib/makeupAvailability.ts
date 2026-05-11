import { getSupabase } from './supabaseClient'
import { isoFromCalendarDay } from './makeupBookingDates.ts'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

/** Labels used across landing, makeup page, and admin (must match stored `time_slot`). */
export const CANONICAL_MAKEUP_TIME_LABELS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
] as const

export type MakeupAvailabilityRuleRow = {
  id: string
  created_at: string
  updated_at: string
  active: boolean
  weekdays: number[]
  time_slot: string
}

/** One row per calendar date (`on_date` = YYYY-MM-DD). */
export type MakeupCalendarDay = {
  on_date: string
  closed: boolean
  time_slots: string[]
}

function slotOrderMap(): Map<string, number> {
  const m = new Map<string, number>()
  CANONICAL_MAKEUP_TIME_LABELS.forEach((t, i) => m.set(t, i))
  return m
}

function sortSlotsCanonical(slots: string[]): string[] {
  const order = slotOrderMap()
  return [...new Set(slots.map((s) => s.trim()).filter(Boolean))].sort(
    (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99),
  )
}

export function calendarDayMap(days: MakeupCalendarDay[]): Map<string, MakeupCalendarDay> {
  const m = new Map<string, MakeupCalendarDay>()
  for (const d of days) {
    const k = (d.on_date || '').trim()
    if (k) m.set(k, d)
  }
  return m
}

/** 0 = Sunday … 6 = Saturday (Date.getDay()). */
export function timeSlotsForWeekday(weekday: number, rules: MakeupAvailabilityRuleRow[]): string[] {
  const set = new Set<string>()
  for (const r of rules) {
    if (!r.active) continue
    if (!Array.isArray(r.weekdays)) continue
    if (r.weekdays.includes(weekday) && r.time_slot.trim()) set.add(r.time_slot.trim())
  }
  const order = slotOrderMap()
  return Array.from(set).sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
}

/**
 * Slots for a specific calendar date: calendar row overrides weekly rules when present.
 * - Row with closed=true → no times.
 * - Row with closed=false and non-empty time_slots → only those times.
 * - Row with closed=false and empty time_slots → same as no row (weekly rules).
 * - No row → weekly rules, then full list fallback.
 */
export function timeSlotsForBookingDate(
  dateIso: string,
  weekday: number,
  rules: MakeupAvailabilityRuleRow[],
  calendarByDate: Map<string, MakeupCalendarDay>,
): string[] {
  const day = dateIso.trim()
  if (!day) return fallbackSlotsIfEmpty([])
  const row = calendarByDate.get(day)
  if (row?.closed) return []
  if (row && !row.closed && Array.isArray(row.time_slots) && row.time_slots.length > 0) {
    const canonical = CANONICAL_MAKEUP_TIME_LABELS as readonly string[]
    const filtered = row.time_slots.filter((t) => canonical.includes(t))
    return sortSlotsCanonical(filtered)
  }
  return fallbackSlotsIfEmpty(timeSlotsForWeekday(weekday, rules))
}

export function fallbackSlotsIfEmpty(slots: string[]): string[] {
  if (slots.length > 0) return slots
  return [...CANONICAL_MAKEUP_TIME_LABELS]
}

export async function fetchPublicAvailabilityRules(): Promise<MakeupAvailabilityRuleRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('makeup_availability_rules')
    .select('id, created_at, updated_at, active, weekdays, time_slot')
    .eq('active', true)
    .order('time_slot', { ascending: true })

  if (error || !data) return []
  return data as MakeupAvailabilityRuleRow[]
}

function localRangeIso(daysBack: number, daysForward: number): { from: string; to: string } {
  const a = new Date()
  a.setHours(12, 0, 0, 0)
  a.setDate(a.getDate() + daysBack)
  const b = new Date()
  b.setHours(12, 0, 0, 0)
  b.setDate(b.getDate() + daysForward)
  return {
    from: isoFromCalendarDay(a.getFullYear(), a.getMonth(), a.getDate()),
    to: isoFromCalendarDay(b.getFullYear(), b.getMonth(), b.getDate()),
  }
}

export async function fetchPublicAvailabilityCalendar(): Promise<MakeupCalendarDay[]> {
  if (!isSupabaseConfigured()) return []
  const { from, to } = localRangeIso(-2, 730)
  const { data, error } = await getSupabase()
    .from('makeup_availability_calendar')
    .select('on_date, closed, time_slots')
    .gte('on_date', from)
    .lte('on_date', to)

  if (error || !data) return []
  return data.map((r) => ({
    on_date: String((r as { on_date: string }).on_date).slice(0, 10),
    closed: Boolean((r as { closed: boolean }).closed),
    time_slots: Array.isArray((r as { time_slots: string[] }).time_slots)
      ? (r as { time_slots: string[] }).time_slots
      : [],
  }))
}

export async function fetchPublicMakeupAvailability(): Promise<{
  rules: MakeupAvailabilityRuleRow[]
  calendarDays: MakeupCalendarDay[]
}> {
  const [rules, calendarDays] = await Promise.all([fetchPublicAvailabilityRules(), fetchPublicAvailabilityCalendar()])
  return { rules, calendarDays }
}

export async function fetchAdminAvailabilityRules(): Promise<MakeupAvailabilityRuleRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('makeup_availability_rules')
    .select('*')
    .order('time_slot', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as MakeupAvailabilityRuleRow[]
}

export async function insertAvailabilityRule(
  weekdays: number[],
  timeSlot: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const uniq = [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
  if (uniq.length === 0) return { ok: false, message: 'Pick at least one weekday.' }
  const slot = timeSlot.trim()
  if (!(CANONICAL_MAKEUP_TIME_LABELS as readonly string[]).includes(slot)) {
    return { ok: false, message: 'Pick a time from the list.' }
  }
  const { data, error } = await getSupabase()
    .from('makeup_availability_rules')
    .insert({ weekdays: uniq, time_slot: slot, active: true })
    .select('id')
    .single()
  if (error || !data?.id) return { ok: false, message: 'Could not save slot.' }
  return { ok: true, id: data.id as string }
}

export async function deleteAvailabilityRule(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase().from('makeup_availability_rules').delete().eq('id', id.trim())
  if (error) return { ok: false, message: 'Delete failed.' }
  return { ok: true }
}

export async function setAvailabilityRuleActive(
  id: string,
  nextActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase()
    .from('makeup_availability_rules')
    .update({ active: nextActive, updated_at: new Date().toISOString() })
    .eq('id', id.trim())
  if (error) return { ok: false, message: 'Update failed.' }
  return { ok: true }
}

export async function fetchAdminAvailabilityCalendar(fromIso: string, toIso: string): Promise<MakeupCalendarDay[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('makeup_availability_calendar')
    .select('on_date, closed, time_slots')
    .gte('on_date', fromIso.trim())
    .lte('on_date', toIso.trim())
    .order('on_date', { ascending: true })

  if (error || !data) return []
  return data.map((r) => ({
    on_date: String((r as { on_date: string }).on_date).slice(0, 10),
    closed: Boolean((r as { closed: boolean }).closed),
    time_slots: Array.isArray((r as { time_slots: string[] }).time_slots)
      ? (r as { time_slots: string[] }).time_slots
      : [],
  }))
}

export async function deleteAvailabilityCalendarDay(
  onDate: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const d = onDate.trim().slice(0, 10)
  const { error } = await getSupabase().from('makeup_availability_calendar').delete().eq('on_date', d)
  if (error) return { ok: false, message: 'Could not clear this day.' }
  return { ok: true }
}

export async function upsertAvailabilityCalendarDay(
  onDate: string,
  mode: 'closed' | 'custom',
  slotsWhenCustom: string[],
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const d = onDate.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, message: 'Invalid date.' }

  if (mode === 'custom') {
    const canonical = CANONICAL_MAKEUP_TIME_LABELS as readonly string[]
    const cleaned = sortSlotsCanonical(slotsWhenCustom.filter((t) => canonical.includes(t)))
    if (cleaned.length === 0) return { ok: false, message: 'Pick at least one time, or choose another option.' }
    const { error } = await getSupabase()
      .from('makeup_availability_calendar')
      .upsert(
        {
          on_date: d,
          closed: false,
          time_slots: cleaned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'on_date' },
      )
    if (error) return { ok: false, message: 'Could not save this day.' }
    return { ok: true }
  }

  const { error } = await getSupabase()
    .from('makeup_availability_calendar')
    .upsert(
      {
        on_date: d,
        closed: true,
        time_slots: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'on_date' },
    )
  if (error) return { ok: false, message: 'Could not mark this day off.' }
  return { ok: true }
}

const WD_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function formatWeekdays(weekdays: number[]): string {
  const u = [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b)
  return u.map((d) => WD_SHORT[d] ?? String(d)).join(', ')
}
