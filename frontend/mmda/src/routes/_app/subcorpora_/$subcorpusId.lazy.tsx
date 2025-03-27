import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'

import { subcorporaList } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
import { AppPageFrame } from '@/components/app-page-frame'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { parseAnnotations } from '@cads/shared/lib/parse-annotations'
import { Card } from '@cads/shared/components/ui/card'
import { ErrorMessage } from '@cads/shared/components/error-message'

export const Route = createLazyFileRoute('/_app/subcorpora_/$subcorpusId')({
  component: SubcorpusDetail,
})

// * hint: the `SubcorpusDetail` component is similar to the `CorpusDetail` component; maybe this can be DRYed
function SubcorpusDetail() {
  const subcorpusId = parseInt(Route.useParams().subcorpusId)
  // TODO: There should be an API to get a single subcorpus by ID
  const { data: subcorpora } = useSuspenseQuery(subcorporaList)
  const subcorpus = subcorpora.find((s) => s.id === subcorpusId)!
  const description = subcorpus?.description || 'No description'
  const corpus = subcorpus.corpus!
  const annotations = parseAnnotations(corpus.s_annotations ?? [])

  return (
    <AppPageFrame
      title={`Subcorpus: ${subcorpus?.name}`}
      classNameContent="grid grid-cols-2 gap-4"
    >
      <Card className="grid grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <strong>Parent Corpus:</strong>
        <Link
          to="/corpora/$corpusId"
          params={{ corpusId: String(corpus.id) }}
          className="text-primary mr-auto hover:underline"
        >
          {corpus.name}
        </Link>
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

        <ErrorMessage error="Not yet implemented for subcorpora" />

        <Link
          to="/partition"
          search={{
            defaultCorpusId: subcorpus.corpus.id,
            defaultSubcorpusId: subcorpusId,
          }}
          className={cn('mt-auto', buttonVariants({}))}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Partition
        </Link>
      </Card>
    </AppPageFrame>
  )
}
