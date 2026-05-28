import { useState, useCallback, useEffect, useRef } from 'react'
import { getLiveData } from '../lib/api/client.js'

// Polls /api/live – fast when racing, slow when not
export function useLiveRace(series, enabled = true) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const isLiveRef = useRef(false)

  const fetch = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const result = await getLiveData(series)
      setData(result)
      isLiveRef.current = !!result?.isLive
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [series, enabled])

  useEffect(() => {
    if (!enabled) return
    fetch()
    const id = setInterval(() => {
      if (!document.hidden) fetch()
    }, isLiveRef.current ? 20_000 : 60_000)
    return () => clearInterval(id)
  }, [fetch, enabled])

  return { liveData: data, liveLoading: loading, refetchLive: fetch }
}
