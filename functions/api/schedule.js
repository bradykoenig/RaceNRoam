// GET /api/schedule?series=f1 – Returns schedule for a specific series
import { buildFallbackResponse, buildErrorResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getFallbackF1Data }     from '../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackNascarData } from '../_lib/providers/nascar/nascarFallbackProvider.js'
import { getFallbackIndyCarData }from '../_lib/providers/indycar/indycarFallbackProvider.js'
import { getFallbackImsaWecData }from '../_lib/providers/imsaWec/imsaWecFallbackProvider.js'
import { getFallbackMotoGPData } from '../_lib/providers/motogp/motogpFallbackProvider.js'

const FALLBACK_MAP = {
  f1:         () => getFallbackF1Data().schedule,
  nascar:     () => getFallbackNascarData().schedule,
  indycar:    () => getFallbackIndyCarData().schedule,
  'imsa-wec': () => getFallbackImsaWecData().schedule,
  motogp:     () => getFallbackMotoGPData().schedule,
}

export async function onRequestGet({ request }) {
  const series = new URL(request.url).searchParams.get('series')
  if (!series || !FALLBACK_MAP[series]) {
    return buildErrorResponse('series parameter required', null, 400)
  }
  const schedule = FALLBACK_MAP[series]()
  return buildFallbackResponse({ schedule }, series, 'Schedule from local fallback.')
}

export async function onRequestOptions() { return corsOptionsResponse() }
