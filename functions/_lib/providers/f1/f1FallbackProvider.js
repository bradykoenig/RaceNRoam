// F1 fallback data for Cloudflare Functions – used when OpenF1/Jolpica are unavailable
// Keep in sync with src/data/fallback/f1Fallback.js conceptually

export function getFallbackF1Data() {
  return {
    series: 'f1',
    seriesName: 'Formula 1',
    featuredRace: {
      id: 'f1-spain-2026',
      name: 'Spanish Grand Prix',
      track: 'Circuit de Barcelona-Catalunya',
      location: 'Barcelona, Spain',
      country: 'Spain',
      flag: '🇪🇸',
      date: '2026-06-07T13:00:00+02:00',
      status: 'Upcoming',
      round: 9,
      season: 2026,
    },
    track: {
      name: 'Circuit de Barcelona-Catalunya',
      location: 'Barcelona, Spain',
      lat: 41.5699, lon: 2.2612,
      length: '4.675 km', laps: 66, raceDistance: '308.265 km',
      type: 'Permanent Road Course',
      lapRecord: '1:18.149 (Max Verstappen, 2023)',
      features: ['High-speed corners', 'Technical sections', 'Barcelona chicane'],
    },
    schedule: [
      { session: 'Practice 1', startTime: '2026-06-05T12:30:00+02:00', status: 'Upcoming' },
      { session: 'Practice 2', startTime: '2026-06-05T16:00:00+02:00', status: 'Upcoming' },
      { session: 'Practice 3', startTime: '2026-06-06T11:30:00+02:00', status: 'Upcoming' },
      { session: 'Qualifying', startTime: '2026-06-06T15:00:00+02:00', status: 'Upcoming' },
      { session: 'Race',       startTime: '2026-06-07T13:00:00+02:00', status: 'Upcoming' },
    ],
    standings: {
      source: 'unavailable',
      drivers: [],
      teams: [],
    },
    weather: {
      temperature: 22, conditions: 'Partly Cloudy', windSpeed: '18 km/h',
      humidity: '55%', rainChance: '20%', source: 'fallback',
    },
    talkingPoints: [],
    officialLinks: [
      { label: 'Formula 1 Official', url: 'https://www.formula1.com', icon: '🏎️' },
      { label: 'Driver Standings',   url: 'https://www.formula1.com/en/results/2026/drivers', icon: '🏆' },
      { label: 'F1 TV',              url: 'https://f1tv.formula1.com', icon: '📺' },
    ],
  }
}
