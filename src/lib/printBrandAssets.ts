/** Public path to logo (respects Vite `base` in production). */
export function siteLogoPath(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}tlelogo.PNG`.replace(/\/{2,}/g, '/')
}

/** Absolute logo URL — required for blob: print windows and downloaded receipt HTML. */
export function printLogoUrl(): string {
  const path = siteLogoPath()
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).href
  }
  return path
}

export const PRINT_LOGO_ALT = 'TLE logo'

export const PRINT_LOGO_CSS = `
  .brand-logo {
    display: block;
    margin: 0 auto 14px;
    max-height: 64px;
    width: auto;
    object-fit: contain;
  }
`

/** Escaped <img> for printable HTML documents. */
export function printLogoImgHtml(esc: (s: string) => string = (s) => s): string {
  return `<img class="brand-logo" src="${esc(printLogoUrl())}" alt="${esc(PRINT_LOGO_ALT)}" />`
}
