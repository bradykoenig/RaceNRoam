import Countdown from './Countdown'
import StatusBadge from './StatusBadge'
import { SERIES_META } from '../lib/api/endpoints'

export default function RaceCard({ race, series, showCountdown = true }) {
  if (!race) return null
  const meta = SERIES_META[series] || {}

  function formatDate(d) {
    if (!d) return 'TBD'
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      }).format(new Date(d))
    } catch { return d }
  }

  return (
    <div className="race-card">
      <div className="race-card-banner" style={{ background: meta.color || 'var(--accent-red)' }} />
      <div className="race-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          <div>
            {race.flag && <span style={{ fontSize: '1.5rem', marginRight: 'var(--sp-2)' }}>{race.flag}</span>}
            <h3 className="race-card-name">{race.name}</h3>
            {(race.track && race.track !== 'TBD') || (race.location && race.location !== 'TBD') ? (
              <p className="race-card-track">
                {race.track && race.track !== 'TBD' && <span>{race.track}</span>}
                {(race.track && race.track !== 'TBD') && (race.location && race.location !== 'TBD') && <span> · </span>}
                {race.location && race.location !== 'TBD' && <span>{race.location}</span>}
              </p>
            ) : null}
          </div>
          <StatusBadge status={race.status || 'Upcoming'} />
        </div>

        <div className="race-card-meta">
          {race.round && (
            <div className="race-card-stat">
              <span className="race-card-stat-val font-mono">Rd {race.round}</span>
              <span className="race-card-stat-lbl">Round</span>
            </div>
          )}
          {(race.raceStart || race.date) && (
            <>
              <div className="race-card-divider" />
              <div className="race-card-stat">
                <span className="race-card-stat-val text-sm">{formatDate(race.raceStart || race.date)}</span>
                <span className="race-card-stat-lbl">Race Start</span>
              </div>
            </>
          )}
          {race.duration && (
            <>
              <div className="race-card-divider" />
              <div className="race-card-stat">
                <span className="race-card-stat-val font-bold">{race.duration}</span>
                <span className="race-card-stat-lbl">Duration</span>
              </div>
            </>
          )}
        </div>

        {showCountdown && race.date && (
          <div style={{ marginTop: 'var(--sp-6)' }}>
            <p className="section-title">Countdown</p>
            <Countdown targetDate={race.date} size="normal" />
          </div>
        )}
      </div>
    </div>
  )
}
