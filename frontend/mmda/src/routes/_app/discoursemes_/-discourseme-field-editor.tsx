import { CheckIcon, Loader2Icon } from 'lucide-react'
import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { cn } from '@cads/shared/lib/utils'
import { InputGrowable } from '@cads/shared/components/input-growable'
import { updateDiscourseme } from '@cads/shared/queries'

export function DiscoursemeFieldEditor({
  className,
  defaultValue,
  discoursemeId,
  field,
  id,
}: {
  className?: string
  defaultValue: string
  discoursemeId: number
  field: 'name' | 'comment'
  id?: string
}) {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const {
    mutate: patchDiscourseme,
    isPending,
    isSuccess,
  } = useMutation({
    ...updateDiscourseme,
    onSuccess: (...args) => {
      updateDiscourseme.onSuccess?.(...args)
      toast.success(`Discourseme ${field} updated successfully`)
    },
    onError: (...args) => {
      updateDiscourseme.onError?.(...args)
      toast.error('Failed to update discourseme')
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
            patchDiscourseme({
              discoursemeId,
              discoursemePatch: { [field]: newValue },
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
