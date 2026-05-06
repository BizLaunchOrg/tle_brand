export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg)] px-4 py-6">
      <div className="mx-auto max-w-5xl text-center open-sans-text text-sm text-[var(--text)]">
        © {new Date().getFullYear()} tle_brand
      </div>
    </footer>
  )
}
