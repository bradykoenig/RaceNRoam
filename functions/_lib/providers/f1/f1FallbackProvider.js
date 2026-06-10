// F1 server-side fallback — synchronous, no network calls.
// Used only when Jolpica + OpenF1 + ESPN all fail simultaneously.
// Embeds the remaining 2026 calendar and picks the next upcoming race dynamically.
// In 2027+, the live path (jolpicaProvider.js) handles everything automatically;
// the embedded calendar is only a safety net for the rare "all APIs down" scenario.

const F1_CALENDAR = [
  { round: 9,  name: 'Spanish Grand Prix',            track: 'Circuit de Barcelona-Catalunya',  location: 'Barcelona, Spain',                      date: '2026-06-21T13:00:00Z', lat: 41.57,    lon: 2.2611    },
  { round: 10, name: 'Canadian Grand Prix',           track: 'Circuit Gilles Villeneuve',       location: 'Montreal, Quebec, Canada',              date: '2026-06-28T18:00:00Z', lat: 45.5048,  lon: -73.5258  },
  { round: 11, name: 'Austrian Grand Prix',           track: 'Red Bull Ring',                   location: 'Spielberg, Austria',                    date: '2026-07-05T13:00:00Z', lat: 47.2197,  lon: 14.7647   },
  { round: 12, name: 'British Grand Prix',            track: 'Silverstone Circuit',             location: 'Silverstone, UK',                       date: '2026-07-12T13:00:00Z', lat: 52.0786,  lon: -1.0169   },
  { round: 13, name: 'Hungarian Grand Prix',          track: 'Hungaroring',                     location: 'Mogyoród, Hungary',                     date: '2026-07-26T13:00:00Z', lat: 47.5789,  lon: 19.2486   },
  { round: 14, name: 'Belgian Grand Prix',            track: 'Circuit de Spa-Francorchamps',    location: 'Stavelot, Belgium',                     date: '2026-08-02T13:00:00Z', lat: 50.4372,  lon: 5.9714    },
  { round: 15, name: 'Dutch Grand Prix',              track: 'Circuit Zandvoort',               location: 'Zandvoort, Netherlands',                date: '2026-08-30T13:00:00Z', lat: 52.3888,  lon: 4.5409    },
  { round: 16, name: 'Italian Grand Prix',            track: 'Autodromo Nazionale Monza',       location: 'Monza, Italy',                          date: '2026-09-06T13:00:00Z', lat: 45.6156,  lon: 9.2811    },
  { round: 17, name: 'Singapore Grand Prix',          track: 'Marina Bay Street Circuit',       location: 'Singapore',                             date: '2026-09-20T12:00:00Z', lat: 1.2914,   lon: 103.864   },
  { round: 18, name: 'United States Grand Prix',      track: 'Circuit of the Americas',         location: 'Austin, Texas, USA',                    date: '2026-10-18T19:00:00Z', lat: 30.1328,  lon: -97.6411  },
  { round: 19, name: 'Mexico City Grand Prix',        track: 'Autodromo Hermanos Rodriguez',    location: 'Mexico City, Mexico',                   date: '2026-10-25T20:00:00Z', lat: 19.4042,  lon: -99.0907  },
  { round: 20, name: 'São Paulo Grand Prix',          track: 'Autodromo José Carlos Pace',      location: 'São Paulo, Brazil',                     date: '2026-11-08T17:00:00Z', lat: -23.7036, lon: -46.6997  },
  { round: 21, name: 'Las Vegas Grand Prix',          track: 'Las Vegas Strip Circuit',         location: 'Las Vegas, Nevada, USA',                date: '2026-11-22T06:00:00Z', lat: 36.1147,  lon: -115.1728 },
  { round: 22, name: 'Qatar Grand Prix',              track: 'Lusail International Circuit',    location: 'Lusail, Qatar',                         date: '2026-11-29T14:00:00Z', lat: 25.49,    lon: 51.4542   },
  { round: 23, name: 'Abu Dhabi Grand Prix',          track: 'Yas Marina Circuit',              location: 'Abu Dhabi, UAE',                        date: '2026-12-06T13:00:00Z', lat: 24.4672,  lon: 54.6031   },
]

function buildApproxSchedule(raceDateStr) {
  const race = new Date(raceDateStr)
  const fri  = new Date(race.getTime() - 2 * 86400000)
  const sat  = new Date(race.getTime() - 1 * 86400000)
  const at   = (base, h, m) => { const d = new Date(base); d.setUTCHours(h, m, 0, 0); return d.toISOString() }
  const now  = new Date()
  const s    = t => (new Date(t) < now ? 'Completed' : 'Upcoming')
  return [
    { session: 'Practice 1', startTime: at(fri, 13, 30), status: s(at(fri, 13, 30)) },
    { session: 'Practice 2', startTime: at(fri, 17,  0), status: s(at(fri, 17,  0)) },
    { session: 'Practice 3', startTime: at(sat, 12, 30), status: s(at(sat, 12, 30)) },
    { session: 'Qualifying', startTime: at(sat, 16,  0), status: s(at(sat, 16,  0)) },
    { session: 'Race',       startTime: raceDateStr,     status: s(raceDateStr)      },
  ]
}

export function getFallbackF1Data() {
  const year    = new Date().getFullYear()
  const cutoff  = new Date(Date.now() - 4 * 60 * 60 * 1000)

  // Pick the first race in the calendar that hasn't finished yet (4-hour grace window)
  const next = F1_CALENDAR.find(r => new Date(r.date) > cutoff) || F1_CALENDAR.at(-1)

  const schedule = buildApproxSchedule(next.date)

  return {
    series:      'f1',
    seriesName:  'Formula 1',
    featuredRace: {
      id:          `f1-round-${next.round}-${year}`,
      name:        next.name,
      track:       next.track,
      location:    next.location,
      country:     next.location.split(', ').at(-1),
      date:        next.date,
      raceStart:   next.date,
      nextSession: schedule.find(s => new Date(s.startTime) > new Date()) || null,
      status:      'Upcoming',
      round:       next.round,
      season:      year,
    },
    track: {
      name:     next.track,
      location: next.location,
      lat:      next.lat,
      lon:      next.lon,
      type:     'Grand Prix Circuit',
    },
    schedule,
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
