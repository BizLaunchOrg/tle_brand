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
  // Apply to existing nodes
  const walk = (el: Element) => {
    const cls = (el.getAttribute('class') || '').trim()
    if (!cls) return
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

  const all = Array.from(document.querySelectorAll('[class]'))
  for (const el of all) walk(el)

  // Ensure future DOM additions get the same treatment (SPA navigation / react mounts)
  ;(applySiteColor as any)._observer ??= new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof Element && m.attributeName === 'class') {
        walk(m.target as Element)
      }
      if (m.addedNodes && m.addedNodes.length) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            walk(n)
            // also walk descendants
            n.querySelectorAll('[class]').forEach((el) => walk(el))
          }
        })
      }
    }
  })

  ;(applySiteColor as any)._observer.disconnect()
  ;(applySiteColor as any)._observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })

  // Mark document element with current color (useful for CSS fallbacks)
  try {
    document.documentElement.setAttribute('data-tle-color', to)
  } catch {
    /* ignore */
  }
}

// Also run once on import as a no-op guard (will be invoked explicitly in main.tsx)
export default null
