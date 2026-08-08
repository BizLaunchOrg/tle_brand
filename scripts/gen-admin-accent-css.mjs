import { writeFileSync } from 'node:fs'

const tokens = `
bg-emerald-100
bg-emerald-50
bg-emerald-50/30
bg-emerald-50/50
bg-emerald-50/60
bg-emerald-50/80
bg-emerald-50/90
bg-emerald-500
bg-emerald-600
bg-emerald-700
bg-emerald-900/50
bg-emerald-950/20
bg-emerald-950/25
bg-emerald-950/30
bg-emerald-950/35
bg-emerald-950/40
bg-emerald-950/45
bg-emerald-950/50
border-emerald-100
border-emerald-100/80
border-emerald-200
border-emerald-300
border-emerald-400
border-emerald-400/60
border-emerald-500
border-emerald-600
border-emerald-700
border-emerald-800
border-emerald-800/40
border-emerald-800/50
border-emerald-800/60
border-emerald-900/30
border-emerald-900/40
decoration-emerald-200
decoration-emerald-800
focus:border-emerald-500
focus:ring-emerald-500
focus:ring-emerald-500/20
focus:ring-emerald-500/25
focus:ring-emerald-500/30
hover:bg-emerald-100
hover:bg-emerald-50/40
hover:bg-emerald-50/50
hover:bg-emerald-500
hover:bg-emerald-700
hover:bg-emerald-900/50
hover:bg-emerald-950/15
hover:bg-emerald-950/20
hover:bg-emerald-950/50
hover:bg-emerald-950/55
hover:bg-emerald-950/70
hover:border-emerald-300
hover:border-emerald-400
hover:border-emerald-500
hover:border-emerald-700
hover:text-emerald-200
hover:text-emerald-300
hover:text-emerald-800
hover:text-emerald-900
ring-emerald-200/80
ring-emerald-400
ring-emerald-500
ring-emerald-500/80
ring-emerald-600
ring-emerald-800/50
shadow-emerald-600/20
shadow-emerald-600/25
shadow-emerald-900/20
shadow-emerald-900/25
shadow-emerald-900/40
shadow-emerald-900/5
text-emerald-100
text-emerald-200
text-emerald-300
text-emerald-300/90
text-emerald-400
text-emerald-400/90
text-emerald-50
text-emerald-600
text-emerald-600/70
text-emerald-700
text-emerald-700/90
text-emerald-800
text-emerald-800/80
text-emerald-900
text-emerald-900/80
dark:bg-emerald-950/35
dark:text-emerald-100
dark:text-emerald-400
`
  .trim()
  .split(/\n/)

function shadeKey(t) {
  const m = t.match(/emerald-(\d+)/)
  return m ? Number(m[1]) : 600
}
function alpha(t) {
  const m = t.match(/\/(\d+)$/)
  return m ? Number(m[1]) / 100 : 1
}
function isHover(t) {
  return t.startsWith('hover:')
}
function isFocus(t) {
  return t.startsWith('focus:')
}
function isDark(t) {
  return t.startsWith('dark:')
}
function baseToken(t) {
  return t.replace(/^(hover:|focus:|dark:)+/, '')
}
function prop(t) {
  const b = baseToken(t)
  if (b.startsWith('bg-')) return 'background-color'
  if (b.startsWith('text-')) return 'color'
  if (b.startsWith('border-')) return 'border-color'
  if (b.startsWith('decoration-')) return 'text-decoration-color'
  if (b.startsWith('ring-') || t.includes('ring-')) return 'ring'
  if (b.startsWith('shadow-')) return 'shadow'
  return 'color'
}
function colorExpr(t) {
  const s = shadeKey(t)
  const a = alpha(t)
  const deep = s >= 700
  const soft = s <= 200
  const base = deep ? 'var(--admin-accent-deep)' : 'var(--admin-accent)'
  if (soft) {
    const p = Math.max(6, Math.min(22, Math.round((s === 50 ? 10 : s === 100 ? 14 : 20) * a)))
    return `color-mix(in srgb, var(--admin-accent) ${p}%, white)`
  }
  if (s >= 950 || (s >= 900 && a < 1)) {
    const p = Math.round(18 + a * 35)
    return `color-mix(in srgb, var(--admin-accent-deep) ${p}%, black)`
  }
  if (a < 1 && !soft) {
    return `color-mix(in srgb, ${base} ${Math.round(a * 100)}%, transparent)`
  }
  return base
}

let css = `/* Admin accent remaps emerald utilities inside .admin-shell only. Auto-generated — run: node scripts/gen-admin-accent-css.mjs */
:root {
  --admin-accent: #059669;
  --admin-accent-deep: #047857;
  --admin-accent-rgb: 5 150 105;
  --admin-accent-deep-rgb: 4 120 87;
}

`

for (const t of tokens) {
  const sel = `.admin-shell :where([class~="${t}"])`
  const p = prop(t)
  const c = colorExpr(t)
  if (p === 'ring') {
    css += isFocus(t) ? `${sel}:focus { --tw-ring-color: ${c}; }\n` : `${sel} { --tw-ring-color: ${c}; }\n`
    continue
  }
  if (p === 'shadow') {
    css += `${sel} { --tw-shadow-color: ${c}; }\n`
    continue
  }
  if (isHover(t)) {
    css += `${sel}:hover { ${p}: ${c} !important; }\n`
    continue
  }
  if (isFocus(t) && p === 'border-color') {
    css += `${sel}:focus { ${p}: ${c} !important; }\n`
    continue
  }
  if (isDark(t)) {
    css += `@media (prefers-color-scheme: dark) { ${sel} { ${p}: ${c} !important; } }\n`
    continue
  }
  css += `${sel} { ${p}: ${c} !important; }\n`
}

writeFileSync(new URL('../src/pages/admin/adminAccent.css', import.meta.url), css)
console.log('wrote', tokens.length, 'rules')
