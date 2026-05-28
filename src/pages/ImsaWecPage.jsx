import SeriesPage from '../components/SeriesPage'
import { useSeriesData } from '../hooks/useSeriesData'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

export default function ImsaWecPage() {
  const { data, loading, error, refetch } = useSeriesData('imsa-wec')
  useAutoRefresh(refetch, 5 * 60 * 1000, true)
  return <SeriesPage series="imsa-wec" data={data} loading={loading} error={error} onRefresh={refetch} />
}
