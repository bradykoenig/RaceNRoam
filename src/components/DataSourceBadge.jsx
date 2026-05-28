export default function DataSourceBadge({ source, warning }) {
  if (!source) return null
  const isFallback = source.includes('fallback')
  const isLive     = !isFallback && source !== 'unknown'
  return (
    <span className={`ds-badge ${isFallback ? 'ds-fallback' : isLive ? 'ds-live' : ''}`}>
      <span className="ds-dot" />
      {isFallback ? 'Fallback Data' : source}
      {warning && <span title={warning} style={{ marginLeft: 4, cursor: 'help' }}>⚠️</span>}
    </span>
  )
}
