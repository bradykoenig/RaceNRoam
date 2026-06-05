/**
 * LiveRaceHub
 *
 * Source of truth: GET /api/live?series=f1  (Cloudflare Function → OpenF1 REST)
 * Never calls OpenF1 directly.
 * Polls every 8 seconds.
 * Displays: track status · leaderboard · gaps · sectors · telemetry · race control
 * Labeled: "Best-effort live timing — usually delayed"
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { getDriver, STREAMED_SESSIONS } from '../data/driverBranding'

const POLL_MS        =  6_000   // edge cache TTLs now 2-4s; 6s catches fresh data reliably
const STALE_WARN_MS  = 20_000   // warn after 20s of no new data (matches tighter polling)
const STALE_ERROR_MS = 60_000   // error after 1 minute

// ── Countdown hook ────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmtCountdown(targetIso, now) {
  const ms = new Date(targetIso) - now
  if (ms <= 0) return 'NOW'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function fmtSessionRemaining(endIso, now) {
  const ms = new Date(endIso) - now
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtTime(iso) {
  if (!iso) return 'TBD'
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))
  } catch { return iso }
}

// ── Track Status Banner ───────────────────────────────────────────────────────

const TRACK_STATUS_STYLES = {
  green:   null,                                              // hidden when green
  yellow:  { bg: '#f5c51822', border: '#f5c518', text: '#f5c518' },
  red:     { bg: '#e8002d22', border: '#e8002d', text: '#e8002d' },
  sc:      { bg: '#f9731622', border: '#f97316', text: '#f97316' },
  vsc:     { bg: '#f9731622', border: '#f97316', text: '#f97316' },
  unknown: { bg: '#44444422', border: '#444',    text: '#888'    },
}

function TrackStatusBanner({ trackStatus }) {
  if (!trackStatus || trackStatus.type === 'green') return null
  const style = TRACK_STATUS_STYLES[trackStatus.type] || TRACK_STATUS_STYLES.unknown
  if (!style) return null

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      gap:             10,
      padding:        '8px 16px',
      background:      style.bg,
      borderBottom:   `2px solid ${style.border}`,
      animation:       trackStatus.type === 'red' ? 'lrhBlink 1s step-start infinite' : 'none',
    }}>
      <span style={{ fontSize: 16, color: style.text }}>⚑</span>
      <span style={{ color: style.text, fontWeight: 800, fontSize: 13, letterSpacing: '0.12em' }}>
        {trackStatus.label}
      </span>
    </div>
  )
}

// ── Sector cell ───────────────────────────────────────────────────────────────

const SECTOR_STYLE = {
  purple: { background: '#7c3aed', color: '#fff' },
  green:  { background: '#16a34a', color: '#fff' },
  yellow: { background: '#713f12', color: '#fde68a' },
  grey:   { background: '#1a1a1a', color: '#333' },
}

function SectorCell({ sector }) {
  const s = SECTOR_STYLE[sector?.color] || SECTOR_STYLE.grey
  return (
    <span style={{
      ...s,
      fontSize: 10, fontFamily: 'monospace',
      padding: '1px 4px', borderRadius: 2,
      display: 'inline-block', minWidth: 46, textAlign: 'center',
    }}>
      {sector?.time || '—'}
    </span>
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

const TYRE_COLOR  = { S: '#e8002d', M: '#f5c518', H: '#d4d4d4', I: '#22c55e', W: '#3b82f6' }
const TYRE_SHORT  = { SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' }

function Leaderboard({ positions, category, selectedDriver, onSelect }) {
  const isRace = category === 'race' || category === 'sprint'

  if (!positions.length) {
    return (
      <p style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: '20px 0', margin: 0 }}>
        Waiting for session data…
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '20px 26px 88px 20px 56px 48px 48px 48px 50px',
        gap: 4, padding: '3px 8px',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: '#333',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <span>P</span><span>#</span><span>DRIVER</span><span>T</span>
        <span style={{ textAlign: 'right' }}>{isRace ? 'GAP' : 'BEST'}</span>
        <span style={{ textAlign: 'center' }}>S1</span>
        <span style={{ textAlign: 'center' }}>S2</span>
        <span style={{ textAlign: 'center' }}>S3</span>
        <span style={{ textAlign: 'right' }}>LAST</span>
      </div>

      {positions.map(p => {
        const inPit    = !!p.inPit
        const color    = p.teamColor || getDriver(p.number).color
        const selected = selectedDriver === p.number
        const tShort   = TYRE_SHORT[p.compound] || '?'

        return (
          <div
            key={p.number}
            onClick={() => onSelect(selected ? null : p.number)}
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 26px 88px 20px 56px 48px 48px 48px 50px',
              alignItems: 'center',
              gap: 4,
              padding: '5px 8px',
              cursor: 'pointer',
              background: selected ? '#1a1000' : '#111',
              borderLeft: `2px solid ${inPit ? '#222' : color}`,
              borderBottom: '1px solid #161616',
              opacity: inPit ? 0.45 : 1,
              transition: 'background 0.15s, opacity 0.3s',
            }}
          >
            <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 12 }}>{p.pos}</span>

            <span style={{
              background: color, color: '#fff',
              fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
              borderRadius: 2, padding: '1px 3px', textAlign: 'center',
            }}>
              {p.number}
            </span>

            <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: inPit ? '#444' : '#ddd', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>
                {p.short || String(p.driver || '').split(' ').pop()}
              </span>
              {inPit   && <span style={{ color: '#e63946', fontSize: 8, fontWeight: 700 }}>PIT</span>}
              {p.isPitOutLap && <span style={{ color: '#22c55e', fontSize: 8 }}>OUT</span>}
            </div>

            <span style={{ color: TYRE_COLOR[tShort] || '#444', fontSize: 11, fontWeight: 700, textAlign: 'center', fontFamily: 'monospace' }}>
              {tShort}
              {p.tyreAge != null && <span style={{ fontSize: 8, color: '#555' }}>{p.tyreAge}</span>}
            </span>

            <span style={{ color: '#7ecff4', fontFamily: 'monospace', fontSize: 10, textAlign: 'right' }}>
              {isRace ? (p.pos === 1 ? 'LEADER' : (p.gap || '—')) : (p.fastestLap || '—')}
            </span>

            <div style={{ textAlign: 'center' }}><SectorCell sector={p.sectors?.[0]} /></div>
            <div style={{ textAlign: 'center' }}><SectorCell sector={p.sectors?.[1]} /></div>
            <div style={{ textAlign: 'center' }}><SectorCell sector={p.sectors?.[2]} /></div>

            <span style={{ color: '#555', fontFamily: 'monospace', fontSize: 10, textAlign: 'right' }}>
              {p.fastestLap || '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

function Bar({ label, value, max, color }) {
  const pct = Math.min(100, Math.max(0, ((value ?? 0) / max) * 100))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ color: '#444', fontSize: 9, fontFamily: 'monospace', width: 16, textAlign: 'right' }}>{label}</span>
      <div style={{ flex: 1, background: '#1a1a1a', height: 6, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ color: '#555', fontSize: 9, fontFamily: 'monospace', width: 28, textAlign: 'right' }}>{Math.round(value ?? 0)}</span>
    </div>
  )
}

function Telemetry({ driver, telemetry }) {
  if (!telemetry) {
    return (
      <p style={{ color: '#2a2a2a', fontSize: 11, margin: 0, padding: '12px 0', textAlign: 'center' }}>
        {driver ? `No telemetry for #${driver.number}` : 'Click a driver to view telemetry'}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {/* Big numbers */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Stat label="km/h"    value={telemetry.speed ?? '—'} large />
        <Stat label="GEAR"    value={telemetry.gear  ?? '—'} large />
        <Stat label="RPM"     value={telemetry.rpm ? `${Math.round(telemetry.rpm / 100) / 10}k` : '—'} />
        <div style={{
          padding: '4px 10px', borderRadius: 3, textAlign: 'center',
          background: telemetry.drs ? '#22c55e22' : '#1a1a1a',
          border:     `1px solid ${telemetry.drs ? '#22c55e' : '#222'}`,
        }}>
          <div style={{ color: telemetry.drs ? '#22c55e' : '#333', fontSize: 10, fontWeight: 700 }}>DRS</div>
          <div style={{ color: telemetry.drs ? '#22c55e' : '#333', fontSize: 9 }}>{telemetry.drs ? 'OPEN' : 'CLOSED'}</div>
        </div>
      </div>
      {/* Bars */}
      <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Bar label="THR" value={telemetry.throttle ?? 0} max={100} color="#22c55e" />
        <Bar label="BRK" value={telemetry.brake    ?? 0} max={100} color="#e8002d" />
      </div>
    </div>
  )
}

function Stat({ label, value, large }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 44 }}>
      <div style={{ color: '#fff', fontSize: large ? 22 : 14, fontFamily: 'monospace', fontWeight: 900, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ color: '#444', fontSize: 9, letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Race Control ──────────────────────────────────────────────────────────────

const FLAG_COLORS = {
  GREEN: '#22c55e', YELLOW: '#f5c518', RED: '#e8002d',
  BLUE: '#3b82f6', CHEQUERED: '#ddd', SAFETY_CAR: '#f97316',
  VIRTUAL_SAFETY_CAR: '#f97316', CLEAR: '#22c55e',
}

function RaceControl({ messages }) {
  if (!messages?.length) {
    return <p style={{ color: '#2a2a2a', fontSize: 11, margin: 0, padding: '12px 0', textAlign: 'center' }}>No messages yet</p>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
      {messages.slice(0, 10).map((m, i) => {
        const col = FLAG_COLORS[m.flag] || '#333'
        const ts  = m.time ? new Date(m.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
        return (
          <div key={i} style={{
            display: 'flex', gap: 7, padding: '5px 8px',
            background: '#111', borderLeft: `2px solid ${col}`,
            borderBottom: '1px solid #161616', fontSize: 11,
          }}>
            <span style={{ color: '#333', fontSize: 9, flexShrink: 0, fontFamily: 'monospace', paddingTop: 1 }}>{ts}</span>
            {m.flag && <span style={{ color: col, fontWeight: 700, fontSize: 9, flexShrink: 0 }}>{m.flag}</span>}
            <span style={{ color: '#aaa', lineHeight: 1.4 }}>{m.message}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Session Schedule ──────────────────────────────────────────────────────────

function SessionSchedule({ seriesData, now }) {
  const schedule  = seriesData?.schedule || []
  const sessions  = {}

  for (const s of schedule) {
    const name = (s.session || '').toLowerCase()
    if      (name.includes('practice 1')) sessions.fp1        = s.startTime
    else if (name.includes('practice 2')) sessions.fp2        = s.startTime
    else if (name.includes('practice 3')) sessions.fp3        = s.startTime
    else if (name.includes('qualifying')) sessions.qualifying = s.startTime
    else if (name === 'race')             sessions.race       = s.startTime
  }

  const hasAny = Object.keys(sessions).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {STREAMED_SESSIONS.map(({ key, label }) => {
        const iso  = sessions[key]
        if (!iso) return null
        const ms   = new Date(iso) - now
        const past = ms < -7200000
        const live = ms <= 0 && !past

        return (
          <div key={key} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 10px',
            background: live ? '#140800' : '#111',
            borderLeft: `2px solid ${live ? '#e63946' : past ? '#1e1e1e' : '#2a2a2a'}`,
            borderBottom: '1px solid #161616',
            opacity: past ? 0.4 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {live && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e63946', display: 'inline-block', animation: 'lrhPulse 1.2s ease-in-out infinite' }} />}
              <span style={{ color: live ? '#fff' : past ? '#3a3a3a' : '#aaa', fontWeight: live ? 700 : 400, fontSize: 13 }}>
                {label}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#3a3a3a', fontSize: 10 }}>{fmtTime(iso)}</div>
              {live  && <div style={{ color: '#e63946', fontSize: 10, fontWeight: 700 }}>● IN SESSION</div>}
              {!live && !past && <div style={{ color: '#4fc', fontSize: 10, fontFamily: 'monospace' }}>in {fmtCountdown(iso, now)}</div>}
              {past  && <div style={{ color: '#2a2a2a', fontSize: 10 }}>DONE</div>}
            </div>
          </div>
        )
      })}
      {!hasAny && (
        <p style={{ color: '#2a2a2a', fontSize: 11, textAlign: 'center', padding: '12px 0', margin: 0 }}>
          Schedule loading…
        </p>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const SESSION_LABEL = {
  practice:            'FREE PRACTICE',
  qualifying:          'QUALIFYING',
  'sprint-qualifying': 'SPRINT QUALI',
  sprint:              'SPRINT RACE',
  race:                'RACE',
}

export default function LiveRaceHub({ seriesData }) {
  const [livePayload,    setLivePayload]    = useState(null)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [lastUpdatedAt,  setLastUpdatedAt]  = useState(null)
  const [fetchError,     setFetchError]     = useState(null)
  const timerRef = useRef(null)
  const now      = useLiveClock()

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/live?series=f1')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setLivePayload(json)
      setLastUpdatedAt(Date.now())
      setFetchError(null)
    } catch (err) {
      setFetchError(err.message)
    }
  }, [])

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [poll])

  // Derived state
  const isLive     = livePayload?.isLive    ?? false
  const positions  = livePayload?.positions ?? []
  const rc         = livePayload?.raceControl ?? []
  const trackSt    = livePayload?.trackStatus
  const weather    = livePayload?.weather
  const session    = livePayload?.session
  const category   = livePayload?.category  ?? ''
  const mode       = livePayload?.mode
  const isStale    = livePayload?._stale    ?? false

  const ageMs      = lastUpdatedAt ? now - lastUpdatedAt : null
  const ageWarn    = ageMs != null && ageMs > STALE_WARN_MS
  const ageError   = ageMs != null && ageMs > STALE_ERROR_MS
  const ageLabel   = ageMs == null ? null
                   : ageMs < 60000 ? `${Math.floor(ageMs / 1000)}s ago`
                   : `${Math.floor(ageMs / 60000)}m ago`

  const sessionRemaining = isLive && session?.dateEnd ? fmtSessionRemaining(session.dateEnd, now) : null
  const selectedPos      = selectedDriver ? positions.find(p => p.number === selectedDriver) : positions[0]

  return (
    <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', color: '#ddd', fontFamily: 'var(--font-body, sans-serif)' }}>

      {/* Track status banner — only shown for non-green flags */}
      {isLive && trackSt && <TrackStatusBanner trackStatus={trackSt} />}

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', borderBottom: '1px solid #161616',
        background: '#0d0d0d', flexWrap: 'wrap', gap: 8,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: '#2e2e2e' }}>
            RACE HUB
          </span>

          {isLive && (
            <>
              <span style={{ background: '#e63946', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', letterSpacing: '0.1em' }}>
                {SESSION_LABEL[category] || session?.name?.toUpperCase() || 'SESSION'}
              </span>
              {session?.circuit && (
                <span style={{ color: '#444', fontSize: 11 }}>
                  {session.circuit}{session.country ? `, ${session.country}` : ''}
                </span>
              )}
              {session?.lap && (
                <span style={{ color: '#666', fontSize: 11, fontFamily: 'monospace' }}>
                  LAP {session.lap}{session.totalLaps ? `/${session.totalLaps}` : ''}
                </span>
              )}
              {sessionRemaining && (
                <span style={{ color: '#fa0', fontSize: 11, fontFamily: 'monospace' }}>
                  ⏱ {sessionRemaining}
                </span>
              )}
            </>
          )}

          {!isLive && !livePayload && (
            <span style={{ color: '#2a2a2a', fontSize: 11 }}>Connecting…</span>
          )}
          {!isLive && livePayload && (
            <span style={{ color: '#2a2a2a', fontSize: 11 }}>No active session</span>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {weather && isLive && (
            <span style={{ color: '#3a3a3a', fontSize: 10, fontFamily: 'monospace' }}>
              🌡{weather.airTemp}°C  💨{weather.windSpeed}m/s{weather.rainfall ? '  🌧' : ''}
            </span>
          )}

          {/* Data age */}
          {ageLabel && (
            <span style={{
              fontSize: 10, fontFamily: 'monospace',
              color:   ageError ? '#e63946' : ageWarn ? '#fa0' : '#2e2e2e',
              padding: '1px 5px',
              border:  `1px solid ${ageError ? '#3a0000' : ageWarn ? '#3a2000' : '#1e1e1e'}`,
            }}>
              {ageError ? '⚠ NO DATA' : ageWarn ? `⚠ ${ageLabel}` : `↻ ${ageLabel}`}
            </span>
          )}

          {/* Delay label — always shown */}
          <span style={{ fontSize: 9, color: '#2a2a2a', padding: '1px 5px', border: '1px solid #1a1a1a', letterSpacing: '0.06em' }}>
            Best-effort live timing — usually delayed
          </span>

          {fetchError && (
            <span style={{ color: '#e63946', fontSize: 10 }}>⚠ {fetchError}</span>
          )}
          {isStale && (
            <span style={{ color: '#fa0', fontSize: 10 }}>stale</span>
          )}
          {mode === 'best_effort_live' && !fetchError && (
            <span style={{ color: isLive ? '#4fc' : '#2a2a2a', fontSize: 10, fontFamily: 'monospace' }}>
              ● {isLive ? 'ACTIVE' : 'IDLE'}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {isLive ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 1.8fr) minmax(240px, 1fr)' }}>

          {/* Left column */}
          <div style={{ borderRight: '1px solid #141414' }}>
            <Panel title={`TIMING — ${SESSION_LABEL[category] || 'SESSION'}`}>
              <Leaderboard
                positions={positions}
                category={category}
                selectedDriver={selectedDriver}
                onSelect={setSelectedDriver}
              />
            </Panel>

            <Panel title={selectedPos ? `TELEMETRY — #${selectedPos.number} ${selectedPos.short || ''}` : 'TELEMETRY — click a driver'}>
              <Telemetry driver={selectedPos} telemetry={selectedPos?.telemetry} />
            </Panel>
          </div>

          {/* Right column */}
          <div>
            <Panel title="WEEKEND SCHEDULE">
              <SessionSchedule seriesData={seriesData} now={now} />
            </Panel>
            <Panel title={`RACE CONTROL${rc.length ? ` (${rc.length})` : ''}`}>
              <RaceControl messages={rc} />
            </Panel>
          </div>
        </div>
      ) : (
        /* Idle — schedule only */
        <Panel title="WEEKEND SCHEDULE — FP1 · FP2 · FP3 · QUALIFYING · RACE">
          <SessionSchedule seriesData={seriesData} now={now} />
        </Panel>
      )}

      <style>{`
        @keyframes lrhPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.25;transform:scale(.8)} }
        @keyframes lrhBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div style={{ borderBottom: '1px solid #141414' }}>
      <div style={{ padding: '5px 10px', background: '#0c0c0c', borderBottom: '1px solid #141414', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: '#2a2a2a' }}>
        {title}
      </div>
      <div style={{ padding: '8px 8px' }}>
        {children}
      </div>
    </div>
  )
}
