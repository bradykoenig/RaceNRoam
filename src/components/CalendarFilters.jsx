import { SERIES_META } from '../lib/api/endpoints'

export default function CalendarFilters({ filters, onChange }) {
  function update(key, val) { onChange({ ...filters, [key]: val }) }

  return (
    <div className="cal-filters">
      <input
        type="search"
        className="cal-input"
        placeholder="Search race, track, location…"
        value={filters.search || ''}
        onChange={e => update('search', e.target.value)}
        style={{ flex: '1 1 200px' }}
      />

      <select
        className="cal-select"
        value={filters.series || 'all'}
        onChange={e => update('series', e.target.value)}
      >
        <option value="all">All Series</option>
        {Object.values(SERIES_META).map(m => (
          <option key={m.slug} value={m.slug}>{m.name}</option>
        ))}
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--text-secondary)', fontSize: '0.875rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!!filters.showCompleted}
          onChange={e => update('showCompleted', e.target.checked)}
          style={{ accentColor: 'var(--accent-red)' }}
        />
        Show Completed
      </label>
    </div>
  )
}
