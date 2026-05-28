// GET /api/standings?series=f1 – Redirect to series-specific handler or return standings only
import { buildFallbackResponse, buildErrorResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getFallbackF1Data }     from '../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackNascarData } from '../_lib/providers/nascar/nascarFallbackProvider.js'
import { getFallbackIndyCarData }from '../_lib/providers/indycar/indycarFallbackProvider.js'
import { getFallbackImsaWecData }from '../_lib/providers/imsaWec/imsaWecFallbackProvider.js'
import { getFallbackMotoGPData } from '../_lib/providers/motogp/motogpFallbackProvider.js'

const FALLBACK_MAP = {
  f1:       () => getFallbackF1Data().standings,
  nascar:   () => getFallbackNascarData().standings,
  indycar:  () => getFallbackIndyCarData().standings,
  'imsa-wec': () => getFallbackImsaWecData().standings,
  motogp:   () => getFallbackMotoGPData().standings,
}

export async function onRequestGet({ request }) {
  const series = new URL(request.url).searchParams.get('series')
  if (!series || !FALLBACK_MAP[series]) {
    return buildErrorResponse('series parameter required. Valid: f1, nascar, indycar, imsa-wec, motogp', null, 400)
  }
  const standings = FALLBACK_MAP[series]()
  return buildFallbackResponse(standings, series, 'Standings data from local fallback.')
}

export async function onRequestOptions() { return corsOptionsResponse() }
