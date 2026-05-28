import SeriesPage from '../components/SeriesPage'
import { useSeriesData } from '../hooks/useSeriesData'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

export default function F1Page() {
  const { data, loading, error, refetch, lastFetch } = useSeriesData('f1')
  useAutoRefresh(refetch, 5 * 60 * 1000, true)
  return <SeriesPage series="f1" data={data} loading={loading} error={error} onRefresh={refetch} />
}
