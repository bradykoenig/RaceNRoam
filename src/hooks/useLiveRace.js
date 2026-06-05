import { useState, useCallback, useEffect, useRef } from 'react'
import { getLiveData } from '../lib/api/client.js'

// Polls /api/live — adaptive delay based on live state
// Live:     15s (edge cache refreshes every 10s, OpenF1 data ~30s delayed total)
// Pre/post: 60s (session schedule doesn't change that fast)
const LIVE_MS    = 15_000
const IDLE_MS    = 60_000

export function useLiveRace(series, enabled = true) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const isLiveRef = useRef(false)
  const timerRef  = useRef(null)

  const doFetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const result = await getLiveData(series)
      setData(result)
      isLiveRef.current = !!result?.isLive
    } catch { /* silently fail — keep last known data */ }
    finally { setLoading(false) }
  }, [series, enabled])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    // Recursive setTimeout so each tick re-reads the current live state
    // before scheduling the next one — unlike setInterval which fixes the
    // delay at mount time and never adapts.
    const schedule = () => {
      if (cancelled) return
      const delay = isLiveRef.current ? LIVE_MS : IDLE_MS
      timerRef.current = setTimeout(async () => {
        if (!cancelled && !document.hidden) await doFetch()
        schedule()
      }, delay)
    }

    // Initial fetch then start the adaptive loop
    doFetch().then(schedule)

    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
    }
  }, [doFetch, enabled])

  return { liveData: data, liveLoading: loading, refetchLive: doFetch }
}
