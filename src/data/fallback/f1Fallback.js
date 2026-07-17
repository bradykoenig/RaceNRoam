// F1 fallback – auto-derives the next race from the calendar, never stale.
import { getCalendarFallback } from './calendarFallback.js'

// Per-circuit coordinates for weather / map (best-effort; null is safe)
const CIRCUIT_META = {
  'Circuit Gilles Villeneuve':         { lat: 45.5048,  lon: -73.5258,  type: 'Temporary Circuit',  laps: 70 },
  'Circuit de Barcelona-Catalunya':    { lat: 41.57,    lon: 2.2611,    type: 'Permanent Circuit',  laps: 66 },
  'Red Bull Ring':                     { lat: 47.2197,  lon: 14.7647,   type: 'Permanent Circuit',  laps: 71 },
  'Silverstone Circuit':               { lat: 52.0786,  lon: -1.0169,   type: 'Permanent Circuit',  laps: 52 },
  'Hungaroring':                       { lat: 47.5789,  lon: 19.2486,   type: 'Permanent Circuit',  laps: 70 },
  'Circuit de Spa-Francorchamps':      { lat: 50.4372,  lon: 5.9714,    type: 'Permanent Circuit',  laps: 44 },
  'Circuit Zandvoort':                 { lat: 52.3888,  lon: 4.5409,    type: 'Permanent Circuit',  laps: 72 },
  'Autodromo Nazionale Monza':         { lat: 45.6156,  lon: 9.2811,    type: 'Permanent Circuit',  laps: 53 },
  'Marina Bay Street Circuit':         { lat: 1.2914,   lon: 103.864,   type: 'Street Circuit',     laps: 61 },
  'Circuit of the Americas':           { lat: 30.1328,  lon: -97.6411,  type: 'Permanent Circuit',  laps: 56 },
  'Autodromo Hermanos Rodriguez':      { lat: 19.4042,  lon: -99.0907,  type: 'Permanent Circuit',  laps: 71 },
  'Autodromo José Carlos Pace':        { lat: -23.7036, lon: -46.6997,  type: 'Permanent Circuit',  laps: 71 },
  'Las Vegas Strip Circuit':           { lat: 36.1147,  lon: -115.1728, type: 'Street Circuit',     laps: 50 },
  'Lusail International Circuit':      { lat: 25.49,    lon: 51.4542,   type: 'Permanent Circuit',  laps: 57 },
  'Yas Marina Circuit':                { lat: 24.4672,  lon: 54.6031,   type: 'Permanent Circuit',  laps: 55 },
}

function buildApproxSchedule(raceDateStr) {
  const race = new Date(raceDateStr)
  const fri  = new Date(race.getTime() - 2 * 86400000)
  const sat  = new Date(race.getTime() - 1 * 86400000)

  const at = (base, utcH, utcM) => {
    const d = new Date(base)
    d.setUTCHours(utcH, utcM, 0, 0)
    return d.toISOString()
  }

  const now = new Date()
  const s = t => (new Date(t) < now ? 'Completed' : 'Upcoming')

  return [
    { session: 'Practice 1',  startTime: at(fri, 13, 30), status: s(at(fri, 13, 30)) },
    { session: 'Practice 2',  startTime: at(fri, 17,  0), status: s(at(fri, 17,  0)) },
    { session: 'Practice 3',  startTime: at(sat, 12, 30), status: s(at(sat, 12, 30)) },
    { session: 'Qualifying',  startTime: at(sat, 16,  0), status: s(at(sat, 16,  0)) },
    { session: 'Race',        startTime: raceDateStr,     status: s(raceDateStr)      },
  ]
}

export function getFallbackF1Data() {
  const calendar = getCalendarFallback()
  const cutoff   = new Date(Date.now() - 4 * 60 * 60 * 1000)
  const next     = calendar.find(e => e.series === 'f1' && new Date(e.date) > cutoff)

  // If no upcoming F1 race in calendar (end of season or calendar is outdated), return a
  // generic placeholder — the live API will provide real data once it's reachable again.
  if (!next) return _genericPlaceholder()

  const meta     = CIRCUIT_META[next.track] || {}
  const schedule = buildApproxSchedule(next.date)
  const country  = next.location?.split(', ').at(-1) || ''
  const year     = new Date(next.date).getFullYear()

  return {
    series:     'f1',
    seriesName: 'Formula 1',
    source:     'fallback',
    lastUpdated: new Date().toISOString(),
    featuredRace: {
      id:          next.id,
      name:        next.name,
      track:       next.track,
      location:    next.location,
      country,
      date:        next.date,
      raceStart:   next.date,
      nextSession: schedule.find(s => new Date(s.startTime) > new Date()) || null,
      status:      'Upcoming',
      round:       next.round,
      season:      year,
    },
    track: {
      name:     next.track,
      location: next.location,
      lat:      meta.lat  || null,
      lon:      meta.lon  || null,
      type:     meta.type || 'Grand Prix Circuit',
      laps:     meta.laps || null,
    },
    schedule,
    standings:     { source: 'unavailable', drivers: [], teams: [] },
    startingGrid:  [],
    weather: {
      temperature: null,
      conditions:  'Unavailable',
      windSpeed:   '--',
      humidity:    '--',
      rainChance:  '--',
      source:      'fallback',
    },
    talkingPoints: [],
    officialLinks: [
      { label: 'Formula 1 Official', url: 'https://www.formula1.com',                               icon: '🏎️' },
      { label: 'Driver Standings',   url: `https://www.formula1.com/en/results/${year}/drivers`,    icon: '🏆' },
      { label: 'F1 TV',              url: 'https://f1tv.formula1.com',                              icon: '📺' },
    ],
  }
}

// Generic placeholder used when the calendar has no future F1 races and when the
// calendar import itself fails — shows no race-specific data to avoid stale info.
function _genericPlaceholder() {
  const year = new Date().getFullYear()
  return {
    series: 'f1', seriesName: 'Formula 1', source: 'fallback',
    lastUpdated: new Date().toISOString(),
    featuredRace: {
      name: 'F1 Grand Prix', track: '', location: '', country: '',
      date: null, raceStart: null, nextSession: null,
      status: 'Upcoming', round: null, season: year,
    },
    track:     { name: '', location: '', lat: null, lon: null, type: 'Grand Prix Circuit' },
    schedule:  [],
    standings: { source: 'unavailable', drivers: [], teams: [] },
    startingGrid: [],
    weather:   { temperature: null, conditions: 'Unavailable', source: 'fallback' },
    talkingPoints: [],
    officialLinks: [
      { label: 'Formula 1 Official', url: 'https://www.formula1.com',                            icon: '🏎️' },
      { label: 'Driver Standings',   url: `https://www.formula1.com/en/results/${year}/drivers`, icon: '🏆' },
      { label: 'F1 TV',              url: 'https://f1tv.formula1.com',                           icon: '📺' },
    ],
  }
}
