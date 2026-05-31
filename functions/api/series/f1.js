// F1 series endpoint
// Schedule/next race: ESPN API (reliable, no rate limits, always correct, auto-updates every year)
// Live timing:        OpenF1 (official F1 timing data during sessions)
// Standings:          Jolpica → ESPN fallback

import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { buildOpenF1Snapshot, normalizeWeather, getAllSessionsForMeeting, getLatestMeeting, getSessionWeather } from '../../_lib/providers/f1/openF1Provider.js'
import { getDriverStandings, getConstructorStandings } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getScoreboard, extractNextEvent, normalizeEvent } from '../../_lib/providers/espn/espnProvider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getCurrentWeather } from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

function isValidStandings(drivers) {
  if (!drivers?.length) return false
  const oldTeams = ['Team Lotus', 'BRM', 'March', 'Tyrrell', 'Brabham', 'Matra', 'Surtees']
  return !oldTeams.some(t => drivers[0]?.team?.includes(t))
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
    // ── Step 1: ESPN for next race schedule (reliable, no rate limits, always current) ──
    let race = null
    let schedule = []
    let espnSource = false

    try {
      const scoreboard = await getScoreboard('f1')
      const event = extractNextEvent(scoreboard)
      if (event) {
        const normalized = normalizeEvent(event, 'f1')
        if (normalized) {
          race = {
            round:    normalized.round,
            name:     normalized.name,
            circuit:  normalized.track,
            location: normalized.location,
            country:  normalized.country,
            date:     normalized.date,
            lat:      null,
            lon:      null,
            sessions: {},
          }
          schedule = [{ session: 'Race', startTime: normalized.date, status: normalized.status }]
          espnSource = true
          console.log(`ESPN F1 next race: ${race.name} on ${race.date}`)
        }
      }
    } catch (err) {
      console.error('ESPN F1 error:', err.message)
    }

    // ── Step 2: OpenF1 for full weekend session schedule (FP1/FP2/FP3/Quali/Race) ──
    let of1Snapshot = null
    try {
      const meeting = await getLatestMeeting()
      if (meeting) {
        const meetingSessions = await getAllSessionsForMeeting(meeting.meeting_key)
        if (meetingSessions.length > 0) {
          // Build full session schedule from OpenF1
          const of1Schedule = meetingSessions.map(s => ({
            session:   s.session_name || s.session_type || 'Session',
            startTime: s.date_start,
            endTime:   s.date_end,
            status:    new Date(s.date_end) < new Date() ? 'Completed' : 'Upcoming',
          }))

          // If ESPN gave us the race name but OpenF1 has better session data, merge them
          if (of1Schedule.length > 1) {
            schedule = of1Schedule
          }

          // If ESPN failed, use OpenF1 for race name too
          if (!race) {
            const raceSession = meetingSessions.find(s =>
              s.session_name?.toLowerCase() === 'race' ||
              s.session_type?.toLowerCase() === 'race'
            )
            race = {
              round:    meeting.meeting_key,
              name:     (meeting.meeting_official_name || meeting.meeting_name || 'F1 Race')
                          .replace(/^Formula 1\s+/i, '').replace(/\s+\d{4}$/, '').trim(),
              circuit:  meeting.circuit_short_name || meeting.location || '',
              location: meeting.location || '',
              country:  meeting.country_name || '',
              date:     raceSession?.date_start || meeting.date_start,
              lat:      null, lon: null, sessions: {},
            }
          }

          // Get weather from latest session
          const latestSession = meetingSessions[meetingSessions.length - 1]
          const rawWeather = await getSessionWeather(latestSession.session_key).catch(() => null)
          of1Snapshot = { weather: rawWeather }
        }
      }
    } catch (err) {
      console.error('OpenF1 session error:', err.message)
    }

    // ── Step 3: Standings (Jolpica → fallback) ──
    let drivers = []
    let teams = []
    const [jolpicaDrivers, jolpicaTeams] = await Promise.allSettled([
      getDriverStandings(),
      getConstructorStandings(),
    ])
    drivers = jolpicaDrivers.status === 'fulfilled' ? jolpicaDrivers.value : []
    teams   = jolpicaTeams.status === 'fulfilled' ? jolpicaTeams.value : []

    if (!isValidStandings(drivers)) {
      drivers = fb.standings.drivers
      teams   = fb.standings.teams
    }

    // ── Step 4: Weather ──
    let weather = of1Snapshot?.weather ? normalizeWeather(of1Snapshot.weather) : null
    if (!weather && race?.lat && race?.lon) {
      weather = await getCurrentWeather({ lat: race.lat, lon: race.lon }).catch(() => null)
    }
    if (!weather) weather = getFallbackWeather(race?.circuit || '')

    if (!race) {
      return buildFallbackResponse(fb, 'f1', 'No F1 data from ESPN or OpenF1')
    }

    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id:       `f1-${(race.circuit || 'race').toLowerCase().replace(/\s+/g, '-')}-${year}`,
        name:     race.name,
        track:    race.circuit,
        location: race.location,
        country:  race.country,
        date:     race.date,
        status:   'Upcoming',
        round:    race.round,
        season:   year,
      },
      track: {
        name:     race.circuit,
        location: race.location,
        lat:      race.lat,
        lon:      race.lon,
        type:     'Grand Prix Circuit',
      },
      schedule:  schedule.length ? schedule : fb.schedule,
      standings: {
        drivers: isValidStandings(drivers) ? drivers : fb.standings.drivers,
        teams:   teams.length ? teams : fb.standings.teams,
      },
      weather:       weather || fb.weather,
      talkingPoints: fb.talkingPoints,
      officialLinks: fb.officialLinks,
    }

    const sources = [espnSource ? 'espn' : 'openf1', of1Snapshot ? 'openf1' : null].filter(Boolean).join('+')
    await cacheSet(env, cacheKey, { data, source: sources }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', sources, 'standings')

  } catch (err) {
    console.error('F1 endpoint error:', err)
    return buildFallbackResponse(fb, 'f1', `F1 fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
