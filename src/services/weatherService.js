import { getWeather } from '../lib/api/client.js'

export async function getTrackWeather(track) {
  if (!track?.lat || !track?.lon) return null
  return getWeather({ lat: track.lat, lon: track.lon, track: track.name || '' })
}

export function getWeatherIcon(conditions) {
  if (!conditions) return '🌤️'
  const c = conditions.toLowerCase()
  if (c.includes('thunder') || c.includes('storm'))  return '⛈️'
  if (c.includes('rain') || c.includes('shower'))    return '🌧️'
  if (c.includes('drizzle'))                         return '🌦️'
  if (c.includes('snow'))                            return '❄️'
  if (c.includes('fog') || c.includes('mist'))       return '🌫️'
  if (c.includes('cloud') || c.includes('overcast')) return '☁️'
  if (c.includes('partly'))                          return '⛅'
  if (c.includes('sunny') || c.includes('clear'))   return '☀️'
  return '🌤️'
}

export function formatTemp(celsius) {
  if (celsius == null) return '--'
  const f = Math.round(celsius * 9/5 + 32)
  return `${Math.round(celsius)}°C / ${f}°F`
}
