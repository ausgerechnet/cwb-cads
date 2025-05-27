import { z } from 'zod'
import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2, Plus } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@cads/shared/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cads/shared/components/ui/form'
import { ItemsInput } from '@cads/shared/components/ui/items-input'
import { Alert, AlertDescription } from '@cads/shared/components/ui/alert'
import { required_error } from '@cads/shared/lib/strings'
import { createDiscoursemeForConstellationDescription } from '@cads/shared/queries'
import { Button } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { TextTooltip } from '@cads/shared/components/text-tooltip'

const Discourseme = z.object({
  surfaces: z.array(z.string({ required_error }), { required_error }),
})

type Discourseme = z.infer<typeof Discourseme>

export function AttachNewDiscourseme({
  className,
  constellationId,
  constellationDescriptionId,
  p,
}: {
  className?: string
  constellationId: number
  constellationDescriptionId: number
  p: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const {
    mutate: postNewDiscourseme,
    isPending,
    error,
  } = useMutation({
    ...createDiscoursemeForConstellationDescription,
    onError: (...args) => {
      createDiscoursemeForConstellationDescription.onError?.(...args)
      toast.error('Failed to create discourseme')
    },
    onSuccess: (data, ...rest) => {
      createDiscoursemeForConstellationDescription.onSuccess?.(data, ...rest)
      toast.success('Discourseme created and attached')
      setIsOpen(false)
    },
  })

  const form = useForm<Discourseme>({
    resolver: zodResolver(Discourseme),
    disabled: isPending,
    defaultValues: {
      surfaces: [],
    },
  })

  useEffect(() => {
    if (!isOpen) form.reset()
  }, [isOpen, form])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <TextTooltip asChild tooltipText="Create a new discourseme to add">
          <Button variant="outline" className={cn(className, 'aspect-square')}>
            Create new Discourseme to add
            <Plus className="h-4 w-4" />
          </Button>
        </TextTooltip>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((discourseme) =>
              postNewDiscourseme({
                surfaces: discourseme.surfaces,
                constellationId,
                constellationDescriptionId,
                p,
              }),
            )}
          >
            <fieldset disabled={isPending} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="surfaces"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Items</FormLabel>
                    <FormControl>
                      <ItemsInput
                        onChange={field.onChange}
                        defaultValue={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="animation-spin mr-2 h-4 w-4" />
                )}
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
      </DialogContent>
    </Dialog>
  )
}
