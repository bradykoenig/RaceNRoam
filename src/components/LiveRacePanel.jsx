import TrackMap from './TrackMap'
import RaceControlFeed from './RaceControlFeed'

// ── Helpers ─────────────────────────────────────────────────

const FLAG_COLORS = {
  green:'#22c55e', yellow:'#f59e0b', red:'#ef4444',
  checkered:'#fff', white:'#fff', sc:'#f59e0b', vsc:'#f59e0b',
}

const CATEGORY_LABEL = {
  'race':              'Race',
  'sprint':            'Sprint Race',
  'qualifying':        'Qualifying',
  'sprint-qualifying': 'Sprint Qualifying',
  'practice':          'Practice',
  'other':             'Session',
}

const COMPOUND_SHORT = {
  SOFT:'S', MEDIUM:'M', HARD:'H', INTERMEDIATE:'I', WET:'W',
}

function FlagIndicator({ flag }) {
  if (!flag || flag === 'no-session' || flag === 'cold') return null
  const color = FLAG_COLORS[flag] || '#888'
  const labels = {
    green:'GREEN', yellow:'YELLOW', red:'RED FLAG',
    checkered:'🏁 CHEQUERED', white:'LAST LAP',
    sc:'SAFETY CAR', vsc:'VSC',
  }
  return (
    <div className="flag-indicator" style={{ background:`${color}18`, borderColor:`${color}55`, color }}>
      <span className="flag-dot" style={{ background:color }} />
      {labels[flag] || flag.toUpperCase()}
    </div>
  )
}

function SessionInfo({ session }) {
  if (!session) return null
  const isRace = session.category === 'race' || session.category === 'sprint'
  const label  = CATEGORY_LABEL[session.category] || session.name

  return (
    <div className="live-session-info">
      <div className="live-session-name">{session.name || label}</div>

      {isRace && session.lap != null && (
        <div className="live-session-lap">
          <span className="live-lap-label">LAP</span>
          <span className="live-lap-num">{session.lap}</span>
        </div>
      )}

      {session.segment && (
        <div style={{
          fontFamily:'var(--font-display)', fontSize:'0.75rem', fontWeight:800,
          color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.08em',
        }}>
          {session.segment}
        </div>
      )}
    </div>
  )
}

function TireCompound({ compound, color, age }) {
  if (!compound) return null
  return (
    <span style={{
      fontFamily:'var(--font-mono)', fontSize:'0.68rem', fontWeight:700,
      background:`${color}22`, color, border:`1px solid ${color}44`,
      borderRadius:'2px', padding:'1px 5px', letterSpacing:'0.04em',
    }}>
      {COMPOUND_SHORT[compound] || compound[0]}
      {age != null && <span style={{ color:'#555', marginLeft:2 }}>{age}</span>}
    </span>
  )
}

function PositionRow({ p, category }) {
  const isRace = category === 'race' || category === 'sprint'
  const isQual = category === 'qualifying' || category === 'sprint-qualifying'
  const isTop3 = p.pos <= 3

  return (
    <div className={`live-row ${isTop3 ? 'live-row-top3' : ''}`}>
      {/* Position */}
      <div className={`live-pos pos-badge ${p.pos===1?'p1':p.pos===2?'p2':p.pos===3?'p3':''}`}>{p.pos}</div>

      {/* Team color stripe */}
      <div className="live-team-stripe" style={{ background:p.teamColor||'#444' }} />

      {/* Driver */}
      <div className="live-driver">
        <span className="live-driver-name">{p.driver}</span>
        <span className="live-driver-team">{p.team}</span>
      </div>

      {/* Car number */}
      <span className="live-car-num">{p.number}</span>

      {/* Gap column – context-sensitive */}
      <div className="live-gap-col">
        {isRace ? (
          p.pos === 1
            ? <span className="live-gap-leader">LEADER</span>
            : p.gap ? <span className="live-gap">{p.gap}s</span> : null
        ) : (
          /* Qualifying / Practice: show fastest lap time */
          p.fastestLap
            ? <span className="live-laptime">{p.fastestLap}</span>
            : <span style={{ color:'var(--text-dim)', fontSize:'0.7rem' }}>—</span>
        )}

        {/* Interval (race only) */}
        {isRace && p.interval && p.pos > 1 && (
          <span className="live-interval">{p.interval}s</span>
        )}

        {/* Delta to fastest (qual/practice) */}
        {!isRace && p.pos > 1 && p.fastestLap && (
          <span className="live-interval" style={{ color:'#f59e0b' }}>
            {p.deltaToFastest ? `+${p.deltaToFastest}` : ''}
          </span>
        )}
      </div>

      {/* Tire compound (race/sprint) */}
      {isRace && p.compound && (
        <span style={{ flexShrink:0 }}>
          <TireCompound compound={p.compound} color={p.compoundColor} age={p.tyreAge} />
        </span>
      )}

      {/* Lap number for fastest lap (qual/practice) */}
      {!isRace && p.fastestLapNum && (
        <span className="live-laps-col">L{p.fastestLapNum}</span>
      )}
    </div>
  )
}

function LiveWeather({ weather }) {
  if (!weather) return null
  const c = Math.round(weather.airTemp ?? 0)
  const f = Math.round(c * 9/5 + 32)
  const tc = weather.trackTemp != null ? Math.round(weather.trackTemp) : null
  const tf = tc != null ? Math.round(tc * 9/5 + 32) : null

  return (
    <div className="live-weather">
      <div className="live-weather-temp">
        Air {c}°C / {f}°F
        {tc != null && <span className="live-weather-track"> · Track {tc}°C / {tf}°F</span>}
      </div>
      <span className="live-weather-dry">{weather.rainfall ? '🌧️ Rain' : '☀️ Dry'}</span>
      {weather.windSpeed != null && (
        <span className="live-weather-wind">💨 {Math.round(weather.windSpeed)} km/h</span>
      )}
    </div>
  )
}

function NoLiveApiPanel({ data }) {
  return (
    <div className="live-no-api">
      <div className="live-no-api-icon">📡</div>
      <div className="live-no-api-title">No Free Live API</div>
      <p className="live-no-api-desc">{data.message}</p>
      {data.officialUrl && (
        <a href={data.officialUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
          Official Live Timing ↗
        </a>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────

export default function LiveRacePanel({ liveData, series, compact = false }) {
  if (!liveData) return null
  if (liveData.noFreeApi) return <NoLiveApiPanel data={liveData} />

  if (!liveData.isLive) {
    return null
  }

  const { session, positions = [], locations = [], raceControl = [], weather, category } = liveData
  const isRace = category === 'race' || category === 'sprint'
  const isQual = category === 'qualifying' || category === 'sprint-qualifying'

  // Column header labels
  const gapHeader = isRace ? 'GAP' : isQual ? 'BEST LAP' : 'BEST LAP'

  if (compact) {
    return (
      <div className="live-panel live-panel-compact">
        <div className="live-panel-header">
          <div className="live-badge-wrap">
            <span className="live-badge">● LIVE</span>
            <span className="live-session-compact">{session?.name}</span>
            {isRace && session?.lap != null && (
              <span className="live-lap-compact">Lap {session.lap}</span>
            )}
          </div>
          {session?.flag && <FlagIndicator flag={session.flag} />}
        </div>
        {positions.slice(0, 8).map((p, i) => (
          <PositionRow key={p.number || i} p={p} category={category} />
        ))}
      </div>
    )
  }

  return (
    <div className="live-panel fade-in">
      {/* ── Header ── */}
      <div className="live-panel-header">
        <div className="live-badge-wrap">
          <span className="live-badge">● LIVE NOW</span>
          <SessionInfo session={session} />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-3)', flexWrap:'wrap' }}>
          {session?.flag && <FlagIndicator flag={session.flag} />}
          {weather && <LiveWeather weather={weather} />}
        </div>
      </div>

      {/* ── Body: track map + position tower ── */}
      <div className="live-body">
        <div className="live-map-col">
          <TrackMap locations={locations} positions={positions} series={series} />

          {/* Session type explainer */}
          <div style={{
            marginTop:'var(--sp-4)', fontSize:'0.68rem', color:'var(--text-dim)',
            fontFamily:'var(--font-display)', fontWeight:700, textTransform:'uppercase',
            letterSpacing:'0.1em',
          }}>
            {isRace && '// Positions + gaps to leader'}
            {isQual && '// Best lap times per driver'}
            {category === 'practice' && '// Fastest practice laps'}
          </div>
        </div>

        <div className="live-tower-col">
          {/* Tower header */}
          <div className="live-tower-header">
            <span>POS</span>
            <span />
            <span>DRIVER</span>
            <span>#</span>
            <span>{gapHeader}</span>
          </div>

          <div className="live-tower">
            {positions.slice(0, 20).map((p, i) => (
              <PositionRow key={p.number || i} p={p} category={category} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Race Control messages ── */}
      {raceControl.length > 0 && (
        <div className="live-rc-section">
          <div className="live-section-label">RACE CONTROL</div>
          <RaceControlFeed messages={raceControl.slice(0, 6)} />
        </div>
      )}

      {/* ── Session coverage note ── */}
      <div style={{
        padding:'var(--sp-3) var(--sp-5)', borderTop:'1px solid var(--border-dim)',
        fontSize:'0.65rem', color:'var(--text-dim)', fontFamily:'var(--font-display)',
        fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em',
        display:'flex', alignItems:'center', gap:'var(--sp-3)',
      }}>
        <span style={{ color:'var(--live)' }}>●</span>
        Live via OpenF1 · updates every 20s · covers FP1 FP2 FP3 · Sprint · Qualifying · Race
      </div>
    </div>
  )
}
