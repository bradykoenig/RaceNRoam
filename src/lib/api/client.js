import { ENDPOINTS } from './endpoints.js'
import {
  getFallbackF1Data,
  getFallbackNascarData,
  getFallbackIndyCarData,
  getFallbackImsaWecData,
  getFallbackMotoGPData,
  getCalendarFallback,
} from '../../data/fallback/index.js'

// Request timeout in ms
const TIMEOUT_MS = 8000

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function apiGet(url) {
  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    return null
  }
}

// Map series slug to local fallback getter
const fallbackMap = {
  f1:         getFallbackF1Data,
  nascar:     getFallbackNascarData,
  indycar:    getFallbackIndyCarData,
  'imsa-wec': getFallbackImsaWecData,
  motogp:     getFallbackMotoGPData,
}

function wrapFallback(series, data) {
  return {
    ok: true,
    series,
    source: 'local-fallback',
    warning: 'API unavailable – using local fallback data.',
    lastUpdated: new Date().toISOString(),
    data,
  }
}

// --- Public API ---

export async function getHealth() {
  return apiGet(ENDPOINTS.health)
}

export async function getToday() {
  const result = await apiGet(ENDPOINTS.today)
  if (result) return result
  const fb = getFallbackF1Data()
  return wrapFallback('today', fb)
}

export async function getSeries(series) {
  const result = await apiGet(ENDPOINTS.series(series))
  if (result?.ok) return result
  const fbFn = fallbackMap[series]
  const data  = fbFn ? fbFn() : {}
  return wrapFallback(series, data)
}

export async function getCalendar() {
  const result = await apiGet(ENDPOINTS.calendar)
  if (result?.ok) return result
  return wrapFallback('calendar', { events: getCalendarFallback() })
}

export async function getWeather(params) {
  if (!params?.lat || !params?.lon) return null
  return apiGet(ENDPOINTS.weather(params))
}

export async function getStandings(series) {
  const result = await apiGet(ENDPOINTS.standings(series))
  if (result?.ok) return result
  const fbFn = fallbackMap[series]
  const data  = fbFn ? fbFn() : {}
  return wrapFallback(series, data?.standings || {})
}

export async function getLiveData(series) {
  return apiGet(ENDPOINTS.live(series))
}

export async function getStreamMode(series) {
  const result = await apiGet(ENDPOINTS.streamMode(series))
  if (result?.ok) return result
  const fbFn = fallbackMap[series]
  const data  = fbFn ? fbFn() : {}
  return wrapFallback(series, data)
}
