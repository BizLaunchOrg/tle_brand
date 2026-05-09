import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll window to top on every client-side route change. */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [pathname, search, hash])

  return null
}
