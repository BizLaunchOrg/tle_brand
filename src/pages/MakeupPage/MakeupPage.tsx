import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MakeupBookingDateTimePick } from '../../components/MakeupBookingDateTimePick.tsx'
import {
  BOOKABLE_SERVICES,
  PHOTOSHOOT_PACKAGES,
  bookableServiceFromPhotoshootLine,
  isPhotoshootService,
} from '../../data/bookingServices.ts'
import type { BookableServiceItem } from '../../data/bookingServices.ts'
import { formatBookingDateLabel } from '../../lib/makeupBookingDates.ts'
import { insertMakeupBooking } from '../../lib/makeupBookings.ts'
import {
  fetchPublicMakeupAvailability,
  type MakeupAvailabilityRuleRow,
  type MakeupCalendarDay,
} from '../../lib/makeupAvailability.ts'

const TESTIMONIALS = [
  {
    name: 'Amara O.',
    role: 'Bride',
    text: 'My wedding glam stayed flawless from morning till after-party. Exactly what I asked for.',
  },
  {
    name: 'Damilola K.',
    role: 'Content Creator',
    text: 'The skin prep and blend were perfect. Photos came out clean and premium.',
  },
  {
    name: 'Tobi A.',
    role: 'Grooming Client',
    text: 'Professional and fast. I looked polished but still natural.',
  },
] as const

const HIGHLIGHTS = [
  { label: 'Looks Completed', value: '1,200+' },
  { label: 'Bridal Bookings', value: '380+' },
  { label: 'Client Rating', value: '4.9/5' },
] as const

/** Client review photos in `public/` — HEIC slot falls back to JPEG in browsers that cannot decode HEIC. */
const REVIEW_IMAGES = [
  { src: '/Imagereviews1.jpeg', alt: 'Makeup look sample 1', fallback: '/Imagereviews1.jpeg' },
  { src: '/Imagereviews2.jpeg', alt: 'Makeup look sample 2', fallback: '/Imagereviews2.jpeg' },
  { src: '/Imagereviews3.HEIC', alt: 'Makeup look sample 3', fallback: '/Imagereviews4.jpeg' },
  { src: '/Imagereviews4.jpeg', alt: 'Makeup look sample 4', fallback: '/Imagereviews4.jpeg' },
  { src: '/Imagereviews5.jpeg', alt: 'Makeup look sample 5', fallback: '/Imagereviews5.jpeg' },
  { src: '/Imagereviews6.jpeg', alt: 'Makeup look sample 6', fallback: '/Imagereviews6.jpeg' },
  { src: '/Imagereviews7.jpeg', alt: 'Makeup look sample 7', fallback: '/Imagereviews7.jpeg' },
] as const

export function MakeupPage() {
  const [formStep, setFormStep] = useState(1)
  const [selectedService, setSelectedService] = useState<BookableServiceItem | null>(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [preferredDateIso, setPreferredDateIso] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingSuccessRef, setBookingSuccessRef] = useState<string | null>(null)
  const [availabilityRules, setAvailabilityRules] = useState<MakeupAvailabilityRuleRow[]>([])
  const [availabilityCalendar, setAvailabilityCalendar] = useState<MakeupCalendarDay[]>([])

  useEffect(() => {
    void fetchPublicMakeupAvailability().then(({ rules, calendarDays }) => {
      setAvailabilityRules(rules)
      setAvailabilityCalendar(calendarDays)
    })
  }, [])

  const preferredDateLabel = useMemo(() => formatBookingDateLabel(preferredDateIso), [preferredDateIso])

  const goToStep = (step: number) => {
    setBookingError(null)
    setFormStep(step)
    document.getElementById('makeup-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickPhotoshootPackage = (line: string) => {
    const s = bookableServiceFromPhotoshootLine(line)
    if (!s) return
    setBookingSuccessRef(null)
    setSelectedService(s)
    setBookingError(null)
    setFormStep(2)
    document.getElementById('makeup-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const confirmMakeupBooking = async () => {
    setBookingError(null)
    if (!selectedService) {
      setBookingError('Please select a service.')
      return
    }
    if (!preferredDateIso.trim() || !selectedTime) {
      setBookingError('Pick a day on the calendar, then pick a time.')
      goToStep(2)
      return
    }
    const name = customerName.trim()
    const phone = customerPhone.trim()
    const email = customerEmail.trim()
    if (!name || !phone || !email) {
      setBookingError('Please add your name, phone, and email.')
      goToStep(3)
      return
    }

    setBookingSubmitting(true)
    const res = await insertMakeupBooking({
      source: 'makeup',
      service_name: selectedService.name,
      service_price: selectedService.price,
      preferred_date: preferredDateLabel || preferredDateIso,
      preferred_time: selectedTime,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      location_venue: '',
      skin_type: '',
      allergies: '',
      notes: bookingNotes.trim(),
    })
    setBookingSubmitting(false)

    if (res.ok === false) {
      setBookingError(res.message)
      return
    }
    setBookingSuccessRef(res.id.slice(0, 8).toUpperCase())
    setFormStep(1)
    setSelectedService(null)
    setSelectedTime('')
    setPreferredDateIso('')
    setCustomerName('')
    setCustomerPhone('')
    setCustomerEmail('')
    setBookingNotes('')
  }

  return (
    <section className="min-h-0 flex-1 bg-gradient-to-b from-tle-cream/90 via-[#fff8fb] to-white px-4 pb-20 pt-28 sm:px-6 md:px-10 md:pt-32 lg:px-16">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="relative mb-8 grid gap-6 overflow-hidden rounded-[34px] border border-tle-pink/20 bg-white/90 p-5 shadow-[0_24px_70px_rgba(170,85,122,0.14)] backdrop-blur sm:p-7 lg:grid-cols-2 lg:items-center">
          <div
            className="pointer-events-none absolute -top-16 -left-12 h-40 w-40 rounded-full bg-tle-pink/12 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-8 bottom-0 h-36 w-36 rounded-full bg-tle-gold/12 blur-3xl"
            aria-hidden
          />
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px w-[22px] bg-tle-gold" />
              <span className="text-[10px] font-semibold tracking-[0.22em] text-tle-gold uppercase">Makeup Services</span>
            </div>
            <h1 className="font-sans text-[clamp(2rem,5vw,3.2rem)] leading-tight font-semibold text-tle-ink">
              Your Signature <em className="font-sans font-medium italic text-tle-pink">Glow-Up</em>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-tle-muted sm:text-[15px]">
              Studio session at <span className="font-medium text-tle-ink">₦35,000</span>. Home service from{' '}
              <span className="font-medium text-tle-ink">₦50,000</span> and bridal from{' '}
              <span className="font-medium text-tle-ink">₦100,000</span> (home and bridal depend on location). Photoshoot
              bundles with edited pictures are listed below — book any option on this page or from the home booking form.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/#booking-form"
                className="inline-flex items-center gap-2 rounded-full bg-tle-charcoal px-6 py-3 text-[11px] font-semibold tracking-wide text-white uppercase no-underline transition-all hover:-translate-y-0.5 hover:bg-tle-pink"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">calendar_month</span>
                Book Session
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full border border-tle-pink/40 bg-white px-6 py-3 text-[11px] font-semibold tracking-wide text-tle-pink uppercase no-underline transition-all hover:-translate-y-0.5 hover:bg-tle-blush"
              >
                <span className="material-symbols-outlined text-[16px] leading-none">storefront</span>
                Shop Products
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {REVIEW_IMAGES.slice(0, 5).map((item, index) => (
              <div
                key={item.src}
                className={`overflow-hidden rounded-2xl ${index === 0 ? 'col-span-2' : ''}`}
              >
                <img
                  src={item.src}
                  alt={item.alt}
                  onError={(e) => {
                    e.currentTarget.src = item.fallback
                  }}
                  className={`w-full object-cover transition-transform duration-700 hover:scale-[1.03] ${
                    index === 0 ? 'aspect-[16/9] object-top' : 'aspect-square'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10 grid gap-3 rounded-3xl border border-tle-pink/15 bg-white/95 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.06)] sm:grid-cols-3 sm:gap-4 sm:p-5">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-black/5 bg-gradient-to-b from-[#fff7fb] to-white px-4 py-4 text-center"
            >
              <p className="font-sans text-2xl font-semibold text-tle-pink sm:text-[1.9rem]">{item.value}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-tle-muted uppercase">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-tle-gold uppercase">Services &amp; packages</p>
            <h2 className="mt-1 font-sans text-2xl font-semibold text-tle-ink sm:text-[2.05rem]">
              Makeup &amp; <em className="font-sans font-medium italic text-tle-pink">photoshoot</em> menu
            </h2>
          </div>
          {selectedService ? (
            <p className="rounded-full bg-tle-blush/80 px-4 py-2 text-[11px] font-semibold tracking-wide text-tle-pink uppercase">
              Selected: {selectedService.name}
            </p>
          ) : null}
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BOOKABLE_SERVICES.map((s) => (
            <article
              key={s.name}
              role="button"
              tabIndex={0}
              className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 ${
                selectedService?.name === s.name
                  ? 'border-tle-pink bg-tle-blush/40 shadow-[0_12px_26px_rgba(196,105,141,0.2)]'
                  : 'border-black/8 hover:-translate-y-1 hover:border-tle-pink/50 hover:shadow-[0_12px_26px_rgba(0,0,0,0.08)]'
              }`}
              onClick={() => {
                setBookingSuccessRef(null)
                setSelectedService(s)
                goToStep(2)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setBookingSuccessRef(null)
                  setSelectedService(s)
                  goToStep(2)
                }
              }}
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">{s.duration}</p>
              <h2 className="mt-2 font-sans text-lg font-semibold leading-snug text-tle-ink sm:text-xl">{s.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-tle-muted">{s.desc}</p>
              <p className="mt-4 font-sans text-xl font-semibold text-tle-gold transition-transform duration-300 group-hover:translate-x-0.5">
                {s.price}
              </p>
            </article>
          ))}
        </div>

        <section
          id="makeup-booking"
          className="relative mb-12 overflow-hidden rounded-[30px] border border-tle-pink/15 bg-white/95 px-5 py-6 shadow-[0_20px_60px_rgba(150,70,105,0.1)] sm:px-7 sm:py-8"
        >
          <div
            id="photoshoot-packages"
            className="relative z-[2] mb-8 overflow-hidden rounded-[26px] border-2 border-tle-gold/35 bg-tle-charcoal px-5 py-7 text-white shadow-[0_16px_40px_rgba(14,14,14,0.14)] sm:px-7 sm:py-8"
          >
            <div className="pointer-events-none absolute -right-12 top-0 h-44 w-44 rounded-full bg-tle-pink/12 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-tle-gold/10 blur-3xl" aria-hidden />
            <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="min-w-0 flex-1">
                <p className="inline-flex rounded-full border border-tle-gold/30 bg-tle-gold/10 px-3 py-1 font-sans text-[9px] font-bold tracking-[0.2em] text-tle-gold uppercase">
                  Featured add-on
                </p>
                <h3 className="mt-3 font-sans text-[clamp(1.2rem,3vw,1.65rem)] font-semibold leading-snug">
                  Photoshoot packages — outfits &amp; edited pictures
                </h3>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">
                  Tap a package to continue — you&apos;ll pick your day on the calendar, then your time. Book now jumps ahead
                  when a photoshoot package is already selected from the menu above.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedService && isPhotoshootService(selectedService.name)) goToStep(2)
                  else goToStep(1)
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-tle-gold px-7 py-3.5 font-sans text-[11px] font-bold tracking-[0.14em] text-tle-charcoal uppercase shadow-lg shadow-black/15 transition-all hover:-translate-y-0.5 hover:bg-white"
              >
                Book now
                <span className="material-symbols-outlined text-lg">calendar_month</span>
              </button>
            </div>
            <div className="relative z-[1] mt-6 grid gap-3 sm:grid-cols-3">
              {PHOTOSHOOT_PACKAGES.map((p) => {
                const sel = selectedService?.name === bookableServiceFromPhotoshootLine(p.line)?.name
                return (
                  <div
                    key={p.line}
                    role="button"
                    tabIndex={0}
                    onClick={() => pickPhotoshootPackage(p.line)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        pickPhotoshootPackage(p.line)
                      }
                    }}
                    className={
                      'cursor-pointer rounded-2xl border px-4 py-3.5 outline-none transition-all ' +
                      (sel
                        ? 'border-tle-gold bg-tle-gold/20 ring-2 ring-tle-gold/50'
                        : 'border-white/12 bg-white/[0.07] hover:border-tle-gold/40')
                    }
                  >
                    <p className="text-[12px] font-semibold leading-snug text-white/95 sm:text-[12.5px]">{p.line}</p>
                    <p className="mt-1.5 font-sans text-base font-semibold text-tle-gold sm:text-lg">{p.price}</p>
                    <p className="mt-2 text-[10px] font-semibold tracking-wide text-tle-gold/90 uppercase">Select &amp; continue</p>
                  </div>
                )
              })}
            </div>
            <p className="relative z-[1] mt-4 text-center text-[10.5px] font-medium tracking-wide text-white/45 sm:text-left">
              Terms and conditions apply.
            </p>
          </div>

          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-tle-pink/10 blur-3xl" aria-hidden />
          <h3 className="relative z-[1] mb-4 font-sans text-2xl font-semibold text-tle-ink sm:text-[2rem]">
            Book Your <em className="font-sans font-medium italic text-tle-pink">Session</em>
          </h3>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-tle-muted">
            Four simple steps: choose your service, pick your day and time on the calendar, add your details, and confirm.
          </p>

          {bookingSuccessRef ? (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-900">
              Booking received! Reference <span className="font-mono font-bold">#{bookingSuccessRef}</span>. We&apos;ll be in touch
              soon.
            </div>
          ) : null}
          {bookingError ? (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-900" role="alert">
              {bookingError}
            </div>
          ) : null}

          <div className="relative mb-8 flex">
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
                    className={`absolute top-[16px] right-1/2 h-px w-full -translate-x-1/2 ${formStep >= i ? 'bg-tle-pink' : 'bg-black/10'}`}
                  />
                )}
                <div
                  className={`relative z-[1] flex size-8 items-center justify-center rounded-full border text-[12px] font-semibold ${
                    formStep === i
                      ? 'border-tle-pink bg-tle-pink text-white'
                      : formStep > i
                        ? 'border-tle-charcoal bg-tle-charcoal text-white'
                        : 'border-black/15 bg-white text-tle-muted'
                  }`}
                >
                  {i}
                </div>
                <span className={`text-[10px] font-semibold tracking-wide uppercase ${formStep === i ? 'text-tle-pink' : 'text-tle-muted'}`}>
                  {i === 1 ? 'Service' : i === 2 ? 'Day & time' : i === 3 ? 'Details' : 'Confirm'}
                </span>
              </div>
            ))}
          </div>

          <div className={formStep === 1 ? 'block' : 'hidden'}>
            <p className="mb-4 text-sm text-tle-muted">Choose a service card above to move to next step.</p>
            <button
              type="button"
              className="rounded-full bg-tle-charcoal px-6 py-3 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink"
              onClick={() => goToStep(2)}
              disabled={!selectedService}
            >
              Continue
            </button>
          </div>

          <div className={formStep === 2 ? 'block' : 'hidden'}>
            <div className="mb-4 rounded-xl border border-tle-pink/20 bg-tle-blush/40 px-4 py-3">
              <p className="text-[10px] font-semibold tracking-wide text-tle-muted uppercase">Selected Service</p>
              <p className="font-sans text-lg font-semibold text-tle-ink">{selectedService?.name || 'Not selected'}</p>
              <p className="text-sm text-tle-gold">{selectedService?.price || ''}</p>
            </div>
            <MakeupBookingDateTimePick
              availabilityRules={availabilityRules}
              calendarDays={availabilityCalendar}
              dateIso={preferredDateIso}
              onDateIsoChange={setPreferredDateIso}
              selectedTime={selectedTime}
              onTimeChange={setSelectedTime}
              calendarPanelClassName="mb-6 rounded-[22px] border border-tle-pink/12 bg-gradient-to-b from-tle-cream/80 to-white p-5 sm:p-6"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-black/10 px-5 py-2.5 text-[11px] font-semibold tracking-wide text-tle-muted uppercase"
                onClick={() => goToStep(1)}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-full bg-tle-charcoal px-6 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink"
                onClick={() => {
                  if (!preferredDateIso.trim() || !selectedTime) {
                    setBookingError('Pick a day on the calendar, then pick a time.')
                    return
                  }
                  goToStep(3)
                }}
              >
                Continue
              </button>
            </div>
          </div>

          <div className={formStep === 3 ? 'block' : 'hidden'}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink"
              />
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink sm:col-span-2"
              />
              <textarea
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="Special notes"
                className="min-h-[100px] w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink sm:col-span-2"
              />
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-black/10 px-5 py-2.5 text-[11px] font-semibold tracking-wide text-tle-muted uppercase"
                onClick={() => goToStep(2)}
              >
                Back
              </button>
              <button
                type="button"
                className="rounded-full bg-tle-charcoal px-6 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-pink"
                onClick={() => goToStep(4)}
              >
                Continue
              </button>
            </div>
          </div>

          <div className={formStep === 4 ? 'block' : 'hidden'}>
            <div className="rounded-xl border border-tle-gold/20 bg-tle-cream/70 px-4 py-4">
              <p className="text-[10px] font-semibold tracking-wide text-tle-muted uppercase">Booking Summary</p>
              <div className="mt-2 flex items-center justify-between border-b border-black/8 py-2">
                <span className="text-sm text-tle-muted">Service</span>
                <span className="text-sm font-semibold text-tle-ink">{selectedService?.name || '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/8 py-2">
                <span className="text-sm text-tle-muted">Date</span>
                <span className="text-sm font-semibold text-tle-ink">{preferredDateLabel || '—'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/8 py-2">
                <span className="text-sm text-tle-muted">Time</span>
                <span className="text-sm font-semibold text-tle-ink">{selectedTime || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-tle-muted">Price</span>
                <span className="text-sm font-semibold text-tle-gold">{selectedService?.price || '—'}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-black/10 px-5 py-2.5 text-[11px] font-semibold tracking-wide text-tle-muted uppercase"
                onClick={() => goToStep(3)}
              >
                Back
              </button>
              <button
                type="button"
                disabled={bookingSubmitting}
                className="rounded-full bg-tle-pink px-6 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-deep disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void confirmMakeupBooking()}
              >
                {bookingSubmitting ? 'Sending…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </section>

        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REVIEW_IMAGES.map((item) => (
            <div key={item.src} className="overflow-hidden rounded-2xl">
              <img
                src={item.src}
                alt={item.alt}
                onError={(e) => {
                  e.currentTarget.src = item.fallback
                }}
                className="aspect-[4/5] w-full object-cover object-top transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
          ))}
        </div>

        <div className="rounded-[30px] border border-tle-pink/15 bg-white px-5 py-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] sm:px-7 sm:py-8">
          <h3 className="font-sans text-2xl font-semibold text-tle-ink sm:text-[2rem]">
            Client <em className="font-sans font-medium italic text-tle-pink">Testimonials</em>
          </h3>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <article
                key={t.name}
                className="rounded-2xl border border-black/8 bg-gradient-to-b from-tle-cream/70 to-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <p className="text-sm leading-relaxed text-tle-ink">&ldquo;{t.text}&rdquo;</p>
                <p className="mt-3 text-[11px] font-semibold tracking-wide text-tle-pink uppercase">{t.name}</p>
                <p className="text-[11px] text-tle-muted">{t.role}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
