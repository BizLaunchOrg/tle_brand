/**
 * Regenerates favicon / PWA sizes from public/tlelogo.PNG.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'public', 'tlelogo.PNG')

const sizes = [
  ['icon-16.png', 16],
  ['icon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]

for (const [name, w] of sizes) {
  const out = path.join(root, 'public', name)
  await sharp(src)
    .resize(w, w, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(out)
  console.log('wrote', name)
}
