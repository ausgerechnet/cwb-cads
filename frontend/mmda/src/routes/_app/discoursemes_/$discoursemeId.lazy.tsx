import { z } from 'zod'
import { PlusIcon } from 'lucide-react'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { schemas } from '@/rest-client'
import {
  corpusById,
  deleteDiscoursemeDescription,
  discoursemeById,
  discoursemeDescriptionsById,
} from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large } from '@cads/shared/components/ui/typography'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { Card } from '@cads/shared/components/ui/card'
import { ButtonAlert } from '@/components/button-alert'

export const Route = createLazyFileRoute('/_app/discoursemes_/$discoursemeId')({
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
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          params: { discoursemeId: discoursemeId.toString() },
        },
      }}
    >
      <Card className="grid max-w-lg grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <strong>Comment:</strong>
        <span>
          {comment ? (
            comment
          ) : (
            <span className="text-muted-foreground italic">n.a.</span>
          )}
        </span>
        <strong>Template:</strong>
        {template.length > 0 && (
          <div>{template.map((t) => t.surface).join(', ')}</div>
        )}
      </Card>

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

      <Card className="mr-auto mt-6 flex flex-col gap-2 p-4">
        {descriptions.length > 0 && <Large>Descriptions</Large>}

        <ul className="flex flex-col gap-2">
          {descriptions.map((description) => (
            <Description description={description} key={description.id!} />
          ))}
        </ul>

        <Link
          to="/discoursemes/$discoursemeId/new-description"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          params={{ discoursemeId: discoursemeId.toString() }}
          className={cn('ml-auto mt-10', buttonVariants())}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create New Description
        </Link>
      </Card>
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
  } = useQuery(corpusById(description.corpus_id!, description.subcorpus_id))

  return (
    <li className="my-1 grid grid-cols-[1fr_min-content] gap-4 rounded-lg p-1 pl-2">
      <div className="flex flex-col gap-2 text-sm">
        {isLoading ? (
          'Loading...'
        ) : (
          <span>
            in <strong>{data?.name}</strong> on{' '}
            <strong>{description.items[0]?.p}</strong>
          </span>
        )}
        <div className="flex flex-wrap gap-1 text-sm">
          {description.items?.map((i) => (
            <span
              key={i.surface}
              className="outline-border no-wrap inline-block rounded-full px-2 py-0.5 text-xs outline outline-1"
            >
              {i.surface}
            </span>
          ))}
        </div>
      </div>

      <ButtonAlert
        onClick={() =>
          mutate({
            descriptionId: description.id!,
            discoursemeId: description.discourseme_id!,
          })
        }
        className="mt-auto"
        disabled={isPending}
      />

      <ErrorMessage error={[errorCorpus, error]} className="col-span-full" />
    </li>
  )
}
