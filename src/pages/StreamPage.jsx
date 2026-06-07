import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { SERIES_META } from '../lib/api/endpoints'
import { useLiveRace } from '../hooks/useLiveRace'
import Countdown from '../components/Countdown'
import RaceControlFeed from '../components/RaceControlFeed'
import TrackMap from '../components/TrackMap'

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))
  } catch { return '' }
}

function fmtShortTime(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))
  } catch { return '' }
}

function cToF(c) { return Math.round((c ?? 0) * 9 / 5 + 32) }

// ── Shared: topbar ────────────────────────────────────────────────────────────

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
          }}
        >
          ← Hub
        </Link>
        <span className="stream-logo">RaceN<span>Roam</span></span>
        <span className="stream-series-badge">{meta.shortName || series.toUpperCase()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
          {Object.values(SERIES_META).map(m => (
            <Link
              key={m.slug}
              to={`/stream?series=${m.slug}`}
              style={{
                padding: '2px 8px', borderRadius: 'var(--r-full)',
                fontSize: '0.65rem', fontWeight: 700, textDecoration: 'none',
                background: m.slug === series ? m.color : '#111',
                color:      m.slug === series ? '#fff'   : '#444',
                border:     `1px solid ${m.slug === series ? m.color : '#222'}`,
              }}
            >
              {m.shortName}
            </Link>
          ))}
        </div>
        <button onClick={onRefresh} className="stream-refresh-btn" disabled={refreshing}>
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↻</span>
          {lastFetch ? fmtShortTime(lastFetch.toISOString()) : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

// ── Shared: weather bar ───────────────────────────────────────────────────────

function WeatherBar({ weather }) {
  if (!weather) return null
  const air   = weather.airTemp   != null ? Math.round(weather.airTemp)   : null
  const track = weather.trackTemp != null ? Math.round(weather.trackTemp) : null
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#555',
    }}>
      {air   != null && <span>Air {air}°C / {cToF(air)}°F</span>}
      {track != null && <span>Track {track}°C / {cToF(track)}°F</span>}
      {weather.windSpeed != null && <span>💨 {Math.round(weather.windSpeed)} km/h</span>}
      <span>{weather.rainfall ? '🌧️ Rain' : '☀️ Dry'}</span>
    </div>
  )
}

// ── Shared: track status banner ───────────────────────────────────────────────

const TS_STYLE = {
  yellow: { bg: '#f5c51822', border: '#f5c518', text: '#f5c518' },
  red:    { bg: '#e8002d22', border: '#e8002d', text: '#e8002d' },
  sc:     { bg: '#f9731622', border: '#f97316', text: '#f97316' },
  vsc:    { bg: '#f9731622', border: '#f97316', text: '#f97316' },
}

function TrackStatusBanner({ trackStatus }) {
  const style = TS_STYLE[trackStatus?.type]
  if (!style) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: '8px 24px', background: style.bg, borderBottom: `2px solid ${style.border}`,
      animation: trackStatus.type === 'red' ? 'pulseLive 1s step-start infinite' : 'none',
    }}>
      <span style={{ fontSize: 14, color: style.text }}>⚑</span>
      <span style={{
        color: style.text, fontWeight: 900, fontSize: '0.82rem',
        fontFamily: 'var(--font-display)', letterSpacing: '0.12em', textTransform: 'uppercase',
      }}>
        {trackStatus.label}
      </span>
    </div>
  )
}

// ── Shared: leaderboard ───────────────────────────────────────────────────────

const SECTOR_BG = {
  purple: '#7c3aed', green: '#16a34a', yellow: '#713f12', grey: '#1a1a1a',
}
const SECTOR_FG = {
  purple: '#fff', green: '#fff', yellow: '#fde68a', grey: '#333',
}

function SectorCell({ sector }) {
  const bg = SECTOR_BG[sector?.color] || SECTOR_BG.grey
  const fg = SECTOR_FG[sector?.color] || SECTOR_FG.grey
  return (
    <span style={{
      background: bg, color: fg, fontSize: 9, fontFamily: 'monospace',
      padding: '1px 3px', borderRadius: 2, display: 'inline-block',
      minWidth: 42, textAlign: 'center',
    }}>
      {sector?.time || '—'}
    </span>
  )
}

const TYRE_COLOR  = { S: '#e8002d', M: '#f5c518', H: '#d4d4d4', I: '#22c55e', W: '#3b82f6' }
const TYRE_LETTER = { SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' }

function Leaderboard({ leaderboard, sessionType, selectedDriver, onSelect }) {
  const isRace = sessionType === 'Race' || sessionType === 'Sprint'

  if (!leaderboard.length) {
    return (
      <p style={{ color: '#2a2a2a', fontSize: 12, textAlign: 'center', padding: '24px 0', margin: 0 }}>
        Waiting for session data…
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '22px 28px 100px 22px 60px 44px 44px 44px',
        gap: 4, padding: '3px 8px',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#2a2a2a',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <span>P</span><span>#</span><span>DRIVER</span><span>T</span>
        <span style={{ textAlign: 'right' }}>{isRace ? 'GAP' : 'BEST'}</span>
        <span style={{ textAlign: 'center' }}>S1</span>
        <span style={{ textAlign: 'center' }}>S2</span>
        <span style={{ textAlign: 'center' }}>S3</span>
      </div>

      {leaderboard.slice(0, 20).map(p => {
        const tLetter = TYRE_LETTER[p.compound] || '?'
        const sel     = selectedDriver === p.number
        return (
          <div
            key={p.number}
            onClick={() => onSelect(sel ? null : p.number)}
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 28px 100px 22px 60px 44px 44px 44px',
              alignItems: 'center', gap: 4, padding: '5px 8px',
              cursor: 'pointer',
              background:   sel ? '#1a1000' : '#111',
              borderLeft:   `2px solid ${p.inPit ? '#222' : p.teamColor || '#444'}`,
              borderBottom: '1px solid #161616',
              opacity: p.inPit ? 0.5 : 1,
            }}
          >
            <span style={{ color: '#444', fontFamily: 'monospace', fontSize: 12 }}>{p.pos}</span>

            <span style={{
              background: p.teamColor || '#444', color: '#fff',
              fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
              borderRadius: 2, padding: '1px 3px', textAlign: 'center',
            }}>
              {p.number}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              <span style={{ color: p.inPit ? '#444' : '#ddd', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                {p.short || p.driver}
              </span>
              {p.inPit       && <span style={{ color: '#e63946', fontSize: 8, fontWeight: 700 }}>PIT</span>}
              {p.isPitOutLap && <span style={{ color: '#22c55e', fontSize: 8 }}>OUT</span>}
            </div>

            <span style={{ color: TYRE_COLOR[tLetter] || '#444', fontSize: 10, fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>
              {p.compound ? tLetter : '—'}
              {p.tyreAge != null && <span style={{ fontSize: 8, color: '#555' }}>{p.tyreAge}</span>}
            </span>

            <span style={{ color: '#7ecff4', fontFamily: 'monospace', fontSize: 10, textAlign: 'right' }}>
              {isRace
                ? (p.pos === 1 ? 'LEADER' : (p.gap || '—'))
                : (p.fastestLap || '—')}
            </span>

            <div style={{ textAlign: 'center' }}><SectorCell sector={p.sectors?.[0]} /></div>
            <div style={{ textAlign: 'center' }}><SectorCell sector={p.sectors?.[1]} /></div>
            <div style={{ textAlign: 'center' }}><SectorCell sector={p.sectors?.[2]} /></div>
          </div>
        )
      })}
    </div>
  )
}

// ── Shared: telemetry ─────────────────────────────────────────────────────────

function TelemetryBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#333', fontSize: 9, fontFamily: 'monospace', width: 18, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, background: '#1a1a1a', height: 6, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ color: '#444', fontSize: 9, fontFamily: 'monospace', width: 28, textAlign: 'right' }}>
        {Math.round(value ?? 0)}
      </span>
    </div>
  )
}

function TelemetryPanel({ driver }) {
  const tel = driver?.telemetry
  if (!driver) {
    return <p style={{ color: '#2a2a2a', fontSize: 11, margin: 0, padding: '12px 0', textAlign: 'center' }}>Click a driver to view telemetry</p>
  }
  if (!tel) {
    return <p style={{ color: '#2a2a2a', fontSize: 11, margin: 0, padding: '12px 0', textAlign: 'center' }}>No telemetry for #{driver.number}</p>
  }
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {[['km/h', tel.speed], ['GEAR', tel.gear]].map(([lbl, val]) => (
          <div key={lbl} style={{ textAlign: 'center', minWidth: 42 }}>
            <div style={{ color: '#fff', fontSize: lbl === 'km/h' ? 22 : 16, fontFamily: 'monospace', fontWeight: 900, lineHeight: 1 }}>
              {val ?? '—'}
            </div>
            <div style={{ color: '#333', fontSize: 9, letterSpacing: '0.08em', marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
        <div style={{
          padding: '4px 10px', borderRadius: 3, textAlign: 'center',
          background: tel.drs ? '#22c55e22' : '#1a1a1a',
          border: `1px solid ${tel.drs ? '#22c55e' : '#222'}`,
        }}>
          <div style={{ color: tel.drs ? '#22c55e' : '#333', fontSize: 10, fontWeight: 700 }}>DRS</div>
          <div style={{ color: tel.drs ? '#22c55e' : '#333', fontSize: 9 }}>{tel.drs ? 'OPEN' : 'CLOSED'}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <TelemetryBar label="THR" value={tel.throttle ?? 0} max={100} color="#22c55e" />
        <TelemetryBar label="BRK" value={tel.brake    ?? 0} max={100} color="#e8002d" />
      </div>
    </div>
  )
}

// ── Shared: schedule list ─────────────────────────────────────────────────────

function SessionSchedule({ sessions, nextSessionStart }) {
  const now = Date.now()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sessions.map((s, i) => {
        const start  = new Date(s.startTime).getTime()
        const isNext = s.startTime === nextSessionStart
        const isPast = start < now && !isNext
        const isNow  = start <= now && now <= new Date(s.endTime).getTime() + 15 * 60_000
        return (
          <div
            key={i}
            className={`stream-sched-row${isNext ? ' next' : ''}`}
            style={{ opacity: isPast ? 0.4 : 1 }}
          >
            <div>
              <div className="stream-sched-name">{s.sessionName}</div>
              <div className="stream-sched-time">{fmtTime(s.startTime)}</div>
            </div>
            <span className={`stream-sched-badge${isNext ? ' next' : ''}`}>
              {isNow  ? 'LIVE'     :
               isNext ? 'NEXT'     :
               isPast ? 'DONE'     : 'UPCOMING'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── MODE: pre_session ─────────────────────────────────────────────────────────

function PreSessionView({ data }) {
  const { race, sessions, nextSession, weather } = data

  return (
    <div className="stream-body" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Hero */}
      <div className="stream-hero">
        {race?.raceName && <div className="stream-race-title">{race.raceName}</div>}
        <div className="stream-track">
          {[race?.circuitName, race?.locality, race?.country].filter(Boolean).join(' · ')}
          {race?.round ? ` · Round ${race.round}` : ''}
        </div>
        {weather && (
          <div style={{ fontSize: '0.8rem', color: '#555', margin: '0 0 var(--sp-4)' }}>
            {weather.airTemp != null ? `${Math.round(weather.airTemp)}°C / ${cToF(weather.airTemp)}°F` : ''}
            {weather.rainfall ? ' · 🌧️ Rain' : weather.airTemp != null ? ' · ☀️ Dry' : ''}
          </div>
        )}
        {nextSession?.startTime && (
          <div className="stream-countdown-wrap">
            <div style={{
              fontSize: '0.85rem', color: '#999', marginBottom: 'var(--sp-3)',
              fontFamily: 'var(--font-display)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Countdown to {nextSession.sessionName}
            </div>
            <Countdown targetDate={nextSession.startTime} size="large" />
          </div>
        )}
      </div>

      {/* Schedule + Status */}
      <div className="stream-pre-grid">
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Weekend Schedule</div>
          {sessions?.length > 0
            ? <SessionSchedule sessions={sessions} nextSessionStart={nextSession?.startTime} />
            : <div style={{ color: '#555', fontSize: '0.8rem' }}>Schedule loading…</div>
          }
        </div>

        <div className="stream-pre-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="stream-pre-card-hdr">Session Status</div>
          <div className="stream-status-badge">● No Active Session</div>
          <p style={{ color: '#666', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
            Live timing will appear automatically when the session begins.
            <br />Best-effort live timing — may be delayed.
          </p>
        </div>
      </div>

      {/* Race info + Weather */}
      <div className="stream-pre-grid" style={{ borderTop: '1px solid #0f0f0f' }}>
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Race Information</div>
          {race?.round      && <div className="stream-info-row"><div className="stream-info-label">ROUND</div><div className="stream-info-val">{race.round}</div></div>}
          {race?.raceDateTimeUtc && <div className="stream-info-row"><div className="stream-info-label">RACE DATE</div><div className="stream-info-val">{fmtTime(race.raceDateTimeUtc)}</div></div>}
          {race?.circuitName && <div className="stream-info-row"><div className="stream-info-label">CIRCUIT</div><div className="stream-info-val">{race.circuitName}</div></div>}
          {race?.locality   && <div className="stream-info-row"><div className="stream-info-label">LOCATION</div><div className="stream-info-val">{[race.locality, race.country].filter(Boolean).join(', ')}</div></div>}
        </div>

        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Track Weather</div>
          {weather ? (
            <>
              {weather.airTemp   != null && <div className="stream-info-row"><div className="stream-info-label">AIR TEMP</div><div className="stream-info-val">{Math.round(weather.airTemp)}°C / {cToF(weather.airTemp)}°F</div></div>}
              {weather.trackTemp != null && <div className="stream-info-row"><div className="stream-info-label">TRACK TEMP</div><div className="stream-info-val">{Math.round(weather.trackTemp)}°C / {cToF(weather.trackTemp)}°F</div></div>}
              {weather.windSpeed != null && <div className="stream-info-row"><div className="stream-info-label">WIND</div><div className="stream-info-val">{Math.round(weather.windSpeed)} km/h</div></div>}
              {weather.humidity  != null && <div className="stream-info-row"><div className="stream-info-label">HUMIDITY</div><div className="stream-info-val">{Math.round(weather.humidity)}%</div></div>}
              <div className="stream-info-row"><div className="stream-info-label">CONDITIONS</div><div className="stream-info-val">{weather.rainfall ? '🌧️ Rain' : '☀️ Dry'}</div></div>
            </>
          ) : (
            <div style={{ color: '#555', fontSize: '0.8rem' }}>Weather data not yet available</div>
          )}
        </div>
      </div>

      <div className="stream-no-session-msg">
        <p>No active session. Live timing, leaderboard, sectors, and race control will populate automatically when the session begins.</p>
      </div>
    </div>
  )
}

// ── MODE: best_effort_live ────────────────────────────────────────────────────

function LiveView({ data, ageMs }) {
  const { activeSession, leaderboard, raceControl, weather, trackStatus, currentLap, locations, stale, warnings } = data
  const [selectedNum, setSelectedNum] = useState(null)

  const sessionType = activeSession?.sessionType || ''
  const isRace      = sessionType === 'Race' || sessionType === 'Sprint'

  const selectedDriver = selectedNum
    ? leaderboard.find(p => p.number === selectedNum)
    : leaderboard[0] || null

  const ageSec = ageMs != null ? Math.floor(ageMs / 1000) : null

  return (
    <div className="stream-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      <TrackStatusBanner trackStatus={trackStatus} />

      {/* Session header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--sp-3) var(--sp-8)', borderBottom: '1px solid #111',
        background: '#060609', flexWrap: 'wrap', gap: 'var(--sp-4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 900,
            color: 'var(--red)', animation: 'pulseLive 1.4s ease-in-out infinite',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {data.authenticated ? '● LIVE' : '● BEST-EFFORT LIVE'}
          </span>
          {activeSession?.sessionName && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {activeSession.sessionName}
            </span>
          )}
          {isRace && currentLap != null && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#666' }}>
              LAP <span style={{ color: '#fff', fontWeight: 700 }}>{currentLap}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
          <WeatherBar weather={weather} />
          {ageSec != null && (
            <span style={{
              fontSize: 10, fontFamily: 'monospace',
              color: ageSec > 30 ? '#e63946' : ageSec > 15 ? '#fa0' : '#2e2e2e',
              padding: '1px 5px', border: `1px solid ${ageSec > 30 ? '#3a0000' : '#1e1e1e'}`,
            }}>
              {ageSec > 30 ? `⚠ ${ageSec}s ago` : `↻ ${ageSec}s ago`}
            </span>
          )}
          {stale && <span style={{ color: '#fa0', fontSize: 10 }}>STALE</span>}
        </div>
      </div>

      {warnings?.length > 0 && (
        <div style={{ background: '#1a0000', borderBottom: '1px solid #3a0000', padding: '6px 24px', fontSize: 11, color: '#f87171' }}>
          {warnings.join(' · ')}
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 1.8fr) minmax(240px, 1fr)', flex: 1, minHeight: 0 }}>

        {/* Left: leaderboard + telemetry */}
        <div style={{ borderRight: '1px solid #141414', display: 'flex', flexDirection: 'column' }}>
          <HubPanel title={`TIMING — ${activeSession?.sessionName?.toUpperCase() || 'SESSION'}`}>
            <Leaderboard
              leaderboard={leaderboard}
              sessionType={sessionType}
              selectedDriver={selectedNum}
              onSelect={setSelectedNum}
            />
          </HubPanel>
          <HubPanel title={selectedDriver ? `TELEMETRY — #${selectedDriver.number} ${selectedDriver.short}` : 'TELEMETRY — click a driver'}>
            <TelemetryPanel driver={selectedDriver} />
          </HubPanel>
        </div>

        {/* Right: track map + race control */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {(locations?.length > 3) && (
            <HubPanel title="LIVE TRACK POSITIONS">
              <TrackMap locations={locations} positions={leaderboard} series="f1" />
            </HubPanel>
          )}
          <HubPanel title={`RACE CONTROL${raceControl.length ? ` (${raceControl.length})` : ''}`}>
            <RaceControlFeed messages={raceControl.slice(0, 8)} />
          </HubPanel>
          <div style={{ padding: '8px 10px', borderTop: '1px solid #141414', marginTop: 'auto' }}>
            <div style={{ fontSize: 9, color: '#2a2a2a', letterSpacing: '0.08em', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
              {data.authenticated
                ? 'Live timing via OpenF1 real-time API · Unofficial RaceNRoam watch party dashboard · Not affiliated with F1, FIA, or FOM'
                : 'Best-effort live timing — may be delayed · Source: OpenF1 · Unofficial watch party dashboard'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HubPanel({ title, children }) {
  return (
    <div style={{ borderBottom: '1px solid #141414' }}>
      <div style={{ padding: '5px 10px', background: '#0c0c0c', borderBottom: '1px solid #141414', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#2a2a2a' }}>
        {title}
      </div>
      <div style={{ padding: '8px' }}>{children}</div>
    </div>
  )
}

// ── MODE: post_session ────────────────────────────────────────────────────────

function PostSessionView({ data }) {
  const { latestSession, leaderboard, raceControl, nextSession, sessions } = data

  return (
    <div className="stream-body" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 'var(--sp-6) var(--sp-8)', borderBottom: '1px solid #0f0f0f', background: '#040406' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.14em', color: '#22c55e',
          marginBottom: 'var(--sp-3)',
        }}>
          ✓ SESSION COMPLETE
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
          {latestSession?.sessionName || 'Session'}
        </div>
        {latestSession?.endTime && (
          <div style={{ color: '#555', fontSize: '0.8rem', marginTop: 4 }}>
            Ended {fmtTime(latestSession.endTime)}
          </div>
        )}
      </div>

      <div className="stream-pre-grid">
        {/* Final results */}
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Final Classification</div>
          {leaderboard.length > 0 ? (
            <Leaderboard
              leaderboard={leaderboard}
              sessionType={latestSession?.sessionType || ''}
              selectedDriver={null}
              onSelect={() => {}}
            />
          ) : (
            <div style={{ color: '#555', fontSize: '0.8rem' }}>Results not yet available</div>
          )}
        </div>

        {/* Next session or complete */}
        <div className="stream-pre-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {nextSession ? (
            <>
              <div className="stream-pre-card-hdr">Next Session</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                {nextSession.sessionName}
              </div>
              <div style={{ color: '#555', fontSize: '0.8rem' }}>{fmtTime(nextSession.startTime)}</div>
              <Countdown targetDate={nextSession.startTime} size="normal" />
            </>
          ) : (
            <>
              <div className="stream-pre-card-hdr">Weekend Status</div>
              <div style={{ color: '#22c55e', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700 }}>
                Race Weekend Complete
              </div>
            </>
          )}

          {sessions?.length > 0 && (
            <>
              <div className="stream-pre-card-hdr" style={{ marginTop: 'var(--sp-4)' }}>Full Schedule</div>
              <SessionSchedule sessions={sessions} nextSessionStart={nextSession?.startTime} />
            </>
          )}
        </div>
      </div>

      {raceControl.length > 0 && (
        <div style={{ padding: 'var(--sp-4) var(--sp-6)', borderTop: '1px solid #0f0f0f' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--red)', marginBottom: 'var(--sp-3)' }}>
            Race Control
          </div>
          <RaceControlFeed messages={raceControl.slice(0, 4)} />
        </div>
      )}
    </div>
  )
}

// ── MODE: no_active_session ───────────────────────────────────────────────────

function NoSessionView({ data }) {
  const { race, nextSession, sessions } = data

  return (
    <div className="stream-body" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="stream-hero">
        {race?.raceName && <div className="stream-race-title">{race.raceName}</div>}
        {(race?.circuitName || race?.locality) && (
          <div className="stream-track">
            {[race?.circuitName, race?.locality, race?.country].filter(Boolean).join(' · ')}
            {race?.round ? ` · Round ${race.round}` : ''}
          </div>
        )}
        {nextSession?.startTime && (
          <div className="stream-countdown-wrap">
            <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: 'var(--sp-3)', fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Countdown to {nextSession.sessionName}
            </div>
            <Countdown targetDate={nextSession.startTime} size="large" />
          </div>
        )}
      </div>

      <div className="stream-pre-grid">
        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Race Information</div>
          {race?.round       && <div className="stream-info-row"><div className="stream-info-label">ROUND</div><div className="stream-info-val">{race.round}</div></div>}
          {race?.raceDateTimeUtc && <div className="stream-info-row"><div className="stream-info-label">RACE DATE</div><div className="stream-info-val">{fmtTime(race.raceDateTimeUtc)}</div></div>}
          {race?.circuitName && <div className="stream-info-row"><div className="stream-info-label">CIRCUIT</div><div className="stream-info-val">{race.circuitName}</div></div>}
          {race?.locality    && <div className="stream-info-row"><div className="stream-info-label">LOCATION</div><div className="stream-info-val">{[race.locality, race.country].filter(Boolean).join(', ')}</div></div>}
          {!race && <div style={{ color: '#555', fontSize: '0.8rem' }}>No upcoming race data available</div>}
        </div>

        <div className="stream-pre-card">
          <div className="stream-pre-card-hdr">Session Status</div>
          <div className="stream-status-badge">● No Active Session</div>
          <p style={{ color: '#666', fontSize: '0.8rem', lineHeight: 1.6 }}>
            {nextSession
              ? `Next session: ${nextSession.sessionName} on ${fmtTime(nextSession.startTime)}`
              : 'No upcoming sessions found for this race weekend.'}
          </p>
        </div>
      </div>

      {sessions?.length > 0 && (
        <div style={{ padding: 'var(--sp-4) var(--sp-6)', borderTop: '1px solid #0f0f0f' }}>
          <SessionSchedule sessions={sessions} nextSessionStart={nextSession?.startTime} />
        </div>
      )}
    </div>
  )
}

// ── MODE: unavailable ─────────────────────────────────────────────────────────

function UnavailableView({ data }) {
  return (
    <div className="stream-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 'var(--sp-8)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--sp-4)' }}>📡</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 'var(--sp-4)' }}>
          Live Timing Unavailable
        </div>
        {data?.warnings?.length > 0 && (
          <div style={{ color: '#444', fontSize: '0.8rem', marginBottom: 'var(--sp-4)', lineHeight: 1.6 }}>
            {data.warnings.join(' ')}
          </div>
        )}
        <p style={{ color: '#333', fontSize: '0.8rem' }}>
          Data will appear automatically when APIs recover. No manual refresh required.
        </p>
      </div>
    </div>
  )
}

// ── MODE: loading ─────────────────────────────────────────────────────────────

function LoadingView({ meta }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ borderTopColor: meta?.color || '#e63946', margin: '0 auto 16px' }} />
        <div style={{ color: '#444', fontSize: '0.8rem' }}>Loading…</div>
      </div>
    </div>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function StreamFooter({ mode, lastFetch, stale }) {
  const right = mode === 'best_effort_live'
    ? `● Best-effort live timing · may be delayed${stale ? ' · STALE' : ''}`
    : lastFetch ? `Auto-refresh · Last: ${fmtShortTime(lastFetch.toISOString())}` : 'Auto-refresh'

  return (
    <div className="stream-footer">
      <span className="stream-footer-text">RaceNRoam · Stream-safe · No broadcast content</span>
      <span className="stream-footer-text">{right}</span>
    </div>
  )
}

// ── Non-F1 fallback ───────────────────────────────────────────────────────────

function NoFreeApiView({ series, liveData }) {
  const url = liveData?.officialUrl
  return (
    <div className="stream-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--sp-4)' }}>📡</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--sp-4)' }}>
          No Free Live API for {series.toUpperCase()}
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#7ecff4', fontSize: '0.85rem' }}>
            View Official Live Timing ↗
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StreamPage() {
  const [params]     = useSearchParams()
  const series       = params.get('series') || 'f1'
  const meta         = SERIES_META[series] || SERIES_META.f1 || {}

  const { liveData, liveLoading, refetchLive } = useLiveRace(series)
  const [lastFetch,  setLastFetch]  = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [ageMs,      setAgeMs]      = useState(null)

  // Track last fetch timestamp + data age
  useEffect(() => {
    if (!liveData) return
    const ts = new Date()
    setLastFetch(ts)
    setAgeMs(0)
    const id = setInterval(() => setAgeMs(Date.now() - ts.getTime()), 1000)
    return () => clearInterval(id)
  }, [liveData])

  function handleRefresh() {
    setRefreshing(true)
    refetchLive().finally(() => setRefreshing(false))
  }

  const mode = liveData?.mode ?? null

  return (
    <div className="stream-layout" style={{ '--hub-color': meta.color, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <StreamTopbar
        series={series} meta={meta}
        refreshing={refreshing} lastFetch={lastFetch}
        onRefresh={handleRefresh}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Loading */}
        {!liveData && liveLoading && <LoadingView meta={meta} />}

        {/* Non-F1 no-api case */}
        {liveData?.noFreeApi && <NoFreeApiView series={series} liveData={liveData} />}

        {/* F1 state machine */}
        {!liveData?.noFreeApi && mode === 'pre_session'                                  && <PreSessionView  data={liveData} />}
        {!liveData?.noFreeApi && (mode === 'live' || mode === 'best_effort_live')        && <LiveView        data={liveData} ageMs={ageMs} />}
        {!liveData?.noFreeApi && mode === 'post_session'                                 && <PostSessionView data={liveData} />}
        {!liveData?.noFreeApi && mode === 'no_active_session'                            && <NoSessionView   data={liveData} />}
        {!liveData?.noFreeApi && mode === 'unavailable'                                  && <UnavailableView data={liveData} />}
        {!liveData?.noFreeApi && !mode && !liveLoading && <UnavailableView data={{ warnings: ['No data received.'] }} />}
      </div>

      <StreamFooter mode={mode} lastFetch={lastFetch} stale={liveData?.stale} />

      <style>{`
        @keyframes pulseLive { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  )
}
