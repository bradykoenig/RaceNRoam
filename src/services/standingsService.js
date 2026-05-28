import { getStandings } from '../lib/api/client.js'

export async function getSeriesStandings(series) {
  return getStandings(series)
}

export function formatPoints(pts) {
  if (pts == null) return '--'
  return Number(pts).toLocaleString()
}

export function getPositionClass(pos) {
  if (pos === 1) return 'p1'
  if (pos === 2) return 'p2'
  if (pos === 3) return 'p3'
  return ''
}
