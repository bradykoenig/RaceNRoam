/**
 * GET /api/series/f1
 *
 * Data sources (in priority order):
 *  1. Jolpica /current/ endpoints — authoritative, always current season
 *     - /current/driverstandings/
 *     - /current/constructorstandings/
 *     - /current/ (schedule)
 *  2. OpenF1 /sessions — detailed weekend times only (FP1, FP2, FP3, Quali, Race)
 *     - Never use as source of truth for race dates
 *     - Only enriches Jolpica schedule with precise session times
 *  3. Fallback data — only if both sources fail
 */

import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getCurrentSeasonSchedule, getCurrentDriverStandings, getCurrentConstructorStandings } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getAllSessionsForMeeting, getLatestMeeting, getSessionWeather, normalizeWeather } from '../../_lib/providers/f1/openF1Provider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequestGet({ env }) {
  const cacheKey = 'series:f1'
  const cached = await cacheGet(env, cacheKey)
  if (cached) {
    return buildLiveResponse({ ...cached.data, _cacheHit: true }, 'f1', cached.source, 'standings')
  }

  const fb = getFallbackF1Data()

  try {
    // ── 1. Jolpica — schedule, standings (guaranteed current season) ─────────
    let schedule = []
    let raceStart = null
    let raceName = null
    let raceCircuit = null
    let raceLocation = null
    let raceCountry = null
    let raceRound = null
    let drivers = []
    let teams = []

    const [scheduleRes, driversRes, teamsRes] = await Promise.allSettled([
      getCurrentSeasonSchedule(),
      getCurrentDriverStandings(),
      getCurrentConstructorStandings(),
    ])

    const scheduleData = scheduleRes.status === 'fulfilled' ? scheduleRes.value : []
    drivers = driversRes.status === 'fulfilled' ? driversRes.value : []
    teams = teamsRes.status === 'fulfilled' ? teamsRes.value : []

    // Find the next race (first race in future)
    const now = new Date()
    const nextRaceData = scheduleData.find(r => new Date(r.date) > now)

    if (nextRaceData) {
      raceStart = nextRaceData.date
      raceName = nextRaceData.name
      raceCircuit = nextRaceData.circuit
      raceLocation = nextRaceData.location
      raceCountry = nextRaceData.country
      raceRound = nextRaceData.round

      // Build schedule array from Jolpica
      schedule = [
        nextRaceData.sessions.fp1 && { session: 'Practice 1', startTime: nextRaceData.sessions.fp1, status: new Date(nextRaceData.sessions.fp1) < now ? 'Completed' : 'Upcoming' },
        nextRaceData.sessions.fp2 && { session: 'Practice 2', startTime: nextRaceData.sessions.fp2, status: new Date(nextRaceData.sessions.fp2) < now ? 'Completed' : 'Upcoming' },
        nextRaceData.sessions.fp3 && { session: 'Practice 3', startTime: nextRaceData.sessions.fp3, status: new Date(nextRaceData.sessions.fp3) < now ? 'Completed' : 'Upcoming' },
        nextRaceData.sessions.qualifying && { session: 'Qualifying', startTime: nextRaceData.sessions.qualifying, status: new Date(nextRaceData.sessions.qualifying) < now ? 'Completed' : 'Upcoming' },
        nextRaceData.sessions.sprint && { session: 'Sprint Race', startTime: nextRaceData.sessions.sprint, status: new Date(nextRaceData.sessions.sprint) < now ? 'Completed' : 'Upcoming' },
        { session: 'Race', startTime: raceStart, status: new Date(raceStart) < now ? 'Completed' : 'Upcoming' },
      ].filter(Boolean)

      console.log(`[f1] Jolpica: ${raceName} on ${raceStart}, standings: ${drivers.length} drivers, ${teams.length} teams`)
    }

    // ── 2. OpenF1 — weather only (live data, no schedule authority) ──────────
    let weather = null
    try {
      const meeting = await getLatestMeeting()
      if (meeting && nextRaceData && meeting.circuit_short_name === raceCircuit) {
        // Only use if it matches the Jolpica race
        const sessions = await getAllSessionsForMeeting(meeting.meeting_key)
        if (sessions.length > 0) {
          const latestSession = sessions[sessions.length - 1]
          const rawWeather = await getSessionWeather(latestSession.session_key).catch(() => null)
          weather = normalizeWeather(rawWeather)
        }
      }
    } catch (err) {
      console.error('[f1] OpenF1 weather error:', err.message)
    }

    // ── 3. Fallback weather ──────────────────────────────────────────────────
    if (!weather) weather = getFallbackWeather(raceCircuit || '')

    // ── 4. Bail if no race found ─────────────────────────────────────────────
    if (!raceStart || !raceName) {
      console.warn('[f1] No future race found in Jolpica schedule')
      return buildFallbackResponse(fb, 'f1', 'No upcoming races in current season')
    }

    // ── 5. Build response ────────────────────────────────────────────────────
    const year = new Date().getFullYear()
    const data = {
      series: 'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id: `f1-${(raceCircuit || 'race').toLowerCase().replace(/\s+/g, '-')}-${year}`,
        name: raceName,
        track: raceCircuit || '',
        location: raceLocation || '',
        country: raceCountry || '',
        date: raceStart,
        raceStart,
        status: 'Upcoming',
        round: raceRound,
        season: year,
      },
      track: {
        name: raceCircuit || '',
        location: raceLocation || '',
        lat: nextRaceData?.lat || null,
        lon: nextRaceData?.lon || null,
        type: 'Grand Prix Circuit',
      },
      schedule: schedule.length ? schedule : fb.schedule,
      standings: {
        drivers: drivers.length > 0 ? drivers : fb.standings.drivers,
        teams: teams.length > 0 ? teams : fb.standings.teams,
      },
      weather: weather || fb.weather,
      talkingPoints: [], // Removed — use only reliable data
      officialLinks: fb.officialLinks,
    }

    await cacheSet(env, cacheKey, { data, source: 'jolpica+openf1' }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', 'jolpica+openf1', 'standings')

  } catch (err) {
    console.error('[f1] Unhandled error:', err)
    return buildFallbackResponse(fb, 'f1', `F1 fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
