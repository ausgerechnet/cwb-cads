import { ReactNode } from 'react'
import { Loader2, XSquare } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export function ButtonAlert({
  onClick,
  disabled,
  children = 'Delete',
  labelButton = children,
  labelCancel = 'Cancel',
  labelTitle = 'Are you sure?',
  labelDescription = 'This will permanently delete the item.',
}: {
  children?: ReactNode
  labelCancel?: ReactNode
  labelButton?: ReactNode
  labelTitle?: ReactNode
  labelDescription?: ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          disabled={disabled}
        >
          {disabled ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XSquare className="mr-2 h-4 w-4" />
          )}
          {labelButton}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labelTitle}</AlertDialogTitle>
          <AlertDialogDescription>{labelDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labelCancel}</AlertDialogCancel>
          <AlertDialogAction asChild onClick={onClick}>
            <Button variant="destructive" disabled={disabled}>
              {labelButton}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
