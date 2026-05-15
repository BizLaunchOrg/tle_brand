import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  displayableImageUrl,
  getDefaultImageUrls,
  isProductOutOfStock,
  parseProductPriceNgn,
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
  adminStockAdClasses,
} from '../../lib/adminProductStats.ts'
import {
  deleteCatalogCategory,
  fetchCatalogCategories,
  insertCatalogCategory,
  type CatalogCategoryRow,
} from '../../lib/adminCategories.ts'
import { openProductMarginPrintReport } from '../../lib/adminMarginReport.ts'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { ad, adminConfirmDelete, adminFont } from './adminUi.ts'

type ColorDraft = { id: string; label: string; swatch: string; price: string; imagesText: string }

/** #RGB or #RRGGBB for HTML colour picker (requires 6-digit hex). */
function swatchForColorInput(hex: string): string {
  const raw = hex.trim()
  if (!raw) return '#cccccc'
  let s = raw.startsWith('#') ? raw.slice(1) : raw
  if (!/^[0-9a-f]+$/i.test(s)) return '#cccccc'
  if (s.length === 3) s = `${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`
  if (s.length !== 6) return '#cccccc'
  return `#${s.toLowerCase()}`
}

function nextColorOptionId(existing: ColorDraft[]): string {
  const tail = Date.now().toString().slice(-7)
  const id = `lady-v-${tail}`
  return existing.some((x) => x.id === id) ? `${id}-${existing.length}` : id
}

function emptyProduct(): Product {
  return {
    slug: '',
    gender: 'her',
    img: '',
    alt: '',
    name: '',
    cat: '',
    price: '',
    description: '',
    published: true,
    stockUnlimited: false,
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
  if (core.cp?.trim()) (p as Product).cp = core.cp.trim()
  else delete (p as { cp?: string }).cp

  const compareRaw = typeof core.compareAt === 'string' ? core.compareAt.trim() : ''
  const saleN = parseProductPriceNgn(p.price)
  const compN = parseProductPriceNgn(compareRaw)
  if (compareRaw && compN > saleN && saleN > 0) (p as Product).compareAt = compareRaw
  else delete (p as { compareAt?: string }).compareAt

  delete (p as { promo?: string }).promo
  if (core.badge?.trim()) (p as Product).badge = core.badge.trim()
  else delete (p as { badge?: string }).badge

  if (core.stockUnlimited === true) {
    ;(p as Product).stockUnlimited = true
    delete (p as { stock?: number }).stock
  } else {
    delete (p as { stockUnlimited?: boolean }).stockUnlimited
    if (typeof core.stock === 'number' && Number.isFinite(core.stock) && core.stock >= 0) {
      ;(p as Product).stock = Math.floor(core.stock)
    } else delete (p as { stock?: number }).stock
  }
  if (p.published !== false) delete (p as { published?: boolean }).published
  else (p as Product).published = false
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

function TableThumb({ url, theme, size = 'sm' }: { url: string | undefined; theme: 'light' | 'dark'; size?: 'sm' | 'lg' }) {
  const [broken, setBroken] = useState(false)
  const src = displayableImageUrl(url)
  useEffect(() => {
    setBroken(false)
  }, [url])
  const box = size === 'lg' ? 'size-16 sm:size-[72px]' : 'size-12 sm:size-[52px]'
  if (!src || broken) {
    return (
      <span
        className={
          'flex shrink-0 items-center justify-center rounded-lg border border-dashed ' +
          box +
          ' text-[20px] ' +
          ad(theme, 'border-stone-200 bg-stone-50 text-stone-400', 'border-neutral-600 bg-neutral-800 text-neutral-500')
        }
        aria-hidden
      >
        <span className="material-symbols-outlined text-[22px] font-light">image</span>
      </span>
    )
  }
  return (
    <span
      className={
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 ' +
        box +
        ' ' +
        ad(theme, 'bg-stone-50', 'bg-neutral-900/80')
      }
    >
      <img
        src={src}
        alt=""
        className="max-h-[90%] max-w-[90%] object-contain object-center"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    </span>
  )
}

export function AdminProductsPage() {
  const { theme } = useAdminTheme()
  const [rows, setRows] = useState<CatalogProductRow[]>([])
  const [orders, setOrders] = useState<AdminOrderRow[]>([])
  const [categoryPresetRows, setCategoryPresetRows] = useState<CatalogCategoryRow[]>([])
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [presetBusy, setPresetBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'inventory' | 'collections'>('inventory')
  const [collectionsOpen, setCollectionsOpen] = useState<Set<string>>(() => new Set())
  const collectionsDefaultedRef = useRef(false)
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all')
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
  const [saving, setSaving] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)

  const mainFileRef = useRef<HTMLInputElement>(null)
  const galleryFilesRef = useRef<HTMLInputElement>(null)
  const colorOptionFilesRef = useRef<HTMLInputElement>(null)
  const colorUploadIdxRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    const [catalog, ord, catRows] = await Promise.all([
      fetchCatalogProducts(),
      fetchOrdersForAdmin(800),
      fetchCatalogCategories(),
    ])
    setRows(catalog)
    setOrders(ord)
    setCategoryPresetRows(catRows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categoryPicklist = useMemo(() => {
    const s = new Set<string>()
    for (const r of categoryPresetRows) {
      const n = r.name.trim()
      if (n) s.add(n)
    }
    for (const r of rows) {
      const c = r.payload.cat?.trim()
      if (c) s.add(c)
    }
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [rows, categoryPresetRows])

  const collectionOptions = useMemo(() => ['all', ...categoryPicklist], [categoryPicklist])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      const p = row.payload
      if (stockFilter === 'out_of_stock' && !isProductOutOfStock(p)) return false
      if (stockFilter === 'in_stock' && isProductOutOfStock(p)) return false
      if (collectionFilter !== 'all' && (p.cat?.trim() || '') !== collectionFilter) return false
      if (q) {
        const hay = `${p.name} ${row.slug} ${p.cat ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, search, stockFilter, collectionFilter])

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

  useEffect(() => {
    if (collectionsGrouped.length === 0) {
      collectionsDefaultedRef.current = false
      setCollectionsOpen(new Set())
      return
    }
    setCollectionsOpen((prev) => {
      const valid = new Set(collectionsGrouped.map(([cat]) => cat))
      const next = new Set([...prev].filter((c) => valid.has(c)))
      if (!collectionsDefaultedRef.current) {
        collectionsDefaultedRef.current = true
        if (next.size === 0) next.add(collectionsGrouped[0]![0])
      }
      return next
    })
  }, [collectionsGrouped])

  const openNew = () => {
    setEditingId(null)
    setDraft(emptyProduct())
    setGalleryText('')
    setTagsText('')
    setColorDrafts([])
    setJsonExtra('')
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
      stockUnlimited: p.stockUnlimited === true,
      compareAt: p.compareAt,
      cp: p.cp,
    })
    setGalleryText((p.gallery ?? []).join('\n'))
    setTagsText((p.tags ?? []).join(', '))
    setColorDrafts(colorsFromProduct(p))
    setJsonExtra('')
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setCategoryPickerOpen(false)
    setNewPresetName('')
  }

  const refreshCategoryPresets = useCallback(async () => {
    const catRows = await fetchCatalogCategories()
    setCategoryPresetRows(catRows)
  }, [])

  const onAddPresetCategory = async () => {
    const added = newPresetName.trim()
    if (!added) {
      toast.error('Enter a category name.')
      return
    }
    setPresetBusy(true)
    const res = await insertCatalogCategory(added)
    setPresetBusy(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    setNewPresetName('')
    await refreshCategoryPresets()
    setDraft((d) => ({ ...d, cat: added }))
    toast.success('Saved to list and applied to this product.')
  }

  const onRemovePresetCategory = async (row: CatalogCategoryRow) => {
    if (!adminConfirmDelete(row.name)) return
    setPresetBusy(true)
    const ok = await deleteCatalogCategory(row.id)
    setPresetBusy(false)
    if (!ok) {
      toast.error('Could not remove.')
      return
    }
    await refreshCategoryPresets()
    toast.success('Removed.')
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
    let p = productFromDraft(draft, galleryText, tagsText, colorDrafts)
    if (jsonExtra.trim()) {
      try {
        const parsed = JSON.parse(jsonExtra) as Record<string, unknown>
        p = { ...p, ...parsed } as Product
      } catch {
        toast.error('That extra data is not valid JSON. Remove it or fix the format.')
        return
      }
    }
    const imageUrls = getDefaultImageUrls(p)
    if (!p.slug.trim() || !p.name.trim() || !p.price.trim()) {
      toast.error('Please add the URL slug, product name, and selling price (SP).')
      return
    }
    if (!imageUrls.length) {
      toast.error('Add at least one photo: upload, paste a URL, gallery lines, or colour photos.')
      return
    }
    if (!p.img.trim() && imageUrls[0]) {
      p = { ...p, img: imageUrls[0] }
    }

    setSaving(true)
    if (editingId) {
      const res = await updateCatalogProduct(editingId, p)
      setSaving(false)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success('Product updated.')
        await load()
        closeEditor()
      }
    } else {
      const res = await insertCatalogProduct(p)
      setSaving(false)
      if (!res.ok) toast.error(res.message)
      else {
        toast.success('Product created.')
        await load()
        closeEditor()
      }
    }
  }

  const onDelete = async (row: CatalogProductRow) => {
    if (!adminConfirmDelete(row.payload.name || row.slug)) return
    const ok = await deleteCatalogProduct(row.id)
    if (!ok) toast.error('Could not delete.')
    else {
      toast.success('Deleted.')
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
    const r = await uploadProductImageFile(file)
    setUploadBusy(false)
    if (r.ok) {
      setDraft((d) => ({ ...d, img: r.publicUrl }))
      toast.success('Image uploaded.')
    } else toast.error(r.message)
  }

  const runGalleryUploads = async (files: FileList | null) => {
    if (!files?.length) return
    setUploadBusy(true)
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const r = await uploadProductImageFile(files[i]!)
      if (r.ok) urls.push(r.publicUrl)
      else {
        setUploadBusy(false)
        toast.error(r.message)
        return
      }
    }
    setUploadBusy(false)
    setGalleryText((prev) => [prev.replace(/\s+$/, ''), ...urls].filter(Boolean).join('\n'))
    toast.success(`${urls.length} images uploaded.`)
  }

  const runColorOptionUploads = async (files: FileList | null) => {
    const idx = colorUploadIdxRef.current
    colorUploadIdxRef.current = null
    if (idx === null || !files?.length) return
    setUploadBusy(true)
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const r = await uploadProductImageFile(files[i]!)
      if (r.ok) urls.push(r.publicUrl)
      else {
        setUploadBusy(false)
        toast.error(r.message)
        return
      }
    }
    setUploadBusy(false)
    if (!urls.length) return
    setColorDrafts((rows) =>
      rows.map((row, i) => {
        if (i !== idx) return row
        const cur = row.imagesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        return { ...row, imagesText: [...cur, ...urls].join('\n') }
      }),
    )
    toast.success(`${urls.length} variant images uploaded.`)
  }

  const removeColorOptionImageAt = (colorIdx: number, imageIdx: number) => {
    setColorDrafts((rows) =>
      rows.map((row, i) => {
        if (i !== colorIdx) return row
        const cur = row.imagesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
        cur.splice(imageIdx, 1)
        return { ...row, imagesText: cur.join('\n') }
      }),
    )
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
        <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => openProductMarginPrintReport(rows, orders)}
          className={
            'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[14px] font-bold ' +
            ad(theme, 'border-stone-200 text-stone-800 hover:bg-stone-50', 'border-neutral-600 text-neutral-100 hover:bg-neutral-800')
          }
        >
          <span className="material-symbols-outlined text-[20px] font-light">picture_as_pdf</span>
          Margin report (print / PDF)
        </button>
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
          <p className={muted + ' mt-1 text-[12px]'}>Tracked quantity at 0 — sold out or not released yet.</p>
        </div>
      </div>

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
                    setStockFilter('all')
                    setCollectionFilter('all')
                    setSearch('')
                  }}
                  className={'rounded-lg border px-3 py-1.5 text-[12px] font-semibold ' + ad(theme, 'border-stone-200 text-stone-700', 'border-neutral-600 text-neutral-200')}
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('all')}
                  className={
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold ' +
                    (stockFilter === 'all'
                      ? ad(theme, 'bg-stone-800 text-white', 'bg-neutral-200 text-neutral-900')
                      : ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800'))
                  }
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('in_stock')}
                  className={
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold ' +
                    (stockFilter === 'in_stock'
                      ? ad(theme, 'bg-emerald-100 text-emerald-900', 'bg-emerald-950/50 text-emerald-200')
                      : ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800'))
                  }
                >
                  In stock
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter('out_of_stock')}
                  className={
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold ' +
                    (stockFilter === 'out_of_stock'
                      ? ad(theme, 'bg-rose-100 text-rose-900', 'bg-rose-950/40 text-rose-200')
                      : ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800'))
                  }
                >
                  Out of stock
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

            <div className={'md:hidden space-y-3 border-t px-3 py-4 ' + ad(theme, 'border-stone-100 bg-stone-50/40', 'border-neutral-800 bg-neutral-950/25')}>
              {filteredRows.length === 0 ? (
                <p className={'py-8 text-center text-[14px] ' + muted}>
                  No products match these filters. Try clearing filters or add a new product.
                </p>
              ) : (
                filteredRows.map((row) => {
                  const p = row.payload
                  const thumb = getDefaultImageUrls(p)[0]
                  const stockLabel =
                    p.stockUnlimited === true
                      ? 'Unlimited'
                      : typeof p.stock === 'number'
                        ? String(p.stock)
                        : '—'
                  const stockCls = ad(theme, ...adminStockAdClasses(p))
                  const pub = isPublishedPayload(p)
                  const genderLabel = p.gender === 'unisex' ? 'unisex' : p.gender
                  const cpShort = p.cp?.trim() ? (p.cp.length > 14 ? `${p.cp.slice(0, 12)}…` : p.cp) : '—'
                  return (
                    <div
                      key={row.id}
                      className={'flex gap-3 rounded-xl border p-3 shadow-sm ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900/50')}
                    >
                      <input
                        type="checkbox"
                        className="mt-2 shrink-0 rounded border-stone-300"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        aria-label="Select row"
                      />
                      <TableThumb url={thumb} theme={theme} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className={'font-semibold leading-snug ' + ad(theme, 'text-stone-900', 'text-white')}>{p.name || row.slug}</p>
                        <p className={'mt-0.5 truncate font-mono text-[11px] ' + muted}>{row.slug}</p>
                        <div className={'mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] ' + muted}>
                          <span className="truncate">
                            <span className="font-semibold">Cat</span> {p.cat || '—'}
                          </span>
                          <span className="capitalize">
                            <span className="font-semibold">Who for</span> {genderLabel}
                          </span>
                          <span>
                            <span className="font-semibold">Stock</span>{' '}
                            <span className={stockCls}>{stockLabel}</span>
                          </span>
                        </div>
                        <div className={'mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]'}>
                          <span>
                            <span className={muted}>SP</span>{' '}
                            <span className={'font-bold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>{p.price || '—'}</span>
                          </span>
                          <span>
                            <span className={muted}>CP</span> <span className="font-mono tabular-nums">{cpShort}</span>
                          </span>
                          <span
                            className={
                              'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                              (pub
                                ? ad(theme, 'bg-sky-100 text-sky-800', 'bg-sky-950/50 text-sky-200')
                                : ad(theme, 'bg-amber-100 text-amber-900', 'bg-amber-950/40 text-amber-200'))
                            }
                          >
                            {pub ? 'Live' : 'Draft'}
                          </span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(row)}
                            className={
                              'inline-flex flex-1 items-center justify-center gap-1 rounded-lg border py-2 text-[12px] font-bold ' +
                              ad(theme, 'border-stone-200 text-stone-800 hover:bg-stone-50', 'border-neutral-600 text-neutral-100 hover:bg-neutral-800')
                            }
                          >
                            <span className="material-symbols-outlined text-[18px] font-light">edit</span>
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void onDelete(row)}
                            className={
                              'inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-[12px] font-bold text-rose-700 ' +
                              ad(theme, 'hover:bg-rose-50', 'border-rose-900/40 text-rose-300 hover:bg-rose-950/30')
                            }
                            aria-label="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px] font-light">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div className="hidden w-full overflow-x-auto md:block">
              <table className="w-full max-w-full table-fixed border-collapse text-left text-[12px] sm:text-[13px]">
                <thead>
                  <tr className={tableHead}>
                    <th className="w-9 px-1 py-2.5 sm:w-10 sm:px-2 sm:py-3">
                      <input
                        type="checkbox"
                        className="rounded border-stone-300"
                        checked={filteredRows.length > 0 && filteredRows.every((r) => selected.has(r.id))}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Select all visible"
                      />
                    </th>
                    <th className="w-[52px] px-1 py-2.5 sm:w-14 sm:px-2 sm:py-3">Image</th>
                    <th className="w-[28%] min-w-0 px-1 py-2.5 sm:px-2 sm:py-3">Product</th>
                    <th className="w-[13%] min-w-0 px-1 py-2.5 sm:px-2 sm:py-3">Category</th>
                    <th className="hidden w-12 px-1 py-2.5 text-center sm:table-cell sm:px-2 sm:py-3">Who for</th>
                    <th className="w-11 px-1 py-2.5 text-center sm:w-14 sm:px-2 sm:py-3">Stock</th>
                    <th className="hidden w-[72px] px-1 py-2.5 lg:table-cell lg:px-2 lg:py-3">CP</th>
                    <th className="min-w-0 px-1 py-2.5 sm:px-2 sm:py-3">SP</th>
                    <th className="hidden w-[92px] px-1 py-2.5 lg:table-cell lg:px-2 lg:py-3">Status</th>
                    <th className="w-[76px] px-1 py-2.5 text-right sm:w-24 sm:px-2 sm:py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className={'px-4 py-12 text-center text-[14px] ' + muted}>
                        No products match these filters. Try clearing filters or add a new product.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => {
                      const p = row.payload
                      const thumb = getDefaultImageUrls(p)[0]
                      const stockLabel =
                        p.stockUnlimited === true
                          ? '∞'
                          : typeof p.stock === 'number'
                            ? String(p.stock)
                            : '—'
                      const stockCls = ad(theme, ...adminStockAdClasses(p))
                      const pub = isPublishedPayload(p)
                      const genderLabel = p.gender === 'unisex' ? 'unisex' : p.gender
                      const cpCell = p.cp?.trim() ? p.cp.trim() : '—'
                      return (
                        <tr key={row.id} className={ad(theme, 'hover:bg-stone-50/80', 'hover:bg-neutral-800/40')}>
                          <td className={'px-1 py-2 align-middle sm:px-2 ' + tableCell}>
                            <input type="checkbox" className="rounded border-stone-300" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} />
                          </td>
                          <td className={'px-1 py-2 align-middle sm:px-2 ' + tableCell}>
                            <TableThumb url={thumb} theme={theme} />
                          </td>
                          <td className={'min-w-0 max-w-0 px-1 py-2 align-middle sm:px-2 ' + tableCell}>
                            <p className={'truncate font-semibold ' + ad(theme, 'text-stone-900', 'text-white')}>{p.name || row.slug}</p>
                            <p className={'truncate font-mono text-[10px] sm:text-[11px] ' + muted}>{row.slug}</p>
                          </td>
                          <td className={'min-w-0 max-w-0 truncate px-1 py-2 align-middle sm:px-2 ' + tableCell}>{p.cat || '—'}</td>
                          <td className={'hidden px-1 py-2 text-center align-middle text-[11px] capitalize sm:table-cell sm:px-2 ' + tableCell}>{genderLabel}</td>
                          <td
                            className={
                              'px-1 py-2 text-center align-middle tabular-nums sm:px-2 ' + tableCell + ' ' + stockCls
                            }
                            title={p.stockUnlimited === true ? 'Unlimited' : stockLabel}
                          >
                            {p.stockUnlimited === true ? '∞' : stockLabel}
                          </td>
                          <td className={'hidden min-w-0 max-w-[5.5rem] truncate px-1 py-2 align-middle font-mono text-[11px] tabular-nums lg:table-cell lg:max-w-[7rem] lg:px-2 ' + tableCell}>
                            {cpCell}
                          </td>
                          <td className={'min-w-0 truncate px-1 py-2 align-middle font-semibold tabular-nums sm:px-2 ' + tableCell}>{p.price || '—'}</td>
                          <td className={'hidden px-1 py-2 align-middle lg:table-cell lg:px-2 ' + tableCell}>
                            <span
                              className={
                                'inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                                (pub
                                  ? ad(theme, 'bg-sky-100 text-sky-800', 'bg-sky-950/50 text-sky-200')
                                  : ad(theme, 'bg-amber-100 text-amber-900', 'bg-amber-950/40 text-amber-200'))
                              }
                            >
                              {pub ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td className={'px-1 py-2 text-right align-middle sm:px-2 ' + tableCell}>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className={'mr-0.5 inline-flex size-8 items-center justify-center rounded-lg border sm:mr-1 sm:size-9 ' + ad(theme, 'border-stone-200 text-stone-700 hover:bg-stone-100', 'border-neutral-600 text-neutral-200 hover:bg-neutral-800')}
                              aria-label="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px] font-light">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDelete(row)}
                              className={'inline-flex size-8 items-center justify-center rounded-lg border text-rose-700 sm:size-9 ' + ad(theme, 'border-rose-200 hover:bg-rose-50', 'border-rose-900/40 text-rose-300 hover:bg-rose-950/30')}
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
          <div className="px-2 py-1 sm:px-4">
            {collectionsGrouped.length === 0 ? (
              <p className={'p-8 text-center ' + muted}>No products yet.</p>
            ) : (
              collectionsGrouped.map(([cat, list]) => {
                const isOpen = collectionsOpen.has(cat)
                return (
                  <div
                    key={cat}
                    className={'border-b last:border-b-0 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setCollectionsOpen((prev) => {
                          const next = new Set(prev)
                          if (next.has(cat)) next.delete(cat)
                          else next.add(cat)
                          return next
                        })
                      }
                      className={
                        'flex w-full items-center justify-between gap-3 py-3 text-left transition-colors ' +
                        ad(theme, 'hover:bg-stone-50/80', 'hover:bg-neutral-800/40')
                      }
                      aria-expanded={isOpen}
                    >
                      <span className={'min-w-0 text-[15px] font-bold ' + ad(theme, 'text-stone-900', 'text-white')}>
                        {cat}{' '}
                        <span className={muted + ' text-[13px] font-normal'}>({list.length})</span>
                      </span>
                      <span className={'material-symbols-outlined shrink-0 text-[22px] ' + muted} aria-hidden>
                        {isOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {isOpen ? (
                      <ul className="space-y-1 pb-3">
                        {list.map((row) => (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className={
                                'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[13px] ' +
                                ad(theme, 'hover:bg-stone-50', 'hover:bg-neutral-800/50')
                              }
                            >
                              <TableThumb url={getDefaultImageUrls(row.payload)[0]} theme={theme} />
                              <span className={'min-w-0 flex-1 truncate font-medium ' + ad(theme, 'text-stone-800', 'text-neutral-100')}>
                                {row.payload.name || row.slug}
                              </span>
                              <span className={muted + ' shrink-0 text-[12px]'}>{row.payload.price || '—'}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                )
              })
            )}
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
            <div className={'flex shrink-0 flex-col gap-1 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
              <div>
                <p className={'text-[16px] font-bold ' + ad(theme, 'text-stone-900', 'text-white')}>{editingId ? 'Edit product' : 'New product'}</p>
                <p className={muted + ' mt-0.5 max-w-md text-[12px] leading-snug'}>
                  Same form for new and edit — scroll for CP, SP, compare-at, unlimited stock, gallery uploads, and colour options.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className={'flex size-9 shrink-0 items-center justify-center rounded-full self-start sm:self-center ' + ad(theme, 'text-stone-500 hover:bg-stone-100', 'text-neutral-400 hover:bg-neutral-800')}
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                <input
                  ref={galleryFilesRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => void runGalleryUploads(e.target.files)}
                />
                <input
                  ref={colorOptionFilesRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void runColorOptionUploads(e.target.files)
                    e.target.value = ''
                  }}
                />
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
                  <label className={label}>Link name (URL slug)</label>
                  <input className={fieldBox(theme)} value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))} placeholder="e.g. rose-gold-hoops" />
                  <p className={muted + ' mt-1 text-[12px] leading-relaxed'}>
                    Used in the address bar as <span className="font-mono">/product/your-slug</span>. Lowercase, hyphens, no spaces.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Name</label>
                  <input className={fieldBox(theme)} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Category</label>
                  <div className="mt-1 flex min-w-0 flex-wrap gap-2">
                    <input
                      className={fieldBox(theme) + ' min-w-0 flex-1'}
                      list="tle-admin-category-picklist"
                      value={draft.cat}
                      onChange={(e) => setDraft((d) => ({ ...d, cat: e.target.value }))}
                      placeholder="Type or pick from suggestions"
                    />
                    <button
                      type="button"
                      onClick={() => setCategoryPickerOpen(true)}
                      className={
                        'shrink-0 rounded-xl border px-4 py-2.5 text-[13px] font-semibold ' +
                        ad(theme, 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50', 'border-neutral-600 bg-neutral-950 text-neutral-100 hover:bg-neutral-800')
                      }
                    >
                      Browse
                    </button>
                  </div>
                  <datalist id="tle-admin-category-picklist">
                    {categoryPicklist.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={label}>Who is this for? (shop sections)</label>
                  <select
                    className={fieldBox(theme)}
                    value={draft.gender}
                    onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value as ProductGender }))}
                  >
                    <option value="her">For her</option>
                    <option value="him">For him</option>
                    <option value="unisex">Unisex — for anyone</option>
                  </select>
                </div>
                <div>
                  <label className={label}>CP — cost price (optional)</label>
                  <input
                    className={fieldBox(theme)}
                    value={draft.cp ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, cp: e.target.value || undefined }))}
                    placeholder="What you paid / unit"
                  />
                </div>
                <div>
                  <label className={label}>SP — selling price (shop)</label>
                  <input className={fieldBox(theme)} value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} placeholder="₦12,000" />
                </div>
                <div>
                  <label className={label}>Compare-at (optional)</label>
                  <input
                    className={fieldBox(theme)}
                    value={draft.compareAt ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, compareAt: e.target.value || undefined }))}
                    placeholder="Higher “was” price — auto sale badge if above SP"
                  />
                </div>
                {parseProductPriceNgn(draft.price) > 0 && parseProductPriceNgn(draft.cp) >= 0 ? (
                  <div className="sm:col-span-2">
                    <p className={muted + ' text-[12px]'}>
                      Est. margin per unit:{' '}
                      <span className={'font-semibold tabular-nums ' + ad(theme, 'text-stone-900', 'text-white')}>
                        {formatNaira(parseProductPriceNgn(draft.price) - parseProductPriceNgn(draft.cp))}
                      </span>
                    </p>
                  </div>
                ) : null}
                <div>
                  <label className={label}>In stock (optional)</label>
                  <input
                    className={fieldBox(theme)}
                    type="number"
                    min={0}
                    step={1}
                    placeholder="e.g. 24"
                    disabled={draft.stockUnlimited === true}
                    value={draft.stock === undefined ? '' : draft.stock}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '') setDraft((d) => ({ ...d, stock: undefined }))
                      else setDraft((d) => ({ ...d, stock: Math.max(0, Math.floor(Number(v)) || 0) }))
                    }}
                  />
                  <p className={muted + ' mt-1 text-[12px]'}>0 = sold out on the shop. Leave empty if you are not counting units.</p>
                </div>
                <div className="flex flex-col justify-end gap-2">
                  <label className={'flex cursor-pointer items-center gap-2 text-[13px] font-medium ' + ad(theme, 'text-stone-800', 'text-neutral-100')}>
                    <input
                      type="checkbox"
                      className="rounded border-stone-300"
                      checked={draft.stockUnlimited === true}
                      onChange={(e) => {
                        const on = e.target.checked
                        setDraft((d) =>
                          on ? { ...d, stockUnlimited: true, stock: undefined } : { ...d, stockUnlimited: false },
                        )
                      }}
                    />
                    <span>Unlimited stock</span>
                  </label>
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
                  <label className={label}>Extra gallery URLs (optional)</label>
                  <textarea className={fieldBox(theme) + ' min-h-[56px] resize-y font-mono text-[12px]'} value={galleryText} onChange={(e) => setGalleryText(e.target.value)} />
                  <p className={muted + ' mt-1 text-[12px]'}>Usually leave empty and use “Add gallery photos” above.</p>
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Tags (comma-separated)</label>
                  <input className={fieldBox(theme)} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="NEW, GOLD, GIFT" />
                </div>
              </div>

              <div className={'mt-4 rounded-xl border p-4 ' + ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-950/40')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className={label}>Colours &amp; finishes (optional)</p>
                    <p className={muted + ' mt-1 max-w-xl text-[12px]'}>
                      Optional. Add a row per colour or finish; shoppers pick one on the product page. Leave empty for a single version.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setColorDrafts((c) => [
                        ...c,
                        { id: nextColorOptionId(c), label: '', swatch: '#8b7355', price: '', imagesText: '' },
                      ])
                    }
                    className={
                      'shrink-0 rounded-lg border px-3 py-2 text-[12px] font-bold ' +
                      ad(theme, 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100', 'border-emerald-800 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-950/70')
                    }
                  >
                    + Add colour option
                  </button>
                </div>
                <div className="mt-4 space-y-4">
                  {colorDrafts.length === 0 ? null : (
                    colorDrafts.map((c, idx) => {
                      const optionUrls = c.imagesText
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                      return (
                      <div
                        key={idx}
                        className={'rounded-xl border p-4 ' + ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900/60')}
                      >
                        <p className={'mb-3 text-[11px] font-bold uppercase tracking-wide ' + ad(theme, 'text-stone-500', 'text-neutral-500')}>
                          Colour option {idx + 1}
                        </p>
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                          <div
                            className="size-12 shrink-0 rounded-full border-2 border-black/15 shadow-inner"
                            style={{ backgroundColor: swatchForColorInput(c.swatch) }}
                            aria-hidden
                          />
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <span className={muted + ' shrink-0 text-[12px]'}>Colour</span>
                            <input
                              type="color"
                              className={
                                'h-11 w-[4.25rem] shrink-0 cursor-pointer overflow-hidden rounded-lg border p-0 ' +
                                ad(theme, 'border-stone-300', 'border-neutral-600')
                              }
                              value={swatchForColorInput(c.swatch)}
                              onChange={(e) =>
                                setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, swatch: e.target.value } : x)))
                              }
                              aria-label="Pick swatch colour"
                            />
                            <span className={muted + ' shrink-0 text-[12px]'}>or type</span>
                            <input
                              className={fieldBox(theme) + ' max-w-[9rem] font-mono text-[12px]'}
                              placeholder="#8b7355"
                              value={c.swatch}
                              onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, swatch: e.target.value } : x)))}
                              spellCheck={false}
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className={label}>Label (shop)</label>
                            <input
                              className={fieldBox(theme)}
                              placeholder="e.g. Shape: Diamond"
                              value={c.label}
                              onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                            />
                          </div>
                          <div>
                            <label className={label}>Variant ID</label>
                            <input
                              className={fieldBox(theme) + ' font-mono text-[12px]'}
                              placeholder="e.g. lady-v-6779009"
                              value={c.id}
                              onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)))}
                            />
                          </div>
                          <div>
                            <label className={label}>Price override (optional)</label>
                            <input
                              className={fieldBox(theme)}
                              placeholder="Blank = main selling price"
                              value={c.price}
                              onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))}
                            />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className={label}>Photos for this option (optional)</label>
                          <p className={muted + ' mt-1 text-[12px]'}>
                            Upload from your computer — stored like main photos. If you add none, the shop uses the main product images.
                          </p>
                          {optionUrls.length > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {optionUrls.map((u, imgIdx) => (
                                  <div key={`${u}-${imgIdx}`} className="relative shrink-0">
                                    <TableThumb url={u} theme={theme} size="lg" />
                                    <button
                                      type="button"
                                      disabled={uploadBusy}
                                      onClick={() => removeColorOptionImageAt(idx, imgIdx)}
                                      className={
                                        'absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border text-[12px] font-bold shadow ' +
                                        ad(theme, 'border-stone-200 bg-white text-stone-700 hover:bg-rose-50', 'border-neutral-600 bg-neutral-900 text-neutral-200 hover:bg-rose-950/50')
                                      }
                                      aria-label="Remove photo"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          <div className="mt-2">
                            <button
                              type="button"
                              disabled={uploadBusy}
                              onClick={() => {
                                colorUploadIdxRef.current = idx
                                colorOptionFilesRef.current?.click()
                              }}
                              className={
                                'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50 ' +
                                ad(theme, 'border-emerald-300 bg-emerald-50 text-emerald-900', 'border-emerald-800 bg-emerald-950/40 text-emerald-200')
                              }
                            >
                              <span className="material-symbols-outlined text-[20px] font-light">upload</span>
                              {uploadBusy ? 'Uploading…' : 'Upload photos'}
                            </button>
                          </div>
                          <details className={'mt-2 rounded-lg border px-3 py-2 ' + ad(theme, 'border-stone-200 bg-stone-50/80', 'border-neutral-700 bg-neutral-950/40')}>
                            <summary className={'cursor-pointer text-[12px] font-semibold ' + ad(theme, 'text-stone-700', 'text-neutral-300')}>
                              Paste image URLs instead
                            </summary>
                            <textarea
                              className={fieldBox(theme) + ' mt-2 min-h-[56px] font-mono text-[11px]'}
                              placeholder="One URL per line"
                              value={c.imagesText}
                              onChange={(e) => setColorDrafts((a) => a.map((x, i) => (i === idx ? { ...x, imagesText: e.target.value } : x)))}
                            />
                          </details>
                        </div>
                        <div className="mt-3 text-right">
                          <button
                            type="button"
                            className={'text-[12px] font-semibold ' + ad(theme, 'text-rose-700 hover:underline', 'text-rose-300 hover:underline')}
                            onClick={() => {
                              if (!adminConfirmDelete('this colour option')) return
                              setColorDrafts((a) => a.filter((_, i) => i !== idx))
                            }}
                          >
                            Remove this option
                          </button>
                        </div>
                      </div>
                      )
                    })
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

      {editorOpen && categoryPickerOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="tle-cat-picker-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close category list"
            onClick={() => setCategoryPickerOpen(false)}
          />
          <div
            className={
              'relative z-10 flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:rounded-2xl ' +
              ad(theme, 'bg-white', 'bg-neutral-900')
            }
          >
            <div className={'flex items-center justify-between gap-2 border-b px-4 py-3 ' + ad(theme, 'border-stone-100', 'border-neutral-800')}>
              <p id="tle-cat-picker-title" className={ad(theme, 'text-[15px] font-bold text-stone-900', 'text-[15px] font-bold text-white')}>
                Pick category
              </p>
              <button
                type="button"
                onClick={() => setCategoryPickerOpen(false)}
                className={'rounded-lg px-3 py-1.5 text-[12px] font-semibold ' + ad(theme, 'text-stone-600 hover:bg-stone-100', 'text-neutral-300 hover:bg-neutral-800')}
              >
                Close
              </button>
            </div>
            <ul className="min-h-0 flex-1 list-none overflow-y-auto p-2">
              {categoryPresetRows.length === 0 ? (
                <li className={muted + ' px-3 py-8 text-center text-[13px]'}>None saved yet — add below.</li>
              ) : (
                categoryPresetRows.map((r) => (
                  <li
                    key={r.id}
                    className={'flex items-center justify-between gap-2 rounded-xl px-2 py-1 ' + ad(theme, 'hover:bg-stone-50', 'hover:bg-neutral-800/60')}
                  >
                    <button
                      type="button"
                      disabled={presetBusy}
                      onClick={() => {
                        setDraft((d) => ({ ...d, cat: r.name }))
                        setCategoryPickerOpen(false)
                      }}
                      className={
                        'min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-[14px] font-medium ' +
                        ad(theme, 'text-stone-900', 'text-neutral-100')
                      }
                    >
                      {r.name}
                    </button>
                    <button
                      type="button"
                      disabled={presetBusy}
                      onClick={() => void onRemovePresetCategory(r)}
                      className={'shrink-0 rounded-lg px-2 py-2 text-[12px] font-semibold ' + ad(theme, 'text-rose-700 hover:underline', 'text-rose-300 hover:underline')}
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className={'border-t p-4 ' + ad(theme, 'border-stone-100 bg-stone-50/80', 'border-neutral-800 bg-neutral-950/50')}>
              <label className={muted + ' text-[11px] font-bold uppercase tracking-wide'} htmlFor="tle-new-cat-input">
                Add to list
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="tle-new-cat-input"
                  className={fieldBox(theme) + ' min-w-0 flex-1'}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="New category name"
                />
                <button
                  type="button"
                  disabled={presetBusy || !newPresetName.trim()}
                  onClick={() => void onAddPresetCategory()}
                  className={
                    'shrink-0 rounded-xl px-4 py-2.5 text-[13px] font-bold disabled:opacity-50 ' +
                    ad(theme, 'bg-emerald-600 text-white', 'bg-emerald-600 text-white')
                  }
                >
                  {presetBusy ? '…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
