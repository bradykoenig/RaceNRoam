// F1 server-side fallback — synchronous, year-agnostic, no hardcoded race data.
// Only reached when Jolpica + OpenF1 + ESPN all fail. Returns a generic placeholder
// so the response shape is valid but no stale race is ever displayed.

export function getFallbackF1Data() {
  const year = new Date().getFullYear()

  return {
    series:      'f1',
    seriesName:  'Formula 1',
    featuredRace: {
      name:        'F1 Grand Prix',
      track:       '',
      location:    '',
      country:     '',
      date:        null,
      raceStart:   null,
      nextSession: null,
      status:      'Upcoming',
      round:       null,
      season:      year,
    },
    track:     { name: '', location: '', lat: null, lon: null, type: 'Grand Prix Circuit' },
    schedule:  [],
    standings: { source: 'unavailable', drivers: [], teams: [] },
    weather: {
      temperature: null, conditions: 'Unavailable',
      windSpeed: '--', humidity: '--', rainChance: '--', source: 'fallback',
    },
    talkingPoints: [],
    officialLinks: [
      { label: 'Formula 1 Official', url: 'https://www.formula1.com',                            icon: '🏎️' },
      { label: 'Driver Standings',   url: `https://www.formula1.com/en/results/${year}/drivers`, icon: '🏆' },
      { label: 'F1 TV',              url: 'https://f1tv.formula1.com',                           icon: '📺' },
    ],
  }
}
