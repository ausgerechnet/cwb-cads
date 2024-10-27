import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { Loader2Icon, PlusIcon, TrashIcon } from 'lucide-react'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import {
  corpusById,
  deleteDiscoursemeDescription,
  discoursemeById,
  discoursemeDescriptionsById,
} from '@/lib/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large, Paragraph } from '@cads/shared/components/ui/typography'
import { Button, buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { z } from 'zod'
import { schemas } from '@/rest-client'
import { ErrorMessage } from '@/components/error-message'

export const Route = createLazyFileRoute('/_app/discoursemes/$discoursemeId')({
  component: SingleDiscourseme,
})

function SingleDiscourseme() {
  const discoursemeId = parseInt(Route.useParams().discoursemeId)
  const { data: discourseme } = useSuspenseQuery(discoursemeById(discoursemeId))
  const { data: descriptions } = useSuspenseQuery(
    discoursemeDescriptionsById(discoursemeId),
  )
  const name = discourseme?.name
  const comment = discourseme?.comment
  const template = discourseme?.template ?? []

  return (
    <AppPageFrame
      title={name ? `Discourseme: ${name}` : 'Discourseme'}
      cta={{
        label: 'New description',
        nav: {
          to: '/discoursemes/$discoursemeId/new-description',
          params: { discoursemeId: discoursemeId.toString() },
        },
      }}
    >
      <Large className="bg-destructive text-destructive-foreground p-2">
        Todo: Prettier UI...
      </Large>
      {comment && <Large>{comment}</Large>}
      {template.length > 0 && (
        <Paragraph>
          Template on Layer "{template[0].p}":{' '}
          {template.map((t) => t.surface).join(', ')}
        </Paragraph>
      )}

      {descriptions.length === 0 && (
        <div className="start flex flex-col gap-4">
          <Large>
            No discourseme descriptions yet.
            <br />
            Create one using the button below.
          </Large>
          <Link
            to="/discoursemes/$discoursemeId/new-description"
            params={{ discoursemeId: discoursemeId.toString() }}
            className={cn(buttonVariants(), 'self-start')}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New Description
          </Link>
        </div>
      )}

      {descriptions.length > 0 && <Large>Descriptions</Large>}

      {descriptions.map((description) => (
        <Description description={description} key={description.id!} />
      ))}

      <div className="mono bg-muted text-muted-foreground whitespace-pre rounded-md p-2 text-sm leading-tight">
        {JSON.stringify(descriptions, null, 2)}
      </div>
    </AppPageFrame>
  )
}

function Description({
  description,
}: {
  description: z.infer<typeof schemas.DiscoursemeDescriptionOut>
}) {
  const { mutate, isPending, error } = useMutation(deleteDiscoursemeDescription)
  const {
    data,
    isLoading,
    error: errorCorpus,
  } = useQuery(corpusById(description.corpus_id!))
  return (
    <div className="bg-muted my-1">
      {description.id} {isLoading ? 'Loading...' : `on Corpus "${data?.name}"`}
      <br />
      {description.items?.map((i) => i.surface).join(', ')}
      <Button
        onClick={() =>
          mutate({
            descriptionId: description.id!,
            discoursemeId: description.discourseme_id!,
          })
        }
        disabled={isPending}
      >
        {isPending ? <Loader2Icon className="animate-spin" /> : <TrashIcon />}
      </Button>
      <ErrorMessage error={error} />
      <ErrorMessage error={errorCorpus} />
    </div>
  )
}
