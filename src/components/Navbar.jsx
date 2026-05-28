import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/hub',      label: 'Hub',     icon: '🏠' },
  { to: '/today',    label: 'Next Up',  icon: '📍' },
  { to: '/f1',       label: 'F1',      icon: '🏎️' },
  { to: '/nascar',   label: 'NASCAR',  icon: '🏁' },
  { to: '/indycar',  label: 'IndyCar', icon: '⚡' },
  { to: '/imsa-wec', label: 'IMSA/WEC',icon: '🕐' },
  { to: '/motogp',   label: 'MotoGP',  icon: '🏍️' },
  { to: '/calendar', label: 'Calendar',icon: '📅' },
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
