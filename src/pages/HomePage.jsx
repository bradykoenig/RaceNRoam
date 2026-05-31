import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSeries } from '../lib/api/client'
import { SERIES_META } from '../lib/api/endpoints'
import Countdown from '../components/Countdown'

const WATCH_LINKS = [
  { name: 'Twitch',   url: 'https://www.twitch.tv/racenroam',   color: '#9147ff' },
  { name: 'TikTok',  url: 'https://www.tiktok.com/@racenroam', color: '#ffffff' },
  { name: 'YouTube', url: 'https://www.youtube.com/@RaceNRoam', color: '#ff0000' },
]

const SERIES_STRIP = [
  { slug: 'f1',       label: 'Formula 1' },
  { slug: 'nascar',   label: 'NASCAR' },
  { slug: 'indycar',  label: 'IndyCar' },
  { slug: 'imsa-wec', label: 'IMSA / WEC' },
  { slug: 'motogp',   label: 'MotoGP' },
]

// Next race preview card (right side of hero)
function NextRaceCard() {
  const [race, setRace] = useState(null)
  const [series, setSeries] = useState('f1')

  useEffect(() => {
    // Find the nearest upcoming race across all series
    const fetches = Object.keys(SERIES_META).map(s =>
      getSeries(s).then(r => ({ series: s, race: r?.data?.featuredRace }))
    )
    Promise.all(fetches).then(results => {
      const now = Date.now()
      const upcoming = results
        .filter(r => r.race?.date && new Date(r.race.date).getTime() > now)
        .sort((a, b) => new Date(a.race.date) - new Date(b.race.date))
      if (upcoming[0]) {
        setRace(upcoming[0].race)
        setSeries(upcoming[0].series)
      }
    })
  }, [])

  const meta = SERIES_META[series] || {}

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-default)',
      borderTop: `3px solid ${meta.color || 'var(--red)'}`,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        padding: 'var(--sp-3) var(--sp-5)',
        background: 'var(--bg-raised)',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-dim)',
        }}>
          // Next Race
        </span>
        <span className={`badge ${meta.badgeClass || 'badge-f1'}`}>{meta.shortName}</span>
      </div>

      {/* Card body */}
      <div style={{ padding: 'var(--sp-5)' }}>
        {race ? (
          <>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 800,
              letterSpacing: '0.01em', marginBottom: 'var(--sp-1)', lineHeight: 1.1,
              textTransform: 'uppercase',
            }}>
              {race.name}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--text-dim)', marginBottom: 'var(--sp-5)',
            }}>
              {race.track}
              {race.round ? ` · Round ${race.round}` : ''}
            </div>
            <Countdown targetDate={race.date} size="normal" />
            <div style={{ marginTop: 'var(--sp-5)' }}>
              <Link
                to={meta.path || '/today'}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Full Preview →
              </Link>
            </div>
          </>
        ) : (
          <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// This Weekend — upcoming races across all series
function ThisWeekend() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    const now = Date.now()
    const weekMs = 1000 * 60 * 60 * 24 * 9 // next 9 days

    Promise.all(
      Object.keys(SERIES_META).map(s =>
        getSeries(s).then(r => {
          const race = r?.data?.featuredRace
          if (!race?.date) return null
          const t = new Date(race.date).getTime()
          if (t < now || t > now + weekMs) return null
          return { series: s, race }
        })
      )
    ).then(results => {
      setEvents(
        results
          .filter(Boolean)
          .sort((a, b) => new Date(a.race.date) - new Date(b.race.date))
      )
    })
  }, [])

  if (!events.length) return null

  return (
    <div style={{ marginTop: 'var(--sp-10)' }}>
      <p className="section-title">This Weekend</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--sp-3)' }}>
        {events.map(({ series, race }) => {
          const meta = SERIES_META[series] || {}
          const d    = new Date(race.date)
          const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d)
          return (
            <Link
              key={series}
              to={meta.path || `/${series}`}
              style={{
                display: 'block', padding: 'var(--sp-4)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-dim)',
                borderLeft: `3px solid ${meta.color || 'var(--red)'}`,
                borderRadius: 'var(--r-md)',
                textDecoration: 'none', transition: 'background 120ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-raised)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: meta.color || 'var(--red)', marginBottom: 'var(--sp-1)',
              }}>
                {meta.shortName}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700,
                color: 'var(--text-white)', marginBottom: 'var(--sp-2)', lineHeight: 1.2,
              }}>
                {race.name}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {dayLabel}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div>
      {/* ── Hero ── */}
      <section style={{
        borderBottom: '1px solid var(--border-dim)',
        padding: 'var(--sp-16) 0 var(--sp-12)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, var(--red) 0%, transparent 50%)',
        }} />

        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 400px',
            gap: 'var(--sp-16)',
            alignItems: 'center',
          }}>
            {/* ── Left: brand + copy ── */}
            <div>
              {/* Eyebrow */}
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 800,
                textTransform: 'uppercase', letterSpacing: '0.2em',
                color: 'var(--text-dim)', marginBottom: 'var(--sp-5)',
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
              }}>
                <span style={{ color: 'var(--red)' }}>//</span>
                Live Race Hub
              </div>

              {/* Main headline — brand-first, no tool-speak */}
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                fontWeight: 900,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                lineHeight: 1,
                marginBottom: 'var(--sp-4)',
              }}>
                Race<span style={{ color: 'var(--red)' }}>N</span>Roam
              </h1>

              {/* Series strip */}
              <div style={{
                display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap',
                marginBottom: 'var(--sp-6)',
              }}>
                {SERIES_STRIP.map((s, i) => (
                  <span key={s.slug} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: SERIES_META[s.slug]?.color || 'var(--text-dim)',
                    }}>
                      {s.label}
                    </span>
                    {i < SERIES_STRIP.length - 1 && (
                      <span style={{ color: 'var(--border-strong)', fontSize: '0.6rem' }}>·</span>
                    )}
                  </span>
                ))}
              </div>

              {/* One-liner — about the person, not the software */}
              <p style={{
                fontSize: '1rem', color: 'var(--text-gray)',
                lineHeight: 1.65, maxWidth: '420px',
                marginBottom: 'var(--sp-8)',
              }}>
                Sim racing from the RV. Live data for every major motorsport series —
                countdowns, standings, and race-day coverage on every stream.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-6)' }}>
                <Link to="/watch-party" className="btn btn-primary btn-lg">
                  Enter Race Hub
                </Link>
                <Link to="/stream" className="btn btn-secondary btn-lg">
                  ◉ Stream Mode
                </Link>
              </div>

              {/* Watch live */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 800,
                  textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-dim)',
                }}>
                  Watch Live:
                </span>
                {WATCH_LINKS.map(l => (
                  <a
                    key={l.name}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 800,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: l.color, textDecoration: 'none',
                      padding: '4px 10px', borderRadius: 'var(--r-sm)',
                      border: `1px solid ${l.color}33`,
                      background: `${l.color}0d`,
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background=`${l.color}22`; e.currentTarget.style.borderColor=`${l.color}66` }}
                    onMouseLeave={e => { e.currentTarget.style.background=`${l.color}0d`; e.currentTarget.style.borderColor=`${l.color}33` }}
                  >
                    {l.name} ↗
                  </a>
                ))}
              </div>
            </div>

            {/* ── Right: next race card ── */}
            <NextRaceCard />
          </div>

          {/* This Weekend strip */}
          <ThisWeekend />
        </div>
      </section>

      {/* ── Series nav ── */}
      <section style={{
        background: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-dim)',
        padding: 'var(--sp-4) 0',
      }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-dim)',
              marginRight: 'var(--sp-2)',
            }}>
              Series:
            </span>
            {SERIES_STRIP.map(s => {
              const m = SERIES_META[s.slug]
              return (
                <Link
                  key={s.slug}
                  to={m.path}
                  style={{
                    fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: m.color, textDecoration: 'none',
                    padding: '4px 12px', borderRadius: 'var(--r-sm)',
                    border: `1px solid ${m.color}33`,
                    background: `${m.color}0a`,
                    transition: 'all 120ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${m.color}20`; e.currentTarget.style.borderColor=`${m.color}55` }}
                  onMouseLeave={e => { e.currentTarget.style.background=`${m.color}0a`; e.currentTarget.style.borderColor=`${m.color}33` }}
                >
                  {s.label}
                </Link>
              )
            })}
            <Link
              to="/watch-party/calendar"
              style={{
                marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '0.72rem',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--text-dim)', textDecoration: 'none',
              }}
            >
              Full Calendar →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
