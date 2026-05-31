// Ergast F1 API - Free, reliable schedule data (no rate limits)
// Used as backup when Jolpica is unavailable

const ERGAST_BASE = 'https://ergast.com/api/f1'

export async function getErgastNextRace() {
  try {
    const year = new Date().getFullYear()
    const response = await fetch(`${ERGAST_BASE}/${year}/races.json?limit=100`, {
      headers: { 'User-Agent': 'RaceNRoam/1.0' }
    })

    if (!response.ok) return null

    const data = await response.json()
    if (!data.MRData?.RaceTable?.Races) return null

    const now = new Date()
    const nextRace = data.MRData.RaceTable.Races.find(race => {
      const raceDate = new Date(`${race.date}T${race.time || '00:00:00'}Z`)
      return raceDate > now
    })

    if (!nextRace) return null

    return {
      round: parseInt(nextRace.round),
      name: nextRace.name,
      circuit: nextRace.Circuit?.circuitName || nextRace.name,
      location: nextRace.Circuit?.Location?.locality || '',
      country: nextRace.Circuit?.Location?.country || '',
      date: nextRace.date,
      lat: parseFloat(nextRace.Circuit?.Location?.lat) || null,
      lon: parseFloat(nextRace.Circuit?.Location?.long) || null,
      sessions: {
        fp1: nextRace.FirstPractice?.date ? `${nextRace.FirstPractice.date}T${nextRace.FirstPractice.time}Z` : null,
        fp2: nextRace.SecondPractice?.date ? `${nextRace.SecondPractice.date}T${nextRace.SecondPractice.time}Z` : null,
        fp3: nextRace.ThirdPractice?.date ? `${nextRace.ThirdPractice.date}T${nextRace.ThirdPractice.time}Z` : null,
        qualifying: nextRace.Qualifying?.date ? `${nextRace.Qualifying.date}T${nextRace.Qualifying.time}Z` : null,
        sprint: nextRace.Sprint?.date ? `${nextRace.Sprint.date}T${nextRace.Sprint.time}Z` : null,
      }
    }
  } catch (err) {
    console.error('Ergast API error:', err.message)
    return null
  }
}

export async function getErgastStandings() {
  try {
    const year = new Date().getFullYear()
    const response = await fetch(`${ERGAST_BASE}/${year}/driverStandings.json?limit=30`, {
      headers: { 'User-Agent': 'RaceNRoam/1.0' }
    })

    if (!response.ok) return []

    const data = await response.json()
    if (!data.MRData?.StandingsTable?.StandingsLists?.[0]) return []

    const standings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings || []

    return standings.map(driver => ({
      position: parseInt(driver.position),
      points: parseFloat(driver.points),
      name: `${driver.Driver.givenName} ${driver.Driver.familyName}`,
      code: driver.Driver.code || '',
      team: driver.Constructors?.[0]?.name || 'Unknown',
      wins: parseInt(driver.wins)
    }))
  } catch (err) {
    console.error('Ergast standings error:', err.message)
    return []
  }
}

export async function getErgastConstructorStandings() {
  try {
    const year = new Date().getFullYear()
    const response = await fetch(`${ERGAST_BASE}/${year}/constructorStandings.json?limit=20`, {
      headers: { 'User-Agent': 'RaceNRoam/1.0' }
    })

    if (!response.ok) return []

    const data = await response.json()
    if (!data.MRData?.StandingsTable?.StandingsLists?.[0]) return []

    const standings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings || []

    return standings.map(team => ({
      position: parseInt(team.position),
      points: parseFloat(team.points),
      name: team.Constructor.name,
      nationality: team.Constructor.nationality,
      wins: parseInt(team.wins)
    }))
  } catch (err) {
    console.error('Ergast constructor standings error:', err.message)
    return []
  }
}
