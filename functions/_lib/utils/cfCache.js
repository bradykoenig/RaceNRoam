/**
 * Cloudflare Cache API wrapper
 *
 * - Caches every OpenF1 HTTP request at the edge with a per-endpoint TTL
 * - On 429 (rate limit) or any network error, returns the last stale cached
 *   response so the frontend never receives an error payload
 * - cachedFetchJson always returns parsed JSON or throws with a clear message
 */

const CACHE_NAME = 'racenroam-openf1-v1'

export async function cachedFetch(url, options = {}, ttlSeconds = 30) {
  const cacheKey = new Request(url)

  let cache
  try {
    cache = await caches.open(CACHE_NAME)
  } catch {
    // Cloudflare Cache API unavailable (local dev) — fall through to live fetch
  }

  // ── 1. Try cache first ────────────────────────────────────────
  if (cache) {
    const hit = await cache.match(cacheKey).catch(() => null)
    if (hit) return hit.clone()
  }

  // ── 2. Fetch from origin ──────────────────────────────────────
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RaceNRoam/1.0',
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch (fetchErr) {
    // Network error — return stale cache if available
    if (cache) {
      const stale = await cache.match(cacheKey).catch(() => null)
      if (stale) {
        console.warn(`[cfCache] network error for ${url} — serving stale`)
        return stale.clone()
      }
    }
    throw new Error(`OpenF1 fetch failed: ${fetchErr.message}`)
  }

  // ── 3. Rate limited — return stale cache or throw ─────────────
  if (response.status === 429) {
    console.warn(`[cfCache] 429 rate limit on ${url}`)
    if (cache) {
      const stale = await cache.match(cacheKey).catch(() => null)
      if (stale) return stale.clone()
    }
    throw new Error(`OpenF1 rate limited (429): ${url}`)
  }

  // ── 4. Other non-OK response ──────────────────────────────────
  if (!response.ok) {
    if (cache) {
      const stale = await cache.match(cacheKey).catch(() => null)
      if (stale) return stale.clone()
    }
    throw new Error(`OpenF1 HTTP ${response.status}: ${url}`)
  }

  // ── 5. Success — cache and return ────────────────────────────
  const body = await response.text()
  const toCache = new Response(body, {
    status: 200,
    headers: {
      'Content-Type':  'application/json',
      'Cache-Control': `public, max-age=${ttlSeconds}`,
      'x-cached-at':   new Date().toISOString(),
    },
  })

  // Don't cache empty arrays — they may be transient API gaps (e.g. OpenF1 missing year data)
  const trimmed = body.trim()
  const isEmptyArray = trimmed === '[]'
  if (cache && !isEmptyArray) {
    await cache.put(cacheKey, toCache.clone()).catch(() => {})
  }

  return toCache
}

export async function cachedFetchJson(url, options = {}, ttlSeconds = 30) {
  const res = await cachedFetch(url, options, ttlSeconds)
  return res.json()
}
