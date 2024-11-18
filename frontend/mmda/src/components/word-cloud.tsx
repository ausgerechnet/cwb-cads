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
  word: string
  x: number
  y: number
  dragStartX?: number
  dragStartY?: number
  originX: number
  originY: number
  significance: number
  radius: number
  discoursemes?: number[]
}

const fontSizeMin = 6
const fontSizeMax = 24

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
    const isDarkMode = theme === 'dark'
    let hoveredBubbleId: string | null = null

    // TODO: ensure that words and discoursemes have universally(!) unique identifiers
    const wordData = words.map((word) => ({
      ...word,
      width: 10,
      height: 10,
    }))

    const discoursemeData = [
      ...new Set(words.map((words) => words.discoursemes ?? []).flat()),
    ].map((id) => {
      const bubbles = wordData.filter((b) => b.discoursemes?.includes(id))
      const x =
        bubbles.reduce((acc, bubble) => acc + bubble.x, 0) / bubbles.length
      const y =
        bubbles.reduce((acc, bubble) => acc + bubble.y, 0) / bubbles.length
      return { id, x, y, originX: x, originY: y, bubbles }
    })

    const drag = d3.drag<SVGCircleElement, Word>()

    const svg = d3.select(svgRef.current)

    const container = svg.select('g')

    const simulation = d3.forceSimulation().alphaDecay(0.001)

    let svgWidth = svgRef.current?.clientWidth ?? 0
    let svgHeight = svgRef.current?.clientHeight ?? 0

    const miniMap = container.append('g')

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
      .attr('class', 'fill-white/25')
      .attr('r', 50)
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
      .data(wordData)
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
      .on('click', (...args) => {
        console.log('clicked on', args)
      })

    textGroup
      .append('rect')
      .attr(
        'fill',
        isDarkMode ? 'rgba(255 255 255 / 0.1%)' : 'rgba(0 0 0 / 0.1%',
      )
      .attr('stroke', 'black')

    textGroup
      .append('text')
      .attr('class', 'pointer-events-none')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('opacity', (d) =>
        d?.discoursemes?.length ? 1 : d.significance * 0.4 + 0.6,
      )
      .attr('fill', (d) => {
        const discoursemes = d.discoursemes
        if (!discoursemes || !discoursemes.length) return 'currentColor'
        return getColorForNumber(
          discoursemes[0]!,
          1,
          undefined,
          isDarkMode ? 0.8 : 0.3,
        )
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('lengthAdjust', 'spacingAndGlyphs')
      .attr(
        'font-size',
        (d) => d.significance * (fontSizeMax - fontSizeMin) + fontSizeMin,
      )
      .text((d) => d.word)

    textGroup.each(function (d) {
      const textElement = d3
        .select(this)
        .select('text')
        .node() as SVGTextElement
      const bbox = textElement.getBBox()
      d.width = bbox.width + 10
      d.height = bbox.height + 4
      d3.select(this)
        .select('rect')
        .attr('transform', `translate(-${d.width / 2}, -${d.height / 2 - 4})`)
        .attr('width', d.width)
        .attr('height', d.height)
        .attr('rx', 3)
        .attr('ry', 3)
        .attr('stroke-width', 1)
        .attr('stroke', (d) => {
          // @ts-expect-error TODO: type later
          const discoursemes = d.discoursemes
          if (!discoursemes || !discoursemes.length) return 'rgb(100 100 100)'
          return getColorForNumber(discoursemes[0]!)
        })
        .attr('fill', (d) => {
          // @ts-expect-error TODO: type later
          const discoursemes = d.discoursemes
          if (!discoursemes || !discoursemes.length) return 'transparent'
          return getColorForNumber(discoursemes[0]!, 0.2)
        })
        .call(
          // @ts-expect-error TODO: type later
          drag
            .on('start', dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded),
        )
        .on('mouseenter', (_, d) => {
          // @ts-expect-error TODO: type later
          hoveredBubbleId = d.id
        })
        .on('mouseleave', (_, d) => {
          // @ts-expect-error TODO: type later
          if (hoveredBubbleId === d.id) hoveredBubbleId = null
        })
    })

    let transformationState: d3.ZoomTransform = new d3.ZoomTransform(1, 0, 0)

    simulation
      .nodes([...wordData, ...discoursemeData])
      .force(
        'collide',
        d3
          .forceCollide()
          // @ts-expect-error TODO: type later
          .radius((d) => d.width)
          .strength(1),
      )
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
            const isWithinDiscourseme = (d.discoursemes?.length ?? 0) > 0
            if (isWithinDiscourseme) {
              return 'cursor-pointer'
            }
            if (isDragging) {
              return 'pointer-events-none animate-pulse cursor-grab'
            }
            return `cursor-grab`
          })
      })

    function handleResize() {
      svgWidth = svgRef.current?.clientWidth ?? 0
      svgHeight = svgRef.current?.clientHeight ?? 0
      const baseScale = Math.min(svgWidth, svgHeight) / size
      zoom.scaleExtent([baseScale, baseScale * 5])
      const translationFactor = 0.6
      zoom.translateExtent([
        [-size * translationFactor, -size * translationFactor],
        // TODO: 1.4 is a magic number; a few UI elements overlap the svg, measure the safely visible area and use that as a reference
        [size * translationFactor * 1.4, size * translationFactor],
      ])
      render()
    }

    function render() {
      const k = transformationState.k

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
        .attr('width', (d) => (d.width / k) * 2)
        .attr('height', (d) => (d.height / k) * 2)
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
        ?.radius((d) => (d.width + 5) / k)
    }
    setTimeout(render, 1_000)

    const zoom = d3.zoom()
    // @ts-expect-error TODO: type later
    svg.call(zoom.scaleExtent([0.25, 10]).on('zoom', zoomed))

    function zoomed({ transform }: { transform: d3.ZoomTransform }) {
      transformationState = transform
      render()
    }

    // @ts-expect-error TODO: type later
    function dragStarted(event) {
      event.subject.dragStartX = event.subject.x
      event.subject.dragStartY = event.subject.y

      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(0)
      // @ts-expect-error TODO: type later
      simulation.force('link')?.strength?.(0)
      simulation.alphaTarget(0.3).restart()
      homeStrength = 0
    }

    // @ts-expect-error TODO: type later
    function dragged(event, d) {
      event.subject.isDragging = true
      // @ts-expect-error TODO: type later
      d3.select(this)
        .attr('x', (d.x = event.x))
        .attr('y', (d.y = event.y))
    }

    // @ts-expect-error TODO: type later
    function dragEnded(event, wordData: Word) {
      simulation.alphaTarget(0.3).restart()
      event.subject.fx = null
      event.subject.fy = null
      event.subject.isDragging = false
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(1)
      // @ts-expect-error TODO: type later
      simulation.force('link')?.strength?.(1)
      wordData.originX = wordData.x = event.x
      wordData.originY = wordData.y = event.y
      const newX = (event.x / size) * 2
      const newY = (event.y / size) * 2

      // TODO: Update via API
      console.log(newX, newY)
      updateCoordinates({
        semanticMapId,
        item: wordData.word,
        x_user: newX,
        y_user: newY,
      })

      homeStrength = 1
    }

    // This value feels like a hack
    let homeStrength = 1
    function originForce(alpha: number) {
      const nodes = simulation.nodes()
      for (let i = 0, n = nodes.length; i < n; ++i) {
        const node = nodes[i]
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
        node.vx -= (node.x - node.originX) * k * 2
        // @ts-expect-error TODO: type later
        node.vy -= (node.y - node.originY) * k * 2
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
      miniMap.remove()
      boundary.remove()
      originLine.remove()
      textGroup.remove()
      document
        .querySelector('#center-map')
        ?.removeEventListener('click', centerView)
      window.removeEventListener('resize', handleResize)
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

// function scaleFrom(position: number, origin: number, scale: number) {
//   return (position - origin) / scale + origin
// }
