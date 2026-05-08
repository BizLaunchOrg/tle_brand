import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/ProductCard.tsx'
import { PRODUCTS, defaultVariantSelection } from '../../data/products.ts'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'

const MARQUEE_ITEMS = [
  'Premium Beauty',
  'Makeup Sessions',
  'Him & Her',
  'Lagos, Nigeria',
  'Aesthetic Products',
  'Professional Artists',
  'Free Delivery Over 100K',
] as const

const BOOKING_SERVICES = [
  { name: 'Bridal Glam', price: 'From ₦65,000', icon: 'favorite' },
  { name: 'Editorial Look', price: 'From ₦45,000', icon: 'auto_awesome' },
  { name: 'Natural Flawless', price: 'From ₦25,000', icon: 'schedule' },
  { name: 'Bold Evening', price: 'From ₦38,000', icon: 'diamond' },
  { name: "Men's Grooming", price: 'From ₦20,000', icon: 'shield' },
  { name: 'Trial Session', price: 'From ₦15,000', icon: 'water_drop' },
] as const

const HERO_FLOAT: { style: CSSProperties; icon: string }[] = [
  {
    style: { left: '6%', top: '18%', animationDuration: '8s', animationDelay: '0s' },
    icon: 'diamond',
  },
  {
    style: { left: '17%', top: '66%', animationDuration: '10s', animationDelay: '1.8s' },
    icon: 'shopping_bag',
  },
  {
    style: { left: '29%', top: '32%', animationDuration: '7s', animationDelay: '3.2s' },
    icon: 'face_retouching_natural',
  },
  {
    style: { left: '5%', top: '78%', animationDuration: '12s', animationDelay: '0.6s' },
    icon: 'styler',
  },
  {
    style: { left: '35%', top: '12%', animationDuration: '6s', animationDelay: '2.4s' },
    icon: 'checkroom',
  },
  {
    style: { left: '40%', top: '82%', animationDuration: '14s', animationDelay: '4.5s' },
    icon: 'auto_awesome',
  },
  {
    style: { left: '2%', top: '43%', animationDuration: '11s', animationDelay: '1s' },
    icon: 'workspace_premium',
  },
  {
    style: { left: '22%', top: '8%', animationDuration: '9s', animationDelay: '5s' },
    icon: 'local_mall',
  },
  {
    style: { left: '30%', top: '56%', animationDuration: '9s', animationDelay: '2.2s' },
    icon: 'diamond',
  },
  {
    style: { left: '12%', top: '30%', animationDuration: '8.6s', animationDelay: '4.1s' },
    icon: 'diamond',
  },
]

const TAKEN_DAYS = new Set([6, 10, 14, 18, 22])

const TIME_SLOTS = [
  { label: '9:00 AM', taken: true },
  { label: '10:00 AM', taken: false },
  { label: '11:00 AM', taken: false },
  { label: '12:00 PM', taken: true },
  { label: '1:00 PM', taken: false },
  { label: '2:00 PM', taken: false },
  { label: '3:00 PM', taken: false },
  { label: '4:00 PM', taken: true },
  { label: '5:00 PM', taken: false },
  { label: '6:00 PM', taken: false },
  { label: '7:00 PM', taken: true },
  { label: '8:00 PM', taken: false },
] as const

const revealCls =
  'reveal opacity-0 translate-y-8 transition-all duration-[750ms] ease-out [&.in]:translate-y-0 [&.in]:opacity-100'

function addMonths(d: Date, n: number) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

function dayCellCls(unavailable: boolean, isToday: boolean, selected: boolean) {
  const base =
    'flex h-[38px] items-center justify-center rounded-full text-[13px] font-medium transition-all duration-200'
  if (unavailable) return `${base} cursor-not-allowed text-tle-faint`
  if (selected) return `${base} cursor-pointer bg-tle-pink text-white`
  if (isToday) return `${base} cursor-pointer font-bold text-tle-pink hover:bg-tle-blush`
  return `${base} cursor-pointer text-tle-ink hover:bg-tle-blush hover:text-tle-pink`
}

export function LandingPage() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleFavorite, isFavorite, hasProductInCart } = useCartDrawer()

  const catalogSearch = (searchParams.get('q') || '').trim().toLowerCase()

  const [filterGender, setFilterGender] = useState<'all' | 'her' | 'him'>('all')
  const [formStep, setFormStep] = useState(1)
  const [selectedService, setSelectedService] = useState({ name: '', price: '' })
  const [selectedTime, setSelectedTime] = useState('')
  const [calDate, setCalDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedDateLabel, setSelectedDateLabel] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState({
    service: 'Bridal Glam',
    date: 'May 12, 2025',
    time: '2:00 PM',
  })

  useEffect(() => {
    setSelectedDay(null)
    setSelectedDateLabel('')
  }, [calDate])

  useEffect(() => {
    const id = location.hash.replace(/^#/, '')
    if (!id) return
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash, location.pathname])

  useEffect(() => {
    const root = wrapRef.current
    if (!root) return
    const els = root.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const scrollToBooking = useCallback(() => {
    document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const goToStep = useCallback(
    (n: number) => {
      setFormStep(n)
      scrollToBooking()
    },
    [scrollToBooking],
  )

  const visibleProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      if (filterGender !== 'all' && p.gender !== filterGender) return false
      if (!catalogSearch) return true
      const hay = `${p.name} ${p.cat} ${p.badge} ${p.alt}`.toLowerCase()
      return hay.includes(catalogSearch)
    })
  }, [filterGender, catalogSearch])

  const calendarCells = useMemo(() => {
    const y = calDate.getFullYear()
    const m = calDate.getMonth()
    const firstDay = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const today = new Date()
    const todayY = today.getFullYear()
    const todayM = today.getMonth()
    const todayD = today.getDate()
    const cells: ReactNode[] = []
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`e-${i}`} className="h-[38px]" />)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = todayY === y && todayM === m && todayD === d
      const dayDate = new Date(y, m, d)
      const startOfToday = new Date(todayY, todayM, todayD)
      const isPast = dayDate < startOfToday
      const isTaken = TAKEN_DAYS.has(d)
      const unavailable = isPast || isTaken
      const label = `${calDate.toLocaleString('default', { month: 'short' })} ${d}, ${y}`
      const selected = selectedDay === d && !unavailable
      cells.push(
        <div
          key={d}
          role="button"
          tabIndex={0}
          className={dayCellCls(unavailable, isToday, selected)}
          onClick={() => {
            if (unavailable) return
            setSelectedDay(d)
            setSelectedDateLabel(label)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!unavailable) {
                setSelectedDay(d)
                setSelectedDateLabel(label)
              }
            }
          }}
        >
          {d}
        </div>,
      )
    }
    return cells
  }, [calDate, selectedDay])

  const confirmBooking = () => {
    setSuccessDetails({
      service: selectedService.name || 'Bridal Glam',
      date: selectedDateLabel || 'May 12, 2025',
      time: selectedTime || '2:00 PM',
    })
    setShowSuccess(true)
    setTimeout(() => {
      document.getElementById('success-screen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const resetSuccess = () => {
    setShowSuccess(false)
    scrollToBooking()
  }

  const stepCircle = (i: number) => {
    if (formStep === i)
      return 'border-tle-pink bg-tle-pink text-white'
    if (formStep > i) return 'border-tle-charcoal bg-tle-charcoal text-white'
    return 'border-black/15 bg-white text-tle-muted'
  }

  const stepLabel = (i: number) => {
    if (formStep === i) return 'text-tle-pink'
    if (formStep > i) return 'text-tle-ink'
    return 'text-tle-muted'
  }

  const pillCls = (on: boolean) =>
    `rounded-full border-[1.5px] px-4 py-1.5 font-sans text-[10.5px] font-semibold tracking-wide uppercase transition-all sm:px-5 sm:py-2 sm:text-[11px] ${
      on
        ? 'border-tle-charcoal bg-tle-charcoal text-white'
        : 'border-black/10 text-tle-muted hover:border-tle-charcoal hover:bg-tle-charcoal hover:text-white'
    }`

  return (
    <>
      <div ref={wrapRef} className="w-full">
        <section
          className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-[55%_45%]"
          id="home"
        >
          <div className="pointer-events-none absolute inset-y-0 right-[45%] left-0 z-[1] overflow-hidden max-lg:right-0 max-lg:bottom-[45%] max-lg:top-0">
            {HERO_FLOAT.map((hi, idx) => (
              <span
                key={idx}
                className="material-symbols-outlined animate-tle-float absolute text-tle-pink/[0.2]"
                style={{ ...hi.style, fontSize: 40, lineHeight: 1 }}
              >
                {hi.icon}
              </span>
            ))}
          </div>

          <div className="relative z-[5] flex max-lg:items-center max-lg:text-center flex-col justify-center px-6 pt-28 pb-16 sm:px-12 lg:items-start lg:text-left lg:pl-20 lg:pr-16 lg:pt-32 lg:pb-20">
            <div className="mb-8 flex items-center gap-3.5 max-lg:justify-center">
              <div className="h-px w-9 bg-tle-gold" />
              <span className="text-[10px] font-semibold tracking-[0.25em] text-tle-gold uppercase">
                Beauty &amp; Aesthetics · Lagos
              </span>
            </div>

            <h1 className="mb-8 w-full font-sans text-[clamp(2.65rem,9.5vw,6.625rem)] leading-none font-semibold tracking-tight max-lg:text-center lg:text-[clamp(3rem,7.2vw,6.625rem)]">
              <span className="whitespace-nowrap lg:hidden">
                <span className="text-tle-ink">Define</span>{' '}
                <span className="font-medium italic text-tle-pink">Beauty</span>
              </span>
              <span className="hidden text-tle-ink lg:block">Define</span>
              <span className="hidden font-medium italic text-tle-pink lg:block">Beauty</span>
              <span
                className="mt-2 block font-bold text-transparent lg:mt-0"
                style={{ WebkitTextStroke: '1.8px #181818' }}
              >
                Boldly.
              </span>
            </h1>

            <p className="mb-11 hidden max-w-[min(100%,42rem)] text-[17px] font-normal leading-[1.72] text-black lg:block dark:text-black">
              Premium aesthetics for everyone—curated products and professional makeup for him and her, with strong
              standards for quality, performance, and skin compatibility. Our artists tailor every session to you, keeping
              your natural features and personal style at the center of every look we create.
            </p>
            <p className="mb-11 max-w-[min(100%,20rem)] text-[13px] font-normal leading-[1.6] text-black sm:max-w-[22rem] sm:text-[14px] sm:leading-[1.65] lg:hidden dark:text-black">
              Curated beauty and pro makeup in Lagos—for him and her—with sessions built around your look and quality you
              can trust.
            </p>

            <div className="mb-12 flex max-lg:justify-center flex-wrap items-center justify-start gap-3.5">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-transparent bg-tle-charcoal px-9 py-[17px] font-sans text-xs font-semibold tracking-[0.12em] text-white uppercase no-underline transition-all hover:-translate-y-0.5 hover:bg-tle-pink hover:shadow-[0_12px_32px_rgba(196,105,141,0.28)]"
              >
                Shop Now
                <span className="material-symbols-outlined text-lg leading-none">arrow_forward</span>
              </Link>
              <Link
                to="/#booking-form"
                className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-tle-pink/70 bg-white px-9 py-[17px] font-sans text-xs font-semibold tracking-[0.12em] text-tle-pink uppercase shadow-[0_2px_12px_rgba(196,105,141,0.12)] no-underline transition-all hover:-translate-y-0.5 hover:border-tle-deep hover:bg-tle-blush hover:text-tle-deep hover:shadow-[0_8px_24px_rgba(196,105,141,0.22)]"
              >
                Book Makeup
                <span className="material-symbols-outlined text-lg leading-none">calendar_month</span>
              </Link>
            </div>

            <div className="mb-8 flex max-lg:justify-center items-center gap-3.5">
              <div className="flex">
                {[
                  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=68&h=68&fit=crop&crop=face',
                  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=68&h=68&fit=crop&crop=face',
                  'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=68&h=68&fit=crop&crop=face',
                ].map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    className={`size-[34px] rounded-full border-[2.5px] border-white object-cover shadow-md ${i > 0 ? '-ml-2.5' : ''}`}
                  />
                ))}
              </div>
              <div className="text-left leading-snug max-lg:text-center">
                <strong className="block text-[13px] font-semibold text-tle-ink">2,400+ happy clients</strong>
                <span className="text-[11.5px] text-tle-muted">
                  <span className="text-[#E8A23C]">★★★★★</span> &nbsp;4.9 across all services
                </span>
              </div>
            </div>

            <div className="absolute bottom-8 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-3.5 sm:left-12 sm:translate-x-0 lg:left-20">
              <div className="relative h-px w-11 overflow-hidden bg-black/10">
                <span className="animate-tle-bar absolute top-0 h-full w-full bg-tle-pink" />
              </div>
              <span className="text-[10px] font-medium tracking-[0.2em] text-tle-faint uppercase">Scroll to explore</span>
            </div>
          </div>

          <div className="relative min-h-[55vh] overflow-hidden bg-tle-cream lg:min-h-0">
            <img
              src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&h=1200&fit=crop&crop=top"
              alt="TLE-BRAND Beauty Model"
              className="absolute inset-0 size-full object-cover object-top"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-r from-white/[0.08] to-transparent via-transparent" />
            <div className="absolute top-8 left-6 z-10 rounded-full bg-tle-charcoal px-[18px] py-2 text-[9px] font-semibold tracking-[0.2em] text-white uppercase sm:left-7 lg:top-10 lg:left-8">
              New · 2025 Collection
            </div>
            <div className="pointer-events-none absolute bottom-8 left-1/2 z-20 w-[min(100%,calc(100%-2rem))] max-w-[300px] -translate-x-1/2 sm:bottom-10 sm:left-auto sm:right-8 sm:translate-x-0 sm:max-w-[280px] lg:bottom-12 lg:right-10 lg:max-w-[300px] xl:bottom-14 xl:right-12 xl:max-w-[320px]">
              <div className="animate-tle-slot-card rounded-[22px] border border-white/40 bg-white/12 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl ring-1 ring-white/25 xl:p-6">
                <div className="mb-2 text-[9.5px] font-semibold tracking-[0.22em] text-amber-100 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] sm:text-[10px] lg:mb-2.5">
                  Next slot open
                </div>
                <div className="mb-1.5 font-sans text-[clamp(1.75rem,4.2vw,2.35rem)] font-semibold leading-none text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.65)] lg:mb-2">
                  Today
                </div>
                <div className="text-[11.5px] leading-snug text-white/95 drop-shadow-[0_1px_5px_rgba(0,0,0,0.7)] lg:text-[13px]">
                  3 times available · from ₦25,000
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex overflow-hidden bg-tle-charcoal py-[18px]">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((text, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-5 px-5 text-[10.5px] font-semibold tracking-[0.25em] text-white/55 uppercase"
              >
                {text}{' '}
                <span className="size-1 shrink-0 rounded-full bg-tle-gold" />
              </span>
            ))}
          </div>
        </div>

        <section className={`${revealCls} px-4 py-16 sm:px-6 sm:py-20 md:px-16 lg:px-20`} id="shop">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6 md:mb-12">
            <div>
              <div className="mb-3.5 flex items-center gap-3">
                <div className="h-px w-[22px] bg-tle-gold" />
                <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">The Collection</span>
              </div>
              <h2 className="font-sans text-[clamp(1.875rem,3.5vw,3rem)] leading-tight font-semibold text-tle-ink">
                Shop What&apos;s <em className="font-sans font-medium italic text-tle-pink">Trending</em>
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={pillCls(filterGender === 'all')} onClick={() => setFilterGender('all')}>
                All
              </button>
              <button type="button" className={pillCls(filterGender === 'her')} onClick={() => setFilterGender('her')}>
                For Her
              </button>
              <button type="button" className={pillCls(filterGender === 'him')} onClick={() => setFilterGender('him')}>
                For Him
              </button>
            </div>
          </div>

          {catalogSearch ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tle-pink/15 bg-tle-blush/40 px-4 py-3 text-[13px] text-tle-ink">
              <span>
                Showing results for <strong className="font-semibold text-tle-pink">&ldquo;{searchParams.get('q')?.trim()}&rdquo;</strong>
                <span className="text-tle-muted"> ({visibleProducts.length} items)</span>
              </span>
              <button
                type="button"
                className="rounded-full border border-tle-pink/30 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-tle-pink transition-colors hover:bg-tle-pink hover:text-white"
                onClick={() => {
                  setSearchParams({}, { replace: true })
                }}
              >
                Clear search
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-5 lg:grid-cols-4 lg:gap-6">
            {visibleProducts.length === 0 ? (
              <div className="col-span-full rounded-[20px] border border-black/8 bg-tle-cream/80 px-6 py-14 text-center">
                <p className="font-sans text-lg font-medium text-tle-ink">No products match your search.</p>
                <p className="mt-2 text-sm text-tle-muted">Try a different word or browse all categories.</p>
                <button
                  type="button"
                  className="mt-6 inline-flex rounded-full border border-tle-pink bg-tle-pink px-6 py-2.5 text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-deep"
                  onClick={() => setSearchParams({}, { replace: true })}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
            {visibleProducts.map((p, idx) => {
              const delay =
                idx === 0 ? 'delay-100' : idx === 1 ? 'delay-200' : idx === 2 ? 'delay-300' : 'delay-500'
              return (
                <div key={p.slug} className={`${revealCls} ${delay} ${idx >= 4 ? 'hidden sm:block' : ''}`}>
                  <ProductCard
                    product={p}
                    onAddToCart={() => addToCart(p, defaultVariantSelection(p))}
                    inCart={hasProductInCart(p.slug)}
                    isFavorite={isFavorite(p.slug)}
                    onToggleFavorite={() => toggleFavorite(p)}
                  />
                </div>
              )
            })}
          </div>

          {visibleProducts.length > 0 ? (
            <div className="mt-10 flex justify-center sm:mt-12">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-tle-charcoal bg-tle-charcoal px-9 py-3 font-sans text-[11px] font-semibold tracking-[0.16em] text-white uppercase no-underline shadow-[0_10px_28px_rgba(14,14,14,0.15)] transition-all hover:-translate-y-0.5 hover:border-tle-pink hover:bg-tle-pink hover:shadow-[0_14px_36px_rgba(196,105,141,0.25)]"
              >
                Shop all
                <span className="material-symbols-outlined text-[18px] leading-none">arrow_forward</span>
              </Link>
            </div>
          ) : null}
        </section>

        <div className={`${revealCls} px-4 pb-24 md:px-10 lg:px-16`} id="makeup">
          <div className="relative grid gap-12 overflow-hidden rounded-[36px] bg-tle-charcoal px-6 py-12 md:grid-cols-2 md:gap-20 md:px-14 md:py-[90px] lg:px-20">
            <div className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full border border-tle-gold/15" />
            <div className="pointer-events-none absolute right-24 -bottom-12 size-[200px] rounded-full border border-tle-gold/10" />
            <div className="relative z-[2]">
              <div className="mb-5 text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Makeup &amp; Aesthetics</div>
              <h2 className="mb-5 font-sans text-[clamp(2.5rem,4.5vw,4rem)] leading-[1.05] font-semibold text-white">
                Book Your
                <br />
                <em className="font-sans font-medium italic text-tle-pink">Glow-Up</em>
                <br />
                Session.
              </h2>
              <p className="mb-9 max-w-[380px] text-[14.5px] font-light leading-[1.85] text-white/50">
                Professional makeup for every occasion — bridal, editorial, natural, or bold. We come to you, or you come
                to us. Starting from ₦25,000.
              </p>
              <div className="mb-10 grid grid-cols-2 gap-2.5">
                {['Bridal Glam', 'Editorial Look', 'Natural Flawless', 'Bold Evening', "Men's Grooming", 'Trial Session'].map(
                  (name) => (
                    <div
                      key={name}
                      className="flex cursor-pointer items-center gap-2.5 rounded-[13px] border border-white/10 bg-white/5 px-4 py-3.5 transition-colors hover:border-tle-pink/30 hover:bg-tle-pink/10"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-tle-pink" />
                      <span className="text-[12.5px] font-medium text-white/80">{name}</span>
                    </div>
                  ),
                )}
              </div>
              <Link
                to="/#booking-form"
                className="relative z-[2] inline-flex items-center gap-2.5 rounded-full bg-white px-10 py-[18px] font-sans text-xs font-bold tracking-wide text-tle-charcoal uppercase no-underline transition-all hover:-translate-y-0.5 hover:bg-tle-pink hover:text-white hover:shadow-[0_12px_32px_rgba(196,105,141,0.25)]"
              >
                Book a Session
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
            </div>
            <div className="relative z-[2] overflow-hidden rounded-2xl">
              <div className="h-full min-h-[320px] overflow-hidden md:min-h-[520px]">
                <img
                  src="/tlepic2.jpeg"
                  alt="Book your glow-up session"
                  className="size-full object-cover object-top brightness-[0.92] transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>

        <section className={`${revealCls} grid items-center gap-12 bg-tle-cream px-6 py-20 md:gap-20 md:px-16 lg:grid-cols-2 lg:px-20`} id="about">
          <div className="relative">
            <img
              src="/tlepic1.jpeg"
              alt="TLE-BRAND"
              className="aspect-[4/5] w-full rounded-3xl object-cover"
            />
            <img
              src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop"
              alt="Products"
              className="absolute -right-8 -bottom-11 w-[44%] rounded-full border-[6px] border-tle-cream object-cover shadow-xl max-md:hidden"
            />
            <div className="absolute top-8 -left-8 rounded-[18px] bg-tle-pink px-6 py-5 text-white shadow-[0_20px_44px_rgba(196,105,141,0.32)] max-md:hidden">
              <div className="font-sans text-[44px] font-bold leading-none">2.4K</div>
              <div className="text-[11px] font-medium tracking-wide opacity-80">Happy Clients</div>
            </div>
          </div>
          <div className="py-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px w-[22px] bg-tle-gold" />
              <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Our Story</span>
            </div>
            <h2 className="mb-5 font-sans text-[clamp(2.25rem,4vw,3.375rem)] leading-tight font-semibold text-tle-ink">
              Beauty for <em className="font-sans font-medium italic text-tle-pink">Everyone.</em>
              <br />
              No Exceptions.
            </h2>
            <p className="mb-10 text-[15px] font-light leading-[1.9] text-tle-muted">
              TLE-BRAND was born from one belief — that beauty belongs to everyone. We create and curate premium aesthetic
              products and professional makeup services for every person ready to own their look, unapologetically.
            </p>
            <div className="mb-11 grid gap-5 sm:grid-cols-2">
              {[
                { icon: 'verified', title: 'Premium Quality', desc: 'Only the finest make our shelves' },
                { icon: 'schedule', title: 'Fast Delivery', desc: 'Same-day across Lagos' },
                { icon: 'favorite', title: 'Him & Her', desc: 'Curated for all genders' },
                { icon: 'location_on', title: 'We Come to You', desc: 'Mobile makeup at your venue' },
              ].map((f) => (
                <div key={f.title} className="flex gap-3">
                  <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[11px] bg-tle-blush text-tle-pink">
                    <span className="material-symbols-outlined text-xl">{f.icon}</span>
                  </div>
                  <div>
                    <div className="mb-1 text-[13px] font-semibold text-tle-ink">{f.title}</div>
                    <div className="text-xs leading-snug text-tle-muted">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/#shop"
              className="inline-flex items-center gap-2.5 rounded-full bg-tle-charcoal px-9 py-[17px] font-sans text-xs font-semibold tracking-wide text-white uppercase no-underline transition-all hover:-translate-y-0.5 hover:bg-tle-pink hover:shadow-lg"
            >
              Discover More
            </Link>
          </div>
        </section>

        {!showSuccess && (
          <section className={`${revealCls} px-4 py-20 md:px-16`} id="booking-form">
            <div className="mx-auto max-w-[800px]">
              <h2 className="mb-3 text-center font-sans text-[clamp(2.25rem,4vw,3.25rem)] font-semibold text-tle-ink">
                Schedule Your <em className="font-sans font-medium italic text-tle-pink">Session</em>
              </h2>
              <p className="mb-14 text-center text-[14.5px] font-light text-tle-muted">
                Pick your service, choose a date, tell us about you — and you&apos;re set.
              </p>

              <div className="relative mb-12 flex">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="relative flex flex-1 cursor-pointer flex-col items-center gap-2"
                    onClick={() => {
                      if (i <= formStep) goToStep(i)
                    }}
                    role="presentation"
                  >
                    {i > 1 && (
                      <span
                        className={`absolute top-[18px] right-1/2 h-px w-full -translate-x-1/2 ${
                          formStep >= i ? 'bg-tle-pink' : 'bg-black/10'
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-[1] flex size-9 items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold transition-colors ${stepCircle(i)}`}
                    >
                      {i}
                    </div>
                    <span className={`text-[10.5px] font-semibold tracking-wide uppercase ${stepLabel(i)}`}>
                      {i === 1 ? 'Service' : i === 2 ? 'Date & Time' : i === 3 ? 'Your Details' : 'Confirm'}
                    </span>
                  </div>
                ))}
              </div>

              <div className={formStep === 1 ? 'block' : 'hidden'}>
                <div className="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {BOOKING_SERVICES.map((s) => {
                    const sel = selectedService.name === s.name
                    return (
                      <div
                        key={s.name}
                        role="button"
                        tabIndex={0}
                        className={`relative cursor-pointer overflow-hidden rounded-[18px] border-[1.5px] p-5 transition-all ${
                          sel ? 'border-tle-pink bg-tle-blush' : 'border-black/10 hover:border-tle-pink/40'
                        }`}
                        onClick={() => setSelectedService({ name: s.name, price: s.price })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setSelectedService({ name: s.name, price: s.price })
                          }
                        }}
                      >
                        <span
                          className={`absolute top-3.5 right-3.5 flex size-5 items-center justify-center rounded-full bg-tle-pink ${sel ? 'flex' : 'hidden'}`}
                        >
                          <span className="material-symbols-outlined text-sm text-white">check</span>
                        </span>
                        <div
                          className={`mb-3.5 flex size-[42px] items-center justify-center rounded-xl text-tle-pink ${sel ? 'bg-white' : 'bg-tle-blush'}`}
                        >
                          <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                        </div>
                        <div className="mb-1 text-[13.5px] font-semibold text-tle-ink">{s.name}</div>
                        <div className="font-sans text-[17px] font-semibold text-tle-gold">{s.price}</div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-10 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-full bg-tle-charcoal px-11 py-4 font-sans text-xs font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-pink"
                    onClick={() => goToStep(2)}
                  >
                    Continue
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className={formStep === 2 ? 'block' : 'hidden'}>
                <div className="mb-6 rounded-[20px] bg-tle-cream p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="font-sans text-[22px] font-semibold text-tle-ink">
                      {calDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex size-[34px] items-center justify-center rounded-full border border-black/10 bg-white text-tle-muted transition-colors hover:border-tle-pink hover:text-tle-pink"
                        onClick={() => setCalDate((d) => addMonths(d, -1))}
                        aria-label="Previous month"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                      </button>
                      <button
                        type="button"
                        className="flex size-[34px] items-center justify-center rounded-full border border-black/10 bg-white text-tle-muted transition-colors hover:border-tle-pink hover:text-tle-pink"
                        onClick={() => setCalDate((d) => addMonths(d, 1))}
                        aria-label="Next month"
                      >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 grid grid-cols-7 text-center">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                      <div key={d} className="py-1.5 text-[10px] font-bold tracking-wide text-tle-faint uppercase">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">{calendarCells}</div>
                </div>

                <p className="mb-3.5 text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Select a Time</p>
                <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot.label}
                      role="button"
                      tabIndex={slot.taken ? -1 : 0}
                      className={`rounded-xl border-[1.5px] py-3 text-center text-[12.5px] font-semibold transition-all ${
                        slot.taken
                          ? 'cursor-not-allowed border-transparent bg-tle-cream text-tle-faint'
                          : selectedTime === slot.label
                            ? 'cursor-pointer border-tle-charcoal bg-tle-charcoal text-white'
                            : 'cursor-pointer border-black/10 bg-white text-tle-muted hover:border-tle-pink hover:text-tle-pink'
                      }`}
                      onClick={() => {
                        if (slot.taken) return
                        setSelectedTime(slot.label)
                      }}
                      onKeyDown={(e) => {
                        if (!slot.taken && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          setSelectedTime(slot.label)
                        }
                      }}
                    >
                      {slot.label}
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    className="rounded-full border-[1.5px] border-black/10 bg-transparent px-8 py-3.5 font-sans text-xs font-semibold tracking-wide text-tle-muted uppercase transition-colors hover:border-tle-ink hover:text-tle-ink"
                    onClick={() => goToStep(1)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-full bg-tle-charcoal px-11 py-4 font-sans text-xs font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-pink"
                    onClick={() => goToStep(3)}
                  >
                    Continue
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className={formStep === 3 ? 'block' : 'hidden'}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Full Name</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="+234 xxx xxxx xxx"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Email Address</label>
                    <input
                      type="email"
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="hello@example.com"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Location / Venue</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="Your address or venue name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Skin Type</label>
                    <select
                      className="w-full cursor-pointer appearance-none rounded-xl border-[1.5px] border-black/10 bg-white bg-[length:12px] bg-[right_16px_center] bg-no-repeat px-[18px] py-3.5 pr-11 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A7E78' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                      }}
                      defaultValue=""
                    >
                      <option value="">Select skin type</option>
                      <option>Oily</option>
                      <option>Dry</option>
                      <option>Combination</option>
                      <option>Normal</option>
                      <option>Sensitive</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">
                      Any Allergies or Skin Concerns?
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="e.g. fragrance-free, no latex"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">
                    Special Notes or Requests
                  </label>
                  <textarea
                    className="min-h-[100px] w-full resize-y rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm leading-relaxed text-tle-ink outline-none transition-colors focus:border-tle-pink"
                    placeholder="Tell us about your vision, references, or anything we should know..."
                  />
                </div>
                <div className="mt-10 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    className="rounded-full border-[1.5px] border-black/10 bg-transparent px-8 py-3.5 font-sans text-xs font-semibold tracking-wide text-tle-muted uppercase transition-colors hover:border-tle-ink hover:text-tle-ink"
                    onClick={() => goToStep(2)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-full bg-tle-charcoal px-11 py-4 font-sans text-xs font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-pink"
                    onClick={() => goToStep(4)}
                  >
                    Review Booking
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className={formStep === 4 ? 'block' : 'hidden'}>
                <div className="mb-7 rounded-[20px] bg-tle-cream p-7">
                  <p className="mb-4 text-[10.5px] font-bold tracking-wide text-tle-muted uppercase">Booking Summary</p>
                  <div className="flex items-center justify-between border-b border-black/5 py-2.5">
                    <span className="text-[11.5px] font-medium text-tle-muted">Service</span>
                    <span className="text-[13.5px] font-semibold text-tle-ink">{selectedService.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 py-2.5">
                    <span className="text-[11.5px] font-medium text-tle-muted">Date</span>
                    <span className="text-[13.5px] font-semibold text-tle-ink">{selectedDateLabel || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 py-2.5">
                    <span className="text-[11.5px] font-medium text-tle-muted">Time</span>
                    <span className="text-[13.5px] font-semibold text-tle-ink">{selectedTime || '—'}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between border-t border-black/10 pt-4">
                    <span className="text-[11.5px] font-bold text-tle-ink">Total</span>
                    <span className="font-sans text-[26px] font-semibold text-tle-gold">{selectedService.price || '—'}</span>
                  </div>
                </div>

                <p className="mb-3.5 text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Payment Details</p>
                <div className="mb-4 flex flex-col gap-2">
                  <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Card Number</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm outline-none focus:border-tle-pink"
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Name on Card</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm outline-none focus:border-tle-pink"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Expiry</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm outline-none focus:border-tle-pink"
                        placeholder="MM / YY"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">CVV</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm outline-none focus:border-tle-pink"
                        placeholder="•••"
                      />
                    </div>
                  </div>
                </div>

                <div className="my-2 flex items-center gap-2 text-xs text-tle-muted">
                  <span className="material-symbols-outlined text-base">lock</span>
                  Secured with 256-bit SSL encryption
                </div>

                <div className="mt-10 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    className="rounded-full border-[1.5px] border-black/10 bg-transparent px-8 py-3.5 font-sans text-xs font-semibold tracking-wide text-tle-muted uppercase transition-colors hover:border-tle-ink hover:text-tle-ink"
                    onClick={() => goToStep(3)}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2.5 rounded-full bg-tle-pink px-11 py-4 font-sans text-xs font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-deep"
                    onClick={confirmBooking}
                  >
                    Pay &amp; Confirm
                    <span className="material-symbols-outlined text-lg">check</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section
          className={`${showSuccess ? 'flex' : 'hidden'} flex-col items-center bg-tle-cream px-6 py-20 md:px-20`}
          id="success-screen"
        >
          <div className="mb-7 flex size-20 items-center justify-center rounded-full bg-tle-blush text-tle-pink">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>
          <h2 className="mb-3 text-center font-sans text-[clamp(2.25rem,4vw,3.25rem)] font-semibold text-tle-ink">
            You&apos;re All Booked! 🎉
          </h2>
          <p className="mb-10 max-w-[440px] text-center text-[15px] leading-relaxed text-tle-muted">
            Your session is confirmed. Check your email for a full summary and reminder. We can&apos;t wait to see you!
          </p>
          <div className="mb-9 w-full max-w-[480px] rounded-[20px] border border-tle-gold/20 bg-white px-8 py-8">
            {[
              ['Service', successDetails.service],
              ['Date', successDetails.date],
              ['Time', successDetails.time],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-black/5 py-2.5 last:border-0">
                <span className="text-[11.5px] font-medium text-tle-muted">{k}</span>
                <span className="text-[13.5px] font-semibold text-tle-ink">{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2.5">
              <span className="text-[11.5px] font-medium text-tle-muted">Booking Ref</span>
              <span className="text-[13.5px] font-semibold text-tle-pink">#TLE-20251</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3.5">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-tle-charcoal px-9 py-[17px] font-sans text-xs font-semibold tracking-wide text-white uppercase transition-all hover:bg-tle-pink"
              onClick={resetSuccess}
            >
              Back to Home
            </button>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-tle-ink/20 px-9 py-[17px] font-sans text-xs font-semibold tracking-wide text-tle-ink uppercase no-underline transition-all hover:border-tle-pink hover:text-tle-pink"
            >
              Continue Shopping
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
