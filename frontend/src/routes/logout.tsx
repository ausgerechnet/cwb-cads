import { FileRoute } from '@tanstack/react-router'
import { Headline1 } from '@/components/ui/typography'
import { useMutation } from '@tanstack/react-query'
import { logoutMutationOptions } from '@/data/queries'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export const Route = new FileRoute('/logout').createRoute({
  component: Logout,
})

function Logout() {
  const {
    mutate: logout,
    isSuccess,
    error,
    isPending,
  } = useMutation(logoutMutationOptions)
  useEffect(() => logout(), [logout])

  return (
    <div className="mx-auto mt-8 max-w-md p-2">
      {isPending && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
      {isSuccess && <Headline1>Erfolgreich abemeldet</Headline1>}
      {error && !isPending && (
        <Alert variant="destructive" className="[&:not(:first-child)]:mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Abmeldung fehlgeschlagen</AlertTitle>
          <AlertDescription>
            <Button variant="destructive" onClick={() => logout()}>
              Abmeldung erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
