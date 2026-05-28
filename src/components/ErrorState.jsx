export default function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state fade-in">
      <div className="state-icon">⚠️</div>
      <p className="state-title">Something went wrong</p>
      <p className="state-msg">{message || 'Failed to load data. Check your connection or try again.'}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          ↻ Try Again
        </button>
      )}
    </div>
  )
}
