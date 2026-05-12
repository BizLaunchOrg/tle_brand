import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { MakeupBookingDateTimePick } from '../../components/MakeupBookingDateTimePick.tsx'
import { ProductCard } from '../../components/ProductCard.tsx'
import { defaultVariantSelection } from '../../data/products.ts'
import {
  BOOKABLE_SERVICES,
  MAKEUP_HIGHLIGHT_TAGS,
  PHOTOSHOOT_PACKAGES,
  bookableServiceFromPhotoshootLine,
} from '../../data/bookingServices.ts'
import { formatBookingDateLabel } from '../../lib/makeupBookingDates.ts'
import { insertMakeupBooking } from '../../lib/makeupBookings.ts'
import {
  fetchPublicMakeupAvailability,
  type MakeupAvailabilityRuleRow,
  type MakeupCalendarDay,
} from '../../lib/makeupAvailability.ts'
import { useShopProducts } from '../../context/ShopProductsContext.tsx'
import { useCartDrawer } from '../../context/CartDrawerContext.tsx'

const MARQUEE_ITEMS = [
  'Soft Glam',
  'Bridal Beauty',
  'Statement Jewelry',
  'Fashion Pieces',
  'Luxury Accessories',
  'Elevated Style',
  'Makeup Studio',
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

const revealCls =
  'reveal opacity-0 translate-y-8 transition-all duration-[750ms] ease-out [&.in]:translate-y-0 [&.in]:opacity-100'

export function LandingPage() {
  const products = useShopProducts()
  const wrapRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleFavorite, isFavorite, hasProductInCart } = useCartDrawer()

  const catalogSearch = (searchParams.get('q') || '').trim().toLowerCase()

  const [filterGender, setFilterGender] = useState<'all' | 'her' | 'him'>('all')
  const [formStep, setFormStep] = useState(1)
  const [selectedService, setSelectedService] = useState({ name: '', price: '' })
  const [selectedTime, setSelectedTime] = useState('')
  const [preferredDateIso, setPreferredDateIso] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState({
    service: 'Studio Session',
    date: 'May 12, 2025',
    time: '2:00 PM',
    bookingRef: '',
  })
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerLocation, setCustomerLocation] = useState('')
  const [skinType, setSkinType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [availabilityRules, setAvailabilityRules] = useState<MakeupAvailabilityRuleRow[]>([])
  const [bookingStep1Focus, setBookingStep1Focus] = useState<'all' | 'photoshoot'>('all')
  const [availabilityCalendar, setAvailabilityCalendar] = useState<MakeupCalendarDay[]>([])

  useEffect(() => {
    void fetchPublicMakeupAvailability().then(({ rules, calendarDays }) => {
      setAvailabilityRules(rules)
      setAvailabilityCalendar(calendarDays)
    })
  }, [])

  useEffect(() => {
    const id = location.hash.replace(/^#/, '')
    if (!id) return
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [location.hash, location.pathname])

  const bookingIntent = searchParams.get('booking')
  useEffect(() => {
    if (bookingIntent !== 'photoshoot') return
    setBookingStep1Focus('photoshoot')
    setFormStep(1)
    setBookingError(null)
    requestAnimationFrame(() => {
      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('booking')
        return next
      },
      { replace: true },
    )
  }, [bookingIntent, setSearchParams])

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
  }, [products.length, filterGender, catalogSearch])

  const scrollToBooking = useCallback(() => {
    document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const goToStep = useCallback(
    (n: number) => {
      setBookingError(null)
      setFormStep(n)
      scrollToBooking()
    },
    [scrollToBooking],
  )

  const pickPhotoshootPackage = useCallback(
    (line: string) => {
      const s = bookableServiceFromPhotoshootLine(line)
      if (!s) return
      setSelectedService({ name: s.name, price: s.price })
      setBookingError(null)
      setFormStep(2)
      scrollToBooking()
    },
    [scrollToBooking],
  )

  const openHeroPhotoshootBooking = useCallback(() => {
    setBookingStep1Focus('photoshoot')
    setFormStep(1)
    setBookingError(null)
    requestAnimationFrame(() => {
      document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const visibleProducts = useMemo(() => {
    return products.filter((p) => {
      if (filterGender !== 'all' && p.gender !== filterGender) return false
      if (!catalogSearch) return true
      const hay = `${p.name} ${p.cat} ${p.badge} ${p.alt}`.toLowerCase()
      return hay.includes(catalogSearch)
    })
  }, [catalogSearch, filterGender, products])

  /** Home teaser only: 8 items = two rows of four, then Shop all (full catalog on /shop) */
  const HOME_SHOP_PREVIEW = 8
  const homeShopProducts = useMemo(() => visibleProducts.slice(0, HOME_SHOP_PREVIEW), [visibleProducts])

  const preferredDateLabel = useMemo(() => formatBookingDateLabel(preferredDateIso), [preferredDateIso])

  const confirmBooking = async () => {
    setBookingError(null)
    if (!selectedService.name.trim()) {
      setBookingError('Please choose a service.')
      return
    }
    if (!preferredDateIso.trim() || !selectedTime) {
      setBookingError('Pick a day on the calendar, then pick a time.')
      return
    }
    const name = customerName.trim()
    const phone = customerPhone.trim()
    const email = customerEmail.trim()
    if (!name || !phone || !email) {
      setBookingError('Please complete your details (name, phone, and email) on the previous step.')
      goToStep(3)
      return
    }

    setBookingSubmitting(true)
    const res = await insertMakeupBooking({
      source: 'landing',
      service_name: selectedService.name,
      service_price: selectedService.price,
      preferred_date: preferredDateLabel,
      preferred_time: selectedTime,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      location_venue: customerLocation.trim(),
      skin_type: skinType.trim(),
      allergies: allergies.trim(),
      notes: bookingNotes.trim(),
    })
    setBookingSubmitting(false)

    if (res.ok === false) {
      setBookingError(res.message)
      return
    }

    setSuccessDetails({
      service: selectedService.name || 'Studio Session',
      date: preferredDateLabel,
      time: selectedTime,
      bookingRef: res.id.slice(0, 8).toUpperCase(),
    })
    setShowSuccess(true)
    setTimeout(() => {
      document.getElementById('success-screen')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const resetSuccess = () => {
    setShowSuccess(false)
    setBookingError(null)
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
              Tobilicious by Lady Emma
                 
              </span>
            </div>

            <h1 className="font-heading mb-8 w-full max-w-[min(100%,22ch)] leading-[1.06] max-lg:mx-auto max-lg:text-center lg:max-w-[min(100%,18ch)]">
              <span className="block whitespace-nowrap text-[clamp(2.1rem,5.2vw,3.35rem)] font-medium tracking-[-0.04em] text-tle-ink">
                Show up
              </span>
              <span className="mt-1.5 block text-[clamp(2.45rem,6.8vw,4.85rem)] font-semibold tracking-[-0.045em] text-tle-pink sm:mt-2">
                Majestically
              </span>
            </h1>

            <p className="mb-11 max-w-[min(100%,42rem)] text-[13px] font-normal leading-[1.65] text-black sm:text-[15px] sm:leading-[1.7] lg:text-[17px] lg:leading-[1.72] max-lg:mx-auto max-lg:text-center lg:mx-0 lg:text-left dark:text-black">
              From curated fashion pieces to flawless glam, TLE is designed for people who love beauty,
              confidence, and intentional style.
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
                Book a Makeup Session
                <span className="material-symbols-outlined text-lg leading-none">calendar_month</span>
              </Link>
            </div>

            <div className="mb-8 flex max-lg:justify-center items-center gap-3.5">
              <div className="flex">
                {[
                  { src: '/Imagereviews4.jpeg', alt: 'Client makeup look review' },
                  { src: '/Imagereviews5.jpeg', alt: 'Client makeup look review' },
                  { src: '/Imagereviews6.jpeg', alt: 'Client makeup look review' },
                ].map((item, i) => (
                  <img
                    key={item.src}
                    src={item.src}
                    alt={item.alt}
                    className={`size-[34px] rounded-full border-[2.5px] border-white object-cover shadow-md ${i > 0 ? '-ml-2.5' : ''}`}
                  />
                ))}
              </div>
              <div className="text-left leading-snug max-lg:text-center">
                <strong className="block text-[13px] font-semibold text-tle-ink">100+ happy clients</strong>
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

          <div className="relative min-h-[55vh] overflow-hidden bg-tle-cream lg:min-h-0" id="photoshoot-promo">
            <img
              src="/promo-hero.png"
              alt="TLE-BRAND studio portrait"
              className="absolute inset-0 size-full object-cover object-[center_22%] max-lg:object-[center_15%]"
            />
            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/55 via-black/15 to-transparent lg:bg-gradient-to-r lg:from-white/[0.12] lg:via-transparent lg:to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-32 bg-gradient-to-t from-black/40 to-transparent lg:hidden" aria-hidden />

            <div className="absolute inset-x-4 bottom-5 z-20 max-w-md pointer-events-none sm:inset-x-auto sm:right-6 sm:bottom-8 sm:max-w-sm lg:right-10 lg:bottom-12 lg:max-w-[24rem]">
              <div className="pointer-events-auto rounded-[26px] border border-white/55 bg-white/[0.97] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-6">
                <p className="inline-flex rounded-full border border-tle-gold/35 bg-tle-gold/10 px-3 py-1 font-sans text-[9px] font-bold tracking-[0.2em] text-tle-gold uppercase">
                  Exclusive offer
                </p>
                <h3 className="mt-3 font-sans text-[clamp(1.05rem,3.8vw,1.35rem)] font-semibold leading-snug text-tle-ink">
                  Book a makeup session and enjoy an exclusive studio photoshoot experience.
                </h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-tle-muted">
                  Tap below to choose your photoshoot bundle (outfits &amp; edited pictures), then pick your date and time.
                </p>
                <button
                  type="button"
                  onClick={openHeroPhotoshootBooking}
                  className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-0 bg-tle-charcoal px-5 py-3.5 font-sans text-[11px] font-bold tracking-[0.14em] text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-pink hover:shadow-[0_12px_28px_rgba(196,105,141,0.35)] sm:w-auto sm:px-7"
                >
                  Book makeup + photoshoot
                  <span className="material-symbols-outlined text-[18px] leading-none">calendar_month</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="flex overflow-hidden bg-tle-charcoal py-[22px] sm:py-6">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((text, i) => (
              <span
                key={i}
                className="inline-flex shrink-0 items-center gap-6 px-6 text-[11.5px] font-semibold tracking-[0.12em] text-white/70 normal-case sm:text-xs sm:tracking-[0.14em]"
              >
                {text}{' '}
                <span className="size-1.5 shrink-0 rounded-full bg-tle-gold" />
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

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4 md:gap-5">
            {visibleProducts.length === 0 ? (
              <div className="col-span-full rounded-[20px] border border-black/8 bg-tle-cream/80 px-6 py-14 text-center">
                {products.length === 0 ? (
                  <>
                    <p className="font-sans text-lg font-medium text-tle-ink">New arrivals are on the way.</p>
                    <p className="mt-2 text-sm text-tle-muted">Check back soon, or open the shop to see the full range when it&apos;s live.</p>
                    <Link
                      to="/shop"
                      className="mt-6 inline-flex rounded-full border border-tle-charcoal bg-tle-charcoal px-6 py-2.5 text-xs font-semibold tracking-wide text-white uppercase no-underline transition-colors hover:bg-tle-pink"
                    >
                      Go to shop
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-sans text-lg font-medium text-tle-ink">No products match your search.</p>
                    <p className="mt-2 text-sm text-tle-muted">Try a different word or browse all categories.</p>
                    <button
                      type="button"
                      className="mt-6 inline-flex rounded-full border border-tle-pink bg-tle-pink px-6 py-2.5 text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-deep"
                      onClick={() => setSearchParams({}, { replace: true })}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : null}
            {homeShopProducts.map((p, idx) => {
              const delay =
                idx === 0 ? 'delay-100' : idx === 1 ? 'delay-200' : idx === 2 ? 'delay-300' : 'delay-500'
              return (
                <div key={p.slug} className={`${revealCls} ${delay}`}>
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
            <div className="mt-8 flex flex-col items-center gap-4 sm:mt-10">
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

        <div className={`${revealCls} px-4 pb-20 md:px-10 lg:px-16`} id="makeup">
          <div className="relative overflow-hidden rounded-[36px] bg-tle-charcoal px-6 py-10 md:px-12 md:py-14 lg:px-16">
            <div className="pointer-events-none absolute -top-20 -right-20 size-80 rounded-full border border-tle-gold/15" />
            <div className="pointer-events-none absolute right-24 -bottom-12 size-[200px] rounded-full border border-tle-gold/10" />
            <div className="relative z-[2] grid gap-8 md:grid-cols-2 md:gap-12">
              <div>
                <div className="mb-4 text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Makeup &amp; Aesthetics</div>
                <h2 className="mb-4 font-sans text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.08] font-semibold text-white">
                  Book Your
                  <br />
                  <em className="font-sans font-medium italic text-tle-pink">Glow-Up</em>
                  <br />
                  Session.
                </h2>
                <p className="mb-7 max-w-[400px] text-[14.5px] font-light leading-[1.85] text-white/50">
                  Studio session at <span className="text-white/75">₦35,000</span>. Home service from{' '}
                  <span className="text-white/75">₦50,000</span> and bridal from <span className="text-white/75">₦100,000</span> — both
                  depend on location. Use the hero offer for photoshoot bundles, or book any option below.
                </p>
                <div className="mb-8 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {MAKEUP_HIGHLIGHT_TAGS.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2.5 rounded-[13px] border border-white/10 bg-white/5 px-4 py-3.5 transition-colors hover:border-tle-pink/30 hover:bg-tle-pink/10"
                    >
                      <span className="size-1.5 shrink-0 rounded-full bg-tle-pink" />
                      <span className="text-[12.5px] font-medium text-white/80">{name}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/#booking-form"
                  className="relative z-[2] inline-flex items-center gap-2.5 rounded-full bg-white px-10 py-[18px] font-sans text-xs font-bold tracking-wide text-tle-charcoal uppercase no-underline transition-all hover:-translate-y-0.5 hover:bg-tle-pink hover:text-white hover:shadow-[0_12px_32px_rgba(196,105,141,0.25)]"
                >
                  Book a Session
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </Link>
              </div>
              <div className="overflow-hidden rounded-2xl">
                <div className="h-full min-h-[260px] overflow-hidden md:min-h-[380px]">
                  <img
                    src="/tlepic2.jpeg"
                    alt="Book your glow-up session"
                    className="size-full object-cover object-top brightness-[0.92] transition-transform duration-500 hover:scale-105"
                  />
                </div>
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
              src="/Imagereviews1.jpeg"
              alt="TLE makeup and aesthetics"
              className="absolute -right-8 -bottom-11 w-[44%] rounded-full border-[6px] border-tle-cream object-cover shadow-xl max-md:hidden"
            />
            <div className="absolute top-8 -left-8 rounded-[18px] bg-tle-pink px-6 py-5 text-white shadow-[0_20px_44px_rgba(196,105,141,0.32)] max-md:hidden">
              <div className="font-sans text-[44px] font-bold leading-none">100+</div>
              <div className="text-[11px] font-medium tracking-wide opacity-80">Happy Clients</div>
            </div>
          </div>
          <div className="py-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px w-[22px] bg-tle-gold" />
              <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Our Story</span>
            </div>
            <h2 className="font-heading mb-5 text-[clamp(2.25rem,4vw,3.375rem)] leading-[1.12] font-semibold tracking-tight">
              <span className="text-tle-ink">The </span>
              <span className="text-tle-gold">Royal</span>
              <span className="text-tle-ink"> In </span>
              <span className="text-tle-pink">You.</span>
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
                {bookingStep1Focus === 'photoshoot'
                  ? 'Choose your photoshoot bundle (makeup session included), then pick your date and time.'
                  : "Pick your service, pick the day and time you want, tell us about you — and you're set."}
              </p>

              {bookingError ? (
                <div
                  className={
                    'mb-8 rounded-2xl border px-4 py-3 text-center text-[13px] font-medium ' +
                    'border-rose-200 bg-rose-50 text-rose-900'
                  }
                  role="alert"
                >
                  {bookingError}
                </div>
              ) : null}

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
                      {i === 1 ? 'Service' : i === 2 ? 'Day & time' : i === 3 ? 'Your Details' : 'Confirm'}
                    </span>
                  </div>
                ))}
              </div>

              <div className={formStep === 1 ? 'block' : 'hidden'}>
                {bookingStep1Focus === 'photoshoot' ? (
                  <>
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-center text-[13px] leading-relaxed text-tle-muted sm:text-left">
                        Studio photoshoot packages with edited pictures — your makeup session is part of this offer. Tap a
                        card to go straight to date &amp; time.
                      </p>
                      <button
                        type="button"
                        onClick={() => setBookingStep1Focus('all')}
                        className="shrink-0 self-center rounded-full border border-black/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-tle-muted transition-colors hover:border-tle-pink hover:text-tle-pink sm:self-start"
                      >
                        Studio / home / bridal instead
                      </button>
                    </div>
                    <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {PHOTOSHOOT_PACKAGES.map((p) => {
                        const s = bookableServiceFromPhotoshootLine(p.line)
                        if (!s) return null
                        return (
                          <div
                            key={p.line}
                            role="button"
                            tabIndex={0}
                            className="relative cursor-pointer overflow-hidden rounded-[18px] border-[1.5px] border-tle-gold/35 bg-gradient-to-b from-tle-blush/60 to-white p-5 text-left transition-all hover:border-tle-gold hover:shadow-md"
                            onClick={() => pickPhotoshootPackage(p.line)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                pickPhotoshootPackage(p.line)
                              }
                            }}
                          >
                            <div className="mb-3 flex size-[42px] items-center justify-center rounded-xl bg-white text-tle-gold ring-1 ring-tle-gold/25">
                              <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                            </div>
                            <div className="mb-1 text-[13.5px] font-semibold leading-snug text-tle-ink">{p.line}</div>
                            <div className="font-sans text-[17px] font-semibold text-tle-gold">{p.price}</div>
                            <p className="mt-2 text-[11.5px] leading-snug text-tle-muted">{s.desc}</p>
                            <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-tle-pink">Continue to date &amp; time →</p>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-6 text-center text-[13px] text-tle-muted">
                      Want the{' '}
                      <button
                        type="button"
                        className="font-semibold text-tle-pink underline decoration-tle-pink/40 underline-offset-2 hover:decoration-tle-pink"
                        onClick={() => {
                          setBookingStep1Focus('photoshoot')
                          setBookingError(null)
                        }}
                      >
                        photoshoot bundles
                      </button>
                      ? (Makeup session included.)
                    </p>
                    <div className="mb-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {BOOKABLE_SERVICES.filter((s) => s.duration !== 'Photoshoot').map((s) => {
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
                            <div className="mb-1 text-[13.5px] font-semibold leading-snug text-tle-ink">{s.name}</div>
                            <div className="font-sans text-[17px] font-semibold text-tle-gold">{s.price}</div>
                            <p className="mt-2 text-[11.5px] leading-snug text-tle-muted">{s.desc}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-10 flex justify-end">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2.5 rounded-full bg-tle-charcoal px-11 py-4 font-sans text-xs font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-pink disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => {
                          if (!selectedService.name) {
                            setBookingError('Please select a service to continue.')
                            return
                          }
                          goToStep(2)
                        }}
                      >
                        Continue
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className={formStep === 2 ? 'block' : 'hidden'}>
                <MakeupBookingDateTimePick
                  availabilityRules={availabilityRules}
                  calendarDays={availabilityCalendar}
                  dateIso={preferredDateIso}
                  onDateIsoChange={(iso) => {
                    setPreferredDateIso(iso)
                  }}
                  selectedTime={selectedTime}
                  onTimeChange={setSelectedTime}
                />

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
                    onClick={() => {
                      if (!preferredDateIso.trim() || !selectedTime) {
                        setBookingError('Pick a day on the calendar, then pick a time before continuing.')
                        return
                      }
                      goToStep(3)
                    }}
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
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="Your full name"
                      autoComplete="name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Phone Number</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="+234 xxx xxxx xxx"
                      autoComplete="tel"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Email Address</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="hello@example.com"
                      autoComplete="email"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Location / Venue</label>
                    <input
                      type="text"
                      value={customerLocation}
                      onChange={(e) => setCustomerLocation(e.target.value)}
                      className="w-full rounded-xl border-[1.5px] border-black/10 px-[18px] py-3.5 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      placeholder="Your address or venue name"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">Skin Type</label>
                    <select
                      value={skinType}
                      onChange={(e) => setSkinType(e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border-[1.5px] border-black/10 bg-white bg-[length:12px] bg-[right_16px_center] bg-no-repeat px-[18px] py-3.5 pr-11 font-sans text-sm text-tle-ink outline-none transition-colors focus:border-tle-pink"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238A7E78' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                      }}
                    >
                      <option value="">Select skin type</option>
                      <option value="Oily">Oily</option>
                      <option value="Dry">Dry</option>
                      <option value="Combination">Combination</option>
                      <option value="Normal">Normal</option>
                      <option value="Sensitive">Sensitive</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold tracking-wide text-tle-muted uppercase">
                      Any Allergies or Skin Concerns?
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
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
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
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
                    <span className="text-[13.5px] font-semibold text-tle-ink">{preferredDateLabel || '—'}</span>
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
                    disabled={bookingSubmitting}
                    className="inline-flex items-center gap-2.5 rounded-full bg-tle-pink px-11 py-4 font-sans text-xs font-bold tracking-wide text-white uppercase transition-all hover:-translate-y-0.5 hover:bg-tle-deep disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void confirmBooking()}
                  >
                    {bookingSubmitting ? 'Saving…' : 'Pay &amp; Confirm'}
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
              <span className="font-mono text-[13.5px] font-semibold text-tle-pink">
                {successDetails.bookingRef ? `#${successDetails.bookingRef}` : '—'}
              </span>
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
