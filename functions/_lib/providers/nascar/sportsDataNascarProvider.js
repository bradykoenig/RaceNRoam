// SportsData.io NASCAR API adapter
// Docs: https://sportsdata.io/developers/api-documentation/nascar
// Requires: SPORTSDATA_IO_API_KEY environment variable
// Set ENABLE_LIVE_NASCAR=true to activate

const BASE = 'https://api.sportsdata.io/v2/nascar'

export async function isEnabled(env) {
  return env?.ENABLE_LIVE_NASCAR === 'true' && !!env?.SPORTSDATA_IO_API_KEY
}

async function get(env, path) {
  const apiKey = env.SPORTSDATA_IO_API_KEY
  const url    = `${BASE}${path}?key=${apiKey}`
  const res    = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`SportsData.io NASCAR ${path} → HTTP ${res.status}`)
  return res.json()
}

// Real SportsData.io endpoints (verify exact paths in their API docs)
export async function getDrivers(env) {
  // GET /stats/json/Drivers
  return get(env, '/stats/json/Drivers')
}

export async function getRaces(env, season = new Date().getFullYear()) {
  // GET /scores/json/Races/{season}
  return get(env, `/scores/json/Races/${season}`)
}

export async function getDriverStandings(env, season = new Date().getFullYear()) {
  // GET /scores/json/DriverStandings/{season}
  return get(env, `/scores/json/DriverStandings/${season}`)
}

export async function getDriverPointsFinishes(env, driverId) {
  // GET /stats/json/DriverPointsFinishes/{driverId}
  return get(env, `/stats/json/DriverPointsFinishes/${driverId}`)
}

// Normalize SportsData.io race list to our data model
export function normalizeRace(race) {
  if (!race) return null
  return {
    id:       `nascar-${race.RaceID || race.RaceName?.toLowerCase().replace(/\s+/g,'-')}`,
    name:     race.RaceName,
    track:    race.Track,
    location: race.Track,
    date:     race.DateTimeUTC || race.Date,
    status:   race.Status || 'Upcoming',
    round:    race.Week,
    season:   race.Season,
  }
}

// Normalize SportsData.io standings to our data model
export function normalizeStandings(list = []) {
  return list.map((s, i) => ({
    pos:    s.PointsRank || i + 1,
    driver: s.Name || `${s.FirstName} ${s.LastName}`,
    team:   s.Manufacturer || s.Team,
    pts:    s.Points,
    wins:   s.Wins,
  }))
}
