// GET /api/stream-mode?series=f1 – Returns a compact payload optimized for Stream Mode display
import { buildFallbackResponse, buildErrorResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getFallbackF1Data }     from '../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackNascarData } from '../_lib/providers/nascar/nascarFallbackProvider.js'
import { getFallbackIndyCarData }from '../_lib/providers/indycar/indycarFallbackProvider.js'
import { getFallbackImsaWecData }from '../_lib/providers/imsaWec/imsaWecFallbackProvider.js'
import { getFallbackMotoGPData } from '../_lib/providers/motogp/motogpFallbackProvider.js'

const FALLBACK_MAP = {
  f1:         getFallbackF1Data,
  nascar:     getFallbackNascarData,
  indycar:    getFallbackIndyCarData,
  'imsa-wec': getFallbackImsaWecData,
  motogp:     getFallbackMotoGPData,
}

function buildStreamPayload(data) {
  return {
    series:      data.series,
    seriesName:  data.seriesName,
    featuredRace: data.featuredRace,
    weather:     data.weather,
    standings: {
      drivers: (data.standings?.drivers || []).slice(0, 6),
      teams:   (data.standings?.teams   || []).slice(0, 3),
    },
    talkingPoints: (data.talkingPoints || []).slice(0, 4),
    schedule:      (data.schedule || []).slice(0, 5),
  }
}

export async function onRequestGet({ request }) {
  const url    = new URL(request.url)
  const series = url.searchParams.get('series') || 'f1'

  if (!FALLBACK_MAP[series]) {
    return buildErrorResponse(`Unknown series: ${series}. Valid: f1, nascar, indycar, imsa-wec, motogp`, null, 400)
  }

  const data    = FALLBACK_MAP[series]()
  const payload = buildStreamPayload(data)
  return buildFallbackResponse(payload, series, 'Stream mode using local fallback data.')
}

export async function onRequestOptions() { return corsOptionsResponse() }
