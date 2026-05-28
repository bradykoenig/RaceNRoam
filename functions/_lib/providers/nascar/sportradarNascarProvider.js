// Sportradar NASCAR API adapter
// Docs: https://developer.sportradar.com/nascar/reference
// Requires: SPORTSRADAR_API_KEY environment variable
// Set ENABLE_LIVE_NASCAR=true to activate

// TODO: Replace placeholder endpoint paths with actual Sportradar NASCAR API paths once
// you have a subscription. Base URL and endpoint structure below are illustrative.
// Contact: https://developer.sportradar.com/

const BASE = 'https://api.sportradar.us/nascar-ot3/en/us'

export async function isEnabled(env) {
  return env?.ENABLE_LIVE_NASCAR === 'true' && !!env?.SPORTSRADAR_API_KEY
}

async function get(env, path) {
  const apiKey = env.SPORTSRADAR_API_KEY
  const url    = `${BASE}${path}?api_key=${apiKey}`
  const res    = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Sportradar NASCAR ${path} → HTTP ${res.status}`)
  return res.json()
}

// TODO: Verify actual endpoint paths from Sportradar NASCAR API documentation
export async function getSchedule(env) {
  // Example: GET /series/cup/2026/races/schedule.json
  throw new Error('Sportradar NASCAR: endpoint paths require verification from API docs')
}

export async function getStandings(env) {
  // Example: GET /series/cup/2026/standings/drivers.json
  throw new Error('Sportradar NASCAR: endpoint paths require verification from API docs')
}

export async function getNextRace(env) {
  // Example: GET /series/cup/2026/races/upcoming.json
  throw new Error('Sportradar NASCAR: endpoint paths require verification from API docs')
}

export async function getRaceResults(env, raceId) {
  // Example: GET /series/cup/2026/races/{race_id}/results.json
  throw new Error('Sportradar NASCAR: endpoint paths require verification from API docs')
}
