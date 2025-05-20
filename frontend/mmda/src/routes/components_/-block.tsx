import { type ReactNode } from 'react'

import { cn } from '@cads/shared/lib/utils'
import { Headline2 } from '@cads/shared/components/ui/typography'

export function Block({
  className,
  children,
  componentName,
  componentTag,
}: {
  className?: string
  children: ReactNode
  componentName?: string
  componentTag: string
}) {
  return (
    <section className={cn('mb-14', className)}>
      <Headline2 className="mb-4">{componentName || componentTag}</Headline2>

      <code className="bg-muted text-muted-foreground mb-2 mt-1 inline-block rounded px-1 py-0.5">
        &lt;{componentTag}... /&gt;
      </code>

      {children}
    </section>
  )
}

export function BlockComment({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn('text-foreground my-2 border-l-2 pl-2 text-sm', className)}
    >
      {children}
    </div>
  )
}
