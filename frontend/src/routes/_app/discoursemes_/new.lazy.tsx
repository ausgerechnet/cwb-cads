import { createLazyFileRoute, useRouter } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'
import { Card } from '@/components/ui/card'
import { DiscoursemeForm } from '@/components/discourseme-form'

export const Route = createLazyFileRoute('/_app/discoursemes/new')({
  component: DiscoursemesNew,
})

function DiscoursemesNew() {
  const router = useRouter()
  const onSuccess = () => {
    router.invalidate()
    router.navigate({ to: '/discoursemes' })
  }
  return (
    <AppPageFrame title="New Discourseme">
      <Card className="max-w-lg p-4">
        <DiscoursemeForm onSuccess={onSuccess} />
      </Card>
    </AppPageFrame>
  )
}
