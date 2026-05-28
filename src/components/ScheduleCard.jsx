import StatusBadge from './StatusBadge'

function getSessionStatus(startTime) {
  if (!startTime) return 'upcoming'
  const t = new Date(startTime).getTime()
  const now = Date.now()
  const diff = t - now
  if (diff > 0) return 'Upcoming'
  if (diff > -1000 * 60 * 90) return 'Live'
  return 'Completed'
}

function formatSessionTime(startTime) {
  if (!startTime) return 'TBD'
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(startTime))
  } catch { return startTime }
}

export default function ScheduleCard({ schedule }) {
  if (!schedule?.length) return <p className="text-muted text-sm">No schedule available.</p>
  return (
    <div className="schedule-list">
      {schedule.map((item, i) => {
        const status = item.status || getSessionStatus(item.startTime)
        return (
          <div
            key={i}
            className={`schedule-item ${status === 'Live' ? 'session-live' : ''} ${status === 'Completed' ? 'session-done' : ''}`}
          >
            <div>
              <div className="schedule-session">{item.session}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <span className="schedule-time">{formatSessionTime(item.startTime)}</span>
              <StatusBadge status={status} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
