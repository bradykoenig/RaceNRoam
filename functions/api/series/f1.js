/**
 * GET /api/series/f1
 *
 * STRICT API-ONLY approach:
 * - All data must come from reliable live APIs
 * - NO hardcoded fallback data
 * - NO fake standings
 * - NO talking points
 * - NO demo race data
 *
 * Primary sources:
 *  1. Jolpica /current/ endpoints (current season data)
 *  2. OpenF1 /sessions (session details, live timing)
 *
 * If an API fails, the section is removed/hidden.
 * No fake data is shown.
 */

import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getNextRace, getDriverStandings, getConstructorStandings, getCurrentSeasonSchedule } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getAllSessionsForMeeting, getLatestMeeting, getSessionWeather, normalizeWeather } from '../../_lib/providers/f1/openF1Provider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

export async function onRequestGet({ env }) {
  const cacheKey = 'series:f1'
  const cached = await cacheGet(env, cacheKey)
  if (cached) {
    return buildLiveResponse({ ...cached.data, _cacheHit: true }, 'f1', cached.source, 'standings')
  }

  try {
    // Fetch all data in parallel
    const [scheduleRes, driversRes, teamsRes] = await Promise.allSettled([
      getCurrentSeasonSchedule(),
      getDriverStandings(),
      getConstructorStandings(),
    ])

    // Extract results
    const schedule = scheduleRes.status === 'fulfilled' ? scheduleRes.value : []
    const drivers = driversRes.status === 'fulfilled' ? driversRes.value : []
    const teams = teamsRes.status === 'fulfilled' ? teamsRes.value : []

    // Find next race by comparing dates
    const now = new Date()
    const nextRaceData = schedule.find(r => new Date(r.date) > now)

    // If no next race found, return error state
    if (!nextRaceData || !nextRaceData.name) {
      const fb = getFallbackF1Data()
      return buildFallbackResponse(fb, 'f1', 'No upcoming F1 races found in current season')
    }

    // Build schedule array from Jolpica sessions
    const scheduleArray = [
      nextRaceData.sessions?.fp1 && { session: 'Practice 1', startTime: nextRaceData.sessions.fp1, status: new Date(nextRaceData.sessions.fp1) < now ? 'Completed' : 'Upcoming' },
      nextRaceData.sessions?.fp2 && { session: 'Practice 2', startTime: nextRaceData.sessions.fp2, status: new Date(nextRaceData.sessions.fp2) < now ? 'Completed' : 'Upcoming' },
      nextRaceData.sessions?.fp3 && { session: 'Practice 3', startTime: nextRaceData.sessions.fp3, status: new Date(nextRaceData.sessions.fp3) < now ? 'Completed' : 'Upcoming' },
      nextRaceData.sessions?.qualifying && { session: 'Qualifying', startTime: nextRaceData.sessions.qualifying, status: new Date(nextRaceData.sessions.qualifying) < now ? 'Completed' : 'Upcoming' },
      nextRaceData.sessions?.sprint && { session: 'Sprint Race', startTime: nextRaceData.sessions.sprint, status: new Date(nextRaceData.sessions.sprint) < now ? 'Completed' : 'Upcoming' },
      { session: 'Race', startTime: nextRaceData.date, status: new Date(nextRaceData.date) < now ? 'Completed' : 'Upcoming' },
    ].filter(Boolean)

    // Attempt OpenF1 weather enrichment
    let weather = null
    try {
      const meeting = await getLatestMeeting()
      if (meeting && meeting.circuit_short_name === nextRaceData.circuit) {
        const sessions = await getAllSessionsForMeeting(meeting.meeting_key)
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1]
          const rawWeather = await getSessionWeather(latestSession.session_key).catch(() => null)
          weather = normalizeWeather(rawWeather)
        }
      }
    } catch (err) {
      console.error('[f1] OpenF1 weather failed:', err.message)
    }

    // Build response
    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id: `f1-${(nextRaceData.circuit || 'race').toLowerCase().replace(/\s+/g, '-')}-${new Date().getFullYear()}`,
        name: nextRaceData.name,
        track: nextRaceData.circuit || '',
        location: nextRaceData.location || '',
        country: nextRaceData.country || '',
        date: nextRaceData.date,
        raceStart: nextRaceData.date,
        status: new Date(nextRaceData.date) < now ? 'Completed' : 'Upcoming',
        round: nextRaceData.round,
        season: new Date().getFullYear(),
      },
      track: {
        name: nextRaceData.circuit || '',
        location: nextRaceData.location || '',
        lat: nextRaceData.lat || null,
        lon: nextRaceData.lon || null,
        type: 'Grand Prix Circuit',
      },
      schedule: scheduleArray,
      standings: {
        drivers: drivers.length > 0 ? drivers : [],
        teams: teams.length > 0 ? teams : [],
      },
      weather: weather || null,
      talkingPoints: [], // Explicitly empty - no fake data
      officialLinks: [
        { label: 'Formula 1 Official', url: 'https://www.formula1.com', icon: '🏎️' },
        { label: 'Driver Standings', url: 'https://www.formula1.com/en/results/drivers', icon: '🏆' },
        { label: 'F1 TV', url: 'https://f1tv.formula1.com', icon: '📺' },
      ],
      _source: {
        schedule: 'Jolpica /current/',
        standings: drivers.length > 0 ? 'Jolpica /current/driverstandings/' : 'unavailable',
        weather: weather ? 'OpenF1' : 'unavailable',
      },
    }

    await cacheSet(env, cacheKey, { data, source: 'jolpica' }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', 'jolpica', 'standings')

  } catch (err) {
    console.error('[f1] Critical error:', err)
    const fb = getFallbackF1Data()
    return buildFallbackResponse(fb, 'f1', `F1 API error: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
