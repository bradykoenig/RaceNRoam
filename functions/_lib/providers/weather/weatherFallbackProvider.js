// Weather fallback for when Open-Meteo or any weather provider fails

const TRACK_WEATHER = {
  // Key: track name substring (lowercase) → fallback conditions
  'monza':    { temperature: 26, conditions: 'Sunny',          windSpeed: '12 km/h', windDir: 'N',  humidity: '45%', rainChance: '5%' },
  'monaco':   { temperature: 22, conditions: 'Partly Cloudy',  windSpeed: '15 km/h', windDir: 'SW', humidity: '60%', rainChance: '20%' },
  'montreal': { temperature: 22, conditions: 'Partly Cloudy',  windSpeed: '18 km/h', windDir: 'SW', humidity: '55%', rainChance: '20%' },
  'michigan': { temperature: 24, conditions: 'Sunny',          windSpeed: '12 km/h', windDir: 'W',  humidity: '45%', rainChance: '5%' },
  'mugello':  { temperature: 28, conditions: 'Sunny',          windSpeed: '10 km/h', windDir: 'N',  humidity: '40%', rainChance: '5%' },
  'detroit':  { temperature: 26, conditions: 'Sunny',          windSpeed: '14 km/h', windDir: 'SW', humidity: '50%', rainChance: '10%' },
  'le mans':  { temperature: 19, conditions: 'Partly Cloudy',  windSpeed: '16 km/h', windDir: 'NW', humidity: '60%', rainChance: '35%' },
  'sarthe':   { temperature: 19, conditions: 'Partly Cloudy',  windSpeed: '16 km/h', windDir: 'NW', humidity: '60%', rainChance: '35%' },
  'default':  { temperature: 22, conditions: 'Partly Cloudy',  windSpeed: '14 km/h', windDir: 'W',  humidity: '52%', rainChance: '15%' },
}

export function getFallbackWeather(trackName = '') {
  const lower = trackName.toLowerCase()
  const key = Object.keys(TRACK_WEATHER).find(k => k !== 'default' && lower.includes(k))
  const base = TRACK_WEATHER[key] || TRACK_WEATHER.default
  return { ...base, source: 'fallback' }
}
