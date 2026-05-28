import { buildResponse, buildFallbackResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getCurrentWeather }  from '../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather } from '../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../_lib/utils/cache.js'

export async function onRequestGet({ request, env }) {
  const url    = new URL(request.url)
  const lat    = parseFloat(url.searchParams.get('lat'))
  const lon    = parseFloat(url.searchParams.get('lon'))
  const track  = url.searchParams.get('track') || ''

  if (!lat || !lon) {
    return buildResponse({ ok: false, error: 'lat and lon query parameters are required' }, { status: 400, cachePreset: 'live' })
  }

  const cacheKey = `weather:${lat.toFixed(3)},${lon.toFixed(3)}`
  const cached   = await cacheGet(env, cacheKey)
  if (cached) {
    return buildResponse({ ...cached, cache: { status: 'HIT', ttlSeconds: getCacheTtl(env, 'weather') } }, { cachePreset: 'weather' })
  }

  try {
    const weather = await getCurrentWeather({ lat, lon })
    if (!weather) throw new Error('No weather data returned')
    const result = { ok: true, series: 'weather', source: 'open-meteo', lastUpdated: new Date().toISOString(), data: { weather } }
    await cacheSet(env, cacheKey, result, getCacheTtl(env, 'weather'))
    return buildResponse({ ...result, cache: { status: 'MISS' } }, { cachePreset: 'weather' })
  } catch {
    const fb = getFallbackWeather(track)
    return buildFallbackResponse({ weather: fb }, 'weather', `Weather API unavailable. Using fallback for: ${track || 'unknown track'}`)
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
