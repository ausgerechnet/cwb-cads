import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute } from '@tanstack/react-router'

import { corpusById, subcorpusCollections } from '@cads/shared/queries'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large, Paragraph, Small } from '@cads/shared/components/ui/typography'

export const Route = createLazyFileRoute('/_app/corpora_/$corpusId')({
  component: CorpusDetail,
})

// * hint: the `SubcorpusDetail` component is similar to the `CorpusDetail` component; maybe this can be DRYed
function CorpusDetail() {
  const corpusId = parseInt(Route.useParams().corpusId)
  const { data: corpus } = useSuspenseQuery(corpusById(corpusId))
  const { data: partitions } = useSuspenseQuery(subcorpusCollections(corpusId))
  const description = corpus?.description || 'No description'

  return (
    <AppPageFrame title={`Corpus: ${corpus.name}`}>
      <Large>{description}</Large>
      <Small>TODO: make this pretty</Small>
      <Paragraph>
        Language: {corpus.language}
        <br />
        Register: {corpus.register}
        <br />P Attributes: {(corpus.p_atts ?? []).join(', ')}
        <br />S Attributes: {(corpus.s_atts ?? []).join(', ')}
        <br />S Annotations: {(corpus.s_annotations ?? []).join(', ')}
      </Paragraph>

      <Paragraph>
        Subcorpus Collections:
        <ul>
          {partitions?.map((partition) => (
            <li key={partition.id}>{partition.name}</li>
          ))}
        </ul>
      </Paragraph>
    </AppPageFrame>
  )
}
