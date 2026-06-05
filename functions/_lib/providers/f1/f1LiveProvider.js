// F1 live data orchestrator
//
// Priority chain (all free, no API keys):
//   1. F1 Live Timing (livetiming.formula1.com static files)
//      — same CDN used by FastF1 and community timing apps
//      — session path auto-constructed from Jolpica schedule
//   2. OpenF1 (api.openf1.org) as fallback
//      — may return empty arrays during live sessions on free tier
//      — still useful for historical/pre-session context
//
// Everything is automatic — session detection, path construction, and
// provider selection all happen at runtime. No manual changes between races.

import { cachedFetchJson } from '../../utils/cfCache.js'
import { getF1TimingLiveData } from './f1TimingProvider.js'

const BASE = 'https://api.openf1.org/v1'
const YEAR = new Date().getFullYear()

// ── Shared utilities ──────────────────────────────────────────────────────────

function latestPerDriver(records, key = 'driver_number') {
  const map = {}
  for (const r of records || []) {
    if (!map[r[key]] || r.date > map[r[key]].date) map[r[key]] = r
  }
  return Object.values(map)
}

function fmtLap(seconds) {
  if (seconds == null || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(3).padStart(6, '0')
  return m > 0 ? `${m}:${s}` : `${Number(seconds).toFixed(3)}`
}

function getSessionCategory(session) {
  const name = (session?.session_name || '').toLowerCase()
  const type = (session?.session_type || '').toLowerCase()
  if (name.includes('sprint') && name.includes('qualifying')) return 'sprint-qualifying'
  if (name.includes('sprint'))    return 'sprint'
  if (name.includes('qualifying') || type === 'qualifying') return 'qualifying'
  if (name.includes('practice')   || type === 'practice')   return 'practice'
  if (type === 'race' || name === 'race')                    return 'race'
  return 'other'
}

// ── Jolpica race data (used to build session schedule for F1 timing) ──────────

function jolpicaSession(obj, name) {
  if (!obj?.date || !obj?.time) return null
  return { session: name, startTime: `${obj.date}T${obj.time}` }
}

async function getJolpicaRaceData() {
  try {
    const data = await cachedFetchJson(
      `https://api.jolpi.ca/ergast/f1/${YEAR}/next.json`,
      { headers: { Accept: 'application/json' } },
      300  // 5-minute CF edge cache
    )
    const race = data?.MRData?.RaceTable?.Races?.[0]
    if (!race) return null

    const raceDate = race.date && race.time
      ? `${race.date}T${race.time}`
      : race.date

    const schedule = [
      jolpicaSession(race.FirstPractice,      'Practice 1'),
      jolpicaSession(race.SecondPractice,     'Practice 2'),
      jolpicaSession(race.ThirdPractice,      'Practice 3'),
      jolpicaSession(race.SprintQualifying,   'Sprint Qualifying'),
      jolpicaSession(race.Sprint,             'Sprint Race'),
      jolpicaSession(race.Qualifying,         'Qualifying'),
      raceDate && { session: 'Race', startTime: raceDate },
    ].filter(Boolean)

    return { raceName: race.raceName, raceDate, schedule, year: YEAR }
  } catch {
    return null
  }
}

// ── OpenF1 endpoint fetcher (cached at CF edge) ───────────────────────────────

const OF1_CACHE_TTL = {
  sessions: 60, position: 2, intervals: 2, car_data: 2, track_status: 2,
  race_control: 4, weather: 15, drivers: 300, laps: 4, stints: 20, location: 2,
}

async function of1Get(path, params = {}) {
  const qs  = new URLSearchParams(params).toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  const key = path.replace('/', '').split('?')[0]
  const ttl = OF1_CACHE_TTL[key] ?? 5
  return cachedFetchJson(url, {}, ttl)
}

// ── OpenF1 live data (secondary / fallback) ───────────────────────────────────

async function getOpenF1LiveData() {
  const fetchedAt = Date.now()

  const sessions = await of1Get('/sessions', { session_key: 'latest' })
  const session  = sessions?.[0]
  if (!session) return { isLive: false, source: 'openf1' }

  const now   = Date.now()
  const start = new Date(session.date_start).getTime()
  const end   = new Date(session.date_end).getTime()
  const isLive = now >= start && now <= end + 10 * 60 * 1000

  const sessionKey = session.session_key
  const category   = getSessionCategory(session)
  const isRace     = category === 'race' || category === 'sprint'
  const isQual     = category === 'qualifying' || category === 'sprint-qualifying'

  const locSince = new Date(Date.now() - 15000).toISOString().replace('Z', '+00:00')
  const [posR, intR, rcR, wxR, drvR, lapR, stintR, carDataR, trackStatusR, locR] =
    await Promise.allSettled([
      of1Get('/position',     { session_key: sessionKey }),
      of1Get('/intervals',    { session_key: sessionKey }),
      of1Get('/race_control', { session_key: sessionKey }),
      of1Get('/weather',      { session_key: sessionKey }),
      of1Get('/drivers',      { session_key: sessionKey }),
      of1Get('/laps',         { session_key: sessionKey }),
      of1Get('/stints',       { session_key: sessionKey }),
      of1Get('/car_data',     { session_key: sessionKey }),
      of1Get('/track_status', { session_key: sessionKey }),
      of1Get('/location',     { session_key: sessionKey, date: `>=${locSince}` }),
    ])

  const drivers = {}
  for (const d of (drvR.value || [])) drivers[d.driver_number] = d

  const latestPos = latestPerDriver(posR.value)
  const positions = latestPos
    .filter(p => p.position)
    .sort((a, b) => a.position - b.position)
    .map(p => {
      const d = drivers[p.driver_number] || {}
      return {
        pos:       p.position,
        number:    p.driver_number,
        driver:    d.full_name    || `Car #${p.driver_number}`,
        short:     d.name_acronym || String(p.driver_number),
        team:      d.team_name    || '',
        teamColor: d.team_colour  ? `#${d.team_colour}` : '#888888',
        headshot:  d.headshot_url || null,
      }
    })

  // Fastest laps
  const allLaps = lapR.value || []
  const fastestPerDriver = {}
  for (const lap of allLaps) {
    const dn  = lap.driver_number
    const dur = lap.lap_duration
    if (!dur || dur <= 0) continue
    if (!fastestPerDriver[dn] || dur < fastestPerDriver[dn].lap_duration) {
      fastestPerDriver[dn] = lap
    }
  }
  let fastestOverall = Infinity
  for (const { lap_duration: t } of Object.values(fastestPerDriver)) {
    if (t < fastestOverall) fastestOverall = t
  }
  for (const p of positions) {
    const fl = fastestPerDriver[p.number]
    if (fl) {
      p.fastestLap    = fmtLap(fl.lap_duration)
      p.fastestLapNum = fl.lap_number
    }
  }

  // Gaps / intervals
  {
    const intMap = Object.fromEntries(latestPerDriver(intR.value).map(i => [i.driver_number, i]))
    for (const p of positions) {
      const i = intMap[p.number]
      if (i) {
        p.gap      = p.pos === 1 ? 'LEADER' : i.gap_to_leader != null ? `+${Number(i.gap_to_leader).toFixed(3)}` : null
        p.interval = p.pos === 1 ? null : i.interval != null ? `+${Number(i.interval).toFixed(3)}` : null
      }
    }
  }

  // Tyres
  const stints = stintR.value || []
  const latestStint = {}
  for (const s of stints) {
    const dn = s.driver_number
    if (!latestStint[dn] || s.stint_number > latestStint[dn].stint_number) latestStint[dn] = s
  }
  const COMPOUND_COLOR = {
    SOFT: '#e8002d', MEDIUM: '#f5c518', HARD: '#f0f0f0',
    INTERMEDIATE: '#22c55e', WET: '#3b82f6',
  }
  for (const p of positions) {
    const s = latestStint[p.number]
    if (s?.compound) {
      p.compound      = s.compound
      p.compoundColor = COMPOUND_COLOR[s.compound] || '#888'
      p.tyreAge       = s.tyre_age_at_end ?? s.lap_end - s.lap_start + 1
    }
  }

  // Track status
  const tsArr = (trackStatusR.value || []).sort((a, b) => a.date > b.date ? 1 : -1)
  const latestTS = tsArr[tsArr.length - 1]
  const TRACK_STATUS_MAP = {
    '1': { label: 'ALL CLEAR',          color: '#22c55e', type: 'green'  },
    '2': { label: 'YELLOW FLAG',        color: '#f5c518', type: 'yellow' },
    '3': { label: 'FLAG',               color: '#f5c518', type: 'yellow' },
    '4': { label: 'SAFETY CAR',         color: '#f97316', type: 'sc'     },
    '5': { label: 'RED FLAG',           color: '#e8002d', type: 'red'    },
    '6': { label: 'VIRTUAL SAFETY CAR', color: '#f97316', type: 'vsc'    },
    '7': { label: 'VSC ENDING',         color: '#facc15', type: 'vsc'    },
  }
  const trackStatus = latestTS
    ? (TRACK_STATUS_MAP[String(latestTS.status)] || { label: latestTS.message || 'UNKNOWN', color: '#888', type: 'unknown' })
    : { label: 'ALL CLEAR', color: '#22c55e', type: 'green' }

  // Telemetry
  const telemetryMap = {}
  for (const c of latestPerDriver(carDataR.value, 'driver_number')) {
    telemetryMap[c.driver_number] = {
      speed: c.speed, rpm: c.rpm, gear: c.n_gear,
      throttle: c.throttle, brake: c.brake, drs: c.drs >= 8,
    }
  }

  // Pit detection
  for (const p of positions) {
    const tel = telemetryMap[p.number]
    p.inPit = tel?.speed != null && tel.speed < 30
  }

  // Sectors
  const allLapsArr = lapR.value || []
  const bestS1 = Math.min(...allLapsArr.map(l => l.duration_sector_1).filter(v => v > 0))
  const bestS2 = Math.min(...allLapsArr.map(l => l.duration_sector_2).filter(v => v > 0))
  const bestS3 = Math.min(...allLapsArr.map(l => l.duration_sector_3).filter(v => v > 0))
  const personalBest = {}
  for (const lap of allLapsArr) {
    const dn = lap.driver_number
    if (!personalBest[dn]) personalBest[dn] = { s1: Infinity, s2: Infinity, s3: Infinity }
    if (lap.duration_sector_1 > 0) personalBest[dn].s1 = Math.min(personalBest[dn].s1, lap.duration_sector_1)
    if (lap.duration_sector_2 > 0) personalBest[dn].s2 = Math.min(personalBest[dn].s2, lap.duration_sector_2)
    if (lap.duration_sector_3 > 0) personalBest[dn].s3 = Math.min(personalBest[dn].s3, lap.duration_sector_3)
  }
  const latestLap = {}
  for (const lap of allLapsArr) {
    const dn = lap.driver_number
    if (!latestLap[dn] || lap.lap_number > latestLap[dn].lap_number) latestLap[dn] = lap
  }
  function sCol(val, best, pb) {
    if (!val || val <= 0) return 'grey'
    if (val <= best) return 'purple'
    if (val <= pb)   return 'green'
    return 'yellow'
  }
  function fmtS(v) { return v && v > 0 ? v.toFixed(3) : null }
  for (const p of positions) {
    const tel = telemetryMap[p.number]
    if (tel) p.telemetry = tel
    const ll = latestLap[p.number]
    const pb = personalBest[p.number] || {}
    if (ll) {
      p.sectors = [
        { time: fmtS(ll.duration_sector_1), color: sCol(ll.duration_sector_1, bestS1, pb.s1) },
        { time: fmtS(ll.duration_sector_2), color: sCol(ll.duration_sector_2, bestS2, pb.s2) },
        { time: fmtS(ll.duration_sector_3), color: sCol(ll.duration_sector_3, bestS3, pb.s3) },
      ]
      p.lapNumber    = ll.lap_number
      p.isPitOutLap  = ll.is_pit_out_lap
    }
  }

  // Race control
  const allRC = (rcR.value || [])
    .filter(m => m.message)
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 12)
    .map(m => ({ time: m.date, flag: m.flag, category: m.category, message: m.message, scope: m.scope, sector: m.sector }))

  // Weather
  const wxArr = (wxR.value || []).sort((a, b) => a.date > b.date ? 1 : -1)
  const wx    = wxArr[wxArr.length - 1]
  const weather = wx ? {
    airTemp: wx.air_temperature, trackTemp: wx.track_temperature,
    humidity: wx.humidity, windSpeed: wx.wind_speed, windDir: wx.wind_direction,
    rainfall: wx.rainfall, source: 'openf1',
  } : null

  // Qualifying segment
  let sessionSegment = null
  if (isQual) {
    const seg = [...(rcR.value || [])].reverse().find(m => m.message?.match(/Q[123] STARTS|Q[123] ENDS/i))
    if (seg) sessionSegment = seg.message
  }

  // Lap counter from laps endpoint
  const lapNumbers = isRace ? allLaps.map(l => l.lap_number).filter(n => n > 0) : []
  const currentLap = lapNumbers.length ? Math.max(...lapNumbers) : null

  return {
    ok: true, source: 'OpenF1 free REST', mode: 'best_effort_live',
    dataAgeSeconds: Math.round((Date.now() - fetchedAt) / 1000),
    fetchedAt: new Date(fetchedAt).toISOString(),
    isLive, category, trackStatus,
    session: {
      key:       sessionKey,
      name:      session.session_name,
      type:      session.session_type,
      category,
      segment:   sessionSegment,
      circuit:   session.circuit_short_name,
      country:   session.country_name,
      dateStart: session.date_start,
      dateEnd:   session.date_end,
      lap:       currentLap,
      totalLaps: isRace ? session.total_laps || null : null,
    },
    positions,
    raceControl: allRC,
    weather,
    locations: latestPerDriver(locR.value || []),
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getF1LiveData() {
  // 1. Derive schedule from Jolpica — authoritative, auto-updates after each race
  const raceInfo = await getJolpicaRaceData()
  if (raceInfo) {
    try {
      const timing = await getF1TimingLiveData(raceInfo)
      if (timing) {
        // Got real positions from F1 timing CDN — return directly
        if (!timing._timingUnavailable) return timing
        // CDN blocked server-side but schedule confirms session is live:
        // return the shell with _sessionPaths so the browser can retry with
        // its residential IP. Do NOT fall through to OpenF1 — free tier has
        // no live data and would replace _sessionPaths with an empty response.
        if (timing.isLive) return timing
        // No active session per schedule — fall through to OpenF1 for context
      }
    } catch { /* fall through */ }
  }

  // 2. OpenF1 fallback — useful for non-live state; live data requires paid tier
  try {
    return await getOpenF1LiveData()
  } catch {
    return { isLive: false, source: 'openf1', ok: false }
  }
}

// Kept for backwards compatibility — locations now included in getF1LiveData
export async function getF1Locations(sessionKey) {
  const since = new Date(Date.now() - 15000).toISOString().replace('Z', '+00:00')
  try {
    return latestPerDriver(
      await of1Get('/location', { session_key: sessionKey, date: `>=${since}` })
    )
  } catch {
    return []
  }
}
