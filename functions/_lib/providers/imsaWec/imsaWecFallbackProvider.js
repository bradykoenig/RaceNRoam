export function getFallbackImsaWecData() {
  return {
    series: 'imsa-wec',
    seriesName: 'IMSA / FIA WEC Endurance',
    featuredRace: {
      id: 'wec-lemans-2026',
      name: '24 Hours of Le Mans',
      track: 'Circuit de la Sarthe',
      location: 'Le Mans, Sarthe, France',
      country: 'France',
      flag: '🇫🇷',
      date: '2026-06-13T16:00:00+02:00',
      status: 'Upcoming',
      round: 4,
      season: 2026,
      duration: '24 hours',
    },
    classes: [
      { name: 'Hypercar', color: '#e10600', description: 'Top prototype and LMH/LMDh manufacturers' },
      { name: 'LMP2',     color: '#0066cc', description: 'Customer prototype class' },
      { name: 'LMGT3',    color: '#00aa44', description: 'GT3-spec production-based cars' },
    ],
    track: {
      name: 'Circuit de la Sarthe',
      location: 'Le Mans, Sarthe, France',
      lat: 47.9497, lon: 0.2247,
      length: '13.626 km', estimatedLaps: '340–370 laps',
      raceDistance: '~5,100 km',
      type: 'Permanent / Public Road Hybrid',
      features: ['Mulsanne Straight', 'Porsche Curves', 'Ford Chicanes', 'Dunlop Bridge'],
    },
    schedule: [
      { session: 'Test Day',         startTime: '2026-06-01T09:00:00+02:00', status: 'Upcoming' },
      { session: 'Hyperpole',        startTime: '2026-06-11T20:00:00+02:00', status: 'Upcoming' },
      { session: 'Race Start',       startTime: '2026-06-13T16:00:00+02:00', status: 'Upcoming' },
      { session: 'Race Finish',      startTime: '2026-06-14T16:00:00+02:00', status: 'Upcoming' },
    ],
    standings: {
      drivers: [
        { pos: 1, driver: 'Hirakawa / Buemi / Hartley',     team: 'Toyota GR010 #8',  pts: 120, class: 'Hypercar', teamColor: '#EB0A1E' },
        { pos: 2, driver: 'Conway / Kobayashi / López',     team: 'Toyota GR010 #7',  pts: 105, class: 'Hypercar', teamColor: '#EB0A1E' },
        { pos: 3, driver: 'Estre / Vanthoor / Lotterer',    team: 'Porsche 963 #6',   pts: 98,  class: 'Hypercar', teamColor: '#CC0000' },
        { pos: 4, driver: 'Nielsen / Fuoco / Molina',       team: 'Ferrari 499P #50', pts: 89,  class: 'Hypercar', teamColor: '#E8002D' },
        { pos: 5, driver: 'Campbell / Makowiecki / Christensen', team: 'Porsche 963 #75', pts: 84, class: 'Hypercar', teamColor: '#CC0000' },
      ],
      teams: [
        { pos: 1, team: 'Toyota Gazoo Racing',    pts: 225, class: 'Hypercar', color: '#EB0A1E' },
        { pos: 2, team: 'Porsche Penske',         pts: 182, class: 'Hypercar', color: '#CC0000' },
        { pos: 3, team: 'Ferrari AF Corse',       pts: 151, class: 'Hypercar', color: '#E8002D' },
      ],
    },
    weather: { temperature: 19, conditions: 'Partly Cloudy', windSpeed: '16 km/h', humidity: '60%', rainChance: '35%', source: 'fallback' },
    talkingPoints: [
      "Toyota seeks a ninth consecutive overall Le Mans victory – Ferrari and Porsche are closing the gap.",
      "The 24-hour format tests everything: driver fitness, strategy, pit speed, and reliability.",
      "Night stints at Le Mans often produce the most dramatic moments – perfect stream content.",
      "Over 250,000 fans on-site – the world's biggest motorsport event by attendance.",
    ],
    officialLinks: [
      { label: 'FIA WEC Official', url: 'https://www.fiawec.com', icon: '🏆' },
      { label: '24h Le Mans',      url: 'https://www.lemans.org', icon: '🇫🇷' },
    ],
  }
}
