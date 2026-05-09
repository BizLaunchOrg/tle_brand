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

export async function insertCatalogProduct(product: Product): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }
  const { error } = await getSupabase().from('catalog_products').insert({
    slug: product.slug,
    payload: product,
  })
  if (error) {
    if (error.code === '23505') return { ok: false, message: 'That slug already exists in staging.' }
    return { ok: false, message: 'Could not save product.' }
  }
  return { ok: true }
}

export async function deleteCatalogProduct(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const { error } = await getSupabase().from('catalog_products').delete().eq('id', id)
  return !error
}
