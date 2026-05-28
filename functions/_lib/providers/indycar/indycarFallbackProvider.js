export function getFallbackIndyCarData() {
  return {
    series: 'indycar',
    seriesName: 'NTT IndyCar Series',
    featuredRace: {
      id: 'indycar-detroit-2026',
      name: 'Chevrolet Detroit Grand Prix',
      track: 'Belle Isle Street Circuit',
      location: 'Detroit, Michigan, USA',
      country: 'USA',
      flag: '🇺🇸',
      date: '2026-06-07T12:30:00-04:00',
      status: 'Upcoming',
      round: 8,
      season: 2026,
    },
    track: {
      name: 'Belle Isle Street Circuit',
      location: 'Belle Isle, Detroit, Michigan, USA',
      lat: 42.3314, lon: -82.9986,
      length: '3.650 km', laps: 70, raceDistance: '255.5 km',
      type: 'Temporary Street Circuit',
      features: ['Concrete walls', 'Tight chicanes', 'Riverside backdrop'],
    },
    schedule: [
      { session: 'Practice 1', startTime: '2026-06-05T13:00:00-04:00', status: 'Upcoming' },
      { session: 'Qualifying', startTime: '2026-06-06T09:00:00-04:00', status: 'Upcoming' },
      { session: 'Race',       startTime: '2026-06-07T12:30:00-04:00', status: 'Upcoming' },
    ],
    standings: {
      drivers: [
        { pos: 1, driver: 'Josef Newgarden', team: 'Team Penske #2',         pts: 312, wins: 2, nat: '🇺🇸', teamColor: '#FFCC00' },
        { pos: 2, driver: 'Alex Palou',      team: 'Chip Ganassi Racing #10', pts: 298, wins: 3, nat: '🇪🇸', teamColor: '#C8102E' },
        { pos: 3, driver: "Pato O'Ward",     team: 'Arrow McLaren #5',        pts: 276, wins: 1, nat: '🇲🇽', teamColor: '#FF8000' },
        { pos: 4, driver: 'Scott Dixon',     team: 'Chip Ganassi Racing #9',  pts: 254, wins: 0, nat: '🇳🇿', teamColor: '#C8102E' },
        { pos: 5, driver: 'Will Power',      team: 'Team Penske #12',         pts: 241, wins: 1, nat: '🇦🇺', teamColor: '#FFCC00' },
      ],
      teams: [],
    },
    weather: { temperature: 26, conditions: 'Sunny', windSpeed: '14 km/h', rainChance: '10%', source: 'fallback' },
    talkingPoints: [
      "Alex Palou leads Belle Isle wins in recent years – can the Chip Ganassi ace claim another?",
      "Josef Newgarden arrives with championship momentum after his Indy 500 triumph.",
      "Detroit's concrete walls create contact and chaos – DNFs could scramble the championship.",
    ],
    officialLinks: [
      { label: 'IndyCar.com',   url: 'https://www.indycar.com', icon: '⚡' },
      { label: 'Standings',     url: 'https://www.indycar.com/Standings', icon: '🏆' },
    ],
  }
}
