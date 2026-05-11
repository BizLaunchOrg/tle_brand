/** Stable label for DB / admin (local calendar date, noon avoids DST edge cases). */
export function formatBookingDateLabel(iso: string): string {
  const t = iso.trim()
  if (!t) return ''
  const d = new Date(`${t}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function isoFromCalendarDay(y: number, monthIndex: number, day: number): string {
  return `${y}-${pad2(monthIndex + 1)}-${pad2(day)}`
}
