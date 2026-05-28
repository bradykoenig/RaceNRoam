import SeriesPage from '../components/SeriesPage'
import { useSeriesData } from '../hooks/useSeriesData'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

export default function MotoGPPage() {
  const { data, loading, error, refetch } = useSeriesData('motogp')
  useAutoRefresh(refetch, 5 * 60 * 1000, true)
  return <SeriesPage series="motogp" data={data} loading={loading} error={error} onRefresh={refetch} />
}
