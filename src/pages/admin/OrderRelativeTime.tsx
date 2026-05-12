import { useCallback, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { formatOrderFullLabel, formatOrderRelativeLabel } from '../../lib/formatOrderRelativeTime.ts'
import { ad } from './adminUi.ts'

export function OrderRelativeTime({
  iso,
  theme,
  className = '',
}: {
  iso: string
  theme: 'light' | 'dark'
  /** Extra classes (e.g. table cell alignment). */
  className?: string
}) {
  const [showFull, setShowFull] = useState(false)
  const rel = formatOrderRelativeLabel(iso)
  const full = formatOrderFullLabel(iso)
  const toggle = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    setShowFull((v) => !v)
  }, [])
  const onKeyToggle = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    setShowFull((v) => !v)
  }, [])
  const control =
    'inline-block max-w-full cursor-pointer border-b border-dotted border-current bg-transparent p-0 text-left font-inherit underline-offset-2 ' +
    ad(
      theme,
      'text-stone-500 decoration-stone-400 hover:text-stone-800',
      'text-neutral-400 decoration-neutral-500 hover:text-neutral-200',
    )
  return (
    <span
      role="button"
      tabIndex={0}
      className={[control, className].filter(Boolean).join(' ')}
      onClick={toggle}
      onKeyDown={onKeyToggle}
      title={showFull ? 'Show short' : full}
    >
      {showFull ? full : rel}
    </span>
  )
}
