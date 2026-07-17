// ESPN public sports API – no API key required
// Used internally by espn.com, publicly accessible.
// Docs: unofficial (espn.com frontend uses these endpoints)

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/racing'

const LEAGUE = {
  'f1':       'f1',
  'nascar':   'nascar-premier',
  'indycar':  'indycar',
  'motogp':   'moto-gp',
  'imsa-wec': 'wec',
}

async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'RaceNRoam/1.0' },
  })
  if (!res.ok) throw new Error(`ESPN ${path} → HTTP ${res.status}`)
  return res.json()
}

// ---------- Scoreboard (next event) ----------

export async function getScoreboard(series) {
  const league = LEAGUE[series]
  if (!league) throw new Error(`ESPN: unknown series "${series}"`)
  return get(`/${league}/scoreboard`)
}

// Find the next upcoming event from a scoreboard response
export function extractNextEvent(scoreboard) {
  const events = scoreboard?.events || []
  if (!events.length) return null
  const now = Date.now()

  // prefer an event not yet completed that is upcoming or very recently started
  const live = events.find(e => e.status?.type?.state === 'in')
  if (live) return live

  const upcoming = events
    .filter(e => !e.status?.type?.completed && new Date(e.date).getTime() > now - 1000 * 60 * 60 * 4)
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  return upcoming[0] || events[events.length - 1] || null
}

// Normalize ESPN event → our featuredRace shape
export function normalizeEvent(event, series) {
  if (!event) return null
  const comp    = event.competitions?.[0]
  const venue   = comp?.venue
  const addr    = venue?.address || {}
  const location = [addr.city, addr.state || addr.country].filter(Boolean).join(', ')

  const stateMap = {
    'STATUS_SCHEDULED':   'Upcoming',
    'STATUS_IN_PROGRESS': 'Live',
    'STATUS_FINAL':       'Completed',
    'STATUS_POSTPONED':   'Delayed',
    'STATUS_CANCELLED':   'Cancelled',
  }
  const espnStatus = event.status?.type?.name || 'STATUS_SCHEDULED'
  const status = stateMap[espnStatus] || 'Upcoming'

  return {
    id:       `${series}-espn-${event.id}`,
    name:     event.name || event.shortName || 'Race',
    track:    venue?.fullName || '',
    location: location || 'TBD',
    country:  addr.country || 'USA',
    date:     comp?.date || event.date,
    status,
    season:   event.season?.year || new Date(event.date).getFullYear(),
    round:    event.week?.number || null,
  }
}

// Normalize ESPN event → schedule sessions (ESPN only has the race date, not practices)
export function normalizeSchedule(event) {
  if (!event) return []
  const date = event.competitions?.[0]?.date || event.date
  return [{ session: 'Race', startTime: date, status: event.status?.type?.name === 'STATUS_FINAL' ? 'Completed' : 'Upcoming' }]
}

// ---------- Standings ----------

export async function getStandings(series) {
  const league = LEAGUE[series]
  if (!league) throw new Error(`ESPN: unknown series "${series}"`)
  return get(`/${league}/standings`, { limit: 30 })
}

// Normalize ESPN standings entries → our drivers array
export function normalizeStandingsEntries(data) {
  if (!data) return []

  // ESPN nests standings inside groups
  const entries =
    data?.standings?.groups?.[0]?.standings?.entries ||
    data?.standings?.entries ||
    []

  return entries.slice(0, 15).map((entry, i) => {
    const findStat = (...names) => {
      for (const n of names) {
        const s = entry.stats?.find(s => s.name === n || s.shortDisplayName?.toLowerCase() === n)
        if (s != null) return s.value
      }
      return null
    }

    const pos   = findStat('rank', 'position') ?? i + 1
    const pts   = findStat('points', 'pts', 'totalPoints')
    const wins  = findStat('wins', 'totalWins')
    const driver  = entry.athlete?.displayName || entry.team?.displayName || `#${i+1}`
    const team    = entry.team?.displayName || entry.athlete?.team?.shortDisplayName || ''
    const color   = entry.team?.color ? `#${entry.team.color}` : null

    return {
      pos:       typeof pos === 'number' ? pos : parseInt(pos, 10) || i + 1,
      driver,
      team,
      pts:       pts != null ? parseFloat(pts) : 0,
      wins:      wins != null ? parseInt(wins, 10) : 0,
      nat:       '',
      teamColor: color,
    }
  }).filter(r => r.driver && r.driver !== '#1' || r.pts > 0)
}

// ---------- High-level: get everything for a series ----------

export async function getSeriesData(series) {
  const [scoreboard, standingsRaw] = await Promise.allSettled([
    getScoreboard(series),
    getStandings(series),
  ])

  const sb       = scoreboard.status === 'fulfilled' ? scoreboard.value : null
  const event    = extractNextEvent(sb)
  const race     = normalizeEvent(event, series)
  const schedule = normalizeSchedule(event)

  const rawStandings = standingsRaw.status === 'fulfilled' ? standingsRaw.value : null
  const drivers      = normalizeStandingsEntries(rawStandings)

  return { featuredRace: race, schedule, standings: { drivers, teams: [] } }
}
