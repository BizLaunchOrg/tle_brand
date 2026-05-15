import { getSupabase } from './supabaseClient'
import { isSupabaseConfigured } from './mapSupabaseAuthError'

export const ORDER_PAYMENT_PROOF_BUCKET = 'order-payment-proofs' as const

const MAX_BYTES = 5 * 1024 * 1024

function extensionFor(file: File): string {
  const n = file.name.trim()
  const fromName = n.includes('.') ? n.slice(n.lastIndexOf('.') + 1).toLowerCase() : ''
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 8) return fromName
  const t = file.type.toLowerCase()
  if (t === 'image/jpeg') return 'jpg'
  if (t === 'image/png') return 'png'
  if (t === 'image/webp') return 'webp'
  if (t === 'image/gif') return 'gif'
  if (t === 'image/heic' || t === 'image/heif') return 'heic'
  return 'jpg'
}

export async function uploadOrderPaymentProof(
  orderId: string,
  file: File,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Checkout is not configured.' }
  }
  const id = orderId.trim()
  if (!id) return { ok: false, message: 'Could not prepare your order. Please refresh and try again.' }

  if (!file.type.startsWith('image/')) {
    return { ok: false, message: 'Please upload an image (screenshot of your transfer).' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: 'Image must be 5 MB or smaller.' }
  }

  const ext = extensionFor(file)
  const path = `${id}/payment-receipt.${ext}`

  const { error } = await getSupabase()
    .storage.from(ORDER_PAYMENT_PROOF_BUCKET)
    .upload(path, file, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    })

  if (error) {
    return { ok: false, message: 'Could not upload your payment screenshot. Please try again.' }
  }

  return { ok: true, path }
}

export async function getOrderPaymentProofSignedUrl(
  storagePath: string,
  expiresSec = 3600,
): Promise<string | null> {
  if (!isSupabaseConfigured() || !storagePath.trim()) return null
  const { data, error } = await getSupabase()
    .storage.from(ORDER_PAYMENT_PROOF_BUCKET)
    .createSignedUrl(storagePath.trim(), expiresSec)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
