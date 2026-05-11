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
    const internal = (error.message || '').toLowerCase()
    const bucketMissing =
      internal.includes('bucket not found') ||
      internal.includes('no such bucket') ||
      (internal.includes('bucket') &&
        (internal.includes('not found') || internal.includes('does not exist')))
    if (bucketMissing) {
      return {
        ok: false,
        message:
          'Upload could not complete. Create the "product-media" storage bucket in Supabase (or apply the latest migration), then try again.',
      }
    }
    return {
      ok: false,
      message: 'Upload could not complete. Sign in as an admin and try again, or check your connection.',
    }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) return { ok: false, message: 'Could not get public URL for upload.' }
  return { ok: true, publicUrl: data.publicUrl }
}
