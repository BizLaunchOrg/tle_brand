import { Link } from 'react-router-dom'
import { useAdminTheme } from './AdminThemeContext.tsx'
import { AdminMakeupAvailabilityEditor } from './AdminMakeupAvailabilityEditor.tsx'
import { ad, adminFont } from './adminUi.ts'

export function AdminMakeupHoursPage() {
  const { theme } = useAdminTheme()
  const muted = ad(theme, 'text-stone-500', 'text-neutral-500')
  const heading = ad(
    theme,
    'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl',
    'text-2xl font-bold tracking-tight text-white sm:text-3xl',
  )
  const link = ad(
    theme,
    'text-[13px] font-semibold text-emerald-700 underline-offset-2 hover:underline',
    'text-[13px] font-semibold text-emerald-400 underline-offset-2 hover:underline',
  )

  return (
    <div className={['mx-auto max-w-6xl space-y-6', adminFont()].join(' ')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={heading}>Makeup hours</h1>
          <p className={muted + ' mt-2 max-w-2xl text-[14px] leading-relaxed'}>
            Use the calendar to open or close specific dates, or pick exact start times for a single day. Optional weekly rules
            repeat the same hours every Monday, Tuesday, etc.
          </p>
        </div>
        <Link to="/admin/makeup-bookings" className={link + ' shrink-0 no-underline'}>
          ← Back to makeup requests
        </Link>
      </div>
      <AdminMakeupAvailabilityEditor />
    </div>
  )
}
