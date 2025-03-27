import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

import { corpusById, subcorpusCollections } from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@cads/shared/components/ui/card'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'
import { parseAnnotations } from '@cads/shared/lib/parse-annotations'

export const Route = createLazyFileRoute('/_app/corpora_/$corpusId')({
  component: CorpusDetail,
})

// * hint: the `SubcorpusDetail` component is similar to the `CorpusDetail` component; maybe this can be DRYed
function CorpusDetail() {
  const corpusId = parseInt(Route.useParams().corpusId)
  const { data: corpus } = useSuspenseQuery(corpusById(corpusId))
  const { data: partitions } = useSuspenseQuery(subcorpusCollections(corpusId))
  const description = corpus?.description
  const annotations = parseAnnotations(corpus?.s_annotations ?? [])

  return (
    <AppPageFrame
      title={`Corpus: ${corpus.name}`}
      classNameContent="grid grid-cols-2 gap-4"
    >
      <Card className="grid grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <strong>Description:</strong>
        <span>
          {description ? (
            description
          ) : (
            <span className="text-muted-foreground italic">n.a.</span>
          )}
        </span>
        <strong>Language:</strong> <span>{corpus.language}</span>
        <strong>Register:</strong> <span>{corpus.register}</span>
        <strong>Layers</strong>
        <span>{(corpus.p_atts ?? []).join(', ')}</span>
        <strong>S Attributes:</strong>{' '}
        <span>{(corpus.s_atts ?? []).join(', ')}</span>
        <strong>S Annotations:</strong>
        {Object.entries(annotations).map(([key, values]) => (
          <div key={key} className="col-start-2">
            {key}: {values.join(', ')}{' '}
            {values.length === 0 && (
              <span className="text-muted-foreground italic">n.a.</span>
            )}
          </div>
        ))}
      </Card>

      <Card className="mr-auto flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold">Subcorpus Collections</h2>

        {partitions.length > 0 && (
          <ul>
            {partitions?.map((partition) => (
              <li key={partition.id}>{partition.name}</li>
            ))}
          </ul>
        )}

        {partitions.length === 0 && (
          <div className="text-muted-foreground italic">
            No subcorpus collections
          </div>
        )}

        <Link
          to="/partition"
          search={{ defaultCorpusId: corpusId }}
          className={cn('mt-auto', buttonVariants({}))}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Partition
        </Link>
      </Card>
    </AppPageFrame>
  )
}
