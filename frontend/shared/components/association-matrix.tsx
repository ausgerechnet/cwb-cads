import { useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '../lib/utils'
import { formatNumber } from '../lib/format-number'
import { getColorForNumber } from '../lib/get-color-for-number'
import { useDebouncedValue } from '../lib/use-debounced-value'
import { ComplexSelect } from './select-complex'
import { ToggleBar } from './toggle-bar'
import { Button } from './ui/button'

type Association = {
  node: number
  candidate: number
  score: number
  scaledScore?: number
  measure: string
}

export function AssociationMatrix({
  className,
  legendNameMap,
  associations,
}: {
  className?: string
  legendNameMap?: Map<number, string>
  associations: {
    node: number
    candidate: number
    score: number | null
    scaledScore?: number | null
    measure: string
  }[]
}) {
  const measures = [
    ...associations.reduce((acc, { measure }) => {
      acc.add(measure)
      return acc
    }, new Set<string>()),
  ]

  const itemIds: number[] = [
    ...associations.reduce((acc, { node, candidate }) => {
      acc.add(node)
      acc.add(candidate)
      return acc
    }, new Set<number>()),
  ]

  const measureItems = measures.map((measure) => ({
    id: measure,
    searchValue: measure,
    name: measure
      .split('_')
      .map((m) => m.at(0)?.toUpperCase() + m.slice(1))
      .join(' '),
  }))

  const [measure, setMeasure] = useState<string>(measures[0]!)
  const [view, setView] = useState<'table' | 'graph'>('table')
  const [isMinimized, setIsMinimized] = useState(false)

  const filteredAssociations = associations
    .filter((a) => a.measure === measure)
    .filter((a): a is Association => a.score !== null && a.scaledScore !== null)

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        {isMinimized ? (
          <span className="ml-2">Associations</span>
        ) : (
          <>
            <ComplexSelect
              items={measureItems}
              itemId={measure}
              onChange={(newValue) => {
                if (!newValue) return
                setMeasure(newValue)
              }}
            />

            <div className="flex gap-0">
              <ToggleBar<'table' | 'graph'>
                options={[
                  ['table', 'Table'],
                  ['graph', 'Graph'],
                ]}
                value={view}
                onChange={setView}
              />
            </div>
          </>
        )}

        <Button
          variant="outline"
          onClick={() => setIsMinimized((prev) => !prev)}
          className="ml-auto"
        >
          {isMinimized ? 'Show' : 'Hide'}
          <ChevronDownIcon
            className={cn('ml-2 h-4 w-4 transition-transform', {
              'rotate-180': isMinimized,
            })}
          />
        </Button>
      </div>

      {view === 'table' && !isMinimized && (
        <AssociationTable
          itemIds={itemIds}
          associations={filteredAssociations}
          legendNameMap={legendNameMap}
        />
      )}

      {view === 'graph' && !isMinimized && (
        <AssociationGraph
          itemIds={itemIds}
          associations={filteredAssociations}
          legendNameMap={legendNameMap}
        />
      )}
    </div>
  )
}

function AssociationTable({
  itemIds,
  associations,
  legendNameMap,
}: {
  itemIds: number[]
  legendNameMap?: Map<number, string>
  associations: Association[]
}) {
  const rowIds = itemIds
  const columnIds = itemIds.toReversed()

  return (
    <table
      className="mt-2 grid"
      style={{
        gridTemplateColumns: `auto repeat(${columnIds.length}, 1fr)`,
      }}
    >
      <thead className="col-span-full grid grid-cols-subgrid">
        <tr className="col-span-full grid grid-cols-subgrid">
          <th></th>
          {rowIds.map((rowId) => (
            <th key={rowId} className="py-1 text-xs">
              <span
                className="mr-1 inline-block aspect-square h-2 w-2 rounded-full"
                style={{
                  backgroundColor: getColorForNumber(rowId),
                }}
              />
              {legendNameMap?.get(rowId) ?? rowId}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="col-span-full grid grid-cols-subgrid">
        {columnIds.map((columnId) => (
          <tr key={columnId} className="col-span-full grid grid-cols-subgrid">
            <th className="pr-2 text-left text-xs">
              <span
                className="mr-1 inline-block aspect-square h-2 w-2 rounded-full"
                style={{
                  backgroundColor: getColorForNumber(columnId),
                }}
              />
              {legendNameMap?.get(columnId) ?? columnId}
            </th>
            {rowIds.map((candidate) => {
              const { score: associationScore, scaledScore = 0.5 } =
                associations.find(
                  (a) =>
                    (a.node === candidate && a.candidate === columnId) ||
                    (a.node === columnId && a.candidate === candidate),
                ) ?? {}
              return (
                <td
                  key={candidate}
                  className={cn(
                    'font-xs p-1 text-right font-mono text-sm transition-colors duration-500',
                    {
                      'text-white': scaledScore <= 0.25 || scaledScore >= 0.75,
                      'text-black': scaledScore > 0.25 && scaledScore < 0.75,
                    },
                  )}
                  style={{
                    backgroundColor:
                      associationScore === undefined
                        ? 'transparent'
                        : d3.interpolateSpectral(scaledScore),
                  }}
                >
                  {associationScore === undefined
                    ? ''
                    : formatNumber(associationScore)}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AssociationGraph({
  itemIds,
  associations,
  legendNameMap,
}: {
  itemIds: number[]
  legendNameMap?: Map<number, string>
  associations: Association[]
}) {
  const [cutOff, setCutOff] = useState(0.05)
  const deferredCutOff = useDebouncedValue(cutOff)
  const minScore = associations.reduce(
    (acc, { score }) => Math.min(acc, score),
    Infinity,
  )
  const maxScore = associations.reduce(
    (acc, { score }) => Math.max(acc, score),
    -Infinity,
  )
  const mapScore = (score: number) => (score - minScore) / (maxScore - minScore)

  const svgRef = useRef<SVGSVGElement>(null)

  const data = {
    links: associations
      .map((a) => {
        if (mapScore(a.score) < deferredCutOff) return null
        return {
          source: legendNameMap?.get(a.node) ?? a.node,
          target: legendNameMap?.get(a.candidate) ?? a.candidate,
          distance: (1 - mapScore(a.score) ** 2) * 100 + 20,
          strokeWidth: 1 + mapScore(a.score) * 10,
        }
      })
      .filter(Boolean),
    nodes: itemIds.map((id) => ({
      id: legendNameMap?.get(id) ?? id,
      colorFill: getColorForNumber(id),
      colorStroke: getColorForNumber(id, 0.75),
    })),
  }

  useEffect(() => {
    const width = 800
    const height = 400

    // Clone the data to avoid mutating the original
    const links = data.links.map((d) => ({ ...d }))
    const nodes = data.nodes.map((d) => ({ ...d }))

    const simulation = d3
      // @ts-expect-error
      .forceSimulation(nodes)
      .alphaTarget(0.3)
      .alphaDecay(0.01)
      .force(
        'link',
        d3
          // @ts-ignore
          .forceLink(links)
          // @ts-expect-error
          .id((d) => d.id)
          // @ts-ignore
          .distance((d) => d.distance)
          .strength(1),
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(1))
      .force('x', d3.forceX(width / 2).strength(0.01))
      .force('y', d3.forceY(height / 2).strength(0.01))
      .force('charge', d3.forceManyBody().strength(-20))
      .on('tick', ticked)

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    const link = svg
      .append('g')
      .attr('stroke-opacity', 0.25)
      .attr('class', 'stroke-black dark:stroke-white')
      .selectAll()
      .data(links)
      .join('line')
      // @ts-ignore
      .attr('stroke-width', (d) => d.strokeWidth)

    const node = svg
      .append('g')
      .selectAll()
      .data(nodes)
      .join('circle')
      .attr('fill', (d) => d.colorFill)
      .attr('stroke', (d) => d.colorStroke)
      .attr('r', 5)
      .attr(
        'class',
        'hover:stroke-[10px] cursor-grab transition-[stroke-width]',
      )

    const nodeLabel = svg
      .append('g')
      .selectAll()
      .data(nodes)
      .join('text')
      .attr('class', 'pointer-events-none')
      .text((d) => d.id)
      .attr('font-size', 10)
      .attr('fill', (d) => d.colorStroke)

    node.call(
      // @ts-ignore
      d3
        // @ts-ignore
        .drag()
        .on('start', function dragstarted(event) {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          event.subject.fx = event.subject.x
          event.subject.fy = event.subject.y
        })
        .on('drag', function dragged(event) {
          event.subject.fx = event.x
          event.subject.fy = event.y
        })
        .on('end', function dragended(event) {
          if (!event.active) simulation.alphaTarget(0)
          event.subject.fx = null
          event.subject.fy = null
        }),
    )

    function ticked() {
      link
        // @ts-expect-error
        .attr('x1', (d) => d.source.x)
        // @ts-expect-error
        .attr('y1', (d) => d.source.y)
        // @ts-expect-error
        .attr('x2', (d) => d.target.x)
        // @ts-expect-error
        .attr('y2', (d) => d.target.y)
      // @ts-expect-error
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      // @ts-expect-error
      nodeLabel.attr('x', (d) => d.x + 10).attr('y', (d) => d.y + 10)
    }

    return () => {
      simulation.stop()
      d3.select(svgRef.current).selectAll('*').remove()
    }
  }, [svgRef, data, deferredCutOff])

  return (
    <div className="grid aspect-video max-h-[50svh] w-full grid-cols-[auto,1fr] grid-rows-[1fr,auto]">
      <svg
        ref={svgRef}
        className="col-span-full col-start-1 row-span-full row-start-1 h-full w-full"
      />
      <label className="col-start-1 row-start-2 inline-flex items-center gap-2">
        <input
          type="range"
          min={0.01}
          max={1}
          step={0.01}
          value={cutOff}
          onChange={(e) => setCutOff(Number(e.target.value))}
        />
        <span className="my-auto inline-block font-mono leading-none">
          {Math.ceil(cutOff * 100)}%
        </span>
      </label>
    </div>
  )
}
