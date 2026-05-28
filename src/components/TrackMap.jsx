// SVG track map component
// F1: uses real X/Y coordinates from OpenF1's /location endpoint
// Others: distributes cars around a generic oval shape

function normalize(vals, outMin, outMax) {
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  return vals.map(v => outMin + ((v - min) / range) * (outMax - outMin))
}

// Real track map using OpenF1 X/Y location data
function F1TrackMap({ locations, positions }) {
  if (!locations?.length) return null

  const W = 460, H = 280, PAD = 24
  const xs = normalize(locations.map(l => l.x), PAD, W - PAD)
  const ys = normalize(locations.map(l => l.y), PAD, H - PAD)

  const posLookup = {}
  for (const p of positions || []) posLookup[p.number] = p

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="track-map-svg" aria-label="Live track position map">
      {/* Background */}
      <rect width={W} height={H} fill="#07070b" rx="4" />

      {/* Cars as team-colored dots */}
      {locations.map((loc, i) => {
        const driver = posLookup[loc.driver_number]
        const color  = driver?.teamColor || '#555'
        const x = xs[i], y = ys[i]
        const isTop3 = driver?.pos <= 3

        return (
          <g key={loc.driver_number}>
            {isTop3 && (
              <circle cx={x} cy={y} r={11} fill={color} opacity={0.25} />
            )}
            <circle cx={x} cy={y} r={isTop3 ? 7 : 5} fill={color} />
            {driver?.pos === 1 && (
              <circle cx={x} cy={y} r={9} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
            )}
            <text
              x={x} y={y - (isTop3 ? 12 : 9)}
              textAnchor="middle"
              fontSize={isTop3 ? '9' : '7.5'}
              fontWeight={isTop3 ? '800' : '600'}
              fontFamily="var(--font-display)"
              fill="#fff"
              letterSpacing="0.04em"
            >
              {driver?.short || loc.driver_number}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// Generic oval/circuit visualization — positions cars evenly around track shape
function OvalTrackMap({ positions, series }) {
  const W = 460, H = 200
  const cx = W / 2, cy = H / 2

  // Slightly different shapes per category
  const rx = series === 'nascar' ? 175 : 160
  const ry = series === 'nascar' ? 60  : 70

  const total = Math.max(positions?.length || 20, 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="track-map-svg" aria-label="Race position map">
      <rect width={W} height={H} fill="#07070b" rx="4" />
      {/* Track surface */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#1e1e28" strokeWidth="22" />
      {/* Track edge lines */}
      <ellipse cx={cx} cy={cy} rx={rx + 11} ry={ry + 11} fill="none" stroke="#141420" strokeWidth="1.5" />
      <ellipse cx={cx} cy={cy} rx={rx - 11} ry={ry - 11} fill="none" stroke="#141420" strokeWidth="1.5" />
      {/* Start/finish marker */}
      <line
        x1={cx} y1={cy - ry - 14}
        x2={cx} y2={cy - ry + 14}
        stroke="#e8002d" strokeWidth="2"
      />

      {/* Cars */}
      {(positions || []).map((p, i) => {
        const angle = ((i) / total) * 2 * Math.PI - Math.PI / 2
        const x = cx + Math.cos(angle) * rx
        const y = cy + Math.sin(angle) * ry
        const isTop3 = p.pos <= 3

        return (
          <g key={p.number || i}>
            {isTop3 && (
              <circle cx={x} cy={y} r={10} fill={p.teamColor || '#555'} opacity={0.2} />
            )}
            <circle cx={x} cy={y} r={isTop3 ? 7 : 5} fill={p.teamColor || '#555555'} />
            <text
              x={x} y={y - (isTop3 ? 11 : 9)}
              textAnchor="middle"
              fontSize={isTop3 ? '8.5' : '7'}
              fontWeight="800"
              fontFamily="var(--font-display)"
              fill="#fff"
              letterSpacing="0.04em"
            >
              {p.short || p.number}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function TrackMap({ locations, positions, series }) {
  const hasLocations = Array.isArray(locations) && locations.length > 3

  return (
    <div className="track-map-wrap">
      <div className="track-map-label">
        {hasLocations ? 'Live Track Positions' : 'Race Order'}
        {hasLocations && <span className="live-dot-inline" />}
      </div>
      {hasLocations
        ? <F1TrackMap locations={locations} positions={positions} />
        : <OvalTrackMap positions={positions} series={series} />
      }
    </div>
  )
}
