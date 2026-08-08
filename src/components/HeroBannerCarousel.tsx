import { useEffect, useState } from 'react'

type Props = {
  banners: string[]
  alt?: string
  className?: string
}

const SWIPE_MS = 3200

/** Sideways hero carousel — fills the hero frame; dots sit middle-bottom. */
export function HeroBannerCarousel({ banners, alt = 'Hero banner', className = '' }: Props) {
  const slides = banners.filter(Boolean).slice(0, 4)
  const [index, setIndex] = useState(0)
  const multi = slides.length > 1
  const n = slides.length

  useEffect(() => {
    setIndex(0)
  }, [slides.join('|')])

  useEffect(() => {
    if (!multi) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % n)
    }, SWIPE_MS)
    return () => window.clearInterval(id)
  }, [multi, n])

  if (n === 0) {
    return <div className={`bg-tle-cream ${className}`} />
  }

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        className="flex h-full transition-transform duration-500 ease-out will-change-transform"
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
            className="h-full shrink-0 object-cover object-center"
            style={{ width: `${100 / n}%` }}
            draggable={false}
          />
        ))}
      </div>

      {multi ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center max-lg:bottom-36 lg:bottom-6">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur-[2px]">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show banner ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
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
