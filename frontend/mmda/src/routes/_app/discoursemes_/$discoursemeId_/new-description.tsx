import { createFileRoute } from '@tanstack/react-router'
import {
  corpusList,
  discoursemeById,
  discoursemeDescriptionsById,
} from '@cads/shared/queries'

export const Route = createFileRoute(
  '/_app/discoursemes_/$discoursemeId_/new-description',
)({
  loader: ({ context: { queryClient }, params: { discoursemeId } }) =>
    Promise.all([
      queryClient.ensureQueryData(discoursemeById(parseInt(discoursemeId))),
      queryClient.ensureQueryData(corpusList),
      queryClient.ensureQueryData(
        discoursemeDescriptionsById(parseInt(discoursemeId)),
      ),
    ]),
})
