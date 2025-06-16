import { MiniMap } from 'react-zoom-pan-pinch'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { DiscoursemeDisplay, WordDisplay } from './worker'

export function WordCloudMiniMap({
  className,
  aspectRatio,
  displayWords,
  displayDiscoursemes,
  toDisplayCoordinates,
}: {
  className?: string
  aspectRatio: number
  displayWords: WordDisplay[]
  displayDiscoursemes: DiscoursemeDisplay[]
  toDisplayCoordinates: (x: number, y: number) => [number, number]
}) {
  return (
    <div className={className}>
      <MiniMap
        className="outline-muted-foreground/20 rounded outline outline-1"
        borderColor="hsl(var(--primary))"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="bg-muted/50 relative max-h-full max-w-full"
            style={{
              aspectRatio,
              width: `clamp(0px, 100cqw, calc(${aspectRatio} * 100cqh))`,
            }}
          >
            {displayWords.map(({ originX, originY, id }) => {
              const [x, y] = toDisplayCoordinates(originX, originY)
              return (
                <span
                  key={id}
                  className="absolute h-5 w-5 rounded-full bg-black/20 dark:bg-white/20"
                  style={{ left: x, top: y }}
                />
              )
            })}
            {displayDiscoursemes.map(
              ({ originX, originY, id, discoursemeId }) => {
                const [x, y] = toDisplayCoordinates(originX, originY)
                return (
                  <span
                    key={id}
                    className="absolute h-24 w-24 rounded-full border-[0.5rem] bg-black/20 dark:bg-white/20"
                    style={{
                      left: x,
                      top: y,
                      backgroundColor: getColorForNumber(
                        discoursemeId,
                        0.5,
                        1,
                        0.4,
                      ),
                      borderColor: getColorForNumber(
                        discoursemeId,
                        0.8,
                        1,
                        0.8,
                      ),
                    }}
                  />
                )
              },
            )}
          </div>
        </div>
      </MiniMap>
    </div>
  )
}
