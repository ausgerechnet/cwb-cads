import { AlertCircle } from 'lucide-react'
import { z } from 'zod'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cads/shared/components/ui/alert'
import { cn } from '@cads/shared/lib/utils'

type ErrorType = Error | string | null | undefined | ErrorType[]

export function ErrorMessage({
  error,
  className,
}: {
  error: ErrorType
  className?: string
}) {
  if (error === null || error === undefined) {
    return null
  }
  console.log('ErrorMessage', error)
  if (Array.isArray(error)) {
    return (
      <>
        {error.map((error, i) => (
          <ErrorMessage key={i} error={error} />
        ))}
      </>
    )
  }
  const { title, message } = getMessage(error)

  return (
    <Alert
      variant="destructive"
      className={cn(
        'bg-destructive/10 text-destructive dark:bg-destructive/50 dark:text-foreground max-h-96 overflow-auto font-sans',
        className,
      )}
    >
      <AlertCircle className="dark:stroke-foreground mr-2 h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      {message && (
        <AlertDescription className="whitespace-pre-wrap">
          {message}
        </AlertDescription>
      )}
    </Alert>
  )
}

const FlaskError = z.object({
  error: z.string().optional(),
  message: z.string(),
})

function getMessage(error: unknown): { title: string; message?: string } {
  if (typeof error === 'string') {
    return { title: error }
  }

  try {
    // @ts-ignore
    const { error: title, message } = FlaskError.parse(error?.response?.data)
    if (title) {
      return { title, message }
    }
    return { title: message }
  } catch {}

  if (typeof error === 'object' && error !== null && error instanceof Error) {
    return { title: error.name, message: error.message }
  }

  return { title: 'Unknown error' }
}
