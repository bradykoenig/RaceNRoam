import { getToday, getSeries } from '../lib/api/client.js'
import { SERIES_META } from '../lib/api/endpoints.js'

export async function getTodayRace() {
  return getToday()
}

export async function getSeriesData(series) {
  return getSeries(series)
}

export function getSeriesMeta(series) {
  return SERIES_META[series] || null
}

export function formatRaceDate(dateString) {
  if (!dateString) return 'TBD'
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString))
  } catch { return dateString }
}

export function formatRaceTime(dateString, timeZone) {
  if (!dateString) return 'TBD'
  try {
    const opts = { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }
    if (timeZone) opts.timeZone = timeZone
    return new Intl.DateTimeFormat('en-US', opts).format(new Date(dateString))
  } catch { return dateString }
}

export function getRaceStatus(dateString) {
  if (!dateString) return 'unknown'
  const raceTime = new Date(dateString).getTime()
  const now = Date.now()
  const diff = raceTime - now
  if (diff > 0) return 'upcoming'
  if (diff > -1000 * 60 * 60 * 4) return 'live'
  return 'completed'
}
