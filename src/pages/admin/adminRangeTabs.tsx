import type { DateRangeFilter } from '../../lib/adminOrderAnalytics.ts'
import { isCompletedStatus, isPendingStatus } from '../../lib/adminOrderAnalytics.ts'
import type { AdminTheme } from './AdminThemeContext.tsx'
import { ad } from './adminUi.ts'

export function AdminRangeTabs({
  value,
  onChange,
  theme,
  compact,
}: {
  value: DateRangeFilter
  onChange: (v: DateRangeFilter) => void
  theme: AdminTheme
  compact?: boolean
}) {
  const tabs: { id: DateRangeFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' },
    { id: 'all', label: 'All time' },
  ]
  return (
    <div
      className={ad(
        theme,
        compact
          ? 'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'inline-flex flex-wrap gap-2 rounded-full border border-stone-200/80 bg-white/80 p-1 shadow-sm',
        compact
          ? 'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'inline-flex flex-wrap gap-2 rounded-full border border-neutral-700 bg-neutral-900/40 p-1 shadow-sm',
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const on = value === t.id
        const base = compact
          ? 'shrink-0 rounded-full px-3.5 py-2 text-[12px] font-semibold'
          : 'rounded-full px-4 py-2 text-[12px] font-semibold'
        const state = compact
          ? on
            ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white')
            : ad(
                theme,
                'bg-white text-stone-600 ring-1 ring-stone-200',
                'bg-neutral-800 text-neutral-300 ring-1 ring-neutral-700',
              )
          : on
            ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white')
            : ad(theme, 'text-stone-600 hover:bg-stone-50', 'text-neutral-400 hover:bg-neutral-800/60')
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)} className={[base, state].join(' ')}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/** Tailwind class string for a rounded status pill. */
export function adminStatusPillClass(status: string, theme: AdminTheme) {
  const s = status.toLowerCase()
  if (isCompletedStatus(s))
    return ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300')
  if (isPendingStatus(s)) return ad(theme, 'bg-amber-100 text-amber-950', 'bg-amber-950/40 text-amber-200')
  return ad(theme, 'bg-stone-100 text-stone-700', 'bg-neutral-800 text-neutral-300')
}

export type AdminOrderBucket = 'all' | 'pending' | 'completed'

export function AdminStatusBucketTabs({
  value,
  onChange,
  theme,
  counts,
}: {
  value: AdminOrderBucket
  onChange: (v: AdminOrderBucket) => void
  theme: AdminTheme
  counts: { all: number; pending: number; completed: number }
}) {
  const tabs: { id: AdminOrderBucket; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: counts.all },
    { id: 'pending', label: 'Pending', n: counts.pending },
    { id: 'completed', label: 'Done', n: counts.completed },
  ]
  return (
    <div
      className={ad(
        theme,
        'inline-flex flex-wrap gap-2 rounded-full border border-stone-200/80 bg-white/80 p-1 shadow-sm',
        'inline-flex flex-wrap gap-2 rounded-full border border-neutral-700 bg-neutral-900/40 p-1 shadow-sm',
      )}
      role="tablist"
    >
      {tabs.map((t) => {
        const on = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={[
              'rounded-full px-4 py-2 text-[12px] font-semibold transition-colors',
              on
                ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white')
                : ad(theme, 'text-stone-600 hover:bg-stone-50', 'text-neutral-400 hover:bg-neutral-800/60'),
            ].join(' ')}
          >
            {t.label} <span className={on ? 'opacity-90' : 'opacity-70'}>({t.n})</span>
          </button>
        )
      })}
    </div>
  )
}
