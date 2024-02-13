import { useState } from 'react'

import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QueryFormCQP } from '@/components/query-form-cqp'
import { QueryFormAssisted } from '@/components/query-form-assisted'

export function QuickCreateQuery({
  onSuccess,
}: {
  onSuccess?: (queryId: number) => void
}) {
  const [formMode, setFormMode] = useState<'assisted' | 'cqp'>('assisted')
  const [isOpen, setIsOpen] = useState(false)
  const handleSuccess = (queryId: number) => {
    onSuccess?.(queryId)
    setIsOpen(false)
  }
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Create Query</Button>
      </DialogTrigger>
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
