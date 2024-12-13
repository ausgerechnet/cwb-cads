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
import { clamp } from '@cads/shared/lib/clamp'
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

const fontSizeMin = 6
const fontSizeMax = 24

export default function WordCloud({
  words,
  semanticMapId,
  size,
  onNewDiscourseme,
  onUpdateDiscourseme,
}: {
  words: Omit<Word, 'radius' | 'id'>[]
  semanticMapId: number
  size: number
  onNewDiscourseme?: (surfaces: string[]) => void
  onUpdateDiscourseme?: (
    discoursemeDescriptionId: number,
    surface: string,
  ) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { mutate: updateCoordinates } = useMutation(putSemanticMapCoordinates)

  useEffect(() => {
    const isDarkMode = theme === 'dark'

    // TODO: ensure that words and discoursemes have universally(!) unique identifiers
    const wordData = words
      .filter((w) => w.source === 'items' || w.source === 'discoursemes')
      .map((word) => ({
        ...word,
        discoursemeId: word.discoursemeId ?? undefined,
        id: `${word.source}-${word.item}`,
        width: 10,
        height: 10,
      }))

    const discoursemeData = wordData
      .filter((words) => words.source === 'discoursemes')
      .map((d) => ({ ...d }))

    const drag = d3.drag<SVGCircleElement, Word>()

    const svg = d3.select(svgRef.current)

    const container = svg.select('g')

    const simulation = d3.forceSimulation().alphaDecay(0.001)

    let svgWidth = svgRef.current?.clientWidth ?? 0
    let svgHeight = svgRef.current?.clientHeight ?? 0

    const miniMap = container.append('g')

    let hoveredElement: {
      id: number
      source: 'discourseme' | 'item'
      item: string
    } | null = null

    // background
    miniMap
      .append('rect')
      .attr('class', 'fill-bg')
      // .attr('x', -size / 2)
      // .attr('y', -size / 2)
      .attr('width', size)
      .attr('height', size)

    const miniMapViewport = miniMap
      .append('rect')
      .attr('class', 'fill-white/5 stroke-white stroke-[10px] outline-white')
      .attr('width', svgWidth)
      .attr('height', svgHeight)

    // word dots on minimap
    miniMap
      .selectAll('.mini-map-word')
      .data(wordData)
      .join('circle')
      .attr('class', (d) =>
        // @ts-expect-error TODO: type later
        d.discoursemeId === undefined ? 'fill-white/30' : 'opacity-90',
      )
      .attr('fill', (d) => {
        // TODO: handle multiple discoursemes
        if (d.discoursemeId === undefined) return null
        return getColorForNumber(d.discoursemeId)
      })
      // @ts-expect-error TODO: type later
      .attr('r', (d) => (d.discoursemeId === undefined ? 20 : 40))
      .attr('cx', (d) => d.x + size / 2)
      .attr('cy', (d) => d.y + size / 2)

    const boundary = container
      .append('rect')
      .attr('class', 'dark:fill-white/5 fill-black/[2%]')
      .attr('rx', 20)
      .attr('width', size)
      .attr('height', size)
      .attr('x', -size / 2)
      .attr('y', -size / 2)

    const originLine = container
      .selectAll('.origin-line')
      .data(wordData.filter((d) => d.source === 'items'))
      .join('line')
      .attr(
        'stroke',
        isDarkMode ? 'rgb(255 255 255 / 10%)' : 'rgba(0 0 0 / 10%)',
      )
      .attr('stroke-opacity', 0.5)
      .attr('stroke-dasharray', '5 5')
      .attr('x1', (d) => d.x)
      .attr('y1', (d) => d.y)
      .attr('x2', (d) => d.originX)
      .attr('y2', (d) => d.originY)

    const textGroup = container
      .selectAll('.text-group')
      .data(wordData)
      .join('g')
      .attr('class', 'text-group')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .on('click', (_, d) => {
        if (d.source !== 'items') return
        // update search params:
        navigate({
          to: '',
          search: (s) => ({ ...s, clFilterItem: d.item }),
          params: (p) => p,
          replace: true,
        })
      })

    textGroup
      .append('rect')
      .attr(
        'fill',
        isDarkMode ? 'rgba(255 255 255 / 0.1%)' : 'rgba(0 0 0 / 0.1%)',
      )
      .attr('stroke', 'black')

    textGroup
      .append('circle')
      .attr(
        'fill',
        isDarkMode ? 'rgba(255 255 255 / 0.1%)' : 'rgba(0 0 0 / 0.1%)',
      )
      .attr('stroke', 'black')

    textGroup
      .append('text')
      .attr('class', 'pointer-events-none')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('opacity', (d) =>
        d?.discoursemeId === undefined ? 1 : d.significance * 0.4 + 0.6,
      )
      .attr('fill', ({ discoursemeId }) => {
        if (discoursemeId === undefined) return 'currentColor'
        return getColorForNumber(
          discoursemeId,
          1,
          undefined,
          isDarkMode ? 0.8 : 0.3,
        )
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('lengthAdjust', 'spacingAndGlyphs')
      .attr('font-size', (d) => {
        return d.significance * (fontSizeMax - fontSizeMin) + fontSizeMin
      })
      .text((d) => d.item)

    textGroup.each(function (d) {
      const textElement = d3
        .select(this)
        .select('text')
        .node() as SVGTextElement
      const bbox = textElement.getBBox()
      d.width = bbox.width + 10
      d.height = bbox.height + 4

      // @ts-expect-error TODO: type later
      if (d.source === 'discoursemes') {
        d3.select(this)
          .select('circle')
          .attr('r', 50)
          .attr('fill', 'white')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('stroke-width', 1)
          .attr('stroke', (d) => {
            if (d.discoursemeId === undefined) return 'rgb(100 100 100)'
            return getColorForNumber(d.discoursemeId)
          })
          .attr('fill', (d) => {
            if (d.discoursemeId === undefined) return 'transparent'
            return getColorForNumber(d.discoursemeId, 0.2)
          })
          .call(
            drag
              .on('start', dragStarted)
              .on('drag', dragged)
              .on('end', dragEnded),
          )
          .on('mouseenter', (_, d) => {
            hoveredElement = {
              id: d.id,
              item: d.item,
              source: d.source,
            }
          })
          .on('mouseleave', (_, d) => {
            hoveredElement = {
              id: d.id,
              item: d.item,
              source: d.source,
            }
            if (hoveredElement.id === d.id) {
              hoveredElement = null
            }
          })
      }

      // @ts-expect-error TODO: type later
      if (d.source === 'items') {
        d3.select(this)
          .select('rect')
          .attr('transform', `translate(-${d.width / 2}, -${d.height / 2 - 4})`)
          .attr('width', d.width)
          .attr('height', d.height)
          .attr('rx', 3)
          .attr('ry', 3)
          .attr('stroke-width', 1)
          .attr('stroke', (d) => {
            if (d.discoursemeId === undefined) return 'rgb(100 100 100)'
            return getColorForNumber(d.discoursemeId)
          })
          .attr('fill', (d) => {
            if (d.discoursemeId) return 'transparent'
            return getColorForNumber(d.discoursemeId, 0.2)
          })
          .call(
            drag
              .on('start', dragStarted)
              .on('drag', dragged)
              .on('end', dragEnded),
          )
          .on('mouseenter', (_, d) => {
            hoveredElement = {
              id: d.id,
              item: d.item,
              source: d.source,
            }
          })
          .on('mouseleave', (_, d) => {
            hoveredElement = {
              id: d.id,
              item: d.item,
              source: d.source,
            }
            if (hoveredElement.id === d.id) {
              hoveredElement = null
            }
          })
      }
    })

    let transformationState: d3.ZoomTransform = new d3.ZoomTransform(1, 0, 0)

    simulation
      .nodes([...wordData, ...discoursemeData])
      // .force(
      //   'link',
      //   d3
      //     .forceLink(links)
      //     .id((d) => d.id)
      //     .distance(75),
      // )
      .force(
        'collide',
        d3
          .forceCollide()
          // @ts-expect-error TODO: type later
          .radius(() => 0)
          .strength(0.3),
      )
      // .force('charge', d3.forceManyBody())
      .force('origin', originForce)
      .on('tick', () => {
        originLine
          .data(wordData)
          .attr('x1', (d) => d.x)
          .attr('y1', (d) => d.y)
        textGroup
          .data(wordData)
          .select('text')
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y)
        textGroup
          .data(wordData)
          .select('rect')
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y)
          .attr('class', (d) => {
            // @ts-expect-error TODO: type later
            const isDragging = !!d.isDragging
            if (isDragging) {
              return 'pointer-events-none animate-pulse cursor-grab'
            }
            return `cursor-grab`
          })
        textGroup
          .data(wordData)
          .select('circle')
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          // .attr('r', (d) => d.radius)
          .attr('class', (d) => {
            // @ts-expect-error TODO: type later
            const isDragging = !!d.isDragging
            if (isDragging) {
              return 'pointer-events-none animate-pulse cursor-grab'
            }
            return `cursor-grab`
          })
      })

    const scaleRange: [number, number] = [1, 5]

    function getNormalizedScale(k: number) {
      return (k - scaleRange[0]) / (scaleRange[1] - scaleRange[0])
    }

    function handleResize() {
      svgWidth = svgRef.current?.clientWidth ?? 0
      svgHeight = svgRef.current?.clientHeight ?? 0
      const baseScale = Math.min(svgWidth, svgHeight) / size
      scaleRange[0] = baseScale
      scaleRange[1] = baseScale * 5
      zoom.scaleExtent(scaleRange)
      const translationFactor = 0.6
      zoom.translateExtent([
        [-size * translationFactor, -size * translationFactor],
        // TODO: 1.4 is a magic number; a few UI elements overlap the svg, measure the safely visible area and use that as a reference
        // TODO: Better idea: let the SVG overflow and let a parent element clip it
        [size * translationFactor * 1.4, size * translationFactor],
      ])
      render()
    }

    function render() {
      const k = transformationState.k
      const kNormalized = getNormalizedScale(k)
      let minimumSignificance = 0
      if (kNormalized < 0.2) {
        minimumSignificance = 0.2
      }

      miniMap.attr('transform', `translate(24, ${svgHeight - 350}) scale(0.1)`)
      miniMapViewport
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .attr('x', -transformationState.x + size / 2)
        .attr('y', -transformationState.y + size / 2)
        .attr(
          'transform-origin',
          `${size - svgWidth / 2} ${size - svgHeight / 2}`,
        )
        .attr('transform', `scale(${1 / k})`)

      // @ts-expect-error TODO: type later
      boundary.attr('transform', transformationState)

      originLine
        // @ts-expect-error TODO: type later
        .attr('transform', transformationState)
        .attr('stroke-width', 1 / k)

      textGroup
        // @ts-expect-error TODO: type later
        .attr('transform', transformationState)
        .attr('opacity', (d) => {
          if (d.source === 'items') {
            return d.significance >= minimumSignificance ? 1 : 0.1
          }
          return 1
        })
        .attr('x', (d) => d.x)
        .attr('y', (d) => d.y)

      textGroup
        .select('text')
        .attr(
          'font-size',
          (d) =>
            ((d.significance * (fontSizeMax - fontSizeMin) + fontSizeMin) / k) *
            2,
        )

      textGroup
        .select('rect')
        .attr('width', (d) => {
          return (d.width / k) * 2
        })
        .attr('height', (d) => {
          return (d.height / k) * 2
        })
        .attr('rx', (3 / k) * 2)
        .attr('ry', (3 / k) * 2)
        .attr('stroke-width', (1 / k) * 2)
        .attr(
          'transform',
          (d) => `translate(-${d.width / k}, -${d.height / k + 2 / k})`,
        )
      // .attr('textLength', (d) => Math.max((d.radius * 2) / k - 20, 20))

      simulation.alpha(0.3).restart()
      simulation
        .force('collide')
        // @ts-expect-error TODO: type later
        ?.radius((d) => {
          if (d.source === 'discourseme_items') {
            console.log('0')
            return 0
          }
          if (d.significance < minimumSignificance && d.source === 'items')
            return 5
          return (d.width + 5) / k
        })
    }
    setTimeout(render, 1_000)

    const zoom = d3.zoom()
    // @ts-expect-error TODO: type later
    svg.call(zoom.scaleExtent([0.25, 10]).on('zoom', zoomed))

    function zoomed({ transform }: { transform: d3.ZoomTransform }) {
      transformationState = transform
      render()
    }

    let dragStartTime = new Date().getTime()

    function dragStarted(event) {
      dragStartTime = new Date().getTime()
      event.subject.dragStartX = event.subject.x
      event.subject.dragStartY = event.subject.y
      this.classList.add('pointer-events-none')

      simulation.force('collide')?.strength?.(0)
      simulation.alphaTarget(0.3).restart()
      homeStrength = 0
    }

    function dragged(event, d) {
      event.subject.isDragging = true
      d3.select(this)
        .attr('x', (d.x = event.x))
        .attr('y', (d.y = event.y))
    }

    function dragEnded(event, word: Word) {
      simulation.alphaTarget(0.3).restart()
      homeStrength = 1
      simulation.force('collide')?.strength?.(1)
      simulation.force('link')?.strength?.(1)
      this.classList.remove('pointer-events-none')
      if (new Date().getTime() - dragStartTime < 200) return
      event.subject.fx = null
      event.subject.fy = null
      event.subject.isDragging = false
      word.originX = word.x = event.x
      word.originY = word.y = event.y
      const newX = (event.x / size) * 2
      const newY = (event.y / size) * 2

      if (word.source === 'items' && hoveredElement.id !== null) {
        if (hoveredElement.source === 'discoursemes') {
          const discoursemeId = wordData.find(
            (w) => w.id === hoveredElement?.id,
          )?.discoursemeId
          if (discoursemeId === undefined) {
            throw new Error(`Could not find discourseme id for ${word.id}`)
          }
          onUpdateDiscourseme?.(discoursemeId, word?.item)
        } else {
          onNewDiscourseme?.([word.item, hoveredElement.item])
        }
        return
      }

      updateCoordinates({
        semanticMapId,
        item: word.item,
        x_user: newX,
        y_user: newY,
      })
    }

    // This value feels like a hack
    let homeStrength = 1
    function originForce(alpha: number) {
      const nodes = simulation.nodes()
      for (let i = 0, n = nodes.length; i < n; ++i) {
        const node = nodes[i]
        if (node.source === 'discourseme_items') continue
        // @ts-expect-error TODO: type later
        const distanceX = node.x - node.originX
        // @ts-expect-error TODO: type later
        const distanceY = node.y - node.originY
        // This would prevent discourseme items to be pulled back to their origin
        // if (node.discoursemes?.length) continue
        const k =
          alpha *
          0.02 *
          homeStrength *
          // smaller strength for less significant items
          // @ts-expect-error TODO: type later
          (node.significance * 0.8 + 0.2) *
          // increase strength on higher zoom levels
          clamp(transformationState.k, 0.5, 2)

        // @ts-expect-error TODO: type later
        node.vx -= distanceX * k * 2
        // @ts-expect-error TODO: type later
        node.vy -= distanceY * k * 2
      }
    }

    // TODO: add this event listener the 'react' way
    document.querySelector('#center-map')?.addEventListener('click', centerView)

    function centerView() {
      const centerX = svgWidth / 2
      const centerY = svgHeight / 2

      const zoomTransform = d3.zoomIdentity.translate(centerX, centerY).scale(1)

      // @ts-expect-error TODO: type later
      svg.call(d3.zoom().transform, zoomTransform)
      zoomed({ transform: zoomTransform })
    }

    centerView()

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      simulation.stop()
      miniMap.remove()
      boundary.remove()
      originLine.remove()
      textGroup.remove()
      document
        .querySelector('#center-map')
        ?.removeEventListener('click', centerView)
      window.removeEventListener('resize', handleResize)
    }
  }, [
    words,
    navigate,
    theme,
    size,
    updateCoordinates,
    semanticMapId,
    onNewDiscourseme,
    onUpdateDiscourseme,
  ])

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
