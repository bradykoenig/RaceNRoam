// NASCAR fallback data – used when no paid API key is configured
export function getFallbackNascarData() {
  return {
    series: 'nascar',
    seriesName: 'NASCAR Cup Series',
    featuredRace: {
      id: 'nascar-michigan-2026',
      name: 'FireKeepers Casino 400',
      track: 'Michigan International Speedway',
      location: 'Brooklyn, Michigan, USA',
      country: 'USA',
      flag: '🇺🇸',
      date: '2026-06-07T14:30:00-04:00',
      status: 'Upcoming',
      round: 16,
      season: 2026,
    },
    track: {
      name: 'Michigan International Speedway',
      location: 'Brooklyn, Michigan, USA',
      lat: 42.0661, lon: -84.2555,
      length: '2.0 miles', laps: 200, raceDistance: '400 miles',
      type: 'Superspeedway – D-shaped oval',
      features: ['High-speed banking', 'Wide racing surface', 'Low-downforce package'],
    },
    schedule: [
      { session: 'Cup Series Practice',  startTime: '2026-06-06T14:30:00-04:00', status: 'Upcoming' },
      { session: 'Cup Series Qualifying', startTime: '2026-06-06T15:30:00-04:00', status: 'Upcoming' },
      { session: 'XFINITY Race',          startTime: '2026-06-07T11:00:00-04:00', status: 'Upcoming' },
      { session: 'Cup Series Race',       startTime: '2026-06-07T14:30:00-04:00', status: 'Upcoming' },
    ],
    standings: {
      drivers: [
        { pos: 1, driver: 'Kyle Larson',      team: 'Hendrick Motorsports #5',  pts: 642, wins: 3, teamColor: '#0000CD', nat: '🇺🇸' },
        { pos: 2, driver: 'Denny Hamlin',     team: 'Joe Gibbs Racing #11',     pts: 608, wins: 2, teamColor: '#D40000', nat: '🇺🇸' },
        { pos: 3, driver: 'Christopher Bell', team: 'Joe Gibbs Racing #20',     pts: 597, wins: 2, teamColor: '#D40000', nat: '🇺🇸' },
        { pos: 4, driver: 'Ryan Blaney',      team: 'Team Penske #12',          pts: 581, wins: 1, teamColor: '#FFCC00', nat: '🇺🇸' },
        { pos: 5, driver: 'William Byron',    team: 'Hendrick Motorsports #24', pts: 574, wins: 2, teamColor: '#0000CD', nat: '🇺🇸' },
      ],
      teams: [],
    },
    weather: { temperature: 24, conditions: 'Sunny', windSpeed: '12 km/h', rainChance: '5%', source: 'fallback' },
    talkingPoints: [
      'Kyle Larson is the defending Michigan winner – can he extend the championship lead?',
      'Michigan uses the superspeedway package creating three-wide racing.',
      "Denny Hamlin is 34 points back – this race could reshape the entire top-5.",
    ],
    officialLinks: [
      { label: 'NASCAR.com', url: 'https://www.nascar.com', icon: '🏁' },
      { label: 'Cup Standings', url: 'https://www.nascar.com/nascar-cup-series/standings', icon: '🏆' },
    ],
  }
}
