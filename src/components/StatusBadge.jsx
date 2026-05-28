export default function StatusBadge({ status }) {
  const map = {
    live:      { cls: 'badge badge-live',      label: 'Live' },
    Live:      { cls: 'badge badge-live',      label: 'Live' },
    upcoming:  { cls: 'badge badge-upcoming',  label: 'Upcoming' },
    Upcoming:  { cls: 'badge badge-upcoming',  label: 'Upcoming' },
    completed: { cls: 'badge badge-completed', label: 'Completed' },
    Completed: { cls: 'badge badge-completed', label: 'Completed' },
    delayed:   { cls: 'badge badge-delayed',   label: 'Delayed' },
    Delayed:   { cls: 'badge badge-delayed',   label: 'Delayed' },
    cancelled: { cls: 'badge badge-completed', label: 'Cancelled' },
  }
  const { cls, label } = map[status] || { cls: 'badge badge-upcoming', label: status || 'Unknown' }
  return (
    <span className={cls}>
      {status === 'live' || status === 'Live' ? <span className="live-dot" /> : null}
      {label}
    </span>
  )
}
