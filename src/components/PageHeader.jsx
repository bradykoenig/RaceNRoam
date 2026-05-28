import DataSourceBadge from './DataSourceBadge'
import LastUpdated from './LastUpdated'
import RefreshButton from './RefreshButton'
import { SERIES_META } from '../lib/api/endpoints'

export default function PageHeader({ title, subtitle, series, source, warning, lastUpdated, onRefresh, actions, children }) {
  const meta = series ? SERIES_META[series] : null

  return (
    <div className="page-header">
      <div className="page-header-top">
        <div>
          <div className="page-header-title-row">
            {meta?.color && (
              <span className="series-dot" style={{ background: meta.color }} />
            )}
            <h1>{title}</h1>
            {meta && <span className={`badge ${meta.badgeClass}`}>{meta.shortName}</span>}
          </div>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
        <div className="page-header-actions">
          {actions}
          {onRefresh && <RefreshButton onRefresh={onRefresh} />}
        </div>
      </div>

      <div className="page-header-meta">
        {lastUpdated && <LastUpdated timestamp={lastUpdated} />}
      </div>
      {children}
    </div>
  )
}
