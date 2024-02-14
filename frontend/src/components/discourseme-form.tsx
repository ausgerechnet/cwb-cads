import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'

import { required_error } from '@/lib/strings'
import { postDiscoursemeMutationOptions } from '@/lib/queries'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const Discourseme = z.object({
  name: z.string({ required_error }),
  description: z.string({ required_error }),
})

type Discourseme = z.infer<typeof Discourseme>

export function DiscoursemeForm({
  onSuccess,
}: {
  onSuccess?: (discoursemeId: number) => void
}) {
  const {
    mutate: postNewDiscourseme,
    isPending,
    error,
  } = useMutation({
    ...postDiscoursemeMutationOptions,
    onError: (...args) => {
      postDiscoursemeMutationOptions.onError?.(...args)
      toast.error('Failed to create discourseme')
    },
    onSuccess: (data, ...rest) => {
      postDiscoursemeMutationOptions.onSuccess?.(data, ...rest)
      toast.success('Discourseme created')
      const discoursemeId = data.id
      discoursemeId !== undefined && onSuccess?.(discoursemeId)
    },
  })
  const form = useForm<Discourseme>({
    resolver: zodResolver(Discourseme),
    disabled: isPending,
  })
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((discourseme) =>
          postNewDiscourseme({
            name: discourseme.name,
            description: discourseme.description,
          }),
        )}
      >
        <fieldset disabled={isPending} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="animation-spin mr-2 h-4 w-4" />}
            New Discourseme
          </Button>
          {error && (
            <Alert>
              <AlertCircle className="mr-2 h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </fieldset>
      </form>
    </Form>
  )
}