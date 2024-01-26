import { Link } from '@tanstack/react-router'
import { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'
import { buttonVariants } from '@/components/ui/button'

export function MenuLink({
  className,
  highlight = false,
  ...props
}: ComponentProps<typeof Link> & { highlight?: boolean }) {
  return (
    <Link
      className={cn(
        highlight ? buttonVariants() : navigationMenuTriggerStyle(),
        !highlight &&
          '[&.is-active]:ring-primary-500 [&.is-active]:bg-muted [&.is-active]:focus:ring-2 [&.is-active]:focus:ring-primary [&.is-active]:focus:ring-offset-2 [&.is-active]:focus:ring-offset-background',
        className,
      )}
      activeProps={{
        className: 'is-active',
      }}
      {...props}
    />
  )
}
