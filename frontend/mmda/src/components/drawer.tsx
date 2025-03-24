import { ReactNode, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Button } from '@cads/shared/components/ui/button'
import { cn } from '@cads/shared/lib/utils'

export function Drawer({
  children,
  isVisible,
  onToggle,
  className,
}: {
  children: ReactNode
  isVisible: boolean
  onToggle: (isVisible: boolean) => void
  className?: string
}) {
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onToggle(false)
      }
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onToggle])
  return (
    <div
      className={cn(
        'border-t-primary bg-background sticky bottom-0 right-0 mt-auto min-h-10 border border-b-0 border-l-0 border-r-0 p-4 [box-shadow:0_-5px_10px_-10px_black]',
        className,
      )}
    >
      <Button
        variant="outline"
        className={cn(
          'rounded-xs absolute left-0 top-0 grid h-8 w-full -translate-y-1/2 grid-cols-[1fr_auto_1fr] place-content-center place-items-center border-none bg-transparent p-0 text-white hover:bg-transparent',
          'before:bg-primary before:col-span-full before:col-start-1 before:row-start-1 before:mx-0 before:my-auto before:h-px before:w-full before:transition-all hover:before:h-2',
          'after:bg-primary after::text-white after:col-start-2 after:row-start-1 after:block after:aspect-square after:h-5 after:rounded-full',
        )}
        onClick={() => onToggle(!isVisible)}
      >
        {isVisible ? (
          <ChevronDownIcon className="relative col-start-2 row-start-1 h-4 w-4" />
        ) : (
          <ChevronUpIcon className="relative col-start-2 row-start-1 h-4 w-4" />
        )}
      </Button>
      <div
        className={cn(
          'overflow-hidden transition-all',
          isVisible ? 'h-auto' : 'h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}
