import { useState } from 'react'
import { useMutation, useIsMutating } from '@tanstack/react-query'
import { Loader2Icon, PencilIcon, PencilOffIcon, XIcon } from 'lucide-react'
import { z } from 'zod'

import { schemas } from '@/rest-client'
import { Card } from '@cads/shared/components/ui/card'
import { Small } from '@cads/shared/components/ui/typography'
import { Button } from '@cads/shared/components/ui/button'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { DiscoursemeSelect } from '@cads/shared/components/select-discourseme'
import {
  addConstellationDiscourseme,
  removeConstellationDiscourseme,
} from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'

export function DiscoursemeList({
  constellationId,
  descriptionId,
  discoursemes,
  constellationDiscoursemes,
  className,
}: {
  constellationId: number
  descriptionId: number
  discoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  constellationDiscoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
  className?: string
}) {
  const nonSelectedDiscoursemes = discoursemes.filter(
    (discourseme) =>
      !constellationDiscoursemes?.find(({ id }) => id === discourseme.id),
  )
  const {
    mutate: addDiscourseme,
    isPending,
    error: errorAddDiscourseme,
  } = useMutation(addConstellationDiscourseme)
  const [isEditMode, setIsEditMode] = useState(false)

  return (
    <Card
      className={cn(
        'mx-0 grid w-full grid-cols-1 grid-rows-[min-content_1fr] gap-x-4 gap-y-0 p-4',
        className,
      )}
    >
      <div className="mb-2 flex place-items-center font-bold">
        Discoursemes
        <Button
          variant="outline"
          onClick={() => setIsEditMode(!isEditMode)}
          className="m-0 ml-auto flex h-6 gap-1 p-0 pl-1 pr-2"
        >
          {!isEditMode ? <PencilIcon size={16} /> : <PencilOffIcon size={16} />}
          Edit
        </Button>
      </div>

      <ul className="col-span-full flex flex-col gap-1">
        {constellationDiscoursemes.map((discourseme) => (
          <DiscoursemeItem
            key={discourseme.id!}
            discourseme={discourseme}
            constellationId={constellationId}
            isEditable={isEditMode}
          />
        ))}
      </ul>

      {isEditMode && (
        <DiscoursemeSelect
          className="mt-2"
          discoursemes={nonSelectedDiscoursemes}
          disabled={isPending}
          onChange={(discoursemeId) => {
            addDiscourseme({
              discoursemeId: discoursemeId as number,
              constellationId,
              descriptionId,
            })
          }}
        />
      )}
      <ErrorMessage error={errorAddDiscourseme} className="mt-2" />
    </Card>
  )
}

function DiscoursemeItem({
  discourseme,
  constellationId,
  isEditable,
}: {
  discourseme: z.infer<typeof schemas.DiscoursemeOut>
  constellationId: number
  isEditable: boolean
}) {
  const discoursemeId = discourseme.id
  const { mutate: removeConstellationFromDiscourseme, error } = useMutation(
    removeConstellationDiscourseme,
  )
  const isMutating = useIsMutating(removeConstellationDiscourseme) > 0

  return (
    <li
      key={discoursemeId}
      className={cn(
        'border-input ring-ring flex gap-x-4 rounded-lg border py-0 pl-2 pr-0 ring-offset-2 transition-all focus-within:ring-2',
        !isEditable && 'border-transparent py-0 pl-0',
      )}
    >
      <Small className="mx-0 my-auto flex flex-grow leading-none">
        <span
          style={{ backgroundColor: getColorForNumber(discoursemeId) }}
          className="my-auto mr-1 inline-block h-2 w-2 shrink-0 rounded-full"
        />
        {discourseme.name}
      </Small>

      <Button
        disabled={isMutating || !isEditable}
        onClick={() =>
          removeConstellationFromDiscourseme({ discoursemeId, constellationId })
        }
        variant="ghost"
        type="button"
        size="icon"
        className={cn(
          'm-0.5 h-7 w-7 flex-shrink-0 self-center p-0.5 transition-all focus:ring-0 focus-visible:ring-0 focus-visible:ring-transparent',
          !isEditable && 'h-0 w-0 disabled:opacity-0',
        )}
      >
        {isMutating ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <XIcon className="h-4 w-4" />
        )}
      </Button>

      <ErrorMessage error={error} />
    </li>
  )
}
