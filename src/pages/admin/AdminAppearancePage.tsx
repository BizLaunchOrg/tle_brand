import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAdminTheme } from './AdminThemeContext'
import { ad } from './adminUi'
import { AVAILABLE_COLORS, getSiteColor, setSiteColor, applySiteColor } from '../../lib/siteAppearance'
import type { SiteColor } from '../../lib/siteAppearance'

export function AdminAppearancePage() {
  const { theme } = useAdminTheme()
  const [color, setColor] = useState<SiteColor>(getSiteColor)
  const current = getSiteColor()

  useEffect(() => {
    setColor(getSiteColor())
  }, [])

  const save = () => {
    setSiteColor(color)
    applySiteColor()
    toast.success('Site color updated')
  }

  const swatchCls: Record<SiteColor, string> = {
    emerald: 'bg-emerald-600',
    sky: 'bg-sky-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    violet: 'bg-violet-600',
  }

  return (
    <div>
      <h1 className={ad(theme, 'text-2xl font-bold text-stone-900', 'text-2xl font-bold text-neutral-100')}>Appearance</h1>
      <p className={ad(theme, 'mt-2 text-sm text-stone-600', 'mt-2 text-sm text-neutral-400')}>Customize website main color for the storefront.</p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <p className={ad(theme, 'text-sm font-semibold text-stone-700', 'text-sm font-semibold text-neutral-200')}>Current site color</p>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-block h-8 w-20 rounded-md ${swatchCls[current]}`} />
            <span className={ad(theme, 'text-sm text-stone-700', 'text-sm text-neutral-200')}>{current}</span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {AVAILABLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={
                  'flex cursor-pointer flex-col items-center gap-2 rounded-xl p-3 text-center transition ' +
                  (color === c ? 'ring-2 ring-offset-2 ring-emerald-400' : 'hover:brightness-95')
                }
              >
                <span className={`block h-10 w-24 rounded-lg ${swatchCls[c]}`} aria-hidden />
                <span className={ad(theme, 'text-sm text-stone-700', 'text-sm text-neutral-200')}>{c}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button onClick={save} className={ad(theme, 'rounded-xl bg-emerald-600 px-4 py-2 text-white', 'rounded-xl bg-emerald-600 px-4 py-2 text-white')}>
              Apply
            </button>
            <button
              onClick={() => {
                setColor(getSiteColor())
                toast('Reverted')
              }}
              className={ad(theme, 'rounded-xl border border-stone-200 px-4 py-2', 'rounded-xl border border-neutral-700 px-4 py-2')}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <p className={ad(theme, 'text-sm font-semibold text-stone-700', 'text-sm font-semibold text-neutral-200')}>Preview</p>
          <div className={ad(theme, 'mt-3 rounded-lg border border-stone-100 p-3', 'mt-3 rounded-lg border border-neutral-800 p-3')}>
            <div className={`mb-3 h-8 rounded-md ${swatchCls[color]}`} />
            <div className="flex items-center gap-2">
              <span className={`inline-block h-8 w-8 rounded-md ${swatchCls[color]}`} />
              <button className={`rounded-md px-3 py-1 text-white ${swatchCls[color]}`}>Primary</button>
            </div>
            <p className={ad(theme, 'mt-3 text-sm text-stone-600', 'mt-3 text-sm text-neutral-400')}>Sidebar / buttons will use the selected color after applying.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminAppearancePage
