import { getCalendar } from '../lib/api/client.js'

export async function getFullCalendar() {
  return getCalendar()
}

export function filterCalendar(events, { series, search, showCompleted } = {}) {
  let result = [...events]
  if (series && series !== 'all') {
    result = result.filter(e => e.series === series)
  }
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(e =>
      e.name?.toLowerCase().includes(q) ||
      e.track?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q)
    )
  }
  if (!showCompleted) {
    result = result.filter(e => e.status !== 'Completed')
  }
  result.sort((a, b) => new Date(a.date) - new Date(b.date))
  return result
}

export function groupByMonth(events) {
  const groups = {}
  events.forEach(event => {
    const month = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
      .format(new Date(event.date))
    if (!groups[month]) groups[month] = []
    groups[month].push(event)
  })
  return groups
}

export function getNextRace(events) {
  const now = Date.now()
  return events
    .filter(e => new Date(e.date).getTime() > now)
    .sort((a,b) => new Date(a.date) - new Date(b.date))[0] || null
}
