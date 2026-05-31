import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { buildOpenF1Snapshot, normalizeWeather, getLatestMeeting } from '../../_lib/providers/f1/openF1Provider.js'
import { getDriverStandings, getConstructorStandings } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getErgastStandings, getErgastConstructorStandings, getErgastNextRace } from '../../_lib/providers/f1/ergastProvider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getCurrentWeather } from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

export async function onRequestGet({ env }) {
  const cacheKey = 'series:f1'
  const cached = await cacheGet(env, cacheKey)
  if (cached) {
    return buildLiveResponse({ ...cached.data, _cacheHit: true }, 'f1', cached.source, 'standings')
  }

  const liveEnabled = env?.ENABLE_LIVE_F1 !== 'false'
  if (!liveEnabled) {
    return buildFallbackResponse(getFallbackF1Data(), 'f1', 'Live F1 disabled via ENABLE_LIVE_F1=false')
  }

  const currentYear = new Date().getFullYear()

  try {
    // Step 1: Get next race from OpenF1 (most reliable for current season)
    let race = null
    let raceSource = null

    try {
      const meeting = await getLatestMeeting()
      if (meeting) {
        // Find the NEXT upcoming meeting, not just closest
        const now = new Date()
        const meetingDate = new Date(meeting.date_start)

        // If meeting is in the past by more than 3 days, get the next one
        const daysDiff = (now - meetingDate) / (1000 * 60 * 60 * 24)

        if (daysDiff < 3) {
          race = {
            round: meeting.meeting_key,
            name: meeting.meeting_name?.replace('Formula 1 ', '').replace(` ${currentYear}`, '') || meeting.meeting_official_name || 'F1 Race',
            circuit: meeting.circuit_short_name || meeting.location || '',
            location: meeting.location || '',
            country: meeting.country_name || '',
            date: meeting.date_start,
            lat: null,
            lon: null,
            sessions: {},
          }
          raceSource = 'openf1'
          console.log('Using OpenF1 meeting:', race.name)
        }
      }
    } catch (err) {
      console.log('OpenF1 meetings error:', err.message)
    }

    // Step 2: If OpenF1 didn't give us a valid upcoming race, try Ergast
    if (!race) {
      try {
        const ergastRace = await getErgastNextRace()
        if (ergastRace && new Date(ergastRace.date).getFullYear() === currentYear) {
          race = ergastRace
          raceSource = 'ergast'
          console.log('Using Ergast race:', race.name)
        }
      } catch (err) {
        console.log('Ergast error:', err.message)
      }
    }

    // Step 3: Get OpenF1 snapshot for weather + live session data
    const of1 = await buildOpenF1Snapshot().catch(() => null)

    // Step 4: Get standings (Jolpica first, then Ergast)
    let drivers = []
    let teams = []

    const [driverStandings, constructorStandings] = await Promise.allSettled([
      getDriverStandings(),
      getConstructorStandings(),
    ])

    drivers = driverStandings.status === 'fulfilled' ? driverStandings.value : []
    teams = constructorStandings.status === 'fulfilled' ? constructorStandings.value : []

    // Validate standings aren't from historical season
    const isOldStandings = drivers.length > 0 && drivers[0]?.team &&
      ['Team Lotus', 'BRM', 'March', 'Tyrrell', 'Brabham-Ford'].includes(drivers[0].team)

    if (isOldStandings || !drivers.length) {
      console.log('Jolpica standings appear old, falling back to Ergast...')
      drivers = await getErgastStandings().catch(() => [])
      teams = await getErgastConstructorStandings().catch(() => [])
    }

    // Step 5: Get weather
    let weather = null
    if (of1?.weather) {
      weather = normalizeWeather(of1.weather)
    } else if (race?.lat && race?.lon) {
      weather = await getCurrentWeather({ lat: race.lat, lon: race.lon }).catch(() => null)
    }
    if (!weather && race?.circuit) {
      weather = getFallbackWeather(race.circuit)
    }

    // Step 6: Build schedule from sessions
    const schedule = race?.sessions ? [
      race.sessions.fp1 && { session: 'Practice 1', startTime: race.sessions.fp1, status: 'Upcoming' },
      race.sessions.fp2 && { session: 'Practice 2', startTime: race.sessions.fp2, status: 'Upcoming' },
      race.sessions.fp3 && { session: 'Practice 3', startTime: race.sessions.fp3, status: 'Upcoming' },
      race.sessions.qualifying && { session: 'Qualifying', startTime: race.sessions.qualifying, status: 'Upcoming' },
      race.sessions.sprint && { session: 'Sprint Race', startTime: race.sessions.sprint, status: 'Upcoming' },
      race.date && { session: 'Race', startTime: race.date, status: 'Upcoming' },
    ].filter(Boolean) : []

    const fb = getFallbackF1Data()

    if (!race) {
      console.log('No race found from any live source, using fallback data')
      return buildFallbackResponse(fb, 'f1', 'All live APIs returned no valid data')
    }

    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id: `f1-${race.circuit?.toLowerCase().replace(/\s+/g, '-') || 'next'}-${currentYear}`,
        name: race.name,
        track: race.circuit,
        location: `${race.location}${race.country ? ', ' + race.country : ''}`,
        country: race.country,
        date: race.date,
        status: 'Upcoming',
        round: race.round,
        season: currentYear,
      },
      track: {
        name: race.circuit,
        location: race.location,
        lat: race.lat,
        lon: race.lon,
        type: 'Grand Prix Circuit',
      },
      schedule: schedule.length ? schedule : fb.schedule,
      standings: {
        drivers: drivers.length ? drivers : fb.standings.drivers,
        teams: teams.length ? teams : fb.standings.teams,
      },
      weather: weather || fb.weather,
      talkingPoints: fb.talkingPoints,
      officialLinks: fb.officialLinks,
    }

    const sources = [raceSource, of1 ? 'openf1' : null].filter(Boolean).join('+')
    const result = { data, source: sources }
    await cacheSet(env, cacheKey, result, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', sources, 'standings')
  } catch (err) {
    const fb = getFallbackF1Data()
    return buildFallbackResponse(fb, 'f1', `Live F1 data fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
