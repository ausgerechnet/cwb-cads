import { useMemo, useState } from 'react'
import { z } from 'zod'
import { Link, useSearch } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeftIcon,
  Loader2,
  Loader2Icon,
  Plus,
} from 'lucide-react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { cn } from '@/lib/utils'
import {
  addConstellationDiscourseme,
  constellationById,
  constellationDescriptionFor,
  removeConstellationDiscourseme,
  discoursemesList,
  addDescriptionItem,
  removeDescriptionItem,
  createDiscoursemeForConstellationDescription,
} from '@/lib/queries'
import { Button, buttonVariants } from '@/components/ui/button'
import WordCloud, { Word } from '@/components/word-cloud'
import { ErrorMessage } from '@/components/error-message'
import { DiscoursemeSelect } from '@/components/select-discourseme'
import { ComplexSelect } from '@/components/select-complex'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ItemsInput } from '@/components/ui/items-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { required_error } from '@/lib/strings'
import { useDescription } from './-use-description'
import { useCollocation } from './-use-collocation'
import { useFilterSelection } from './-use-filter-selection'

const COORDINATES_SCALE_FACTOR = 40

export function SemanticMap({ constellationId }: { constellationId: number }) {
  const { description } = useDescription()
  const { collocationItemsMap, isLoading } = useCollocation(
    constellationId,
    description?.id,
    description?.corpus_id,
  )

  const words = useMemo(
    () =>
      (collocationItemsMap?.coordinates ?? []).map(
        (item): Word => ({
          id: item.item,
          word: item.item,
          x: (item.x_user ?? item.x) * COORDINATES_SCALE_FACTOR,
          y: (item.y_user ?? item.y) * COORDINATES_SCALE_FACTOR,
          originX: (item.x_user ?? item.x) * COORDINATES_SCALE_FACTOR,
          originY: (item.y_user ?? item.y) * COORDINATES_SCALE_FACTOR,
          significance: 0.5,
          radius: 20,
        }),
      ),
    [collocationItemsMap],
  )

  return (
    <div className="flex-grow bg-muted">
      <Link
        to="/constellations/$constellationId"
        from="/constellations/$constellationId/semantic-map"
        params={{ constellationId: constellationId.toString() }}
        search={(s) => s}
        className={cn(
          buttonVariants({ variant: 'link' }),
          'top-42 absolute right-2 z-10 px-2',
        )}
      >
        <ArrowLeftIcon />
      </Link>
      <ConstellationDiscoursemesEditor constellationId={constellationId} />
      {isLoading && (
        <div className="-transform-x-1/2 -transform-y-1/2 absolute left-1/2 top-1/2">
          <Loader2Icon className="h-6 w-6 animate-spin" />
        </div>
      )}
      <div className="bg-muted">
        <WordCloud words={words} />
      </div>
    </div>
  )
}

function ConstellationDiscoursemesEditor({
  constellationId,
}: {
  constellationId: number
}) {
  const { corpusId } = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  if (corpusId === undefined) throw new Error('corpusId is undefined')
  const { s } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const {
    data: { discoursemes },
  } = useSuspenseQuery(constellationById(constellationId))
  const { data: allDiscoursemes } = useSuspenseQuery(discoursemesList)
  const { data: constellationDescription, error } = useQuery(
    constellationDescriptionFor({
      constellationId,
      // TODO
      corpusId,
      subcorpusId: null,
      matchStrategy: 'longest',
      s,
    }),
  )
  const constellationDescriptionId = constellationDescription?.id
  const {
    mutate: addDiscourseme,
    isPending,
    error: errorAddDiscourseme,
  } = useMutation(addConstellationDiscourseme)
  const {
    mutate: removeDiscourseme,
    isPending: isRemovingDiscourseme,
    error: errorDeleteDiscourseme,
  } = useMutation(removeConstellationDiscourseme)
  const {
    mutate: removeItem,
    isPending: isRemovingItem,
    error: errorRemoveItem,
  } = useMutation(removeDescriptionItem)
  return (
    <div className="absolute bottom-24 right-4 top-64 overflow-auto rounded-xl bg-background shadow">
      <ErrorMessage error={error} />
      <ErrorMessage error={errorDeleteDiscourseme} />
      <ErrorMessage error={errorRemoveItem} />
      {constellationDescriptionId === undefined ? (
        <Loader2Icon className="h-6 w-6 animate-spin" />
      ) : (
        <AttachNewDiscourseme
          constellationId={constellationId}
          constellationDescriptionId={constellationDescriptionId}
        />
      )}
      {constellationDescription?.discourseme_descriptions.map(
        (discoursemeDescription) => (
          <div key={discoursemeDescription.id}>
            {discoursemeDescription.id}{' '}
            {
              discoursemes.find(
                ({ id }) => id === discoursemeDescription.discourseme_id,
              )?.name
            }
            <button
              disabled={isRemovingDiscourseme}
              className="bg-red-500 p-1"
              onClick={() =>
                removeDiscourseme({
                  constellationId,
                  discoursemeId: discoursemeDescription.discourseme_id,
                })
              }
            >
              Delete
              {/*  TODO: Handle case when this is the filter discourseme*/}
            </button>
            <ul>
              {discoursemeDescription.items.map((item) => (
                <li key={item.surface}>
                  {item.surface}
                  <button
                    className="my-0.5 ml-1 rounded bg-red-500 p-1 py-0"
                    onClick={() =>
                      removeItem({
                        discoursemeId: discoursemeDescription.discourseme_id,
                        descriptionId: discoursemeDescription.id,
                        // cqpQuery: item.cqp_query,
                        p: item.p!,
                        surface: item.surface!,
                      })
                    }
                    disabled={isRemovingItem}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <AddDescriptionItem
              constellationId={constellationId}
              discoursemeId={discoursemeDescription.discourseme_id}
              discoursemeDescriptionId={discoursemeDescription.id}
            />
          </div>
        ),
      )}
      <ErrorMessage error={errorAddDiscourseme} />
      <DiscoursemeSelect
        disabled={isPending}
        discoursemes={allDiscoursemes}
        onChange={(discoursemeId) => {
          if (discoursemeId === undefined) return
          addDiscourseme({
            constellationId,
            discoursemeId,
          })
        }}
      />
    </div>
  )
}

function AddDescriptionItem({
  discoursemeDescriptionId,
  discoursemeId,
  constellationId,
}: {
  discoursemeDescriptionId: number
  discoursemeId: number
  constellationId: number
}) {
  const {
    mutate: addItem,
    isPending: isAddingItem,
    error: errorAddItem,
  } = useMutation(addDescriptionItem)
  const { corpusId } = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const { secondary } = useFilterSelection(
    '/_app/constellations/$constellationId',
    corpusId,
  )
  const { description } = useDescription()
  const { collocationItemsMap } = useCollocation(
    constellationId,
    description?.id,
    description?.corpus_id,
  )
  const collocationItems = useMemo(
    () =>
      (collocationItemsMap?.items ?? []).map(({ item }, id) => ({
        id,
        name: item,
        searchValue: item,
      })),
    [collocationItemsMap],
  )

  return (
    <>
      <ErrorMessage error={errorAddItem} />
      <ComplexSelect
        disabled={isAddingItem}
        items={collocationItems}
        onChange={(itemIndex) => {
          if (itemIndex === undefined) return
          const surface = collocationItemsMap?.items[itemIndex]?.item
          if (surface === undefined || secondary === undefined) {
            console.warn('Could not add item, missing values', {
              surface,
              secondary,
            })
            return
          }
          console.log('selected surface', surface)
          addItem({
            discoursemeId,
            descriptionId: discoursemeDescriptionId,
            surface: surface,
            p: secondary,
          })
        }}
      />
    </>
  )
}

const Discourseme = z.object({
  surfaces: z.array(z.string({ required_error }), { required_error }),
})

type Discourseme = z.infer<typeof Discourseme>

function AttachNewDiscourseme({
  className,
  constellationId,
  constellationDescriptionId,
}: {
  className?: string
  constellationId: number
  constellationDescriptionId: number
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(className, 'aspect-square')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Create a new discourseme</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent>
        <Form {...form}>
          Constellation Id: {constellationId}
          <form
            onSubmit={form.handleSubmit((discourseme) =>
              postNewDiscourseme({
                surfaces: discourseme.surfaces,
                constellationId,
                constellationDescriptionId,
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
