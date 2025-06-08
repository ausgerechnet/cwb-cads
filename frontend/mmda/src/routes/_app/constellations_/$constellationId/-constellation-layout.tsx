import {
  useRouterState,
  useNavigate,
  type ReactNode,
} from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'

import { constellationById } from '@cads/shared/queries'
import { AppPageFrameSemanticMap } from '@/components/app-page-frame-drawer'
import { Card } from '@cads/shared/components/ui/card'
import { cn } from '@cads/shared/lib/utils'

import { Route } from './route'
import { AnalysisLinks } from './-analysis-links'
import { DiscoursemeList } from './-discourseme-list'

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
      title={`Constellation: ${name}`}
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
      {comment}
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
