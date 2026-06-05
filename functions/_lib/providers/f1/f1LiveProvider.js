// F1 live data via OpenF1 (https://openf1.org/) — free REST polling, no API key
// Covers: Free Practice 1/2/3, Sprint Qualifying, Sprint Race, Qualifying Q1/Q2/Q3, Race
// Uses Cloudflare Cache API to prevent rate limits — only one real request per TTL

import { cachedFetchJson } from '../../utils/cfCache.js'

const BASE = 'https://api.openf1.org/v1'

// Per-endpoint cache TTLs — match spec exactly
const CACHE_TTL = {
  sessions:      60,
  position:      10,
  intervals:     10,
  car_data:       5,
  track_status:   5,
  race_control:  10,   // spec: 10s
  weather:       20,
  drivers:      300,
  laps:          15,
  stints:        60,
  location:       8,
}

async function get(path, params = {}) {
  const qs  = new URLSearchParams(params).toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  const key = path.replace('/', '').split('?')[0]
  const ttl = CACHE_TTL[key] ?? 15
  return cachedFetchJson(url, {}, ttl)
}

// Reduce an array to the latest record per driver
function latestPerDriver(records, key = 'driver_number') {
  const map = {}
  for (const r of records || []) {
    if (!map[r[key]] || r.date > map[r[key]].date) map[r[key]] = r
  }
  return Object.values(map)
}

// Format lap time in seconds to m:ss.sss
function fmtLap(seconds) {
  if (seconds == null || seconds <= 0) return null
  const m = Math.floor(seconds / 60)
  const s = (seconds % 60).toFixed(3).padStart(6, '0')
  return m > 0 ? `${m}:${s}` : `${Number(seconds).toFixed(3)}`
}

// Determine session category from type/name
function getSessionCategory(session) {
  const name = (session?.session_name || '').toLowerCase()
  const type = (session?.session_type || '').toLowerCase()
  if (name.includes('qualifying') || type === 'qualifying') return 'qualifying'
  if (name.includes('practice') || type === 'practice') return 'practice'
  if (name.includes('sprint') && name.includes('qualifying')) return 'sprint-qualifying'
  if (name.includes('sprint')) return 'sprint'
  if (type === 'race' || name === 'race') return 'race'
  return 'other'
}

export async function getF1LiveData() {
  const fetchedAt = Date.now()

  // 1. Get current/latest session
  const sessions = await get('/sessions', { session_key: 'latest' })
  const session  = sessions?.[0]
  if (!session) return { isLive: false, source: 'openf1' }

  const now   = Date.now()
  const start = new Date(session.date_start).getTime()
  const end   = new Date(session.date_end).getTime()
  const isLive = now >= start && now <= end

  const sessionKey = session.session_key
  const category   = getSessionCategory(session)
  const isRace     = category === 'race' || category === 'sprint'
  const isQual     = category === 'qualifying' || category === 'sprint-qualifying'
  const isPractice = category === 'practice'

  // 2. Fetch all endpoints in parallel (including location for track map)
  const locSince = new Date(Date.now() - 15000).toISOString().replace('Z', '+00:00')
  const requests = {
    positions:   get('/position',      { session_key: sessionKey }),
    intervals:   get('/intervals',     { session_key: sessionKey }),
    raceCtrl:    get('/race_control',  { session_key: sessionKey }),
    weather:     get('/weather',       { session_key: sessionKey }),
    drivers:     get('/drivers',       { session_key: sessionKey }),
    laps:        get('/laps',          { session_key: sessionKey }),
    stints:      get('/stints',        { session_key: sessionKey }),
    carData:     get('/car_data',      { session_key: sessionKey }),
    trackStatus: get('/track_status',  { session_key: sessionKey }),
    location:    get('/location',      { session_key: sessionKey, date: `>=${locSince}` }),
  }

  const results = await Promise.allSettled(Object.values(requests))
  const [posR, intR, rcR, wxR, drvR, lapR, stintR, carDataR, trackStatusR, locR] = results

  // Driver lookup
  const drivers = {}
  for (const d of (drvR.value || [])) drivers[d.driver_number] = d

  // Latest race position per driver
  const latestPos = latestPerDriver(posR.value)

  // Build positions array
  const positions = latestPos
    .filter(p => p.position)
    .sort((a, b) => a.position - b.position)
    .map(p => {
      const d = drivers[p.driver_number] || {}
      return {
        pos:       p.position,
        number:    p.driver_number,
        driver:    d.full_name   || `Car #${p.driver_number}`,
        short:     d.name_acronym || String(p.driver_number),
        team:      d.team_name   || '',
        teamColor: d.team_colour ? `#${d.team_colour}` : '#888888',
        headshot:  d.headshot_url || null,
      }
    })

  // -- Fastest laps (qualifying, practice, and race) --
  const allLaps = lapR.value || []
  const fastestLapPerDriver = {}
  for (const lap of allLaps) {
    const dn = lap.driver_number
    const dur = lap.lap_duration
    if (!dur || dur <= 0) continue
    if (!fastestLapPerDriver[dn] || dur < fastestLapPerDriver[dn].lap_duration) {
      fastestLapPerDriver[dn] = lap
    }
  }

  // Merge fastest lap into positions
  let fastestOverall = Infinity
  for (const dn of Object.keys(fastestLapPerDriver)) {
    const t = fastestLapPerDriver[dn].lap_duration
    if (t < fastestOverall) fastestOverall = t
  }

  for (const p of positions) {
    const fl = fastestLapPerDriver[p.number]
    if (fl) {
      p.fastestLap = fmtLap(fl.lap_duration)
      p.fastestLapNum = fl.lap_number
      p.deltaToFastest = p.number !== Object.entries(fastestLapPerDriver)
        .sort(([,a],[,b]) => a.lap_duration - b.lap_duration)[0]?.[0]
        ? fmtLap(fl.lap_duration - fastestOverall)
        : null
    }
  }

  // -- Gaps/intervals — applies to ALL session types (race, qualifying, practice)
  // OpenF1 provides gap_to_leader based on best lap for quali/practice, race gap for race
  {
    const latestInt = latestPerDriver(intR.value)
    const intMap    = Object.fromEntries(latestInt.map(i => [i.driver_number, i]))
    for (const p of positions) {
      const i = intMap[p.number]
      if (i) {
        p.gap      = p.pos === 1 ? 'LEADER' : i.gap_to_leader != null ? `+${Number(i.gap_to_leader).toFixed(3)}` : null
        p.interval = p.pos === 1 ? null : i.interval != null ? `+${Number(i.interval).toFixed(3)}` : null
      }
    }
  }

  // -- Tire compounds (stints) --
  const stints = stintR.value || []
  const latestStint = {}
  for (const s of stints) {
    const dn = s.driver_number
    if (!latestStint[dn] || s.stint_number > latestStint[dn].stint_number) {
      latestStint[dn] = s
    }
  }

  const COMPOUND_COLOR = {
    SOFT:       '#e8002d',
    MEDIUM:     '#f5c518',
    HARD:       '#f0f0f0',
    INTERMEDIATE: '#22c55e',
    WET:        '#3b82f6',
    HYPERSOFT:  '#ff69b4',
    SUPERSOFT:  '#e8002d',
  }

  for (const p of positions) {
    const stint = latestStint[p.number]
    if (stint?.compound) {
      p.compound      = stint.compound
      p.compoundColor = COMPOUND_COLOR[stint.compound] || '#888'
      p.tyreAge       = stint.tyre_age_at_end ?? stint.lap_end - stint.lap_start + 1
    }
  }

  // -- Track status --
  const trackStatusArr = (trackStatusR.value || []).sort((a, b) => a.date > b.date ? 1 : -1)
  const latestTrackStatus = trackStatusArr[trackStatusArr.length - 1]
  const TRACK_STATUS_MAP = {
    '1': { label: 'ALL CLEAR',            color: '#22c55e', type: 'green'  },
    '2': { label: 'YELLOW FLAG',          color: '#f5c518', type: 'yellow' },
    '3': { label: 'FLAG',                 color: '#f5c518', type: 'yellow' },
    '4': { label: 'SAFETY CAR',           color: '#f97316', type: 'sc'     },
    '5': { label: 'RED FLAG',             color: '#e8002d', type: 'red'    },
    '6': { label: 'VIRTUAL SAFETY CAR',   color: '#f97316', type: 'vsc'    },
    '7': { label: 'VSC ENDING',           color: '#facc15', type: 'vsc'    },
  }
  const trackStatus = latestTrackStatus
    ? (TRACK_STATUS_MAP[String(latestTrackStatus.status)] || { label: latestTrackStatus.message || 'UNKNOWN', color: '#888', type: 'unknown' })
    : { label: 'ALL CLEAR', color: '#22c55e', type: 'green' }

  // -- Telemetry (latest sample per driver) --
  const latestCarData = latestPerDriver(carDataR.value, 'driver_number')
  const telemetryMap  = {}
  for (const c of latestCarData) {
    telemetryMap[c.driver_number] = {
      speed:    c.speed,
      rpm:      c.rpm,
      gear:     c.n_gear,
      throttle: c.throttle,
      brake:    c.brake,
      drs:      c.drs >= 8,   // DRS open when value >= 8
    }
  }

  // -- Pit detection: speed < 30 km/h = in pit lane / pit box --
  for (const p of positions) {
    const tel = telemetryMap[p.number]
    p.inPit = tel?.speed != null && tel.speed < 30
  }

  // -- Sector times + colors per driver --
  // Build best sector times across all drivers for "purple" detection
  const allLapsArr = lapR.value || []
  const bestS1 = Math.min(...allLapsArr.map(l => l.duration_sector_1).filter(v => v > 0))
  const bestS2 = Math.min(...allLapsArr.map(l => l.duration_sector_2).filter(v => v > 0))
  const bestS3 = Math.min(...allLapsArr.map(l => l.duration_sector_3).filter(v => v > 0))

  const personalBestSectors = {}
  for (const lap of allLapsArr) {
    const dn = lap.driver_number
    if (!personalBestSectors[dn]) personalBestSectors[dn] = { s1: Infinity, s2: Infinity, s3: Infinity }
    if (lap.duration_sector_1 > 0) personalBestSectors[dn].s1 = Math.min(personalBestSectors[dn].s1, lap.duration_sector_1)
    if (lap.duration_sector_2 > 0) personalBestSectors[dn].s2 = Math.min(personalBestSectors[dn].s2, lap.duration_sector_2)
    if (lap.duration_sector_3 > 0) personalBestSectors[dn].s3 = Math.min(personalBestSectors[dn].s3, lap.duration_sector_3)
  }

  // Latest lap per driver for sector display
  const latestLapPerDriver = {}
  for (const lap of allLapsArr) {
    const dn = lap.driver_number
    if (!latestLapPerDriver[dn] || lap.lap_number > latestLapPerDriver[dn].lap_number) {
      latestLapPerDriver[dn] = lap
    }
  }

  function sectorColor(val, best, pb) {
    if (!val || val <= 0) return 'grey'
    if (val <= best) return 'purple'
    if (val <= pb) return 'green'
    return 'yellow'
  }

  function fmtSector(v) {
    if (!v || v <= 0) return null
    return v.toFixed(3)
  }

  // Merge telemetry + sectors into positions
  for (const p of positions) {
    const tel = telemetryMap[p.number]
    if (tel) p.telemetry = tel

    const ll  = latestLapPerDriver[p.number]
    const pb  = personalBestSectors[p.number] || {}
    if (ll) {
      p.sectors = [
        { time: fmtSector(ll.duration_sector_1), color: sectorColor(ll.duration_sector_1, bestS1, pb.s1) },
        { time: fmtSector(ll.duration_sector_2), color: sectorColor(ll.duration_sector_2, bestS2, pb.s2) },
        { time: fmtSector(ll.duration_sector_3), color: sectorColor(ll.duration_sector_3, bestS3, pb.s3) },
      ]
      p.lapNumber = ll.lap_number
      p.isPitOutLap = ll.is_pit_out_lap
    }
  }

  // -- Race control messages --
  const allRC = (rcR.value || [])
    .filter(m => m.message)
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 12)
    .map(m => ({
      time:     m.date,
      flag:     m.flag,
      category: m.category,
      message:  m.message,
      scope:    m.scope,
      sector:   m.sector,
    }))

  // -- Weather --
  const wxArr = (wxR.value || []).sort((a, b) => a.date > b.date ? 1 : -1)
  const wx = wxArr[wxArr.length - 1]
  const weather = wx ? {
    airTemp:   wx.air_temperature,
    trackTemp: wx.track_temperature,
    humidity:  wx.humidity,
    windSpeed: wx.wind_speed,
    windDir:   wx.wind_direction,
    rainfall:  wx.rainfall,
    source:    'openf1',
  } : null

  // -- Session progress --
  // For qualifying: detect which segment (Q1/Q2/Q3)
  let sessionSegment = null
  if (isQual) {
    const rcMessages = rcR.value || []
    const segMsg = [...rcMessages].reverse().find(m => m.message?.match(/Q[123] STARTS|Q[123] ENDS/i))
    if (segMsg) sessionSegment = segMsg.message
  }

  return {
    // ── Spec-required metadata ────────────────────────────────
    ok:             true,
    source:         'OpenF1 free REST',
    mode:           'best_effort_live',
    dataAgeSeconds: Math.round((Date.now() - fetchedAt) / 1000),
    fetchedAt:      new Date(fetchedAt).toISOString(),
    // ── Session state ─────────────────────────────────────────
    isLive,
    category,
    trackStatus,
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
      lap:       isRace ? (Math.max(...latestPos.map(p => p.lap ?? 0).filter(Boolean)) || null) : null,
      totalLaps: isRace ? session.total_laps || null : null,
    },
    // ── Timing data ───────────────────────────────────────────
    positions,       // includes .sectors, .telemetry, .gap, .interval, .compound, .tyreAge, .inPit
    raceControl: allRC,
    weather,
    locations: latestPerDriver(locR.value || []),  // real X/Y coords for track map
  }
}

// Latest X/Y car locations for the track map (F1 only via OpenF1)
export async function getF1Locations(sessionKey) {
  const since = new Date(Date.now() - 15000).toISOString().replace('Z', '+00:00')
  try {
    const raw = await get('/location', { session_key: sessionKey, date: `>=${since}` })
    return latestPerDriver(raw)
  } catch {
    return []
  }
}
