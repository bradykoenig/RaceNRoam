export default function LastUpdated({ timestamp }) {
  if (!timestamp) return null
  let label = ''
  try {
    const diff = Date.now() - new Date(timestamp).getTime()
    if (diff < 60000)      label = 'just now'
    else if (diff < 3600000) label = `${Math.floor(diff / 60000)}m ago`
    else                   label = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(timestamp))
  } catch { label = timestamp }
  return <span className="last-updated">Updated {label}</span>
}
