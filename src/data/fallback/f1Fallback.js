// Minimal F1 fallback when API fails
// NO hardcoded standings, NO demo race data, NO talking points
export function getFallbackF1Data() {
  return {
    series: 'f1',
    seriesName: 'Formula 1',
    source: 'fallback',
    lastUpdated: new Date().toISOString(),
    featuredRace: null, // Don't show fake race data
    track: null,
    schedule: [], // Don't show fake schedule
    standings: {
      drivers: [], // Don't show fake standings
      teams: [],
    },
    startingGrid: [],
    weather: null,
    talkingPoints: [], // Removed entirely
    officialLinks: [
      { label: 'F1 Official Site', url: 'https://www.formula1.com', icon: '🏎️' },
      { label: 'F1 TV', url: 'https://f1tv.formula1.com', icon: '📺' },
    ],
    _warning: 'Race schedule and standings unavailable. Please refresh or try again.',
  }
}
