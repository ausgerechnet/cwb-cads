import { FieldError } from 'react-hook-form'
import { cn } from '@/lib/utils'

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
        'rounded-md border-2 border-destructive bg-destructive-foreground px-3 py-2 text-sm text-destructive dark:bg-destructive dark:text-destructive-foreground',
        className,
      )}
    >
      {errorMessage}
    </div>
  )
}
