// Generic motorsport data provider for IndyCar
// Supports: DataSportsGroup, Enetpulse, Sportmonks, or GENERIC_MOTORSPORTS_API_KEY
// Set ENABLE_LIVE_INDYCAR=true to activate with an appropriate key

// DataSportsGroup: https://www.datasportsgroup.com/
// Enetpulse:       https://www.enetpulse.com/
// Sportmonks:      https://www.sportmonks.com/

export async function isEnabled(env) {
  return env?.ENABLE_LIVE_INDYCAR === 'true' && (
    !!env?.DATASPORTSGROUP_API_KEY ||
    !!env?.ENETPULSE_API_KEY       ||
    !!env?.SPORTMONKS_API_KEY      ||
    !!env?.GENERIC_MOTORSPORTS_API_KEY
  )
}

function getProviderConfig(env) {
  if (env?.DATASPORTSGROUP_API_KEY) return { name: 'datasportsgroup', key: env.DATASPORTSGROUP_API_KEY }
  if (env?.ENETPULSE_API_KEY)       return { name: 'enetpulse',       key: env.ENETPULSE_API_KEY }
  if (env?.SPORTMONKS_API_KEY)      return { name: 'sportmonks',      key: env.SPORTMONKS_API_KEY }
  if (env?.GENERIC_MOTORSPORTS_API_KEY) return { name: 'generic',    key: env.GENERIC_MOTORSPORTS_API_KEY }
  return null
}

// TODO: Once you have an account with one of these providers, implement the actual
// API calls here following their specific endpoint documentation.
// Common pattern for most providers:
//   GET /motorsport/indycar/schedule?season=2026&apikey=KEY
//   GET /motorsport/indycar/standings?season=2026&apikey=KEY
//   GET /motorsport/indycar/races/next?apikey=KEY

export async function getIndyCarData(env) {
  const cfg = getProviderConfig(env)
  if (!cfg) throw new Error('No motorsport API key configured for IndyCar')

  // Provider-specific implementation needed:
  throw new Error(
    `IndyCar live provider (${cfg.name}) requires implementation. ` +
    'Consult the provider API docs and implement fetch calls here. ' +
    'Falling back to local data.'
  )
}
