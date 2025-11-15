import { AggregatedResults } from '@/types'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

interface SimulationResultsProps {
  results: AggregatedResults
}

export function SimulationResults({ results }: SimulationResultsProps) {
  // Get all decks sorted by Day 2 conversion rate
  const decks = Object.keys(results.day2ConversionRate).sort(
    (a, b) => results.day2ConversionRate[b] - results.day2ConversionRate[a]
  )

  return (
    <div className="mt-8 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Simulation Results</h2>
      <p className="text-sm text-gray-600 mb-4">
        Based on {results.numSimulations} simulation runs
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Deck</TableHead>
              <TableHead className="text-center">Day 1 Count</TableHead>
              <TableHead className="text-center">Avg Day 2</TableHead>
              <TableHead className="text-center">Day 2 %</TableHead>
              <TableHead className="text-center">Avg Top 8</TableHead>
              <TableHead className="text-center">Top 8 Conv %</TableHead>
              {results.top16Avg && (
                <TableHead className="text-center">Avg Top 16</TableHead>
              )}
              {results.top32Avg && (
                <TableHead className="text-center">Avg Top 32</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {decks.map((deck) => {
              const day1Count = results.day1Counts[deck] || 0
              const day2Avg = results.day2Avg[deck] || 0
              const top8Avg = results.top8Avg[deck] || 0
              const day2Conv = results.day2ConversionRate[deck] || 0
              const top8Conv = results.top8ConversionRate[deck] || 0

              return (
                <TableRow key={deck}>
                  <TableCell className="font-semibold text-sm">{deck}</TableCell>
                  <TableCell className="text-center">{day1Count}</TableCell>
                  <TableCell className="text-center">
                    {day2Avg.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-center">
                    {day2Conv.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {top8Avg.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {top8Conv.toFixed(1)}%
                  </TableCell>
                  {results.top16Avg && (
                    <TableCell className="text-center">
                      {(results.top16Avg[deck] || 0).toFixed(2)}
                    </TableCell>
                  )}
                  {results.top32Avg && (
                    <TableCell className="text-center">
                      {(results.top32Avg[deck] || 0).toFixed(2)}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Day 2 %:</strong> Percentage of Day 1 players of that deck
          that qualified for Day 2 (19+ match points)
        </p>
        <p>
          <strong>Top 8 Conv %:</strong> Percentage of Day 2 players of that
          deck that finished in Top 8
        </p>
      </div>
    </div>
  )
}
