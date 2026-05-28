export default function OfficialLinks({ links = [] }) {
  if (!links.length) return null
  return (
    <div className="links-grid">
      {links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="official-link"
        >
          {link.icon && <span className="link-icon">{link.icon}</span>}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {link.label}
          </span>
          <span className="link-arrow">↗</span>
        </a>
      ))}
    </div>
  )
}
