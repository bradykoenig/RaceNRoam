import { getPositionClass } from '../services/standingsService'

export default function StandingsTable({ drivers = [], teams = [], type = 'drivers', limit = 10 }) {
  if (type === 'teams') {
    const rows = teams.slice(0, limit)
    if (!rows.length) return <p className="text-muted text-sm">No constructor standings available.</p>
    return (
      <div style={{ overflowX: 'auto' }}>
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team / Constructor</th>
              <th style={{ textAlign: 'right' }}>PTS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.pos}>
                <td><span className={`pos-badge ${getPositionClass(r.pos)}`}>{r.pos}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    {r.color && <span className="team-dot" style={{ background: r.color }} />}
                    <span className="font-bold">{r.team}</span>
                    {r.class && <span className="badge badge-completed" style={{ fontSize: '0.6rem' }}>{r.class}</span>}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}><span className="font-mono font-bold">{r.pts}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const rows = drivers.slice(0, limit)
  if (!rows.length) return <p className="text-muted text-sm">No driver standings available.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Driver</th>
            <th>Team</th>
            <th style={{ textAlign: 'right' }}>PTS</th>
            {rows[0]?.wins != null && <th style={{ textAlign: 'right' }}>W</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.pos}>
              <td><span className={`pos-badge ${getPositionClass(r.pos)}`}>{r.pos}</span></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  {r.nat && <span title={r.nat}>{r.nat}</span>}
                  <span className="font-bold">{r.driver}</span>
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  {r.teamColor && <span className="team-dot" style={{ background: r.teamColor }} />}
                  <span className="text-secondary text-sm">{r.team}</span>
                </div>
              </td>
              <td style={{ textAlign: 'right' }}><span className="font-mono font-bold">{r.pts}</span></td>
              {r.wins != null && <td style={{ textAlign: 'right' }}><span className="text-muted font-mono">{r.wins}</span></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
