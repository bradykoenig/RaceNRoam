export default function EmptyState({ icon = '🏁', title = 'No data yet', message }) {
  return (
    <div className="empty-state fade-in">
      <div className="state-icon">{icon}</div>
      <p className="state-title">{title}</p>
      {message && <p className="state-msg">{message}</p>}
    </div>
  )
}
