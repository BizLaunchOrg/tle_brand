import type { MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type FooterLinkItem = {
  label: string
  to: string
  hash?: string
}

function scrollToId(id: string) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function FooterNavLink({ label, to, hash }: FooterLinkItem) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!hash) return
    const targetPath = to || '/'
    const onHome = location.pathname === targetPath
    if (onHome) {
      e.preventDefault()
      const hashId = hash.replace(/^#/, '')
      if (location.hash !== hash) {
        navigate({ pathname: targetPath, hash: hashId }, { replace: false })
      }
      scrollToId(hashId)
    }
  }

  return (
    <Link
      to={hash ? `${to}${hash}` : to}
      onClick={handleClick}
      className="text-[13px] text-white/40 no-underline transition-colors hover:text-tle-light"
    >
      {label}
    </Link>
  )
}

export function Footer() {
  return (
    <footer className="bg-tle-charcoal px-6 pt-16 pb-10 md:px-16 lg:px-20">
      <div className="mb-9 grid gap-12 border-b border-white/[0.06] pb-14 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Link to="/" className="mb-3.5 inline-block leading-none no-underline">
            <img
              src="/tlelogo.PNG"
              alt="TOBILICIOUS BY LADY EMMA"
              className="h-10 w-auto max-w-[min(220px,55vw)] object-contain object-left"
              width={200}
              height={56}
              decoding="async"
            />
          </Link>
          <p className="max-w-[280px] text-[13px] leading-relaxed text-white/[0.38]">
            Intentional fashion, beauty, and glam experiences for him and her 🤍
          </p>
          <a
            href="https://www.instagram.com/tlebeautybrand/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.08] py-2.5 pr-5 pl-2.5 no-underline transition-all hover:border-tle-pink hover:bg-tle-pink/15"
            aria-label="Follow TOBILICIOUS on Instagram @tlebeautybrand"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
              <img
                src="/instagram.svg"
                alt=""
                className="size-5"
                width={20}
                height={20}
                decoding="async"
              />
            </span>
            <span className="min-w-0 text-left">
              <span className="block text-[10px] font-bold tracking-[0.16em] text-white/55 uppercase">
                Follow us
              </span>
              <span className="mt-0.5 block text-[13px] font-semibold text-white">@tlebeautybrand</span>
            </span>
          </a>
        </div>
        <div>
          <div className="mb-5 text-[10px] font-bold tracking-[0.25em] text-white uppercase">Services</div>
          <ul className="flex flex-col gap-2.5">
            {(
              [
                { label: 'Book a session', to: '/', hash: '#booking-form' },
                { label: 'Photoshoot packages', to: '/', hash: '#photoshoot-promo' },
              ] satisfies FooterLinkItem[]
            ).map((item) => (
              <li key={item.label}>
                <FooterNavLink {...item} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-5 text-[10px] font-bold tracking-[0.25em] text-white uppercase">Company</div>
          <ul className="flex flex-col gap-2.5">
            {(
              [
                { label: 'About us', to: '/', hash: '#about' },
                { label: 'Shop', to: '/shop' },
                { label: 'Contact', to: '/contact' },
              ] satisfies FooterLinkItem[]
            ).map((item) => (
              <li key={item.label}>
                <FooterNavLink {...item} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <span className="text-xs text-white/25">
          © {new Date().getFullYear()} TOBILICIOUS BY LADY EMMA. All rights reserved.
        </span>
      </div>
    </footer>
  )
}
