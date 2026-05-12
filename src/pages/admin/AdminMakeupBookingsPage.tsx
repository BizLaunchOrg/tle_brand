import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  fetchMakeupBookingByIdForAdmin,
  fetchMakeupBookingsForAdmin,
  updateMakeupBookingStatus,
  type MakeupBookingRow,
} from '../../lib/makeupBookings.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

type Tab = 'pending' | 'accepted' | 'rejected'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function sourceLabel(source: string): string {
  if (source === 'landing') return 'Home page'
  if (source === 'makeup') return 'Makeup page'
  return source
}

export function AdminMakeupBookingsPage() {
  const { theme } = useAdminTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<MakeupBookingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('pending')
  const [query, setQuery] = useState('')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [detailRow, setDetailRow] = useState<MakeupBookingRow | null>(null)
  const [copyHint, setCopyHint] = useState<string | null>(null)
  const openedFromQueryRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchMakeupBookingsForAdmin(400)
    setRows(data)
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setActionMsg(null)
    const data = await fetchMakeupBookingsForAdmin(400)
    setRows(data)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openIdRaw = searchParams.get('open')
  useEffect(() => {
    const raw = openIdRaw?.trim()
    if (!raw) {
      openedFromQueryRef.current = null
      return
    }
    if (loading) return
    if (openedFromQueryRef.current === raw) return
    openedFromQueryRef.current = raw

    void (async () => {
      let row = rows.find((r) => r.id === raw) ?? null
      if (!row) row = await fetchMakeupBookingByIdForAdmin(raw)

      setSearchParams(
        (sp) => {
          const next = new URLSearchParams(sp)
          next.delete('open')
          return next
        },
        { replace: true },
      )

      if (!row) {
        setActionMsg('Could not open that booking. It may have been removed or you may not have access.')
        openedFromQueryRef.current = null
        return
      }

      const tabFor: Tab =
        row.status === 'pending' ? 'pending' : row.status === 'accepted' ? 'accepted' : 'rejected'
      setTab(tabFor)
      setDetailRow(row)
      openedFromQueryRef.current = null
    })()
  }, [loading, openIdRaw, rows, setSearchParams])

  useEffect(() => {
    if (!copyHint) return
    const t = window.setTimeout(() => setCopyHint(null), 2000)
    return () => window.clearTimeout(t)
  }, [copyHint])

  const filtered = useMemo(() => {
    const byStatus = rows.filter((r) => r.status === tab)
    const q = query.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter((r) => {
      const hay = [
        r.id,
        r.customer_name,
        r.customer_email,
        r.customer_phone,
        r.service_name,
        r.preferred_date,
        r.preferred_time,
        r.notes,
        r.location_venue,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, tab, query])

  const setStatus = async (id: string, status: 'accepted' | 'rejected') => {
    setActionMsg(null)
    const res = await updateMakeupBookingStatus(id, status)
    if (!res.ok) {
      setActionMsg(res.message)
      return
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    setDetailRow((cur) => (cur && cur.id === id ? { ...cur, status } : cur))
  }

  const onCopy = async (label: string, text: string) => {
    const ok = await copyText(text)
    setCopyHint(ok ? `Copied ${label}` : 'Copy failed — select text manually')
  }

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(
    theme,
    'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl',
    'text-2xl font-bold tracking-tight text-white sm:text-3xl',
  )
  const surface = ad(
    theme,
    'rounded-2xl border border-stone-200/90 bg-white shadow-sm',
    'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm',
  )
  const th = ad(
    theme,
    'border-b border-stone-100 bg-stone-50/95 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 sm:px-4',
    'border-b border-neutral-800 bg-neutral-900/70 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-500 sm:px-4',
  )
  const td = ad(
    theme,
    'border-b border-stone-100/90 px-3 py-3 align-top text-[13px] last:border-b-0 sm:px-4',
    'border-b border-neutral-800/70 px-3 py-3 align-top text-[13px] last:border-b-0 sm:px-4',
  )

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.status === 'pending').length,
      accepted: rows.filter((r) => r.status === 'accepted').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
    }),
    [rows],
  )

  const statCard = (label: string, value: number, tone: 'rose' | 'emerald' | 'stone') => {
    const tones = {
      rose: ad(theme, 'border-rose-100 bg-rose-50/80', 'border-rose-900/30 bg-rose-950/25'),
      emerald: ad(theme, 'border-emerald-100 bg-emerald-50/80', 'border-emerald-900/30 bg-emerald-950/25'),
      stone: ad(theme, 'border-stone-100 bg-stone-50/80', 'border-neutral-700 bg-neutral-900/40'),
    }
    const valCls = {
      rose: ad(theme, 'text-rose-700', 'text-rose-300'),
      emerald: ad(theme, 'text-emerald-700', 'text-emerald-300'),
      stone: ad(theme, 'text-stone-800', 'text-neutral-200'),
    }
    return (
      <div className={'rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ' + tones[tone]}>
        <p className={muted + ' text-[11px] font-bold uppercase tracking-wide'}>{label}</p>
        <p className={'mt-1 text-2xl font-bold tabular-nums sm:text-3xl ' + valCls[tone]}>{value}</p>
      </div>
    )
  }

  const tabBtn = (t: Tab, label: string, count: number) => {
    const on = tab === t
    return (
      <button
        type="button"
        key={t}
        onClick={() => setTab(t)}
        className={
          'rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ' +
          (on
            ? ad(theme, 'bg-emerald-600 text-white shadow-sm', 'bg-emerald-600 text-white shadow-sm')
            : ad(theme, 'bg-stone-100 text-stone-600 hover:bg-stone-200', 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'))
        }
      >
        {label}
        <span className={'ml-1.5 tabular-nums ' + (on ? 'text-white/90' : muted)}>{count}</span>
      </button>
    )
  }

  const detailPanel = (narrow: boolean) => {
    if (!detailRow) {
      return (
        <div
          className={
            'flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center ' +
            ad(theme, 'border-stone-200 bg-stone-50/50', 'border-neutral-700 bg-neutral-900/30')
          }
        >
          <span className="material-symbols-outlined mb-3 text-4xl text-emerald-600/70">touch_app</span>
          <p className={ad(theme, 'text-[15px] font-semibold text-stone-800', 'text-[15px] font-semibold text-neutral-100')}>
            Select a request
          </p>
          <p className={muted + ' mt-2 max-w-xs text-[13px] leading-relaxed'}>
            {narrow
              ? 'Tap a row in the table to see the full form, copy contact details, and accept or reject.'
              : 'Click a row on the left to preview everything here — no extra pop-up on desktop.'}
          </p>
        </div>
      )
    }

    const r = detailRow
    const pending = r.status === 'pending'

    return (
      <div
        className={
          'flex max-h-[min(88vh,760px)] flex-col overflow-hidden rounded-2xl border shadow-lg ' +
          ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900')
        }
      >
        <div
          className={
            'flex shrink-0 flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ' +
            ad(theme, 'border-stone-100 bg-stone-50/80', 'border-neutral-800 bg-neutral-950/50')
          }
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={ad(theme, 'text-lg font-bold text-stone-900', 'text-lg font-bold text-white')}>Request detail</h2>
              <span
                className={
                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                  (r.status === 'pending'
                    ? ad(theme, 'bg-amber-100 text-amber-900', 'bg-amber-950/60 text-amber-200')
                    : r.status === 'accepted'
                      ? ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300')
                      : ad(theme, 'bg-stone-200 text-stone-700', 'bg-neutral-800 text-neutral-400'))
                }
              >
                {r.status}
              </span>
            </div>
            <p className={muted + ' mt-1 font-mono text-[11px]'} title={r.id}>
              Ref {r.id.slice(0, 8).toUpperCase()}…
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void onCopy('reference', r.id)}
              className={ad(
                theme,
                'rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50',
                'rounded-lg border border-neutral-600 bg-neutral-800 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-700',
              )}
            >
              Copy ID
            </button>
            {narrow ? (
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className={ad(
                  theme,
                  'rounded-lg p-1.5 text-stone-500 hover:bg-stone-200/80',
                  'rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800',
                )}
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[22px] leading-none">close</span>
              </button>
            ) : null}
          </div>
        </div>

        {copyHint ? (
          <p
            className={
              'shrink-0 border-b px-4 py-2 text-center text-[12px] font-medium ' +
              ad(theme, 'border-emerald-100 bg-emerald-50 text-emerald-900', 'border-emerald-900/40 bg-emerald-950/40 text-emerald-200')
            }
          >
            {copyHint}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-5">
            <section>
              <h3 className={muted + ' mb-2 text-[10px] font-bold uppercase tracking-wide'}>When they want you</h3>
              <div
                className={
                  'rounded-xl border px-3 py-3 ' + ad(theme, 'border-stone-100 bg-stone-50/60', 'border-neutral-800 bg-neutral-950/40')
                }
              >
                <p className={ad(theme, 'text-[15px] font-semibold text-stone-900', 'text-[15px] font-semibold text-white')}>
                  {r.preferred_date || '—'}
                </p>
                <p className={'mt-1 text-[14px] ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>{r.preferred_time || '—'}</p>
              </div>
            </section>

            <section>
              <h3 className={muted + ' mb-2 text-[10px] font-bold uppercase tracking-wide'}>Service</h3>
              <p className={ad(theme, 'font-semibold text-stone-900', 'font-semibold text-neutral-100')}>{r.service_name}</p>
              <p className={'text-[13px] ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>{r.service_price}</p>
              <p className={muted + ' mt-1 text-[12px]'}>{sourceLabel(r.source)}</p>
            </section>

            <section>
              <h3 className={muted + ' mb-2 text-[10px] font-bold uppercase tracking-wide'}>Client</h3>
              <p className={ad(theme, 'font-semibold text-stone-900', 'font-semibold text-neutral-100')}>{r.customer_name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={`mailto:${encodeURIComponent(r.customer_email)}`}
                  className={
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold no-underline ' +
                    ad(theme, 'bg-emerald-600 text-white hover:bg-emerald-700', 'bg-emerald-600 text-white hover:bg-emerald-500')
                  }
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  Email
                </a>
                <button
                  type="button"
                  onClick={() => void onCopy('email', r.customer_email)}
                  className={ad(
                    theme,
                    'rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-stone-700 hover:bg-stone-50',
                    'rounded-lg border border-neutral-600 bg-neutral-800 px-2.5 py-1.5 text-[12px] font-semibold text-neutral-200 hover:bg-neutral-700',
                  )}
                >
                  Copy email
                </button>
                {r.customer_phone.trim() ? (
                  <>
                    <a
                      href={`tel:${r.customer_phone.replace(/\s/g, '')}`}
                      className={
                        'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold no-underline ' +
                        ad(theme, 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50', 'border-neutral-600 bg-neutral-800 text-neutral-100 hover:bg-neutral-700')
                      }
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      Call
                    </a>
                    <button
                      type="button"
                      onClick={() => void onCopy('phone', r.customer_phone)}
                      className={ad(
                        theme,
                        'rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-stone-700 hover:bg-stone-50',
                        'rounded-lg border border-neutral-600 bg-neutral-800 px-2.5 py-1.5 text-[12px] font-semibold text-neutral-200 hover:bg-neutral-700',
                      )}
                    >
                      Copy phone
                    </button>
                  </>
                ) : null}
              </div>
              <p className={muted + ' mt-2 break-all text-[12px]'}>{r.customer_email}</p>
              {r.customer_phone.trim() ? <p className={muted + ' text-[12px]'}>{r.customer_phone}</p> : null}
            </section>

            <section>
              <h3 className={muted + ' mb-2 text-[10px] font-bold uppercase tracking-wide'}>Logistics &amp; notes</h3>
              <dl className={'space-y-2 text-[13px] ' + ad(theme, 'text-stone-800', 'text-neutral-200')}>
                <div>
                  <dt className={muted + ' text-[10px] font-bold uppercase'}>Venue / address</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{r.location_venue?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt className={muted + ' text-[10px] font-bold uppercase'}>Skin type</dt>
                  <dd className="mt-0.5">{r.skin_type?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt className={muted + ' text-[10px] font-bold uppercase'}>Allergies</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{r.allergies?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt className={muted + ' text-[10px] font-bold uppercase'}>Notes</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{r.notes?.trim() || '—'}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className={muted + ' mb-2 text-[10px] font-bold uppercase tracking-wide'}>Submitted</h3>
              <p className={'text-[13px] ' + ad(theme, 'text-stone-800', 'text-neutral-200')}>
                {new Date(r.created_at).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </section>
          </div>
        </div>

        {pending ? (
          <div
            className={
              'flex shrink-0 flex-wrap gap-2 border-t px-4 py-4 sm:px-5 ' +
              ad(theme, 'border-stone-100 bg-stone-50/90', 'border-neutral-800 bg-neutral-950/60')
            }
          >
            <button
              type="button"
              onClick={() => void setStatus(r.id, 'accepted')}
              className={
                'flex-1 rounded-xl px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-white sm:flex-none ' +
                ad(theme, 'bg-emerald-600 hover:bg-emerald-700', 'bg-emerald-600 hover:bg-emerald-500')
              }
            >
              Accept booking
            </button>
            <button
              type="button"
              onClick={() => void setStatus(r.id, 'rejected')}
              className={
                'flex-1 rounded-xl border px-4 py-3 text-[12px] font-bold uppercase tracking-wide sm:flex-none ' +
                ad(theme, 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50', 'border-neutral-600 bg-neutral-800 text-neutral-100 hover:bg-neutral-700')
              }
            >
              Reject
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={['mx-auto max-w-[1400px] space-y-6', adminFont()].join(' ')}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className={heading}>Makeup requests</h1>
          <p className={muted + ' mt-2 max-w-2xl text-[14px] leading-relaxed'}>
            New submissions land in <strong className="font-semibold text-inherit">New</strong>. Use search to find a client
            or service. Accept or reject from the table or the detail panel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/makeup-hours"
            className={
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-semibold no-underline transition-colors ' +
              ad(
                theme,
                'border-stone-200 bg-white text-stone-800 hover:border-emerald-300 hover:bg-emerald-50/50',
                'border-neutral-600 bg-neutral-800 text-neutral-100 hover:border-emerald-700 hover:bg-neutral-800/80',
              )
            }
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">schedule</span>
            Makeup hours
          </Link>
          <button
            type="button"
            disabled={loading || refreshing}
            onClick={() => void refresh()}
            className={
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-colors disabled:opacity-50 ' +
              ad(theme, 'bg-emerald-600 text-white hover:bg-emerald-700', 'bg-emerald-600 text-white hover:bg-emerald-500')
            }
          >
            <span className={'material-symbols-outlined text-[18px] ' + (refreshing ? 'animate-spin' : '')}>refresh</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {statCard('New', counts.pending, 'rose')}
        {statCard('Accepted', counts.accepted, 'emerald')}
        {statCard('Rejected', counts.rejected, 'stone')}
      </div>

      {actionMsg ? (
        <div
          className={
            'rounded-xl border px-4 py-3 text-[13px] font-medium ' +
            ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200')
          }
        >
          {actionMsg}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabBtn('pending', 'New', counts.pending)}
          {tabBtn('accepted', 'Accepted', counts.accepted)}
          {tabBtn('rejected', 'Rejected', counts.rejected)}
        </div>
        <label className={'block min-w-[200px] max-w-md flex-1 sm:max-w-xs ' + muted}>
          <span className="sr-only">Search</span>
          <span className="relative block">
            <span
              className={
                'material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] ' +
                muted
              }
            >
              search
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone, service…"
              className={
                'w-full rounded-xl border py-2.5 pr-3 pl-10 text-[13px] outline-none transition focus:ring-2 focus:ring-emerald-500/25 ' +
                ad(
                  theme,
                  'border-stone-200 bg-white text-stone-900 placeholder:text-stone-400',
                  'border-neutral-600 bg-neutral-900 text-neutral-100 placeholder:text-neutral-500',
                )
              }
            />
          </span>
        </label>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_min(400px,38vw)] lg:items-start lg:gap-6">
        <div className={surface + ' min-w-0 overflow-x-auto'}>
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr>
                <th className={th}>Submitted</th>
                <th className={th}>Requested slot</th>
                <th className={th}>Service</th>
                <th className={th}>Client</th>
                <th className={th + ' hidden md:table-cell'}>Source</th>
                <th className={th + ' text-right'}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={td + ' py-14 text-center ' + muted}>
                    Loading requests…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={td + ' py-14 text-center ' + muted}>
                    {query.trim() ? 'No results for this search in this tab.' : `No ${tab} requests.`}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const sel = detailRow?.id === r.id
                  return (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      className={
                        (sel
                          ? ad(theme, 'cursor-pointer bg-emerald-50/90 ring-1 ring-inset ring-emerald-200/80', 'cursor-pointer bg-emerald-950/25 ring-1 ring-inset ring-emerald-800/50')
                          : ad(theme, 'cursor-pointer hover:bg-stone-50/90', 'cursor-pointer hover:bg-neutral-900/40')) +
                        ' outline-none transition-colors'
                      }
                      onClick={() => setDetailRow(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setDetailRow(r)
                        }
                      }}
                    >
                      <td className={td + ' whitespace-nowrap tabular-nums ' + muted}>
                        {new Date(r.created_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className={td}>
                        <p className={'font-medium ' + ad(theme, 'text-stone-900', 'text-neutral-100')}>{r.preferred_date || '—'}</p>
                        <p className={muted + ' text-[12px]'}>{r.preferred_time || '—'}</p>
                      </td>
                      <td className={td}>
                        <p className={'font-semibold ' + ad(theme, 'text-stone-900', 'text-neutral-100')}>{r.service_name}</p>
                        <p className={'text-[12px] ' + ad(theme, 'text-emerald-800', 'text-emerald-300')}>{r.service_price}</p>
                      </td>
                      <td className={td}>
                        <p className={'font-medium ' + ad(theme, 'text-stone-900', 'text-neutral-100')}>{r.customer_name}</p>
                        <p className={muted + ' max-w-[200px] truncate text-[12px] sm:max-w-[240px]'} title={r.customer_email}>
                          {r.customer_email}
                        </p>
                      </td>
                      <td className={td + ' hidden md:table-cell ' + muted}>{sourceLabel(r.source)}</td>
                      <td className={td + ' text-right'} onClick={(e) => e.stopPropagation()}>
                        {r.status === 'pending' ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => void setStatus(r.id, 'accepted')}
                              className={
                                'rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ' +
                                ad(theme, 'bg-emerald-600 text-white hover:bg-emerald-700', 'bg-emerald-600 text-white hover:bg-emerald-500')
                              }
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => void setStatus(r.id, 'rejected')}
                              className={
                                'rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ' +
                                ad(theme, 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50', 'border border-neutral-600 bg-neutral-800 text-neutral-200 hover:bg-neutral-700')
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span
                            className={
                              'inline-block rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ' +
                              (r.status === 'accepted'
                                ? ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-300')
                                : ad(theme, 'bg-stone-100 text-stone-600', 'bg-neutral-800 text-neutral-400'))
                            }
                          >
                            {r.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="sticky top-4 mt-6 hidden min-h-0 lg:mt-0 lg:block">{detailPanel(false)}</div>
      </div>

      {detailRow ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center lg:hidden" role="dialog" aria-modal aria-labelledby="makeup-mob-title">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" aria-label="Close" onClick={() => setDetailRow(null)} />
          <div className="relative z-[1] w-full max-w-lg">
            <h2 id="makeup-mob-title" className="sr-only">
              Booking detail
            </h2>
            {detailPanel(true)}
          </div>
        </div>
      ) : null}
    </div>
  )
}
