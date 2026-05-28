// Generic motorsport provider for IMSA/WEC
// Same pattern as IndyCar – supports DataSportsGroup, Enetpulse, etc.

export async function isEnabled(env) {
  return env?.ENABLE_LIVE_IMSA_WEC === 'true' && (
    !!env?.DATASPORTSGROUP_API_KEY || !!env?.ENETPULSE_API_KEY ||
    !!env?.SPORTMONKS_API_KEY     || !!env?.GENERIC_MOTORSPORTS_API_KEY
  )
}

// TODO: Implement actual provider calls once you have API credentials.
// Both DataSportsGroup and Enetpulse cover WEC/IMSA endurance events.
export async function getImsaWecData(env) {
  throw new Error(
    'IMSA/WEC live provider requires configuration. Set ENABLE_LIVE_IMSA_WEC=true and provide an API key. ' +
    'Falling back to local data.'
  )
}
