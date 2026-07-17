// Utility: Build consistent, cache-controlled API responses for Cloudflare Functions

const CACHE_PRESETS = {
  live:      30,    // live session / timing: 30 seconds
  weather:   300,   // weather: 5 minutes
  standings: 300,   // standings + next race: 5 minutes (was 30 min — caused stale race data)
  schedule:  300,   // schedules: 5 minutes
  static:    3600,  // static info: 1 hour
}

export function buildResponse(body, options = {}) {
  const { status = 200, cachePreset = 'standings', ttlSeconds = null, extraHeaders = {} } = options
  const ttl = ttlSeconds ?? CACHE_PRESETS[cachePreset] ?? 300

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Cache-Control':               `public, s-maxage=${ttl}, stale-while-revalidate=60`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':'GET, OPTIONS',
      'X-Cache-TTL':                 String(ttl),
      ...extraHeaders,
    },
  })
}

export function buildLiveResponse(data, series, source, cachePreset = 'standings') {
  return buildResponse({
    ok: true,
    series,
    source,
    lastUpdated: new Date().toISOString(),
    cache: { status: 'MISS', ttlSeconds: CACHE_PRESETS[cachePreset] },
    data,
  }, { cachePreset })
}

export function buildFallbackResponse(data, series, warning) {
  return buildResponse({
    ok: true,
    series,
    source: 'fallback',
    warning: warning || 'Live provider unavailable or API key not configured. Using fallback data.',
    lastUpdated: new Date().toISOString(),
    cache: { status: 'MISS', ttlSeconds: CACHE_PRESETS.schedule },
    data,
  }, { cachePreset: 'schedule' })
}

export function buildErrorResponse(message, series = null, status = 500) {
  return buildResponse({
    ok: false,
    error: message,
    series,
    lastUpdated: new Date().toISOString(),
  }, { status, cachePreset: 'live' })
}

export function corsOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
