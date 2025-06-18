import { useId } from 'react'
import {
  useRouterState,
  useNavigate,
  type ReactNode,
} from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { PencilIcon } from 'lucide-react'

import { constellationById } from '@cads/shared/queries'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import { Card } from '@cads/shared/components/ui/card'
import { cn } from '@cads/shared/lib/utils'
import { buttonVariants } from '@cads/shared/components/ui/button'

import { Route } from './route'
import { AnalysisLinks } from './-analysis-links'
import { DiscoursemeList } from './-discourseme-list'
import { ConstellationFieldEditor } from '../-constellation-field-editor'

export function ConstellationLayout({
  children,
  selectionContent,
  mapPreviewContent,
  mapContent,
  drawerContent,
}: {
  children?: ReactNode
  selectionContent?: ReactNode
  mapPreviewContent?: ReactNode
  mapContent?: ReactNode
  drawerContent?: ReactNode
}) {
  const nameInputId = useId()
  const commentInputId = useId()
  const constellationId = parseInt(Route.useParams().constellationId)
  const {
    data: { comment, name },
  } = useSuspenseQuery(constellationById(constellationId))
  const showsSemanticMap = Boolean(
    useRouterState()?.matches?.at(-1)?.routeId.endsWith('/semantic-map'),
  )
  const { isConcordanceVisible } = Route.useSearch()
  const navigate = useNavigate()

  return (
    <AppPageFrameSemanticMap
      title={
        name ? (
          <>
            Constellation:{' '}
            <label
              htmlFor={nameInputId}
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'mr-0.5 h-6 w-6 p-0 align-top',
              )}
            >
              <PencilIcon className="h-4 w-4" />
            </label>
            <ConstellationFieldEditor
              defaultValue={name}
              field="name"
              constellationId={constellationId}
              id={nameInputId}
            />
          </>
        ) : (
          'Constellation'
        )
      }
      showsSemanticMap={showsSemanticMap}
      mapContent={mapContent}
      drawerContent={drawerContent}
      isDrawerVisible={isConcordanceVisible ?? false}
      onDrawerToggle={(isConcordanceVisible) =>
        navigate({
          to: '.',
          replace: true,
          search: (s) => ({
            ...s,
            isConcordanceVisible,
          }),
        })
      }
    >
      <Card className="grid max-w-5xl grid-cols-[auto,1fr] gap-4 gap-y-0.5 p-4">
        <label
          htmlFor={commentInputId}
          className="hover:bg-muted cursor-pointer rounded-md"
        >
          <strong className="flex items-baseline">
            Comment
            <PencilIcon className="ml-1 h-3 w-3" />
          </strong>
        </label>
        <span className="flex justify-between">
          <ConstellationFieldEditor
            defaultValue={comment ?? ''}
            field="comment"
            constellationId={constellationId}
            id={commentInputId}
          />
        </span>
      </Card>

      <div className="mb-8 mt-4 grid grid-cols-[2fr_1fr_minmax(10rem,1fr)] gap-4">
        <Card className="flex flex-col content-start gap-2 p-2">
          <AnalysisLinks />

          {selectionContent}
        </Card>

        <DiscoursemeList className={cn(!mapPreviewContent && 'col-span-2')} />

        {mapPreviewContent}
      </div>

      {children}
    </AppPageFrameSemanticMap>
  )
}
