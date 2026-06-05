import { useState, useCallback, useEffect, useRef } from 'react'
import { getLiveData } from '../lib/api/client.js'

// Polls /api/live — adaptive delay based on live state
// Live:     5s  (cache TTLs are now 2-4s, so 5s catches fresh data promptly)
// Pre/post: 60s (session schedule doesn't change that fast)
const LIVE_MS    =  5_000
const IDLE_MS    = 30_000  // 30s catches session transitions within half a minute

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
      // Only replace data if we got a valid response — preserves last-good state on API blips
      if (result != null) {
        setData(result)
        isLiveRef.current = result?.mode === 'live' || result?.mode === 'best_effort_live' || !!result?.isLive
      }
    } catch { /* silently fail — keep last known data */ }
    finally { setLoading(false) }
  }, [series, enabled])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const schedule = () => {
      if (cancelled) return
      const delay = isLiveRef.current ? LIVE_MS : IDLE_MS
      timerRef.current = setTimeout(async () => {
        if (!cancelled && !document.hidden) await doFetch()
        schedule()
      }, delay)
    }

    // Immediately refetch when the tab becomes visible — avoids stale data
    // after a streamer alt-tabs away and comes back mid-session.
    const onVisible = () => {
      if (!document.hidden && isLiveRef.current) {
        clearTimeout(timerRef.current)
        if (!cancelled) doFetch().then(schedule)
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    doFetch().then(schedule)

    return () => {
      cancelled = true
      clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [doFetch, enabled])

  return { liveData: data, liveLoading: loading, refetchLive: doFetch }
}
