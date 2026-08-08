import { useEffect, useState } from 'react'

type Props = {
  banners: string[]
  alt?: string
  className?: string
}

/** Lightweight sideways hero carousel — no heavy deps; pauses when only one slide. */
export function HeroBannerCarousel({ banners, alt = 'Hero banner', className = '' }: Props) {
  const slides = banners.filter(Boolean).slice(0, 4)
  const [index, setIndex] = useState(0)
  const multi = slides.length > 1

  useEffect(() => {
    setIndex(0)
  }, [slides.join('|')])

  useEffect(() => {
    if (!multi) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, 5200)
    return () => window.clearInterval(id)
  }, [multi, slides.length])

  if (slides.length === 0) {
    return <div className={`bg-tle-cream ${className}`} />
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex h-full w-full transition-transform duration-700 ease-out will-change-transform"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === 0 ? alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            className="h-full w-full min-w-full shrink-0 object-cover object-[center_22%] max-lg:object-[center_15%]"
            draggable={false}
          />
        ))}
      </div>
      {multi ? (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 lg:bottom-auto lg:top-5 lg:left-5 lg:translate-x-0">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={
                'h-1.5 rounded-full transition-all ' +
                (i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80')
              }
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
