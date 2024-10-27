import { useSuspenseQuery } from '@tanstack/react-query'
import { createLazyFileRoute, Link } from '@tanstack/react-router'

import { subcorporaList } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { AppPageFrame } from '@/components/app-page-frame'
import { Large, Paragraph, Small } from '@cads/shared/components/ui/typography'
import { buttonVariants } from '@cads/shared/components/ui/button'

export const Route = createLazyFileRoute('/_app/subcorpora/$subcorpusId')({
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

  return (
    <AppPageFrame title={`Subcorpus: ${subcorpus?.name}`}>
      <Small>TODO: make this pretty</Small>
      <Large>{description}</Large>
      <span>
        Parent Corpus:{' '}
        <Link
          to="/corpora/$corpusId"
          params={{ corpusId: corpus.id!.toString() }}
          className={cn(buttonVariants({ variant: 'link' }), 'px-0')}
        >
          {corpus.name}
        </Link>
      </span>
      <Paragraph>
        Language: {corpus.language}
        <br />
        Register: {corpus.register}
        <br />P Attributes: {(corpus.p_atts ?? []).join(', ')}
        <br />S Attributes: {(corpus.s_atts ?? []).join(', ')}
        <br />S Annotations: {(corpus.s_annotations ?? []).join(', ')}
      </Paragraph>
    </AppPageFrame>
  )
}
