// GET /api/today – Returns the featured race across all series for today/this weekend
import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getFallbackF1Data }     from '../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackNascarData } from '../_lib/providers/nascar/nascarFallbackProvider.js'
import { getFallbackIndyCarData }from '../_lib/providers/indycar/indycarFallbackProvider.js'
import { getFallbackImsaWecData }from '../_lib/providers/imsaWec/imsaWecFallbackProvider.js'
import { getFallbackMotoGPData } from '../_lib/providers/motogp/motogpFallbackProvider.js'

const SERIES_ORDER = ['imsa-wec', 'f1', 'nascar', 'indycar', 'motogp']
const BASE_URL = 'https://racenroam.com'

const FALLBACK_MAP = {
  'f1':       getFallbackF1Data,
  'nascar':   getFallbackNascarData,
  'indycar':  getFallbackIndyCarData,
  'imsa-wec': getFallbackImsaWecData,
  'motogp':   getFallbackMotoGPData,
}

function getNextFromSeries(data) {
  const race = data.featuredRace
  if (!race?.date) return null
  return { series: data.series, seriesName: data.seriesName, raceDate: new Date(race.date) }
}

async function fetchSeriesData(series, baseUrl = BASE_URL) {
  try {
    const url = `${baseUrl}/api/series/${series}`
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    if (!response.ok) return null
    const json = await response.json()
    return json.data || json
  } catch (err) {
    console.error(`[today] Failed to fetch ${series}:`, err.message)
    return null
  }
}

export async function onRequestGet({ env, request }) {
  // Try to fetch real data from each series endpoint
  const allData = await Promise.all(
    SERIES_ORDER.map(async (s) => {
      const data = await fetchSeriesData(s)
      return data || FALLBACK_MAP[s]?.()
    })
  ).then(results => results.filter(Boolean))

  const now = Date.now()
  const window = 1000 * 60 * 60 * 6 // 6 hours

  // Prefer a race that's either live (within 4h of start) or upcoming within 7 days
  const candidates = allData
    .map(d => {
      const race = d.featuredRace
      if (!race?.date) return null
      const diff = new Date(race.date).getTime() - now
      return { data: d, diff }
    })
    .filter(c => c && c.diff > -window)
    .sort((a, b) => a.diff - b.diff)

  const featured = candidates[0]?.data || allData[0]

  if (!featured) {
    return buildFallbackResponse(getFallbackF1Data(), 'today', 'No upcoming race data available.')
  }

  return buildFallbackResponse(featured, 'today', 'Aggregated from real series APIs')
}

export async function onRequestOptions() { return corsOptionsResponse() }
