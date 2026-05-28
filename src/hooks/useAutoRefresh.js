import { useEffect, useRef } from 'react'

export function useAutoRefresh(callback, intervalMs, enabled = true) {
  const cbRef = useRef(callback)
  useEffect(() => { cbRef.current = callback }, [callback])

  useEffect(() => {
    if (!enabled || !intervalMs) return
    const id = setInterval(() => cbRef.current(), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
