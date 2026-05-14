import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-tle-charcoal px-6 pt-16 pb-10 md:px-16 lg:px-20">
      <div className="mb-9 grid gap-12 border-b border-white/[0.06] pb-14 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="mb-3.5 inline-block leading-none no-underline">
            <img
              src="/tlelogo.PNG"
              alt="TLE-BRAND"
              className="h-10 w-auto max-w-[min(220px,55vw)] object-contain object-left"
              width={200}
              height={56}
              decoding="async"
            />
          </Link>
          <p className="mb-7 max-w-[210px] text-[13px] leading-relaxed text-white/[0.38]">
            Intentional fashion, beauty, and glam experiences for him and her 🤍
          </p>
          <div className="flex max-w-[260px] items-center rounded-full border border-white/10 bg-white/[0.06] py-1 pl-[18px] pr-1">
            <input
              type="email"
              placeholder="Your email"
              aria-label="Email for newsletter"
              className="min-w-0 flex-1 border-0 bg-transparent font-sans text-xs text-white outline-none placeholder:text-white/30"
            />
            <button
              type="button"
              className="rounded-full bg-tle-pink px-[18px] py-2 text-[11px] font-bold tracking-wide text-white transition-colors hover:bg-tle-deep"
            >
              Subscribe
            </button>
          </div>
        </div>
        <div>
          <div className="mb-5 text-[10px] font-bold tracking-[0.25em] text-white uppercase">Shop</div>
          <ul className="flex flex-col gap-2.5">
            {['All Products', 'For Her', 'For Him', 'New Arrivals', 'Best Sellers'].map((t) => (
              <li key={t}>
                <Link to="/shop" className="text-[13px] text-white/40 no-underline transition-colors hover:text-tle-light">
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-5 text-[10px] font-bold tracking-[0.25em] text-white uppercase">Services</div>
          <ul className="flex flex-col gap-2.5">
            {[
              ['Book session', '/#booking-form'],
              ['Studio session', '/makeup'],
              ['Home & bridal', '/makeup'],
              ['Photoshoot packages', '/#photoshoot-promo'],
              ['Pricing', '/#booking-form'],
            ].map(([t, h]) => (
              <li key={t}>
                <Link to={h} className="text-[13px] text-white/40 no-underline transition-colors hover:text-tle-light">
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-5 text-[10px] font-bold tracking-[0.25em] text-white uppercase">Company</div>
          <ul className="flex flex-col gap-2.5">
            {[
              ['About Us', '/about'],
              ['Contact', '/contact'],
              ['FAQ', '/'],
              ['Privacy Policy', '/'],
              ['Returns', '/'],
            ].map(([t, h]) => (
              <li key={t}>
                <Link to={h} className="text-[13px] text-white/40 no-underline transition-colors hover:text-tle-light">
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <span className="text-xs text-white/25">
          © {new Date().getFullYear()} TLE-BRAND. All rights reserved.
        </span>
        <div className="flex gap-2.5">
          <a
            href="#"
            className="flex size-[38px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 no-underline transition-all hover:border-tle-pink hover:bg-tle-pink/10 hover:text-tle-light"
            aria-label="Instagram"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">photo_camera</span>
          </a>
          <a
            href="#"
            className="flex size-[38px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 no-underline transition-all hover:border-tle-pink hover:bg-tle-pink/10 hover:text-tle-light"
            aria-label="TikTok"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">music_note</span>
          </a>
          <a
            href="#"
            className="flex size-[38px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 no-underline transition-all hover:border-tle-pink hover:bg-tle-pink/10 hover:text-tle-light"
            aria-label="Pinterest"
          >
            <span className="material-symbols-outlined text-[20px] leading-none">push_pin</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
