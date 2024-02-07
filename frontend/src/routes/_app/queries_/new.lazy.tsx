import { createLazyRoute, useNavigate } from '@tanstack/react-router'

import { Card } from '@/components/ui/card'
import { Headline1 } from '@/components/ui/typography'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { FormAssisted } from './-form-assisted'
import { FormCQP } from './-form-cqp'

export const Route = createLazyRoute('/_app/queries/new')({
  component: QueriesNew,
  pendingComponent: QueriesNewPending,
})

function QueriesNew() {
  const { formMode = 'assisted' } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <div className="p-2">
      <Headline1 className="mb-8">New Query</Headline1>
      <Card className="max-w-xl p-4">
        <Tabs
          defaultValue={formMode}
          onValueChange={(formMode) => {
            if (formMode === 'cqp' || formMode === 'assisted') {
              navigate({
                to: '/queries/new',
                search: { formMode },
                replace: true,
              })
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="cqp" className="grow">
              CQP Query
            </TabsTrigger>
            <TabsTrigger value="assisted" className="grow">
              Assisted Mode
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cqp">
            <FormCQP />
          </TabsContent>
          <TabsContent value="assisted">
            <FormAssisted />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

function QueriesNewPending() {
  return (
    <div className="p-2">
      <Headline1 className="mb-8">New Query</Headline1>
      <Card className="flex max-w-xl flex-col gap-4 p-4">
        <Skeleton className="mb-4 h-12 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </Card>
    </div>
  )
}
