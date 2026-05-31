import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { buildOpenF1Snapshot, normalizeWeather } from '../../_lib/providers/f1/openF1Provider.js'
import { getNextRace, getDriverStandings, getConstructorStandings } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getErgastNextRace, getErgastStandings, getErgastConstructorStandings } from '../../_lib/providers/f1/ergastProvider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getCurrentWeather } from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

const CURRENT_YEAR = new Date().getFullYear()

function isValidRace(race) {
  if (!race?.date || !race?.name) return false
  const year = new Date(race.date).getFullYear()
  return year >= CURRENT_YEAR
}

function isValidStandings(drivers) {
  if (!drivers?.length) return false
  // Reject historical drivers (1970s teams)
  const oldTeams = ['Team Lotus', 'BRM', 'March', 'Tyrrell', 'Brabham-Ford', 'Matra', 'Surtees']
  return !oldTeams.includes(drivers[0]?.team)
}

export async function onRequestGet({ env }) {
  const cacheKey = 'series:f1'
  const cached = await cacheGet(env, cacheKey)
  if (cached) {
    return buildLiveResponse({ ...cached.data, _cacheHit: true }, 'f1', cached.source, 'standings')
  }

  const liveEnabled = env?.ENABLE_LIVE_F1 !== 'false'
  if (!liveEnabled) {
    return buildFallbackResponse(getFallbackF1Data(), 'f1', 'Live F1 disabled')
  }

  try {
    // Fetch all sources in parallel
    const [jolpicaNext, jolpicaDrivers, jolpicaTeams, of1] = await Promise.allSettled([
      getNextRace(),         // Uses /next endpoint — always returns actual next race
      getDriverStandings(),
      getConstructorStandings(),
      buildOpenF1Snapshot(),
    ])

    let race    = jolpicaNext.status === 'fulfilled' ? jolpicaNext.value : null
    let drivers = jolpicaDrivers.status === 'fulfilled' ? jolpicaDrivers.value : []
    let teams   = jolpicaTeams.status === 'fulfilled' ? jolpicaTeams.value : []
    const of1v  = of1.status === 'fulfilled' ? of1.value : null

    // Validate race data is current season
    if (!isValidRace(race)) {
      console.log(`Jolpica /next returned bad data (${race?.date}), trying Ergast...`)
      race = await getErgastNextRace().catch(() => null)
    }

    // Validate standings are current season
    if (!isValidStandings(drivers)) {
      console.log('Jolpica standings are historical, trying Ergast...')
      drivers = await getErgastStandings().catch(() => [])
      teams   = await getErgastConstructorStandings().catch(() => [])
    }

    // Get weather
    let weather = of1v?.weather ? normalizeWeather(of1v.weather) : null
    if (!weather && race?.lat && race?.lon) {
      weather = await getCurrentWeather({ lat: race.lat, lon: race.lon }).catch(() => null)
    }
    if (!weather) weather = getFallbackWeather(race?.circuit || '')

    // Build schedule
    const schedule = race?.sessions ? [
      race.sessions.fp1        && { session: 'Practice 1',  startTime: race.sessions.fp1,        status: 'Upcoming' },
      race.sessions.fp2        && { session: 'Practice 2',  startTime: race.sessions.fp2,        status: 'Upcoming' },
      race.sessions.fp3        && { session: 'Practice 3',  startTime: race.sessions.fp3,        status: 'Upcoming' },
      race.sessions.qualifying && { session: 'Qualifying',  startTime: race.sessions.qualifying, status: 'Upcoming' },
      race.sessions.sprint     && { session: 'Sprint Race', startTime: race.sessions.sprint,     status: 'Upcoming' },
      race.date                && { session: 'Race',        startTime: race.date,                status: 'Upcoming' },
    ].filter(Boolean) : []

    const fb = getFallbackF1Data()

    if (!race) {
      return buildFallbackResponse(fb, 'f1', 'No valid race data from any source')
    }

    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id:       `f1-${(race.circuit || 'race').toLowerCase().replace(/\s+/g, '-')}-${CURRENT_YEAR}`,
        name:     race.name,
        track:    race.circuit,
        location: race.location,
        country:  race.country,
        date:     race.date,
        status:   'Upcoming',
        round:    race.round,
        season:   CURRENT_YEAR,
      },
      track: {
        name:     race.circuit,
        location: race.location,
        lat:      race.lat,
        lon:      race.lon,
        type:     'Grand Prix Circuit',
      },
      schedule:   schedule.length  ? schedule  : fb.schedule,
      standings:  {
        drivers: isValidStandings(drivers) ? drivers : fb.standings.drivers,
        teams:   teams.length ? teams : fb.standings.teams,
      },
      weather:    weather || fb.weather,
      talkingPoints: fb.talkingPoints,
      officialLinks: fb.officialLinks,
    }

    const sources = ['jolpica', of1v ? 'openf1' : null].filter(Boolean).join('+')
    await cacheSet(env, cacheKey, { data, source: sources }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', sources, 'standings')

  } catch (err) {
    return buildFallbackResponse(getFallbackF1Data(), 'f1', `F1 fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
