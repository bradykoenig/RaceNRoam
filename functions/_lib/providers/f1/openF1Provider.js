// OpenF1 API provider – https://openf1.org/
// Free, no API key required. Real-time and historical F1 data.
// Uses Cloudflare Cache API to prevent rate limits during live streams.

import { cachedFetchJson } from '../../utils/cfCache.js'

const BASE = 'https://api.openf1.org/v1'
const YEAR = new Date().getFullYear()

// TTLs: meetings/sessions cached 10min, live data 20sec
const TTL = {
  meetings: 600,
  sessions: 600,
  weather: 20,
  drivers: 300,
  position: 20,
  intervals: 20,
  race_control: 20,
}

async function get(path, params = {}, ttl) {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  const cacheTtl = ttl ?? TTL[path.replace('/', '')] ?? 30
  try {
    return await cachedFetchJson(url, {}, cacheTtl)
  } catch (err) {
    throw new Error(`OpenF1 ${path} → ${err.message}`)
  }
}

export async function getLatestMeeting() {
  const meetings = await get('/meetings', { year: YEAR })
  if (!meetings?.length) return null
  const now = Date.now()

  // First try to find the next upcoming meeting
  const upcoming = meetings
    .filter(m => new Date(m.date_start).getTime() > now)
    .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))

  if (upcoming.length > 0) return upcoming[0]

  // If no upcoming meetings, return the most recent past meeting
  return meetings
    .sort((a, b) => new Date(b.date_start) - new Date(a.date_start))[0]
}

export async function getMeetingByKey(meetingKey) {
  const meetings = await get('/meetings', { meeting_key: meetingKey })
  return meetings?.[0] || null
}

export async function getCurrentOrNextSession(meetingKey) {
  const sessions = await get('/sessions', { meeting_key: meetingKey, year: YEAR })
  if (!sessions?.length) return null
  const now = Date.now()
  const upcoming = sessions.filter(s => new Date(s.date_end).getTime() > now)
  if (upcoming.length) return upcoming[0]
  return sessions[sessions.length - 1]
}

export async function getSessionWeather(sessionKey) {
  try {
    const weather = await get('/weather', { session_key: sessionKey })
    if (!weather?.length) return null
    return weather[weather.length - 1]
  } catch { return null }
}

export async function getDrivers(sessionKey) {
  try { return await get('/drivers', { session_key: sessionKey }) }
  catch { return [] }
}

export async function getPositionData(sessionKey) {
  try {
    const data = await get('/position', { session_key: sessionKey })
    return data || []
  } catch { return [] }
}

export async function getRaceControlMessages(sessionKey) {
  try { return await get('/race_control', { session_key: sessionKey }) }
  catch { return [] }
}

export async function getIntervals(sessionKey) {
  try { return await get('/intervals', { session_key: sessionKey }) }
  catch { return [] }
}

// Build a normalized OpenF1 data snapshot for the current meeting
export async function buildOpenF1Snapshot() {
  try {
    const meeting = await getLatestMeeting()
    if (!meeting) return null

    const session = await getCurrentOrNextSession(meeting.meeting_key)
    const sessionKey = session?.session_key

    const [weather, drivers, raceCtl] = await Promise.allSettled([
      sessionKey ? getSessionWeather(sessionKey) : Promise.resolve(null),
      sessionKey ? getDrivers(sessionKey) : Promise.resolve([]),
      sessionKey ? getRaceControlMessages(sessionKey) : Promise.resolve([]),
    ])

    return {
      meeting,
      session,
      weather:      weather.status === 'fulfilled' ? weather.value : null,
      drivers:      drivers.status === 'fulfilled' ? drivers.value : [],
      raceControl:  raceCtl.status === 'fulfilled' ? raceCtl.value : [],
    }
  } catch (err) {
    console.error('OpenF1 snapshot error:', err)
    return null
  }
}

// Normalize OpenF1 weather object to our app shape
export function normalizeWeather(w) {
  if (!w) return null
  return {
    temperature:  w.air_temperature != null ? w.air_temperature : null,
    trackTemp:    w.track_temperature,
    conditions:   w.rainfall ? 'Rain' : 'Dry',
    windSpeed:    w.wind_speed ? `${w.wind_speed} m/s` : null,
    windDir:      w.wind_direction ? `${w.wind_direction}°` : null,
    humidity:     w.humidity ? `${w.humidity}%` : null,
    rainChance:   w.rainfall ? '100%' : '0%',
    source:       'openf1',
  }
}
