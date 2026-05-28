export default function TrackInfoCard({ track }) {
  if (!track) return null
  const stats = [
    { val: track.length,        lbl: 'Circuit Length' },
    { val: track.laps,          lbl: 'Race Laps' },
    { val: track.raceDistance,  lbl: 'Race Distance' },
    { val: track.type,          lbl: 'Circuit Type' },
    { val: track.lapRecord,     lbl: 'Lap Record' },
    { val: track.bankingTurns || track.bankingFrontStr || track.duration, lbl: track.bankingTurns ? 'Banking (Turns)' : track.duration ? 'Duration' : null },
  ].filter(s => s.val && s.lbl)

  return (
    <div>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)', marginBottom: 'var(--sp-1)' }}>
          {track.name}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{track.location}</div>
      </div>
      <div className="track-stats">
        {stats.slice(0, 6).map(s => (
          <div key={s.lbl} className="track-stat">
            <div className="track-stat-value">{s.val}</div>
            <div className="track-stat-label">{s.lbl}</div>
          </div>
        ))}
      </div>
      {track.features?.length > 0 && (
        <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {track.features.map(f => (
            <span key={f} className="badge badge-completed">{f}</span>
          ))}
        </div>
      )}
    </div>
  )
}
