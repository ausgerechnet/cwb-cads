import { FieldError } from 'react-hook-form'
import { cn } from '@cads/shared/lib/utils'

export function FieldErrorMessage({
  className,
  error,
}: {
  className?: string
  error?: FieldError | undefined
}) {
  if (!error) return null
  const errorMessage = String(error?.message)
  return (
    <div
      className={cn(
        'border-destructive bg-destructive-foreground text-destructive dark:bg-destructive dark:text-destructive-foreground rounded-md border-2 px-3 py-2 text-sm',
        className,
      )}
    >
      {errorMessage}
    </div>
  )
}
