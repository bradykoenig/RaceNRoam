// Cloudflare Cache API wrapper — caches responses at the edge
// No KV needed. Works natively in all Cloudflare Workers/Pages Functions.
// Serves stale data on rate limits so streams are never interrupted.

const CACHE_NAME = 'racenroam-f1-cache'

export async function cachedFetch(url, options = {}, ttlSeconds = 30) {
  const cacheKey = new Request(url)

  try {
    const cache = await caches.open(CACHE_NAME)

    // Try cache first
    const cached = await cache.match(cacheKey)
    if (cached) {
      const age = cached.headers.get('x-cache-age')
      console.log(`Cache HIT: ${url} (age: ${age}s)`)
      return cached.clone()
    }

    // Fetch fresh
    const response = await fetch(url, {
      ...options,
      headers: { 'Accept': 'application/json', 'User-Agent': 'RaceNRoam/1.0', ...(options.headers || {}) },
    })

    if (response.ok) {
      // Clone and cache with TTL headers
      const body = await response.text()
      const cachedResponse = new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttlSeconds}`,
          'x-cache-age': '0',
          'x-cached-at': new Date().toISOString(),
        },
      })
      await cache.put(cacheKey, cachedResponse.clone())
      return cachedResponse
    }

    // On rate limit (429) — return stale cache if available
    if (response.status === 429) {
      console.warn(`Rate limited on ${url} — serving stale cache`)
      const stale = await cache.match(cacheKey)
      if (stale) return stale.clone()
    }

    return response
  } catch (err) {
    console.error(`cachedFetch error for ${url}:`, err.message)
    // Try cache as emergency fallback
    try {
      const cache = await caches.open(CACHE_NAME)
      const stale = await cache.match(cacheKey)
      if (stale) {
        console.warn(`Using stale cache as emergency fallback for ${url}`)
        return stale.clone()
      }
    } catch {}
    throw err
  }
}

export async function cachedFetchJson(url, options = {}, ttlSeconds = 30) {
  const response = await cachedFetch(url, options, ttlSeconds)
  return response.json()
}
