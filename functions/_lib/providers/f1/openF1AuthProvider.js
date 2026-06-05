/**
 * OpenF1 OAuth2 token helper — Cloudflare Pages Functions only.
 *
 * - Fetches a Bearer token using username/password from Cloudflare env secrets
 * - Caches token in module memory for its lifetime (with 60s expiry buffer)
 * - Token is NEVER returned to the browser or logged
 * - Credentials are NEVER exposed — only used server-side in this module
 */

let _token     = null
let _expiresAt = 0

export async function getOpenF1Token(env) {
  // Return cached token if still valid
  if (_token && Date.now() < _expiresAt - 60_000) return _token

  const username = env?.OPENF1_USERNAME
  const password = env?.OPENF1_PASSWORD

  if (!username || !password) {
    throw new Error('OPENF1_USERNAME / OPENF1_PASSWORD not configured in Cloudflare environment variables')
  }

  let res
  try {
    res = await fetch('https://api.openf1.org/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ grant_type: 'password', username, password }).toString(),
      signal:  AbortSignal.timeout(10_000),
    })
  } catch (err) {
    _token = null
    _expiresAt = 0
    throw new Error(`OpenF1 auth network error: ${err.message}`)
  }

  if (!res.ok) {
    _token = null
    _expiresAt = 0
    throw new Error(`OpenF1 authentication failed (HTTP ${res.status})`)
  }

  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('OpenF1 auth response was not valid JSON')
  }

  if (!data?.access_token) {
    throw new Error('OpenF1 auth response missing access_token')
  }

  _token     = data.access_token
  _expiresAt = data.expires_in
    ? Date.now() + Number(data.expires_in) * 1000
    : Date.now() + 3_600_000  // default 1h if not provided

  return _token
}

export function invalidateToken() {
  _token     = null
  _expiresAt = 0
}
