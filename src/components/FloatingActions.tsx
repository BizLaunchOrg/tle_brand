import { useEffect, useState } from 'react'

const WHATSAPP_LINK = 'https://wa.me/2347062818542'

export function FloatingActions() {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y = window.pageYOffset || document.documentElement.scrollTop || 0
      setShowScrollTop(y > 260)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed right-4 bottom-5 z-[1200] flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6">
      {showScrollTop ? (
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full bg-tle-pink text-white shadow-[0_12px_30px_rgba(196,105,141,0.45)] transition-colors hover:bg-tle-deep"
          aria-label="Scroll to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span className="material-symbols-outlined text-[22px] leading-none">arrow_upward</span>
        </button>
      ) : null}

      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="flex size-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_rgba(0,0,0,0.26)] transition-colors hover:bg-[#1fb85a]"
        aria-label="Chat on WhatsApp"
      >
        <span className="material-symbols-outlined text-[21px] leading-none">chat</span>
      </a>
    </div>
  )
}
