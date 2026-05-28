// NASCAR live data via NASCAR.com public JSON feed (no API key required)
// NASCAR.com uses this endpoint internally for their live race tracker.

const LIVE_FEED_URL = 'https://cf.nascar.com/live/feeds/live-feed.json'

const FLAG_LABELS = {
  0: 'no-session',
  1: 'green',
  2: 'yellow',
  3: 'red',
  4: 'checkered',
  8: 'white',
  9: 'cold',
}

export async function getNascarLiveData() {
  const res = await fetch(LIVE_FEED_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'RaceNRoam/1.0' },
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`NASCAR live feed → HTTP ${res.status}`)
  const data = await res.json()

  const flag = data.flag_state ?? 0
  // Not an active session
  if (flag === 0 || flag === 9) return { isLive: false, source: 'nascar-live' }

  const isRacing = flag === 1 || flag === 2 || flag === 3

  const vehicles = (data.vehicles || [])
    .sort((a, b) => (a.running_position ?? 99) - (b.running_position ?? 99))

  const positions = vehicles.map(v => {
    const first = v.driver?.first_name || ''
    const last  = v.driver?.last_name  || ''
    const name  = v.driver?.full_name || `${first} ${last}`.trim() || `#${v.vehicle_number}`
    return {
      pos:          v.running_position,
      number:       String(v.vehicle_number || ''),
      driver:       name,
      short:        last || String(v.vehicle_number),
      team:         v.sponsor_name || '',
      teamColor:    null,
      laps:         v.laps_completed ?? 0,
      gap:          v.running_position === 1 ? 'LEADER' : v.delta ?? null,
      lastSpeed:    v.last_lap_speed ? `${v.last_lap_speed.toFixed(1)} mph` : null,
      lastPitLap:   v.last_pit?.pit_in_lap_count ?? null,
      onTrack:      !!v.is_on_track,
      status:       v.vehicle_status || 'Running',
    }
  })

  return {
    isLive: isRacing,
    source: 'nascar-live',
    session: {
      name:        data.run_name || 'Race',
      type:        data.run_type === 3 ? 'Race' : data.run_type === 2 ? 'Qualifying' : 'Practice',
      lap:         data.lap_number ?? 0,
      totalLaps:   data.laps_in_race ?? 0,
      lapsToGo:    data.laps_to_go ?? 0,
      elapsed:     data.elapsed_time,
      flag:        FLAG_LABELS[flag] || 'unknown',
      cautions:    data.number_of_caution_segments ?? 0,
      cautionLaps: data.number_of_caution_laps ?? 0,
      leadChanges: data.number_of_lead_changes ?? 0,
    },
    positions,
    raceControl: [],
    weather:     null,
  }
}
