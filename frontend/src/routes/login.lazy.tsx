import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'

import { loginMutationOptions } from '@/lib/queries'
import { required_error } from '@/lib/strings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Headline1 } from '@/components/ui/typography'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ErrorMessage } from '@/components/error-message'

export const Route = createLazyFileRoute('/login')({
  component: Login,
})

const Credentials = z.object({
  username: z.string({ required_error }).min(1, 'Dieses Feld ist erforderlich'),
  password: z.string({ required_error }).min(1, 'Dieses Feld ist erforderlich'),
})

type Credentials = z.infer<typeof Credentials>

function Login() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()

  const form = useForm<Credentials>({
    resolver: zodResolver(Credentials),
  })

  const { isPending, mutate, error } = useMutation({
    ...loginMutationOptions,
    onSuccess: (...args) => {
      loginMutationOptions?.onSuccess?.(...args)
      navigate({
        to: redirect || '/queries',
      })
    },
  })

  const onSubmit = (values: Credentials) => {
    if (isPending) return
    mutate(values)
  }

  const isDisabled = isPending

  return (
    <div className="mx-auto mt-8 max-w-sm p-2">
      <Headline1 className="mb-8">Login</Headline1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isDisabled}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </form>
      </Form>
      <ErrorMessage error={error} className="mt-4" />
    </div>
  )
}
