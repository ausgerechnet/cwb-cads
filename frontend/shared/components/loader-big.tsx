import { Loader2Icon } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '../lib/utils'

export function LoaderBig({
  className,
  children = 'This may take a while…',
}: {
  className?: string
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground max-w-40 self-center justify-self-center rounded-2xl p-5 text-center shadow-2xl',
        className,
      )}
    >
      <div className="mx-auto inline-block">
        <Loader2Icon className="h-24 w-24 animate-spin" strokeWidth="1" />
      </div>
      <p>{children}</p>
    </div>
  )
}
