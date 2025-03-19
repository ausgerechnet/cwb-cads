import {
  type ReactNode,
  type LabelHTMLAttributes,
  Children,
  useId,
  isValidElement,
} from 'react'
import { cn } from '../lib/utils'

/**
 * A component that renders a label and its associated content.
 *
 * @param props.autoId - If true, an auto-generated `id` is assigned to the child element
 * and linked to the `htmlFor` attribute of the label. This only works when there
 * is exactly one child element. Throws an error if multiple children are provided.
 */
export function LabelBox({
  children,
  labelText,
  className,
  labelClassName,
  autoId = false,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & {
  labelText: ReactNode
  labelClassName?: string
  autoId?: boolean
}) {
  const id = useId()
  if (Children.count(children) > 1 && autoId) {
    throw new Error('autoId only works with exactly one child')
  }

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={autoId ? id : undefined}
        {...props}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          labelClassName,
        )}
      >
        {labelText}
      </label>

      {autoId
        ? Children.map(children, (child) =>
            isValidElement(child)
              ? { ...child, props: { ...(child.props ?? {}), id } }
              : child,
          )
        : children}
    </div>
  )
}
