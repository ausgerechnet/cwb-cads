import { useEffect } from 'react'
import { Link, createLazyFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'

import { logOut } from '@/queries/queries'
import { Headline1, Large } from '@cads/shared/components/ui/typography'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@cads/shared/components/ui/alert'
import { Button } from '@cads/shared/components/ui/button'

export const Route = createLazyFileRoute('/logout')({
  component: Logout,
})

function Logout() {
  const { mutate: logout, isSuccess, error, isPending } = useMutation(logOut)
  useEffect(() => logout(), [logout])

  return (
    <div className="mx-auto mt-8 max-w-2xl p-2">
      {isPending && <Loader2 className="mx-auto h-8 w-8 animate-spin" />}
      {isSuccess && (
        <>
          <Headline1>Successfully logged out</Headline1>
          <Large className="mt-8">
            You have been successfully logged out.
            <br />
            <Link to="/login" className="underline">
              Log in again.
            </Link>
          </Large>
        </>
      )}
      {error && !isPending && (
        <Alert variant="destructive" className="[&:not(:first-child)]:mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to log out</AlertTitle>
          <AlertDescription>
            <Button variant="destructive" onClick={() => logout()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
