import { useState } from 'react'
import { toast } from 'react-hot-toast'
import type { Product, ProductGender } from '../../data/products.ts'
import { insertCatalogProduct, type CatalogProductRow } from '../../lib/adminCatalog.ts'
import {
  adminFieldBox,
  emptyProduct,
  nextColorOptionId,
  productFromDraft,
  slugFromProductName,
  swatchForColorInput,
  type ColorDraft,
} from '../../lib/adminProductDraft.ts'
import { uploadProductImageFile } from '../../lib/adminProductMedia.ts'
import { NairaAmountInput } from './NairaAmountInput.tsx'
import { ad, adminFont } from './adminUi.ts'

type AdminOfflineProductFormProps = {
  theme: 'light' | 'dark'
  onCancel: () => void
  onSaved: (row: CatalogProductRow) => void
}

export function AdminOfflineProductForm({ theme, onCancel, onSaved }: AdminOfflineProductFormProps) {
  const [draft, setDraft] = useState<Product>(() => emptyProduct())
  const [slugTouched, setSlugTouched] = useState(false)
  const [colorDrafts, setColorDrafts] = useState<ColorDraft[]>([])
  const [showColors, setShowColors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const border = ad(theme, 'border-stone-200', 'border-neutral-800')
  const panel = ad(theme, 'bg-white', 'bg-neutral-950')
  const label = 'text-[10px] font-bold uppercase tracking-[0.18em] ' + muted
  const fieldBox = adminFieldBox(theme)

  const setName = (name: string) => {
    setDraft((d) => ({
      ...d,
      name,
      alt: d.alt || name,
      slug: slugTouched ? d.slug : slugFromProductName(name),
    }))
  }

  const runUpload = async (file: File | undefined) => {
    if (!file) return
    setUploadBusy(true)
    const r = await uploadProductImageFile(file)
    setUploadBusy(false)
    if (r.ok) {
      setDraft((d) => ({ ...d, img: r.publicUrl }))
      toast.success('Photo uploaded.')
    } else toast.error(r.message)
  }

  const onSave = async () => {
    let p = productFromDraft(draft, '', '', colorDrafts)
    if (!p.slug.trim() || !p.name.trim() || !p.price.trim()) {
      toast.error('Add product name, URL slug, and selling price (SP).')
      return
    }
    if (!p.cat.trim()) {
      toast.error('Add a category.')
      return
    }
    if (!p.img.trim()) {
      toast.error('Add a photo (upload or paste a URL).')
      return
    }
    if (!p.alt.trim()) p = { ...p, alt: p.name }

    setSaving(true)
    const res = await insertCatalogProduct(p)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Product saved to your catalog.')
    onSaved(res.row)
  }

  return (
    <div className={adminFont() + ' min-h-screen pb-28 ' + ad(theme, 'bg-stone-50', 'bg-black')}>
      <div className={'sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 ' + panel + ' ' + border}>
        <button type="button" onClick={onCancel} className="flex items-center gap-1 font-bold text-emerald-600">
          <span className="material-symbols-outlined">chevron_left</span>
          Cancel
        </button>
        <h2 className="text-lg font-bold">Add new product</h2>
        <button type="button" onClick={() => void onSave()} disabled={saving} className="font-bold text-emerald-600 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <p className={'rounded-xl border px-4 py-3 text-[13px] leading-relaxed ' + ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-900/40 bg-emerald-950/30 text-emerald-100')}>
          Same fields as Products → Add new product. Saves to your shop catalog and adds this item to the offline sale.
        </p>

        <div className={'rounded-2xl border p-5 space-y-4 ' + panel + ' ' + border}>
          <p className={label}>Basics</p>
          <div>
            <label className={label}>Product name *</label>
            <input className={fieldBox} value={draft.name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Gold hoop earrings" />
          </div>
          <div>
            <label className={label}>URL slug *</label>
            <input
              className={fieldBox + ' font-mono text-[12px]'}
              value={draft.slug}
              onChange={(e) => {
                setSlugTouched(true)
                setDraft((d) => ({ ...d, slug: e.target.value }))
              }}
              placeholder="gold-hoop-earrings"
            />
          </div>
          <div>
            <label className={label}>Category *</label>
            <input className={fieldBox} value={draft.cat} onChange={(e) => setDraft((d) => ({ ...d, cat: e.target.value }))} placeholder="e.g. Earrings" />
          </div>
          <div>
            <label className={label}>Who is this for?</label>
            <select
              className={fieldBox}
              value={draft.gender}
              onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value as ProductGender }))}
            >
              <option value="her">For her</option>
              <option value="him">For him</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
        </div>

        <div className={'rounded-2xl border p-5 space-y-4 ' + panel + ' ' + border}>
          <p className={label}>Pricing</p>
          <div>
            <label className={label}>CP — cost price (optional)</label>
            <NairaAmountInput theme={theme} value={draft.cp ?? ''} onChange={(v) => setDraft((d) => ({ ...d, cp: v || undefined }))} />
          </div>
          <div>
            <label className={label}>SP — selling price (shop) *</label>
            <NairaAmountInput theme={theme} value={draft.price} onChange={(v) => setDraft((d) => ({ ...d, price: v }))} placeholder="12,000" />
          </div>
        </div>

        <div className={'rounded-2xl border p-5 space-y-4 ' + panel + ' ' + border}>
          <p className={label}>Stock</p>
          <div>
            <label className={label}>In stock (optional)</label>
            <input
              className={fieldBox}
              type="number"
              min={0}
              step={1}
              disabled={draft.stockUnlimited === true}
              value={draft.stock === undefined ? '' : draft.stock}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') setDraft((d) => ({ ...d, stock: undefined }))
                else setDraft((d) => ({ ...d, stock: Math.max(0, Math.floor(Number(v)) || 0) }))
              }}
              placeholder="e.g. 10"
            />
          </div>
          <label className={'flex cursor-pointer items-center gap-2 text-[13px] font-medium ' + ad(theme, 'text-stone-800', 'text-neutral-100')}>
            <input
              type="checkbox"
              className="rounded border-stone-300"
              checked={draft.stockUnlimited === true}
              onChange={(e) => {
                const on = e.target.checked
                setDraft((d) => (on ? { ...d, stockUnlimited: true, stock: undefined } : { ...d, stockUnlimited: false }))
              }}
            />
            <span>Unlimited stock</span>
          </label>
        </div>

        <div className={'rounded-2xl border p-5 space-y-4 ' + panel + ' ' + border}>
          <p className={label}>Photo</p>
          {draft.img ? <img src={draft.img} alt="" className="mx-auto max-h-40 rounded-xl border object-contain" /> : null}
          <label className={'flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-[13px] font-semibold ' + border}>
            <span className="material-symbols-outlined text-[20px]">upload</span>
            {uploadBusy ? 'Uploading…' : 'Upload photo'}
            <input type="file" accept="image/*" className="sr-only" disabled={uploadBusy} onChange={(e) => void runUpload(e.target.files?.[0])} />
          </label>
          <div>
            <label className={label}>Or paste image URL</label>
            <input className={fieldBox} value={draft.img} onChange={(e) => setDraft((d) => ({ ...d, img: e.target.value }))} placeholder="https://…" />
          </div>
          <div>
            <label className={label}>Alt text</label>
            <input className={fieldBox} value={draft.alt} onChange={(e) => setDraft((d) => ({ ...d, alt: e.target.value }))} />
          </div>
        </div>

        <div className={'rounded-2xl border p-5 space-y-3 ' + panel + ' ' + border}>
          <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowColors((v) => !v)}>
            <span className={label + ' mb-0'}>Colours &amp; finishes (optional)</span>
            <span className="material-symbols-outlined text-stone-400">{showColors ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showColors ? (
            <>
              <p className={muted + ' text-[12px]'}>One row per Gold / Silver etc., same as the main product editor.</p>
              {colorDrafts.map((c, idx) => (
                <div key={idx} className={'rounded-xl border p-3 ' + border}>
                  <input
                    className={fieldBox + ' mb-2'}
                    placeholder="Label e.g. Gold"
                    value={c.label}
                    onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, label: e.target.value, id: x.id || nextColorOptionId(a) } : x)))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className={fieldBox}
                      type="number"
                      min={0}
                      placeholder="Stock"
                      value={c.stock}
                      onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, stock: e.target.value } : x)))}
                    />
                    <input
                      type="color"
                      className="h-11 w-full rounded-lg border"
                      value={swatchForColorInput(c.swatch)}
                      onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, swatch: e.target.value } : x)))}
                    />
                  </div>
                  <button type="button" className="mt-2 text-[12px] font-bold text-rose-600" onClick={() => setColorDrafts((a) => a.filter((_, i) => i !== idx))}>
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="w-full rounded-lg border border-emerald-300 py-2 text-[12px] font-bold text-emerald-800"
                onClick={() =>
                  setColorDrafts((c) => [...c, { id: nextColorOptionId(c), label: '', swatch: '#8b7355', price: '', stock: '', imagesText: '' }])
                }
              >
                + Add colour option
              </button>
            </>
          ) : null}
        </div>

        <div className={'rounded-2xl border p-5 ' + panel + ' ' + border}>
          <label className={label}>Description (optional)</label>
          <textarea
            className={fieldBox + ' min-h-[80px] resize-y'}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <label className={'mt-4 flex cursor-pointer items-center gap-2 text-[13px] font-medium ' + ad(theme, 'text-stone-800', 'text-neutral-100')}>
            <input
              type="checkbox"
              className="rounded border-stone-300"
              checked={draft.published !== false}
              onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
            />
            <span>Published on shop</span>
          </label>
        </div>
      </div>

      <div className={'fixed bottom-0 left-0 right-0 z-20 border-t p-4 ' + panel + ' ' + border}>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="mx-auto block w-full max-w-2xl rounded-2xl bg-emerald-700 py-4 text-lg font-bold text-white shadow-lg disabled:opacity-50"
        >
          {saving ? 'Saving product…' : 'Save & add to sale'}
        </button>
      </div>
    </div>
  )
}
