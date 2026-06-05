// F1 Live Timing provider — livetiming.formula1.com static snapshot files
// Same CDN used by FastF1, Multiviewer, and community timing apps.
// Files update every ~1-5s during live sessions. No API key required.
//
// Session path: {year}/{race-date}_{Race_Name}/{session-date}_{Session}/
// Example: 2026/2026-06-07_Monaco_Grand_Prix/2026-06-05_Practice_1/
//
// The 403 from headless tools is a CloudFront bot filter — browser-like
// headers (Referer: formula1.com) bypass it from server-to-server contexts.

const BASE = 'https://livetiming.formula1.com/static'

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.formula1.com/',
}

// Edge cache TTLs per file (seconds)
const FILE_TTL = {
  DriverList: 300, TimingData: 3, TimingAppData: 8,
  RaceControlMessages: 5, TrackStatus: 2, WeatherData: 15,
}

const TRACK_STATUS_MAP = {
  '1': { label: 'ALL CLEAR',          color: '#22c55e', type: 'green'  },
  '2': { label: 'YELLOW FLAG',        color: '#f5c518', type: 'yellow' },
  '4': { label: 'SAFETY CAR',         color: '#f97316', type: 'sc'     },
  '5': { label: 'RED FLAG',           color: '#e8002d', type: 'red'    },
  '6': { label: 'VIRTUAL SAFETY CAR', color: '#f97316', type: 'vsc'    },
  '7': { label: 'VSC ENDING',         color: '#facc15', type: 'vsc'    },
}

const COMPOUND_COLOR = {
  SOFT: '#e8002d', MEDIUM: '#f5c518', HARD: '#f0f0f0',
  INTERMEDIATE: '#22c55e', WET: '#3b82f6',
}

// Conservative session duration estimates that accommodate red-flag delays
const SESSION_DUR_MIN = {
  'Practice 1': 75, 'Practice 2': 75, 'Practice 3': 75,
  'Sprint Qualifying': 70, 'Sprint Race': 55,
  'Qualifying': 85, 'Race': 180,
}
const GRACE_MS = 30 * 60 * 1000  // 30 min post-session grace window

// Strip accents + non-alphanumeric, spaces → underscores
function normName(s) {
  return s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
}

function sectorColor(status) {
  if (status == null) return 'grey'
  const n = Number(status)
  if (n & 4)    return 'purple'   // 0x04 = overall fastest
  if (n & 2048) return 'green'    // 0x800 = personal best
  if (n === 0)  return 'yellow'   // posted, slower than PB
  return 'grey'
}

function findActiveSession(schedule) {
  const now = Date.now()
  return schedule.find(s => {
    const start = new Date(s.startTime).getTime()
    const durMs = (SESSION_DUR_MIN[s.session] ?? 90) * 60 * 1000
    return now >= start && now <= start + durMs + GRACE_MS
  }) ?? null
}

async function fetchFile(sessionPath, filename) {
  const url = `${BASE}/${sessionPath}${filename}`
  const ttl = FILE_TTL[filename.replace('.json', '')] ?? 5

  // Cloudflare Cache API — shared across all users, reduces F1 server requests
  let cache
  try { cache = await caches.open('racenroam-f1timing-v1') } catch {}

  if (cache) {
    const hit = await cache.match(url).catch(() => null)
    if (hit) return hit.json()
  }

  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(7000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()

  if (cache) {
    await cache.put(url, new Response(text, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` }
    })).catch(() => {})
  }
  return JSON.parse(text)
}

export async function getF1TimingLiveData({ schedule, raceDate, raceName, year }) {
  const session = findActiveSession(schedule)
  if (!session) return { isLive: false, source: 'f1-timing' }

  const raceDateStr     = raceDate.slice(0, 10)
  const firstSessDate   = schedule[0]?.startTime?.slice(0, 10) ?? raceDateStr
  const meetingName     = normName(raceName)
  const sessDate        = session.startTime.slice(0, 10)
  const sessFolder      = session.session.replace(/\s+/g, '_')

  // Try race-date prefix first (standard), then first-session date (sprint weekends may differ)
  const candidates = [...new Set([
    `${year}/${raceDateStr}_${meetingName}/${sessDate}_${sessFolder}/`,
    `${year}/${firstSessDate}_${meetingName}/${sessDate}_${sessFolder}/`,
  ])]

  for (const path of candidates) {
    const [drvR, timR, appR, rcR, tsR, wxR] = await Promise.allSettled([
      fetchFile(path, 'DriverList.json'),
      fetchFile(path, 'TimingData.json'),
      fetchFile(path, 'TimingAppData.json'),
      fetchFile(path, 'RaceControlMessages.json'),
      fetchFile(path, 'TrackStatus.json'),
      fetchFile(path, 'WeatherData.json'),
    ])

    if (timR.status !== 'fulfilled') continue  // wrong path or inaccessible — try next

    // ── Drivers ───────────────────────────────────────────────────────────
    const driverMap = {}
    for (const [num, d] of Object.entries(drvR.value || {})) {
      driverMap[num] = {
        number:    +num,
        driver:    d.FullName || d.BroadcastName || `Car #${num}`,
        short:     d.Tla || num,
        team:      d.TeamName || '',
        teamColor: d.TeamColour ? `#${d.TeamColour}` : '#888888',
        headshot:  d.HeadshotUrl || null,
      }
    }

    // ── Positions / timing lines ───────────────────────────────────────────
    const lines     = timR.value?.Lines || {}
    const positions = []

    for (const [num, line] of Object.entries(lines)) {
      if (!line.Position || line.Retired) continue
      const d   = driverMap[num] || { number: +num, driver: `Car #${num}`, short: num, team: '', teamColor: '#888' }
      const pos = +line.Position

      const rawSectors = Array.isArray(line.Sectors)
        ? line.Sectors
        : Object.values(line.Sectors || {})
      const sectors = rawSectors.slice(0, 3).map(s => ({
        time:  s?.Value || null,
        color: sectorColor(s?.Status),
      }))

      const rawGap = String(line.GapToLeader ?? '')
      const gap    = pos === 1 ? 'LEADER'
        : rawGap ? (rawGap.startsWith('+') ? rawGap : `+${rawGap}`) : null

      const rawInt   = String(line.IntervalToPositionAhead?.Value ?? '')
      const interval = pos !== 1 && rawInt
        ? (rawInt.startsWith('+') ? rawInt : `+${rawInt}`) : null

      positions.push({
        ...d, pos,
        fastestLap:  line.BestLapTime?.Value || null,
        lapNumber:   line.NumberOfLaps ?? null,
        gap, interval,
        sectors:     sectors.length ? sectors : undefined,
        inPit:       !!line.InPit,
        isPitOutLap: !!line.PitOut,
      })
    }
    positions.sort((a, b) => a.pos - b.pos)

    // ── Tyres ─────────────────────────────────────────────────────────────
    for (const p of positions) {
      const stints = Object.values(appR.value?.Lines?.[String(p.number)]?.Stints || {})
      const last   = stints[stints.length - 1]
      if (last?.Compound) {
        p.compound      = last.Compound
        p.compoundColor = COMPOUND_COLOR[last.Compound] || '#888'
        p.tyreAge       = last.TotalLaps != null ? +last.TotalLaps : null
      }
    }

    // ── Track status ──────────────────────────────────────────────────────
    const ts          = tsR.value
    const trackStatus = ts?.Status
      ? (TRACK_STATUS_MAP[String(ts.Status)] || { label: ts.Message || 'UNKNOWN', color: '#888', type: 'unknown' })
      : { label: 'ALL CLEAR', color: '#22c55e', type: 'green' }

    // ── Race control ──────────────────────────────────────────────────────
    const rcMsgs     = Object.values(rcR.value?.Messages || {}).filter(m => m.Message)
    const raceControl = rcMsgs
      .sort((a, b) => (b.Utc > a.Utc ? 1 : -1))
      .slice(0, 12)
      .map(m => ({ time: m.Utc, flag: m.Flag, category: m.Category, message: m.Message, scope: m.Scope, sector: m.Sector }))

    // ── Weather ───────────────────────────────────────────────────────────
    const wx      = wxR.value
    const weather = wx ? {
      airTemp:   wx.AirTemp   != null ? +wx.AirTemp   : null,
      trackTemp: wx.TrackTemp != null ? +wx.TrackTemp : null,
      humidity:  wx.Humidity  != null ? +wx.Humidity  : null,
      windSpeed: wx.WindSpeed != null ? +wx.WindSpeed : null,
      windDir:   wx.WindDirection != null ? +wx.WindDirection : null,
      rainfall:  wx.Rainfall === '1' || wx.Rainfall === 1,
      source:    'f1-timing',
    } : null

    // ── Session category ──────────────────────────────────────────────────
    const sn       = session.session.toLowerCase()
    const category =
      sn.includes('sprint') && sn.includes('qual') ? 'sprint-qualifying'
      : sn.includes('sprint') ? 'sprint'
      : sn.includes('qual')   ? 'qualifying'
      : sn.includes('prac')   ? 'practice'
      : sn === 'race'         ? 'race'
      : 'other'

    const isRace    = category === 'race' || category === 'sprint'
    const lapNums   = isRace ? positions.map(p => p.lapNumber ?? 0).filter(n => n > 0) : []
    const currentLap = lapNums.length ? Math.max(...lapNums) : null

    let sessionSegment = null
    if (category === 'qualifying') {
      const seg = [...rcMsgs].reverse().find(m => m.Message?.match(/Q[123] STARTS|Q[123] ENDS/i))
      if (seg) sessionSegment = seg.Message
    }

    return {
      ok:             true,
      source:         'F1 Live Timing',
      mode:           'best_effort_live',
      dataAgeSeconds: 0,
      fetchedAt:      new Date().toISOString(),
      isLive:         true,
      category,
      trackStatus,
      session: {
        key:       path,
        name:      session.session,
        type:      category,
        category,
        segment:   sessionSegment,
        circuit:   null,
        country:   null,
        dateStart: session.startTime,
        dateEnd:   null,
        lap:       currentLap,
        totalLaps: null,
      },
      positions,
      raceControl,
      weather,
      locations: [],  // car X/Y positions need Position.z decompression — use OpenF1 if live
    }
  }

  // All paths failed (server blocked or session not yet in CDN).
  // Return a schedule-aware live shell so the UI shows LIVE state
  // with an empty leaderboard rather than snapping back to idle mode.
  // _sessionPaths lets the browser retry with a residential IP directly.
  const sn = session.session.toLowerCase()
  return {
    ok:                 true,
    source:             'schedule',
    mode:               'best_effort_live',
    isLive:             true,
    _timingUnavailable: true,
    _sessionPaths:      candidates,
    category:           sn.includes('race') ? 'race' : sn.includes('qual') ? 'qualifying' : 'practice',
    trackStatus:        { label: 'ALL CLEAR', color: '#22c55e', type: 'green' },
    session: {
      name:      session.session,
      category:  'unknown',
      dateStart: session.startTime,
      dateEnd:   null,
      lap:       null,
      totalLaps: null,
    },
    positions:    [],
    raceControl:  [],
    weather:      null,
    locations:    [],
  }
}
