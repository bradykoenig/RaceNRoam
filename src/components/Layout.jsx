import { Outlet, Link } from 'react-router-dom'
import Navbar from './Navbar'

const SOCIALS = [
  {
    name: 'Twitch',
    url: 'https://www.twitch.tv/racenroam',
    color: '#9147ff',
    hoverBg: 'rgba(145,71,255,0.12)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@racenroam',
    color: '#ffffff',
    hoverBg: 'rgba(255,255,255,0.08)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
      </svg>
    ),
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/@RaceNRoam',
    color: '#ff0000',
    hoverBg: 'rgba(255,0,0,0.12)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
]

function SocialButton({ social }) {
  return (
    <a
      href={social.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 'var(--r-md)',
        border: `1px solid ${social.color}33`,
        background: 'var(--bg-raised)',
        color: social.color,
        fontSize: '0.8rem', fontWeight: 700,
        fontFamily: 'var(--font-display)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        textDecoration: 'none',
        transition: 'all 140ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = social.hoverBg
        e.currentTarget.style.borderColor = `${social.color}66`
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-raised)'
        e.currentTarget.style.borderColor = `${social.color}33`
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {social.icon}
      {social.name}
    </a>
  )
}

export default function Layout() {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">

          {/* Watch Live strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 'var(--sp-4)',
            padding: 'var(--sp-5) var(--sp-6)',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--r-lg)', marginBottom: 'var(--sp-6)',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--red)',
                marginBottom: 'var(--sp-1)',
              }}>
                // Watch RaceNRoam Live
              </div>
              <p style={{
                margin: 0, fontSize: '0.82rem', color: 'var(--text-gray)',
              }}>
                Sim racing from the RV — live on Twitch, TikTok &amp; YouTube
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              {SOCIALS.map(s => <SocialButton key={s.name} social={s} />)}
            </div>
          </div>

          {/* Bottom row */}
          <div className="footer-inner">
            <div>
              <div className="footer-brand">RaceN<span>Roam</span> Live Race Hub</div>
              <p className="footer-text mt-2">
                Stream-safe motorsports companion dashboard for TikTok &amp; OBS.
              </p>
            </div>
            <div className="footer-links">
              <a href="https://www.twitch.tv/racenroam" target="_blank" rel="noopener noreferrer">Twitch</a>
              <a href="https://www.tiktok.com/@racenroam" target="_blank" rel="noopener noreferrer">TikTok</a>
              <a href="https://www.youtube.com/@RaceNRoam" target="_blank" rel="noopener noreferrer">YouTube</a>
              <Link to="/stream">Stream Mode</Link>
              <Link to="/calendar">Calendar</Link>
            </div>
          </div>

          <div className="divider" />
          <p className="footer-text" style={{ fontSize: '0.7rem' }}>
            © {new Date().getFullYear()} RaceNRoam. Data provided for informational and fan engagement purposes only.
            No live race broadcast video or copyrighted content is shown. All race data sourced from public APIs and official providers.
          </p>
        </div>
      </footer>
    </>
  )
}
