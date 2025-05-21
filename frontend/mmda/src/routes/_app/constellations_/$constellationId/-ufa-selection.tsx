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

  const timeSeriesData = collectionDescriptions?.ufa

  return (
    <div className={className}>
      <ErrorMessage error={errors} />

      <div className="relative">
        <TimeSeries
          data={timeSeriesData}
          value={ufaTimeSpan}
          onChange={setUfaTimeSpan}
          className={cn('mb-4', isLoading && 'opacity-0')}
        />
        {isLoading && (
          <div className="bg-muted absolute inset-0 animate-pulse rounded-lg" />
        )}
      </div>

      <UfaCollocation />
    </div>
  )
}
