import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { corpusList, discoursemesList } from '@/lib/queries'

const FormMode = z.enum(['cqp', 'assisted']).optional()

export const Route = createFileRoute('/_app/queries/new')({
  validateSearch: z.object({
    formMode: FormMode,
  }),
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(corpusList),
      queryClient.ensureQueryData(discoursemesList),
    ]),
})
