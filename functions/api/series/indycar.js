import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../../_lib/utils/apiResponse.js'
import { getSeriesData as espnSeriesData } from '../../_lib/providers/espn/espnProvider.js'
import { getFallbackIndyCarData } from '../../_lib/providers/indycar/indycarFallbackProvider.js'
import { getCurrentWeather }      from '../../_lib/providers/weather/openMeteoProvider.js'
import { getFallbackWeather }     from '../../_lib/providers/weather/weatherFallbackProvider.js'
import { cacheGet, cacheSet, getCacheTtl } from '../../_lib/utils/cache.js'

export async function onRequestGet({ env }) {
  const cached = await cacheGet(env, 'series:indycar')
  if (cached) return buildLiveResponse(cached.data, 'indycar', cached.source, 'standings')

  const fb = getFallbackIndyCarData()

  try {
    const espn = await espnSeriesData('indycar')

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

    await cacheSet(env, 'series:indycar', { data, source: 'espn' }, getCacheTtl(env, 'standings'))
    return buildLiveResponse(data, 'indycar', 'espn', 'standings')
  } catch (err) {
    console.error('IndyCar ESPN failed:', err.message)
    if (fb.track?.lat) {
      try { fb.weather = await getCurrentWeather({ lat: fb.track.lat, lon: fb.track.lon }) }
      catch { fb.weather = getFallbackWeather(fb.track.name) }
    }
    return buildFallbackResponse(fb, 'indycar')
  }
}

export async function onRequestOptions() { return corsOptionsResponse() }
