import { useCountdown } from '../hooks/useCountdown'

export default function Countdown({ targetDate, size = 'normal' }) {
  const t = useCountdown(targetDate)

  if (!targetDate) return <span className="countdown-ended">Date TBD</span>
  if (!t) return <span className="countdown-ended" style={{ color: 'var(--status-live)' }}>● Racing Now</span>

  const cls = `countdown${size === 'large' ? ' large' : size === 'inline' ? ' inline' : ''}`

  if (size === 'inline') {
    const parts = []
    if (t.days > 0)  parts.push(`${t.days}d`)
    if (t.hours > 0) parts.push(`${t.hours}h`)
    parts.push(`${String(t.minutes).padStart(2,'0')}m`)
    if (t.days === 0) parts.push(`${String(t.seconds).padStart(2,'0')}s`)
    return <span className={cls}>{parts.join(' ')}</span>
  }

  const units = t.days > 0
    ? [{ v: t.days,    l: 'days' }, { v: t.hours,   l: 'hrs' }, { v: t.minutes, l: 'min' }, { v: t.seconds, l: 'sec' }]
    : [{ v: t.hours,   l: 'hrs' }, { v: t.minutes, l: 'min' }, { v: t.seconds, l: 'sec' }]

  return (
    <div className={cls}>
      {units.map((u, i) => (
        <>
          <div key={u.l} className="countdown-unit">
            <span className="countdown-digit">{String(u.v).padStart(2,'0')}</span>
            <span className="countdown-label">{u.l}</span>
          </div>
          {i < units.length - 1 && <span key={`sep-${i}`} className="countdown-sep">:</span>}
        </>
      ))}
    </div>
  )
}
