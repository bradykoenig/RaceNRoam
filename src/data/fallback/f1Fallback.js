// F1 2026 fallback data – Monaco Grand Prix weekend
// Session times sourced from Jolpica /2026/next.json (UTC, Z-suffix)
export function getFallbackF1Data() {
  return {
    series: 'f1',
    seriesName: 'Formula 1',
    source: 'fallback',
    lastUpdated: new Date().toISOString(),
    featuredRace: {
      id: 'f1-monaco-2026',
      name: 'Monaco Grand Prix',
      track: 'Circuit de Monaco',
      location: 'Monte Carlo, Monaco',
      country: 'Monaco',
      flag: '🇲🇨',
      date: '2026-06-07T13:00:00Z',
      status: 'Upcoming',
      round: 6,
      season: 2026,
    },
    track: {
      name: 'Circuit de Monaco',
      location: 'Monte Carlo, Monaco',
      lat: 43.7347,
      lon: 7.42056,
      length: '3.337 km',
      laps: 78,
      raceDistance: '260.286 km',
      type: 'Street Circuit',
      lapRecord: '1:12.909 (Lewis Hamilton, 2021)',
      features: ['Tunnel', 'Casino Square', 'Hairpin', 'Swimming Pool'],
    },
    schedule: [
      { session: 'Practice 1', startTime: '2026-06-05T11:30:00Z', status: 'Upcoming' },
      { session: 'Practice 2', startTime: '2026-06-05T15:00:00Z', status: 'Upcoming' },
      { session: 'Practice 3', startTime: '2026-06-06T10:30:00Z', status: 'Upcoming' },
      { session: 'Qualifying', startTime: '2026-06-06T14:00:00Z', status: 'Upcoming' },
      { session: 'Race',       startTime: '2026-06-07T13:00:00Z', status: 'Upcoming' },
    ],
    standings: {
      source: 'unavailable',
      drivers: [],
      teams: [],
    },
    startingGrid: [],
    weather: {
      temperature: 22,
      feelsLike: 20,
      conditions: 'Partly Cloudy',
      windSpeed: '18 km/h',
      windDir: 'SW',
      humidity: '55%',
      rainChance: '15%',
      source: 'forecast',
    },
    talkingPoints: [],
    officialLinks: [
      { label: 'F1 Official Site',  url: 'https://www.formula1.com', icon: '🏎️' },
      { label: 'Driver Standings',  url: 'https://www.formula1.com/en/results/2026/drivers', icon: '🏆' },
      { label: 'F1 TV',             url: 'https://f1tv.formula1.com', icon: '📺' },
    ],
  }
}
