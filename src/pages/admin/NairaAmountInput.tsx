import { useCallback, useEffect, useState } from 'react'
import { parseProductPriceNgn } from '../../data/products.ts'
import { ad } from './adminUi.ts'

/** Format digits with thousands commas for display while typing. */
export function formatNairaInputDisplay(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''
  const n = parseInt(digits, 10)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('en-US')
}

type NairaAmountInputProps = {
  value: string
  onChange: (value: string) => void
  theme: 'light' | 'dark'
  className?: string
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function NairaAmountInput({
  value,
  onChange,
  theme,
  className = '',
  placeholder = '0',
  disabled,
  id,
}: NairaAmountInputProps) {
  const [display, setDisplay] = useState(() => formatNairaInputDisplay(value))

  useEffect(() => {
    const fromProp = formatNairaInputDisplay(value)
    const propN = parseProductPriceNgn(value)
    const displayN = parseProductPriceNgn(display)
    if (propN !== displayN || (value && !display)) {
      setDisplay(fromProp)
    }
  }, [value, display])

  const commit = useCallback(
    (nextDisplay: string) => {
      const digits = nextDisplay.replace(/[^\d]/g, '')
      if (!digits) {
        setDisplay('')
        onChange('')
        return
      }
      const n = parseInt(digits, 10)
      const formatted = n.toLocaleString('en-US')
      setDisplay(formatted)
      onChange(n > 0 ? `₦${formatted}` : '')
    },
    [onChange],
  )

  return (
    <div
      className={
        'mt-1 flex overflow-hidden rounded-xl border ' +
        ad(theme, 'border-stone-200 bg-white', 'border-neutral-600 bg-neutral-950') +
        (disabled ? ' opacity-60' : '')
      }
    >
      <span
        className={
          'flex shrink-0 items-center border-r px-3 text-[14px] font-semibold tabular-nums ' +
          ad(theme, 'border-stone-200 bg-stone-50 text-stone-600', 'border-neutral-600 bg-neutral-900 text-neutral-300')
        }
        aria-hidden
      >
        ₦
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        className={
          'min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-[13px] tabular-nums outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500/25 ' +
          ad(theme, 'text-stone-900 placeholder:text-stone-400', 'text-neutral-100 placeholder:text-neutral-500') +
          ' ' +
          className.replace(/\bmt-\S+\s*/g, '')
        }
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const next = formatNairaInputDisplay(e.target.value)
          setDisplay(next)
          const digits = next.replace(/[^\d]/g, '')
          if (!digits) onChange('')
          else onChange(`₦${parseInt(digits, 10).toLocaleString('en-US')}`)
        }}
        onBlur={() => commit(display)}
      />
    </div>
  )
}
