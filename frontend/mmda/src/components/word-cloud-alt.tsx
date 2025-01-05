// TODO: fix the types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as d3 from 'd3'
import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { LocateIcon } from 'lucide-react'

import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { useTheme } from '@cads/shared/components/theme-provider'
import { Button } from '@cads/shared/components/ui/button'
import { putSemanticMapCoordinates } from '@cads/shared/queries'

export type Word = {
  id: string
  item: string
  x: number
  y: number
  source: string
  dragStartX?: number
  dragStartY?: number
  originX: number
  originY: number
  significance: number
  radius: number
  discoursemeId?: number | undefined
}
export default function WordCloud({
  words,
  semanticMapId,
  size,
}: {
  words: Word[]
  semanticMapId: number
  size: number
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { mutate: updateCoordinates } = useMutation(putSemanticMapCoordinates)

  useEffect(() => {
    // TODO: ensure that words and discoursemes have universally(!) unique identifiers
    const itemData = words.map((word) => ({
      ...word,
      discoursemeId: word.discoursemeId ?? undefined,
      id: `${word.source}-${word.item}`,
      width: 10,
      height: 10,
    }))

    const discoursemeData = itemData.filter(
      (words) => words.source === 'discoursemes',
    )

    const linksOriginal = discoursemeData
      .map(({ id: source, discoursemeId }) => {
        const linkedWords = itemData.filter(
          (item) =>
            discoursemeId === item.discoursemeId &&
            item.source === 'discourseme_items',
        )
        return linkedWords.map(({ id: target }) => ({ source, target }))
      })
      .flat()
    let links = linksOriginal.map((d) => ({ ...d }))

    const nodes = itemData.map((d) => ({ ...d }))
    const nodesFreeItems = nodes.filter((d) => d.source === 'items')
    const nodesDiscoursemes = nodes.filter((d) => d.source === 'discoursemes')
    const nodesDiscoursemeItems = nodes.filter(
      (d) => d.source === 'discourseme_items',
    )

    const svg = d3.select(svgRef.current)

    let svgWidth = svgRef.current?.clientWidth ?? 0
    let svgHeight = svgRef.current?.clientHeight ?? 0
    let hoveredDiscoursemeId: null | number = null
    let selectedDiscoursemeId: null | number = null

    function significanceToRadius(significance: number) {
      return significance * 100 + 50
    }

    function addItemToDiscourseme(item: string, discoursemeId: number) {
      const node = nodes.find((d) => d.item === item)
      if (!node) return

      node.discoursemeId = discoursemeId
      node.source = 'discourseme_items'

      linksOriginal.push({
        source: node.id,
        target: nodesDiscoursemes.find((d) => d.discoursemeId === discoursemeId)
          ?.id,
      })

      links = linksOriginal.map((d) => ({ ...d }))

      simulation
        .force('line')
        .links(links)
        .distance((d) => significanceToRadius(d.source.significance) * 2.5),
        console.log(links)

      update()
    }

    const container = svg.append('g')
    const containerDiscoursemeItems = container
      .append('g')
      .attr('class', 'no-pointer-events')
    const containerLines = container.append('g')
    const containerFreeItems = container.append('g')
    const containerDiscoursemes = container.append('g')

    function update() {
      const nodeFreeItem = containerFreeItems
        .selectAll('circle')
        .data(nodesFreeItems)
        .join('circle')
        .attr('r', (node) => significanceToRadius(node.significance))
        .attr('fill', 'transparent')
        .attr('stroke', 'gray')

      const nodeDiscoursemeItem = containerDiscoursemeItems
        .selectAll('circle')
        .data(nodesDiscoursemeItems)
        .join('circle')
        .attr('r', (node) => significanceToRadius(node.significance))
        .attr('fill', 'transparent')
        .attr('stroke', (node) => getColorForNumber(node.discoursemeId, 1))
        .attr('opacity', 0)

      const nodeDiscourseme = containerDiscoursemes
        .selectAll('circle')
        .data(nodesDiscoursemes)
        .join('circle')
        .attr('r', (node) => significanceToRadius(node.significance))
        .attr('fill', (node) => getColorForNumber(node.discoursemeId))
        .attr('stroke-width', (node) => getColorForNumber(node.discoursemeId))
        .on('click', (event, d) => {
          selectedDiscoursemeId =
            d.discoursemeId === selectedDiscoursemeId ? null : d.discoursemeId
          nodeDiscoursemeItem.attr('opacity', (node) => {
            if (node.discoursemeId === selectedDiscoursemeId) return 1
            return 0
          })
          link.attr('opacity', (node) => {
            if (node.target.discoursemeId === selectedDiscoursemeId) return 1
            return 0
          })
        })
        .on('mouseenter', (event, d) => {
          hoveredDiscoursemeId = d.discoursemeId ?? null
        })
        .on('mouseleave', () => {
          hoveredDiscoursemeId = null
        })

      const link = containerLines
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-width', 2)
        .attr('class', 'no-pointer-events')
        .attr('stroke', (d) =>
          getColorForNumber(d.target.discoursemeId, 1, 0.1),
        )
        .attr('opacity', 0)

      const itemDrag = d3
        .drag()
        .on('start', handleDragStart)
        .on('drag', handleDrag)
        .on('end', handleDragEnd)

      nodeFreeItem.call(itemDrag)
      nodeDiscourseme.call(itemDrag)

      function handleDragStart(event) {
        simulation.force('collide').strength(0)
        simulation.force('origin').strength(0)
        // if (!event.active) simulation.alphaTarget(0.3).restart()
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }

      function handleDrag(event) {
        event.subject.fx = event.x
        event.subject.fy = event.y
      }

      function handleDragEnd(event) {
        simulation.force('collide').strength(1)
        simulation.force('origin').strength(1)
        // if (!event.active) simulation.alphaTarget(0)
        event.subject.fx = null
        event.subject.fy = null
        if (event.subject.source === 'discoursemes') {
          event.subject.originX = event.x
          event.subject.originY = event.y
        }
        if (event.subject.source === 'items' && hoveredDiscoursemeId !== null) {
          addItemToDiscourseme(event.subject.item, hoveredDiscoursemeId)
        }
      }

      simulation.on('tick', () => {
        nodeFreeItem.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
        nodeDiscoursemeItem.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
        nodeDiscourseme.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
        link
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y)
      })
    }

    const simulation = d3
      .forceSimulation(nodes)
      .alphaDecay(0.001)
      .force(
        'collide',
        d3
          .forceCollide()
          .radius((d) => {
            if (d.source === 'discourseme_items') return 0
            return significanceToRadius(d.significance)
          })
          .strength(1),
      )
      .force(
        'line',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => significanceToRadius(d.source.significance) * 2.5),
      )
      .force('charge', repelForce())
      .force('origin', originForce(0.02))

    update()

    function repelForce() {
      return function (alpha: number) {
        nodesDiscoursemeItems.forEach((nodeA) => {
          if (nodeA.source !== 'discourseme_items') return
          nodesDiscoursemeItems.forEach((nodeB) => {
            if (
              nodeA.source !== 'discourseme_items' ||
              nodeB.source !== 'discourseme_items' ||
              nodeA.discoursemeId !== nodeB.discoursemeId
            )
              return
            const dx = nodeA.x - nodeB.x
            const dy = nodeA.y - nodeB.y
            const distance = Math.sqrt(dx ** 2 + dy ** 2) || 1

            const force = 500_000 / distance ** 2
            const maxForce = 500_000

            nodeA.vx += Math.min((dx / distance) * force, maxForce)
            nodeA.vy += Math.min((dy / distance) * force, maxForce)
          })
        })
      }
    }

    function originForce(strength = 1, maxForce = 0.1) {
      const force = function (alpha: number) {
        for (let i = 0, n = nodes.length; i < n; ++i) {
          const node = nodes[i]
          if (node.source === 'discourseme_items') continue
          // @ts-expect-error TODO: type later
          const distanceX = node.x - node.originX
          // @ts-expect-error TODO: type later
          const distanceY = node.y - node.originY
          // This would prevent discourseme items to be pulled back to their origin
          // if (node.discoursemes?.length) continue
          const k = Math.min(
            alpha *
              strength *
              // smaller strength for less significant items
              // @ts-expect-error TODO: type later
              (node.significance * 0.8 + 0.2), //*
            // increase strength on higher zoom levels
            // clamp(transformationState.k, 0.5, 2)
            maxForce,
          )

          // @ts-expect-error TODO: type later
          node.vx -= distanceX * k * 2
          // @ts-expect-error TODO: type later
          node.vy -= distanceY * k * 2
        }
      }
      force.strength = function (newStrength) {
        strength = newStrength
      }
      return force
    }

    const zoom = d3.zoom()
    // @ts-expect-error TODO: type later
    svg.call(zoom.scaleExtent([0.25, 10]).on('zoom', zoomed))

    function zoomed({ transform }: { transform: d3.ZoomTransform }) {
      // transformationState = transform
      // render()
      container.attr('transform', transform)
    }

    return () => {
      container.remove()
    }
  }, [words, navigate, theme, size, updateCoordinates, semanticMapId])

  return (
    <>
      <svg ref={svgRef} className="h-[calc(100svh-3.5rem)] w-full">
        <g>
          <rect fill="transparent" width="100%" height="100%" />
        </g>
      </svg>
      <Button
        className="absolute bottom-20 left-10 shadow"
        id="center-map"
        variant="outline"
        size="icon"
      >
        <LocateIcon />
      </Button>
    </>
  )
}
