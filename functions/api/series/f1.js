import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { buildOpenF1Snapshot, normalizeWeather } from '../../_lib/providers/f1/openF1Provider.js'
import {
  getNextRace, getDriverStandings, getConstructorStandings, getCurrentSeasonSchedule,
} from '../../_lib/providers/f1/jolpicaProvider.js'
import { getErgastNextRace, getErgastStandings, getErgastConstructorStandings } from '../../_lib/providers/f1/ergastProvider.js'
import { getF1ApiNextRace, getF1CurrentSeason } from '../../_lib/providers/f1/f1ApiProvider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getCurrentWeather }  from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

export async function onRequestGet({ env }) {
  const cacheKey = 'series:f1'
  const cached   = await cacheGet(env, cacheKey)
  if (cached) {
    return buildLiveResponse({ ...cached.data, _cacheHit: true }, 'f1', cached.source, 'standings')
  }

  const liveEnabled = env?.ENABLE_LIVE_F1 !== 'false'

  if (!liveEnabled) {
    return buildFallbackResponse(getFallbackF1Data(), 'f1', 'Live F1 disabled via ENABLE_LIVE_F1=false')
  }

  try {
    // Fetch Jolpica data + OpenF1 in parallel
    const [nextRace, driverStandings, constructorStandings, openF1] = await Promise.allSettled([
      getNextRace(),
      getDriverStandings(),
      getConstructorStandings(),
      buildOpenF1Snapshot(),
    ])

    let race     = nextRace.status === 'fulfilled' ? nextRace.value : null
    let drivers  = driverStandings.status === 'fulfilled' ? driverStandings.value : []
    let teams    = constructorStandings.status === 'fulfilled' ? constructorStandings.value : []
    const of1    = openF1.status === 'fulfilled' ? openF1.value : null

    // Fallback to Ergast if Jolpica fails
    if (!race || !drivers.length || !teams.length) {
      console.log('Falling back to Ergast API...')
      if (!race) race = await getErgastNextRace()
      if (!drivers.length) drivers = await getErgastStandings()
      if (!teams.length) teams = await getErgastConstructorStandings()
    }

    // Fallback to F1ApiProvider (hardcoded current season) if needed
    if (!race) {
      console.log('Falling back to hardcoded F1 current season...')
      race = getF1CurrentSeason()
    }

    if (!race && !drivers.length) throw new Error('All F1 data sources failed')

    // Get weather for the circuit if we have coordinates
    let weather = null
    if (race?.lat && race?.lon) {
      try {
        weather = of1?.weather
          ? normalizeWeather(of1.weather)
          : await getCurrentWeather({ lat: race.lat, lon: race.lon })
      } catch {
        weather = getFallbackWeather(race.circuit || '')
      }
    }

    // Build schedule from sessions
    const schedule = race ? [
      race.sessions.fp1  && { session: 'Practice 1', startTime: race.sessions.fp1,  status: 'Upcoming' },
      race.sessions.fp2  && { session: 'Practice 2', startTime: race.sessions.fp2,  status: 'Upcoming' },
      race.sessions.fp3  && { session: 'Practice 3', startTime: race.sessions.fp3,  status: 'Upcoming' },
      race.sessions.qualifying && { session: 'Qualifying', startTime: race.sessions.qualifying, status: 'Upcoming' },
      race.sessions.sprint     && { session: 'Sprint Race', startTime: race.sessions.sprint,    status: 'Upcoming' },
      { session: 'Race', startTime: race.date, status: 'Upcoming' },
    ].filter(Boolean) : []

    const fb = getFallbackF1Data()
    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: race ? {
        id:       `f1-${race.circuit?.toLowerCase().replace(/\s+/g,'-') || 'next'}-${new Date().getFullYear()}`,
        name:     race.name,
        track:    race.circuit,
        location: race.location,
        country:  race.country,
        date:     race.date,
        status:   'Upcoming',
        round:    race.round,
        season:   new Date().getFullYear(),
      } : fb.featuredRace,
      track: race ? {
        name: race.circuit,
        location: race.location,
        lat: race.lat, lon: race.lon,
        type: 'Grand Prix Circuit',
      } : fb.track,
      schedule:   schedule.length  ? schedule  : fb.schedule,
      standings:  { drivers: drivers.length ? drivers : fb.standings.drivers, teams: teams.length ? teams : fb.standings.teams },
      weather:    weather || fb.weather,
      talkingPoints: fb.talkingPoints,
      officialLinks: fb.officialLinks,
    }

    const sources = ['jolpica', of1 ? 'openf1' : null].filter(Boolean).join('+')
    const result = { data, source: sources }
    await cacheSet(env, cacheKey, result, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', sources, 'standings')
  } catch (err) {
    const fb = getFallbackF1Data()
    return buildFallbackResponse(fb, 'f1', `Live F1 data fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
