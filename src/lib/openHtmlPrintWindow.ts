/** Opens HTML in a new tab and triggers print (Save as PDF from the print dialog). */
export function openHtmlPrintWindow(html: string): boolean {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (!w) {
    URL.revokeObjectURL(url)
    return false
  }

  let printed = false
  const tryPrint = () => {
    if (printed) return
    try {
      const doc = w.document
      if (!doc?.body?.innerHTML?.trim()) return
      printed = true
      w.focus()
      w.print()
    } catch {
      /* ignore */
    }
  }

  const dispose = () => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }

  w.addEventListener('afterprint', dispose, { once: true })
  w.addEventListener('load', () => window.setTimeout(tryPrint, 120), { once: true })
  window.setTimeout(tryPrint, 1000)
  window.setTimeout(dispose, 15 * 60_000)
  return true
}
