import { type ReactNode, type HTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export function LabelBox({
  children,
  labelText,
  className,
  ...props
}: HTMLAttributes<HTMLLabelElement> & { labelText: ReactNode }) {
  return (
    <label
      {...props}
      className={cn('group/label-box flex flex-col gap-1', className)}
    >
      <span className="text-muted-foreground whitespace-nowrap text-sm font-medium leading-none">
        {labelText}
      </span>
      <div>{children}</div>
    </label>
  )
}
