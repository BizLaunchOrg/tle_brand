import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CANONICAL_MAKEUP_TIME_LABELS,
  calendarDayMap,
  deleteAvailabilityCalendarDay,
  fetchAdminAvailabilityCalendar,
  fetchAdminAvailabilityRules,
  formatWeekdays,
  insertAvailabilityRule,
  deleteAvailabilityRule,
  setAvailabilityRuleActive,
  upsertAvailabilityCalendarDay,
  type MakeupAvailabilityRuleRow,
  type MakeupCalendarDay,
} from '../../lib/makeupAvailability.ts'
import { formatBookingDateLabel, isoFromCalendarDay } from '../../lib/makeupBookingDates.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

const WD = [
  { v: 0, l: 'Sun' },
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
] as const

function addMonthsAnchor(monthAnchor: Date, delta: number): Date {
  const x = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
  x.setMonth(x.getMonth() + delta)
  return x
}

function monthLoadRange(viewMonth: Date): { from: string; to: string } {
  const fromD = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
  const toD = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 2, 0)
  return {
    from: isoFromCalendarDay(fromD.getFullYear(), fromD.getMonth(), fromD.getDate()),
    to: isoFromCalendarDay(toD.getFullYear(), toD.getMonth(), toD.getDate()),
  }
}

export function AdminMakeupAvailabilityEditor() {
  const { theme } = useAdminTheme()
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [calendarDays, setCalendarDays] = useState<MakeupCalendarDay[]>([])
  const [rules, setRules] = useState<MakeupAvailabilityRuleRow[]>([])
  const [rulesLoading, setRulesLoading] = useState(true)
  const [selectedIso, setSelectedIso] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<'inherit' | 'closed' | 'custom'>('inherit')
  const [draftSlots, setDraftSlots] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [weeklyDraftDays, setWeeklyDraftDays] = useState<Set<number>>(new Set())
  const [weeklyDraftTime, setWeeklyDraftTime] = useState<string>(CANONICAL_MAKEUP_TIME_LABELS[1])

  const calMap = useMemo(() => calendarDayMap(calendarDays), [calendarDays])

  const reloadCalendar = useCallback(async () => {
    const { from, to } = monthLoadRange(viewMonth)
    setCalendarDays(await fetchAdminAvailabilityCalendar(from, to))
  }, [viewMonth])

  useEffect(() => {
    void fetchAdminAvailabilityRules().then((r) => {
      setRules(r)
      setRulesLoading(false)
    })
  }, [])

  useEffect(() => {
    if (rulesLoading) return
    void reloadCalendar()
  }, [viewMonth, rulesLoading, reloadCalendar])

  useEffect(() => {
    if (!selectedIso) return
    const row = calMap.get(selectedIso)
    if (!row) {
      setPanelMode('inherit')
      setDraftSlots(new Set())
      return
    }
    if (row.closed) {
      setPanelMode('closed')
      setDraftSlots(new Set())
      return
    }
    if (row.time_slots.length > 0) {
      setPanelMode('custom')
      setDraftSlots(new Set(row.time_slots))
      return
    }
    setPanelMode('inherit')
    setDraftSlots(new Set())
  }, [selectedIso, calMap])

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const surface = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm sm:p-6',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 p-5 shadow-sm sm:p-6',
  )

  const toggleWeeklyDay = (v: number) => {
    setWeeklyDraftDays((prev) => {
      const n = new Set(prev)
      if (n.has(v)) n.delete(v)
      else n.add(v)
      return n
    })
  }

  const onAddWeeklyRule = async () => {
    setMsg(null)
    const res = await insertAvailabilityRule([...weeklyDraftDays], weeklyDraftTime)
    if (res.ok === false) {
      setMsg({ type: 'err', text: res.message })
      return
    }
    setMsg({ type: 'ok', text: 'Weekly rule saved.' })
    setRules(await fetchAdminAvailabilityRules())
  }

  const onDeleteWeekly = async (id: string) => {
    setMsg(null)
    const res = await deleteAvailabilityRule(id)
    if (res.ok === false) {
      setMsg({ type: 'err', text: res.message })
      return
    }
    setRules(await fetchAdminAvailabilityRules())
  }

  const onToggleWeeklyActive = async (id: string, nextActive: boolean) => {
    setMsg(null)
    const res = await setAvailabilityRuleActive(id, nextActive)
    if (res.ok === false) {
      setMsg({ type: 'err', text: res.message })
      return
    }
    setRules(await fetchAdminAvailabilityRules())
  }

  const onSaveDay = async () => {
    if (!selectedIso) return
    setMsg(null)
    setSaving(true)
    try {
      if (panelMode === 'inherit') {
        const res = await deleteAvailabilityCalendarDay(selectedIso)
        if (res.ok === false) {
          setMsg({ type: 'err', text: res.message })
          return
        }
        setMsg({ type: 'ok', text: 'This date now follows your weekly pattern (or all hours if you have no pattern).' })
      } else if (panelMode === 'closed') {
        const res = await upsertAvailabilityCalendarDay(selectedIso, 'closed', [])
        if (res.ok === false) {
          setMsg({ type: 'err', text: res.message })
          return
        }
        setMsg({ type: 'ok', text: 'Clients cannot book on this date.' })
      } else {
        const res = await upsertAvailabilityCalendarDay(selectedIso, 'custom', [...draftSlots])
        if (res.ok === false) {
          setMsg({ type: 'err', text: res.message })
          return
        }
        setMsg({ type: 'ok', text: 'Saved the hours for this date.' })
      }
      await reloadCalendar()
    } finally {
      setSaving(false)
    }
  }

  const toggleDraftSlot = (t: string) => {
    setDraftSlots((prev) => {
      const n = new Set(prev)
      if (n.has(t)) n.delete(t)
      else n.add(t)
      return n
    })
  }

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
      cells.push(<div key={`e-${i}`} className="h-[44px]" />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = isoFromCalendarDay(y, m, d)
      const dayDate = new Date(y, m, d)
      const isToday = todayY === y && todayM === m && todayD === d
      const isPast = dayDate < startOfToday
      const row = calMap.get(iso)
      let kind: 'none' | 'closed' | 'custom' = 'none'
      if (row?.closed) kind = 'closed'
      else if (row && row.time_slots.length > 0) kind = 'custom'
      const selected = selectedIso === iso
      const ring =
        kind === 'closed'
          ? 'ring-2 ring-rose-400/90'
          : kind === 'custom'
            ? 'ring-2 ring-emerald-500/80'
            : ''
      const base =
        'relative flex h-[44px] w-full flex-col items-center justify-center rounded-full text-[13px] font-semibold transition-all'
      const cls = isPast
        ? base + ' cursor-not-allowed text-stone-300 dark:text-neutral-600'
        : selected
          ? `${base} ${ring} bg-emerald-600 text-white shadow-md`
          : kind === 'closed'
            ? `${base} ${ring} cursor-pointer bg-rose-50 text-rose-900 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-100`
            : kind === 'custom'
              ? `${base} ${ring} cursor-pointer bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-100`
              : isToday
                ? `${base} cursor-pointer bg-stone-100 text-stone-900 ring-1 ring-stone-300 hover:bg-stone-200 dark:bg-neutral-800 dark:text-neutral-100 dark:ring-neutral-600`
                : `${base} cursor-pointer text-stone-800 hover:bg-stone-100 dark:text-neutral-100 dark:hover:bg-neutral-800`

      cells.push(
        <button
          key={iso}
          type="button"
          disabled={isPast}
          className={cls}
          onClick={() => !isPast && setSelectedIso(iso)}
        >
          {d}
          {!isPast && kind !== 'none' ? (
            <span
              className={
                'absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full ' +
                (kind === 'closed' ? 'bg-rose-500' : 'bg-emerald-500')
              }
              aria-hidden
            />
          ) : null}
        </button>,
      )
    }
    return cells
  }, [viewMonth, calMap, selectedIso])

  if (rulesLoading) {
    return (
      <div className={adminFont() + ' flex min-h-[30vh] items-center justify-center ' + muted}>
        <p className="text-[13px]">Loading…</p>
      </div>
    )
  }

  const monthTitle = viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className={['space-y-8', adminFont()].join(' ')}>
      <div>
        <h2 className={ad(theme, 'text-lg font-bold text-stone-900', 'text-lg font-bold text-white')}>
          Set hours by calendar (recommended)
        </h2>
        <p className={muted + ' mt-2 max-w-3xl text-[14px] leading-relaxed'}>
          <strong className="font-semibold text-inherit">Step 1:</strong> use the arrows to choose a month.{' '}
          <strong className="font-semibold text-inherit">Step 2:</strong> tap a future day.{' '}
          <strong className="font-semibold text-inherit">Step 3:</strong> choose whether that day is off, uses your weekly
          pattern, or has its own start times — then save.
        </p>
        <ul className={muted + ' mt-3 list-inside list-disc space-y-1 text-[13px]'}>
          <li>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-emerald-500" /> Green ring = you picked exact hours for that
              date.
            </span>
          </li>
          <li>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full bg-rose-500" /> Red = day off (no bookings).
            </span>
          </li>
          <li>Plain = follows the optional weekly rules below (or every hour if you have not set those either).</li>
        </ul>
      </div>

      {msg ? (
        <div
          className={
            'rounded-xl border px-4 py-3 text-[13px] font-medium ' +
            (msg.type === 'ok'
              ? ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/40 bg-emerald-950/30 text-emerald-200')
              : ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200'))
          }
        >
          {msg.text}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(340px,38vw)]">
        <div className={surface}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className={ad(theme, 'text-[17px] font-bold text-stone-900', 'text-[17px] font-bold text-white')}>{monthTitle}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMonth((d) => addMonthsAnchor(d, -1))}
                className={ad(
                  theme,
                  'flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:border-emerald-400',
                  'flex size-9 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-emerald-500',
                )}
                aria-label="Previous month"
              >
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMonth((d) => addMonthsAnchor(d, 1))}
                className={ad(
                  theme,
                  'flex size-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:border-emerald-400',
                  'flex size-9 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-emerald-500',
                )}
                aria-label="Next month"
              >
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-7 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className={muted + ' py-2 text-[10px] font-bold uppercase tracking-wide'}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">{calendarCells}</div>
        </div>

        <div className={surface}>
          {!selectedIso ? (
            <p className={muted + ' text-[14px] leading-relaxed'}>Tap a date on the calendar to set or clear hours for that day.</p>
          ) : (
            <>
              <p className={muted + ' text-[11px] font-bold uppercase tracking-wide'}>Selected date</p>
              <p className={ad(theme, 'mt-1 text-lg font-bold text-stone-900', 'mt-1 text-lg font-bold text-white')}>
                {formatBookingDateLabel(selectedIso)}
              </p>

              <fieldset className="mt-5 space-y-3">
                <legend className={muted + ' mb-2 text-[11px] font-bold uppercase tracking-wide'}>How should this day work?</legend>
                <label
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ' +
                    ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-900/40')
                  }
                >
                  <input
                    type="radio"
                    name="daymode"
                    className="mt-1"
                    checked={panelMode === 'inherit'}
                    onChange={() => setPanelMode('inherit')}
                  />
                  <span>
                    <span className={ad(theme, 'block text-[13px] font-semibold text-stone-900', 'block text-[13px] font-semibold text-white')}>
                      Same as my weekly pattern
                    </span>
                    <span className={muted + ' mt-0.5 block text-[12px] leading-relaxed'}>
                      Removes a special rule for this date. Clients see whatever you set under &quot;Weekly repeat&quot; for
                      that weekday — or every hour if you have no weekly rules.
                    </span>
                  </span>
                </label>
                <label
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ' +
                    ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-900/40')
                  }
                >
                  <input
                    type="radio"
                    name="daymode"
                    className="mt-1"
                    checked={panelMode === 'closed'}
                    onChange={() => setPanelMode('closed')}
                  />
                  <span>
                    <span className={ad(theme, 'block text-[13px] font-semibold text-stone-900', 'block text-[13px] font-semibold text-white')}>
                      Day off — no bookings
                    </span>
                    <span className={muted + ' mt-0.5 block text-[12px] leading-relaxed'}>
                      Clients can still pick this date on the website, but they will not see any time slots.
                    </span>
                  </span>
                </label>
                <label
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 ' +
                    ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-900/40')
                  }
                >
                  <input
                    type="radio"
                    name="daymode"
                    className="mt-1"
                    checked={panelMode === 'custom'}
                    onChange={() => setPanelMode('custom')}
                  />
                  <span>
                    <span className={ad(theme, 'block text-[13px] font-semibold text-stone-900', 'block text-[13px] font-semibold text-white')}>
                      Choose exact start times for this date only
                    </span>
                    <span className={muted + ' mt-0.5 block text-[12px] leading-relaxed'}>
                      Tap the hours below, then save. Only those times appear after the client picks this day.
                    </span>
                  </span>
                </label>
              </fieldset>

              {panelMode === 'custom' ? (
                <div className="mt-4">
                  <p className={muted + ' mb-2 text-[11px] font-bold uppercase tracking-wide'}>Times open on this date</p>
                  <div className="flex flex-wrap gap-2">
                    {CANONICAL_MAKEUP_TIME_LABELS.map((t) => {
                      const on = draftSlots.has(t)
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleDraftSlot(t)}
                          className={
                            'rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ' +
                            (on
                              ? ad(theme, 'border-emerald-600 bg-emerald-600 text-white', 'border-emerald-500 bg-emerald-600 text-white')
                              : ad(theme, 'border-stone-200 bg-white text-stone-700 hover:border-emerald-300', 'border-neutral-600 bg-neutral-800 text-neutral-200 hover:border-emerald-500'))
                          }
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={saving}
                onClick={() => void onSaveDay()}
                className={
                  'mt-6 w-full rounded-xl py-3 text-[13px] font-bold uppercase tracking-wide text-white disabled:opacity-50 ' +
                  ad(theme, 'bg-emerald-600 hover:bg-emerald-700', 'bg-emerald-600 hover:bg-emerald-500')
                }
              >
                {saving ? 'Saving…' : 'Save this date'}
              </button>
            </>
          )}
        </div>
      </div>

      <details className={surface + ' group'}>
        <summary
          className={
            'cursor-pointer list-none text-[14px] font-bold ' +
            ad(theme, 'text-stone-900', 'text-white') +
            ' [&::-webkit-details-marker]:hidden'
          }
        >
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] transition-transform group-open:rotate-90">chevron_right</span>
            Optional: weekly repeat (same times every Monday, etc.)
          </span>
        </summary>
        <p className={muted + ' mt-3 max-w-3xl text-[13px] leading-relaxed'}>
          Use this if many days share the same pattern. It does <em>not</em> pick specific calendar dates — for a one-off
          change (public holiday, late start), use the calendar above instead.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {WD.map((d) => {
            const on = weeklyDraftDays.has(d.v)
            return (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleWeeklyDay(d.v)}
                className={
                  'rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ' +
                  (on
                    ? ad(theme, 'border-emerald-500 bg-emerald-50 text-emerald-900', 'border-emerald-500 bg-emerald-950/40 text-emerald-200')
                    : ad(theme, 'border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300', 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-600'))
                }
              >
                {d.l}
              </button>
            )
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className={'flex flex-col gap-1 ' + muted}>
            <span className="text-[11px] font-bold uppercase tracking-wide">Time</span>
            <select
              value={weeklyDraftTime}
              onChange={(e) => setWeeklyDraftTime(e.target.value)}
              className={ad(
                theme,
                'rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-stone-900 outline-none focus:border-emerald-500',
                'rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-[13px] font-semibold text-neutral-100 outline-none focus:border-emerald-500',
              )}
            >
              {CANONICAL_MAKEUP_TIME_LABELS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void onAddWeeklyRule()}
            className={
              'rounded-xl px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white ' +
              ad(theme, 'bg-emerald-600 hover:bg-emerald-700', 'bg-emerald-600 hover:bg-emerald-500')
            }
          >
            Add weekly rule
          </button>
        </div>

        <div className="mt-6 border-t border-stone-100 pt-4 dark:border-neutral-800">
          <p className={muted + ' text-[11px] font-bold uppercase tracking-wide'}>Current weekly rules</p>
          {rules.length === 0 ? (
            <p className={muted + ' mt-2 text-[13px]'}>None — the site falls back to every hour unless you set calendar days above.</p>
          ) : (
            <ul className={'mt-3 divide-y ' + ad(theme, 'divide-stone-100', 'divide-neutral-800')}>
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                  <div>
                    <p className={ad(theme, 'text-[15px] font-bold tabular-nums text-stone-900', 'text-[15px] font-bold tabular-nums text-white')}>
                      {r.time_slot}
                    </p>
                    <p className={muted + ' mt-0.5 text-[12px]'}>{formatWeekdays(r.weekdays)}</p>
                    {!r.active ? (
                      <p
                        className={
                          'mt-1 text-[11px] font-semibold uppercase tracking-wide ' +
                          ad(theme, 'text-amber-700', 'text-amber-400')
                        }
                      >
                        Hidden from customers
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void onToggleWeeklyActive(r.id, !r.active)}
                      className={
                        'rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ' +
                        ad(theme, 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50', 'border border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700')
                      }
                    >
                      {r.active ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteWeekly(r.id)}
                      className={
                        'rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ' +
                        ad(theme, 'bg-rose-600 text-white hover:bg-rose-700', 'bg-rose-600 text-white hover:bg-rose-500')
                      }
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  )
}
