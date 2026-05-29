// All API endpoint paths. Frontend only calls our own /api/* routes.
export const ENDPOINTS = {
  health:     '/api/health',
  today:      '/api/today',
  calendar:   '/api/calendar',
  weather:    (params) => `/api/weather?${new URLSearchParams(params).toString()}`,
  standings:  (series) => `/api/standings?series=${series}`,
  schedule:   (series) => `/api/schedule?series=${series}`,
  streamMode: (series) => `/api/stream-mode?series=${series}`,
  live:       (series) => `/api/live?series=${series}`,
  series:     (s)      => `/api/series/${s}`,
}

// Series slugs used throughout the app
export const SERIES_SLUGS = ['f1', 'nascar', 'indycar', 'imsa-wec', 'motogp']

export const SERIES_META = {
  f1: {
    slug: 'f1',
    name: 'Formula 1',
    shortName: 'F1',
    color: '#e10600',
    cssVar: 'var(--color-f1)',
    badgeClass: 'badge-f1',
    path: '/watch-party/f1',
    icon: '🏎️',
  },
  nascar: {
    slug: 'nascar',
    name: 'NASCAR Cup Series',
    shortName: 'NASCAR',
    color: '#f5be41',
    cssVar: 'var(--color-nascar)',
    badgeClass: 'badge-nascar',
    path: '/watch-party/nascar',
    icon: '🏁',
  },
  indycar: {
    slug: 'indycar',
    name: 'NTT IndyCar Series',
    shortName: 'IndyCar',
    color: '#2563eb',
    cssVar: 'var(--color-indycar)',
    badgeClass: 'badge-indycar',
    path: '/watch-party/indycar',
    icon: '⚡',
  },
  'imsa-wec': {
    slug: 'imsa-wec',
    name: 'IMSA / WEC Endurance',
    shortName: 'IMSA/WEC',
    color: '#0ea5e9',
    cssVar: 'var(--color-imsa)',
    badgeClass: 'badge-imsa',
    path: '/watch-party/imsa-wec',
    icon: '🕐',
  },
  motogp: {
    slug: 'motogp',
    name: 'MotoGP World Championship',
    shortName: 'MotoGP',
    color: '#cc2222',
    cssVar: 'var(--color-motogp)',
    badgeClass: 'badge-motogp',
    path: '/watch-party/motogp',
    icon: '🏍️',
  },
}
