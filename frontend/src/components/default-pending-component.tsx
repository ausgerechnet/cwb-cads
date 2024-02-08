import { Skeleton } from '@/components/ui/skeleton'

export function DefaultPendingComponent() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <Skeleton className="h-4 max-w-52" />
      <Skeleton className="h-4 max-w-52" />
      <Skeleton className="h-4 max-w-52" />
    </div>
  )
}
