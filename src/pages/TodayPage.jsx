import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getToday } from '../lib/api/client'
import { SERIES_META } from '../lib/api/endpoints'
import PageHeader from '../components/PageHeader'
import RaceCard from '../components/RaceCard'
import Countdown from '../components/Countdown'
import TrackInfoCard from '../components/TrackInfoCard'
import WeatherCard from '../components/WeatherCard'
import ScheduleCard from '../components/ScheduleCard'
import StandingsTable from '../components/StandingsTable'
import TalkingPoints from '../components/TalkingPoints'
import OfficialLinks from '../components/OfficialLinks'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'

export default function TodayPage() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const r = await getToday()
      setResult(r)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="container page-wrapper"><LoadingState /></div>
  if (error)   return <div className="container page-wrapper"><ErrorState message={error} onRetry={load} /></div>

  const data   = result?.data || result || {}
  const series = data.series || result?.series || 'f1'
  const meta   = SERIES_META[series] || {}
  const race   = data.featuredRace
  const standings = data.standings || {}
  const track  = data.track
  const weather = data.weather
  const talking = data.talkingPoints || []
  const links   = data.officialLinks  || []
  const schedule= data.schedule || []

  function getPageTitle() {
    if (!race?.date) return 'Next Race'
    const diff = new Date(race.date).getTime() - Date.now()
    const days = diff / (1000 * 60 * 60 * 24)
    if (diff < 0 && diff > -1000 * 60 * 60 * 4) return "Today's Race"
    if (days <= 0.5) return "Today's Race"
    if (days <= 1.5) return "Tomorrow's Race"
    if (days <= 7)   return 'This Weekend'
    return 'Next Race'
  }

  function getPageSubtitle() {
    if (!race?.date) return 'No upcoming race found'
    const diff = new Date(race.date).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (diff < 0) return race.name
    if (days === 0) return race.name
    if (days === 1) return `${race.name} · Tomorrow`
    return `${race.name} · in ${days} days`
  }

  return (
    <div className="container page-wrapper fade-in">
      <PageHeader
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        source={result?.source}
        warning={result?.warning}
        lastUpdated={result?.lastUpdated}
        onRefresh={load}
        actions={
          meta.path && (
            <Link to={meta.path} className="btn btn-secondary btn-sm">
              {meta.icon} {meta.shortName} Page
            </Link>
          )
        }
      />

      {race ? (
        <>
          <section className="section">
            <div className="grid-2">
              <RaceCard race={race} series={series} showCountdown={false} />
              <div className="card">
                <div className="card-header"><h4>Countdown to Race</h4></div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--sp-8)', gap: 'var(--sp-4)' }}>
                  <Countdown targetDate={race.date} size="large" />
                  <Link to="/stream" className="btn btn-primary btn-sm">◉ Open Stream Mode</Link>
                </div>
              </div>
            </div>
          </section>

          {schedule.length > 0 && (
            <section className="section">
              <p className="section-title">Weekend Schedule</p>
              <div className="card"><div className="card-body"><ScheduleCard schedule={schedule} /></div></div>
            </section>
          )}

          <div className="grid-2">
            {track && (
              <section className="section">
                <p className="section-title">Circuit Info</p>
                <div className="card"><div className="card-body"><TrackInfoCard track={track} /></div></div>
              </section>
            )}
            {weather && (
              <section className="section">
                <p className="section-title">Track Weather</p>
                <div className="card"><div className="card-body"><WeatherCard weather={weather} /></div></div>
              </section>
            )}
          </div>

          {standings.drivers?.length > 0 && (
            <section className="section">
              <p className="section-title">Championship Standings</p>
              <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                  <StandingsTable drivers={standings.drivers} limit={5} />
                </div>
              </div>
            </section>
          )}

          {talking.length > 0 && (
            <section className="section">
              <p className="section-title">Talking Points for the Stream</p>
              <TalkingPoints points={talking} />
            </section>
          )}

          {links.length > 0 && (
            <section className="section">
              <p className="section-title">Official Links</p>
              <OfficialLinks links={links} />
            </section>
          )}
        </>
      ) : (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--sp-16)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-4)' }}>🏁</div>
            <h3>No race today</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: 'var(--sp-3)' }}>
              Check the calendar for upcoming events across all series.
            </p>
            <Link to="/calendar" className="btn btn-primary" style={{ marginTop: 'var(--sp-6)' }}>
              📅 View Calendar
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
