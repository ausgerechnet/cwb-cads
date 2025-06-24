import { useEffect } from 'react'
import { FullscreenIcon } from 'lucide-react'
import { ButtonTooltip } from '@cads/shared/components/button-tooltip'

export function CenterButton({
  centerView,
  className,
}: {
  centerView: (zoom?: number) => void
  className?: string
}) {
  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.altKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault()
        centerView(1)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [centerView])
  return (
    <ButtonTooltip
      onClick={() => centerView(1)}
      className={className}
      variant="secondary"
      size="icon"
      tooltip={
        <>
          Center view{' '}
          <kbd className="border-1 border-muted ml-2 mr-0 rounded-sm border px-1 py-0.5 text-xs">
            alt + shift + z
          </kbd>
        </>
      }
    >
      <FullscreenIcon className="h-5 w-5" />
    </ButtonTooltip>
  )
}
