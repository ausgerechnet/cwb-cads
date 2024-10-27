import { Headline1 } from '@/components/ui/typography'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/*')({
  component: () => (
    <div className="mx-auto mt-8 w-auto text-center">
      <Headline1>Page not found</Headline1>
    </div>
  ),
})
