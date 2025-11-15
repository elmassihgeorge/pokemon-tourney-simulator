import {
  Player,
  MatchupRow,
  DeckCount,
  SimulationResults,
  AggregatedResults,
} from '@/types'
import { TournamentConfig } from './tournamentRules'

// Utility: Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Create players distributed by deck based on play rates
export function createPlayers(
  decks: string[],
  playRates: { [deck: string]: number },
  totalPlayers: number
): Player[] {
  // Calculate players per deck
  const playerCounts: { [deck: string]: number } = {}
  let assigned = 0

  decks.forEach((deck) => {
    const count = Math.round((totalPlayers * playRates[deck]) / 100)
    playerCounts[deck] = count
    assigned += count
  })

  // Adjust for rounding errors by adding/subtracting from largest deck
  if (assigned !== totalPlayers) {
    const largest = Object.keys(playerCounts).sort(
      (a, b) => playerCounts[b] - playerCounts[a]
    )[0]
    playerCounts[largest] += totalPlayers - assigned
  }

  // Create player array
  const players: Player[] = []
  let id = 1

  decks.forEach((deck) => {
    for (let i = 0; i < playerCounts[deck]; i++) {
      players.push({
        id: id++,
        deck,
        matchPoints: 0,
        opponents: [],
      })
    }
  })

  // Shuffle for random seeding
  return shuffleArray(players)
}

// Pair players for a Swiss round
export function pairPlayers(players: Player[]): [Player, Player][] {
  const pairs: [Player, Player][] = []
  const paired = new Set<number>()

  // Group players by match points
  const mpGroups = new Map<number, Player[]>()
  players.forEach((p) => {
    if (!mpGroups.has(p.matchPoints)) {
      mpGroups.set(p.matchPoints, [])
    }
    mpGroups.get(p.matchPoints)!.push(p)
  })

  // Randomize order within each MP bracket to avoid bias
  mpGroups.forEach((group) => {
    shuffleArray(group)
    mpGroups.set(group[0].matchPoints, shuffleArray(group))
  })

  // Sort MP keys descending
  const sortedMPs = Array.from(mpGroups.keys()).sort((a, b) => b - a)

  // Pair each player
  for (const player of players) {
    if (paired.has(player.id)) continue

    // Find opponent in same or lower MP bracket
    let opponent: Player | null = null

    for (const mp of sortedMPs) {
      if (mp > player.matchPoints) continue

      const candidates = mpGroups
        .get(mp)!
        .filter(
          (p) =>
            !paired.has(p.id) &&
            p.id !== player.id &&
            !player.opponents.includes(p.id)
        )

      if (candidates.length > 0) {
        // Random selection from valid opponents
        opponent = candidates[Math.floor(Math.random() * candidates.length)]
        break
      }
    }

    if (opponent) {
      pairs.push([player, opponent])
      paired.add(player.id)
      paired.add(opponent.id)
    } else {
      // Bye: award 3 points, opponent ID = 0
      player.matchPoints += 3
      player.opponents.push(0)
    }
  }

  return pairs
}

// Simulate a single match between two players
export function playMatch(
  p1: Player,
  p2: Player,
  matchupMap: Map<string, MatchupRow>
): void {
  // Get matchup data
  const key = `${p1.deck}|${p2.deck}`
  const reverseKey = `${p2.deck}|${p1.deck}`
  const matchup = matchupMap.get(key) || matchupMap.get(reverseKey)

  if (!matchup || p1.deck === p2.deck) {
    // Mirror match or no data: 50-50
    if (Math.random() < 0.5) {
      p1.matchPoints += 3
    } else {
      p2.matchPoints += 3
    }
  } else {
    // Calculate win rates
    const isReverse = matchup.deck1 !== p1.deck
    const wins = Number(matchup.wins)
    const losses = Number(matchup.losses)
    const total = wins + losses

    if (total === 0) {
      // No data, treat as 50-50
      if (Math.random() < 0.5) {
        p1.matchPoints += 3
      } else {
        p2.matchPoints += 3
      }
      p1.opponents.push(p2.id)
      p2.opponents.push(p1.id)
      return
    }

    // p1 win rate (adjust if matchup is reversed)
    let p1WinRate = isReverse ? losses / total : wins / total
    let p2WinRate = isReverse ? wins / total : losses / total

    // Calculate tie rate (remaining percentage)
    const tieRate = 1 - (p1WinRate + p2WinRate)

    // First roll: check for tie
    const tieRoll = Math.random()
    if (tieRoll < tieRate) {
      // Tie: both get 1 point
      p1.matchPoints += 1
      p2.matchPoints += 1
    } else {
      // Roll for winner
      // Normalize win rates to exclude ties
      p1WinRate = p1WinRate / (p1WinRate + p2WinRate)

      const winRoll = Math.random()
      if (winRoll < p1WinRate) {
        p1.matchPoints += 3
      } else {
        p2.matchPoints += 3
      }
    }
  }

  // Update opponent history
  p1.opponents.push(p2.id)
  p2.opponents.push(p1.id)
}

// Count players by deck
export function countByDeck(players: Player[]): DeckCount {
  const counts: DeckCount = {}
  players.forEach((p) => {
    counts[p.deck] = (counts[p.deck] || 0) + 1
  })
  return counts
}

// Run a complete tournament (Day 1 + Day 2)
export function runTournament(
  players: Player[],
  matchupMap: Map<string, MatchupRow>,
  config: TournamentConfig
): SimulationResults {
  // Day 1: Swiss rounds
  for (let round = 0; round < config.day1Rounds; round++) {
    const pairs = pairPlayers(players)
    pairs.forEach(([p1, p2]) => playMatch(p1, p2, matchupMap))
  }

  // Filter for Day 2 (players with enough match points)
  const day2Players = players.filter((p) => p.matchPoints >= config.day2Cutoff)

  // Day 2: Additional Swiss rounds
  for (let round = 0; round < config.day2Rounds; round++) {
    const pairs = pairPlayers(day2Players)
    pairs.forEach(([p1, p2]) => playMatch(p1, p2, matchupMap))
  }

  // Sort by match points (descending)
  day2Players.sort((a, b) => b.matchPoints - a.matchPoints)

  // Extract results
  const results: SimulationResults = {
    day1Players: countByDeck(players),
    day2Players: countByDeck(day2Players),
    top8: countByDeck(day2Players.slice(0, Math.min(8, day2Players.length))),
  }

  if (config.topCutSize >= 16) {
    results.top16 = countByDeck(
      day2Players.slice(0, Math.min(16, day2Players.length))
    )
  }
  if (config.topCutSize >= 32) {
    results.top32 = countByDeck(
      day2Players.slice(0, Math.min(32, day2Players.length))
    )
  }

  return results
}

// Run multiple simulations and aggregate results
export async function runMultipleSimulations(
  decks: string[],
  playRates: { [deck: string]: number },
  totalPlayers: number,
  matchupMap: Map<string, MatchupRow>,
  config: TournamentConfig,
  numSimulations: number,
  onProgress?: (current: number, total: number, intermediateResults?: AggregatedResults) => void,
  shouldCancel?: () => boolean
): Promise<AggregatedResults> {
  const aggregated = {
    numSimulations,
    day1Counts: {} as DeckCount,
    day2Avg: {} as DeckCount,
    top8Avg: {} as DeckCount,
    top16Avg: config.topCutSize >= 16 ? ({} as DeckCount) : undefined,
    top32Avg: config.topCutSize >= 32 ? ({} as DeckCount) : undefined,
    day2ConversionRate: {} as DeckCount,
    top8ConversionRate: {} as DeckCount,
  }

  // Initialize counts
  decks.forEach((deck) => {
    aggregated.day1Counts[deck] = 0
    aggregated.day2Avg[deck] = 0
    aggregated.top8Avg[deck] = 0
    if (aggregated.top16Avg) aggregated.top16Avg[deck] = 0
    if (aggregated.top32Avg) aggregated.top32Avg[deck] = 0
  })

  // Helper to yield to browser
  const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0))

  // Track actual number of simulations completed
  let completedSimulations = 0

  // Run simulations
  for (let i = 0; i < numSimulations; i++) {
    // Check if simulation should be cancelled
    if (shouldCancel && shouldCancel()) {
      break
    }

    const players = createPlayers(decks, playRates, totalPlayers)
    const simResult = runTournament(players, matchupMap, config)
    completedSimulations++

    // Aggregate Day 1 counts (should be same every time)
    if (i === 0) {
      aggregated.day1Counts = { ...simResult.day1Players }
    }

    // Aggregate Day 2 results
    Object.keys(simResult.day2Players).forEach((deck) => {
      aggregated.day2Avg[deck] =
        (aggregated.day2Avg[deck] || 0) + simResult.day2Players[deck]
    })

    // Aggregate Top 8
    Object.keys(simResult.top8).forEach((deck) => {
      aggregated.top8Avg[deck] =
        (aggregated.top8Avg[deck] || 0) + simResult.top8[deck]
    })

    // Aggregate Top 16 if applicable
    if (aggregated.top16Avg && simResult.top16) {
      Object.keys(simResult.top16).forEach((deck) => {
        aggregated.top16Avg![deck] =
          (aggregated.top16Avg![deck] || 0) + simResult.top16![deck]
      })
    }

    // Aggregate Top 32 if applicable
    if (aggregated.top32Avg && simResult.top32) {
      Object.keys(simResult.top32).forEach((deck) => {
        aggregated.top32Avg![deck] =
          (aggregated.top32Avg![deck] || 0) + simResult.top32![deck]
      })
    }

    // Report progress with intermediate results
    if (onProgress) {
      // Calculate intermediate averages and conversion rates
      const currentSimCount = i + 1
      const intermediate: AggregatedResults = {
        numSimulations: currentSimCount,
        day1Counts: { ...aggregated.day1Counts },
        day2Avg: {} as DeckCount,
        top8Avg: {} as DeckCount,
        top16Avg: aggregated.top16Avg ? ({} as DeckCount) : undefined,
        top32Avg: aggregated.top32Avg ? ({} as DeckCount) : undefined,
        day2ConversionRate: {} as DeckCount,
        top8ConversionRate: {} as DeckCount,
      }

      decks.forEach((deck) => {
        intermediate.day2Avg[deck] = aggregated.day2Avg[deck] / currentSimCount
        intermediate.top8Avg[deck] = aggregated.top8Avg[deck] / currentSimCount
        if (intermediate.top16Avg && aggregated.top16Avg) {
          intermediate.top16Avg[deck] = aggregated.top16Avg[deck] / currentSimCount
        }
        if (intermediate.top32Avg && aggregated.top32Avg) {
          intermediate.top32Avg[deck] = aggregated.top32Avg[deck] / currentSimCount
        }

        intermediate.day2ConversionRate[deck] =
          intermediate.day1Counts[deck] > 0
            ? (intermediate.day2Avg[deck] / intermediate.day1Counts[deck]) * 100
            : 0

        intermediate.top8ConversionRate[deck] =
          intermediate.day2Avg[deck] > 0
            ? (intermediate.top8Avg[deck] / intermediate.day2Avg[deck]) * 100
            : 0
      })

      onProgress(currentSimCount, numSimulations, intermediate)
    }

    // Yield to browser after each simulation to allow UI updates
    await yieldToBrowser()
  }

  // Update to reflect actual completed simulations
  aggregated.numSimulations = completedSimulations

  // Calculate final averages
  if (completedSimulations > 0) {
    decks.forEach((deck) => {
      aggregated.day2Avg[deck] /= completedSimulations
      aggregated.top8Avg[deck] /= completedSimulations
      if (aggregated.top16Avg) aggregated.top16Avg[deck] /= completedSimulations
      if (aggregated.top32Avg) aggregated.top32Avg[deck] /= completedSimulations

      // Calculate conversion rates
      aggregated.day2ConversionRate[deck] =
        aggregated.day1Counts[deck] > 0
          ? (aggregated.day2Avg[deck] / aggregated.day1Counts[deck]) * 100
          : 0

      aggregated.top8ConversionRate[deck] =
        aggregated.day2Avg[deck] > 0
          ? (aggregated.top8Avg[deck] / aggregated.day2Avg[deck]) * 100
          : 0
    })
  }

  return aggregated
}
