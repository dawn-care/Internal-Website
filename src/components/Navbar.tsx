import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import AuthControl from './AuthControl'
import SunArc from './SunArc'
import ThemeToggle from './ThemeToggle'

/** No "Home" item: the logo is the way home. */
const NAV_ITEMS = [
  // Signed in, the Dashboard comes first, then Tasks.
  { to: '/dashboard', label: 'Dashboard', end: false, signedInOnly: true },
  // Team-only. The /tasks route still exists: sign-in (and its errors) land there.
  { to: '/tasks', label: 'Tasks', end: false, signedInOnly: true },
  { to: '/meetings', label: 'Meetings', end: false, signedInOnly: true },
  { to: '/metrics', label: 'Metrics', end: false, signedInOnly: true },
  { to: '/agendas', label: 'Agendas', end: false },
  { to: '/artifacts', label: 'Artifacts', end: false },
]

// Active underline is accent, not link: link (ember) is only 3.15:1 on the light navbar.
function linkClass({ isActive }: { isActive: boolean }) {
  return [
    'rounded-sm decoration-2 underline-offset-8 transition-colors',
    isActive
      ? 'text-on-nav underline decoration-accent'
      : 'text-on-nav/85 hover:text-on-nav hover:underline hover:decoration-on-nav/40',
  ].join(' ')
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  // Hidden while auth is still loading too, so the link never flashes in and out.
  const navItems = NAV_ITEMS.filter((item) => !item.signedInOnly || user)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector('a')?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header className="sticky top-0 z-40 bg-nav text-on-nav">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4"
      >
        <Link to="/" className="flex items-center gap-2 rounded-sm" aria-label="D.A.W.N. home">
          <SunArc horizon className="h-4 w-7" />
          <span className="font-heading text-xl font-semibold tracking-tight">D.A.W.N.</span>
        </Link>

        <div className="flex items-center gap-4 md:gap-7 lg:gap-8">
          <ul className="hidden items-center gap-6 md:flex lg:gap-8">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={linkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AuthControl />
          </div>

          <button
            ref={buttonRef}
            type="button"
            className="-mr-2 rounded-md p-2 text-on-nav md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" ref={menuRef} className="border-t border-on-nav/10 md:hidden">
          <ul className="mx-auto flex max-w-5xl flex-col gap-1 px-6 py-4">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={(state) => `block py-2 ${linkClass(state)}`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="horizon-line" aria-hidden="true" />
    </header>
  )
}
