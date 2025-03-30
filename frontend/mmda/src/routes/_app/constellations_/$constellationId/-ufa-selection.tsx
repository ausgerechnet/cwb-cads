import { ErrorMessage } from '@cads/shared/components/error-message'
import { TimeSeries } from '@/components/time-series'
import { cn } from '@cads/shared/lib/utils'

import { UfaCollocation } from './-ufa-collocation'
import { useUfa } from './-use-ufa'

export function UfaSelection({ className }: { className?: string }) {
  const {
    errors,
    collectionDescriptions,
    isLoading,
    ufaTimeSpan,
    setUfaTimeSpan,
  } = useUfa()

  const timeSeriesData =
    collectionDescriptions?.ufa?.map(({ score, x_label, confidence }) => {
      // TODO: backend should be stricter and return fewer optional/nullable values
      if (!confidence) {
        throw new Error('Invalid data format')
      }
      const { median, lower_90, upper_90, lower_95, upper_95 } = confidence
      if (
        typeof median !== 'number' ||
        typeof lower_90 !== 'number' ||
        typeof upper_90 !== 'number' ||
        typeof lower_95 !== 'number' ||
        typeof upper_95 !== 'number'
      ) {
        throw new Error('Invalid data format')
      }

      return {
        score: score ?? undefined,
        label: x_label ?? undefined,
        median,
        confidence90: [lower_90 as number, upper_90 as number] satisfies [
          number,
          number,
        ],
        confidence95: [lower_95 as number, upper_95 as number] satisfies [
          number,
          number,
        ],
      }
    }) ?? []

  return (
    <div className={className}>
      <ErrorMessage error={errors} />

      <div className="relative">
        <TimeSeries
          data={timeSeriesData}
          value={ufaTimeSpan}
          onChange={setUfaTimeSpan}
          className={cn('mb-4', isLoading && 'opacity-0')}
          zoom
        />
        {isLoading && (
          <div className="bg-muted absolute inset-0 animate-pulse rounded-lg" />
        )}
      </div>

      <UfaCollocation />
    </div>
  )
}
