import { useState, useEffect, useRef } from 'react'

function calcTimeLeft(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) return null
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  return { days, hours, minutes, seconds, totalMs: diff }
}

export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate))
  const rafRef = useRef(null)

  useEffect(() => {
    if (!targetDate) return
    let lastTick = 0
    function tick(ts) {
      if (ts - lastTick >= 1000) {
        lastTick = ts
        setTimeLeft(calcTimeLeft(targetDate))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [targetDate])

  return timeLeft
}
