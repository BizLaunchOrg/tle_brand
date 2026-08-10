import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import type { MakeupMenuCategory, MakeupMenuItem } from '../../data/bookingServices.ts'
import {
  emptyMakeupMenuItem,
  fetchMakeupMenu,
  makeupServices,
  photoshootServices,
  saveMakeupMenu,
  type MakeupMenu,
} from '../../lib/makeupMenu.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminConfirmDelete, adminFont } from './adminUi.ts'

const ICON_HINTS = [
  'storefront',
  'home_pin',
  'favorite',
  'spa',
  'photo_camera',
  'photo_library',
  'collections',
  'face_retouching_natural',
  'camera',
  'auto_awesome',
]

export function AdminMakeupMenuPage() {
  const { theme } = useAdminTheme()
  const [menu, setMenu] = useState<MakeupMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<MakeupMenuCategory>('makeup')
  const [editing, setEditing] = useState<MakeupMenuItem | null>(null)
  const [isNew, setIsNew] = useState(false)
  const editorRef = useRef<HTMLElement | null>(null)

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(theme, 'text-2xl font-bold tracking-tight text-stone-900', 'text-2xl font-bold tracking-tight text-white')
  const panel = ad(
    theme,
    'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6',
    'rounded-2xl border border-neutral-700 bg-neutral-900/50 p-5 shadow-sm sm:p-6',
  )
  const labelCls = muted + ' mb-1.5 block text-[10px] font-bold uppercase tracking-wide'
  const inputCls = ad(
    theme,
    'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-900 outline-none focus:ring-2 focus:ring-emerald-500/25',
    'w-full rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-100 outline-none focus:ring-2 focus:ring-emerald-500/25',
  )
  const link = ad(
    theme,
    'text-[13px] font-semibold text-emerald-700 underline-offset-2 hover:underline',
    'text-[13px] font-semibold text-emerald-400 underline-offset-2 hover:underline',
  )

  useEffect(() => {
    let on = true
    void (async () => {
      const data = await fetchMakeupMenu()
      if (!on) return
      setMenu(data)
      setLoading(false)
    })()
    return () => {
      on = false
    }
  }, [])

  const list = useMemo(() => {
    if (!menu) return []
    return tab === 'makeup' ? makeupServices(menu) : photoshootServices(menu)
  }, [menu, tab])

  const scrollEditorIntoView = () => {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const openNew = () => {
    setIsNew(true)
    setEditing(emptyMakeupMenuItem(tab))
    scrollEditorIntoView()
  }

  const openEdit = (item: MakeupMenuItem) => {
    setIsNew(false)
    setEditing({ ...item })
    scrollEditorIntoView()
  }

  const closeEditor = () => {
    setEditing(null)
    setIsNew(false)
  }

  useEffect(() => {
    if (editing) scrollEditorIntoView()
  }, [editing?.id, isNew])

  const patchEdit = useCallback((patch: Partial<MakeupMenuItem>) => {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const persistItems = async (items: MakeupMenuItem[], successMsg: string) => {
    setSaving(true)
    const res = await saveMakeupMenu({ items })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return false
    }
    const refreshed = await fetchMakeupMenu()
    setMenu(refreshed)
    toast.success(successMsg)
    return true
  }

  const onSaveItem = async () => {
    if (!menu || !editing) return
    if (!editing.name.trim() || !editing.price.trim()) {
      toast.error('Name and price are required.')
      return
    }
    const nextItem: MakeupMenuItem = {
      ...editing,
      name: editing.name.trim(),
      price: editing.price.trim(),
      desc: editing.desc.trim(),
      icon: editing.icon.trim() || (editing.category === 'photoshoot' ? 'photo_camera' : 'spa'),
      duration:
        editing.duration.trim() ||
        (editing.category === 'photoshoot' ? 'Photoshoot' : 'By appointment'),
      category: tab,
    }

    let items: MakeupMenuItem[]
    if (isNew) {
      const others = menu.items.filter((i) => i.category !== tab)
      const inCat = menu.items.filter((i) => i.category === tab)
      items = [...others, ...inCat, { ...nextItem, sortOrder: inCat.length }]
    } else {
      items = menu.items.map((i) => (i.id === nextItem.id ? nextItem : i))
    }

    const ok = await persistItems(items, isNew ? 'Service added' : 'Service updated')
    if (ok) closeEditor()
  }

  const onDelete = async (item: MakeupMenuItem) => {
    if (!menu) return
    if (!adminConfirmDelete(item.name)) return
    const items = menu.items.filter((i) => i.id !== item.id)
    if (!items.length) {
      toast.error('Keep at least one service or package on the menu.')
      return
    }
    if (editing?.id === item.id) closeEditor()
    await persistItems(items, 'Deleted')
  }

  const moveItem = async (item: MakeupMenuItem, dir: -1 | 1) => {
    if (!menu) return
    const inCat = menu.items.filter((i) => i.category === tab)
    const others = menu.items.filter((i) => i.category !== tab)
    const idx = inCat.findIndex((i) => i.id === item.id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= inCat.length) return
    const next = [...inCat]
    ;[next[idx], next[j]] = [next[j]!, next[idx]!]
    await persistItems([...others, ...next], 'Order updated')
  }

  if (loading || !menu) {
    return (
      <div className={adminFont()}>
        <p className={muted}>Loading makeup menu…</p>
      </div>
    )
  }

  return (
    <div className={['mx-auto max-w-3xl space-y-6', adminFont()].join(' ')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={heading}>Makeup menu</h1>
          <p className={muted + ' mt-2 max-w-xl text-[13px] leading-relaxed'}>
            Create, edit, and remove makeup services and photoshoot packages. Changes show on the makeup page and home booking.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/makeup-bookings" className={link + ' no-underline'}>
            Requests
          </Link>
          <Link to="/admin/makeup-hours" className={link + ' no-underline'}>
            Hours
          </Link>
        </div>
      </div>

      <div className={'flex flex-wrap gap-2 rounded-xl border p-1.5 ' + ad(theme, 'border-stone-200 bg-stone-50', 'border-neutral-700 bg-neutral-950/40')}>
        <button
          type="button"
          onClick={() => {
            closeEditor()
            setTab('makeup')
          }}
          className={
            'rounded-lg px-4 py-2 text-[13px] font-bold transition ' +
            (tab === 'makeup'
              ? ad(theme, 'bg-white text-stone-900 shadow-sm', 'bg-neutral-800 text-white shadow-sm')
              : muted)
          }
        >
          Makeup services
        </button>
        <button
          type="button"
          onClick={() => {
            closeEditor()
            setTab('photoshoot')
          }}
          className={
            'rounded-lg px-4 py-2 text-[13px] font-bold transition ' +
            (tab === 'photoshoot'
              ? ad(theme, 'bg-white text-stone-900 shadow-sm', 'bg-neutral-800 text-white shadow-sm')
              : muted)
          }
        >
          Photoshoot packages
        </button>
      </div>

      {editing ? (
        <section ref={editorRef} className={panel + ' ring-2 ring-emerald-500/30'}>
          <div className="flex items-center justify-between gap-3">
            <h2 className={ad(theme, 'text-base font-bold text-stone-900', 'text-base font-bold text-white')}>
              {isNew ? 'New item' : `Editing: ${editing.name || 'item'}`}
            </h2>
            <button type="button" onClick={closeEditor} className={link}>
              Cancel
            </button>
          </div>
          <p className={muted + ' mt-1 text-[13px]'}>Change the fields below, then tap Save changes.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={editing.name} onChange={(e) => patchEdit({ name: e.target.value })} placeholder="e.g. Studio Session" />
            </div>
            <div>
              <label className={labelCls}>Price label</label>
              <input className={inputCls} value={editing.price} onChange={(e) => patchEdit({ price: e.target.value })} placeholder="e.g. ₦35,000" />
            </div>
            <div>
              <label className={labelCls}>Duration / badge</label>
              <input
                className={inputCls}
                value={editing.duration}
                onChange={(e) => patchEdit({ duration: e.target.value })}
                placeholder={tab === 'photoshoot' ? 'Photoshoot' : 'By appointment'}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <textarea
                className={inputCls + ' min-h-[88px] resize-y'}
                value={editing.desc}
                onChange={(e) => patchEdit({ desc: e.target.value })}
                placeholder="Short description for customers"
              />
            </div>
            <div>
              <label className={labelCls}>Icon (Material Symbol)</label>
              <input className={inputCls} value={editing.icon} onChange={(e) => patchEdit({ icon: e.target.value })} list="makeup-menu-icons" />
              <datalist id="makeup-menu-icons">
                {ICON_HINTS.map((ic) => (
                  <option key={ic} value={ic} />
                ))}
              </datalist>
              <p className={muted + ' mt-1.5 flex items-center gap-2 text-[12px]'}>
                Preview
                <span className="material-symbols-outlined text-[20px] text-emerald-600">{editing.icon || 'spa'}</span>
              </p>
            </div>
            <div className="space-y-3 pt-6">
              {tab === 'makeup' ? (
                <>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-stone-300 text-emerald-600"
                      checked={editing.requiresLocation}
                      onChange={(e) => patchEdit({ requiresLocation: e.target.checked })}
                    />
                    Needs customer location / venue
                  </label>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-stone-300 text-emerald-600"
                      checked={editing.highlight}
                      onChange={(e) => patchEdit({ highlight: e.target.checked })}
                    />
                    Show on home Glow-Up highlights
                  </label>
                </>
              ) : (
                <p className={muted + ' text-[13px]'}>Photoshoot packages appear in the featured packages block automatically.</p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeEditor} className={link}>
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSaveItem()}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : isNew ? 'Add item' : 'Save changes'}
            </button>
          </div>
        </section>
      ) : null}

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={ad(theme, 'text-base font-bold text-stone-900', 'text-base font-bold text-white')}>
              {tab === 'makeup' ? 'Makeup services' : 'Photoshoot packages'}
            </h2>
            <p className={muted + ' mt-1 text-[13px]'}>
              {tab === 'makeup'
                ? 'Studio, home, bridal, and any other appointment services.'
                : 'Featured outfit + edited pictures packages.'}
            </p>
            <p className={muted + ' mt-2 text-[12px]'}>
              ↑↓ arrows change the order customers see. Edit opens the form above — then Save changes.
            </p>
          </div>
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-emerald-700"
          >
            Add new
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {list.length === 0 ? (
            <p className={muted + ' py-8 text-center text-[14px]'}>No items in this category yet.</p>
          ) : (
            list.map((item, idx) => (
              <div
                key={item.id}
                className={ad(
                  theme,
                  'flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 sm:flex-row sm:items-center ' +
                    (editing?.id === item.id ? 'border-emerald-400 ring-2 ring-emerald-500/20' : ''),
                  'flex flex-col gap-3 rounded-2xl border border-neutral-700 p-4 sm:flex-row sm:items-center ' +
                    (editing?.id === item.id ? 'border-emerald-500 ring-2 ring-emerald-500/30' : ''),
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="material-symbols-outlined text-[22px]">{item.icon || 'spa'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={ad(theme, 'font-semibold text-stone-900', 'font-semibold text-white')}>{item.name}</p>
                  <p className={muted + ' mt-0.5 text-[12px]'}>{item.duration}</p>
                  <p className={muted + ' mt-1 line-clamp-2 text-[13px]'}>{item.desc || '—'}</p>
                  <p className={'mt-2 font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{item.price}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={saving || idx === 0}
                    onClick={() => void moveItem(item, -1)}
                    title="Move higher on the customer menu"
                    className={
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-bold disabled:opacity-40 ' +
                      ad(theme, 'border-stone-200 text-stone-700 hover:bg-stone-50', 'border-neutral-600 text-neutral-200 hover:bg-neutral-800')
                    }
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={saving || idx >= list.length - 1}
                    onClick={() => void moveItem(item, 1)}
                    title="Move lower on the customer menu"
                    className={
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-bold disabled:opacity-40 ' +
                      ad(theme, 'border-stone-200 text-stone-700 hover:bg-stone-50', 'border-neutral-600 text-neutral-200 hover:bg-neutral-800')
                    }
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className={
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-bold ' +
                      ad(theme, 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100', 'border-emerald-700 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-950/60')
                    }
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(item)}
                    className={
                      'inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-bold text-rose-700 ' +
                      ad(theme, 'border-rose-200 hover:bg-rose-50', 'border-rose-900/40 text-rose-300 hover:bg-rose-950/30')
                    }
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminMakeupMenuPage
