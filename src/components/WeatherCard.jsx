import { getWeatherIcon } from '../services/weatherService'

function cToF(c) { return Math.round(c * 9 / 5 + 32) }

export default function WeatherCard({ weather }) {
  if (!weather) return null
  const icon = getWeatherIcon(weather.conditions)
  const c = weather.temperature ?? weather.airTemp
  const tempLine = c != null ? `${Math.round(c)}°C / ${cToF(c)}°F` : '--'
  const trackC = weather.trackTemp
  const trackLine = trackC != null ? `${Math.round(trackC)}°C / ${cToF(trackC)}°F` : null

  return (
    <div className="weather-display">
      <div className="weather-icon">{icon}</div>
      <div>
        <div className="weather-temp">{tempLine}</div>
        {trackLine && (
          <div className="weather-detail" style={{ marginBottom: 'var(--sp-1)' }}>
            🏎️ Track: {trackLine}
          </div>
        )}
        <div className="weather-condition">{weather.conditions || 'Unknown'}</div>
        <div className="weather-details">
          {weather.windSpeed && (
            <div className="weather-detail">
              💨 {weather.windSpeed}{weather.windDir ? ` ${weather.windDir}` : ''}
            </div>
          )}
          {weather.humidity && (
            <div className="weather-detail">💧 {weather.humidity} humidity</div>
          )}
          {weather.rainChance && (
            <div className="weather-detail">🌧️ {weather.rainChance} rain chance</div>
          )}
          {weather.rainfall != null && (
            <div className="weather-detail" style={{ color: weather.rainfall ? '#60a5fa' : 'var(--text-dim)' }}>
              {weather.rainfall ? '🌧️ Rain on track' : '☀️ Dry track'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
