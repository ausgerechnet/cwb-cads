import { type ComponentProps, type ReactNode, forwardRef } from 'react'
import { createLink, LinkComponent } from '@tanstack/react-router'
import { MapIcon } from 'lucide-react'

import { Card } from '@cads/shared/components/ui/card'
import { cn } from '@cads/shared/lib/utils'
import { WordCloudPreview } from './word-cloud-preview'

interface WordCloudLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  items?: ComponentProps<typeof WordCloudPreview>['items']
  warn?: ReactNode
}

const BaseWordCloudLink = forwardRef<HTMLAnchorElement, WordCloudLinkProps>(
  (
    { items = [], warn, className, href, ...props }: WordCloudLinkProps,
    ref,
  ) => {
    return (
      <a
        {...props}
        href={warn ? undefined : href}
        ref={ref}
        tabIndex={warn ? -1 : 0}
        className={cn(
          'my-0 block h-full transition-opacity focus-visible:outline-none',
          {
            'pointer-events-none cursor-not-allowed opacity-50': Boolean(warn),
            'group/map-link': !warn,
            className,
          },
        )}
      >
        <Card className="bg-muted text-muted-foreground group-focus-visible/map-link:outline-muted-foreground group-hover/map-link:outline-muted-foreground relative mx-0 flex h-full min-h-48 w-full flex-col place-content-center place-items-center gap-2 overflow-hidden p-4 text-center outline outline-1 outline-transparent transition-all duration-200">
          <WordCloudPreview
            items={items}
            className="absolute h-full w-full scale-110 transition-all group-hover/map-link:scale-100 group-hover/map-link:opacity-75 group-focus-visible/map-link:scale-100"
          />
          <div className="bg-muted/70 group-focus-visible/map-link:bg-muted/90 group-hover/map-link:bg-muted/90 transition-color relative flex gap-3 rounded p-2">
            <MapIcon className="mr-4 h-6 w-6 flex-shrink-0" />
            <span>Semantic Map</span>
          </div>
          {warn && (
            <div className="relative flex flex-col gap-1 rounded bg-amber-200 p-2 text-amber-800">
              {warn}
            </div>
          )}
        </Card>
      </a>
    )
  },
)

const CreatedWordCloudLink = createLink(BaseWordCloudLink)

export const WordCloudLink: LinkComponent<typeof BaseWordCloudLink> = (
  props,
) => <CreatedWordCloudLink {...props} />
