import { createLazyFileRoute } from '@tanstack/react-router'
import { AppPageFrame } from '@/components/app-page-frame'

export const Route = createLazyFileRoute('/_app/discoursemes/$discoursemeId')({
  component: SingleDiscourseme,
})

function SingleDiscourseme() {
  return (
    <AppPageFrame title="Discourseme">
      <div className="mono whitespace-pre rounded-md bg-muted p-2 text-sm leading-tight text-muted-foreground">
        {JSON.stringify(Route.useLoaderData().query, null, 2)}
      </div>
    </AppPageFrame>
  )
}
