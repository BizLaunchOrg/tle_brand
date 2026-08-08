import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { uploadProductImageFile } from '../../lib/adminProductMedia.ts'
import {
  brandColorsFromRoles,
  DEFAULT_COLOR_ROLES,
  DEFAULT_STORE_APPEARANCE,
  fetchStoreAppearance,
  rolesFromBrandColors,
  saveStoreAppearance,
  type BrandColorRoles,
  type ExclusiveOfferAppearance,
  type StoreAppearance,
} from '../../lib/storeAppearance.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

type ColorRoleKey = keyof BrandColorRoles

const COLOR_ROLES: {
  key: ColorRoleKey
  title: string
  places: string[]
  example: string
}[] = [
  {
    key: 'main',
    title: 'Icons & links',
    places: ['Navbar', 'Icons', 'Links', 'Hovers'],
    example: 'Active menu, heart/cart icons, pink links',
  },
  {
    key: 'dark',
    title: 'Buttons & footer',
    places: ['Buttons', 'Footer'],
    example: 'Shop now, checkout, and the footer bar',
  },
  {
    key: 'accent',
    title: 'Small labels',
    places: ['Labels', 'Highlights'],
    example: '“Exclusive offer”, receipt titles, gold tags',
  },
]

export function AdminAppearancePage() {
  const { theme } = useAdminTheme()
  const [draft, setDraft] = useState<StoreAppearance>(() => structuredClone(DEFAULT_STORE_APPEARANCE))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeRole, setActiveRole] = useState<ColorRoleKey>('main')
  const [usedOpen, setUsedOpen] = useState(false)

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

  useEffect(() => {
    let on = true
    void (async () => {
      const data = await fetchStoreAppearance()
      if (!on) return
      setDraft(data)
      setLoading(false)
    })()
    return () => {
      on = false
    }
  }, [])

  const roles = rolesFromBrandColors(draft.colors)

  const patchOffer = useCallback((patch: Partial<ExclusiveOfferAppearance>) => {
    setDraft((d) => ({ ...d, exclusiveOffer: { ...d.exclusiveOffer, ...patch } }))
  }, [])

  const patchRole = useCallback((key: ColorRoleKey, value: string) => {
    setDraft((d) => {
      const next = { ...rolesFromBrandColors(d.colors), [key]: value }
      return {
        ...d,
        colors: brandColorsFromRoles(next),
      }
    })
  }, [])

  const applyUsedColor = (hex: string) => {
    patchRole(activeRole, hex)
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
    toast.success('Appearance saved — storefront updates instantly')
  }

  const resetColors = () => {
    setDraft((d) => ({
      ...d,
      colors: brandColorsFromRoles(DEFAULT_COLOR_ROLES),
    }))
  }

  if (loading) {
    return (
      <div className={adminFont()}>
        <p className={muted}>Loading appearance…</p>
      </div>
    )
  }

  const offer = draft.exclusiveOffer

  return (
    <div className={['mx-auto max-w-3xl space-y-6', adminFont()].join(' ')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={heading}>Appearance</h1>
          <p className={muted + ' mt-2 max-w-xl text-[14px] leading-relaxed'}>
            Three controls: hero banners, exclusive offer, and brand colors.
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

      {/* 1 — Hero banners */}
      <section className={panel}>
        <h2 className={sectionTitle}>1 · Hero banners</h2>
        <p className={muted + ' mt-1 text-[13px]'}>
          Add 1–4 images. One stays still; two or more scroll on the home page.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {draft.heroBanners.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className={ad(theme, 'overflow-hidden rounded-xl border border-stone-200', 'overflow-hidden rounded-xl border border-neutral-700')}
            >
              <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-wrap items-center gap-2 p-2">
                <span className={muted + ' text-[11px] font-semibold'}>#{i + 1}</span>
                <button type="button" className="text-[11px] font-semibold text-emerald-700" onClick={() => moveBanner(i, -1)} disabled={i === 0}>
                  Left
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-emerald-700"
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
          <p className={muted + ' mt-3 text-[12px]'}>Maximum of 4 banners reached.</p>
        )}
      </section>

      {/* 2 — Exclusive offer */}
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>2 · Exclusive offer</h2>
            <p className={muted + ' mt-1 text-[13px]'}>Overlay on the home hero. Turn off to hide it.</p>
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
              <span className={labelCls}>Button icon (Material Symbol)</span>
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

      {/* 3 — Brand colors */}
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={sectionTitle}>3 · Brand colors</h2>
            <p className={muted + ' mt-1 max-w-lg text-[13px] leading-relaxed'}>
              Pick one color for each part of the site. Soft backgrounds follow your icons & links color.
            </p>
          </div>
          <button type="button" onClick={resetColors} className={muted + ' text-[12px] font-semibold underline-offset-2 hover:underline'}>
            Reset defaults
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {COLOR_ROLES.map((f, index) => {
            const selected = activeRole === f.key
            return (
              <div
                key={f.key}
                className={[
                  'rounded-2xl border p-4 transition',
                  selected
                    ? ad(theme, 'border-emerald-500/70 bg-emerald-50/40', 'border-emerald-500/70 bg-emerald-950/30')
                    : ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-950/30'),
                ].join(' ')}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <span
                    className={ad(
                      theme,
                      'mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[11px] font-bold text-stone-600',
                      'mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-[11px] font-bold text-neutral-300',
                    )}
                  >
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
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
                    <p className={muted + ' mt-2 text-[12px]'}>{f.example}</p>

                    <div className="mt-3 flex items-center gap-3">
                      <label className="relative shrink-0 cursor-pointer">
                        <span
                          className="block size-12 rounded-xl border border-black/10 shadow-inner"
                          style={{ background: roles[f.key] }}
                        />
                        <input
                          type="color"
                          value={roles[f.key]}
                          onChange={(e) => {
                            setActiveRole(f.key)
                            patchRole(f.key, e.target.value)
                          }}
                          className="absolute inset-0 cursor-pointer opacity-0"
                          aria-label={f.title}
                        />
                      </label>
                      <input
                        className={inputCls + ' max-w-[10rem] font-mono'}
                        value={roles[f.key]}
                        onFocus={() => setActiveRole(f.key)}
                        onChange={(e) => {
                          setActiveRole(f.key)
                          patchRole(f.key, e.target.value)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Used colors — collapsed by default */}
        <div
          className={ad(
            theme,
            'mt-5 overflow-hidden rounded-2xl border border-stone-200',
            'mt-5 overflow-hidden rounded-2xl border border-neutral-700',
          )}
        >
          <button
            type="button"
            onClick={() => setUsedOpen((o) => !o)}
            className={ad(
              theme,
              'flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50',
              'flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-900/60',
            )}
            aria-expanded={usedOpen}
          >
            <div>
              <p className={ad(theme, 'text-[13px] font-bold text-stone-900', 'text-[13px] font-bold text-white')}>
                Previously used colors
              </p>
              <p className={muted + ' mt-0.5 text-[12px]'}>
                Saved store colors — tap one to reuse on “{COLOR_ROLES.find((r) => r.key === activeRole)?.title}”
              </p>
            </div>
            <span className="material-symbols-outlined shrink-0 text-[22px] text-stone-400">
              {usedOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {usedOpen ? (
            <div className={ad(theme, 'border-t border-stone-200 px-4 py-3', 'border-t border-neutral-700 px-4 py-3')}>
              <div className="flex flex-wrap gap-2">
                {draft.usedColors.map((hex) => {
                  const isActive = roles[activeRole] === hex
                  return (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      onClick={() => applyUsedColor(hex)}
                      className={[
                        'size-9 rounded-full border-2 transition',
                        isActive
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-white shadow ring-1 ring-black/10',
                      ].join(' ')}
                      style={{ background: hex }}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-black/5 bg-black/[0.02] p-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Looks like</span>
          <span
            className="inline-flex size-9 items-center justify-center rounded-full"
            style={{ background: draft.colors.blush, color: draft.colors.pink }}
            title="Icon"
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
