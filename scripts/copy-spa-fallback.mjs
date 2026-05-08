import { copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(process.cwd(), 'dist')
const index = join(dist, 'index.html')
const fallback = join(dist, '404.html')

if (!existsSync(index)) {
  console.warn('copy-spa-fallback: dist/index.html missing (skip)')
  process.exit(0)
}

copyFileSync(index, fallback)
