import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Product, ProductColorOption, ProductGender } from '../../data/products.ts'
import {
  deleteCatalogProduct,
  fetchCatalogProducts,
  insertCatalogProduct,
  updateCatalogProduct,
  type CatalogProductRow,
} from '../../lib/adminCatalog.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminFont } from './adminUi.ts'

type ColorDraft = { id: string; label: string; swatch: string; price: string; imagesText: string }

function emptyProduct(): Product {
  return {
    slug: '',
    gender: 'her',
    img: '',
    alt: '',
    badge: '',
    name: '',
    cat: '',
    price: '',
    description: '',
  }
}

function colorsFromProduct(p: Product): ColorDraft[] {
  if (!p.colorOptions?.length) return []
  return p.colorOptions.map((c) => ({
    id: c.id,
    label: c.label,
    swatch: c.swatch,
    price: c.price ?? '',
    imagesText: (c.images ?? []).join('\n'),
  }))
}

function productFromDraft(
  core: Product,
  galleryText: string,
  tagsText: string,
  colors: ColorDraft[],
): Product {
  const gallery = galleryText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const tags = tagsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const colorOptions: ProductColorOption[] = []
  for (const c of colors) {
    if (!c.id.trim() || !c.label.trim() || !c.swatch.trim()) continue
    const opt: ProductColorOption = {
      id: c.id.trim(),
      label: c.label.trim(),
      swatch: c.swatch.trim(),
    }
    const imgs = c.imagesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (imgs.length) opt.images = imgs
    if (c.price.trim()) opt.price = c.price.trim()
    colorOptions.push(opt)
  }

  const p: Product = {
    ...core,
    slug: core.slug.trim().replace(/\s+/g, '-'),
    gallery: gallery.length ? gallery : undefined,
    tags: tags.length ? tags : undefined,
    colorOptions: colorOptions.length ? colorOptions : undefined,
  }
  if (!p.promo?.trim()) delete (p as { promo?: string }).promo
  return p
}

const fieldBox = (theme: 'light' | 'dark') =>
  ad(
    theme,
    'mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
    'mt-1 w-full rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25',
  )

export function AdminProductsPage() {
  const { theme } = useAdminTheme()
  const [rows, setRows] = useState<CatalogProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Product>(() => emptyProduct())
  const [galleryText, setGalleryText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [colorDrafts, setColorDrafts] = useState<ColorDraft[]>([])
  const [jsonExtra, setJsonExtra] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setRows(await fetchCatalogProducts())
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const startNew = () => {
    setEditingId(null)
    setDraft(emptyProduct())
    setGalleryText('')
    setTagsText('')
    setColorDrafts([])
    setJsonExtra('')
    setMsg(null)
  }

  const startEdit = (row: CatalogProductRow) => {
    setEditingId(row.id)
    const p = row.payload
    setDraft({ ...emptyProduct(), ...p })
    setGalleryText((p.gallery ?? []).join('\n'))
    setTagsText((p.tags ?? []).join(', '))
    setColorDrafts(colorsFromProduct(p))
    setJsonExtra('')
    setMsg(null)
  }

  const mergedProduct = useMemo(() => {
    let p = productFromDraft(draft, galleryText, tagsText, colorDrafts)
    if (jsonExtra.trim()) {
      try {
        const parsed = JSON.parse(jsonExtra) as Record<string, unknown>
        p = { ...p, ...parsed } as Product
      } catch {
        return p
      }
    }
    return p
  }, [draft, galleryText, tagsText, colorDrafts, jsonExtra])

  const onSave = async () => {
    setMsg(null)
    let p = productFromDraft(draft, galleryText, tagsText, colorDrafts)
    if (jsonExtra.trim()) {
      try {
        const parsed = JSON.parse(jsonExtra) as Record<string, unknown>
        p = { ...p, ...parsed } as Product
      } catch {
        setMsg({ type: 'err', text: 'That extra data is not valid JSON. Remove it or fix the format.' })
        return
      }
    }
    if (!p.slug.trim() || !p.name.trim() || !p.img.trim() || !p.price.trim()) {
      setMsg({ type: 'err', text: 'Please add the link name, title, main photo link, and price.' })
      return
    }

    setSaving(true)
    if (editingId) {
      const res = await updateCatalogProduct(editingId, p)
      setSaving(false)
      if (!res.ok) setMsg({ type: 'err', text: res.message })
      else {
        setMsg({ type: 'ok', text: 'Product updated.' })
        await load()
      }
    } else {
      const res = await insertCatalogProduct(p)
      setSaving(false)
      if (!res.ok) setMsg({ type: 'err', text: res.message })
      else {
        setMsg({ type: 'ok', text: 'Product created.' })
        await load()
        startNew()
      }
    }
  }

  const onDelete = async (row: CatalogProductRow) => {
    if (!window.confirm(`Delete “${row.payload.name || row.slug}” from catalog?`)) return
    const ok = await deleteCatalogProduct(row.id)
    if (!ok) setMsg({ type: 'err', text: 'Could not delete.' })
    else {
      setMsg({ type: 'ok', text: 'Deleted.' })
      if (editingId === row.id) startNew()
      await load()
    }
  }

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const card = ad(theme, 'rounded-2xl border border-stone-200/90 bg-white shadow-sm', 'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm')
  const label = ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500')

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[40vh] items-center justify-center ' + muted}>
        Loading catalog…
      </div>
    )
  }

  return (
    <div className={adminFont() + ' mx-auto max-w-6xl pb-10'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className={ad(theme, 'text-2xl font-bold tracking-tight text-stone-900', 'text-2xl font-bold tracking-tight text-white')}>Products</h1>
          <p className={muted + ' mt-1 max-w-2xl text-[14px] leading-relaxed'}>
            Add what shoppers see on the site: photos, name, price, category, colours, and the story under the product. Use the optional box at the bottom only if you need to paste extra details in one go.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className={
            'shrink-0 rounded-2xl px-4 py-2.5 text-[13px] font-bold ' +
            ad(theme, 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20', 'bg-emerald-600 text-white')
          }
        >
          New product
        </button>
      </div>

      {msg ? (
        <div
          className={
            'mt-4 rounded-2xl border px-4 py-3 text-[13px] font-medium ' +
            (msg.type === 'ok'
              ? ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
              : ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200'))
          }
        >
          {msg.text}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className={'min-h-[280px] overflow-hidden ' + card}>
          <div className={'border-b px-4 py-3 ' + ad(theme, 'border-stone-100 bg-stone-50/90', 'border-neutral-800 bg-neutral-950/50')}>
            <p className={label}>Catalog ({rows.length})</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {rows.length === 0 ? (
              <p className={'p-6 text-center text-[14px] ' + muted}>No products yet. Tap &quot;New product&quot; to add your first one.</p>
            ) : (
              <ul className="space-y-1">
                {rows.map((row) => {
                  const p = row.payload
                  const active = editingId === row.id
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className={
                          'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ' +
                          (active
                            ? ad(theme, 'bg-emerald-50 ring-1 ring-emerald-200', 'bg-emerald-950/30 ring-1 ring-emerald-800')
                            : ad(theme, 'hover:bg-stone-50', 'hover:bg-neutral-800/50'))
                        }
                      >
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-stone-100">
                          {p.img ? <img src={p.img} alt="" className="size-full object-cover" loading="lazy" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={'block truncate text-[13px] font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{p.name || row.slug}</span>
                          <span className={'block truncate font-mono text-[11px] ' + muted}>{row.slug}</span>
                          <span className={'block truncate text-[11px] ' + muted}>{p.cat || '—'}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={'space-y-4 ' + card + ' p-4 sm:p-5'}>
          <p className={label}>{editingId ? 'Edit product' : 'New product'}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label}>Product link name</label>
              <input className={fieldBox(theme)} value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="e.g. rose-gold-hoops" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Name</label>
              <input className={fieldBox(theme)} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Category</label>
              <input className={fieldBox(theme)} value={draft.cat} onChange={(e) => setDraft((d) => ({ ...d, cat: e.target.value }))} placeholder="Earrings, Skincare…" />
            </div>
            <div>
              <label className={label}>Gender</label>
              <select
                className={fieldBox(theme)}
                value={draft.gender}
                onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value as ProductGender }))}
              >
                <option value="her">her</option>
                <option value="him">him</option>
              </select>
            </div>
            <div>
              <label className={label}>Price</label>
              <input className={fieldBox(theme)} value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} placeholder="₦12,000" />
            </div>
            <div>
              <label className={label}>Promo (optional)</label>
              <input className={fieldBox(theme)} value={draft.promo ?? ''} onChange={(e) => setDraft((d) => ({ ...d, promo: e.target.value || undefined }))} />
            </div>
            <div>
              <label className={label}>Badge</label>
              <input className={fieldBox(theme)} value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} />
            </div>
            <div>
              <label className={label}>Main image URL</label>
              <input className={fieldBox(theme)} value={draft.img} onChange={(e) => setDraft((d) => ({ ...d, img: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Alt text</label>
              <input className={fieldBox(theme)} value={draft.alt} onChange={(e) => setDraft((d) => ({ ...d, alt: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Description</label>
              <p className={muted + ' mt-0.5 text-[11px]'}>You can use simple formatting; line breaks and styling from your notes are fine.</p>
              <textarea
                className={fieldBox(theme) + ' mt-1 min-h-[120px] resize-y text-[13px]'}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Gallery image URLs (one per line)</label>
              <textarea className={fieldBox(theme) + ' min-h-[72px] resize-y font-mono text-[12px]'} value={galleryText} onChange={(e) => setGalleryText(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Tags (comma-separated)</label>
              <input className={fieldBox(theme)} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="NEW, GOLD, GIFT" />
            </div>
          </div>

          <div className={'rounded-xl border p-3 ' + ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-950/40')}>
            <div className="flex items-center justify-between gap-2">
              <p className={label}>Colours &amp; finishes</p>
              <button
                type="button"
                onClick={() =>
                  setColorDrafts((c) => [...c, { id: `opt-${c.length + 1}`, label: '', swatch: '#ccc', price: '', imagesText: '' }])
                }
                className={'text-[12px] font-bold ' + ad(theme, 'text-emerald-700 hover:underline', 'text-emerald-400 hover:underline')}
              >
                + Add option
              </button>
            </div>
            <div className="mt-2 space-y-3">
              {colorDrafts.length === 0 ? (
                <p className={muted + ' text-[12px]'}>Optional. Add a row for each shade or finish; each can have its own photos and price.</p>
              ) : (
                colorDrafts.map((c, idx) => (
                  <div key={idx} className={'grid gap-2 rounded-lg border p-3 sm:grid-cols-2 ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900/60')}>
                    <input className={fieldBox(theme)} placeholder="id" value={c.id} onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)))} />
                    <input className={fieldBox(theme)} placeholder="Label" value={c.label} onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} />
                    <input className={fieldBox(theme)} placeholder="#hex swatch" value={c.swatch} onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, swatch: e.target.value } : x)))} />
                    <input className={fieldBox(theme)} placeholder="Override price (optional)" value={c.price} onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))} />
                    <div className="sm:col-span-2">
                      <textarea
                        className={fieldBox(theme) + ' min-h-[56px] font-mono text-[11px]'}
                        placeholder="Images for this finish (one URL per line)"
                        value={c.imagesText}
                        onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, imagesText: e.target.value } : x)))}
                      />
                    </div>
                    <div className="sm:col-span-2 text-right">
                      <button
                        type="button"
                        className={'text-[12px] font-semibold ' + ad(theme, 'text-rose-700 hover:underline', 'text-rose-300 hover:underline')}
                        onClick={() => setColorDrafts((a) => a.filter((_, i) => i !== idx))}
                      >
                        Remove option
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <label className={label}>Optional: paste extra fields (one-off)</label>
            <p className={muted + ' mt-0.5 text-[11px]'}>Only if you already have a block of structured text from a file. It must be valid JSON; leave blank to use only the form above.</p>
            <textarea
              className={fieldBox(theme) + ' mt-1 min-h-[100px] resize-y font-mono text-[11px]'}
              value={jsonExtra}
              onChange={(e) => setJsonExtra(e.target.value)}
              placeholder="Leave empty unless you know you need this"
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => void onSave()}
              className={
                'rounded-2xl px-5 py-2.5 text-[13px] font-bold disabled:opacity-50 ' +
                ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
              }
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  const row = rows.find((r) => r.id === editingId)
                  if (row) void onDelete(row)
                }}
                className={'rounded-2xl border px-4 py-2.5 text-[13px] font-bold ' + ad(theme, 'border-rose-200 text-rose-800', 'border-rose-800/50 text-rose-200')}
              >
                Delete
              </button>
            ) : null}
          </div>

          {mergedProduct.img ? (
            <div className="pt-2">
              <p className={label}>Preview</p>
              <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
                {[mergedProduct.img, ...(mergedProduct.gallery ?? [])].slice(0, 6).map((u, i) => (
                  <img key={i} src={u} alt="" className="size-20 shrink-0 rounded-xl border border-black/10 object-cover" loading="lazy" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
