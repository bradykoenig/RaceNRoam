// GET /api/today – Returns the featured race across all series for today/this weekend
import { buildLiveResponse, buildFallbackResponse, corsOptionsResponse } from '../_lib/utils/apiResponse.js'
import { getFallbackF1Data }     from '../_lib/providers/f1/f1FallbackProvider.js'
import { getFallbackNascarData } from '../_lib/providers/nascar/nascarFallbackProvider.js'
import { getFallbackIndyCarData }from '../_lib/providers/indycar/indycarFallbackProvider.js'
import { getFallbackImsaWecData }from '../_lib/providers/imsaWec/imsaWecFallbackProvider.js'
import { getFallbackMotoGPData } from '../_lib/providers/motogp/motogpFallbackProvider.js'

const SERIES_ORDER = ['imsa-wec', 'f1', 'nascar', 'indycar', 'motogp']

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

export async function onRequestGet({ env, request }) {
  const allData = SERIES_ORDER.map(s => {
    const fn = FALLBACK_MAP[s]
    return fn ? fn() : null
  }).filter(Boolean)

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

  return buildFallbackResponse(featured, 'today', 'Using local fallback data. API calls happen per-series.')
}

export async function onRequestOptions() { return corsOptionsResponse() }
