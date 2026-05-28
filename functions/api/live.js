// GET /api/live?series=f1|nascar|indycar|motogp|imsa-wec
// Returns live session data when a race/session is active.
// F1:     OpenF1 (free, real-time)
// NASCAR: NASCAR.com public feed (free)
// Others: No free live API available

import { buildResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getF1LiveData, getF1Locations } from '../_lib/providers/f1/f1LiveProvider.js'
import { getNascarLiveData }              from '../_lib/providers/nascar/nascarLiveProvider.js'

const NOT_AVAILABLE = {
  'indycar':  { name: 'IndyCar',  url: 'https://racecontrol.indycar.com/timing' },
  'motogp':   { name: 'MotoGP',   url: 'https://www.motogp.com/en/live' },
  'imsa-wec': { name: 'IMSA/WEC', url: 'https://www.fiawec.com/en/live' },
}

function json(body, cacheSeconds = 30) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type':                'application/json',
      'Cache-Control':               `no-store, max-age=${cacheSeconds}`,
      'Access-Control-Allow-Origin': '*',
    },
  })
}

export async function onRequestGet({ request }) {
  const series = new URL(request.url).searchParams.get('series') || 'f1'

  // ── F1 via OpenF1 ─────────────────────────────────────────
  if (series === 'f1') {
    try {
      const data = await getF1LiveData()

      if (data.isLive && data.session?.key) {
        try {
          data.locations = await getF1Locations(data.session.key)
        } catch {
          data.locations = []
        }
      }

      return json({ ok: true, series: 'f1', ...data })
    } catch (err) {
      return json({ ok: false, series: 'f1', isLive: false, error: err.message })
    }
  }

  // ── NASCAR via NASCAR.com public feed ─────────────────────
  if (series === 'nascar') {
    try {
      const data = await getNascarLiveData()
      return json({ ok: true, series: 'nascar', ...data })
    } catch (err) {
      return json({ ok: false, series: 'nascar', isLive: false, error: err.message })
    }
  }

  // ── Other series – no free live timing API ────────────────
  const info = NOT_AVAILABLE[series]
  if (info) {
    return json({
      ok:          true,
      series,
      isLive:      false,
      noFreeApi:   true,
      officialUrl: info.url,
      message:     `No free live timing API is available for ${info.name}. Visit the official live timing page for real-time data.`,
    })
  }

  return json({ ok: false, series, isLive: false, error: 'Unknown series' }, 0)
}

export async function onRequestOptions() { return corsOptionsResponse() }
