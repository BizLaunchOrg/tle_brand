const STORAGE_KEY = 'tle_site_color'

export const AVAILABLE_COLORS = ['emerald', 'sky', 'amber', 'rose', 'violet'] as const
export type SiteColor = (typeof AVAILABLE_COLORS)[number]

export function getSiteColor(): SiteColor {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v && AVAILABLE_COLORS.includes(v as SiteColor)) return v as SiteColor
  } catch {
    /* ignore */
  }
  return 'emerald'
}

export function setSiteColor(c: SiteColor) {
  try {
    localStorage.setItem(STORAGE_KEY, c)
  } catch {
    /* ignore */
  }
  applySiteColor()
}

// Replace color tokens in DOM class names. This is a pragmatic runtime approach since
// many components use Tailwind color classnames (e.g. `bg-emerald-600`). We replace
// the color token substring (e.g. `emerald`) with the selected color.
export function applySiteColor(): void {
  if (typeof document === 'undefined') return
  const to = getSiteColor()
  const tokens = AVAILABLE_COLORS

  const walk = (el: Element) => {
    const cls = (el.getAttribute('class') || '').trim()
    if (cls) {
      const parts = cls.split(/\s+/)
      let changed = false
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        for (const t of tokens) {
          if (p.includes(t) && t !== to) {
            parts[i] = p.replace(new RegExp(t, 'g'), to)
            changed = true
            break
          }
        }
      }
      if (changed) el.setAttribute('class', parts.join(' '))
    }
    // inline styles or data attributes not handled — Tailwind classes covered.
  }

  const all = Array.from(document.querySelectorAll('[class]'))
  for (const el of all) walk(el)

  // Update logo / meta in case any text needs swapping (no-op here).
}

// Also run once on import as a no-op guard (will be invoked explicitly in main.tsx)
export default null
