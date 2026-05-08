import { useState } from 'react'
import { Link } from 'react-router-dom'

const SERVICES = [
  { name: 'Bridal Glam', price: 'From ₦65,000', duration: '3-4 hrs', desc: 'Full bridal face beat, lashes, and long-wear finish.' },
  { name: 'Editorial Look', price: 'From ₦45,000', duration: '2-3 hrs', desc: 'High-impact camera-ready look for shoots and campaigns.' },
  { name: 'Natural Flawless', price: 'From ₦25,000', duration: '1-2 hrs', desc: 'Soft, skin-like finish for events and everyday glam.' },
  { name: 'Bold Evening', price: 'From ₦38,000', duration: '2 hrs', desc: 'Statement makeup with rich tones and dramatic eyes.' },
  { name: "Men's Grooming", price: 'From ₦20,000', duration: '1 hr', desc: 'Clean complexion grooming and shine control for men.' },
  { name: 'Trial Session', price: 'From ₦15,000', duration: '1 hr', desc: 'Preview your look before your event day.' },
] as const

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

const TIME_SLOTS = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'] as const
const HIGHLIGHTS = [
  { label: 'Looks Completed', value: '1,200+' },
  { label: 'Bridal Bookings', value: '380+' },
  { label: 'Client Rating', value: '4.9/5' },
] as const

export function MakeupPage() {
  const [formStep, setFormStep] = useState(1)
  const [selectedService, setSelectedService] = useState<(typeof SERVICES)[number] | null>(null)
  const [selectedTime, setSelectedTime] = useState('')

  const goToStep = (step: number) => {
    setFormStep(step)
    document.getElementById('makeup-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
              Professional makeup services for weddings, events, shoots, and personal glam. We match your skin, tone, and
              style so your look feels confident and timeless.
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
            <div className="col-span-2 overflow-hidden rounded-2xl">
              <img
                src="/tlepic2.jpeg"
                alt="Makeup artist at work"
                className="aspect-[16/9] w-full object-cover object-top transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/tlepic1.jpeg"
                alt="Beauty portrait"
                className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/product1.jpeg"
                alt="Beauty product set"
                className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/product5.jpeg"
                alt="Makeup tools"
                className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src="/product8.jpeg"
                alt="Makeup palette"
                className="aspect-square w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
              />
            </div>
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
            <p className="text-[10px] font-semibold tracking-[0.2em] text-tle-gold uppercase">Service Menu</p>
            <h2 className="mt-1 font-sans text-2xl font-semibold text-tle-ink sm:text-[2.05rem]">
              Pick Your <em className="font-sans font-medium italic text-tle-pink">Perfect Look</em>
            </h2>
          </div>
          {selectedService ? (
            <p className="rounded-full bg-tle-blush/80 px-4 py-2 text-[11px] font-semibold tracking-wide text-tle-pink uppercase">
              Selected: {selectedService.name}
            </p>
          ) : null}
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
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
                setSelectedService(s)
                goToStep(2)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setSelectedService(s)
                  goToStep(2)
                }
              }}
            >
              <p className="text-[10px] font-semibold tracking-[0.18em] text-tle-muted uppercase">{s.duration}</p>
              <h2 className="mt-2 font-sans text-xl font-semibold text-tle-ink">{s.name}</h2>
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
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-tle-pink/10 blur-3xl" aria-hidden />
          <h3 className="mb-4 font-sans text-2xl font-semibold text-tle-ink sm:text-[2rem]">
            Book Your <em className="font-sans font-medium italic text-tle-pink">Session</em>
          </h3>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-tle-muted">
            Quick 4-step booking. Select your service, reserve a time, drop your details, and confirm in seconds.
          </p>

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
                  {i === 1 ? 'Service' : i === 2 ? 'Date & Time' : i === 3 ? 'Details' : 'Confirm'}
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
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className="w-full rounded-xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink"
              />
              <select
                className="w-full rounded-xl border-[1.5px] border-black/10 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              >
                <option value="">Select a time</option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
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
                onClick={() => goToStep(3)}
              >
                Continue
              </button>
            </div>
          </div>

          <div className={formStep === 3 ? 'block' : 'hidden'}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Full name"
                className="w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink"
              />
              <input
                type="tel"
                placeholder="Phone number"
                className="w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink"
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full rounded-xl border-[1.5px] border-black/10 px-4 py-3 text-sm outline-none transition-colors focus:border-tle-pink sm:col-span-2"
              />
              <textarea
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
                className="rounded-full bg-tle-pink px-6 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-tle-deep"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </section>

        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/tlepic1.jpeg"
              alt="Beauty session"
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </div>
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/tlepic2.jpeg"
              alt="Artist portrait"
              className="aspect-[4/5] w-full object-cover object-top transition-transform duration-700 hover:scale-[1.03]"
            />
          </div>
          <div className="overflow-hidden rounded-2xl sm:col-span-2 lg:col-span-1">
            <img
              src="/product8.jpeg"
              alt="Makeup products"
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
            />
          </div>
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
