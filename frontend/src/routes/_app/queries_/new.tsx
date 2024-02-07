import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { corporaQueryOptions, discoursemesQueryOptions } from '@/lib/queries'

const FormMode = z.enum(['cqp', 'assisted']).optional()

export const Route = createFileRoute('/_app/queries/new')({
  validateSearch: z.object({
    formMode: FormMode,
  }),
  loader: async ({ context: { queryClient } }) => ({
    corpora: await queryClient.fetchQuery(corporaQueryOptions),
    discoursemes: await queryClient.fetchQuery(discoursemesQueryOptions),
  }),
})
