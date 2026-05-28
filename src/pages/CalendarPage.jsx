import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getCalendar } from '../lib/api/client'
import { filterCalendar, groupByMonth } from '../services/scheduleService'
import { SERIES_META } from '../lib/api/endpoints'
import CalendarFilters from '../components/CalendarFilters'
import StatusBadge from '../components/StatusBadge'
import Countdown from '../components/Countdown'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import RefreshButton from '../components/RefreshButton'

function formatCalDate(dateStr) {
  if (!dateStr) return {}
  const d = new Date(dateStr)
  return {
    day:   d.getDate(),
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d),
    time:  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(d),
  }
}

function CalEvent({ event }) {
  const meta = SERIES_META[event.series] || {}
  const { day, month, time } = formatCalDate(event.date)
  const seriesPath = meta.path || `/${event.series}`

  return (
    <div className="cal-event" style={{ borderLeft: `3px solid ${meta.color || 'var(--border-default)'}` }}>
      <div className="cal-event-date">
        <div className="cal-event-month">{month}</div>
        <div className="cal-event-day">{day}</div>
      </div>
      <div className="cal-divider" />
      <div className="cal-event-info">
        <div className="cal-event-name">{event.name}</div>
        <div className="cal-event-track">{event.track} · {event.location}</div>
        {time && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{time}</div>}
      </div>
      <div className="cal-event-actions">
        <span className={`badge ${meta.badgeClass || ''}`}>{meta.shortName || event.series}</span>
        <StatusBadge status={event.status} />
        {event.status !== 'Completed' && event.date && (
          <Countdown targetDate={event.date} size="inline" />
        )}
        <Link to={seriesPath} className="btn btn-ghost btn-sm">→</Link>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filters, setFilters] = useState({ search: '', series: 'all', showCompleted: false })

  async function load() {
    setLoading(true); setError(null)
    try { setResult(await getCalendar()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading) return <div className="container page-wrapper"><LoadingState /></div>
  if (error)   return <div className="container page-wrapper"><ErrorState message={error} onRetry={load} /></div>

  const rawEvents = result?.data?.events || result?.events || []
  const filtered  = filterCalendar(rawEvents, filters)
  const grouped   = groupByMonth(filtered)

  return (
    <div className="container page-wrapper fade-in">
      <div className="page-header">
        <div className="page-header-top">
          <div>
            <h1>Race Calendar</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-2)' }}>
              2026 multi-series motorsports schedule · {rawEvents.length} events
            </p>
          </div>
          <div className="page-header-actions">
            <RefreshButton onRefresh={load} />
          </div>
        </div>
      </div>

      <CalendarFilters filters={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--sp-16)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-4)' }}>📅</div>
            <h3>No events found</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-2)' }}>
              Try adjusting your filters or enabling "Show Completed."
            </p>
          </div>
        </div>
      ) : (
        Object.entries(grouped).map(([month, events]) => (
          <div key={month} className="cal-month-group">
            <div className="cal-month-header">{month} · {events.length} events</div>
            {events.map(e => <CalEvent key={e.id} event={e} />)}
          </div>
        ))
      )}
    </div>
  )
}
