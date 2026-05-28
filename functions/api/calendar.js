// GET /api/calendar
// Sources:
//   F1:              Jolpica (free, full season schedule)
//   NASCAR/IndyCar/MotoGP: ESPN public API (free, current + upcoming events)
//   WEC/IMSA:        Static (no reliable free API for endurance calendar)

import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getCurrentSeasonSchedule } from '../_lib/providers/f1/jolpicaProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../_lib/utils/cache.js'

const YEAR = new Date().getFullYear()

const ESPN_SERIES = [
  { series: 'nascar',  league: 'nascar-premier' },
  { series: 'indycar', league: 'indycar' },
  { series: 'motogp',  league: 'moto-gp' },
]

async function fetchEspnEvents(league) {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/racing/${league}/scoreboard?limit=60`,
    { headers: { Accept: 'application/json', 'User-Agent': 'RaceNRoam/1.0' } }
  )
  if (!res.ok) throw new Error(`ESPN ${league} → ${res.status}`)
  const data = await res.json()
  return data.events || []
}

function espnToEvent(event, series) {
  const comp     = event.competitions?.[0]
  const venue    = comp?.venue
  const addr     = venue?.address || {}
  const location = [addr.city, addr.state || addr.country].filter(Boolean).join(', ')
  const date     = comp?.date || event.date
  const done     = event.status?.type?.completed === true

  return {
    id:       `${series}-espn-${event.id}`,
    series,
    name:     event.name || event.shortName || 'Race',
    track:    venue?.fullName || '',
    location: location || 'TBD',
    date,
    status:   done ? 'Completed' : 'Upcoming',
    round:    event.week?.number ?? null,
  }
}

function jolpicaToEvent(race) {
  const done = new Date(race.date).getTime() < Date.now() - 1000 * 60 * 60 * 4
  return {
    id:       `f1-${YEAR}-r${race.round}`,
    series:   'f1',
    name:     race.name,
    track:    race.circuit,
    location: race.location,
    date:     race.date,
    status:   done ? 'Completed' : 'Upcoming',
    round:    race.round,
  }
}

// WEC/IMSA static – ESPN coverage is unreliable for endurance calendar
const WEC_EVENTS = [
  { id:`wec-qatar-${YEAR}`,     series:'imsa-wec', name:'1812 km of Qatar',            track:'Lusail International Circuit',       location:'Lusail, Qatar',           date:`${YEAR}-03-01T15:00:00+03:00`, status:'Completed', round:1 },
  { id:`wec-spa-${YEAR}`,       series:'imsa-wec', name:'6 Hours of Spa-Francorchamps', track:'Circuit de Spa-Francorchamps',        location:'Stavelot, Belgium',        date:`${YEAR}-04-25T12:00:00+02:00`, status:'Completed', round:2 },
  { id:`wec-lemans-${YEAR}`,    series:'imsa-wec', name:'24 Hours of Le Mans',          track:'Circuit de la Sarthe',               location:'Le Mans, France',          date:`${YEAR}-06-13T16:00:00+02:00`, status:'Upcoming',  round:4 },
  { id:`wec-portimao-${YEAR}`,  series:'imsa-wec', name:'6 Hours of Portimão',          track:'Autodromo Internacional do Algarve', location:'Portimão, Portugal',       date:`${YEAR}-07-12T12:00:00+01:00`, status:'Upcoming',  round:5 },
  { id:`wec-saopaulo-${YEAR}`,  series:'imsa-wec', name:'6 Hours of São Paulo',         track:'Autodromo José Carlos Pace',         location:'São Paulo, Brazil',        date:`${YEAR}-09-13T12:00:00-03:00`, status:'Upcoming',  round:6 },
  { id:`wec-fuji-${YEAR}`,      series:'imsa-wec', name:'6 Hours of Fuji',              track:'Fuji Speedway',                      location:'Oyama, Japan',             date:`${YEAR}-09-20T11:00:00+09:00`, status:'Upcoming',  round:7 },
  { id:`wec-bahrain-${YEAR}`,   series:'imsa-wec', name:'8 Hours of Bahrain',           track:'Bahrain International Circuit',      location:'Sakhir, Bahrain',          date:`${YEAR}-11-07T15:00:00+03:00`, status:'Upcoming',  round:8 },
  { id:`imsa-rolex24-${YEAR}`,  series:'imsa-wec', name:'Rolex 24 at Daytona',          track:'Daytona International Speedway',     location:'Daytona Beach, Florida',   date:`${YEAR}-01-25T13:35:00-05:00`, status:'Completed', round:1 },
  { id:`imsa-sebring-${YEAR}`,  series:'imsa-wec', name:'12 Hours of Sebring',          track:'Sebring International Raceway',      location:'Sebring, Florida',         date:`${YEAR}-03-14T10:00:00-04:00`, status:'Completed', round:2 },
  { id:`imsa-petit-${YEAR}`,    series:'imsa-wec', name:'Petit Le Mans',                track:'Road Atlanta',                       location:'Braselton, Georgia',       date:`${YEAR}-10-03T11:10:00-04:00`, status:'Upcoming',  round:9 },
]

export async function onRequestGet({ env }) {
  const cacheKey = `calendar:live:${YEAR}`
  const cached   = await cacheGet(env, cacheKey)
  if (cached) return buildLiveResponse(cached.data, 'calendar', cached.source, 'schedule')

  const events  = []
  const sources = []

  // ── F1 via Jolpica (complete, authoritative) ──────────────
  try {
    const f1 = await getCurrentSeasonSchedule()
    if (f1?.length) {
      events.push(...f1.map(jolpicaToEvent))
      sources.push('jolpica')
    }
  } catch (e) {
    console.error('Calendar Jolpica F1:', e.message)
  }

  // ── NASCAR / IndyCar / MotoGP via ESPN ────────────────────
  for (const { series, league } of ESPN_SERIES) {
    try {
      const espnEvents = await fetchEspnEvents(league)
      if (espnEvents.length) {
        events.push(...espnEvents.map(e => espnToEvent(e, series)))
        if (!sources.includes('espn')) sources.push('espn')
      }
    } catch (e) {
      console.error(`Calendar ESPN ${series}:`, e.message)
    }
  }

  // ── WEC/IMSA static ───────────────────────────────────────
  events.push(...WEC_EVENTS)
  if (!sources.includes('wec-static')) sources.push('wec-static')

  if (!events.length) {
    return buildFallbackResponse({ events: [] }, 'calendar')
  }

  // Deduplicate by id, sort by date
  const seen   = new Set()
  const merged = events
    .filter(e => {
      if (!e.date || !e.name || seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const source = sources.join('+')
  await cacheSet(env, cacheKey, { data: { events: merged }, source }, getCacheTtl(env, 'schedule'))
  return buildLiveResponse({ events: merged }, 'calendar', source, 'schedule')
}

export async function onRequestOptions() { return corsOptionsResponse() }
