import { AggregatedResults } from '@/types'

interface ProgressChartProps {
  results: AggregatedResults
  current: number
  total: number
}

export function ProgressChart({ results, current, total }: ProgressChartProps) {
  // Get decks sorted by Day 2 conversion rate (descending)
  const decks = Object.keys(results.day2ConversionRate).sort(
    (a, b) => results.day2ConversionRate[b] - results.day2ConversionRate[a]
  )

  // Find max conversion rate for scaling
  const maxRate = Math.max(...Object.values(results.day2ConversionRate), 100)

  const isComplete = current >= total
  const wasCancelled = isComplete && results.numSimulations < total

  return (
    <div className="mt-8 max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">
          {isComplete ? (wasCancelled ? 'Simulation Cancelled' : 'Simulation Complete') : 'Simulation in Progress...'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {current} / {total} simulations complete
          {wasCancelled && ' (stopped early)'}
        </p>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(current / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">
          Day 2 Qualification Rate by Deck (Live)
        </h3>
        <div className="space-y-3">
          {decks.map((deck) => {
            const rate = results.day2ConversionRate[deck]
            const barWidth = (rate / maxRate) * 100

            return (
              <div key={deck} className="flex items-center gap-3">
                <div className="w-48 text-sm font-medium truncate" title={deck}>
                  {deck}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-3"
                    style={{ width: `${barWidth}%` }}
                  >
                    {barWidth > 15 && (
                      <span className="text-white text-xs font-semibold">
                        {rate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {barWidth <= 15 && (
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-700">
                      {rate.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="w-24 text-sm text-gray-600 text-right">
                  {results.day2Avg[deck].toFixed(1)} / {results.day1Counts[deck]}
                </div>
              </div>
            )
          })}
        </div>
        {!isComplete && (
          <div className="mt-4 text-xs text-gray-500">
            Values shown are current averages and will stabilize as more simulations complete
          </div>
        )}
      </div>
    </div>
  )
}
