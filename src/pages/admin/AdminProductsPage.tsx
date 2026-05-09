import { useEffect, useState, type FormEvent } from 'react'
import type { Product, ProductGender } from '../../data/products.ts'
import { deleteCatalogProduct, fetchCatalogProducts, insertCatalogProduct } from '../../lib/adminCatalog.ts'
import type { CatalogProductRow } from '../../lib/adminCatalog.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad } from './adminUi.ts'

export function AdminProductsPage() {
  const { theme } = useAdminTheme()
  const [rows, setRows] = useState<CatalogProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [cat, setCat] = useState('')
  const [price, setPrice] = useState('')
  const [gender, setGender] = useState<ProductGender>('her')
  const [img, setImg] = useState('/product1.jpeg')
  const [badge, setBadge] = useState('For Her')
  const [alt, setAlt] = useState('')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setRows(await fetchCatalogProducts())
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-')
    if (!s || !name.trim() || !price.trim()) {
      setMsg('Slug, name, and price are required.')
      return
    }
    const product: Product = {
      slug: s,
      gender,
      img: img.trim() || '/product1.jpeg',
      alt: alt.trim() || name.trim(),
      badge: badge.trim() || 'New',
      name: name.trim(),
      cat: cat.trim() || 'General',
      price: price.includes('₦') ? price.trim() : `₦${price.trim()}`,
      description: description.trim() || name.trim(),
    }
    setBusy(true)
    const res = await insertCatalogProduct(product)
    setBusy(false)
    if (!res.ok) {
      setMsg(res.message)
      return
    }
    setMsg('Saved to staging catalog.')
    setSlug('')
    setName('')
    setPrice('')
    setDescription('')
    await load()
  }

  const input = ad(
    theme,
    'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-400',
    'w-full rounded-lg border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-500',
  )
  const label = ad(theme, 'mb-1.5 block text-[10px] font-bold tracking-wide text-zinc-500 uppercase', '')

  const card = ad(
    theme,
    'rounded-xl border border-zinc-200/90 bg-white p-6 shadow-sm',
    'rounded-xl border border-zinc-800/90 bg-[#0c0c0e] p-6',
  )

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Catalog · staging</h1>
      <p className={ad(theme, 'mt-1 text-sm text-zinc-500', 'mt-1 text-sm text-zinc-500')}>
        New rows persist to Supabase <code className="rounded bg-black/5 px-1 text-[11px] dark:bg-white/10">catalog_products</code>.
        The live shop still uses code-defined <code className="rounded bg-black/5 px-1 text-[11px] dark:bg-white/10">PRODUCTS</code> until you connect them.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form onSubmit={onSubmit} className={card + ' space-y-4'}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-zinc-500">post_add</span>
            <h2 className="text-[15px] font-semibold tracking-tight">New product</h2>
          </div>

          {msg ? (
            <p
              className={ad(
                theme,
                'rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700',
                'rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200',
              )}
              role="status"
            >
              {msg}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={label}>Slug (URL)</span>
              <input className={input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="velvet-matte-lip" />
            </label>
            <label className="sm:col-span-2">
              <span className={label}>Name</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
            </label>
            <label>
              <span className={label}>Category</span>
              <input className={input} value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Skincare" />
            </label>
            <label>
              <span className={label}>Price</span>
              <input className={input} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="18500 or ₦18,500" />
            </label>
            <label>
              <span className={label}>Gender</span>
              <select className={input} value={gender} onChange={(e) => setGender(e.target.value as ProductGender)}>
                <option value="her">For her</option>
                <option value="him">For him</option>
              </select>
            </label>
            <label>
              <span className={label}>Badge</span>
              <input className={input} value={badge} onChange={(e) => setBadge(e.target.value)} />
            </label>
            <label className="sm:col-span-2">
              <span className={label}>Image path</span>
              <input className={input} value={img} onChange={(e) => setImg(e.target.value)} placeholder="/product1.jpeg" />
            </label>
            <label className="sm:col-span-2">
              <span className={label}>Alt text</span>
              <input className={input} value={alt} onChange={(e) => setAlt(e.target.value)} />
            </label>
            <label className="sm:col-span-2">
              <span className={label}>Description</span>
              <textarea
                className={input + ' min-h-[100px] resize-y'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className={ad(
              theme,
              'flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50',
              'flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 py-3 text-[13px] font-semibold text-zinc-900 transition-colors hover:bg-white disabled:opacity-50',
            )}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">save</span>
            {busy ? 'Saving…' : 'Save to staging'}
          </button>
        </form>

        <div className={card}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-zinc-500">inventory_2</span>
              <h2 className="text-[15px] font-semibold tracking-tight">Staged SKUs</h2>
            </div>
            {loading ? (
              <span className="text-[12px] text-zinc-500">Loading…</span>
            ) : (
              <span className="text-[12px] text-zinc-500">{rows.length} items</span>
            )}
          </div>
          <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className={ad(
                  theme,
                  'flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2.5',
                  'flex items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2.5',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{r.payload.name}</p>
                  <p className="truncate font-mono text-[11px] text-zinc-500">{r.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('Remove this staged product?')) return
                    await deleteCatalogProduct(r.id)
                    await load()
                  }}
                  className="shrink-0 rounded-md p-1.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-600"
                  aria-label="Delete"
                >
                  <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                </button>
              </li>
            ))}
          </ul>
          {!loading && rows.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-500">No staged products yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
