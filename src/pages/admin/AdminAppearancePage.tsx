import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { uploadProductImageFile } from '../../lib/adminProductMedia.ts'
import {
  brandColorsFromRoles,
  DEFAULT_COLOR_ROLES,
  DEFAULT_STORE_APPEARANCE,
  fetchStoreAppearance,
  removeColorSetting,
  rolesEqual,
  rolesFromBrandColors,
  saveStoreAppearance,
  type BrandColorRoles,
  type ExclusiveOfferAppearance,
  type StoreAppearance,
} from '../../lib/storeAppearance.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminConfirmDelete, adminFont } from './adminUi.ts'

type ColorRoleKey = keyof BrandColorRoles

const COLOR_SECTIONS: {
  key: ColorRoleKey
  title: string
  places: string[]
  help: string
}[] = [
  {
    key: 'main',
    title: 'Icons & links',
    places: ['Navbar', 'Icons', 'Links'],
    help: 'Menu highlights, hearts, cart badges, and link color.',
  },
  {
    key: 'dark',
    title: 'Buttons & footer',
    places: ['Buttons', 'Footer'],
    help: 'Shop now, checkout buttons, and the footer background.',
  },
  {
    key: 'accent',
    title: 'Small labels',
    places: ['Labels'],
    help: '“Exclusive offer” and other small gold-style tags.',
  },
]

export function AdminAppearancePage() {
  const { theme } = useAdminTheme()
  const [draft, setDraft] = useState<StoreAppearance>(() => structuredClone(DEFAULT_STORE_APPEARANCE))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  /** Index into colorHistory (oldest → newest). */
  const [historyIndex, setHistoryIndex] = useState(0)
  const [isNewDraft, setIsNewDraft] = useState(false)

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
  const sectionTitle = ad(theme, 'text-base font-bold text-stone-900', 'text-base font-bold text-white')
  const linkBtn =
    'inline-flex items-center gap-1 text-[13px] font-semibold text-emerald-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline dark:text-emerald-400 dark:disabled:text-neutral-500'

  useEffect(() => {
    let on = true
    void (async () => {
      const data = await fetchStoreAppearance()
      if (!on) return
      setDraft(data)
      setHistoryIndex(Math.max(0, data.colorHistory.length - 1))
      setIsNewDraft(false)
      setLoading(false)
    })()
    return () => {
      on = false
    }
  }, [])

  const roles = rolesFromBrandColors(draft.colors)
  const history = draft.colorHistory
  const historyLen = history.length
  const canGoPrevious = isNewDraft ? historyLen > 0 : historyIndex > 0
  /** Disabled on the newest saved setting (and while drafting new colors). */
  const canGoNext = !isNewDraft && historyIndex < historyLen - 1

  const historyLabel = useMemo(() => {
    if (isNewDraft) return 'New colors (not saved yet)'
    if (historyLen <= 1) return 'Current store colors'
    if (historyIndex === historyLen - 1) return `Current · ${historyIndex + 1} of ${historyLen}`
    return `Saved setting · ${historyIndex + 1} of ${historyLen}`
  }, [historyIndex, historyLen, isNewDraft])

  const applyRoles = useCallback((next: BrandColorRoles) => {
    setDraft((d) => ({ ...d, colors: brandColorsFromRoles(next) }))
  }, [])

  const patchOffer = useCallback((patch: Partial<ExclusiveOfferAppearance>) => {
    setDraft((d) => ({ ...d, exclusiveOffer: { ...d.exclusiveOffer, ...patch } }))
  }, [])

  const patchRole = useCallback((key: ColorRoleKey, value: string) => {
    setDraft((d) => {
      const next = { ...rolesFromBrandColors(d.colors), [key]: value }
      return { ...d, colors: brandColorsFromRoles(next) }
    })
  }, [])

  const goPrevious = () => {
    if (!canGoPrevious) return
    if (isNewDraft) {
      const last = history[historyLen - 1]
      if (!last) return
      setIsNewDraft(false)
      setHistoryIndex(historyLen - 1)
      applyRoles(last)
      return
    }
    const nextIndex = historyIndex - 1
    const setting = history[nextIndex]
    if (!setting) return
    setHistoryIndex(nextIndex)
    applyRoles(setting)
  }

  const goNext = () => {
    if (!canGoNext) return
    const nextIndex = historyIndex + 1
    const setting = history[nextIndex]
    if (!setting) return
    setHistoryIndex(nextIndex)
    applyRoles(setting)
  }

  const formNewColors = () => {
    setIsNewDraft(true)
    applyRoles({ ...DEFAULT_COLOR_ROLES })
    toast.success('New color set — change the three colors below, then save')
  }

  const deleteCurrentSet = () => {
    if (!isNewDraft && historyLen <= 1) {
      toast.error('Keep at least one color set')
      return
    }
    if (!adminConfirmDelete(isNewDraft ? 'these new colors' : 'this color set')) return
    if (isNewDraft) {
      const last = history[historyLen - 1]
      if (!last) return
      setIsNewDraft(false)
      setHistoryIndex(historyLen - 1)
      applyRoles(last)
      toast.success('New draft discarded')
      return
    }
    const removedIndex = historyIndex
    const nextHistory = removeColorSetting(history, removedIndex, DEFAULT_COLOR_ROLES)
    const nextIndex = Math.min(removedIndex, nextHistory.length - 1)
    const nextRoles = nextHistory[nextIndex] ?? DEFAULT_COLOR_ROLES
    setDraft((d) => ({
      ...d,
      colorHistory: nextHistory,
      colors: brandColorsFromRoles(nextRoles),
    }))
    setHistoryIndex(Math.max(0, nextIndex))
    setIsNewDraft(false)
    toast.success('Color set removed — save appearance to keep this change')
  }

  const onUploadBanner = async (file: File | null) => {
    if (!file) return
    if (draft.heroBanners.length >= 4) {
      toast.error('Maximum 4 hero banners')
      return
    }
    setUploading(true)
    const res = await uploadProductImageFile(file)
    setUploading(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setDraft((d) => ({ ...d, heroBanners: [...d.heroBanners, res.publicUrl].slice(0, 4) }))
    toast.success('Banner uploaded')
  }

  const removeBanner = (idx: number) => {
    if (!adminConfirmDelete(`banner ${idx + 1}`)) return
    setDraft((d) => {
      const next = d.heroBanners.filter((_, i) => i !== idx)
      return { ...d, heroBanners: next.length ? next : ['/promo-hero.png'] }
    })
  }

  const moveBanner = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      const next = [...d.heroBanners]
      const j = idx + dir
      if (j < 0 || j >= next.length) return d
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return { ...d, heroBanners: next }
    })
  }

  const onSave = async () => {
    setSaving(true)
    const res = await saveStoreAppearance(draft)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    const refreshed = await fetchStoreAppearance()
    setDraft(refreshed)
    setIsNewDraft(false)
    setHistoryIndex(Math.max(0, refreshed.colorHistory.length - 1))
    toast.success('Appearance saved — store and admin colors updated')
  }

  if (loading) {
    return (
      <div className={adminFont()}>
        <p className={muted}>Loading appearance…</p>
      </div>
    )
  }

  const offer = draft.exclusiveOffer
  const categoryLabel = ad(
    theme,
    'text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400',
    'text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500',
  )

  return (
    <div className={['mx-auto max-w-3xl space-y-8', adminFont()].join(' ')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={heading}>Appearance</h1>
          <p className={muted + ' mt-2 max-w-xl text-[14px] leading-relaxed'}>
            Storefront look for customers, and one accent color for the admin panel.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
      </div>

      {/* ——— Storefront ——— */}
      <div className="space-y-2">
        <p className={categoryLabel}>Storefront</p>
        <p className={muted + ' text-[13px]'}>What shoppers see on the website. Does not change the admin panel.</p>
      </div>

      {/* Hero */}
      <section className={panel}>
        <h2 className={sectionTitle}>Hero banners</h2>
        <p className={muted + ' mt-1 text-[13px]'}>
          Photos on the home page. Add 1–4. Two or more scroll automatically.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {draft.heroBanners.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className={ad(theme, 'overflow-hidden rounded-xl border border-stone-200', 'overflow-hidden rounded-xl border border-neutral-700')}
            >
              <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-wrap items-center gap-2 p-2">
                <span className={muted + ' text-[11px] font-semibold'}>Banner {i + 1}</span>
                <button type="button" className="text-[11px] font-semibold text-emerald-700 disabled:opacity-40" onClick={() => moveBanner(i, -1)} disabled={i === 0}>
                  Left
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-emerald-700 disabled:opacity-40"
                  onClick={() => moveBanner(i, 1)}
                  disabled={i === draft.heroBanners.length - 1}
                >
                  Right
                </button>
                <button type="button" className="ml-auto text-[11px] font-semibold text-rose-600" onClick={() => removeBanner(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {draft.heroBanners.length < 4 ? (
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-emerald-400/60 bg-emerald-50/50 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-emerald-800">
            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
            {uploading ? 'Uploading…' : 'Add banner image'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                e.target.value = ''
                void onUploadBanner(f)
              }}
            />
          </label>
        ) : (
          <p className={muted + ' mt-3 text-[12px]'}>Maximum of 4 banners.</p>
        )}
      </section>

      {/* Offer */}
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>Exclusive offer</h2>
            <p className={muted + ' mt-1 text-[13px]'}>Card on the home hero. Turn off to hide it.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
            <input
              type="checkbox"
              checked={offer.enabled}
              onChange={(e) => patchOffer({ enabled: e.target.checked })}
              className="size-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
            />
            Show on home
          </label>
        </div>

        <div className={'mt-5 grid gap-4 ' + (offer.enabled ? '' : 'pointer-events-none opacity-45')}>
          <label>
            <span className={labelCls}>Badge</span>
            <input className={inputCls} value={offer.badge} onChange={(e) => patchOffer({ badge: e.target.value })} />
          </label>
          <label>
            <span className={labelCls}>Headline</span>
            <textarea
              className={inputCls + ' min-h-[72px] resize-y'}
              value={offer.headline}
              onChange={(e) => patchOffer({ headline: e.target.value })}
            />
          </label>
          <label>
            <span className={labelCls}>Subtext</span>
            <textarea
              className={inputCls + ' min-h-[72px] resize-y'}
              value={offer.subtext}
              onChange={(e) => patchOffer({ subtext: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={labelCls}>Button text</span>
              <input className={inputCls} value={offer.buttonText} onChange={(e) => patchOffer({ buttonText: e.target.value })} />
            </label>
            <label>
              <span className={labelCls}>Button icon</span>
              <input
                className={inputCls}
                value={offer.buttonIcon}
                onChange={(e) => patchOffer({ buttonIcon: e.target.value })}
                placeholder="photo_camera"
              />
              <span className={muted + ' mt-1 flex items-center gap-1 text-[11px]'}>
                Preview:
                <span className="material-symbols-outlined text-[18px] text-emerald-700">{offer.buttonIcon || 'photo_camera'}</span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Store colors */}
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>Store colors</h2>
            <p className={muted + ' mt-1 max-w-lg text-[13px] leading-relaxed'}>
              Three colors for the customer site — icons, buttons/footer, and labels.
            </p>
          </div>
          <button type="button" onClick={formNewColors} className={linkBtn}>
            Form new colors
          </button>
        </div>

        {/* History navigator */}
        <div
          className={ad(
            theme,
            'mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3',
            'mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-700 bg-neutral-950/50 px-4 py-3',
          )}
        >
          <button type="button" className={linkBtn} onClick={goPrevious} disabled={!canGoPrevious}>
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            Previous
          </button>
          <div className="min-w-0 text-center">
            <p className={ad(theme, 'text-[13px] font-bold text-stone-900', 'text-[13px] font-bold text-white')}>
              {historyLabel}
            </p>
            <div className="mt-1.5 flex justify-center gap-1.5">
              <span className="size-4 rounded-full border border-black/10" style={{ background: roles.main }} title="Icons & links" />
              <span className="size-4 rounded-full border border-black/10" style={{ background: roles.dark }} title="Buttons & footer" />
              <span className="size-4 rounded-full border border-black/10" style={{ background: roles.accent }} title="Labels" />
            </div>
          </div>
          <button type="button" className={linkBtn} onClick={goNext} disabled={!canGoNext}>
            Next
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-0.5">
          <p className={muted + ' text-[11px]'}>
            Same three colors are never saved twice.
          </p>
          <button
            type="button"
            onClick={deleteCurrentSet}
            disabled={!isNewDraft && historyLen <= 1}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
            {isNewDraft ? 'Discard new colors' : 'Delete this set'}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {COLOR_SECTIONS.map((f) => (
            <div
              key={f.key}
              className={ad(theme, 'rounded-2xl border border-stone-200 p-4', 'rounded-2xl border border-neutral-700 p-4')}
            >
              <h3 className={ad(theme, 'text-[15px] font-bold text-stone-900', 'text-[15px] font-bold text-white')}>
                {f.title}
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.places.map((place) => (
                  <span
                    key={place}
                    className={ad(
                      theme,
                      'rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600',
                      'rounded-md bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-300',
                    )}
                  >
                    {place}
                  </span>
                ))}
              </div>
              <p className={muted + ' mt-2 text-[12px]'}>{f.help}</p>
              <div className="mt-3 flex items-center gap-3">
                <label className="relative shrink-0 cursor-pointer">
                  <span className="block size-12 rounded-xl border border-black/10 shadow-inner" style={{ background: roles[f.key] }} />
                  <input
                    type="color"
                    value={roles[f.key]}
                    onChange={(e) => patchRole(f.key, e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label={f.title}
                  />
                </label>
                <input
                  className={inputCls + ' max-w-[10rem] font-mono'}
                  value={roles[f.key]}
                  onChange={(e) => patchRole(f.key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-black/5 bg-black/[0.02] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Preview</span>
          <span
            className="inline-flex size-9 items-center justify-center rounded-full"
            style={{ background: draft.colors.blush, color: draft.colors.pink }}
          >
            <span className="material-symbols-outlined text-[20px]">favorite</span>
          </span>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ background: draft.colors.charcoal }}
          >
            Button
          </button>
          <span
            className="rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
            style={{ borderColor: draft.colors.gold, color: draft.colors.gold }}
          >
            Label
          </span>
          <span className="text-[12px] font-semibold underline" style={{ color: draft.colors.pink }}>
            Link
          </span>
          {!isNewDraft && history[historyIndex] && !rolesEqual(roles, history[historyIndex]!) ? (
            <span className={muted + ' ml-auto text-[11px]'}>Edited — save to keep</span>
          ) : null}
        </div>
      </section>

      {/* ——— Admin ——— */}
      <div className="space-y-2 pt-2">
        <p className={categoryLabel}>Admin panel</p>
        <p className={muted + ' text-[13px]'}>Only for you in admin. Shoppers never see this color.</p>
      </div>

      <section className={panel}>
        <h2 className={sectionTitle}>Admin color</h2>
        <p className={muted + ' mt-1 max-w-lg text-[13px] leading-relaxed'}>
          One accent for admin buttons, active menu items, and links. Applies after you save.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <label className="relative shrink-0 cursor-pointer">
            <span
              className="block size-14 rounded-2xl border border-black/10 shadow-inner"
              style={{ background: draft.adminAccent }}
            />
            <input
              type="color"
              value={draft.adminAccent}
              onChange={(e) => setDraft((d) => ({ ...d, adminAccent: e.target.value }))}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Admin accent color"
            />
          </label>
          <div className="min-w-0 flex-1">
            <span className={labelCls}>Accent</span>
            <input
              className={inputCls + ' max-w-[10rem] font-mono'}
              value={draft.adminAccent}
              onChange={(e) => setDraft((d) => ({ ...d, adminAccent: e.target.value }))}
            />
            <p className={muted + ' mt-2 text-[12px]'}>Sidebar highlights, Save buttons, and focus rings.</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-black/5 bg-black/[0.02] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Preview</span>
          <button
            type="button"
            className="rounded-xl px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ background: draft.adminAccent }}
          >
            Save
          </button>
          <span className="text-[13px] font-semibold" style={{ color: draft.adminAccent }}>
            Active menu
          </span>
          <span
            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: `${draft.adminAccent}22`,
              color: draft.adminAccent,
            }}
          >
            Badge
          </span>
        </div>
      </section>

      <div className="flex justify-end pb-8">
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-[12px] font-bold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save appearance'}
        </button>
      </div>
    </div>
  )
}

export default AdminAppearancePage
