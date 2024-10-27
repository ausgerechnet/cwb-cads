import { Link } from '@tanstack/react-router'
import { ComponentProps } from 'react'
import { cn } from '@cads/shared/lib/utils'
import { navigationMenuTriggerStyle } from '@cads/shared/components/ui/navigation-menu'
import { buttonVariants } from '@cads/shared/components/ui/button'

export function MenuLink({
  className,
  highlight = false,
  ...props
}: ComponentProps<typeof Link> & { highlight?: boolean }) {
  return (
    <Link
      className={cn(
        highlight
          ? buttonVariants({ variant: 'outline' })
          : navigationMenuTriggerStyle(),
        'focus-visible:bg-muted focus-visible:ring-transparent',
        className,
      )}
      activeProps={{
        className: 'is-active',
      }}
      {...props}
    />
  )
}
