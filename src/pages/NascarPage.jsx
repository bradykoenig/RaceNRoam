import SeriesPage from '../components/SeriesPage'
import { useSeriesData } from '../hooks/useSeriesData'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

export default function NascarPage() {
  const { data, loading, error, refetch } = useSeriesData('nascar')
  useAutoRefresh(refetch, 5 * 60 * 1000, true)
  return <SeriesPage series="nascar" data={data} loading={loading} error={error} onRefresh={refetch} />
}
