import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DiscoursemeForm } from '@/components/discourseme-form'

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
      <DialogTrigger asChild>
        <Button variant="secondary" className={className}>
          Create Discourseme
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DiscoursemeForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
