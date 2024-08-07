import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2Icon } from 'lucide-react'

import { addDiscoursemeDescription, discoursemesList } from '@/lib/queries'
import { Headline3 } from '@/components/ui/typography'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { QuickCreateDiscourseme } from '@/components/quick-create-discourseme'
import { Button } from '@/components/ui/button'
import { ErrorMessage } from '@/components/error-message'
import { schemas } from '@/rest-client'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ItemsInput } from '@/components/ui/items-input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useNavigate } from '@tanstack/react-router'

const FormInput = schemas.DiscoursemeDescriptionIn.extend({
  discourseme_id: z.number(),
})

export function DiscoursemeAnalysis({
  corpusId,
  pAttributes = [],
  sAttributes = [],
  defaultValues = {},
}: {
  corpusId: number
  pAttributes: string[]
  sAttributes: string[]
  defaultValues?: {
    items?: string[]
    match_strategy?: 'longest' | 'shortest' | 'standard'
    p?: string
    s?: string
  }
}) {
  const [isOpen, setIsOpen] = useState(false)
  const form = useForm<z.infer<typeof FormInput>>({
    resolver: zodResolver(FormInput),
    defaultValues: {
      match_strategy: 'longest',
      ...defaultValues,
      corpus_id: corpusId,
    },
  })
  const navigate = useNavigate()

  const { data: discoursemes } = useSuspenseQuery(discoursemesList)
  const { mutate, isPending, error } = useMutation({
    ...addDiscoursemeDescription,
    onSuccess: (data, ...args) => {
      const discoursemeId = data.discourseme_id
      addDiscoursemeDescription.onSuccess?.(data, ...args)
      toast.success('Discourseme description created')
      if (discoursemeId === undefined) return
      navigate({
        to: `/discoursemes/$discoursemeId`,
        params: { discoursemeId: discoursemeId.toString() },
      })
    },
    onError: (...args) => {
      addDiscoursemeDescription.onError?.(...args)
      toast.error('Failed to create discourseme description')
    },
  })

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(isOpen) => setIsOpen(isOpen)}>
        <DialogContent>
          <Headline3 className="w-full">Start Discourseme Analysis</Headline3>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => mutate(data))}
              className="grid w-full grid-cols-2 gap-4"
            >
              <FormField
                control={form.control}
                name="discourseme_id"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Discourseme</FormLabel>
                    <FormControl>
                      <div className="col-span-full grid grid-cols-[1fr_min-content] gap-4">
                        <DiscoursemeSelect
                          className="w-full flex-grow"
                          discoursemes={discoursemes}
                          discoursemeId={field.value}
                          onChange={field.onChange}
                        />
                        <QuickCreateDiscourseme className="w-full @xs:w-8" />
                      </div>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="s"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Context Break</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Context Break" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {sAttributes.map((attr) => (
                              <SelectItem key={attr} value={attr}>
                                {attr}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="p"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analysis Layer</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Analysis Layer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {pAttributes.map((attr) => (
                              <SelectItem key={attr} value={attr}>
                                {attr}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="match_strategy"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Match Strategy</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Match strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="shortest">Shortest</SelectItem>
                            <SelectItem value="longest">Longest</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className="col-span-full w-full flex-grow"
                disabled={isPending}
                type="submit"
              >
                {isPending && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Analysis
              </Button>
            </form>
          </Form>
          <ErrorMessage error={error} className="mt-4" />
        </DialogContent>
      </Dialog>
      {!isOpen && (
        <Button
          className="w-full"
          onClick={() => {
            Object.entries(defaultValues).forEach(([key, value]) => {
              form.setValue(key, value)
            })
            setIsOpen(true)
          }}
        >
          Start Discourseme Analysis
        </Button>
      )}
    </>
  )
}
