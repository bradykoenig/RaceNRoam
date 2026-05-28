// Generic motorsport provider for MotoGP
// Set ENABLE_LIVE_MOTOGP=true to activate with an appropriate key

export async function isEnabled(env) {
  return env?.ENABLE_LIVE_MOTOGP === 'true' && (
    !!env?.DATASPORTSGROUP_API_KEY || !!env?.ENETPULSE_API_KEY ||
    !!env?.SPORTMONKS_API_KEY     || !!env?.GENERIC_MOTORSPORTS_API_KEY
  )
}

// TODO: DataSportsGroup covers MotoGP. Implement once credentials are available.
export async function getMotoGPData(env) {
  throw new Error(
    'MotoGP live provider requires configuration. Set ENABLE_LIVE_MOTOGP=true and provide an API key. ' +
    'Falling back to local data.'
  )
}
