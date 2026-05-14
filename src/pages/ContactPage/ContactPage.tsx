import { Link } from 'react-router-dom'
import { WhatsAppIcon } from '../../components/icons/WhatsAppIcon.tsx'
import {
  SITE_ADDRESS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_TEL,
  buildWhatsappUrl,
  googleMapsSearchUrl,
} from '../../lib/siteContact.ts'

const whatsappHref = buildWhatsappUrl()

export function ContactPage() {
  return (
    <section className="min-h-0 flex-1 bg-tle-cream/60 px-4 pb-24 pt-24 sm:px-6 md:px-10 md:pt-28 lg:px-16">
      <div className="mx-auto w-full max-w-[900px]">
        <nav className="mb-8 flex flex-wrap items-center gap-2 text-[12px] text-tle-muted" aria-label="Breadcrumb">
          <Link to="/" className="transition-colors hover:text-tle-pink">
            Home
          </Link>
          <span className="text-tle-faint" aria-hidden>
            /
          </span>
          <span className="font-medium text-tle-ink">Visit &amp; contact</span>
        </nav>

        <header className="mb-12 text-center sm:mb-14 sm:text-left">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-tle-muted uppercase">TLE-BRAND</p>
          <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-tle-ink sm:text-4xl">
            Visit us &amp; get in touch
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-tle-muted sm:mx-0">
            Call, message on WhatsApp, or stop by the studio. We are happy to help with orders, styling questions, or
            bookings.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[24px] border border-black/8 bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-tle-pink text-[26px] leading-none">location_on</span>
              <h2 className="font-sans text-lg font-semibold text-tle-ink">Visit us</h2>
            </div>
            <address className="not-italic text-[15px] leading-relaxed text-tle-ink">
              <p className="font-semibold">{SITE_ADDRESS.venue}</p>
              <p className="mt-1 text-tle-muted">{SITE_ADDRESS.line}</p>
              <p className="mt-0.5 text-tle-muted">{SITE_ADDRESS.area}</p>
            </address>
            <a
              href={googleMapsSearchUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-tle-cream/80 px-5 py-2.5 text-[12px] font-semibold text-tle-ink no-underline transition-colors hover:border-tle-pink hover:bg-tle-blush hover:text-tle-pink"
            >
              <span className="material-symbols-outlined text-[20px] leading-none">map</span>
              Open in Google Maps
            </a>
          </div>

          <div className="rounded-[24px] border border-black/8 bg-white p-7 shadow-[0_10px_40px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="mb-5 flex items-center gap-2">
              <span className="material-symbols-outlined text-tle-pink text-[26px] leading-none">forum</span>
              <h2 className="font-sans text-lg font-semibold text-tle-ink">Contact us</h2>
            </div>
            <p className="text-sm leading-relaxed text-tle-muted">Call or WhatsApp — same team.</p>

            <ul className="mt-6 flex flex-col gap-4">
              <li>
                <a
                  href={SITE_PHONE_TEL}
                  className="group flex items-center gap-4 rounded-2xl border border-black/8 bg-tle-cream/50 p-4 no-underline transition-colors hover:border-tle-pink/35 hover:bg-tle-blush/60"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tle-charcoal text-white transition-colors group-hover:bg-tle-pink">
                    <span className="material-symbols-outlined text-[24px] leading-none">call</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.14em] text-tle-muted uppercase">Phone</p>
                    <p className="mt-0.5 font-sans text-lg font-semibold tabular-nums text-tle-ink">{SITE_PHONE_DISPLAY}</p>
                    <p className="mt-1 text-xs text-tle-muted">Tap to call from your device</p>
                  </div>
                </a>
              </li>
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 p-4 no-underline transition-colors hover:border-emerald-400/60 hover:bg-emerald-100"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition-transform group-hover:scale-[1.03]">
                    <WhatsAppIcon className="size-7" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.14em] text-emerald-900/70 uppercase">WhatsApp</p>
                    <p className="mt-0.5 font-sans text-lg font-semibold text-emerald-950">Message us</p>
                  </div>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4 sm:justify-start">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-tle-charcoal bg-tle-charcoal px-7 py-3 text-[11px] font-semibold tracking-wide text-white no-underline transition-colors hover:border-tle-pink hover:bg-tle-pink"
          >
            Continue shopping
            <span className="material-symbols-outlined text-[18px] leading-none">arrow_forward</span>
          </Link>
          <Link
            to="/makeup"
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-7 py-3 text-[11px] font-semibold tracking-wide text-tle-ink no-underline transition-colors hover:border-tle-pink hover:text-tle-pink"
          >
            Book makeup
          </Link>
        </div>
      </div>
    </section>
  )
}
