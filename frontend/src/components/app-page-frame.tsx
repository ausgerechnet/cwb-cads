import { ComponentProps, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Headline1 } from '@/components/ui/typography'
import { buttonVariants } from '@/components/ui/button'

export function AppPageFrame({
  title,
  cta,
  children,
}: {
  children: ReactNode
  title: string
  cta?: {
    to: ComponentProps<typeof Link>['to']
    label: ReactNode
  }
}) {
  return (
    <div className="p-2">
      <div className="mb-8 flex gap-4">
        <Headline1 className="flex-grow">{title}</Headline1>
        {cta && (
          <Link to={cta.to} className={buttonVariants()}>
            <Plus className="mr-2 h-4 w-4" />
            {cta.label}
          </Link>
        )}
      </div>
      <div className="col-span-full">{children}</div>
    </div>
  )
}
