import type { Product } from '../data/products.ts'
import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export type CatalogProductRow = {
  id: string
  slug: string
  payload: Product
  created_at: string
  updated_at: string
}

export async function fetchCatalogProducts(): Promise<CatalogProductRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('catalog_products')
    .select('id, slug, payload, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error || !data) return []
  return data as CatalogProductRow[]
}

export async function insertCatalogProduct(
  product: Product,
): Promise<{ ok: true; row: CatalogProductRow } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { data, error } = await getSupabase()
    .from('catalog_products')
    .insert({
      slug: product.slug,
      payload: product,
    })
    .select('id, slug, payload, created_at, updated_at')
    .single()
  if (error) {
    if (error.code === '23505') return { ok: false, message: 'That slug already exists in staging.' }
    return { ok: false, message: 'Could not save product.' }
  }
  if (!data) return { ok: false, message: 'Could not save product.' }
  return { ok: true, row: data as CatalogProductRow }
}

export async function deleteCatalogProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await getSupabase().from('catalog_products').delete().eq('id', id)
  return !error
}

export async function updateCatalogProduct(
  id: string,
  product: Product,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase()
    .from('catalog_products')
    .update({
      slug: product.slug,
      payload: product,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { ok: false, message: 'That slug is already used by another row.' }
    return { ok: false, message: 'Could not update product.' }
  }
  return { ok: true }
}

/** For enriching order line items when older rows lack snapshots. */
export async function fetchCatalogPayloadsBySlugs(slugs: string[]): Promise<Map<string, Product>> {
  const map = new Map<string, Product>()
  const uniq = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))]
  if (!isSupabaseConfigured() || uniq.length === 0) return map

  const { data, error } = await getSupabase().from('catalog_products').select('slug, payload').in('slug', uniq)

  if (error || !data) return map
  for (const row of data as { slug: string; payload: Product }[]) {
    if (!row?.slug || !row.payload || typeof row.payload !== 'object') continue
    const p = row.payload as Product
    const slugKey = row.slug.trim()
    map.set(slugKey, p)
    map.set(slugKey.toLowerCase(), p)
    const payloadSlug = typeof p.slug === 'string' ? p.slug.trim() : ''
    if (payloadSlug) {
      map.set(payloadSlug, p)
      map.set(payloadSlug.toLowerCase(), p)
    }
  }
  return map
}
