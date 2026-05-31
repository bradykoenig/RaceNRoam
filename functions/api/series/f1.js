/**
 * GET /api/series/f1
 *
 * Source priority (per spec):
 *  1. Jolpica /next  → authoritative race calendar: name, circuit, official race date/time,
 *                       FP1/FP2/FP3/Qualifying/Sprint session dates
 *  2. OpenF1 /sessions → session schedule enrichment (more precise times, sprint quali, etc.)
 *                        NEVER use the first session as the race date.
 *  3. ESPN             → fallback for race name / enrichment only, never for race date
 *
 * raceStart  = Jolpica race.date (Sunday race)  — used for "Countdown to Race"
 * nextSession = first future session              — used for "Countdown to Next Session"
 */

import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getAllSessionsForMeeting, getLatestMeeting, getSessionWeather, normalizeWeather } from '../../_lib/providers/f1/openF1Provider.js'
import { getNextRace, getDriverStandings, getConstructorStandings } from '../../_lib/providers/f1/jolpicaProvider.js'
import { getScoreboard, extractNextEvent, normalizeEvent, getStandings, normalizeStandingsEntries } from '../../_lib/providers/espn/espnProvider.js'
import { getFallbackF1Data } from '../../_lib/providers/f1/f1FallbackProvider.js'
import { getCurrentWeather } from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

const CURRENT_YEAR = new Date().getFullYear()

// ── Validation helpers ────────────────────────────────────────────────────────

function isCurrentYear(dateStr) {
  if (!dateStr) return false
  const y = new Date(dateStr).getFullYear()
  return y === CURRENT_YEAR || y === CURRENT_YEAR + 1
}

function isValidStandings(drivers) {
  if (!drivers?.length) return false
  const historical = ['Team Lotus', 'BRM', 'March', 'Tyrrell', 'Brabham', 'Matra', 'Surtees']
  return !historical.some(t => drivers[0]?.team?.includes(t))
}

// ── Build session schedule array (sorted, typed) ──────────────────────────────

/**
 * Build a normalized session schedule from OpenF1 sessions.
 * Sorts by date, never assumes first = Race.
 * Returns { schedule, raceSession, nextSession }
 */
function parseOpenF1Sessions(sessions) {
  const sorted = [...sessions].sort((a, b) =>
    new Date(a.date_start) - new Date(b.date_start)
  )

  const now = new Date()

  const schedule = sorted.map(s => {
    const end    = new Date(s.date_end)
    const start  = new Date(s.date_start)
    return {
      session:   s.session_name || s.session_type || 'Session',
      startTime: s.date_start,
      endTime:   s.date_end,
      status:    end < now ? 'Completed' : start <= now ? 'Live' : 'Upcoming',
    }
  })

  // Authoritative race session — must explicitly be named/typed "Race"
  const raceSession = sorted.find(s =>
    s.session_name?.toLowerCase() === 'race' ||
    s.session_type?.toLowerCase() === 'race'
  ) ?? null

  // Next upcoming session (any type)
  const nextSession = sorted.find(s => new Date(s.date_end) > now) ?? null

  return { schedule, raceSession, nextSession }
}

/**
 * Build session schedule from Jolpica sessions object.
 * Jolpica directly gives us race + each practice + qualifying as named keys.
 */
function jolpicaSchedule(race) {
  const s = race.sessions || {}
  const entries = [
    s.fp1        && { session: 'Practice 1',  startTime: s.fp1 },
    s.fp2        && { session: 'Practice 2',  startTime: s.fp2 },
    s.fp3        && { session: 'Practice 3',  startTime: s.fp3 },
    s.sprint_qualifying && { session: 'Sprint Qualifying', startTime: s.sprint_qualifying },
    s.sprint     && { session: 'Sprint Race', startTime: s.sprint },
    s.qualifying && { session: 'Qualifying',  startTime: s.qualifying },
    race.date    && { session: 'Race',         startTime: race.date },
  ].filter(Boolean)

  const now = new Date()
  return entries.map(e => ({
    ...e,
    status: new Date(e.startTime) < now ? 'Completed' : 'Upcoming',
  }))
}

// ── Race Preview Generator ────────────────────────────────────────────────────
/**
 * Generate data-driven race preview from standings and circuit data.
 * Updates automatically after each race.
 */
function generateRacePreview(drivers, teams, raceName, raceCircuit) {
  if (!drivers?.length || !raceName) return []

  // Classify circuit type based on name
  const circuitLower = (raceCircuit || '').toLowerCase()
  const isStreetCircuit = circuitLower.includes('street') || circuitLower.includes('monaco') ||
                          circuitLower.includes('baku') || circuitLower.includes('singapore') ||
                          circuitLower.includes('austin') || circuitLower.includes('buenos aires')
  const isHighSpeed = circuitLower.includes('monza') || circuitLower.includes('spa') ||
                      circuitLower.includes('silverstone') || circuitLower.includes('silverstones')

  const preview = []

  // 1. Top 3 drivers — who's leading
  const top3 = drivers.slice(0, 3)
  if (top3.length > 0) {
    preview.push({
      title: 'Championship Leader',
      content: `${top3[0].driver} (${top3[0].pts} pts) leads ${top3[1]?.driver || 'the field'} by ${Math.round(top3[0].pts - (top3[1]?.pts || 0))} points`,
    })
  }

  // 2. Constructor standings
  if (teams?.length > 0) {
    const lead = Math.round(teams[0].pts - (teams[1]?.pts || 0))
    preview.push({
      title: 'Constructor Battle',
      content: `${teams[0].team} leads constructor championship by ${lead} points`,
    })
  }

  // 3. Circuit characteristics
  let circuitNote = ''
  if (isStreetCircuit) {
    circuitNote = 'Street circuit: precision, low overtaking, close racing, tire degradation critical'
  } else if (isHighSpeed) {
    circuitNote = 'High-speed circuit: power matters, slipstream advantage, fuel efficiency important'
  } else {
    circuitNote = 'Mixed circuit: balanced challenge for teams and drivers'
  }
  preview.push({
    title: 'Circuit Profile',
    content: circuitNote,
  })

  // 4. Midfield battle
  const midfield = drivers.slice(3, 6)
  if (midfield.length > 0) {
    const gaps = midfield.map((d, i) => `${d.driver} (${d.pts}pts)`).join(' vs ')
    preview.push({
      title: 'Midfield Watch',
      content: `Close battle: ${gaps} — points available for those outside the top 2`,
    })
  }

  return preview
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequestGet({ env }) {
  const cacheKey = 'series:f1'
  const cached   = await cacheGet(env, cacheKey)
  if (cached) {
    return buildLiveResponse({ ...cached.data, _cacheHit: true }, 'f1', cached.source, 'standings')
  }

  const liveEnabled = env?.ENABLE_LIVE_F1 !== 'false'
  if (!liveEnabled) {
    return buildFallbackResponse(getFallbackF1Data(), 'f1', 'Live F1 disabled')
  }

  const fb = getFallbackF1Data()

  try {
    // ── 1. Jolpica /next — authoritative race date and session times ─────────
    let jolpicaRace  = null
    let raceStart    = null   // official Sunday race date/time
    let schedule     = []
    let nextSession  = null   // first upcoming session of any type

    try {
      jolpicaRace = await getNextRace()
      if (jolpicaRace && isCurrentYear(jolpicaRace.date)) {
        raceStart = jolpicaRace.date              // e.g. "2026-06-07T13:00:00Z" — always the race
        schedule  = jolpicaSchedule(jolpicaRace)  // FP1…Quali…Race in date order

        const now = new Date()
        nextSession = schedule.find(s => new Date(s.startTime) > now) ?? null

        console.log(`[f1] Jolpica next race: ${jolpicaRace.name} race on ${raceStart}`)
      } else {
        console.warn(`[f1] Jolpica returned invalid year data (${jolpicaRace?.date}) — skipping`)
        jolpicaRace = null
      }
    } catch (err) {
      console.error('[f1] Jolpica /next error:', err.message)
    }

    // ── 2. OpenF1 /sessions — enrich schedule if Jolpica worked, or replace it ─
    let of1Weather  = null
    let of1Circuit  = null
    let of1Country  = null
    let of1Location = null

    try {
      const meeting = await getLatestMeeting()
      if (meeting) {
        const sessions = await getAllSessionsForMeeting(meeting.meeting_key)
        if (sessions.length > 0) {
          const parsed = parseOpenF1Sessions(sessions)

          // Enrich circuit info from OpenF1
          of1Circuit  = sessions[0]?.circuit_short_name || meeting.circuit_short_name || null
          of1Country  = meeting.country_name || null
          of1Location = meeting.location || null

          if (jolpicaRace) {
            // Jolpica already gave us the race date — use OpenF1 only to:
            // a) get more precise session times if available
            // b) add Sprint Qualifying if present
            // c) confirm raceSession exists
            if (parsed.raceSession && isCurrentYear(parsed.raceSession.date_start)) {
              // Use OpenF1 race session time only if it's on the same day as Jolpica's race date
              const of1RaceDay   = new Date(parsed.raceSession.date_start).toDateString()
              const jolRaceDay   = new Date(raceStart).toDateString()
              if (of1RaceDay === jolRaceDay) {
                raceStart = parsed.raceSession.date_start  // more precise time from OpenF1
              }
            }

            // Prefer OpenF1 schedule if it has more sessions (e.g. Sprint Quali)
            if (parsed.schedule.length > schedule.length) {
              // Keep Jolpica race date but use OpenF1 session times
              schedule = parsed.schedule
            }

            // Update nextSession from OpenF1's perspective
            const now = new Date()
            nextSession = parsed.schedule.find(s => new Date(s.startTime) > now) ?? nextSession
          } else {
            // Jolpica failed — use OpenF1 entirely, but still find race session correctly
            if (parsed.raceSession && isCurrentYear(parsed.raceSession.date_start)) {
              raceStart   = parsed.raceSession.date_start
              schedule    = parsed.schedule
              nextSession = parsed.nextSession
              console.log(`[f1] OpenF1 fallback race session: ${raceStart}`)
            } else {
              console.warn('[f1] OpenF1 has no valid race session for current year')
            }
          }

          // Get weather from most recent session
          const latestSess = sessions.at(-1)
          if (latestSess?.session_key) {
            const raw = await getSessionWeather(latestSess.session_key).catch(() => null)
            of1Weather = normalizeWeather(raw)
          }
        }
      }
    } catch (err) {
      console.error('[f1] OpenF1 sessions error:', err.message)
    }

    // ── 3. ESPN — fallback for race name/location only ────────────────────────
    let raceName    = jolpicaRace?.name    || null
    let raceCircuit = jolpicaRace?.circuit || of1Circuit || null
    let raceLocation= jolpicaRace?.location|| of1Location || null
    let raceCountry = jolpicaRace?.country || of1Country  || null
    let raceLat     = jolpicaRace?.lat     || null
    let raceLon     = jolpicaRace?.lon     || null
    let raceRound   = jolpicaRace?.round   || null

    if (!raceName) {
      try {
        const scoreboard = await getScoreboard('f1')
        const event      = extractNextEvent(scoreboard)
        const normalized = normalizeEvent(event, 'f1')
        if (normalized?.name) {
          raceName     = normalized.name
          raceCircuit  = raceCircuit  || normalized.track
          raceLocation = raceLocation || normalized.location
          raceCountry  = raceCountry  || normalized.country
          console.log(`[f1] ESPN race name fallback: ${raceName}`)
          // NOTE: we do NOT use normalized.date for raceStart — ESPN may return FP1 date
        }
      } catch (err) {
        console.error('[f1] ESPN error:', err.message)
      }
    }

    // ── Bail out if we have no race at all ────────────────────────────────────
    if (!raceStart && !raceName) {
      console.warn('[f1] No race data from any source — using fallback')
      return buildFallbackResponse(fb, 'f1', 'No F1 data from Jolpica, OpenF1, or ESPN')
    }

    // Use fallback schedule if we still have nothing
    if (!schedule.length) schedule = fb.schedule

    // ── 4. Standings (Jolpica → ESPN → fallback) ───────────────────────────────
    let drivers = []
    let teams   = []
    const [driversRes, teamsRes] = await Promise.allSettled([
      getDriverStandings(),
      getConstructorStandings(),
    ])
    drivers = driversRes.status === 'fulfilled' ? driversRes.value : []
    teams   = teamsRes.status   === 'fulfilled' ? teamsRes.value   : []

    // If Jolpica failed or has stale data, try ESPN
    if (!isValidStandings(drivers)) {
      console.log('[f1] Jolpica standings invalid, trying ESPN...')
      try {
        const espnStandings = await getStandings('f1')
        const espnDrivers = normalizeStandingsEntries(espnStandings)
        if (espnDrivers.length > 0) {
          drivers = espnDrivers
          console.log(`[f1] ESPN standings: ${drivers.length} drivers`)
        }
      } catch (err) {
        console.error('[f1] ESPN standings error:', err.message)
      }
    }

    // Final fallback if both sources failed
    if (!drivers.length) {
      drivers = fb.standings.drivers
      teams   = fb.standings.teams
    }

    // ── 5. Weather ────────────────────────────────────────────────────────────
    let weather = of1Weather
    if (!weather && raceLat && raceLon) {
      weather = await getCurrentWeather({ lat: raceLat, lon: raceLon }).catch(() => null)
    }
    if (!weather) weather = getFallbackWeather(raceCircuit || '')

    // ── 5b. Fallback: extract raceStart and nextSession from schedule ────────
    if (!raceStart && schedule.length > 0) {
      const raceSession = schedule.find(s =>
        s.session?.toLowerCase() === 'race' ||
        s.session?.toLowerCase().includes('race')
      )
      if (raceSession?.startTime) {
        raceStart = raceSession.startTime
        console.log(`[f1] Extracted race start from schedule: ${raceStart}`)
      }
    }

    // Always set nextSession if not already set — first future session
    if (!nextSession && schedule.length > 0) {
      const now = new Date()
      nextSession = schedule.find(s => new Date(s.startTime) > now) || null
      if (nextSession) {
        console.log(`[f1] Extracted next session from schedule: ${nextSession.session}`)
      }
    }

    // ── 6. Build response ─────────────────────────────────────────────────────
    const data = {
      series:     'f1',
      seriesName: 'Formula 1',
      featuredRace: {
        id:           `f1-${(raceCircuit || 'race').toLowerCase().replace(/\s+/g, '-')}-${CURRENT_YEAR}`,
        name:         raceName || 'F1 Grand Prix',
        track:        raceCircuit  || '',
        location:     raceLocation || '',
        country:      raceCountry  || '',
        date:         raceStart,      // ← always the Sunday race date
        raceStart,                    // explicit alias used by countdown
        nextSession,                  // first upcoming session (FP1 if pre-weekend, or Race if race weekend)
        status:       'Upcoming',
        round:        raceRound,
        season:       CURRENT_YEAR,
      },
      track: {
        name:     raceCircuit  || '',
        location: raceLocation || '',
        lat:      raceLat,
        lon:      raceLon,
        type:     'Grand Prix Circuit',
      },
      schedule,    // all sessions sorted by date with correct types
      standings: {
        drivers: isValidStandings(drivers) ? drivers : fb.standings.drivers,
        teams:   teams.length ? teams : fb.standings.teams,
      },
      weather:       weather       || fb.weather,
      talkingPoints: generateRacePreview(
        isValidStandings(drivers) ? drivers : fb.standings.drivers,
        teams.length ? teams : fb.standings.teams,
        raceName || 'F1 Grand Prix',
        raceCircuit || ''
      ),
      officialLinks: fb.officialLinks,
    }

    const sources = [jolpicaRace ? 'jolpica' : null, 'openf1'].filter(Boolean).join('+')
    await cacheSet(env, cacheKey, { data, source: sources }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'f1', sources, 'standings')

  } catch (err) {
    console.error('[f1] Unhandled error:', err)
    return buildFallbackResponse(fb, 'f1', `F1 fetch failed: ${err.message}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
