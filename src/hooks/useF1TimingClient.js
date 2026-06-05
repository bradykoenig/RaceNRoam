// Fetches F1 live timing files directly from the browser.
// The browser has a residential IP, bypassing F1's datacenter IP block.
// Kicks in when the server returns _timingUnavailable: true.
// Silently fails if F1's CDN rejects cross-origin requests (CORS).

import { useState, useEffect, useRef } from 'react'

const BASE    = 'https://livetiming.formula1.com/static'
const POLL_MS = 3000

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

function sectorColor(status) {
  if (status == null) return 'grey'
  const n = Number(status)
  if (n & 4)    return 'purple'
  if (n & 2048) return 'green'
  if (n === 0)  return 'yellow'
  return 'grey'
}

async function tryFetchPath(path) {
  const files = [
    'DriverList.json', 'TimingData.json', 'TimingAppData.json',
    'RaceControlMessages.json', 'TrackStatus.json', 'WeatherData.json',
  ]

  const results = await Promise.allSettled(
    files.map(f =>
      fetch(`${BASE}/${path}${f}`, { mode: 'cors', signal: AbortSignal.timeout(5000) })
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() })
    )
  )

  const [drvR, timR, appR, rcR, tsR, wxR] = results
  if (timR.status !== 'fulfilled') return null  // CORS blocked or path wrong

  // Drivers
  const driverMap = {}
  for (const [num, d] of Object.entries(drvR.value ?? {})) {
    driverMap[num] = {
      number:    +num,
      driver:    d.FullName || d.BroadcastName || `Car #${num}`,
      short:     d.Tla || num,
      team:      d.TeamName || '',
      teamColor: d.TeamColour ? `#${d.TeamColour}` : '#888888',
    }
  }

  // Positions
  const lines     = timR.value?.Lines ?? {}
  const positions = []
  for (const [num, line] of Object.entries(lines)) {
    if (!line.Position || line.Retired) continue
    const d   = driverMap[num] ?? { number: +num, driver: `Car #${num}`, short: num, team: '', teamColor: '#888' }
    const pos = +line.Position

    const rawSectors = Array.isArray(line.Sectors) ? line.Sectors : Object.values(line.Sectors ?? {})
    const sectors    = rawSectors.slice(0, 3).map(s => ({
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

  // Tyres
  for (const p of positions) {
    const stints = Object.values(appR.value?.Lines?.[String(p.number)]?.Stints ?? {})
    const last   = stints[stints.length - 1]
    if (last?.Compound) {
      p.compound      = last.Compound
      p.compoundColor = COMPOUND_COLOR[last.Compound] || '#888'
      p.tyreAge       = last.TotalLaps != null ? +last.TotalLaps : null
    }
  }

  // Track status
  const ts          = tsR.value
  const trackStatus = ts?.Status
    ? (TRACK_STATUS_MAP[String(ts.Status)] ?? { label: ts.Message || 'UNKNOWN', color: '#888', type: 'unknown' })
    : { label: 'ALL CLEAR', color: '#22c55e', type: 'green' }

  // Race control
  const rcMsgs      = Object.values(rcR.value?.Messages ?? {}).filter(m => m.Message)
  const raceControl = rcMsgs
    .sort((a, b) => (b.Utc > a.Utc ? 1 : -1))
    .slice(0, 12)
    .map(m => ({ time: m.Utc, flag: m.Flag, category: m.Category, message: m.Message, scope: m.Scope, sector: m.Sector }))

  // Weather
  const wx      = wxR.value
  const weather = wx ? {
    airTemp:   wx.AirTemp   != null ? +wx.AirTemp   : null,
    trackTemp: wx.TrackTemp != null ? +wx.TrackTemp : null,
    humidity:  wx.Humidity  != null ? +wx.Humidity  : null,
    windSpeed: wx.WindSpeed != null ? +wx.WindSpeed : null,
    windDir:   wx.WindDirection != null ? +wx.WindDirection : null,
    rainfall:  wx.Rainfall === '1' || wx.Rainfall === 1,
    source:    'f1-timing-client',
  } : null

  return { positions, trackStatus, raceControl, weather }
}

export function useF1TimingClient(sessionPaths, enabled) {
  const [data,   setData]   = useState(null)
  const timerRef = useRef(null)
  const pathsKey = sessionPaths?.join(',') ?? ''

  useEffect(() => {
    if (!enabled || !sessionPaths?.length) {
      setData(null)
      return
    }

    let cancelled = false

    async function poll() {
      for (const path of sessionPaths) {
        try {
          const result = await tryFetchPath(path)
          if (result) {
            if (!cancelled) setData(result)
            break
          }
        } catch { /* path failed, try next */ }
      }
      if (!cancelled) timerRef.current = setTimeout(poll, POLL_MS)
    }

    poll()
    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
    }
    // pathsKey covers sessionPaths changes; enabled is a primitive
  }, [pathsKey, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return data
}
