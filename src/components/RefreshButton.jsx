import { useState } from 'react'

export default function RefreshButton({ onRefresh, label = 'Refresh' }) {
  const [spinning, setSpinning] = useState(false)

  async function handleClick() {
    if (spinning) return
    setSpinning(true)
    try { await onRefresh?.() } finally {
      setTimeout(() => setSpinning(false), 600)
    }
  }

  return (
    <button
      className={`refresh-btn${spinning ? ' spinning' : ''}`}
      onClick={handleClick}
      disabled={spinning}
      title="Refresh data"
    >
      <span className="refresh-icon" style={{ display: 'inline-block' }}>↻</span>
      {label}
    </button>
  )
}
