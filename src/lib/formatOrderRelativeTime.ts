const MIN_MS = 60_000
const HOUR_MS = 60 * MIN_MS
const DAY_MS = 24 * HOUR_MS

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Short label for lists: "Just now", "3 min ago", "Yesterday", weekday, or date. */
export function formatOrderRelativeLabel(iso: string, now = new Date()): string {
  const d = new Date(iso)
  const t = d.getTime()
  if (Number.isNaN(t)) return '—'
  const diffMs = now.getTime() - t
  if (diffMs < 0) return formatOrderFullLabel(iso)

  if (diffMs < 45_000) return 'Just now'
  const mins = Math.floor(diffMs / MIN_MS)
  if (diffMs < HOUR_MS) return mins < 1 ? '1 min ago' : `${mins} min ago`

  const sameCalDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  if (sameCalDay) {
    const hrs = Math.floor(diffMs / HOUR_MS)
    return hrs < 1 ? `${mins} min ago` : `${hrs} hr ago`
  }

  const dayDiff = Math.round((startOfLocalDay(now) - startOfLocalDay(d)) / DAY_MS)
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff > 1 && dayDiff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' })

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function formatOrderFullLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })
}