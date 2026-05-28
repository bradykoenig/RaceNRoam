import { buildResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'

export async function onRequestGet({ env }) {
  return buildResponse({
    ok:          true,
    service:     'RaceNRoam Live Race Hub',
    version:     '1.0.0',
    timestamp:   new Date().toISOString(),
    environment: {
      liveF1:      env?.ENABLE_LIVE_F1      === 'true',
      liveNascar:  env?.ENABLE_LIVE_NASCAR  === 'true',
      liveIndyCar: env?.ENABLE_LIVE_INDYCAR === 'true',
      liveImsaWec: env?.ENABLE_LIVE_IMSA_WEC=== 'true',
      liveMotoGP:  env?.ENABLE_LIVE_MOTOGP  === 'true',
      kvCache:     !!env?.RACE_HUB_CACHE,
      weatherProvider: env?.WEATHER_PROVIDER || 'open-meteo',
    },
    providers: {
      f1:       ['openf1', 'jolpica', 'fallback'],
      nascar:   env?.SPORTSRADAR_API_KEY ? ['sportradar', 'fallback'] : env?.SPORTSDATA_IO_API_KEY ? ['sportsdata', 'fallback'] : ['fallback'],
      indycar:  env?.DATASPORTSGROUP_API_KEY || env?.GENERIC_MOTORSPORTS_API_KEY ? ['generic', 'fallback'] : ['fallback'],
      imsaWec:  env?.DATASPORTSGROUP_API_KEY || env?.GENERIC_MOTORSPORTS_API_KEY ? ['generic', 'fallback'] : ['fallback'],
      motogp:   env?.DATASPORTSGROUP_API_KEY || env?.GENERIC_MOTORSPORTS_API_KEY ? ['generic', 'fallback'] : ['fallback'],
    },
  }, { cachePreset: 'live' })
}

export async function onRequestOptions() { return corsOptionsResponse() }
