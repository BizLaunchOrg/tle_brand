import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ad } from './adminUi.ts'

type AdminTheme = 'light' | 'dark'

export function AdminHeaderDropdown({
  theme,
  label,
  icon,
  open,
  onToggle,
  onClose,
  children,
  align = 'left',
}: {
  theme: AdminTheme
  label: ReactNode
  icon?: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const btnCls = ad(
    theme,
    'flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2 text-left text-[12px] font-semibold text-stone-800 hover:bg-stone-100',
    'flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-left text-[12px] font-semibold text-neutral-100 hover:bg-neutral-800',
  )

  const menuCls = [
    'absolute top-[calc(100%+6px)] z-50 min-w-[12.5rem] overflow-hidden rounded-xl border py-1 shadow-lg',
    ad(theme, 'border-stone-200 bg-white', 'border-neutral-700 bg-neutral-900'),
    align === 'right' ? 'right-0' : 'left-0',
  ].join(' ')

  return (
    <div ref={rootRef} className="relative">
      <button type="button" className={btnCls} aria-expanded={open} onClick={onToggle}>
        {icon ? (
          <span className="material-symbols-outlined text-[18px] font-light text-emerald-600">{icon}</span>
        ) : null}
        {label}
        <span className="material-symbols-outlined text-[16px] opacity-60">expand_more</span>
      </button>
      {open ? (
        <div className={menuCls} role="menu">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export function AdminDropdownLink({
  theme,
  to,
  icon,
  label,
  onSelect,
  external,
}: {
  theme: AdminTheme
  to: string
  icon: string
  label: string
  onSelect: () => void
  external?: boolean
}) {
  const itemCls = ad(
    theme,
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-stone-800 no-underline hover:bg-stone-50',
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-neutral-100 no-underline hover:bg-neutral-800',
  )

  if (external) {
    return (
      <a href={to} className={itemCls} role="menuitem" onClick={onSelect}>
        <span className="material-symbols-outlined text-[18px] font-light opacity-70">{icon}</span>
        {label}
      </a>
    )
  }

  return (
    <Link to={to} className={itemCls} role="menuitem" onClick={onSelect}>
      <span className="material-symbols-outlined text-[18px] font-light opacity-70">{icon}</span>
      {label}
    </Link>
  )
}

export function AdminDropdownButton({
  theme,
  icon,
  label,
  onClick,
  danger,
}: {
  theme: AdminTheme
  icon: string
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={
        'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium ' +
        (danger
          ? ad(theme, 'text-rose-700 hover:bg-rose-50', 'text-rose-300 hover:bg-rose-950/40')
          : ad(theme, 'text-stone-800 hover:bg-stone-50', 'text-neutral-100 hover:bg-neutral-800'))
      }
    >
      <span className="material-symbols-outlined text-[18px] font-light opacity-70">{icon}</span>
      {label}
    </button>
  )
}
