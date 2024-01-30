import { createLazyFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { AppPageFrame } from '@/components/app-page-frame'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { required_error } from '@/lib/strings'
import { Button } from '@/components/ui/button'
import { ItemsInput } from '@/components/ui/items-input'
import { useMutation } from '@tanstack/react-query'
import { postDiscoursemeMutationOptions } from '@/lib/queries'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2 } from 'lucide-react'

export const Route = createLazyFileRoute('/_app/discoursemes/new')({
  component: DiscoursemesNew,
})

const Discourseme = z.object({
  name: z.string({ required_error }),
  description: z.string({ required_error }),
  items: z.array(z.string(), { required_error }).min(1, required_error),
})

type Discourseme = z.infer<typeof Discourseme>

function DiscoursemesNew() {
  const {
    mutate: postNewDiscourseme,
    isPending,
    error,
  } = useMutation(postDiscoursemeMutationOptions)
  const form = useForm<Discourseme>({
    resolver: zodResolver(Discourseme),
    disabled: isPending,
  })
  return (
    <AppPageFrame title="New Discourseme">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((discourseme) =>
            postNewDiscourseme({
              name: discourseme.name,
              description: discourseme.description,
            }),
          )}
        >
          <fieldset disabled={isPending}>
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
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Items</FormLabel>
                  <FormControl>
                    <ItemsInput
                      defaultValue={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormDescription>Komma-separierte Items</FormDescription>
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
    </AppPageFrame>
  )
}
