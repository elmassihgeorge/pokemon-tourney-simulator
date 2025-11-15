// Official Pokemon TCG tournament rules for round calculation
// Based on 2024 Regional Championship format

export interface TournamentConfig {
  day1Rounds: number
  day2Rounds: number
  day2Cutoff: number // Match points needed to advance to Day 2
  topCutSize: number
}

export function calculateTournamentConfig(playerCount: number): TournamentConfig {
  // Regional Championship format (2024)
  // Day 1: 9 Swiss rounds
  // Day 2 cutoff: 19+ match points
  // Day 2: 6 Swiss rounds (total 15 rounds)

  // Top cut size varies by player count
  let topCutSize: number
  if (playerCount >= 410) {
    topCutSize = 32
  } else if (playerCount >= 227) {
    topCutSize = 16
  } else {
    topCutSize = 8
  }

  return {
    day1Rounds: 9,
    day2Rounds: 6,
    day2Cutoff: 19,
    topCutSize,
  }
}
