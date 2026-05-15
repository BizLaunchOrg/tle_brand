/** User-facing receipt: always show calendar date and clock time separately. */
export function formatReceiptDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatReceiptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatReceiptDateTime(iso: string): string {
  return `${formatReceiptDate(iso)} · ${formatReceiptTime(iso)}`
}
