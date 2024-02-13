import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { DiscoursemeForm } from '@/components/discourseme-form'
import {
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Tooltip,
} from '@/components/ui/tooltip'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuickCreateDiscourseme({
  className,
  onSuccess,
}: {
  className?: string
  onSuccess?: (discoursemeId: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const handleSuccess = (discoursemeId: number) => {
    setIsOpen(false)
    onSuccess?.(discoursemeId)
  }
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className={cn(className, 'aspect-square')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Create a new discourseme</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent>
        <DiscoursemeForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
