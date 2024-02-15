import { ComponentProps, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Headline1 } from '@/components/ui/typography'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AppPageFrame({
  title,
  cta,
  children,
}: {
  title: string
  cta?: {
    nav: ComponentProps<typeof Link>
    label: ReactNode
  }
  children?: ReactNode
}) {
  return (
    <div className="p-2">
      <div className="mb-8 flex gap-4">
        <Headline1 className="flex-grow overflow-hidden">{title}</Headline1>
        {cta && (
          <Link
            {...cta.nav}
            className={cn(buttonVariants(), cta.nav.className)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {cta.label}
          </Link>
        )}
      </div>
      <div className="col-span-full">{children}</div>
    </div>
  )
}
