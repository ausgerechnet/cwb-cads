import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function QuickCreateDiscourseme() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Create Discourseme</Button>
      </DialogTrigger>
      <DialogContent>Form goes here</DialogContent>
    </Dialog>
  )
}
