import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

const BUCKET = 'product-media'

function safeExt(filename: string): string {
  const raw = filename.split('.').pop() ?? 'jpg'
  const cleaned = raw.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return cleaned || 'jpg'
}

/** Upload a product image to Supabase Storage; returns public URL for use in `Product.img` / gallery. */
export async function uploadProductImageFile(
  file: File,
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: 'Supabase is not configured.' }
  const supabase = getSupabase()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return { ok: false, message: 'Sign in as an admin to upload images.' }

  const ext = safeExt(file.name)
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) {
    const hint =
      error.message?.includes('Bucket not found') || error.message?.includes('not found')
        ? ' Create the "product-media" bucket in Supabase (Storage) or apply the latest migration.'
        : ''
    return { ok: false, message: (error.message || 'Upload failed.') + hint }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) return { ok: false, message: 'Could not get public URL for upload.' }
  return { ok: true, publicUrl: data.publicUrl }
}
