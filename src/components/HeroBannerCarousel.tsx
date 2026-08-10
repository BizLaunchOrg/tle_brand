import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  banners: string[]
  alt?: string
  className?: string
}

const AUTO_MS = 5200
const RESUME_MS = 6000
const SWIPE_THRESHOLD_PX = 40

/** Sideways hero carousel — auto-advances; users can also swipe / drag. */
export function HeroBannerCarousel({ banners, alt = 'Hero banner', className = '' }: Props) {
  const slides = banners.filter(Boolean).slice(0, 4)
  const [index, setIndex] = useState(0)
  const multi = slides.length > 1
  const n = slides.length
  const pauseUntil = useRef(0)
  const dragStartX = useRef<number | null>(null)
  const dragging = useRef(false)

  useEffect(() => {
    setIndex(0)
  }, [slides.join('|')])

  const go = useCallback(
    (next: number) => {
      if (n < 1) return
      setIndex(((next % n) + n) % n)
    },
    [n],
  )

  const pauseAuto = useCallback(() => {
    pauseUntil.current = Date.now() + RESUME_MS
  }, [])

  useEffect(() => {
    if (!multi) return
    const id = window.setInterval(() => {
      if (Date.now() < pauseUntil.current) return
      setIndex((i) => (i + 1) % n)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [multi, n])

  const onPointerDown = (clientX: number) => {
    if (!multi) return
    dragStartX.current = clientX
    dragging.current = true
    pauseAuto()
  }

  const onPointerUp = (clientX: number) => {
    if (!multi || dragStartX.current == null) {
      dragging.current = false
      dragStartX.current = null
      return
    }
    const dx = clientX - dragStartX.current
    dragStartX.current = null
    dragging.current = false
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (dx < 0) go(index + 1)
    else go(index - 1)
    pauseAuto()
  }

  if (n === 0) {
    return <div className={`bg-tle-cream ${className}`} />
  }

  return (
    <div
      className={`relative h-full w-full touch-pan-y overflow-hidden ${className}`}
      onTouchStart={(e) => onPointerDown(e.touches[0]?.clientX ?? 0)}
      onTouchEnd={(e) => onPointerUp(e.changedTouches[0]?.clientX ?? 0)}
      onMouseDown={(e) => {
        if (e.button !== 0) return
        onPointerDown(e.clientX)
      }}
      onMouseUp={(e) => onPointerUp(e.clientX)}
      onMouseLeave={() => {
        if (dragging.current) {
          dragging.current = false
          dragStartX.current = null
        }
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero banners"
    >
      <div
        className="flex h-full cursor-grab transition-transform duration-500 ease-out will-change-transform active:cursor-grabbing"
        style={{
          width: `${n * 100}%`,
          transform: `translateX(-${(index * 100) / n}%)`,
        }}
      >
        {slides.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === 0 ? alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            className="pointer-events-none h-full shrink-0 select-none object-cover object-center"
            style={{ width: `${100 / n}%` }}
            draggable={false}
          />
        ))}
      </div>

      {multi ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center sm:bottom-5 lg:bottom-6">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur-[2px]">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                onClick={() => {
                  go(i)
                  pauseAuto()
                }}
                className={
                  'h-1.5 rounded-full transition-all ' +
                  (i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/85')
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
