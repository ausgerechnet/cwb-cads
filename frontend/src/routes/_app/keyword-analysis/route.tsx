import { createFileRoute } from '@tanstack/react-router'
import { keywordAnalysesList } from '@/lib/queries'

export const Route = createFileRoute('/_app/keyword-analysis')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(keywordAnalysesList),
})
