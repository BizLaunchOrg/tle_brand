import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll window to top on route changes; if the URL has a hash, scroll that target into view instead. */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, '')
      if (id) {
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      }
      return
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [pathname, search, hash])

  return null
}
