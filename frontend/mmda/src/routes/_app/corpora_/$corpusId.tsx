import { corpusById, subcorpusCollections } from '@cads/shared/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/corpora_/$corpusId')({
  loader: ({ context: { queryClient }, params: { corpusId } }) =>
    Promise.all([
      queryClient.ensureQueryData(corpusById(parseInt(corpusId))),
      queryClient.ensureQueryData(subcorpusCollections(parseInt(corpusId))),
    ]),
})
