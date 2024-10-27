import { createFileRoute } from '@tanstack/react-router'
import {
  corpusList,
  discoursemeById,
  discoursemeDescriptionsById,
} from '@/queries/queries'

export const Route = createFileRoute('/_app/discoursemes/$discoursemeId')({
  loader: ({ context: { queryClient }, params: { discoursemeId } }) =>
    Promise.all([
      queryClient.ensureQueryData(discoursemeById(parseInt(discoursemeId))),
      queryClient.ensureQueryData(
        discoursemeDescriptionsById(parseInt(discoursemeId)),
      ),
      queryClient.ensureQueryData(corpusList),
    ]),
})
