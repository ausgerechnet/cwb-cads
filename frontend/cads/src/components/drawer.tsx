import { ReactNode, useEffect } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { Button } from '@cads/shared/components/ui/button'
import { cn } from '@/lib/utils'

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
        'sticky bottom-0 right-0 mt-auto min-h-10 border border-b-0 border-l-0 border-r-0 border-t-muted bg-background p-4 [box-shadow:0_-5px_10px_-10px_black]',
        className,
      )}
    >
      <Button
        variant="outline"
        className="absolute -top-3 left-1/2 h-auto -translate-x-1/2 rounded-full p-1"
        onClick={() => onToggle(!isVisible)}
      >
        {isVisible ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronUpIcon className="h-4 w-4" />
        )}
      </Button>
      <div
        className={cn(
          'grid transition-all',
          isVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] opacity-20',
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
