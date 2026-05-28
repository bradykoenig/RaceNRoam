// F1 fallback data for Cloudflare Functions – used when OpenF1/Jolpica are unavailable
// Keep in sync with src/data/fallback/f1Fallback.js conceptually

export function getFallbackF1Data() {
  return {
    series: 'f1',
    seriesName: 'Formula 1',
    featuredRace: {
      id: 'f1-canada-2026',
      name: 'Canadian Grand Prix',
      track: 'Circuit Gilles Villeneuve',
      location: 'Montreal, Quebec, Canada',
      country: 'Canada',
      flag: '🇨🇦',
      date: '2026-06-14T14:00:00-04:00',
      status: 'Upcoming',
      round: 9,
      season: 2026,
    },
    track: {
      name: 'Circuit Gilles Villeneuve',
      location: 'Montreal, Quebec, Canada',
      lat: 45.5017, lon: -73.5225,
      length: '4.361 km', laps: 70, raceDistance: '305.270 km',
      type: 'Street Circuit / Island',
      lapRecord: '1:13.078 (Valtteri Bottas, 2019)',
      features: ['Wall of Champions', 'Hairpin chicanes', 'Long straights'],
    },
    schedule: [
      { session: 'Practice 1', startTime: '2026-06-12T12:30:00-04:00', status: 'Upcoming' },
      { session: 'Practice 2', startTime: '2026-06-12T16:00:00-04:00', status: 'Upcoming' },
      { session: 'Practice 3', startTime: '2026-06-13T11:30:00-04:00', status: 'Upcoming' },
      { session: 'Qualifying', startTime: '2026-06-13T15:00:00-04:00', status: 'Upcoming' },
      { session: 'Race',       startTime: '2026-06-14T14:00:00-04:00', status: 'Upcoming' },
    ],
    standings: {
      drivers: [
        { pos: 1,  driver: 'Max Verstappen',  team: 'Red Bull Racing', pts: 175, wins: 5, teamColor: '#3671C6', nat: '🇳🇱' },
        { pos: 2,  driver: 'Lando Norris',    team: 'McLaren',         pts: 159, wins: 3, teamColor: '#FF8000', nat: '🇬🇧' },
        { pos: 3,  driver: 'Charles Leclerc', team: 'Ferrari',         pts: 142, wins: 2, teamColor: '#E8002D', nat: '🇲🇨' },
        { pos: 4,  driver: 'Carlos Sainz',    team: 'Ferrari',         pts: 128, wins: 1, teamColor: '#E8002D', nat: '🇪🇸' },
        { pos: 5,  driver: 'Oscar Piastri',   team: 'McLaren',         pts: 121, wins: 1, teamColor: '#FF8000', nat: '🇦🇺' },
      ],
      teams: [
        { pos: 1, team: 'McLaren',         pts: 280, color: '#FF8000' },
        { pos: 2, team: 'Ferrari',         pts: 270, color: '#E8002D' },
        { pos: 3, team: 'Red Bull Racing', pts: 263, color: '#3671C6' },
        { pos: 4, team: 'Mercedes',        pts: 148, color: '#27F4D2' },
        { pos: 5, team: 'Aston Martin',    pts: 116, color: '#358C75' },
      ],
    },
    weather: {
      temperature: 22, conditions: 'Partly Cloudy', windSpeed: '18 km/h',
      humidity: '55%', rainChance: '20%', source: 'fallback',
    },
    talkingPoints: [
      'Verstappen seeks a fourth consecutive Canadian GP win on this fast-flowing circuit.',
      'Lewis Hamilton lines up in Ferrari red for the first time at Montreal.',
      'McLaren arrive with momentum after a Monaco 1-2 – team orders possible again?',
      'Wall of Champions strikes in practice – will qualifying be chaotic?',
      'Norris is 16 points behind Verstappen – championship-defining weekend.',
    ],
    officialLinks: [
      { label: 'Formula 1 Official', url: 'https://www.formula1.com', icon: '🏎️' },
      { label: 'Driver Standings',   url: 'https://www.formula1.com/en/results/2026/drivers', icon: '🏆' },
      { label: 'F1 TV',              url: 'https://f1tv.formula1.com', icon: '📺' },
    ],
  }
}
