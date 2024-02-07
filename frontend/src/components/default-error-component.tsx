import { ErrorComponentProps } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function DefaultErrorComponent({
  error,
  title = 'An error occurred!',
}: Partial<ErrorComponentProps> & { title?: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="mr-2 h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      {Boolean(error) && <AlertDescription>{String(error)}</AlertDescription>}
    </Alert>
  )
}
