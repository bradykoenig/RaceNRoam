/**
 * GET /api/live?series=f1|nascar|...
 *
 * F1 state machine — fully automatic, no hardcoded session_key / meeting_key / race data.
 * Sources: Jolpica (schedule) + OpenF1 paid real-time API (timing)
 *
 * Modes: pre_session | live | best_effort_live | post_session | no_active_session | unavailable
 *
 * Cache strategy: stale-while-revalidate
 *   - Responses cached with a long TTL (60s live, 120s otherwise)
 *   - Freshness checked via generatedAt in the payload, not CF cache TTL
 *   - Fresh  (< 5s live / < 25s idle): return immediately
 *   - Stale  (> fresh but within cache TTL): return stale + background refresh via waitUntil
 *   - No cache: synchronous fresh fetch (cold start — may be slow, but only happens once)
 *
 * This guarantees every browser request returns in < 100ms once the cache is warm,
 * and never blocks on a cold OpenF1 auth + 9-endpoint fetch chain.
 */

import { cachedFetchJson }      from '../_lib/utils/cfCache.js'
import { getNascarLiveData }    from '../_lib/providers/nascar/nascarLiveProvider.js'
import { corsOptionsResponse }  from '../_lib/utils/apiResponse.js'
import { getOpenF1Token, invalidateToken } from '../_lib/providers/f1/openF1AuthProvider.js'

const CORS = { 'Access-Control-Allow-Origin': '*' }

function jsonRes(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  })
}

// ── Full-response cache (stale-while-revalidate) ──────────────────────────────
// Stored with a long TTL so CF keeps it even after freshness expires.
// Freshness is evaluated by comparing generatedAt to now.

const FULL_CACHE_NAME = 'racenroam-live-v5'
const F1_CACHE_KEY    = 'https://racenroam.pages.dev/__f1_live_v5'
const LIVE_FRESH_MS   =  5_000   // serve fresh if < 5s old during live
const IDLE_FRESH_MS   = 25_000   // serve fresh if < 25s old during pre/post/idle
const CACHE_STORE_TTL = 120      // keep in CF cache up to 2 minutes as stale pool

async function getFullCache() {
  try {
    const c = await caches.open(FULL_CACHE_NAME)
    const h = await c.match(F1_CACHE_KEY)
    return h ? h.json() : null
  } catch { return null }
}

async function setFullCache(payload) {
  try {
    const c = await caches.open(FULL_CACHE_NAME)
    await c.put(F1_CACHE_KEY, new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': `public, max-age=${CACHE_STORE_TTL}`,
      },
    }))
  } catch {}
}

// ── Jolpica ───────────────────────────────────────────────────────────────────

async function getJolpicaRace() {
  const year = new Date().getFullYear()
  const data = await cachedFetchJson(
    `https://api.jolpi.ca/ergast/f1/${year}.json?limit=30`,
    { headers: { Accept: 'application/json' } },
    21600
  )
  const races = data?.MRData?.RaceTable?.Races
  if (!races?.length) return null

  const now = Date.now()
  for (const race of races) {
    const raceMs   = new Date(`${race.date}T${race.time || '13:00:00Z'}`).getTime()
    const winStart = raceMs - 4 * 86_400_000
    const winEnd   = raceMs + 1 * 86_400_000
    if (now >= winStart && now <= winEnd) return race
  }
  return races.find(r => new Date(r.date).getTime() >= now - 86_400_000) || races[races.length - 1]
}

// ── OpenF1 request factory ────────────────────────────────────────────────────

const OF1          = 'https://api.openf1.org/v1'
const AUTHED_CACHE = 'racenroam-openf1-authed-v1'
const FREE_CACHE   = 'racenroam-openf1-free-v1'

function makeOf1(token) {
  const cacheName = token ? AUTHED_CACHE : FREE_CACHE
  const headers   = token ? { Authorization: `Bearer ${token}` } : {}
  return (path, ttl) => cachedFetchJson(`${OF1}${path}`, { headers }, ttl, cacheName)
}

// ── OpenF1 session helpers ────────────────────────────────────────────────────

async function findMeeting(race, of1) {
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

async function getSessions(meetingKey, of1) {
  const rows = await of1(`/sessions?meeting_key=${meetingKey}`, 60)
  return (rows || []).sort((a, b) => new Date(a.date_start) - new Date(b.date_start))
}

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
  if (active) return { mode: 'active', activeSession: active, sessions: sorted }

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
  const m   = Math.floor(s / 60)
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

async function fetchLiveData(sessionKey, of1, authenticated) {
  const rt = authenticated ? 3 : 5
  const lt = authenticated ? 5 : 15

  const [posR, intR, lapR, rcR, wxR, carR, stintR, tsR, drvR, locR] = await Promise.allSettled([
    of1(`/position?session_key=${sessionKey}`,     rt),
    of1(`/intervals?session_key=${sessionKey}`,    rt),
    of1(`/laps?session_key=${sessionKey}`,         lt),
    of1(`/race_control?session_key=${sessionKey}`, rt),
    of1(`/weather?session_key=${sessionKey}`,      60),
    of1(`/car_data?session_key=${sessionKey}`,     rt),
    of1(`/stints?session_key=${sessionKey}`,       authenticated ? 20 : 30),
    of1(`/track_status?session_key=${sessionKey}`, rt),
    of1(`/drivers?session_key=${sessionKey}`,      300),
    of1(`/location?session_key=${sessionKey}`,     rt),
  ])

  const drivers = {}
  for (const d of drvR.value ?? []) drivers[d.driver_number] = d

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

  const allLaps = lapR.value ?? []

  const fastestPD = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number, dur = lap.lap_duration
    if (!dur || dur <= 0) continue
    if (!fastestPD[dn] || dur < fastestPD[dn].lap_duration) fastestPD[dn] = lap
  }

  // Latest lap by lap_number (may be in-progress, no sector 3 yet) — for lap counter
  const latestLap = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number
    if (!latestLap[dn] || lap.lap_number > latestLap[dn].lap_number) latestLap[dn] = lap
  }

  // Last COMPLETED lap (has sector 3 time) — for sector display
  // The in-progress lap won't have duration_sector_3 until the driver crosses the line,
  // which is why sector 3 appeared blank: we were reading the current unfinished lap.
  const lastCompletedLap = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number
    if (lap.duration_sector_3 != null && lap.duration_sector_3 > 0) {
      if (!lastCompletedLap[dn] || lap.lap_number > lastCompletedLap[dn].lap_number) {
        lastCompletedLap[dn] = lap
      }
    }
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

    const ll = latestLap[p.number]       // current/latest lap (for lap number)
    const cl = lastCompletedLap[p.number] // last fully-completed lap (for sectors)
    const pb = pbS[p.number] ?? [Infinity, Infinity, Infinity]

    if (ll) {
      p.lapNumber   = ll.lap_number
      p.isPitOutLap = ll.is_pit_out_lap
    }
    if (cl) {
      p.sectors = [
        { time: cl.duration_sector_1?.toFixed(3) ?? null, color: sColor(cl.duration_sector_1, bestS[0], pb[0]) },
        { time: cl.duration_sector_2?.toFixed(3) ?? null, color: sColor(cl.duration_sector_2, bestS[1], pb[1]) },
        { time: cl.duration_sector_3?.toFixed(3) ?? null, color: sColor(cl.duration_sector_3, bestS[2], pb[2]) },
      ]
    }
  }

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

  const carLatest = latestPerDriver(carR.value)
  for (const p of leaderboard) {
    const c = carLatest.find(x => x.driver_number === p.number)
    if (c) {
      p.telemetry = { speed: c.speed, rpm: c.rpm, gear: c.n_gear, throttle: c.throttle, brake: c.brake, drs: c.drs >= 8 }
      p.inPit     = c.speed != null && c.speed < 30
    }
  }

  const tsArr    = [...(tsR.value ?? [])].sort((a, b) => a.date > b.date ? 1 : -1)
  const latestTS = tsArr[tsArr.length - 1]
  const trackStatus = latestTS
    ? (TS_MAP[String(latestTS.status)] ?? { label: 'UNKNOWN', color: '#888', type: 'unknown' })
    : { label: 'ALL CLEAR', color: '#22c55e', type: 'green' }

  const raceControl = [...(rcR.value ?? [])]
    .filter(m => m.message)
    .sort((a, b) => b.date > a.date ? 1 : -1)
    .slice(0, 12)
    .map(m => ({ time: m.date, flag: m.flag, category: m.category, message: m.message }))

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

  const lapNums    = allLaps.map(l => l.lap_number).filter(n => n > 0)
  const currentLap = lapNums.length ? Math.max(...lapNums) : null

  // Extract total laps from race control messages (e.g. "LAP 1 OF 78" or "OF 78 LAPS")
  let totalLaps = null
  for (const m of [...(rcR.value ?? [])].sort((a, b) => b.date > a.date ? 1 : -1)) {
    if (!m.message) continue
    const match = m.message.match(/(?:of|\/)\s*(\d{2,3})\s*(?:laps?)?/i)
    if (match) { totalLaps = parseInt(match[1], 10); break }
  }

  // Car positions for track map — latest X/Y per driver
  const locations = latestPerDriver(locR.value ?? []).map(l => ({
    driver_number: l.driver_number,
    x: l.x,
    y: l.y,
  })).filter(l => l.x != null && l.y != null)

  return { leaderboard, trackStatus, raceControl, weather, currentLap, totalLaps, locations }
}

// ── Unavailable payload ───────────────────────────────────────────────────────

function unavailablePayload(generatedAt, reason) {
  return {
    mode: 'unavailable',
    source: 'OpenF1 real-time API via Cloudflare Pages Function',
    authenticated: false,
    generatedAt, dataAgeSeconds: 0, stale: false,
    warnings: [reason],
    race: null, sessions: [], activeSession: null,
    nextSession: null, latestSession: null,
    session_key: null, meeting_key: null,
    sessionName: null, sessionType: null,
    trackStatus: null, leaderboard: [], raceControl: [],
    weather: null, currentLap: null, totalLaps: null, isLive: false,
  }
}

// ── Core fetch-and-build (potentially slow — called synchronously or via waitUntil) ──

async function doFreshFetch(env) {
  const generatedAt = new Date().toISOString()
  const warnings    = []

  let token         = null
  let authenticated = false
  try {
    token         = await getOpenF1Token(env)
    authenticated = true
  } catch (authErr) {
    warnings.push(`OpenF1 auth: ${authErr.message}`)
  }

  const of1 = makeOf1(token)

  const race = await getJolpicaRace()
  if (!race) {
    const p = unavailablePayload(generatedAt, 'Jolpica returned no race data')
    await setFullCache(p)
    return p
  }

  let sessions = []
  try {
    const meeting = await findMeeting(race, of1)
    if (meeting) sessions = await getSessions(meeting.meeting_key, of1)

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

    if (!sessions.length) {
      sessions = buildJolpicaSessions(race)
      warnings.push(sessions.length
        ? 'OpenF1 has no session registry for this event — schedule from Jolpica calendar'
        : 'No session data available from OpenF1 or Jolpica')
    }
  } catch (err) {
    if (err.message?.includes('401') || err.message?.includes('403')) invalidateToken()
    warnings.push(`OpenF1 sessions: ${err.message}`)
    sessions = buildJolpicaSessions(race)
  }

  const { mode: rawMode, activeSession, nextSession, latestSession, sessions: sorted } = determineMode(sessions)

  const mode = rawMode === 'active'
    ? (authenticated ? 'live' : 'best_effort_live')
    : rawMode

  const raceInfo = {
    raceName:        race.raceName                      || null,
    round:           race.round ? parseInt(race.round) : null,
    circuitName:     race.Circuit?.circuitName          || null,
    locality:        race.Circuit?.Location?.locality   || null,
    country:         race.Circuit?.Location?.country    || null,
    date:            race.date                          || null,
    time:            race.time                          || null,
    raceDateTimeUtc: race.date && race.time ? `${race.date}T${race.time}` : race.date || null,
  }

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

  let liveData  = {}
  const isActive    = mode === 'live' || mode === 'best_effort_live'
  const explicitKey = activeSession?.session_key ?? (mode === 'post_session' ? latestSession?.session_key : null)
  const fetchKey    = explicitKey ?? ((isActive || mode === 'post_session') ? 'latest' : null)

  if (fetchKey) {
    try {
      liveData = await fetchLiveData(fetchKey, of1, authenticated)
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('403')) invalidateToken()
      warnings.push(`Live timing: ${err.message}`)
    }
  }

  const payload = {
    mode,
    source:         'OpenF1 real-time API via Cloudflare Pages Function',
    authenticated,
    scheduleSource: sessions.length && sessions[0]?.session_key ? 'OpenF1' : 'Jolpica',
    liveSource:     'OpenF1',
    generatedAt,
    dataAgeSeconds: 0,
    stale:          false,
    warnings,
    race:           raceInfo,
    sessions:       allSessions,
    activeSession:  activeInfo,
    nextSession:    nextInfo,
    latestSession:  latestInfo,
    session_key:    activeInfo?.session_key  ?? null,
    meeting_key:    activeInfo?.meeting_key  ?? null,
    sessionName:    activeInfo?.sessionName  ?? null,
    sessionType:    activeInfo?.sessionType  ?? null,
    trackStatus:    liveData.trackStatus ?? null,
    leaderboard:    liveData.leaderboard ?? [],
    raceControl:    liveData.raceControl ?? [],
    weather:        liveData.weather     ?? null,
    currentLap:     liveData.currentLap  ?? null,
    totalLaps:      liveData.totalLaps   ?? null,
    locations:      liveData.locations   ?? [],
    isLive:         mode === 'live' || mode === 'best_effort_live',
  }

  await setFullCache(payload)
  return payload
}

// ── F1 handler — stale-while-revalidate orchestrator ─────────────────────────

async function handleF1(env, waitUntil) {
  const now    = Date.now()
  const cached = await getFullCache()

  if (cached?.generatedAt && cached?.mode) {
    const ageMs  = now - new Date(cached.generatedAt).getTime()
    const isLive = cached.mode === 'live' || cached.mode === 'best_effort_live'
    const freshMs = isLive ? LIVE_FRESH_MS : IDLE_FRESH_MS

    if (ageMs < freshMs) {
      // Cache is fresh — return immediately, no refetch
      return jsonRes({ ...cached, dataAgeSeconds: Math.round(ageMs / 1000), stale: false })
    }

    // Cache is stale — return it NOW, refresh in background
    waitUntil(doFreshFetch(env).catch(() => {}))
    return jsonRes({
      ...cached,
      dataAgeSeconds: Math.round(ageMs / 1000),
      stale: true,
    })
  }

  // No usable cache — must fetch synchronously (cold start)
  // This is the only path that can be slow; it only happens on the very first request
  // at each edge location, or after the cache completely expires (> 2 minutes idle)
  try {
    const payload = await doFreshFetch(env)
    return jsonRes(payload)
  } catch (err) {
    return jsonRes(unavailablePayload(new Date().toISOString(), err.message))
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function onRequestGet({ request, env, waitUntil }) {
  const series = new URL(request.url).searchParams.get('series') || 'f1'

  if (series === 'f1') return handleF1(env, waitUntil)

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
