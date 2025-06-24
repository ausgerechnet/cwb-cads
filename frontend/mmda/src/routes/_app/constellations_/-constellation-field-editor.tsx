import { CheckIcon, Loader2Icon } from 'lucide-react'
import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import { InputGrowable } from '@cads/shared/components/input-growable'
import { updateConstellationName } from '@cads/shared/queries'

export function ConstellationFieldEditor({
  className,
  defaultValue,
  constellationId,
  field,
  id,
}: {
  className?: string
  defaultValue: string
  constellationId: number
  field: 'name' | 'comment'
  id?: string
}) {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const {
    mutate: patchConstellation,
    isPending,
    isSuccess,
  } = useMutation({
    ...updateConstellationName,
    onSuccess: (...args) => {
      updateConstellationName.onSuccess?.(...args)
      toast.success(`Constellation ${field} updated successfully`)
    },
    onError: (...args) => {
      updateConstellationName.onError?.(...args)
      toast.error('Failed to update constellation')
    },
  })

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <InputGrowable
        className="outline-input rounded-md outline outline-1"
        defaultValue={defaultValue}
        id={id}
        onChange={(event) => {
          const newValue = String(event.currentTarget.value).trim()
          if (!newValue && field === 'name') return
          clearTimeout(timeoutIdRef.current)
          timeoutIdRef.current = setTimeout(() => {
            patchConstellation({
              constellationId,
              [field]: newValue,
            })
          }, 1_000)
        }}
      />

      {isSuccess && !isPending ? (
        <CheckIcon className="h-4 w-4 text-emerald-500" />
      ) : (
        <Loader2Icon
          className={cn(
            'h-4 w-4 animate-spin opacity-0 transition-opacity',
            isPending && 'opacity-100',
          )}
        />
      )}
    </span>
  )
}
