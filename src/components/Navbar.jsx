import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/watch-party',          label: 'Hub',     icon: '🏠' },
  { to: '/watch-party/today',    label: 'Next Up',  icon: '📍' },
  { to: '/watch-party/f1',       label: 'F1',      icon: '🏎️' },
  { to: '/watch-party/nascar',   label: 'NASCAR',  icon: '🏁' },
  { to: '/watch-party/indycar',  label: 'IndyCar', icon: '⚡' },
  { to: '/watch-party/imsa-wec', label: 'IMSA/WEC',icon: '🕐' },
  { to: '/watch-party/motogp',   label: 'MotoGP',  icon: '🏍️' },
  { to: '/watch-party/calendar', label: 'Calendar',icon: '📅' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo" onClick={() => setOpen(false)}>
            <div className="navbar-logo-mark">RR</div>
            <span className="navbar-logo-text">RaceN<span>Roam</span></span>
            <span className="navbar-logo-live">Live</span>
          </Link>

          <ul className="navbar-nav">
            {NAV_LINKS.map(l => (
              <li key={l.to}>
                <NavLink to={l.to} className={({ isActive }) => isActive ? 'active' : ''}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexShrink: 0 }}>
            <Link to="/" className="navbar-stream-btn" style={{ background: 'var(--bg-raised)', color: 'var(--text-primary)' }}>
              ← Store
            </Link>
            <Link to="/stream" className="navbar-stream-btn">
              ◉ Stream Mode
            </Link>
            <button
              className="navbar-mobile-toggle"
              onClick={() => setOpen(o => !o)}
              aria-label="Toggle navigation"
            >
              {open ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </nav>

      <div className={`mobile-menu${open ? ' open' : ''}`}>
        <Link
          to="/"
          onClick={() => setOpen(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
            padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-md)',
            background: 'var(--bg-raised)', color: 'var(--text-primary)',
            fontWeight: 700, fontSize: '0.875rem', marginBottom: 'var(--sp-2)',
          }}
        >
          ← Store
        </Link>
        {NAV_LINKS.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            <span>{l.icon}</span> {l.label}
          </NavLink>
        ))}
        <Link
          to="/stream"
          onClick={() => setOpen(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
            padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-md)',
            background: 'var(--accent-red)', color: '#fff',
            fontWeight: 700, fontSize: '0.875rem', marginTop: 'var(--sp-2)',
          }}
        >
          ◉ Stream Mode
        </Link>
      </div>
    </>
  )
}
