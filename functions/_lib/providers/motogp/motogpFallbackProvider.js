export function getFallbackMotoGPData() {
  return {
    series: 'motogp',
    seriesName: 'MotoGP World Championship',
    featuredRace: {
      id: 'motogp-mugello-2026',
      name: "Gran Premio d'Italia Oakley",
      track: 'Mugello Circuit',
      location: 'Scarperia, Tuscany, Italy',
      country: 'Italy',
      flag: '🇮🇹',
      date: '2026-06-07T14:00:00+02:00',
      status: 'Upcoming',
      round: 8,
      season: 2026,
    },
    track: {
      name: 'Autodromo Internazionale del Mugello',
      location: 'Scarperia, Tuscany, Italy',
      lat: 43.9973, lon: 11.3707,
      length: '5.245 km', laps: 23, raceDistance: '120.635 km',
      type: 'Permanent Road Circuit',
      features: ['Arrabbiata corners', 'Fast flowing layout', 'Big elevation changes'],
    },
    schedule: [
      { session: 'Free Practice 1', startTime: '2026-06-05T09:00:00+02:00', status: 'Upcoming' },
      { session: 'Qualifying 1',    startTime: '2026-06-06T10:50:00+02:00', status: 'Upcoming' },
      { session: 'Qualifying 2',    startTime: '2026-06-06T11:15:00+02:00', status: 'Upcoming' },
      { session: 'Sprint Race',     startTime: '2026-06-06T15:00:00+02:00', status: 'Upcoming' },
      { session: 'Race',            startTime: '2026-06-07T14:00:00+02:00', status: 'Upcoming' },
    ],
    standings: {
      drivers: [
        { pos: 1, driver: 'Francesco Bagnaia', team: 'Ducati Lenovo Team',    pts: 197, wins: 4, nat: '🇮🇹', teamColor: '#E8002D', bike: 'Ducati GP26' },
        { pos: 2, driver: 'Jorge Martín',      team: 'Prima Pramac Racing',   pts: 184, wins: 3, nat: '🇪🇸', teamColor: '#E8002D', bike: 'Ducati GP26' },
        { pos: 3, driver: 'Marc Márquez',      team: 'Repsol Honda Team',     pts: 172, wins: 2, nat: '🇪🇸', teamColor: '#CC0001', bike: 'Honda RC213V' },
        { pos: 4, driver: 'Enea Bastianini',   team: 'Monster Yamaha',        pts: 148, wins: 1, nat: '🇮🇹', teamColor: '#1C6BB0', bike: 'Yamaha YZR-M1' },
        { pos: 5, driver: 'Fabio Quartararo',  team: 'Monster Yamaha',        pts: 136, wins: 0, nat: '🇫🇷', teamColor: '#1C6BB0', bike: 'Yamaha YZR-M1' },
      ],
      teams: [
        { pos: 1, team: 'Ducati Lenovo Team',    pts: 345, color: '#E8002D' },
        { pos: 2, team: 'Repsol Honda Team',     pts: 274, color: '#CC0001' },
        { pos: 3, team: 'Monster Energy Yamaha', pts: 284, color: '#1C6BB0' },
      ],
    },
    weather: { temperature: 28, conditions: 'Sunny', windSpeed: '10 km/h', humidity: '40%', rainChance: '5%', source: 'fallback' },
    talkingPoints: [
      "Mugello is Ducati's home – Bagnaia will receive a massive tifosi welcome and is fired up to win.",
      "Márquez is only 25 points behind and is hunting a historic Mugello win for Honda.",
      "The Sprint Race adds 12 points on Saturday – perfect for aggressive, high-risk riding.",
      "Mugello's long straight rewards Ducati's power advantage over the technical infield.",
    ],
    officialLinks: [
      { label: 'MotoGP Official', url: 'https://www.motogp.com', icon: '🏍️' },
      { label: 'Rider Standings', url: 'https://www.motogp.com/en/standings', icon: '🏆' },
    ],
  }
}
