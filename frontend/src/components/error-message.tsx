import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function ErrorMessage({ error }: { error: Error | null }) {
  if (error === null) {
    return null
  }
  return (
    <Alert variant="destructive">
      <AlertCircle className="mr-2 h-4 w-4" />
      <AlertTitle>{error.name}</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
}
