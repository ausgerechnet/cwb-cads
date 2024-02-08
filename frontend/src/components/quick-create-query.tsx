import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function QuickCreateQuery() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Create Query</Button>
      </DialogTrigger>
      <DialogContent>Form goes here</DialogContent>
    </Dialog>
  )
}
