// Jolpica / Ergast-compatible F1 API provider
// Base URL: https://api.jolpi.ca/ergast/f1/
// Free, no API key required.

const BASE = 'https://api.jolpi.ca/ergast/f1'
const YEAR = new Date().getFullYear()

async function get(path) {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    cache: 'no-store',   // bypass Cloudflare edge cache — always get fresh Jolpica data
  })
  if (!res.ok) throw new Error(`Jolpica ${path} → HTTP ${res.status}`)
  return res.json()
}

function safeGet(data, ...keys) {
  return keys.reduce((obj, k) => obj?.[k], data)
}

export async function getCurrentSeasonSchedule() {
  const data = await get(`/${YEAR}.json?limit=30`)
  const races = safeGet(data, 'MRData', 'RaceTable', 'Races') || []
  return races.map(r => ({
    round:     parseInt(r.round, 10),
    name:      r.raceName,
    circuit:   r.Circuit?.circuitName,
    location:  `${r.Circuit?.Location?.locality}, ${r.Circuit?.Location?.country}`,
    lat:       parseFloat(r.Circuit?.Location?.lat),
    lon:       parseFloat(r.Circuit?.Location?.long),
    date:      r.date && r.time ? `${r.date}T${r.time}` : r.date,
    country:   r.Circuit?.Location?.country,
    sessions: {
      fp1:       r.FirstPractice  ? `${r.FirstPractice.date}T${r.FirstPractice.time}`   : null,
      fp2:       r.SecondPractice ? `${r.SecondPractice.date}T${r.SecondPractice.time}` : null,
      fp3:       r.ThirdPractice  ? `${r.ThirdPractice.date}T${r.ThirdPractice.time}`   : null,
      qualifying:r.Qualifying     ? `${r.Qualifying.date}T${r.Qualifying.time}`         : null,
      sprint:    r.Sprint         ? `${r.Sprint.date}T${r.Sprint.time}`                  : null,
    },
  }))
}

export async function getNextRace() {
  const data = await get(`/${YEAR}/next.json`)
  const race = safeGet(data, 'MRData', 'RaceTable', 'Races', 0)
  if (!race) return null
  return {
    round:    parseInt(race.round, 10),
    name:     race.raceName,
    circuit:  race.Circuit?.circuitName,
    location: `${race.Circuit?.Location?.locality}, ${race.Circuit?.Location?.country}`,
    lat:      parseFloat(race.Circuit?.Location?.lat),
    lon:      parseFloat(race.Circuit?.Location?.long),
    date:     race.date && race.time ? `${race.date}T${race.time}` : race.date,
    country:  race.Circuit?.Location?.country,
    sessions: {
      fp1:       race.FirstPractice   ? `${race.FirstPractice.date}T${race.FirstPractice.time}`   : null,
      fp2:       race.SecondPractice  ? `${race.SecondPractice.date}T${race.SecondPractice.time}` : null,
      fp3:       race.ThirdPractice   ? `${race.ThirdPractice.date}T${race.ThirdPractice.time}`   : null,
      qualifying:race.Qualifying      ? `${race.Qualifying.date}T${race.Qualifying.time}`         : null,
      sprint:    race.Sprint          ? `${race.Sprint.date}T${race.Sprint.time}`                  : null,
    },
  }
}

export async function getDriverStandings() {
  const data = await get(`/${YEAR}/driverStandings.json`)
  const list = safeGet(data, 'MRData', 'StandingsTable', 'StandingsLists', 0, 'DriverStandings') || []
  return list.map(s => ({
    pos:    parseInt(s.position, 10),
    driver: `${s.Driver?.givenName} ${s.Driver?.familyName}`,
    nat:    s.Driver?.nationality,
    team:   s.Constructors?.[0]?.name,
    pts:    parseFloat(s.points),
    wins:   parseInt(s.wins, 10),
  }))
}

export async function getConstructorStandings() {
  const data = await get(`/${YEAR}/constructorStandings.json`)
  const list = safeGet(data, 'MRData', 'StandingsTable', 'StandingsLists', 0, 'ConstructorStandings') || []
  return list.map(s => ({
    pos:  parseInt(s.position, 10),
    team: s.Constructor?.name,
    pts:  parseFloat(s.points),
    wins: parseInt(s.wins, 10),
  }))
}

export async function getRaceResults(round = 'last') {
  const data = await get(`/${YEAR}/${round}/results.json`)
  const results = safeGet(data, 'MRData', 'RaceTable', 'Races', 0, 'Results') || []
  return results.map(r => ({
    pos:    parseInt(r.position, 10),
    driver: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
    team:   r.Constructor?.name,
    time:   r.Time?.time,
    status: r.status,
    pts:    parseFloat(r.points),
    grid:   parseInt(r.grid, 10),
  }))
}

export async function getQualifyingResults(round = 'last') {
  const data = await get(`/${YEAR}/${round}/qualifying.json`)
  const results = safeGet(data, 'MRData', 'RaceTable', 'Races', 0, 'QualifyingResults') || []
  return results.map(r => ({
    pos:    parseInt(r.position, 10),
    driver: `${r.Driver?.givenName} ${r.Driver?.familyName}`,
    team:   r.Constructor?.name,
    q1:     r.Q1, q2: r.Q2, q3: r.Q3,
  }))
}
