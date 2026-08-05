import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { recordStoreVisit } from '../lib/storeVisits.ts'

/** Counts real storefront visitors (not /admin). Mounted in MainLayout only. */
export function StoreVisitTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    void recordStoreVisit(pathname)
  }, [pathname])

  return null
}
