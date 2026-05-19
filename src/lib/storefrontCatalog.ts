import type { Product } from '../data/products.ts'
import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

/** Rows from `catalog_products.payload`, newest first. Empty if Supabase off or no rows. */
export async function fetchStorefrontCatalogProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('catalog_products')
    .select('payload')
    .order('updated_at', { ascending: false })

  if (error || !data?.length) return []
  return data
    .map((r) => r.payload as Product)
    .filter((p) => p && typeof p.slug === 'string' && p.published !== false)
}
