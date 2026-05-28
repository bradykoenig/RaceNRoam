import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getSeriesData as espnSeriesData } from '../../_lib/providers/espn/espnProvider.js'
import { getFallbackNascarData } from '../../_lib/providers/nascar/nascarFallbackProvider.js'
import { getCurrentWeather }     from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather }    from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

export async function onRequestGet({ env }) {
  const cached = await cacheGet(env, 'series:nascar')
  if (cached) return buildLiveResponse(cached.data, 'nascar', cached.source, 'standings')

  const fb = getFallbackNascarData()

  try {
    const espn = await espnSeriesData('nascar')

    // Only use ESPN race data if it has meaningful track/location info
    const espnRace = (espn.featuredRace?.track && espn.featuredRace.track !== 'TBD')
      ? { ...fb.featuredRace, ...espn.featuredRace }  // ESPN date + name on top of fallback detail
      : fb.featuredRace

    const data = {
      ...fb,
      featuredRace: espnRace,
      schedule:     espn.schedule?.length     ? espn.schedule     : fb.schedule,
      standings: {
        drivers: espn.standings.drivers.length ? espn.standings.drivers : fb.standings.drivers,
        teams:   fb.standings.teams,
      },
    }

    // Live weather for the track
    const track = data.featuredRace
    if (track?.lat != null || fb.track?.lat) {
      const lat = fb.track?.lat
      const lon = fb.track?.lon
      if (lat && lon) {
        try { data.weather = await getCurrentWeather({ lat, lon }) }
        catch { data.weather = getFallbackWeather(fb.track?.name) }
      }
    }

    await cacheSet(env, 'series:nascar', { data, source: 'espn' }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'nascar', 'espn', 'standings')
  } catch (err) {
    console.error('NASCAR ESPN failed:', err.message)
    if (fb.track?.lat) {
      try { fb.weather = await getCurrentWeather({ lat: fb.track.lat, lon: fb.track.lon }) }
      catch { fb.weather = getFallbackWeather(fb.track.name) }
    }
    return buildFallbackResponse(fb, 'nascar')
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
