import { AlertCircle } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cads/shared/components/ui/alert'

export function ErrorMessage({
  error,
  className,
}: {
  error: Error | null | undefined
  className?: string
}) {
  if (error === null || error === undefined) {
    return null
  }
  // eslint-disable-next-line @typescript-eslint/no-ts-ignore
  // @ts-ignore - We assume that some errors are thrown via axios; in these cases we check whether the error has a response and display the `message` from there -- if it exists.
  const responseMessage = error.response?.data?.message
  const message = responseMessage ?? error.message
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="mr-2 h-4 w-4" />
      {/*
         If the error contained a Response with a message, omit the `error.name`.
         These combinations might be confusing for the user.
      */}
      {responseMessage ? (
        <AlertTitle>{message}</AlertTitle>
      ) : (
        <>
          <AlertTitle>{error.name}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </>
      )}
    </Alert>
  )
}
