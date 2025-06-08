import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { updateDiscourseme } from '@cads/shared/queries'
import { InputGrowable } from '@cads/shared/components/input-growable'

export function DiscoursemeNameEdit({
  discoursemeId,
  item,
}: {
  discoursemeId: number
  item: string
}) {
  const [currentValue, setCurrentValue] = useState(item)
  const { mutate: patchDiscourseme, isPending } = useMutation({
    ...updateDiscourseme,
    onSuccess: (...args) => {
      updateDiscourseme.onSuccess?.(...args)
      setCurrentValue(args[0].name ?? item)
      toast.success('Discourseme renamed')
    },
    onError: (...args) => {
      updateDiscourseme.onError?.(...args)
      toast.error('Failed to rename discourseme')
    },
  })
  const renameDiscourseme = function (discoursemeId: number, name: string) {
    if (name === currentValue || !item) return
    patchDiscourseme({ discoursemeId, discoursemePatch: { name } })
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const newName = new FormData(e.target as HTMLFormElement).get(
          'discoursemeName',
        ) as string
        renameDiscourseme(discoursemeId, newName)
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <InputGrowable
        type="text"
        defaultValue={item}
        name="discoursemeName"
        onBlur={(e) => {
          renameDiscourseme(discoursemeId, e.target.value)
        }}
        disabled={isPending}
        autoComplete="off"
        autoSave="off"
        className="outline-muted-foreground left-2 w-auto rounded border-none bg-transparent outline-none outline-0 outline-offset-1 hover:bg-white focus:ring-0 focus-visible:bg-white focus-visible:outline-1 disabled:opacity-50 dark:hover:bg-black/25 dark:focus-visible:bg-black/25"
        classNameLabel="-my-1 p-1 -mx-1 min-w-[3ch]"
        required
      />
    </form>
  )
}
