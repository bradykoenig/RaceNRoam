// Alternative F1 API - Direct fetch from F1's public data
// Most reliable source for current season data

export async function getF1ApiNextRace() {
  try {
    const year = new Date().getFullYear()

    // Try F1 API directly
    const response = await fetch(`https://www.formula1.com/en/results/${year}/races.json`, {
      headers: { 'User-Agent': 'RaceNRoam/1.0' }
    }).catch(() => null)

    if (!response?.ok) return null

    const data = await response.json()
    const races = data.races || []

    const now = new Date()
    const nextRace = races.find(race => {
      const raceDate = new Date(race.date)
      return raceDate > now
    })

    if (!nextRace) return null

    return {
      round: nextRace.round || 1,
      name: nextRace.name || 'F1 Race',
      circuit: nextRace.circuit?.name || nextRace.name,
      location: nextRace.circuit?.location?.place || '',
      country: nextRace.circuit?.location?.country || '',
      date: nextRace.date || new Date().toISOString(),
      lat: parseFloat(nextRace.circuit?.location?.latitude) || null,
      lon: parseFloat(nextRace.circuit?.location?.longitude) || null,
      sessions: {
        fp1: nextRace.sessions?.fp1?.date || null,
        fp2: nextRace.sessions?.fp2?.date || null,
        fp3: nextRace.sessions?.fp3?.date || null,
        qualifying: nextRace.sessions?.qualifying?.date || null,
        sprint: nextRace.sessions?.sprint?.date || null,
      }
    }
  } catch (err) {
    console.error('F1 API error:', err.message)
    return null
  }
}

// Simple fallback - return hardcoded 2026 upcoming races
export function getF1CurrentSeason() {
  const now = new Date()
  const year = now.getFullYear()

  // 2026 F1 Schedule (approximate)
  const races = [
    { round: 1, name: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', country: 'Bahrain', date: '2026-03-08' },
    { round: 2, name: 'Saudi Arabian Grand Prix', circuit: 'Jeddah Corniche Circuit', country: 'Saudi Arabia', date: '2026-03-15' },
    { round: 3, name: 'Australian Grand Prix', circuit: 'Albert Park Circuit', country: 'Australia', date: '2026-03-29' },
    { round: 4, name: 'Japanese Grand Prix', circuit: 'Suzuka International Racing Course', country: 'Japan', date: '2026-04-12' },
    { round: 5, name: 'Chinese Grand Prix', circuit: 'Shanghai International Circuit', country: 'China', date: '2026-04-19' },
    { round: 6, name: 'Monaco Grand Prix', circuit: 'Circuit de Monaco', country: 'Monaco', date: '2026-05-24' },
    { round: 7, name: 'Canadian Grand Prix', circuit: 'Circuit Gilles Villeneuve', country: 'Canada', date: '2026-06-07' },
    { round: 8, name: 'Spanish Grand Prix', circuit: 'Circuit de Barcelona-Catalunya', country: 'Spain', date: '2026-06-14' },
    { round: 9, name: 'Austrian Grand Prix', circuit: 'Red Bull Ring', country: 'Austria', date: '2026-06-28' },
    { round: 10, name: 'British Grand Prix', circuit: 'Silverstone Circuit', country: 'United Kingdom', date: '2026-07-05' },
  ]

  const nextRace = races.find(race => new Date(race.date) > now)
  return nextRace || races[races.length - 1]
}
