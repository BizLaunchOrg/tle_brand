import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  displayableImageUrl,
  getDefaultImageUrls,
  type Product,
  type ProductColorOption,
  type ProductGender,
} from '../../data/products.ts'
import {
  deleteCatalogProduct,
  fetchCatalogProducts,
  insertCatalogProduct,
  updateCatalogProduct,
  type CatalogProductRow,
} from '../../lib/adminCatalog.ts'
import { fetchOrdersForAdmin, type AdminOrderRow } from '../../lib/adminOrders.ts'
import { uploadProductImageFile } from '../../lib/adminProductMedia.ts'
import {
  computeInventoryValueNgn,
  computeSoldUnitsFromOrders,
  countExplicitOutOfStock,
} from '../../lib/adminProductStats.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminConfirmDelete, adminFont } from './adminUi.ts'

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
    published: true,
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
  if (p.published !== false) delete (p as { published?: boolean }).published
  else (p as Product).published = false
  if (typeof core.stock === 'number' && Number.isFinite(core.stock) && core.stock >= 0) {
    ;(p as Product).stock = Math.floor(core.stock)
  } else delete (p as { stock?: number }).stock
  return p
}

const fieldBox = (theme: 'light' | 'dark') =>
  ad(
    theme,
    'mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
    'mt-1 w-full rounded-xl border border-neutral-600 bg-neutral-950 px-3 py-2.5 text-[13px] text-neutral-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25',
  )

const formatNaira = (n: number) => `₦${Math.round(n).toLocaleString()}`

function isPublishedPayload(p: Product): boolean {
  return p.published !== false
}

function TableThumb({ url, theme }: { url: string | undefined; theme: 'light' | 'dark' }) {
  const [broken, setBroken] = useState(false)
  const src = displayableImageUrl(url)
  useEffect(() => {
    setBroken(false)
  }, [url])
  if (!src || broken) {
    return (
      <span
        className={
          'flex size-12 items-center justify-center rounded-lg border border-dashed text-[20px] ' +
          ad(theme, 'border-stone-200 bg-stone-50 text-stone-400', 'border-neutral-600 bg-neutral-800 text-neutral-500')
        }
        aria-hidden
      >
        <span className="material-symbols-outlined text-[22px] font-light">image</span>
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="size-12 rounded-lg border border-black/10 object-cover"
      loading="lazy"
      onError={() => setBroken(true)}
    />
  )
}

export function AdminProductsPage() {
  const { theme } = useAdminTheme()
  const [rows, setRows] = useState<CatalogProductRow[]>([])
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'inventory' | 'collections'>('inventory')
  const [publishFilter, setPublishFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [collectionFilter, setCollectionFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Product>(() => emptyProduct())
  const [galleryText, setGalleryText] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [colorDrafts, setColorDrafts] = useState<ColorDraft[]>([])
  const [jsonExtra, setJsonExtra] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)

  const mainFileRef = useRef<HTMLInputElement>(null)
  const galleryFilesRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [catalog, ord] = await Promise.all([fetchCatalogProducts(), fetchOrdersForAdmin(800)])
    setRows(catalog)
    setOrders(ord)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const collectionOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      const c = r.payload.cat?.trim()
      if (c) s.add(c)
    }
    return ['all', ...[...s].sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const p = row.payload
      if (publishFilter === 'published' && !isPublishedPayload(p)) return false
      if (publishFilter === 'draft' && isPublishedPayload(p)) return false
      if (collectionFilter !== 'all' && (p.cat?.trim() || '') !== collectionFilter) return false
      if (q) {
        const hay = `${p.name} ${row.slug} ${p.cat ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, search, publishFilter, collectionFilter])

  const stats = useMemo(() => {
    const inv = computeInventoryValueNgn(rows)
    const sold = computeSoldUnitsFromOrders(orders)
    const oos = countExplicitOutOfStock(rows)
    return { inv, sold, oos }
  }, [rows, orders])

  const collectionsGrouped = useMemo(() => {
    const m = new Map<string, CatalogProductRow[]>()
    for (const r of rows) {
      const k = r.payload.cat?.trim() || 'Uncategorised'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  const openNew = () => {
    setEditingId(null)
    setDraft(emptyProduct())
    setGalleryText('')
    setTagsText('')
    setColorDrafts([])
    setJsonExtra('')
    setMsg(null)
    setEditorOpen(true)
  }

  const openEdit = (row: CatalogProductRow) => {
    setEditingId(row.id)
    const p = row.payload
    setDraft({
      ...emptyProduct(),
      ...p,
      published: p.published !== false,
      stock: typeof p.stock === 'number' ? p.stock : undefined,
    })
    setGalleryText((p.gallery ?? []).join('\n'))
    setTagsText((p.tags ?? []).join(', '))
    setColorDrafts(colorsFromProduct(p))
    setJsonExtra('')
    setMsg(null)
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
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

  const mergedPreviewUrls = useMemo(() => getDefaultImageUrls(mergedProduct).map(displayableImageUrl), [mergedProduct])

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
    const imageUrls = getDefaultImageUrls(p)
    if (!p.slug.trim() || !p.name.trim() || !p.price.trim()) {
      setMsg({ type: 'err', text: 'Please add the link name, title, and price.' })
      return
    }
    if (!imageUrls.length) {
      setMsg({ type: 'err', text: 'Add at least one photo: upload, paste a URL, gallery lines, or colour photos.' })
      return
    }
    if (!p.img.trim() && imageUrls[0]) {
      p = { ...p, img: imageUrls[0] }
    }

    setSaving(true)
    if (editingId) {
      const res = await updateCatalogProduct(editingId, p)
      setSaving(false)
      if (!res.ok) setMsg({ type: 'err', text: res.message })
      else {
        setMsg({ type: 'ok', text: 'Product updated.' })
        await load()
        closeEditor()
      }
    } else {
      const res = await insertCatalogProduct(p)
      setSaving(false)
      if (!res.ok) setMsg({ type: 'err', text: res.message })
      else {
        setMsg({ type: 'ok', text: 'Product created.' })
        await load()
        closeEditor()
      }
    }
  }

  const onDelete = async (row: CatalogProductRow) => {
    if (!adminConfirmDelete(row.payload.name || row.slug)) return
    const ok = await deleteCatalogProduct(row.id)
    if (!ok) setMsg({ type: 'err', text: 'Could not delete.' })
    else {
      setMsg({ type: 'ok', text: 'Deleted.' })
      if (editingId === row.id) closeEditor()
      setSelected((s) => {
        const n = new Set(s)
        n.delete(row.id)
        return n
      })
      await load()
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const toggleSelectAllFiltered = () => {
    const ids = filteredRows.map((r) => r.id)
    const allOn = ids.length > 0 && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const n = new Set(prev)
      if (allOn) for (const id of ids) n.delete(id)
      else for (const id of ids) n.add(id)
      return n
    })
  }

  const runMainUpload = async (file: File | undefined) => {
    if (!file) return
    setUploadBusy(true)
    setMsg(null)
    const r = await uploadProductImageFile(file)
    setUploadBusy(false)
    if (r.ok) setDraft((d) => ({ ...d, img: r.publicUrl }))
    else setMsg({ type: 'err', text: r.message })
  }

  const runGalleryUploads = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadBusy(true)
    setMsg(null)
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const r = await uploadProductImageFile(files[i]!)
      if (r.ok) urls.push(r.publicUrl)
      else {
        setUploadBusy(false)
        setMsg({ type: 'err', text: r.message })
        return
      }
    }
    setUploadBusy(false)
    setGalleryText((prev) => [prev.replace(/\s+$/, ''), ...urls].filter(Boolean).join('\n'))
  }

  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const card = ad(theme, 'rounded-2xl border border-stone-200/90 bg-white shadow-sm', 'rounded-2xl border border-neutral-700/90 bg-neutral-900/50 shadow-sm')
  const label = ad(theme, 'text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500', 'text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500')
  const tableHead = ad(theme, 'bg-stone-50 text-left text-[11px] font-bold text-stone-500', 'bg-neutral-900/80 text-left text-[11px] font-bold text-neutral-400')
  const tableCell = ad(theme, 'border-t border-stone-100 align-middle text-[13px] text-stone-800', 'border-t border-neutral-800 align-middle text-[13px] text-neutral-100')

  if (loading) {
    return (
      <div className={adminFont() + ' flex min-h-[40vh] items-center justify-center ' + muted}>
        Loading catalog…
      </div>
    )
  }

  return (
    <div className={adminFont() + ' mx-auto w-full min-w-0 max-w-[88rem] pb-10'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={ad(theme, 'text-2xl font-bold tracking-tight text-stone-900', 'text-2xl font-bold tracking-tight text-white')}>Products</h1>
          <p className={muted + ' mt-1 max-w-2xl text-[14px] leading-relaxed'}>
            Manage inventory like a storefront: publish or draft, stock counts, and photos — upload from your device or paste image links.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className={
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold shadow-md ' +
            ad(theme, 'bg-emerald-600 text-white shadow-emerald-600/25', 'bg-emerald-600 text-white shadow-emerald-900/40')
          }
        >
          <span className="material-symbols-outlined text-[20px] font-light">add</span>
          Add new product
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className={'rounded-2xl border p-4 ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900/40')}>
          <p className={label}>Total inventory value</p>
          <p className={'mt-2 text-xl font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{formatNaira(stats.inv)}</p>
          <p className={muted + ' mt-1 text-[12px]'}>Price × stock (set stock on each product).</p>
        </div>
        <div className={'rounded-2xl border p-4 ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900/40')}>
          <p className={label}>Units in orders</p>
          <p className={'mt-2 text-xl font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{stats.sold.toLocaleString()}</p>
          <p className={muted + ' mt-1 text-[12px]'}>Sum of line quantities across orders.</p>
        </div>
        <div className={'rounded-2xl border p-4 ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900/40')}>
          <p className={label}>Out of stock</p>
          <p className={'mt-2 text-xl font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{stats.oos}</p>
          <p className={muted + ' mt-1 text-[12px]'}>Products with stock set to 0.</p>
        </div>
      </div>

      {msg && !editorOpen ? (
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

      <div className={'mt-6 min-w-0 ' + card}>
        <div className={'flex flex-wrap gap-2 border-b px-3 py-2 sm:px-4 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
          <button
            type="button"
            onClick={() => setMainTab('inventory')}
            className={
              'rounded-lg px-4 py-2 text-[13px] font-bold transition ' +
              (mainTab === 'inventory'
                ? ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
                : ad(theme, 'text-stone-600 hover:bg-stone-50', 'text-neutral-400 hover:bg-neutral-800/60'))
            }
          >
            Inventory
          </button>
          <button
            type="button"
            onClick={() => setMainTab('collections')}
            className={
              'rounded-lg px-4 py-2 text-[13px] font-bold transition ' +
              (mainTab === 'collections'
                ? ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
                : ad(theme, 'text-stone-600 hover:bg-stone-50', 'text-neutral-400 hover:bg-neutral-800/60'))
            }
          >
            Collections
          </button>
        </div>

        {mainTab === 'inventory' ? (
          <>
            <div className={'flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 ' + ad(theme, 'border-stone-100 bg-stone-50/50', 'border-neutral-800 bg-neutral-950/30')}>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPublishFilter('all')
                    setCollectionFilter('all')
                    setSearch('')
                  }}
                  className={'rounded-lg border px-3 py-1.5 text-[12px] font-semibold ' + ad(theme, 'border-stone-200 text-stone-700', 'border-neutral-600 text-neutral-200')}
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={() => setPublishFilter('draft')}
                  className={
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold ' +
                    (publishFilter === 'draft'
                      ? ad(theme, 'bg-stone-800 text-white', 'bg-neutral-200 text-neutral-900')
                      : ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800'))
                  }
                >
                  Unpublished
                </button>
                <button
                  type="button"
                  onClick={() => setPublishFilter('published')}
                  className={
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold ' +
                    (publishFilter === 'published'
                      ? ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-200')
                      : ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800'))
                  }
                >
                  Published
                </button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <select
                  className={'w-full rounded-lg border px-3 py-2 text-[13px] font-medium sm:max-w-[220px] ' + fieldBox(theme).replace('mt-1 ', '')}
                  value={collectionFilter}
                  onChange={(e) => setCollectionFilter(e.target.value)}
                >
                  {collectionOptions.map((c) => (
                    <option key={c} value={c}>
                      {c === 'all' ? 'All categories' : c}
                    </option>
                  ))}
                </select>
                <div className={'relative w-full sm:max-w-xs ' + ad(theme, '', '')}>
                  <span className={'material-symbols-outlined pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[20px] ' + muted}>
                    search
                  </span>
                  <input
                    type="search"
                    placeholder="Search products…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={
                      fieldBox(theme).replace('mt-1 ', '') +
                      ' w-full pl-10 ' +
                      ad(theme, 'border-stone-200', 'border-neutral-600')
                    }
                  />
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className={tableHead}>
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-stone-300"
                        checked={filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id))}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Select all visible"
                      />
                    </th>
                    <th className="px-2 py-3">Image</th>
                    <th className="min-w-[180px] px-2 py-3">Product</th>
                    <th className="px-2 py-3">Category</th>
                    <th className="px-2 py-3 text-center">Variations</th>
                    <th className="px-2 py-3 text-center">In stock</th>
                    <th className="px-2 py-3">Price</th>
                    <th className="px-2 py-3">Status</th>
                    <th className="w-24 px-2 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={'px-4 py-12 text-center text-[14px] ' + muted}>
                        No products match these filters. Try clearing filters or add a new product.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const p = row.payload
                      const thumb = getDefaultImageUrls(p)[0]
                      const vars = p.colorOptions?.length ?? 0
                      const stockLabel = typeof p.stock === 'number' ? String(p.stock) : '—'
                      const pub = isPublishedPayload(p)
                      return (
                        <tr key={row.id} className={ad(theme, 'hover:bg-stone-50/80', 'hover:bg-neutral-800/40')}>
                          <td className={'px-3 py-2 ' + tableCell}>
                            <input type="checkbox" className="rounded border-stone-300" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} />
                          </td>
                          <td className={'px-2 py-2 ' + tableCell}>
                            <TableThumb url={thumb} theme={theme} />
                          </td>
                          <td className={'min-w-0 px-2 py-2 ' + tableCell}>
                            <p className={'truncate font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{p.name || row.slug}</p>
                            <p className={'truncate font-mono text-[11px] ' + muted}>{row.slug}</p>
                          </td>
                          <td className={'max-w-[140px] truncate px-2 py-2 ' + tableCell}>{p.cat || '—'}</td>
                          <td className={'px-2 py-2 text-center tabular-nums ' + tableCell}>{vars}</td>
                          <td className={'px-2 py-2 text-center tabular-nums ' + tableCell}>{stockLabel}</td>
                          <td className={'whitespace-nowrap px-2 py-2 font-semibold tabular-nums ' + tableCell}>{p.price || '—'}</td>
                          <td className={'px-2 py-2 ' + tableCell}>
                            <span
                              className={
                                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ' +
                                (pub
                                  ? ad(theme, 'bg-sky-100 text-sky-800', 'bg-sky-950/50 text-sky-200')
                                  : ad(theme, 'bg-amber-100 text-amber-900', 'bg-amber-950/40 text-amber-200'))
                              }
                            >
                              {pub ? 'Published' : 'Unpublished'}
                            </span>
                          </td>
                          <td className={'px-2 py-2 text-right ' + tableCell}>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className={'mr-1 inline-flex size-9 items-center justify-center rounded-lg border text-stone-700 ' + ad(theme, 'border-stone-200 hover:bg-stone-100', 'border-neutral-600 text-neutral-200 hover:bg-neutral-800')}
                              aria-label="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px] font-light">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDelete(row)}
                              className={'inline-flex size-9 items-center justify-center rounded-lg border text-rose-700 ' + ad(theme, 'border-rose-200 hover:bg-rose-50', 'border-rose-900/40 text-rose-300 hover:bg-rose-950/30')}
                              aria-label="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px] font-light">delete</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="divide-y px-4 py-2">
            {collectionsGrouped.map(([cat, list]) => (
              <div key={cat} className="py-4 first:pt-3">
                <h3 className={'text-[15px] font-bold ' + ad(theme, 'text-stone-900', 'text-white')}>
                  {cat} <span className={muted + ' text-[13px] font-normal'}>({list.length})</span>
                </h3>
                <ul className="mt-2 space-y-1">
                  {list.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className={'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] ' + ad(theme, 'hover:bg-stone-50', 'hover:bg-neutral-800/50')}
                      >
                        <TableThumb url={getDefaultImageUrls(row.payload)[0]} theme={theme} />
                        <span className={'min-w-0 flex-1 truncate font-medium ' + ad(theme, 'text-stone-800', 'text-neutral-100')}>{row.payload.name || row.slug}</span>
                        <span className={muted + ' shrink-0 text-[12px]'}>{row.payload.price || '—'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {collectionsGrouped.length === 0 ? <p className={'p-8 text-center ' + muted}>No products yet.</p> : null}
          </div>
        )}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <div
            className={
              'flex max-h-[min(100dvh,920px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:rounded-2xl ' +
              ad(theme, 'bg-white', 'bg-neutral-900')
            }
          >
            <div className={'flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
              <p className={'text-[16px] font-bold ' + ad(theme, 'text-stone-900', 'text-white')}>{editingId ? 'Edit product' : 'New product'}</p>
              <button
                type="button"
                onClick={closeEditor}
                className={'flex size-9 items-center justify-center rounded-full ' + ad(theme, 'text-stone-500 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800')}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {msg ? (
                <div
                  className={
                    'mb-4 rounded-xl border px-3 py-2 text-[13px] font-medium ' +
                    (msg.type === 'ok'
                      ? ad(theme, 'border-emerald-200 bg-emerald-50 text-emerald-900', 'border-emerald-800/50 bg-emerald-950/40 text-emerald-200')
                      : ad(theme, 'border-rose-200 bg-rose-50 text-rose-900', 'border-rose-900/40 bg-rose-950/30 text-rose-200'))
                  }
                >
                  {msg.text}
                </div>
              ) : null}

              <div
                className={
                  'mb-4 overflow-hidden rounded-xl border ' +
                  ad(theme, 'border-stone-200 bg-stone-50/90', 'border-neutral-700 bg-neutral-950/40')
                }
              >
                {mergedPreviewUrls.length ? (
                  <div className="flex flex-col sm:flex-row sm:items-stretch">
                    <div className="relative h-44 w-full shrink-0 overflow-hidden sm:min-h-[180px] sm:w-[min(45%,260px)]">
                      <img
                        src={mergedPreviewUrls[0]}
                        alt=""
                        className="size-full object-cover sm:absolute sm:inset-0 sm:min-h-[180px]"
                        loading="lazy"
                      />
                    </div>
                    <div className={'min-w-0 flex-1 space-y-2 px-3 py-3 ' + ad(theme, 'bg-white/70', 'bg-neutral-900/40')}>
                      <p className={label}>Photo preview</p>
                      <p className={muted + ' text-[12px]'}>Upload files below — they are stored on Supabase and the public link is saved on this product.</p>
                      {mergedPreviewUrls.length > 1 ? (
                        <div className="flex gap-2 overflow-x-auto pt-1">
                          {mergedPreviewUrls.slice(0, 8).map((u, i) => (
                            <img key={`${u}-${i}`} src={u} alt="" className="size-11 shrink-0 rounded-lg border border-black/10 object-cover" loading="lazy" />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className={'flex min-h-[88px] items-center px-4 py-4 text-[13px] ' + muted}>Upload or paste URLs to see a preview.</div>
                )}
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <input ref={mainFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void runMainUpload(e.target.files?.[0])} />
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => mainFileRef.current?.click()}
                  className={
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-bold disabled:opacity-50 ' +
                    ad(theme, 'border-emerald-300 bg-emerald-50 text-emerald-900', 'border-emerald-800 bg-emerald-950/40 text-emerald-200')
                  }
                >
                  <span className="material-symbols-outlined text-[20px] font-light">upload</span>
                  {uploadBusy ? 'Uploading…' : 'Upload main photo'}
                </button>
                <input ref={galleryFilesRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void runGalleryUploads(e.target.files)} />
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => galleryFilesRef.current?.click()}
                  className={
                    'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50 ' +
                    ad(theme, 'border-stone-200 bg-white text-stone-800', 'border-neutral-600 bg-neutral-950 text-neutral-100')
                  }
                >
                  <span className="material-symbols-outlined text-[20px] font-light">add_photo_alternate</span>
                  Add gallery photos
                </button>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
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
                  <label className={label}>In stock (optional)</label>
                  <input
                    className={fieldBox(theme)}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="e.g. 24"
                    value={draft.stock === undefined ? '' : draft.stock}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') setDraft((d) => ({ ...d, stock: undefined }))
                      else setDraft((d) => ({ ...d, stock: Math.max(0, Math.floor(Number(v)) || 0) }))
                    }}
                  />
                </div>
                <div className="flex items-end gap-3 sm:col-span-2">
                  <label className={'flex cursor-pointer items-center gap-2 text-[13px] font-medium ' + ad(theme, 'text-stone-800', 'text-neutral-100')}>
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={draft.published !== false}
                      onChange={(e) => setDraft((d) => ({ ...d, published: e.target.checked }))}
                    />
                    <span>Published on shop</span>
                  </label>
                </div>
                <div>
                  <label className={label}>Promo (optional)</label>
                  <input className={fieldBox(theme)} value={draft.promo ?? ''} onChange={(e) => setDraft((d) => ({ ...d, promo: e.target.value || undefined }))} />
                </div>
                <div>
                  <label className={label}>Badge</label>
                  <input className={fieldBox(theme)} value={draft.badge} onChange={(e) => setDraft((d) => ({ ...d, badge: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Main image URL (or use upload)</label>
                  <input className={fieldBox(theme)} value={draft.img} onChange={(e) => setDraft((d) => ({ ...d, img: e.target.value }))} placeholder="https://…" />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Alt text</label>
                  <input className={fieldBox(theme)} value={draft.alt} onChange={(e) => setDraft((d) => ({ ...d, alt: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Description</label>
                  <textarea
                    className={fieldBox(theme) + ' mt-1 min-h-[100px] resize-y text-[13px]'}
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Gallery image URLs (one per line) — or use “Add gallery photos”</label>
                  <textarea className={fieldBox(theme) + ' min-h-[72px] resize-y font-mono text-[12px]'} value={galleryText} onChange={(e) => setGalleryText(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Tags (comma-separated)</label>
                  <input className={fieldBox(theme)} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="NEW, GOLD, GIFT" />
                </div>
              </div>

              <div className={'mt-4 rounded-xl border p-3 ' + ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-950/40')}>
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
                    <p className={muted + ' text-[12px]'}>Optional. Each option can have its own photo URLs or uploads via pasted links.</p>
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
                            onClick={() => {
                              if (!adminConfirmDelete('this colour option')) return
                              setColorDrafts((a) => a.filter((_, i) => i !== idx))
                            }}
                          >
                            Remove option
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className={label}>Optional: paste extra JSON</label>
                <textarea
                  className={fieldBox(theme) + ' mt-1 min-h-[80px] resize-y font-mono text-[11px]'}
                  value={jsonExtra}
                  onChange={(e) => setJsonExtra(e.target.value)}
                  placeholder="Leave empty unless you need this"
                />
              </div>
            </div>

            <div className={'flex shrink-0 flex-wrap gap-2 border-t px-4 py-3 ' + ad(theme, 'border-stone-100 bg-stone-50/80', 'border-neutral-800 bg-neutral-950/50')}>
              <button
                type="button"
                disabled={saving || uploadBusy}
                onClick={() => void onSave()}
                className={
                  'rounded-xl px-5 py-2.5 text-[13px] font-bold disabled:opacity-50 ' +
                  ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
                }
              >
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create product'}
              </button>
              <button
                type="button"
                onClick={closeEditor}
                className={'rounded-xl border px-4 py-2.5 text-[13px] font-semibold ' + ad(theme, 'border-stone-200 text-stone-800', 'border-neutral-600 text-neutral-200')}
              >
                Cancel
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={() => {
                    const row = rows.find((r) => r.id === editingId)
                    if (row) void onDelete(row)
                  }}
                  className={'ml-auto rounded-xl border px-4 py-2.5 text-[13px] font-bold ' + ad(theme, 'border-rose-200 text-rose-800', 'border-rose-800/50 text-rose-200')}
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
