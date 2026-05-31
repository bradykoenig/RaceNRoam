import PageHeader from './PageHeader'
import LiveRacePanel from './LiveRacePanel'
import RaceCard from './RaceCard'
import Countdown from './Countdown'
import TrackInfoCard from './TrackInfoCard'
import WeatherCard from './WeatherCard'
import ScheduleCard from './ScheduleCard'
import OfficialLinks from './OfficialLinks'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import { Link } from 'react-router-dom'
import { useLiveRace } from '../hooks/useLiveRace'

export default function SeriesPage({ series, data, loading, error, onRefresh }) {
  const { liveData } = useLiveRace(series)
  if (loading) return <div className="container page-wrapper"><LoadingState /></div>
  if (error)   return <div className="container page-wrapper"><ErrorState message={error} onRetry={onRefresh} /></div>
  if (!data)   return <div className="container page-wrapper"><LoadingState /></div>

  const d  = data.data || data
  const race      = d.featuredRace
  const track     = d.track
  const schedule  = d.schedule || []
  const weather   = d.weather
  const links     = d.officialLinks  || []
  const classes   = d.classes

  // Build proper race subtitle from API data
  function getRaceSubtitle() {
    if (!race) return '2026 Season'
    const parts = []
    if (race.track && race.track.trim()) parts.push(race.track)
    if (race.location && race.location.trim()) parts.push(race.location)
    if (race.round) parts.push(`Round ${race.round}`)
    return parts.length > 0 ? parts.join(' · ') : race.name || '2026 Season'
  }

  return (
    <div className="container page-wrapper fade-in">
      <PageHeader
        title={race?.name || d.seriesName || data.seriesName}
        subtitle={getRaceSubtitle()}
        series={series}
        source={data.source}
        warning={data.warning}
        lastUpdated={data.lastUpdated}
        onRefresh={onRefresh}
        actions={
          <Link to={`/stream?series=${series}`} className="btn btn-secondary btn-sm">
            ◉ Stream Mode
          </Link>
        }
      />

      {/* Live Race Panel — shown when a session is active */}
      {liveData && (
        <section className="section">
          {liveData.isLive && (
            <p className="section-title" style={{ color: 'var(--red)' }}>Live Session</p>
          )}
          <LiveRacePanel liveData={liveData} series={series} />
        </section>
      )}

      {/* Featured Race + Countdown */}
      {race && (
        <section className="section">
          <p className="section-title">Next Race</p>
          <div className="grid-2">
            {/* Race card always shows Sunday race date */}
            <RaceCard race={{ ...race, date: race.raceStart || race.date }} series={series} showCountdown={false} />
            <div className="card">
              {/* If next session is before the race, show both countdowns */}
              {race.nextSession && race.nextSession.session !== 'Race' ? (
                <>
                  <div className="card-header">
                    <h4>Countdown to Next Session</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {race.nextSession.session}
                    </span>
                  </div>
                  <div className="card-body flex-center" style={{ padding: 'var(--sp-6)', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                    <Countdown targetDate={race.nextSession.startTime} size="large" />
                    {race.nextSession.startTime && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        {new Intl.DateTimeFormat('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric',
                          hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
                        }).format(new Date(race.nextSession.startTime))}
                      </p>
                    )}
                    {/* Sub-countdown to race */}
                    {(race.raceStart || race.date) && (
                      <div style={{ marginTop: 'var(--sp-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-3)', width: '100%', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                          Countdown to Race
                        </p>
                        <Countdown targetDate={race.raceStart || race.date} size="inline" />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="card-header"><h4>Countdown to Race</h4></div>
                  <div className="card-body flex-center" style={{ padding: 'var(--sp-8)', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                    <Countdown targetDate={race.raceStart || race.date} size="large" />
                    {(race.raceStart || race.date) && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--sp-3)' }}>
                        {new Intl.DateTimeFormat('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric',
                          hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
                        }).format(new Date(race.raceStart || race.date))}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Endurance classes if present */}
      {classes?.length > 0 && (
        <section className="section">
          <p className="section-title">Race Classes</p>
          <div className="grid-3">
            {classes.map(c => (
              <div key={c.name} className="card" style={{ borderTop: `3px solid ${c.color}` }}>
                <div className="card-body">
                  <div className="font-bold" style={{ color: c.color }}>{c.name}</div>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Schedule */}
      {schedule.length > 0 && (
        <section className="section">
          <p className="section-title">Weekend Schedule</p>
          <div className="card">
            <div className="card-body"><ScheduleCard schedule={schedule} /></div>
          </div>
        </section>
      )}

      <div className="grid-2">
        {/* Track Info */}
        {track && (
          <div className="section">
            <p className="section-title">Circuit Info</p>
            <div className="card">
              <div className="card-body"><TrackInfoCard track={track} /></div>
            </div>
          </div>
        )}

        {/* Weather */}
        {weather && (
          <div className="section">
            <p className="section-title">Track Weather</p>
            <div className="card">
              <div className="card-body"><WeatherCard weather={weather} /></div>
            </div>
          </div>
        )}
      </div>

      {/* Official Links */}
      {links.length > 0 && (
        <section className="section">
          <p className="section-title">Official Links</p>
          <OfficialLinks links={links} />
        </section>
      )}
    </div>
  )
}
