// Optional Cloudflare KV caching layer
//
// To enable:
// 1. Create KV namespace: wrangler kv namespace create RACE_HUB_CACHE
// 2. Add binding in wrangler.toml:
//    [[kv_namespaces]]
//    binding = "RACE_HUB_CACHE"
//    id = "YOUR_NAMESPACE_ID"
// 3. KV will be auto-injected into env.RACE_HUB_CACHE by the Cloudflare runtime.

export async function cacheGet(env, key) {
  if (!env?.RACE_HUB_CACHE) return null
  try {
    const raw = await env.RACE_HUB_CACHE.get(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export async function cacheSet(env, key, value, ttlSeconds = 300) {
  if (!env?.RACE_HUB_CACHE) return
  try {
    await env.RACE_HUB_CACHE.put(key, JSON.stringify(value), {
      expirationTtl: Math.max(60, ttlSeconds),
    })
  } catch { /* KV failures are non-fatal */ }
}

export function getCacheTtl(env, preset = 'standings') {
  const defaults = { live: 30, weather: 600, standings: 1800, schedule: 3600, static: 86400 }
  const envKey = preset === 'live' ? 'LIVE_CACHE_TTL_SECONDS'
               : preset === 'weather' ? 'WEATHER_CACHE_TTL_SECONDS'
               : 'DEFAULT_CACHE_TTL_SECONDS'
  const envVal = env?.[envKey]
  return envVal ? parseInt(envVal, 10) : defaults[preset] || 300
}
