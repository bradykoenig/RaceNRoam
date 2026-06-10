// F1 server-side fallback — no hardcoded race data, fully automatic year-over-year.
// Attempts a lightweight Jolpica re-fetch; returns a generic placeholder if that fails too.

const BASE = 'https://api.jolpi.ca/ergast/f1'

async function tryJolpicaNext() {
  const year = new Date().getFullYear()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${BASE}/${year}.json?limit=30`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const races = data?.MRData?.RaceTable?.Races || []
    const yesterday = Date.now() - 86_400_000
    // Same algorithm as getJolpicaRace in live.js / getNextRace in jolpicaProvider.js
    for (const r of races) {
      const raceMs = new Date(`${r.date}T${r.time || '13:00:00Z'}`).getTime()
      if (Date.now() >= raceMs - 4 * 86_400_000 && Date.now() <= raceMs + 86_400_000) return r
    }
    return races.find(r => new Date(r.date).getTime() >= yesterday) || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
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
    { session: 'Practice 1', startTime: at(fri, 13, 30), status: s(at(fri, 13, 30)) },
    { session: 'Practice 2', startTime: at(fri, 17,  0), status: s(at(fri, 17,  0)) },
    { session: 'Practice 3', startTime: at(sat, 12, 30), status: s(at(sat, 12, 30)) },
    { session: 'Qualifying', startTime: at(sat, 16,  0), status: s(at(sat, 16,  0)) },
    { session: 'Race',       startTime: raceDateStr,     status: s(raceDateStr)      },
  ]
}

function genericLinks(year) {
  return [
    { label: 'Formula 1 Official', url: 'https://www.formula1.com',                        icon: '🏎️' },
    { label: 'Driver Standings',   url: `https://www.formula1.com/en/results/${year}/drivers`, icon: '🏆' },
    { label: 'F1 TV',              url: 'https://f1tv.formula1.com',                       icon: '📺' },
  ]
}

export async function getFallbackF1Data() {
  const year = new Date().getFullYear()
  const race = await tryJolpicaNext()

  if (race) {
    const raceDate = race.date && race.time ? `${race.date}T${race.time}` : race.date
    const schedule = buildApproxSchedule(raceDate)
    const loc      = race.Circuit?.Location || {}
    const location = [loc.locality, loc.country].filter(Boolean).join(', ')

    return {
      series:      'f1',
      seriesName:  'Formula 1',
      featuredRace: {
        id:          `f1-round-${race.round}-${year}`,
        name:        race.raceName      || 'Grand Prix',
        track:       race.Circuit?.circuitName || '',
        location,
        country:     loc.country        || '',
        date:        raceDate,
        raceStart:   raceDate,
        nextSession: schedule.find(s => new Date(s.startTime) > new Date()) || null,
        status:      'Upcoming',
        round:       parseInt(race.round, 10) || null,
        season:      year,
      },
      track: {
        name:     race.Circuit?.circuitName || '',
        location,
        lat:      parseFloat(loc.lat)  || null,
        lon:      parseFloat(loc.long) || null,
        type:     'Grand Prix Circuit',
      },
      schedule,
      standings: { source: 'unavailable', drivers: [], teams: [] },
      weather: {
        temperature: 20, conditions: 'Partly Cloudy',
        windSpeed: '15 km/h', humidity: '55%', rainChance: '10%', source: 'fallback',
      },
      talkingPoints: [],
      officialLinks: genericLinks(year),
    }
  }

  // Ultimate fallback — generic placeholder when Jolpica is completely unreachable
  return {
    series:      'f1',
    seriesName:  'Formula 1',
    featuredRace: {
      name: 'F1 Grand Prix', track: '', location: '', country: '',
      date: null, raceStart: null, nextSession: null,
      status: 'Upcoming', round: null, season: year,
    },
    track:     { name: '', location: '', lat: null, lon: null, type: 'Grand Prix Circuit' },
    schedule:  [],
    standings: { source: 'unavailable', drivers: [], teams: [] },
    weather:   { temperature: null, conditions: 'Unavailable', source: 'fallback' },
    talkingPoints: [],
    officialLinks: genericLinks(year),
  }
}
