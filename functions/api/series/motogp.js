import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getSeriesData as espnSeriesData } from '../../_lib/providers/espn/espnProvider.js'
import { getFallbackMotoGPData } from '../../_lib/providers/motogp/motogpFallbackProvider.js'
import { getCurrentWeather }     from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather }    from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

export async function onRequestGet({ env }) {
  const cached = await cacheGet(env, 'series:motogp')
  if (cached) return buildLiveResponse(cached.data, 'motogp', cached.source, 'standings')

  const fb = getFallbackMotoGPData()

  try {
    const espn = await espnSeriesData('motogp')

    const data = {
      ...fb,
      featuredRace: (espn.featuredRace?.track && espn.featuredRace.track !== "TBD") ? { ...fb.featuredRace, ...espn.featuredRace } : fb.featuredRace,
      schedule:     espn.schedule?.length     ? espn.schedule     : fb.schedule,
      standings: {
        drivers: espn.standings.drivers.length ? espn.standings.drivers : fb.standings.drivers,
        teams:   fb.standings.teams,
      },
    }

    if (fb.track?.lat) {
      try { data.weather = await getCurrentWeather({ lat: fb.track.lat, lon: fb.track.lon }) }
      catch { data.weather = getFallbackWeather(fb.track.name) }
    }

    await cacheSet(env, 'series:motogp', { data, source: 'espn' }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'motogp', 'espn', 'standings')
  } catch (err) {
    console.error('MotoGP ESPN failed:', err.message)
    if (fb.track?.lat) {
      try { fb.weather = await getCurrentWeather({ lat: fb.track.lat, lon: fb.track.lon }) }
      catch { fb.weather = getFallbackWeather(fb.track.name) }
    }
    return buildFallbackResponse(fb, 'motogp')
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
