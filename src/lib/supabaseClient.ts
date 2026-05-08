import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/** Creates or returns the singleton client. Throws if env vars are missing. */
export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on your host (Vercel → Settings → Environment Variables), then redeploy.',
    )
  }
  client = createClient(url, anonKey)
  return client
}
