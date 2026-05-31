/**
 * GET /api/live?series=f1|nascar|...
 *
 * F1 implementation spec:
 *  - Fetches OpenF1 REST endpoints via f1LiveProvider (each endpoint cached via cfCache)
 *  - Caches the full normalized payload in Cloudflare Cache for 10s
 *  - On ANY failure (429, network, timeout): returns last cached payload with stale flag
 *  - Never crashes the frontend — always returns a valid JSON response
 *  - Payload always includes: source, mode, dataAgeSeconds, fetchedAt
 */

import { corsOptionsResponse }    from '../_lib/utils/apiResponse.js'
import { getF1LiveData }          from '../_lib/providers/f1/f1LiveProvider.js'
import { getNascarLiveData }      from '../_lib/providers/nascar/nascarLiveProvider.js'

const CORS = { 'Access-Control-Allow-Origin': '*' }

// Cache the entire normalized response for 10s so many simultaneous viewers
// share one real OpenF1 call instead of each triggering their own.
const FULL_RESPONSE_CACHE_KEY = 'https://racenroam.com/__live_f1_payload'
const FULL_RESPONSE_TTL_S     = 10

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': 'no-store',
      ...CORS,
    },
  })
}

async function getCachedFullResponse() {
  try {
    const cache = await caches.open('racenroam-live-full')
    const hit   = await cache.match(FULL_RESPONSE_CACHE_KEY)
    if (!hit) return null
    const data = await hit.json()
    return data
  } catch { return null }
}

async function setCachedFullResponse(payload) {
  try {
    const cache = await caches.open('racenroam-live-full')
    const resp  = new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': `public, max-age=${FULL_RESPONSE_TTL_S}`,
      },
    })
    await cache.put(FULL_RESPONSE_CACHE_KEY, resp)
  } catch { /* non-fatal */ }
}

// ── F1 handler ────────────────────────────────────────────────────────────────

async function handleF1() {
  // 1. Check full-response cache (serves most requests with zero OpenF1 calls)
  const fullCached = await getCachedFullResponse()
  if (fullCached) {
    return jsonResponse({ ...fullCached, _fullCacheHit: true })
  }

  // 2. Fetch fresh data
  let payload
  try {
    payload = await getF1LiveData()
  } catch (err) {
    // 3. Fetch failed — return last stale payload if we have one, else a safe empty shell
    const stale = await getCachedFullResponse()
    if (stale) {
      return jsonResponse({
        ...stale,
        _stale:  true,
        _error:  err.message,
        mode:    'best_effort_live',
        source:  'OpenF1 free REST',
      })
    }

    // No cached data at all — return safe empty shell so frontend never crashes
    return jsonResponse({
      ok:             false,
      source:         'OpenF1 free REST',
      mode:           'best_effort_live',
      isLive:         false,
      _error:         err.message,
      dataAgeSeconds: null,
      fetchedAt:      new Date().toISOString(),
      positions:      [],
      raceControl:    [],
      trackStatus:    { label: 'NO DATA', color: '#444', type: 'unknown' },
      session:        null,
      weather:        null,
    })
  }

  // 4. Success — cache and return
  await setCachedFullResponse(payload)
  return jsonResponse(payload)
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequestGet({ request }) {
  const series = new URL(request.url).searchParams.get('series') || 'f1'

  if (series === 'f1') {
    return handleF1()
  }

  if (series === 'nascar') {
    try {
      const data = await getNascarLiveData()
      return jsonResponse({ ok: true, series: 'nascar', ...data })
    } catch (err) {
      return jsonResponse({ ok: false, series: 'nascar', isLive: false, error: err.message })
    }
  }

  const officialUrls = {
    indycar:  'https://racecontrol.indycar.com/timing',
    motogp:   'https://www.motogp.com/en/live',
    'imsa-wec': 'https://www.fiawec.com/en/live',
  }

  if (officialUrls[series]) {
    return jsonResponse({
      ok:          true,
      series,
      isLive:      false,
      noFreeApi:   true,
      officialUrl: officialUrls[series],
    })
  }

  return jsonResponse({ ok: false, series, isLive: false, error: 'Unknown series' }, 400)
}

export async function onRequestOptions() { return corsOptionsResponse() }
