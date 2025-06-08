import { Link } from '@tanstack/react-router'
import { cn } from '@cads/shared/lib/utils'

export function AnalysisLinks({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-center gap-[1px] rounded-md p-1',
        className,
      )}
    >
      <li className="flex flex-1 items-stretch">
        <Link
          className="ring-offset-background focus-visible:ring-ring data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=inactive]:hover:bg-background/80 hover:bg-background/50 inline-flex grow items-center justify-center whitespace-nowrap rounded-sm px-1 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[status=active]:shadow-sm"
          to="/constellations/$constellationId/collocation-analysis"
          from="/constellations/$constellationId"
          params={(p) => p}
          search={(s) => ({
            isConcordanceVisible: s.isConcordanceVisible,
          })}
        >
          Collocation Analysis
        </Link>
      </li>

      <li className="flex flex-1 items-stretch">
        <Link
          className="ring-offset-background focus-visible:ring-ring data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=inactive]:hover:bg-background/80 hover:bg-background/50 inline-flex grow items-center justify-center whitespace-nowrap rounded-sm px-1 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[status=active]:shadow-sm"
          to="/constellations/$constellationId/ufa"
          from="/constellations/$constellationId"
          params={(p) => p}
          search={(s) => ({
            isConcordanceVisible: s.isConcordanceVisible,
          })}
        >
          UFA
        </Link>
      </li>

      <li className="flex flex-1 items-stretch">
        <Link
          className="ring-offset-background focus-visible:ring-ring data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=inactive]:hover:bg-background/80 hover:bg-background/50 inline-flex grow items-center justify-center whitespace-nowrap rounded-sm px-1 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[status=active]:shadow-sm"
          to="/constellations/$constellationId/keyword-analysis"
          from="/constellations/$constellationId"
          params={(p) => p}
          search={(s) => ({
            isConcordanceVisible: s.isConcordanceVisible,
          })}
        >
          Keyword Analysis
        </Link>
      </li>

      <li className="flex flex-1 items-stretch">
        <Link
          className="ring-offset-background focus-visible:ring-ring data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=inactive]:hover:bg-background/80 hover:bg-background/50 inline-flex grow items-center justify-center whitespace-nowrap rounded-sm px-1 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[status=active]:shadow-sm"
          to="/constellations/$constellationId/associations"
          from="/constellations/$constellationId"
          params={(p) => p}
          search={(s) => ({
            isConcordanceVisible: s.isConcordanceVisible,
          })}
        >
          Associations
        </Link>
      </li>

      <li className="flex flex-1 items-stretch">
        <Link
          className="ring-offset-background focus-visible:ring-ring data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=inactive]:hover:bg-background/80 hover:bg-background/50 inline-flex grow items-center justify-center whitespace-nowrap rounded-sm px-1 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[status=active]:shadow-sm"
          to="/constellations/$constellationId/breakdown"
          from="/constellations/$constellationId"
          params={(p) => p}
          search={(s) => ({
            isConcordanceVisible: s.isConcordanceVisible,
          })}
        >
          Breakdown
        </Link>
      </li>
    </ul>
  )
}
