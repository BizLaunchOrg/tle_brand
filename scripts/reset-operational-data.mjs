/**
 * Clear payment-proof storage buckets (Supabase forbids DELETE on storage.objects in SQL).
 *
 * Env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   npm run reset:storage
 *
 * For database rows (orders, bookings, carts), run supabase/scripts/reset-operational-data.sql
 * in the Supabase SQL Editor, or pass --db to also delete via API:
 *
 *   node scripts/reset-operational-data.mjs --db
 */
import { createClient } from '@supabase/supabase-js'

const BUCKETS = ['order-payment-proofs', 'makeup-booking-payment-proofs']

const DB_TABLES = [
  { table: 'orders', column: 'id' },
  { table: 'makeup_bookings', column: 'id' },
  { table: 'user_cart_items', column: 'user_id' },
  { table: 'user_favorites', column: 'user_id' },
  { table: 'user_addresses', column: 'id' },
  { table: 'push_subscriptions', column: 'id' },
]

function envClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Recursively collect file paths under a bucket prefix. */
async function collectPaths(sb, bucket, prefix = '') {
  const paths = []
  const { data, error } = await sb.storage.from(bucket).list(prefix, { limit: 1000 })
  if (error) throw new Error(`${bucket}/${prefix || '(root)'}: ${error.message}`)

  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id) {
      paths.push(full)
    } else {
      paths.push(...(await collectPaths(sb, bucket, full)))
    }
  }
  return paths
}

async function emptyBucket(sb, bucket) {
  const paths = await collectPaths(sb, bucket)
  if (!paths.length) {
    console.log(`  ${bucket}: already empty`)
    return 0
  }
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100)
    const { error } = await sb.storage.from(bucket).remove(batch)
    if (error) throw new Error(`${bucket} remove: ${error.message}`)
  }
  console.log(`  ${bucket}: removed ${paths.length} file(s)`)
  return paths.length
}

async function clearDbTables(sb) {
  for (const { table, column } of DB_TABLES) {
    const { error, count } = await sb.from(table).delete({ count: 'exact' }).not(column, 'is', null)
    if (error) throw new Error(`${table}: ${error.message}`)
    console.log(`  ${table}: deleted ${count ?? '?'} row(s)`)
  }
}

async function main() {
  const withDb = process.argv.includes('--db')
  const sb = envClient()

  console.log('Clearing payment-proof storage…')
  let files = 0
  for (const bucket of BUCKETS) {
    files += await emptyBucket(sb, bucket)
  }

  if (withDb) {
    console.log('Clearing database tables (service role)…')
    await clearDbTables(sb)
  } else {
    console.log('\nDatabase not touched. Run supabase/scripts/reset-operational-data.sql in SQL Editor, or re-run with --db')
  }

  console.log(`\nDone. ${files} storage file(s) removed.`)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
