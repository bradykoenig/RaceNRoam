import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Twitch, Youtube } from 'lucide-react'
import { SERIES_META } from '../lib/api/endpoints'
import { getSeries } from '../lib/api/client'
import Countdown from '../components/Countdown'
import StatusBadge from '../components/StatusBadge'

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84z" />
  </svg>
)

const HUB_ITEMS = [
  { type: 'series', slug: 'f1',       path: '/f1',       icon: '🏎️' },
  { type: 'series', slug: 'nascar',   path: '/nascar',   icon: '🏁' },
  { type: 'series', slug: 'indycar',  path: '/indycar',  icon: '⚡' },
  { type: 'series', slug: 'imsa-wec', path: '/imsa-wec', icon: '🕐' },
  { type: 'series', slug: 'motogp',   path: '/motogp',   icon: '🏍️' },
  { type: 'special', slug: 'today',    path: '/today',    icon: '📍', label: 'Next Up',       desc: 'Next upcoming race across all series', color: '#e8002d' },
  { type: 'special', slug: 'calendar', path: '/calendar', icon: '📅', label: 'Race Calendar', desc: 'Full 2026 multi-series schedule', color: '#6366f1' },
  { type: 'special', slug: 'stream',   path: '/stream',   icon: '◉',  label: 'Stream Mode',   desc: 'OBS / TikTok display layout',    color: '#22c55e' },
]

function HubSeriesCard({ slug, path }) {
  const meta = SERIES_META[slug] || {}
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSeries(slug).then(r => { setData(r); setLoading(false) })
  }, [slug])

  const race = data?.data?.featuredRace || null

  return (
    <Link to={path} className="hub-card" style={{ '--hub-color': meta.color }}>
      {/* Ghost abbreviation */}
      <span className="hub-card-ghost" aria-hidden="true">{meta.shortName}</span>

      <div className="hub-card-header">
        <div>
          <div className="hub-card-series">{meta.name}</div>
        </div>
        <span className={`badge ${meta.badgeClass}`}>{meta.shortName}</span>
      </div>

      {loading ? (
        <div style={{ padding: 'var(--sp-2) 0 var(--sp-4)' }}><div className="spinner-sm" /></div>
      ) : race ? (
        <>
          <p className="hub-card-race">{race.name} · Rd {race.round}</p>
          <div className="hub-card-countdown">
            <Countdown targetDate={race.date} size="inline" />
          </div>
        </>
      ) : (
        <p className="hub-card-race">No upcoming race</p>
      )}

      <div className="hub-card-footer">
        {race && <StatusBadge status={race.status || 'Upcoming'} />}
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)' }}>
          View →
        </span>
      </div>
    </Link>
  )
}

function HubSpecialCard({ path, icon, label, desc, color }) {
  return (
    <Link to={path} className="hub-card" style={{ '--hub-color': color }}>
      <span className="hub-card-ghost" aria-hidden="true">{icon}</span>
      <div className="hub-card-header" style={{ marginBottom: 'var(--sp-3)' }}>
        <div className="hub-card-series">{label}</div>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0 0 var(--sp-4)', lineHeight: 1.4 }}>{desc}</p>
      <div className="hub-card-footer">
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color }}>
          Open →
        </span>
      </div>
    </Link>
  )
}

export default function HubPage() {
  const series  = HUB_ITEMS.filter(i => i.type === 'series')
  const special = HUB_ITEMS.filter(i => i.type === 'special')

  return (
    <div className="container page-wrapper fade-in">
      <div style={{ marginBottom: 'var(--sp-8)' }}>
        <h1 style={{ textTransform: 'uppercase', letterSpacing: '0.02em' }}>Race Hub</h1>
        <p style={{ marginTop: 'var(--sp-2)', color: 'var(--text-dim)' }}>
          Live companion dashboard for every series.
        </p>
      </div>

      <section className="section" style={{ marginBottom: 'var(--sp-8)', padding: 'var(--sp-6)', background: 'hsl(var(--bg-dim))', border: '2px solid hsl(var(--primary) / 0.3)', borderRadius: '4px' }}>
        <p className="section-title" style={{ marginTop: 0 }}>RaceNRoam Live</p>
        <p style={{ color: 'var(--text-dim)', marginBottom: 'var(--sp-4)' }}>Watch sim racing from the RV on these platforms:</p>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="https://www.twitch.tv/racenroam" target="_blank" rel="noopener noreferrer" aria-label="Twitch" style={{ width: '60px', height: '60px', border: '2px solid #9146ff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9146ff', background: 'hsl(0 0% 100% / 0.02)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#9146ff'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 0 30px #9146ff' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100% / 0.02)'; e.currentTarget.style.color = '#9146ff'; e.currentTarget.style.boxShadow = 'none' }}>
            <Twitch className="w-6 h-6" />
          </a>
          <a href="https://www.tiktok.com/@racenroam" target="_blank" rel="noopener noreferrer" aria-label="TikTok" style={{ width: '60px', height: '60px', border: '2px solid #000', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: 'hsl(0 0% 100% / 0.02)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.boxShadow = '0 0 30px #000' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100% / 0.02)'; e.currentTarget.style.boxShadow = 'none' }}>
            <TikTokIcon />
          </a>
          <a href="https://www.youtube.com/@RaceNRoam" target="_blank" rel="noopener noreferrer" aria-label="YouTube" style={{ width: '60px', height: '60px', border: '2px solid #ff0000', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff0000', background: 'hsl(0 0% 100% / 0.02)', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#ff0000'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.boxShadow = '0 0 30px #ff0000' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'hsl(0 0% 100% / 0.02)'; e.currentTarget.style.color = '#ff0000'; e.currentTarget.style.boxShadow = 'none' }}>
            <Youtube className="w-6 h-6" />
          </a>
        </div>
      </section>

      <section className="section">
        <p className="section-title">Series</p>
        <div className="grid-auto">
          {series.map(i => <HubSeriesCard key={i.slug} {...i} />)}
        </div>
      </section>

      <section className="section">
        <p className="section-title">Quick Access</p>
        <div className="grid-3">
          {special.map(i => <HubSpecialCard key={i.slug} {...i} />)}
        </div>
      </section>
    </div>
  )
}
