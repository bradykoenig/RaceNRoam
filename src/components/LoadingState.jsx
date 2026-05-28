export default function LoadingState({ message = 'Loading race data…' }) {
  return (
    <div className="loading-state fade-in">
      <div className="spinner" />
      <p className="state-msg">{message}</p>
    </div>
  )
}
