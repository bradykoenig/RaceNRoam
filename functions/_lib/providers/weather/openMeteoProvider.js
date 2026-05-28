// Open-Meteo weather provider – completely free, no API key required
// Docs: https://open-meteo.com/en/docs

const BASE = 'https://api.open-meteo.com/v1'

const WMO_CODES = {
  0:  'Clear Sky', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Depositing Rime Fog',
  51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
  61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
  80: 'Slight Showers', 81: 'Moderate Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ Hail', 99: 'Thunderstorm w/ Heavy Hail',
}

function wmoToCondition(code) { return WMO_CODES[code] || 'Unknown' }

export async function getCurrentWeather({ lat, lon }) {
  if (!lat || !lon) return null
  const params = new URLSearchParams({
    latitude:              lat,
    longitude:             lon,
    current:               'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m',
    wind_speed_unit:       'kmh',
    timezone:              'auto',
    forecast_days:         '1',
  })
  const res = await fetch(`${BASE}/forecast?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo → HTTP ${res.status}`)
  const data = await res.json()
  const c = data.current
  if (!c) return null

  const windDirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  const wdIndex = Math.round((c.wind_direction_10m || 0) / 22.5) % 16

  return {
    temperature:  Math.round(c.temperature_2m),
    feelsLike:    Math.round(c.apparent_temperature),
    conditions:   wmoToCondition(c.weather_code),
    windSpeed:    `${Math.round(c.wind_speed_10m || 0)} km/h`,
    windDir:      windDirs[wdIndex] || '',
    humidity:     `${c.relative_humidity_2m || '--'}%`,
    rainChance:   `${c.precipitation_probability || 0}%`,
    source:       'open-meteo',
  }
}

export async function getForecast({ lat, lon }) {
  if (!lat || !lon) return null
  const params = new URLSearchParams({
    latitude:    lat,
    longitude:   lon,
    hourly:      'temperature_2m,precipitation_probability,weather_code',
    wind_speed_unit: 'kmh',
    timezone:    'auto',
    forecast_days: '3',
  })
  const res = await fetch(`${BASE}/forecast?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo forecast → HTTP ${res.status}`)
  return res.json()
}
