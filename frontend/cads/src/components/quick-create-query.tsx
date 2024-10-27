import { useState } from 'react'
import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@cads/shared/components/ui/dialog'
import { Button } from '@cads/shared/components/ui/button'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@cads/shared/components/ui/tabs'
import { QueryFormCQP } from '@/components/query-form-cqp'
import { QueryFormAssisted } from '@/components/query-form-assisted'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'

export function QuickCreateQuery({
  onSuccess,
  className,
}: {
  onSuccess?: (queryId: number) => void
  className?: string
}) {
  const [formMode, setFormMode] = useState<'assisted' | 'cqp'>('assisted')
  const [isOpen, setIsOpen] = useState(false)
  const handleSuccess = (queryId: number) => {
    onSuccess?.(queryId)
    setIsOpen(false)
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
          <TooltipContent>Create a new query</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent>
        <Tabs
          className="mt-4"
          defaultValue={formMode}
          onValueChange={(formMode) => {
            if (formMode === 'cqp' || formMode === 'assisted') {
              setFormMode(formMode)
            }
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="cqp" className="grow">
              CQP Query
            </TabsTrigger>
            <TabsTrigger value="assisted" className="grow">
              Assisted Mode
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cqp">
            <QueryFormCQP onSuccess={handleSuccess} />
          </TabsContent>
          <TabsContent value="assisted">
            <QueryFormAssisted onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
