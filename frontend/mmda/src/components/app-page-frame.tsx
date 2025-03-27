import { ComponentProps, ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'

import { Headline1 } from '@cads/shared/components/ui/typography'
import { buttonVariants } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'

export function AppPageFrame({
  title,
  cta,
  children,
  classNameContainer,
  classNameContent,
}: {
  title?: string
  cta?: {
    nav: ComponentProps<typeof Link>
    label: ReactNode
  }
  children?: ReactNode
  classNameContainer?: string
  classNameContent?: string
}) {
  return (
    <div className={cn('flex flex-col p-2', classNameContainer)}>
      {Boolean(title || cta) && (
        <div className="mb-8 flex gap-4">
          {title && <Headline1 className="flex-grow">{title}</Headline1>}
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
      )}
      <div
        className={cn(
          'col-span-full flex flex-grow flex-col',
          classNameContent,
        )}
      >
        {children}
      </div>
    </div>
  )
}
