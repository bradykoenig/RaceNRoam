import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getSeries } from '../lib/api/client'
import { SERIES_META } from '../lib/api/endpoints'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useLiveRace } from '../hooks/useLiveRace'
import Countdown from '../components/Countdown'
import LiveRacePanel from '../components/LiveRacePanel'
import RaceControlFeed from '../components/RaceControlFeed'
import TrackMap from '../components/TrackMap'
import LiveRaceHub from '../components/LiveRaceHub'

const DEFAULT_SERIES = 'f1'
const REFRESH_MS = 45 * 1000

// ── Helpers ──────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(ts))
  } catch { return '' }
}

function cToF(c) { return Math.round(c * 9 / 5 + 32) }

// ── Topbar (shared between live and idle layouts) ─────────────

function StreamTopbar({ series, meta, refreshing, lastFetch, onRefresh }) {
  return (
    <div className="stream-topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
        <Link
          to="/watch-party"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 'var(--r-md)',
            background: '#111', border: '1px solid #2a2a2a',
            color: '#aaa', fontSize: '0.75rem', fontWeight: 700,
            fontFamily: 'var(--font-display)', textTransform: 'uppercase',
            letterSpacing: '0.06em', textDecoration: 'none',
            transition: 'all 120ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background='#1e1e1e'; e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='#444' }}
          onMouseLeave={e => { e.currentTarget.style.background='#111'; e.currentTarget.style.color='#aaa'; e.currentTarget.style.borderColor='#2a2a2a' }}
        >
          ← Hub
        </Link>
        <span className="stream-logo">RaceN<span>Roam</span></span>
        <span className="stream-series-badge">{meta.shortName || series.toUpperCase()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        {/* Series switcher */}
        <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
          {Object.values(SERIES_META).map(m => (
            <Link
              key={m.slug}
              to={`/stream?series=${m.slug}`}
              style={{
                padding: '2px 8px', borderRadius: 'var(--r-full)',
                fontSize: '0.65rem', fontWeight: 700, textDecoration: 'none',
                background: m.slug === series ? m.color : '#111',
                color:      m.slug === series ? '#fff' : '#444',
                border:     `1px solid ${m.slug === series ? m.color : '#222'}`,
                transition: 'all var(--t-fast)',
              }}
            >
              {m.shortName}
            </Link>
          ))}
        </div>

        <button onClick={onRefresh} className="stream-refresh-btn" disabled={refreshing}>
          <span style={{ display:'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
          {lastFetch ? fmt(lastFetch) : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

// ── Live Race Layout ──────────────────────────────────────────
// Shown when a session is actively running (isLive = true)

const TRACK_STATUS_BANNER = {
  yellow:  { bg: '#f5c51822', border: '#f5c518', text: '#f5c518' },
  red:     { bg: '#e8002d22', border: '#e8002d', text: '#e8002d' },
  sc:      { bg: '#f9731622', border: '#f97316', text: '#f97316' },
  vsc:     { bg: '#f9731622', border: '#f97316', text: '#f97316' },
}

function LiveStreamBody({ liveData, series, meta }) {
  const { session, positions = [], locations = [], raceControl = [], weather, trackStatus } = liveData
  const isRace = session?.category === 'race' || session?.category === 'sprint'
  const isQual = session?.category === 'qualifying' || session?.category === 'sprint-qualifying'

  const tsStyle = TRACK_STATUS_BANNER[trackStatus?.type]

  return (
    <div className="stream-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* Track status banner — shown for yellow/red/SC/VSC only */}
      {tsStyle && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '7px 24px', background: tsStyle.bg, borderBottom: `2px solid ${tsStyle.border}`,
          animation: trackStatus.type === 'red' ? 'pulseLive 1s step-start infinite' : 'none',
        }}>
          <span style={{ fontSize: 14, color: tsStyle.text }}>⚑</span>
          <span style={{ color: tsStyle.text, fontWeight: 900, fontSize: '0.82rem', fontFamily: 'var(--font-display)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {trackStatus.label}
          </span>
        </div>
      )}

      {/* Session header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--sp-3) var(--sp-8)', borderBottom: '1px solid #111',
        background: '#060609', flexWrap: 'wrap', gap: 'var(--sp-4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)' }}>
          {/* LIVE badge */}
          <span style={{
            fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:900,
            textTransform:'uppercase', letterSpacing:'0.14em', color:'var(--red)',
            display:'flex', alignItems:'center', gap:6,
            animation:'pulseLive 1.4s ease-in-out infinite',
          }}>
            ● LIVE NOW
          </span>

          {/* Session name */}
          <span style={{
            fontFamily:'var(--font-display)', fontSize:'0.85rem', fontWeight:800,
            textTransform:'uppercase', letterSpacing:'0.06em', color:'#fff',
          }}>
            {session?.name || 'Session'}
          </span>

          {/* Lap counter (race only) */}
          {isRace && session?.lap != null && (
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem', color:'#666' }}>
              LAP <span style={{ color:'#fff', fontWeight:700 }}>{session.lap}</span>
            </span>
          )}

          {/* Qual label */}
          {isQual && (
            <span style={{ fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:800, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {session.segment || 'Qualifying'}
            </span>
          )}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-5)' }}>
          {/* Flag state */}
          {session?.flag && flagColor && (
            <span style={{
              fontFamily:'var(--font-display)', fontSize:'0.72rem', fontWeight:900,
              textTransform:'uppercase', letterSpacing:'0.1em', color: flagColor,
              padding:'3px 10px', borderRadius:'2px',
              border:`1px solid ${flagColor}44`, background:`${flagColor}12`,
              animation: 'pulseLive 1.6s ease-in-out infinite',
            }}>
              {session.flag === 'sc' ? 'SAFETY CAR' : session.flag === 'vsc' ? 'VSC' : session.flag.toUpperCase()}
            </span>
          )}

          {/* Weather */}
          {weather && (
            <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'#555' }}>
              {Math.round(weather.airTemp ?? 0)}°C / {cToF(weather.airTemp ?? 0)}°F
              {weather.trackTemp != null && ` · Track ${Math.round(weather.trackTemp)}°C / ${cToF(weather.trackTemp)}°F`}
              {' · '}{weather.rainfall ? '🌧️' : '☀️'}
            </span>
          )}
        </div>
      </div>

      {/* Main: track map + position tower */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', flex:1, minHeight:0 }}>

        {/* Track map */}
        <div style={{ borderRight:'1px solid #0f0f0f', padding:'var(--sp-5)', display:'flex', flexDirection:'column', background:'#040406' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'0.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.14em', color:'#333', marginBottom:'var(--sp-3)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)', display:'inline-block', animation:'pulseLive 1.4s ease-in-out infinite' }} />
            Live Track Positions
          </div>
          <TrackMap locations={locations} positions={positions} series={series} />

          {/* Race control below map */}
          {raceControl.length > 0 && (
            <div style={{ marginTop:'auto', paddingTop:'var(--sp-4)' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'0.58rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.16em', color:'#333', marginBottom:'var(--sp-2)' }}>
                Race Control
              </div>
              <RaceControlFeed messages={raceControl.slice(0, 4)} />
            </div>
          )}
        </div>

        {/* Position tower */}
        <div style={{ display:'flex', flexDirection:'column', background:'#040406', overflow:'hidden' }}>
          {/* Tower header */}
          <div style={{
            display:'grid', gridTemplateColumns:'28px 3px 1fr 1fr', gap:'0 8px',
            padding:'8px 16px', background:'#060609',
            fontFamily:'var(--font-display)', fontSize:'0.58rem', fontWeight:800,
            textTransform:'uppercase', letterSpacing:'0.1em', color:'#333',
            borderBottom:'1px solid #0f0f0f',
          }}>
            <span>P</span><span/><span>Driver</span>
            <span style={{textAlign:'right'}}>{isRace ? 'GAP' : isQual ? 'GAP' : 'BEST LAP'}</span>
          </div>

          {/* Rows */}
          <div style={{ overflowY:'auto', flex:1 }}>
            {positions.slice(0, 20).map((p, i) => (
              <div
                key={p.number || i}
                style={{
                  display:'grid', gridTemplateColumns:'28px 3px 1fr 1fr', gap:'0 8px',
                  padding:'6px 16px', borderBottom:'1px solid #080810',
                  alignItems:'center',
                  background: p.pos <= 3 ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}
              >
                {/* Position */}
                <span style={{
                  fontFamily:'var(--font-mono)', fontSize:'0.75rem', fontWeight:800,
                  color: p.pos===1?'#FFD700':p.pos===2?'#C0C0C0':p.pos===3?'#CD7F32':'#444',
                  textAlign:'center',
                }}>
                  {p.pos}
                </span>

                {/* Team stripe */}
                <div style={{ width:3, height:22, borderRadius:2, background:p.teamColor||'#333' }} />

                {/* Driver */}
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'0.8rem', fontWeight:700, letterSpacing:'0.01em', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.driver}
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'0.58rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'#333' }}>
                    {p.team}
                    {p.compound && (
                      <span style={{ marginLeft:6, color:p.compoundColor||'#555' }}>
                        {p.compound[0]}{p.tyreAge != null ? p.tyreAge : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Gap / lap time */}
                <div style={{ textAlign:'right' }}>
                  {(isRace || isQual) ? (
                    p.pos === 1
                      ? <span style={{ fontFamily:'var(--font-display)', fontSize:'0.62rem', fontWeight:900, color:'var(--red)', textTransform:'uppercase', letterSpacing:'0.08em' }}>LEADER</span>
                      : <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'#aaa' }}>{p.gap || '—'}</span>
                  ) : (
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:p.pos===1?'#f59e0b':'#aaa' }}>{p.fastestLap || '—'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Idle / Pre-race Layout ────────────────────────────────────
// Shown when no session is active — polished pre-session dashboard

function IdleStreamBody({ d, meta, series, lastFetch }) {
  const race     = d.featuredRace
  const weather  = d.weather
  const schedule = d.schedule || []

  const fmtSchedule = (ts) => {
    if (!ts) return ''
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
      }).format(new Date(ts))
    } catch { return '' }
  }

  // Determine which session to countdown to
  let countdownSession = null
  let countdownTarget = race?.date
  const now = new Date()

  if (race?.nextSession?.startTime) {
    const nextTime = new Date(race.nextSession.startTime)
    if (nextTime > now) {
      countdownTarget = race.nextSession.startTime
      countdownSession = race.nextSession.session
    }
  } else if (race?.raceStart) {
    countdownTarget = race.raceStart
  }

  // Find next upcoming session in schedule for highlighting
  const nextSessionTime = schedule.find(s => new Date(s.startTime) > now)?.startTime

  return (
    <div className="stream-body" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Race hero + countdown */}
      <div className="stream-hero">
        {race ? (
          <>
            <div className="stream-race-title">{race.name}</div>
            <div className="stream-track">
              {race.track && race.track !== 'TBD' ? race.track : ''}
              {race.location && race.location !== 'TBD' ? ` · ${race.location}` : ''}
              {race.round ? ` · Round ${race.round}` : ''}
            </div>
            {weather && (
              <div style={{ fontSize:'0.8rem', color:'#555', marginBottom:'var(--sp-4)' }}>
                {weather.temperature != null
                  ? `${Math.round(weather.temperature)}°C / ${cToF(weather.temperature)}°F · `
                  : ''}
                {weather.conditions}
                {weather.rainChance && weather.rainChance !== '0%' ? ` · ${weather.rainChance} rain` : ''}
              </div>
            )}
            {countdownTarget && (
              <div className="stream-countdown-wrap">
                {countdownSession && countdownSession !== 'Race' && (
                  <div style={{ fontSize:'0.85rem', color:'#999', marginBottom:'var(--sp-3)', fontFamily:'var(--font-display)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                    Countdown to {countdownSession}
                  </div>
                )}
                <Countdown targetDate={countdownTarget} size="large" />
              </div>
            )}
          </>
        ) : (
          <div style={{ color:'#444', fontSize:'1.25rem' }}>No upcoming race found</div>
        )}
      </div>

      {/* Two-column dashboard: Schedule + Status */}
      <div className="stream-pre-grid">
        {/* Left: Weekend Schedule */}
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Weekend Schedule</div>
          {schedule.length > 0 ? (
            schedule.map((s, i) => {
              const isNext = s.startTime === nextSessionTime
              const isPast = new Date(s.startTime) < now
              return (
                <div key={i} className={`stream-sched-row ${isNext ? 'next' : ''}`}>
                  <div>
                    <div className="stream-sched-name">{s.session}</div>
                    <div className="stream-sched-time">{fmtSchedule(s.startTime)}</div>
                  </div>
                  <div className={`stream-sched-badge ${isNext ? 'next' : ''}`}>
                    {isNext ? 'NEXT' : isPast ? 'DONE' : 'UPCOMING'}
                  </div>
                </div>
              )
            })
          ) : (
            <div style={{ color:'#555', fontSize:'0.8rem' }}>No schedule available</div>
          )}
        </div>

        {/* Right: Session Status */}
        <div className="stream-pre-card" style={{ display:'flex', flexDirection:'column', justifyContent:'flex-start' }}>
          <div className="stream-pre-card-hdr">Session Status</div>
          <div className="stream-status-badge">● No Active Session</div>
          <p style={{ color:'#666', fontSize:'0.8rem', lineHeight:1.6, marginBottom:'var(--sp-4)' }}>
            Live timing, leaderboard, gaps, sectors, telemetry, and race control will populate automatically when the session begins.
          </p>
          {lastFetch && (
            <div style={{ color:'#555', fontSize:'0.7rem', fontFamily:'var(--font-mono)', marginTop:'auto' }}>
              Last check: {fmt(lastFetch)}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Race Info + Weather */}
      <div className="stream-pre-grid" style={{ borderTop:'1px solid #0f0f0f' }}>
        {/* Race Info */}
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Race Information</div>
          {race?.round && (
            <div className="stream-info-row">
              <div className="stream-info-label">ROUND</div>
              <div className="stream-info-val">{race.round}</div>
            </div>
          )}
          {(race?.raceStart || race?.date) && (
            <div className="stream-info-row">
              <div className="stream-info-label">RACE DATE</div>
              <div className="stream-info-val">{fmtSchedule(race.raceStart || race.date)}</div>
            </div>
          )}
          {race?.track && race.track !== 'TBD' && (
            <div className="stream-info-row">
              <div className="stream-info-label">CIRCUIT</div>
              <div className="stream-info-val">{race.track}</div>
            </div>
          )}
          {race?.location && race.location !== 'TBD' && (
            <div className="stream-info-row">
              <div className="stream-info-label">LOCATION</div>
              <div className="stream-info-val">{race.location}</div>
            </div>
          )}
        </div>

        {/* Track Weather */}
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Track Weather</div>
          {weather ? (
            <>
              {weather.temperature != null && (
                <div className="stream-info-row">
                  <div className="stream-info-label">TEMP</div>
                  <div className="stream-info-val">{Math.round(weather.temperature)}°C / {cToF(weather.temperature)}°F</div>
                </div>
              )}
              {weather.conditions && (
                <div className="stream-info-row">
                  <div className="stream-info-label">CONDITIONS</div>
                  <div className="stream-info-val">{weather.conditions}</div>
                </div>
              )}
              {weather.windSpeed && (
                <div className="stream-info-row">
                  <div className="stream-info-label">WIND</div>
                  <div className="stream-info-val">{weather.windSpeed} {weather.windDir || ''}</div>
                </div>
              )}
              {weather.rainChance && weather.rainChance !== '0%' && (
                <div className="stream-info-row">
                  <div className="stream-info-label">RAIN</div>
                  <div className="stream-info-val">{weather.rainChance}</div>
                </div>
              )}
              {weather.humidity && (
                <div className="stream-info-row">
                  <div className="stream-info-label">HUMIDITY</div>
                  <div className="stream-info-val">{weather.humidity}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color:'#555', fontSize:'0.8rem' }}>No weather data available</div>
          )}
        </div>
      </div>

      {/* Bottom: No Active Session message */}
      <div className="stream-no-session-msg">
        <p>
          No active F1 session right now. Live timing, gaps, sectors, telemetry, race control, and track status will populate automatically when the session begins. Check back when FP1 or race session starts.
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function StreamPage() {
  const [params]  = useSearchParams()
  const series    = params.get('series') || DEFAULT_SERIES
  const meta      = SERIES_META[series] || SERIES_META[DEFAULT_SERIES]

  // Regular series data (standings, schedule, talking points)
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [lastFetch,  setLastFetch]  = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadSeries = useCallback(async () => {
    try {
      const r = await getSeries(series)
      setData(r)
      setLastFetch(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [series])

  useEffect(() => { loadSeries() }, [loadSeries])
  useAutoRefresh(loadSeries, REFRESH_MS, true)

  // Live race data (OpenF1 for F1, NASCAR live feed for NASCAR)
  const { liveData, refetchLive } = useLiveRace(series)
  const isSessionLive = !!liveData?.isLive

  function handleRefresh() {
    setRefreshing(true)
    loadSeries()
    refetchLive()
  }

  const d = data?.data || data || {}

  return (
    <div className="stream-layout" style={{ '--hub-color': meta.color, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <StreamTopbar
        series={series}
        meta={meta}
        refreshing={refreshing}
        lastFetch={lastFetch}
        onRefresh={handleRefresh}
      />

      {loading ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div className="spinner" style={{ borderTopColor:meta.color, margin:'0 auto 16px' }} />
            <div style={{ color:'#444', fontSize:'0.8rem' }}>Loading…</div>
          </div>
        </div>
      ) : isSessionLive ? (
        <>
          {/* ── LIVE MODE: full OpenF1 timing layout ── */}
          <LiveStreamBody liveData={liveData} series={series} meta={meta} />
          {/* ── Real-time hub (OpenF1 HTTP polling via Cloudflare) — F1 only ── */}
          {series === 'f1' && (
            <div style={{ marginTop: 24 }}>
              <LiveRaceHub seriesData={d} />
            </div>
          )}
        </>
      ) : (
        /* ── IDLE MODE: polished pre-session dashboard ── */
        <IdleStreamBody d={d} meta={meta} series={series} lastFetch={lastFetch} />
      )}

      <div className="stream-footer">
        <span className="stream-footer-text">
          RaceNRoam · Stream-safe · No broadcast content
        </span>
        <span className="stream-footer-text">
          {isSessionLive
            ? '● Live via OpenF1 · updates every 20s'
            : `Auto-refresh every ${REFRESH_MS / 1000}s${lastFetch ? ` · Last: ${fmt(lastFetch)}` : ''}`}
        </span>
      </div>
    </div>
  )
}
