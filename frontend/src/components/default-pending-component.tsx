import { Skeleton } from '@/components/ui/skeleton'

export function DefaultPendingComponent() {
  return (
    <div className="mt-0 flex h-full flex-col items-center justify-center gap-4">
      <Skeleton className="mr-auto h-4 w-full max-w-52" />
      <Skeleton className="mr-auto h-4 w-full max-w-52" />
      <Skeleton className="mr-auto h-4 w-full max-w-52" />
    </div>
  )
}
