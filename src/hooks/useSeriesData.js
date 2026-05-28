import { useState, useCallback, useEffect } from 'react'
import { getSeries } from '../lib/api/client.js'

export function useSeriesData(series) {
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [lastFetch, setLastFetch] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getSeries(series)
      setData(result)
      setLastFetch(new Date())
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [series])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, lastFetch }
}
