import { corpusById } from '@/lib/queries'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/corpora/$corpusId')({
  loader: ({ context: { queryClient }, params: { corpusId } }) =>
    queryClient.ensureQueryData(corpusById(parseInt(corpusId))),
})
