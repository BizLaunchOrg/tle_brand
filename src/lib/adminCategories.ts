import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export type CatalogCategoryRow = {
  id: string
  name: string
  created_at: string
}

export async function fetchCatalogCategories(): Promise<CatalogCategoryRow[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await getSupabase()
    .from('catalog_categories')
    .select('id, name, created_at')
    .order('name', { ascending: true })

  if (error || !data) return []
  return data as CatalogCategoryRow[]
}

export async function insertCatalogCategory(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const n = name.trim()
  if (!n) return { ok: false, message: 'Enter a category name.' }
  if (!isSupabaseConfigured()) return { ok: false, message: 'Not configured.' }

  const { data, error } = await getSupabase()
    .from('catalog_categories')
    .insert({ name: n })
    .select('id')
    .maybeSingle()

  if (error) {
    if (error.code === '23505') return { ok: false, message: 'That category already exists.' }
    return { ok: false, message: 'Could not add category.' }
  }
  if (!data?.id) return { ok: false, message: 'Could not add category.' }
  return { ok: true, id: data.id as string }
}

export async function deleteCatalogCategory(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !id.trim()) return false
  const { error } = await getSupabase().from('catalog_categories').delete().eq('id', id.trim())
  return !error
}
