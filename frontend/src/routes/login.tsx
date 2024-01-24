import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileRoute, useNavigate } from '@tanstack/react-router'
import { apiClient } from '@/rest-client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

export const Route = new FileRoute('/login').createRoute({
  component: Login,
  validateSearch: z.object({
    redirect: z.string().url().optional(),
  }),
})

const Credentials = z.object({
  username: z.string().min(1, 'Dieses Feld ist erforderlich'),
  password: z.string().min(1, 'Dieses Feld ist erforderlich'),
})

type Credentials = z.infer<typeof Credentials>

function Login() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<Credentials>({
    resolver: zodResolver(Credentials),
  })

  const { isPending, mutate, error } = useMutation({
    mutationFn: async (credentials: Credentials) => {
      return await apiClient.postUserlogin(credentials)
    },
    onSuccess: () => {
      queryClient.setQueryData(['authenticated'], true)
      navigate({ to: redirect || '/app' })
    },
  })

  const onSubmit = (values: Credentials) => {
    mutate(values)
  }

  const isDisabled = isPending

  return (
    <div className="p-2">
      <h3>Login</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          {...register('username', {
            required: 'Dieses Feld ist erforderlich',
          })}
          disabled={isDisabled}
        />
        {formErrors.username && (
          <p>{formErrors?.username.message?.toString()}</p>
        )}

        <label htmlFor="password">Password</label>
        <input
          type="password"
          {...register('password', {
            required: 'Dieses Feld ist erforderlich',
          })}
          disabled={isDisabled}
        />
        {formErrors.password && (
          <p>{formErrors?.password.message?.toString()}</p>
        )}
        <Button type="submit" disabled={isDisabled}>
          Login
        </Button>
      </form>
      {error && <p>Error: {String(error)}</p>}
      {redirect && <p>Redirect: {redirect}</p>}
    </div>
  )
}
