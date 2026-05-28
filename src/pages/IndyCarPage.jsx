import SeriesPage from '../components/SeriesPage'
import { useSeriesData } from '../hooks/useSeriesData'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

export default function IndyCarPage() {
  const { data, loading, error, refetch } = useSeriesData('indycar')
  useAutoRefresh(refetch, 5 * 60 * 1000, true)
  return <SeriesPage series="indycar" data={data} loading={loading} error={error} onRefresh={refetch} />
}
