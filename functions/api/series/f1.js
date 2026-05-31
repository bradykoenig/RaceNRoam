// F1 series endpoint
// Schedule: OpenF1 (official F1 timing data — always correct)
// Standings: Jolpica → Ergast fallback
// Live data: OpenF1

import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getLatestMeeting, getAllSessionsForMeeting, getSessionWeather, normalizeWeather } from '../../_lib/providers/f1/openF1Provider.js'
import { getDriverStandings, getConstructorStandings } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getErgastStandings, getErgastConstructorStandings } from '../../_lib/providers/f1/ergastProvider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getCurrentWeather } from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

function isValidStandings(drivers) {
  if (!drivers?.length) return false
  const oldTeams = ['Team Lotus', 'BRM', 'March', 'Tyrrell', 'Brabham', 'Matra', 'Surtees']
  return !oldTeams.some(t => drivers[0]?.team?.includes(t))
}

function cleanMeetingName(name, year) {
  if (!name) return 'F1 Race'
  return name
    .replace(/^Formula 1\s+/i, '')
    .replace(/\s+\d{4}$/, '')
    .replace(/Pirelli\s+/i, '')
    .replace(/AWS\s+/i, '')
    .replace(/Aramco\s+/i, '')
    .replace(/MSC Cruises\s+/i, '')
    .trim()
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

  const year = new Date().getFullYear()
  const fb = getFallbackF1Data()

  try {
    // ── Step 1: Get next race from OpenF1 (official F1 data, always correct) ──
    let race = null
    let sessions = []
    let weather = null

    try {
      const meeting = await getLatestMeeting()
      if (meeting) {
        const raceName = cleanMeetingName(meeting.meeting_official_name || meeting.meeting_name, year)
        const meetingSessions = await getAllSessionsForMeeting(meeting.meeting_key)

        // Find race session for the main date
        const raceSession = meetingSessions.find(s =>
          s.session_name?.toLowerCase() === 'race' ||
          s.session_type?.toLowerCase() === 'race'
        )

        race = {
          round: meeting.meeting_key,
          name: raceName,
          circuit: meeting.circuit_short_name || meeting.location || '',
          location: meeting.location || '',
          country: meeting.country_name || '',
          date: raceSession?.date_start || meeting.date_start,
          lat: null,
          lon: null,
        }

        // Build schedule from OpenF1 sessions
        sessions = meetingSessions.map(s => ({
          session: s.session_name || s.session_type || 'Session',
          startTime: s.date_start,
          endTime: s.date_end,
          status: new Date(s.date_end) < new Date() ? 'Completed' : 'Upcoming',
        }))

        // Get weather from the most recent session
        if (meetingSessions.length > 0) {
          const latestSession = meetingSessions[meetingSessions.length - 1]
          const rawWeather = await getSessionWeather(latestSession.session_key).catch(() => null)
          weather = normalizeWeather(rawWeather)
        }

        console.log(`OpenF1 next race: ${race.name} (${race.date})`)
      }
    } catch (err) {
      console.error('OpenF1 meeting fetch error:', err.message)
    }

    // ── Step 2: Get weather from coordinates if not from OpenF1 ──
    if (!weather && race?.lat && race?.lon) {
      weather = await getCurrentWeather({ lat: race.lat, lon: race.lon }).catch(() => null)
    }
    if (!weather) weather = getFallbackWeather(race?.circuit || '')

    // ── Step 3: Get standings (Jolpica → Ergast fallback) ──
    let drivers = []
    let teams = []

    const [jolpicaDrivers, jolpicaTeams] = await Promise.allSettled([
      getDriverStandings(),
      getConstructorStandings(),
    ])

    drivers = jolpicaDrivers.status === 'fulfilled' ? jolpicaDrivers.value : []
    teams   = jolpicaTeams.status === 'fulfilled' ? jolpicaTeams.value : []

    if (!isValidStandings(drivers)) {
      console.log('Jolpica standings invalid, trying Ergast...')
      drivers = await getErgastStandings().catch(() => [])
      teams   = await getErgastConstructorStandings().catch(() => [])
    }

    // ── Step 4: Build response ──
    if (!race) {
      console.log('OpenF1 returned no meeting, using fallback')
      return buildFallbackResponse(fb, 'f1', 'OpenF1 returned no meeting data')
    }

    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id:      `f1-${race.circuit?.toLowerCase().replace(/\s+/g, '-') || 'next'}-${year}`,
        name:    race.name,
        track:   race.circuit,
        location: `${race.location}${race.country ? `, ${race.country}` : ''}`,
        country: race.country,
        date:    race.date,
        status:  'Upcoming',
        round:   race.round,
        season:  year,
      },
      track: {
        name:     race.circuit,
        location: race.location,
        lat:      race.lat,
        lon:      race.lon,
        type:     'Grand Prix Circuit',
      },
      schedule:  sessions.length ? sessions : fb.schedule,
      standings: {
        drivers: isValidStandings(drivers) ? drivers : fb.standings.drivers,
        teams:   teams.length ? teams : fb.standings.teams,
      },
      weather:       weather || fb.weather,
      talkingPoints: fb.talkingPoints,
      officialLinks: fb.officialLinks,
    }

    await cacheSet(env, cacheKey, { data, source: 'openf1' }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', 'openf1', 'standings')

  } catch (err) {
    console.error('F1 endpoint error:', err.message)
    return buildFallbackResponse(fb, 'f1', `F1 fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
