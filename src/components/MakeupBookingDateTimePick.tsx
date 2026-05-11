import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  calendarDayMap,
  timeSlotsForBookingDate,
  type MakeupAvailabilityRuleRow,
  type MakeupCalendarDay,
} from '../lib/makeupAvailability.ts'
import { formatBookingDateLabel, isoFromCalendarDay } from '../lib/makeupBookingDates.ts'

function addCalendarMonths(monthAnchor: Date, delta: number): Date {
  const x = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
  x.setMonth(x.getMonth() + delta)
  return x
}

function dayCellCls(unavailable: boolean, isToday: boolean, selected: boolean) {
  const base =
    'flex h-[40px] w-full items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200'
  if (unavailable) return `${base} cursor-not-allowed text-tle-faint`
  if (selected) return `${base} cursor-pointer bg-tle-pink text-white shadow-sm ring-2 ring-tle-pink/30`
  if (isToday) return `${base} cursor-pointer font-bold text-tle-pink ring-1 ring-tle-pink/40 hover:bg-tle-blush`
  return `${base} cursor-pointer text-tle-ink hover:bg-tle-blush hover:text-tle-pink`
}

export type MakeupBookingDateTimePickProps = {
  availabilityRules: MakeupAvailabilityRuleRow[]
  calendarDays: MakeupCalendarDay[]
  dateIso: string
  onDateIsoChange: (iso: string) => void
  selectedTime: string
  onTimeChange: (time: string) => void
  /** Wrapper around the month grid (background, padding). */
  calendarPanelClassName?: string
}

export function MakeupBookingDateTimePick({
  availabilityRules,
  calendarDays,
  dateIso,
  onDateIsoChange,
  selectedTime,
  onTimeChange,
  calendarPanelClassName = 'mb-6 rounded-[20px] bg-tle-cream p-6 sm:p-7',
}: MakeupBookingDateTimePickProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })

  const canGoPrevMonth = useMemo(() => {
    const cur = new Date()
    const earliest = new Date(cur.getFullYear(), cur.getMonth(), 1)
    return viewMonth > earliest
  }, [viewMonth])

  const calendarMap = useMemo(() => calendarDayMap(calendarDays), [calendarDays])

  const weekday = useMemo(() => {
    if (!dateIso.trim()) return null
    const d = new Date(`${dateIso.trim()}T12:00:00`)
    if (Number.isNaN(d.getTime())) return null
    return d.getDay()
  }, [dateIso])

  const slots = useMemo(() => {
    if (weekday === null || !dateIso.trim()) return []
    return timeSlotsForBookingDate(dateIso.trim(), weekday, availabilityRules, calendarMap)
  }, [weekday, dateIso, availabilityRules, calendarMap])

  useEffect(() => {
    if (!selectedTime) return
    if (slots.length > 0 && !slots.includes(selectedTime)) onTimeChange('')
  }, [slots, selectedTime, onTimeChange])

  const calendarCells = useMemo(() => {
    const y = viewMonth.getFullYear()
    const m = viewMonth.getMonth()
    const firstDay = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const today = new Date()
    const todayY = today.getFullYear()
    const todayM = today.getMonth()
    const todayD = today.getDate()
    const startOfToday = new Date(todayY, todayM, todayD)
    const cells: ReactNode[] = []
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e-${i}`} className="h-[40px]" />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoFromCalendarDay(y, m, d)
      const dayDate = new Date(y, m, d)
      const isToday = todayY === y && todayM === m && todayD === d
      const isPast = dayDate < startOfToday
      const selected = dateIso === iso
      cells.push(
        <button
          key={iso}
          type="button"
          disabled={isPast}
          className={dayCellCls(isPast, isToday, selected)}
          onClick={() => onDateIsoChange(iso)}
        >
          {d}
        </button>,
      )
    }
    return cells
  }, [viewMonth, dateIso, onDateIsoChange])

  const monthTitle = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
  const chosenLabel = dateIso.trim() ? formatBookingDateLabel(dateIso) : ''

  return (
    <div>
      <div className="mb-2 rounded-2xl border border-tle-pink/15 bg-tle-blush/30 px-4 py-3 sm:px-5">
        <p className="font-sans text-[11px] font-bold tracking-[0.12em] text-tle-pink uppercase">Step 1 — Your day</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-tle-ink">
          Use the <span className="font-semibold">arrows</span> to move to the month you want. Then{' '}
          <span className="font-semibold">tap one day</span> on the calendar.
        </p>
      </div>

      <div className={calendarPanelClassName}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="font-sans text-[clamp(1.1rem,3vw,1.35rem)] font-semibold text-tle-ink">{monthTitle}</span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={!canGoPrevMonth}
              className="flex size-[36px] items-center justify-center rounded-full border border-black/10 bg-white text-tle-muted transition-colors hover:border-tle-pink hover:text-tle-pink disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => setViewMonth((d) => addCalendarMonths(d, -1))}
              aria-label="Previous month"
            >
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button
              type="button"
              className="flex size-[36px] items-center justify-center rounded-full border border-black/10 bg-white text-tle-muted transition-colors hover:border-tle-pink hover:text-tle-pink"
              onClick={() => setViewMonth((d) => addCalendarMonths(d, 1))}
              aria-label="Next month"
            >
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-1.5 text-[10px] font-bold tracking-wide text-tle-faint uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">{calendarCells}</div>
      </div>

      {chosenLabel ? (
        <div className="mb-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-[13px] text-emerald-950">
          <span className="font-semibold text-emerald-900">Chosen day: </span>
          {chosenLabel}
        </div>
      ) : (
        <p className="mb-5 text-[13px] leading-relaxed text-tle-muted">
          When you tap a day, it will show here. Past days cannot be selected.
        </p>
      )}

      <div className="mb-2 rounded-2xl border border-tle-pink/15 bg-white px-4 py-3 sm:px-5">
        <p className="font-sans text-[11px] font-bold tracking-[0.12em] text-tle-pink uppercase">Step 2 — Your time</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-tle-ink">
          After your day is set, <span className="font-semibold">tap a time</span> below. Only times that are open for that day of the week are listed.
        </p>
      </div>

      {!dateIso.trim() ? (
        <p className="mb-6 rounded-xl border border-dashed border-black/15 bg-white/60 px-4 py-4 text-center text-[13px] text-tle-muted">
          Pick a day in the calendar first — then the times will appear here.
        </p>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {slots.map((label) => (
            <button
              key={label}
              type="button"
              className={`rounded-xl border-[1.5px] py-3 text-center text-[12.5px] font-semibold transition-all ${
                selectedTime === label
                  ? 'border-tle-charcoal bg-tle-charcoal text-white'
                  : 'border-black/10 bg-white text-tle-muted hover:border-tle-pink hover:text-tle-pink'
              }`}
              onClick={() => onTimeChange(label)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {dateIso.trim() ? (
        <p className="text-[12px] leading-relaxed text-tle-muted">
          Times can be set per exact date (for example a holiday) or by a simple weekly pattern — whatever the studio has
          published in admin.
        </p>
      ) : null}
    </div>
  )
}
