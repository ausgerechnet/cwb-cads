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
  return (
    <AppPageFrame title="Create Partition Corpus">
      <Card className="max-w-2xl p-4">
        <PartitionForm />
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
