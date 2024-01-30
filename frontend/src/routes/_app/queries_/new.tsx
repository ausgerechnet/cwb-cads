import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { corporaQueryOptions } from '@/lib/queries'

const FormMode = z.enum(['cqp', 'assisted']).optional()

export const Route = createFileRoute('/_app/queries/new')({
  validateSearch: z.object({
    formMode: FormMode,
  }),
  loader: async ({ context: { queryClient } }) => ({
    corpora: await queryClient.ensureQueryData(corporaQueryOptions),
  }),
})
