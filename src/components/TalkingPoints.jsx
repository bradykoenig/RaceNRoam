export default function TalkingPoints({ points = [] }) {
  if (!points.length) return <p className="text-muted text-sm">No race preview available.</p>
  return (
    <div className="tp-list">
      {points.map((pt, i) => (
        <div key={i} className="tp-item">
          {/* Handle both old format (string) and new format (object with title+content) */}
          {typeof pt === 'string' ? (
            <>
              <span className="tp-num">{i + 1}.</span>
              <span className="tp-text">{pt}</span>
            </>
          ) : (
            <>
              <span className="tp-num" style={{ fontWeight: 700 }}>{pt.title}</span>
              <span className="tp-text" style={{ marginLeft: '8px', color: '#aaa', fontSize: '0.9em' }}>{pt.content}</span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
