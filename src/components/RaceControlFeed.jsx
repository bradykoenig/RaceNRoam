const FLAG_STYLE = {
  GREEN:       { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', label: 'GREEN' },
  YELLOW:      { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'YELLOW' },
  RED:         { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', label: 'RED' },
  SC:          { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'SC' },
  VSC:         { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'VSC' },
  CHEQUERED:   { bg: 'rgba(255,255,255,0.08)', color: '#fff',   label: '🏁' },
  BLUE:        { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', label: 'BLUE' },
  CLEAR:       { bg: 'rgba(34,197,94,0.08)',  color: '#4ade80', label: 'CLEAR' },
  default:     { bg: 'rgba(255,255,255,0.05)', color: '#888',   label: 'MSG' },
}

function fmt(isoDate) {
  if (!isoDate) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
    }).format(new Date(isoDate))
  } catch { return '' }
}

export default function RaceControlFeed({ messages = [] }) {
  if (!messages.length) return (
    <div style={{ padding: 'var(--sp-4)', color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
      No race control messages yet
    </div>
  )

  return (
    <div className="rc-feed">
      {messages.map((m, i) => {
        const style = FLAG_STYLE[m.flag] || FLAG_STYLE.default
        return (
          <div
            key={i}
            className="rc-message"
            style={{ background: style.bg, borderLeftColor: style.color }}
          >
            <span className="rc-flag" style={{ color: style.color }}>
              {style.label}
            </span>
            <span className="rc-text">{m.message}</span>
            <span className="rc-time">{fmt(m.time)}</span>
          </div>
        )
      })}
    </div>
  )
}
