import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { sessionQueryOptions } from '@/data/queries'
import { apiClient } from '@/rest-client'
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

export const Route = new FileRoute('/login').createRoute({
  component: Login,
  validateSearch: z.object({
    redirect: z.string().url().optional(),
  }),
})

const Credentials = z.object({
  username: z
    .string({
      required_error: 'Dieses Feld ist erforderlich',
    })
    .min(1, 'Dieses Feld ist erforderlich'),
  password: z
    .string({
      required_error: 'Dieses Feld ist erforderlich',
    })
    .min(1, 'Dieses Feld ist erforderlich'),
})

type Credentials = z.infer<typeof Credentials>

function Login() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const form = useForm<Credentials>({
    resolver: zodResolver(Credentials),
  })

  const { isPending, mutate, error } = useMutation({
    mutationFn: async (credentials: Credentials) => {
      return await apiClient.postUserlogin(credentials)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(sessionQueryOptions)
      navigate({ to: redirect || '/queries' })
    },
  })

  const onSubmit = (values: Credentials) => {
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
      {error && <p>Error: {String(error)}</p>}
      {redirect && <p>Redirect: {redirect}</p>}
    </div>
  )
}
