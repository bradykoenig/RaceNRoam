import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { SERIES_META } from '../lib/api/endpoints'
import { getSeries } from '../lib/api/client'
import Countdown from '../components/Countdown'
import StatusBadge from '../components/StatusBadge'

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
