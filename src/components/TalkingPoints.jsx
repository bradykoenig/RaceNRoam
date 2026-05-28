export default function TalkingPoints({ points = [] }) {
  if (!points.length) return <p className="text-muted text-sm">No talking points available.</p>
  return (
    <div className="tp-list">
      {points.map((pt, i) => (
        <div key={i} className="tp-item">
          <span className="tp-num">{i + 1}.</span>
          <span className="tp-text">{pt}</span>
        </div>
      ))}
    </div>
  )
}
