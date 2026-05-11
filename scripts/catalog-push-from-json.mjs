/**
 * Upsert an array of TLE-shaped product objects into Supabase `catalog_products`
 * (service role key bypasses RLS). Use for bulk imports or backups — not wired to any external shop.
 *
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/catalog-push-from-json.mjs --file catalog-products.json
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

function parseArgs() {
  const args = process.argv.slice(2)
  let file = 'catalog-products.json'
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) file = args[++i]
  }
  return { file }
}

export async function pushCatalogFromFile(absPath) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  }

  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`)
  }

  const products = JSON.parse(fs.readFileSync(absPath, 'utf8'))
  if (!Array.isArray(products)) {
    throw new Error('JSON must be an array of product objects.')
  }

  const rows = products.map((p) => ({
    slug: p.slug,
    payload: p,
    updated_at: new Date().toISOString(),
  }))

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await sb.from('catalog_products').upsert(rows, { onConflict: 'slug' })
  if (error) throw error
  return rows.length
}

async function main() {
  const { file } = parseArgs()
  const n = await pushCatalogFromFile(path.resolve(file))
  console.error(`Upserted ${n} row(s) into catalog_products.`)
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
