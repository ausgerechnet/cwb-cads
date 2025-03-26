import { createLazyFileRoute } from '@tanstack/react-router'

import { AppPageFrame } from '@/components/app-page-frame'
import { DefaultPendingComponent } from '@/components/default-pending-component'
import { PartitionForm } from './-partition-form'
import { Card } from '@cads/shared/components/ui/card'

export const Route = createLazyFileRoute('/_app/partition')({
  component: Partition,
  pendingComponent: LoaderPartition,
})

function Partition() {
  const { defaultCorpusId: corpusId, defaultSubcorpusId: subcorpusId } =
    Route.useSearch()
  return (
    <AppPageFrame title="Create Partition Corpus">
      <Card className="max-w-2xl p-4">
        <PartitionForm defaultCorpus={{ corpusId, subcorpusId }} />
      </Card>
    </AppPageFrame>
  )
}

function LoaderPartition() {
  return (
    <AppPageFrame title="Create Partition Corpus">
      <DefaultPendingComponent />
    </AppPageFrame>
  )
}
