export default function StatCard({ value, label, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={accent ? { color: accent } : {}}>
        {value ?? '--'}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
