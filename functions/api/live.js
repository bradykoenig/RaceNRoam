/**
 * GET /api/live?series=f1|nascar|...
 *
 * F1 state machine — fully automatic, no hardcoded session_key / meeting_key / race data.
 * Sources: Jolpica (schedule) + OpenF1 free REST (timing)
 *
 * Modes: pre_session | best_effort_live | post_session | no_active_session | unavailable
 */

import { cachedFetchJson }   from '../_lib/utils/cfCache.js'
import { getNascarLiveData } from '../_lib/providers/nascar/nascarLiveProvider.js'
import { corsOptionsResponse } from '../_lib/utils/apiResponse.js'

const CORS = { 'Access-Control-Allow-Origin': '*' }

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  })
}

// ── Full-response cache ───────────────────────────────────────────────────────

const CACHE_NAME = 'racenroam-live-v3'
const F1_KEY     = 'https://racenroam.pages.dev/__f1_live_v3'

async function getFullCache() {
  try {
    const c = await caches.open(CACHE_NAME)
    const h = await c.match(F1_KEY)
    return h ? h.json() : null
  } catch { return null }
}

async function setFullCache(payload, ttl) {
  try {
    const c = await caches.open(CACHE_NAME)
    await c.put(F1_KEY, new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
    }))
  } catch {}
}

// ── Jolpica ───────────────────────────────────────────────────────────────────

async function getJolpicaRace() {
  const year  = new Date().getFullYear()
  const data  = await cachedFetchJson(
    `https://api.jolpi.ca/ergast/f1/${year}.json?limit=30`,
    { headers: { Accept: 'application/json' } },
    21600
  )
  const races = data?.MRData?.RaceTable?.Races
  if (!races?.length) return null

  const now = Date.now()

  for (const race of races) {
    const raceMs  = new Date(`${race.date}T${race.time || '13:00:00Z'}`).getTime()
    const winStart = raceMs - 4 * 86_400_000   // Thu before race
    const winEnd   = raceMs + 1 * 86_400_000   // day after race
    if (now >= winStart && now <= winEnd) return race
  }

  // Not in a weekend — return next upcoming race
  return races.find(r => new Date(r.date).getTime() >= now - 86_400_000) || races[races.length - 1]
}

// ── OpenF1 ────────────────────────────────────────────────────────────────────

const OF1 = 'https://api.openf1.org/v1'

function of1(path, ttl) {
  return cachedFetchJson(`${OF1}${path}`, {}, ttl)
}

async function findMeeting(race) {
  if (!race?.date) return null
  const year     = new Date(race.date).getFullYear()
  const meetings = await of1(`/meetings?year=${year}`, 3600)
  if (!meetings?.length) return null

  const raceMs = new Date(race.date).getTime()
  return meetings
    .map(m => ({ ...m, _d: Math.abs(new Date(m.date_start).getTime() - raceMs) }))
    .filter(m => m._d < 8 * 86_400_000)
    .sort((a, b) => a._d - b._d)[0] ?? null
}

async function getSessions(meetingKey) {
  const rows = await of1(`/sessions?meeting_key=${meetingKey}`, 60)
  return (rows || []).sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
}

// Build synthetic sessions from Jolpica race object when OpenF1 has no 2026 data yet.
// Jolpica/Ergast includes FirstPractice, SecondPractice, ThirdPractice, Qualifying, Sprint times.
function buildJolpicaSessions(race) {
  function add(name, type, date, time, durationHours) {
    if (!date || !time) return null
    const iso = `${date}T${time}`
    const ms  = new Date(iso).getTime()
    if (isNaN(ms)) return null
    return {
      session_key:  null,
      meeting_key:  null,
      session_name: name,
      session_type: type,
      date_start:   iso,
      date_end:     new Date(ms + durationHours * 3_600_000).toISOString(),
    }
  }
  return [
    add('Practice 1',        'Practice',   race.FirstPractice?.date,    race.FirstPractice?.time,    1),
    add('Practice 2',        'Practice',   race.SecondPractice?.date,   race.SecondPractice?.time,   1),
    add('Sprint Qualifying', 'Qualifying', race.SprintQualifying?.date, race.SprintQualifying?.time, 0.5),
    add('Sprint',            'Race',       race.Sprint?.date,           race.Sprint?.time,           0.5),
    add('Practice 3',        'Practice',   race.ThirdPractice?.date,    race.ThirdPractice?.time,    1),
    add('Qualifying',        'Qualifying', race.Qualifying?.date,       race.Qualifying?.time,       1),
    add('Race',              'Race',       race.date,                   race.time || '13:00:00Z',    2),
  ].filter(Boolean).sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
}

// ── Mode determination ────────────────────────────────────────────────────────

function determineMode(sessions) {
  if (!sessions?.length) return { mode: 'no_active_session', sessions: [] }

  const now    = Date.now()
  const sorted = [...sessions].sort((a, b) => new Date(a.date_start) - new Date(b.date_start))

  const active = sorted.find(s => {
    const start = new Date(s.date_start).getTime()
    const end   = new Date(s.date_end).getTime()
    return now >= start && now <= end + 15 * 60_000
  })
  if (active) return { mode: 'best_effort_live', activeSession: active, sessions: sorted }

  const next = sorted.find(s => new Date(s.date_start).getTime() > now)
  if (next) {
    const daysAway = (new Date(next.date_start).getTime() - now) / 86_400_000
    return {
      mode:        daysAway > 14 ? 'no_active_session' : 'pre_session',
      nextSession: next,
      sessions:    sorted,
    }
  }

  const latest    = sorted[sorted.length - 1]
  const hoursSince = latest ? (now - new Date(latest.date_end).getTime()) / 3_600_000 : Infinity
  if (hoursSince < 36) return { mode: 'post_session', latestSession: latest, sessions: sorted }

  return { mode: 'no_active_session', sessions: sorted }
}

// ── Live data (OpenF1) ────────────────────────────────────────────────────────

function latestPerDriver(arr, key = 'driver_number') {
  const map = {}
  for (const r of arr ?? []) {
    if (!map[r[key]] || r.date > map[r[key]].date) map[r[key]] = r
  }
  return Object.values(map)
}

function fmtLap(s) {
  if (!s || s <= 0) return null
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(3).padStart(6, '0')
  return m > 0 ? `${m}:${sec}` : Number(s).toFixed(3)
}

const COMPOUND_COLOR = {
  SOFT: '#e8002d', MEDIUM: '#f5c518', HARD: '#f0f0f0',
  INTERMEDIATE: '#22c55e', WET: '#3b82f6',
}

const TS_MAP = {
  '1': { label: 'ALL CLEAR',          color: '#22c55e', type: 'green'  },
  '2': { label: 'YELLOW FLAG',        color: '#f5c518', type: 'yellow' },
  '4': { label: 'SAFETY CAR',         color: '#f97316', type: 'sc'     },
  '5': { label: 'RED FLAG',           color: '#e8002d', type: 'red'    },
  '6': { label: 'VIRTUAL SAFETY CAR', color: '#f97316', type: 'vsc'    },
  '7': { label: 'VSC ENDING',         color: '#facc15', type: 'vsc'    },
}

async function fetchLiveData(sessionKey) {
  const [posR, intR, lapR, rcR, wxR, carR, stintR, tsR, drvR] = await Promise.allSettled([
    of1(`/position?session_key=${sessionKey}`,     5),
    of1(`/intervals?session_key=${sessionKey}`,    10),
    of1(`/laps?session_key=${sessionKey}`,         15),
    of1(`/race_control?session_key=${sessionKey}`, 5),
    of1(`/weather?session_key=${sessionKey}`,      60),
    of1(`/car_data?session_key=${sessionKey}`,     5),
    of1(`/stints?session_key=${sessionKey}`,       30),
    of1(`/track_status?session_key=${sessionKey}`, 5),
    of1(`/drivers?session_key=${sessionKey}`,      300),
  ])

  // Drivers
  const drivers = {}
  for (const d of drvR.value ?? []) drivers[d.driver_number] = d

  // Leaderboard base (latest position per driver)
  const leaderboard = latestPerDriver(posR.value)
    .filter(p => p.position)
    .sort((a, b) => a.position - b.position)
    .map(p => {
      const d = drivers[p.driver_number] ?? {}
      return {
        pos:       p.position,
        number:    p.driver_number,
        driver:    d.full_name    || `Car #${p.driver_number}`,
        short:     d.name_acronym || String(p.driver_number),
        team:      d.team_name    || '',
        teamColor: d.team_colour  ? `#${d.team_colour}` : '#888888',
      }
    })

  // Laps
  const allLaps = lapR.value ?? []

  const fastestPD = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number, dur = lap.lap_duration
    if (!dur || dur <= 0) continue
    if (!fastestPD[dn] || dur < fastestPD[dn].lap_duration) fastestPD[dn] = lap
  }

  const latestLap = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number
    if (!latestLap[dn] || lap.lap_number > latestLap[dn].lap_number) latestLap[dn] = lap
  }

  const bestS = [
    Math.min(...allLaps.map(l => l.duration_sector_1).filter(v => v > 0), Infinity),
    Math.min(...allLaps.map(l => l.duration_sector_2).filter(v => v > 0), Infinity),
    Math.min(...allLaps.map(l => l.duration_sector_3).filter(v => v > 0), Infinity),
  ]
  const pbS = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number
    if (!pbS[dn]) pbS[dn] = [Infinity, Infinity, Infinity]
    if (lap.duration_sector_1 > 0) pbS[dn][0] = Math.min(pbS[dn][0], lap.duration_sector_1)
    if (lap.duration_sector_2 > 0) pbS[dn][1] = Math.min(pbS[dn][1], lap.duration_sector_2)
    if (lap.duration_sector_3 > 0) pbS[dn][2] = Math.min(pbS[dn][2], lap.duration_sector_3)
  }

  function sColor(val, best, pb) {
    if (!val || val <= 0) return 'grey'
    if (val <= best) return 'purple'
    if (val <= pb)   return 'green'
    return 'yellow'
  }

  for (const p of leaderboard) {
    const fl = fastestPD[p.number]
    if (fl) { p.fastestLap = fmtLap(fl.lap_duration); p.fastestLapNum = fl.lap_number }

    const ll = latestLap[p.number]
    const pb = pbS[p.number] ?? [Infinity, Infinity, Infinity]
    if (ll) {
      p.sectors = [
        { time: ll.duration_sector_1?.toFixed(3) ?? null, color: sColor(ll.duration_sector_1, bestS[0], pb[0]) },
        { time: ll.duration_sector_2?.toFixed(3) ?? null, color: sColor(ll.duration_sector_2, bestS[1], pb[1]) },
        { time: ll.duration_sector_3?.toFixed(3) ?? null, color: sColor(ll.duration_sector_3, bestS[2], pb[2]) },
      ]
      p.lapNumber   = ll.lap_number
      p.isPitOutLap = ll.is_pit_out_lap
    }
  }

  // Gaps / intervals
  const intMap = Object.fromEntries(
    latestPerDriver(intR.value).map(i => [i.driver_number, i])
  )
  for (const p of leaderboard) {
    const iv = intMap[p.number]
    if (iv) {
      p.gap      = p.pos === 1 ? 'LEADER' : iv.gap_to_leader != null ? `+${Number(iv.gap_to_leader).toFixed(3)}` : null
      p.interval = p.pos === 1 ? null     : iv.interval       != null ? `+${Number(iv.interval).toFixed(3)}` : null
    }
  }

  // Tyres
  const latestStint = {}
  for (const s of stintR.value ?? []) {
    const dn = s.driver_number
    if (!latestStint[dn] || s.stint_number > latestStint[dn].stint_number) latestStint[dn] = s
  }
  for (const p of leaderboard) {
    const s = latestStint[p.number]
    if (s?.compound) {
      p.compound      = s.compound
      p.compoundColor = COMPOUND_COLOR[s.compound] || '#888'
      p.tyreAge       = s.tyre_age_at_end ?? null
    }
  }

  // Telemetry + pit detection
  const carLatest = latestPerDriver(carR.value)
  for (const p of leaderboard) {
    const c = carLatest.find(x => x.driver_number === p.number)
    if (c) {
      p.telemetry = { speed: c.speed, rpm: c.rpm, gear: c.n_gear, throttle: c.throttle, brake: c.brake, drs: c.drs >= 8 }
      p.inPit     = c.speed != null && c.speed < 30
    }
  }

  // Track status
  const tsArr    = [...(tsR.value ?? [])].sort((a, b) => a.date > b.date ? 1 : -1)
  const latestTS = tsArr[tsArr.length - 1]
  const trackStatus = latestTS
    ? (TS_MAP[String(latestTS.status)] ?? { label: 'UNKNOWN', color: '#888', type: 'unknown' })
    : { label: 'ALL CLEAR', color: '#22c55e', type: 'green' }

  // Race control
  const raceControl = [...(rcR.value ?? [])]
    .filter(m => m.message)
    .sort((a, b) => b.date > a.date ? 1 : -1)
    .slice(0, 12)
    .map(m => ({ time: m.date, flag: m.flag, category: m.category, message: m.message }))

  // Weather
  const wxArr = [...(wxR.value ?? [])].sort((a, b) => a.date > b.date ? 1 : -1)
  const wx    = wxArr[wxArr.length - 1]
  const weather = wx ? {
    airTemp:   wx.air_temperature   ?? null,
    trackTemp: wx.track_temperature ?? null,
    humidity:  wx.humidity          ?? null,
    windSpeed: wx.wind_speed        ?? null,
    windDir:   wx.wind_direction    ?? null,
    rainfall:  wx.rainfall          ?? false,
  } : null

  const lapNums   = allLaps.map(l => l.lap_number).filter(n => n > 0)
  const currentLap = lapNums.length ? Math.max(...lapNums) : null

  return { leaderboard, trackStatus, raceControl, weather, currentLap }
}

// ── Unavailable payload ───────────────────────────────────────────────────────

function unavailablePayload(generatedAt, reason) {
  return {
    mode: 'unavailable',
    source: 'OpenF1 free REST via Cloudflare Pages Function',
    scheduleSource: 'Jolpica', liveSource: 'OpenF1',
    generatedAt, dataAgeSeconds: null, stale: false,
    warnings: [reason],
    race: null, sessions: [], activeSession: null,
    nextSession: null, latestSession: null,
    trackStatus: null, leaderboard: [], raceControl: [],
    weather: null, currentLap: null, isLive: false,
  }
}

// ── F1 handler ────────────────────────────────────────────────────────────────

async function handleF1() {
  const cached      = await getFullCache()
  const generatedAt = new Date().toISOString()
  const warnings    = []

  try {
    // 1. Race from Jolpica
    const race = await getJolpicaRace()
    if (!race) {
      const p = unavailablePayload(generatedAt, 'Jolpica returned no race data')
      await setFullCache(p, 60)
      return jsonRes(p)
    }

    // 2. OpenF1 meeting + sessions (three-tier fallback)
    let sessions = []
    try {
      // Tier 1: meeting_key lookup
      const meeting = await findMeeting(race)
      if (meeting) sessions = await getSessions(meeting.meeting_key)

      // Tier 2: year-wide sessions query filtered by proximity to race date
      if (!sessions.length) {
        try {
          const year     = new Date(race.date).getFullYear()
          const yearRows = await of1(`/sessions?year=${year}`, 60)
          if (yearRows?.length) {
            const raceMs = new Date(race.date).getTime()
            sessions = yearRows
              .filter(s => Math.abs(new Date(s.date_start).getTime() - raceMs) < 8 * 86_400_000)
              .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
          }
        } catch {}
      }

      // Tier 3: build from Jolpica race data (FirstPractice / SecondPractice / etc.)
      if (!sessions.length) {
        sessions = buildJolpicaSessions(race)
        warnings.push(sessions.length
          ? 'OpenF1 has no session registry for this event — schedule from Jolpica calendar'
          : 'No session data available from OpenF1 or Jolpica')
      }
    } catch (err) {
      warnings.push(`OpenF1 sessions unavailable: ${err.message}`)
      sessions = buildJolpicaSessions(race)
    }

    // 3. Mode
    const { mode, activeSession, nextSession, latestSession, sessions: sorted } = determineMode(sessions)

    // 4. Build race info
    const raceInfo = {
      raceName:        race.raceName                        || null,
      round:           race.round ? parseInt(race.round)   : null,
      circuitName:     race.Circuit?.circuitName            || null,
      locality:        race.Circuit?.Location?.locality     || null,
      country:         race.Circuit?.Location?.country      || null,
      date:            race.date                            || null,
      time:            race.time                            || null,
      raceDateTimeUtc: race.date && race.time ? `${race.date}T${race.time}` : race.date || null,
    }

    // 5. Session info shapes
    const allSessions = (sorted ?? []).map(s => ({
      session_key:  s.session_key,
      meeting_key:  s.meeting_key,
      sessionName:  s.session_name,
      sessionType:  s.session_type,
      startTime:    s.date_start,
      endTime:      s.date_end,
    }))

    const activeInfo = activeSession ? {
      session_key:  activeSession.session_key,
      meeting_key:  activeSession.meeting_key,
      sessionName:  activeSession.session_name,
      sessionType:  activeSession.session_type,
      startTime:    activeSession.date_start,
      endTime:      activeSession.date_end,
    } : null

    const nextInfo = nextSession ? {
      sessionName:      nextSession.session_name,
      sessionType:      nextSession.session_type,
      startTime:        nextSession.date_start,
      endTime:          nextSession.date_end,
      countdownSeconds: Math.max(0, Math.round((new Date(nextSession.date_start).getTime() - Date.now()) / 1000)),
    } : null

    const latestInfo = latestSession ? {
      session_key: latestSession.session_key,
      sessionName: latestSession.session_name,
      sessionType: latestSession.session_type,
      startTime:   latestSession.date_start,
      endTime:     latestSession.date_end,
    } : null

    // 6. Live data — fetch for active OR latest completed session
    // When sessions came from Jolpica (session_key=null), fall back to OpenF1 'latest'
    let liveData = {}
    const explicitKey = activeSession?.session_key ?? (mode === 'post_session' ? latestSession?.session_key : null)
    const needsLive   = mode === 'best_effort_live' || mode === 'post_session'
    const fetchKey    = explicitKey ?? (needsLive ? 'latest' : null)
    if (fetchKey) {
      try {
        liveData = await fetchLiveData(fetchKey)
      } catch (err) {
        warnings.push(`Live timing unavailable: ${err.message}`)
      }
    }

    const payload = {
      mode,
      source:          'OpenF1 free REST via Cloudflare Pages Function',
      scheduleSource:  'Jolpica',
      liveSource:      'OpenF1',
      generatedAt,
      dataAgeSeconds:  0,
      stale:           false,
      warnings,
      race:            raceInfo,
      sessions:        allSessions,
      activeSession:   activeInfo,
      nextSession:     nextInfo,
      latestSession:   latestInfo,
      trackStatus:     liveData.trackStatus  ?? null,
      leaderboard:     liveData.leaderboard  ?? [],
      raceControl:     liveData.raceControl  ?? [],
      weather:         liveData.weather      ?? null,
      currentLap:      liveData.currentLap   ?? null,
      isLive:          mode === 'best_effort_live',
    }

    const ttl = mode === 'best_effort_live' ? 5 : mode === 'pre_session' ? 30 : 60
    await setFullCache(payload, ttl)
    return jsonRes(payload)

  } catch (err) {
    if (cached) {
      return jsonRes({ ...cached, stale: true, warnings: ['Using last valid cached response.', err.message] })
    }
    return jsonRes(unavailablePayload(generatedAt, err.message))
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function onRequestGet({ request }) {
  const series = new URL(request.url).searchParams.get('series') || 'f1'

  if (series === 'f1') return handleF1()

  if (series === 'nascar') {
    try {
      const data = await getNascarLiveData()
      return jsonRes({ ok: true, series: 'nascar', ...data })
    } catch (err) {
      return jsonRes({ ok: false, series: 'nascar', isLive: false, error: err.message })
    }
  }

  const officialUrls = {
    indycar:    'https://racecontrol.indycar.com/timing',
    motogp:     'https://www.motogp.com/en/live',
    'imsa-wec': 'https://www.fiawec.com/en/live',
  }
  if (officialUrls[series]) {
    return jsonRes({ ok: true, series, isLive: false, noFreeApi: true, officialUrl: officialUrls[series] })
  }

  return jsonRes({ ok: false, series, isLive: false, error: 'Unknown series' }, 400)
}

export async function onRequestOptions() { return corsOptionsResponse() }
