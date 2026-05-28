import Countdown from './Countdown'
import { SERIES_META } from '../lib/api/endpoints'

export default function StreamModePanel({ data, series }) {
  const meta = SERIES_META[series] || {}
  const race = data?.featuredRace || data?.data?.featuredRace
  const standings = data?.standings?.drivers || data?.data?.standings?.drivers || []
  const points = data?.talkingPoints || data?.data?.talkingPoints || []

  return (
    <div className="stream-layout" style={{ '--hub-color': meta.color || 'var(--accent-red)' }}>
      <div className="stream-topbar">
        <span className="stream-logo">Race<span>N</span>Roam</span>
        <span className="stream-series-badge">{meta.shortName || series}</span>
      </div>

      <div className="stream-body">
        <div className="stream-hero">
          {race && (
            <>
              <div className="stream-race-title">{race.name || 'Race Day'}</div>
              <div className="stream-track">
                {race.track}{race.location ? ` · ${race.location}` : ''}
              </div>
              {race.date && (
                <div className="stream-countdown-wrap">
                  <Countdown targetDate={race.date} size="large" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="stream-panels">
          <div className="stream-panel">
            <div className="stream-panel-hdr">Championship Standings</div>
            {standings.slice(0, 5).map((d, i) => (
              <div key={i} className="stream-standing-row">
                <span className="stream-standing-pos">{d.pos || i + 1}</span>
                <span className="stream-standing-name">{d.driver}</span>
                <span className="stream-standing-pts">{d.pts} pts</span>
              </div>
            ))}
            {!standings.length && (
              <div style={{ color: '#444', fontSize: '0.8rem' }}>Standings unavailable</div>
            )}
          </div>

          <div className="stream-panel">
            <div className="stream-panel-hdr">Talking Points</div>
            {points.slice(0, 4).map((pt, i) => (
              <div key={i} className="stream-tp">
                <span className="stream-tp-num">{i + 1}.</span>{pt}
              </div>
            ))}
            {!points.length && (
              <div style={{ color: '#444', fontSize: '0.8rem' }}>No talking points loaded</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
