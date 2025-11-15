import { useState, useMemo, useEffect } from 'react'
import Papa from 'papaparse'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MatchupRow, AggregatedResults } from '@/types'
import { calculateTournamentConfig } from '@/utils/tournamentRules'
import { runMultipleSimulations } from '@/utils/simulation'
import { SimulationResults } from '@/components/SimulationResults'
import { ProgressChart } from '@/components/ProgressChart'
import './App.css'

function App() {
  const [matchupData, setMatchupData] = useState<MatchupRow[]>([])
  const [playRates, setPlayRates] = useState<{ [deck: string]: string }>(() => {
    const saved = localStorage.getItem('pmu_playRates')
    return saved ? JSON.parse(saved) : {}
  })
  const [playerCount, setPlayerCount] = useState<string>(() => {
    const saved = localStorage.getItem('pmu_playerCount')
    return saved || ''
  })
  const [numSimulations, setNumSimulations] = useState<string>('100')
  const [simulationResults, setSimulationResults] = useState<AggregatedResults | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState({ current: 0, total: 0 })
  const [intermediateResults, setIntermediateResults] = useState<AggregatedResults | null>(null)
  const [shouldCancelSimulation, setShouldCancelSimulation] = useState(false)

  // Process data to create matrix structure
  const { decks, matchupMap } = useMemo(() => {
    if (matchupData.length === 0) {
      return { decks: [], matchupMap: new Map<string, MatchupRow>() }
    }

    // Extract unique deck names
    const deckSet = new Set<string>()
    matchupData.forEach((row) => {
      deckSet.add(row.deck1)
      deckSet.add(row.deck2)
    })
    const uniqueDecks = Array.from(deckSet).sort()

    // Create lookup map: "deck1|deck2" -> matchup data
    const map = new Map<string, MatchupRow>()
    matchupData.forEach((row) => {
      const key = `${row.deck1}|${row.deck2}`
      map.set(key, row)
    })

    return { decks: uniqueDecks, matchupMap: map }
  }, [matchupData])

  // Initialize play rates when decks change
  useEffect(() => {
    if (decks.length > 0) {
      setPlayRates((prev) => {
        const newRates: { [key: string]: string } = {}
        decks.forEach((deck) => {
          newRates[deck] = prev[deck] || ''
        })
        return newRates
      })
    }
  }, [decks])

  // Save play rates to localStorage
  useEffect(() => {
    localStorage.setItem('pmu_playRates', JSON.stringify(playRates))
  }, [playRates])

  // Save player count to localStorage
  useEffect(() => {
    localStorage.setItem('pmu_playerCount', playerCount)
  }, [playerCount])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('File selected:', file.name)

    Papa.parse<MatchupRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<MatchupRow>) => {
        console.log('Parsed CSV data:', results.data)
        setMatchupData(results.data as MatchupRow[])
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error)
      },
    })
  }

  const handleReset = () => {
    setMatchupData([])
    setPlayRates({})
    setPlayerCount('')
    localStorage.removeItem('pmu_playRates')
    localStorage.removeItem('pmu_playerCount')
  }

  const handlePlayRateChange = (deck: string, value: string) => {
    setPlayRates((prev) => ({ ...prev, [deck]: value }))
  }

  const handleRunSimulation = async () => {
    const numSims = parseInt(numSimulations)
    const players = parseInt(playerCount)

    if (isNaN(numSims) || numSims < 1 || isNaN(players) || players < 1) {
      return
    }

    setIsSimulating(true)
    setSimulationProgress({ current: 0, total: numSims })
    setIntermediateResults(null)
    setShouldCancelSimulation(false)

    // Run simulations asynchronously to allow UI updates
    setTimeout(async () => {
      try {
        const config = calculateTournamentConfig(players)

        // Convert playRates from string to number
        const playRatesNum: { [deck: string]: number } = {}
        decks.forEach(deck => {
          playRatesNum[deck] = parseFloat(playRates[deck]) || 0
        })

        const results = await runMultipleSimulations(
          decks,
          playRatesNum,
          players,
          matchupMap,
          config,
          numSims,
          (current, total, intermediate) => {
            setSimulationProgress({ current, total })
            if (intermediate) {
              setIntermediateResults(intermediate)
            }
          },
          () => shouldCancelSimulation
        )

        setSimulationResults(results)
      } catch (error) {
        console.error('Simulation error:', error)
        alert('An error occurred during simulation. Check console for details.')
      } finally {
        setIsSimulating(false)
        setSimulationProgress({ current: 0, total: 0 })
        setIntermediateResults(null)
        setShouldCancelSimulation(false)
      }
    }, 100)
  }

  const handleCancelSimulation = () => {
    setShouldCancelSimulation(true)
  }

  // Get matchup data for a specific deck combination
  const getMatchup = (rowDeck: string, colDeck: string): MatchupRow | null => {
    return matchupMap.get(`${rowDeck}|${colDeck}`) || null
  }

  // Calculate win rate for display
  const getWinRate = (matchup: MatchupRow | null): string => {
    if (!matchup) return '-'
    const wins = Number(matchup.wins)
    const losses = Number(matchup.losses)
    const total = wins + losses
    if (total === 0) return '0%'
    const winRate = (wins / total) * 100
    return `${winRate.toFixed(1)}%`
  }

  // Calculate total play rate percentage
  const totalPlayRate = useMemo(() => {
    return Object.values(playRates).reduce((sum, rate) => {
      const num = parseFloat(rate)
      return sum + (isNaN(num) ? 0 : num)
    }, 0)
  }, [playRates])

  // Check if simulation can be run
  const canSimulate = useMemo(() => {
    return (
      matchupData.length > 0 &&
      totalPlayRate === 100 &&
      playerCount !== '' &&
      !isNaN(parseInt(playerCount)) &&
      !isSimulating
    )
  }, [matchupData.length, totalPlayRate, playerCount, isSimulating])

  return (
    <div className="mx-auto p-8">
      <header className="mb-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Pokemon Tournament Simulator</h1>
        <p className="text-gray-600 mb-4">
          Upload matchup data from{' '}
          <a
            className="text-blue-600 hover:underline"
            href="https://www.trainerhill.com/meta?game=PTCG"
            target="_blank"
            rel="noopener noreferrer"
          >
            TrainerHill's meta analysis
          </a>
          . Export the CSV data from TrainerHill to upload here.
        </p>
        <div className="flex gap-4 items-center">
          <Input type="file" accept=".csv" onChange={handleFileUpload} />
          {matchupData.length > 0 && (
            <Button onClick={handleReset} variant="secondary">
              Reset
            </Button>
          )}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="playerCount" className="text-sm font-medium">
              Tournament Players:
            </label>
            <Input
              id="playerCount"
              type="number"
              min="1"
              step="1"
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              className="w-32"
              placeholder="e.g., 128"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="numSimulations" className="text-sm font-medium">
              Simulations:
            </label>
            <Input
              id="numSimulations"
              type="number"
              min="1"
              step="1"
              value={numSimulations}
              onChange={(e) => setNumSimulations(e.target.value)}
              className="w-24"
              placeholder="100"
            />
          </div>
          <Button
            onClick={handleRunSimulation}
            disabled={!canSimulate}
            className="ml-2"
          >
            {isSimulating ? 'Running...' : 'Run Simulation'}
          </Button>
          {isSimulating && (
            <Button
              onClick={handleCancelSimulation}
              variant="secondary"
              className="ml-2"
            >
              Cancel
            </Button>
          )}
        </div>
        {isSimulating && (
          <div className="mt-2 text-sm text-gray-600">
            Progress: {simulationProgress.current} / {simulationProgress.total}
          </div>
        )}
      </header>

      {matchupData.length > 0 && decks.length > 0 && (
        <main>
          <h2 className="text-xl font-semibold mb-4 max-w-4xl mx-auto">
            Matchup Matrix ({decks.length} decks, {matchupData.length} matchups)
          </h2>
          <p className="text-sm text-gray-600 mb-4 max-w-4xl mx-auto">
            Each cell shows the win rate for the row deck against the column deck. Enter play rate percentages for each deck in the left column.
          </p>
          <div className="overflow-x-auto">
            <div className="rounded-md border inline-block min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-10 min-w-[200px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-center text-xs">Play %</span>
                        <span>vs →</span>
                      </div>
                    </TableHead>
                    {decks.map((deck) => (
                      <TableHead key={deck} className="text-center min-w-[100px] text-xs">
                        {deck}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decks.map((rowDeck) => (
                    <TableRow key={rowDeck}>
                      <TableCell className="sticky left-0 bg-white z-10 font-semibold text-xs">
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={playRates[rowDeck] || ''}
                            onChange={(e) => handlePlayRateChange(rowDeck, e.target.value)}
                            className="w-16 h-7 text-xs"
                            placeholder="%"
                          />
                          <span>{rowDeck}</span>
                        </div>
                      </TableCell>
                      {decks.map((colDeck) => {
                        const matchup = getMatchup(rowDeck, colDeck)
                        const winRate = getWinRate(matchup)
                        const isMatch = rowDeck === colDeck

                        return (
                          <TableCell
                            key={colDeck}
                            className={`text-center text-xs ${
                              isMatch
                                ? 'bg-gray-100'
                                : matchup
                                ? 'hover:bg-gray-50 cursor-pointer'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                            title={
                              matchup
                                ? `${rowDeck} vs ${colDeck}: ${matchup.wins}W-${matchup.losses}L`
                                : isMatch
                                ? 'Same deck'
                                : 'No data'
                            }
                          >
                            {isMatch ? '—' : winRate}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-4 max-w-4xl mx-auto">
            <p className="text-sm">
              <span className="font-semibold">Total Play Rate: </span>
              <span className={totalPlayRate === 100 ? 'text-green-600' : 'text-orange-600'}>
                {totalPlayRate.toFixed(1)}%
              </span>
              {totalPlayRate !== 100 && (
                <span className="text-gray-500 ml-2">(should total 100%)</span>
              )}
            </p>
          </div>
        </main>
      )}

      {(intermediateResults || simulationResults) && (
        <ProgressChart
          results={intermediateResults || simulationResults!}
          current={isSimulating ? simulationProgress.current : (simulationResults?.numSimulations || 0)}
          total={isSimulating ? simulationProgress.total : (simulationResults?.numSimulations || 0)}
        />
      )}

      {!isSimulating && simulationResults && (
        <SimulationResults results={simulationResults} />
      )}
    </div>
  )
}

export default App
