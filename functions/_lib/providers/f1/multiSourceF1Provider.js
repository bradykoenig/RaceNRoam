// Multi-source F1 data provider - tries multiple APIs and validates results
// Uses the most reliable free sources available

export async function getNextRaceMultiSource() {
  const now = new Date()
  const currentYear = now.getFullYear()

  // Try StatsBomb F1 API (most reliable for current season)
  try {
    const response = await fetch('https://www.statsf1.com/api/schedule', {
      headers: { 'User-Agent': 'RaceNRoam/1.0' }
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        const nextRace = data.find(race => {
          const raceDate = new Date(race.date)
          return raceDate > now && raceDate.getFullYear() === currentYear
        })

        if (nextRace && isValidRaceData(nextRace)) {
          console.log('Using StatsBomb F1 API data')
          return formatRaceData(nextRace)
        }
      }
    }
  } catch (err) {
    console.log('StatsBomb API unavailable:', err.message)
  }

  // Fallback to Ergast with strict validation
  try {
    const response = await fetch(`https://ergast.com/api/f1/${currentYear}.json`, {
      headers: { 'User-Agent': 'RaceNRoam/1.0' }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.MRData?.RaceTable?.Races) {
        const nextRace = data.MRData.RaceTable.Races.find(race => {
          const raceDate = new Date(`${race.date}T${race.time || '14:00:00'}Z`)
          return raceDate > now
        })

        if (nextRace && isValidErgastRace(nextRace)) {
          console.log('Using Ergast API data (validated)')
          return formatErgastRace(nextRace)
        }
      }
    }
  } catch (err) {
    console.log('Ergast API unavailable:', err.message)
  }

  // If all APIs fail, return null and fallback to static data
  console.log('All live F1 APIs failed, will use static fallback')
  return null
}

function isValidRaceData(race) {
  return race.date && race.name && race.circuit
}

function isValidErgastRace(race) {
  const year = new Date(race.date).getFullYear()
  const currentYear = new Date().getFullYear()
  return year === currentYear && race.name && race.Circuit
}

function formatRaceData(race) {
  return {
    round: race.round || 1,
    name: race.name,
    circuit: race.circuit?.name || race.circuit || race.name,
    location: race.circuit?.location || race.location || '',
    country: race.country || race.circuit?.country || '',
    date: race.date,
    lat: parseFloat(race.circuit?.latitude) || null,
    lon: parseFloat(race.circuit?.longitude) || null,
    sessions: {
      fp1: race.fp1_date || null,
      fp2: race.fp2_date || null,
      fp3: race.fp3_date || null,
      qualifying: race.qualifying_date || null,
      sprint: race.sprint_date || null,
    }
  }
}

function formatErgastRace(race) {
  return {
    round: parseInt(race.round),
    name: race.name,
    circuit: race.Circuit?.circuitName || race.name,
    location: race.Circuit?.Location?.locality || '',
    country: race.Circuit?.Location?.country || '',
    date: race.date,
    lat: parseFloat(race.Circuit?.Location?.lat) || null,
    lon: parseFloat(race.Circuit?.Location?.long) || null,
    sessions: {
      fp1: race.FirstPractice?.date ? `${race.FirstPractice.date}T${race.FirstPractice.time}Z` : null,
      fp2: race.SecondPractice?.date ? `${race.SecondPractice.date}T${race.SecondPractice.time}Z` : null,
      fp3: race.ThirdPractice?.date ? `${race.ThirdPractice.date}T${race.ThirdPractice.time}Z` : null,
      qualifying: race.Qualifying?.date ? `${race.Qualifying.date}T${race.Qualifying.time}Z` : null,
      sprint: race.Sprint?.date ? `${race.Sprint.date}T${race.Sprint.time}Z` : null,
    }
  }
}
