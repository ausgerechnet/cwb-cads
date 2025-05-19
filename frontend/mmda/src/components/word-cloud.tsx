// TODO: fix the types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as d3 from 'd3'
import { useEffect, useRef, useMemo } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { LocateIcon } from 'lucide-react'

import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { useTheme } from '@cads/shared/components/theme-provider'
import { Button } from '@cads/shared/components/ui/button'
import { clamp } from '@cads/shared/lib/clamp'
import { putSemanticMapCoordinates } from '@cads/shared/queries'
import { cn } from '@cads/shared/lib/utils'

export type WordIn = {
  item: string
  x: number
  y: number
  source: string
  significance: number
  discoursemeId?: number | undefined
}

export type Word = {
  id: string
  item: string
  x: number // Should be between -1 and 1
  y: number // Should be between -1 and 1
  source: string
  dragStartX?: number
  dragStartY?: number
  originX: number
  originY: number
  significance: number
  radius: number
  discoursemeId: number | null
}

const fontSizeMin = 6
const fontSizeMax = 24
const discoursemeRadiusMin = 25
const discoursemeRadiusMax = 125

export default function WordCloud({
  className,
  words: wordsInput,
  semanticMapId,
  width = 5_000,
  height = 2_000,
  boardPadding = 300,
  onNewDiscourseme,
  onUpdateDiscourseme,
}: {
  className?: string
  words: WordIn[]
  semanticMapId?: number
  width?: number
  height?: number
  boardPadding?: number
  onNewDiscourseme?: (surfaces: string[]) => void
  onUpdateDiscourseme?: (
    discoursemeDescriptionId: number,
    surface: string,
  ) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { mutate: updateCoordinates } = useMutation(putSemanticMapCoordinates)
  const router = useRouter()

  const averageSignificance =
    wordsInput.length === 0
      ? 1
      : wordsInput.reduce((acc, word) => acc + word.significance, 0) /
        wordsInput.length
  const targetSignificance = 0.02
  const significanceScale = targetSignificance / averageSignificance

  const words = useMemo(
    () =>
      wordsInput.map(
        (word): Word => ({
          ...word,
          id: word.item + word.source,
          significance:
            word.source === 'discoursemes'
              ? word.significance
              : word.significance * significanceScale,
          x: (word.x * (width - boardPadding)) / 2,
          y: (word.y * (height - boardPadding)) / 2,
          originX: (word.x * (width - boardPadding)) / 2,
          originY: (word.y * (height - boardPadding)) / 2,
          radius: 0,
          discoursemeId: word.discoursemeId ?? null,
        }),
      ),
    [boardPadding, height, significanceScale, width, wordsInput],
  )

  useEffect(() => {
    const [initialZoom, initialX, initialY] = location.hash
      .slice(1)
      .split(':')
      .map(Number)

    let filterDiscoursemeIds = (router?.latestLocation?.search
      ?.clDiscoursemeItemIds ?? []) as number[]
    let filterItem = (router?.latestLocation?.search?.clFilterItem ??
      '') as string

    // TODO: this doesn't handle theme === "system" properly yet!
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

    const significanceValues = wordData
      .filter((w) => w.source === 'items')
      .map((w) => w.significance)
      .sort((a, b) => b - a)
    let topSignificanceValues =
      significanceValues[Math.floor(significanceValues.length * 0.1)] +
      Number.MIN_VALUE
    if (
      !words.some(
        (w) => w.source === 'items' && w.significance >= topSignificanceValues,
      )
    ) {
      topSignificanceValues -= Number.MIN_VALUE * 2
    }
    if (words.length < 100) {
      topSignificanceValues = 0
    }

    const drag = d3.drag<SVGCircleElement, Word>()

    const svg = d3.select(svgRef.current)

    const container = svg.select('g')

    // Re-use simulation instead of re-creating it
    const simulation = simulationRef.current ?? d3.forceSimulation()
    simulationRef.current = simulation

    let svgWidth = svgRef.current?.clientWidth ?? 0
    let svgHeight = svgRef.current?.clientHeight ?? 0

    let hoveredElement: {
      id: number
      source: 'discourseme' | 'item'
      item: string
    } | null = null

    const boundary = container
      .append('rect')
      .attr('class', 'dark:fill-white/5 fill-black/[2%]')
      .attr('rx', 20)
      .attr('width', width)
      .attr('height', height)
      .attr('x', -width / 2)
      .attr('y', -height / 2)

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
      .on('click', (_, d) => {
        // TODO pass responsibility upwards the Virtual DOM
        // update search params:
        if (d.source === 'discoursemes') {
          navigate({
            to: '',
            search: (s) => {
              const currentFilterDiscoursemeIds = s.clFilterDiscoursemeIds ?? []
              const clFilterDiscoursemeIds =
                currentFilterDiscoursemeIds.includes(d.discoursemeId)
                  ? currentFilterDiscoursemeIds.filter(
                      (id) => id !== d.discoursemeId,
                    )
                  : [d.discoursemeId, ...currentFilterDiscoursemeIds]
              return { ...s, clPageIndex: 0, clFilterDiscoursemeIds }
            },
            params: (p) => p,
            replace: true,
          })
        }
        if (d.source === 'items') {
          navigate({
            to: '',
            // TODO: patt must come from higher up
            search: (s) => ({
              ...s,
              clPageIndex: 0,
              clFilterItem: d.item,
              clFilterItemPAtt: 'lemma',
            }),
            params: (p) => p,
            replace: true,
          })
        }
      })

    textGroup.filter((d) => d.source !== 'discoursemes').append('rect')

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
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('lengthAdjust', 'spacingAndGlyphs')
      .attr('font-size', function (d) {
        if (d.source === 'discoursemes') {
          return 10
        }
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
      const radius =
        d.significance * (discoursemeRadiusMax - discoursemeRadiusMin) +
        discoursemeRadiusMin
      const scale = (radius * 2) / d.width

      if (d.source === 'discoursemes') {
        d3.select(this)
          .select('text')
          .attr('font-size', 10 * scale)

        d3.select(this)
          .select('circle')
          .attr('r', radius)
          .attr('fill', 'white')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('stroke', (d) => {
            if (d.discoursemeId === undefined) return 'rgb(100 100 100)'
            return getColorForNumber(d.discoursemeId)
          })
          .attr('fill', (d) => {
            if (d.discoursemeId === undefined) return 'transparent'
            return getColorForNumber(d.discoursemeId, 0.5)
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

      if (d.source === 'items') {
        d3.select(this)
          .select('rect')
          .attr('transform', `translate(-${d.width / 2}, -${d.height / 2 - 4})`)
          .attr('width', d.width)
          .attr('height', d.height)
          .attr('rx', 3)
          .attr('ry', 3)
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

    const miniMap = container.append('g')

    const miniMapBackground = miniMap.append('g')

    // minimap base background
    miniMapBackground
      .append('rect')
      .attr(
        'class',
        'dark:fill-gray-900 fill-gray-400 stroke-foreground stroke-[.25rem]',
      )
      .attr('rx', 75)
      .attr('width', width)
      .attr('height', height)

    // minimap background with mask to highlight the viewport
    miniMapBackground
      .append('rect')
      .attr('class', 'fill-gray-300 dark:fill-white/20')
      .attr('rx', 75)
      .attr('width', width)
      .attr('height', height)
      .attr('mask', 'url(#highlight-mask)')

    // get the #highlight-mask mask and add a rect to it
    const miniMapViewport = svg
      .select('#highlight-mask')
      .append('rect')
      .attr('class', 'fill-white')
      .attr('width', svgWidth)
      .attr('height', svgHeight)
      .attr('mask', 'url(#mini-map-mask)')

    // word dots on minimap
    miniMap
      .selectAll('.mini-map-word')
      .data(wordData)
      .join('circle')
      .attr('class', (d) =>
        d.discoursemeId === undefined
          ? 'fill-black/90 dark:fill-white/30'
          : 'opacity-90',
      )
      .attr('fill', (d) => {
        if (d.discoursemeId === undefined) return null
        return getColorForNumber(d.discoursemeId)
      })
      .attr('r', (d) => (d.discoursemeId === undefined ? 20 : 60))
      .attr('cx', (d) => d.x + width / 2)
      .attr('cy', (d) => d.y + height / 2)

    let transformationState: d3.ZoomTransform = new d3.ZoomTransform(1, 0, 0)

    simulation
      .alphaDecay(0.05)
      .nodes([...wordData])
      .force(
        'collide',
        d3
          .forceCollide()
          .radius(() => 0)
          .strength(0.2),
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
            const isFilterItem = d.source === 'items' && d.item === filterItem
            const isDragging = !!d.isDragging
            return cn(
              `cursor-grab dark:fill-white/10 fill-black/5 hover:fill-primary/50 dark:hover:fill-primary/50`,
              isDragging && 'pointer-events-none animate-pulse',
              isFilterItem && 'stroke-primary',
            )
          })
        textGroup
          .data(wordData)
          .select('circle')
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          .attr('class', (d) => {
            const isFilterDiscourseme =
              d.source === 'discoursemes' &&
              filterDiscoursemeIds.includes(d.discoursemeId)
            const isDragging = !!d.isDragging
            return cn(
              `cursor-grab opacity-60 hover:bg-opacity-100 stroke-1 hover:stroke-2 transition-all`,
              isDragging && 'pointer-events-none animate-pulse',
              isFilterDiscourseme && 'opacity-70 stroke-2 stroke-primary',
            )
          })
      })

    const scaleRange: [number, number] = [1, 10]

    function getNormalizedScale(k: number) {
      return (k - scaleRange[0]) / (scaleRange[1] - scaleRange[0])
    }

    function getScaleFromNormalized(kNormalized: number) {
      return kNormalized * (scaleRange[1] - scaleRange[0]) + scaleRange[0]
    }

    function handleResize() {
      svgWidth = svgRef.current?.clientWidth ?? 0
      svgHeight = svgRef.current?.clientHeight ?? 0
      const baseScale = Math.min(svgWidth / width, svgHeight / height)
      scaleRange[0] = baseScale
      scaleRange[1] = baseScale * 10
      zoom.scaleExtent(scaleRange)
      const translationFactor = 0.5
      zoom.translateExtent([
        [-width * translationFactor, -height * translationFactor],
        [width * translationFactor, height * translationFactor],
      ])
      render()
    }

    let timeoutHash: number | null = null
    function updateHash(kNormalized: number, x: number, y: number) {
      clearTimeout(timeoutHash)
      function format(n: number) {
        return (Math.round(n * 100) / 100).toString()
      }
      timeoutHash = setTimeout(
        () =>
          (location.hash = `${format(kNormalized)}:${Math.floor(x)}:${Math.floor(
            y,
          )}`),
        50,
      )
    }

    function render(preventSimulation = false) {
      const k = transformationState.k
      const kNormalized = getNormalizedScale(k)
      let minimumSignificance = 0
      if (kNormalized < 0.2) {
        minimumSignificance = topSignificanceValues
      }
      updateHash(kNormalized, transformationState.x, transformationState.y)

      miniMap.attr(
        'class',
        'translate-x-1 translate-y-1 scale-[.05] opacity-[.97]',
      )
      miniMapViewport
        .attr('width', svgWidth / k)
        .attr('height', svgHeight / k)
        .attr('x', -transformationState.x / k + width / 2)
        .attr('y', -transformationState.y / k + height / 2)

      boundary.attr('transform', transformationState)

      originLine
        .attr('transform', transformationState)
        .attr('stroke-width', 1 / k)

      textGroup.attr('transform', transformationState).attr('opacity', (d) => {
        if (d.source === 'items') {
          return d.significance >= minimumSignificance ? 1 : 0.1
        }
        return 1
      })

      textGroup
        .filter((d) => d.source !== 'discoursemes')
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

      if (preventSimulation) return
      simulation.alpha(0.3).restart()
      simulation.force('collide')?.radius((d) => {
        switch (d.source) {
          case 'discoursemes':
            return (
              d.significance * (discoursemeRadiusMax - discoursemeRadiusMin) +
              discoursemeRadiusMin
            )
          default:
            return d.significance < minimumSignificance ? 5 : (d.width + 5) / k
        }
      })
    }
    setTimeout(render, 1_000)

    const zoom = d3.zoom()
    svg.call(zoom.scaleExtent([0.25, 10]).on('zoom', zoomed))

    function zoomed({ transform }: { transform: d3.ZoomTransform }) {
      const isSameZoom = transform.k === transformationState.k
      transformationState = transform

      render(isSameZoom)
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
      event.subject.isDragging = false
      if (new Date().getTime() - dragStartTime < 200) return
      event.subject.fx = null
      event.subject.fy = null
      word.originX = word.x = event.x
      word.originY = word.y = event.y
      const newX = (event.x / (width - boardPadding)) * 2
      const newY = (event.y / (height - boardPadding)) * 2

      if (
        word.source === 'items' &&
        hoveredElement &&
        hoveredElement.id !== null
      ) {
        if (hoveredElement.source === 'discoursemes') {
          const discoursemeId = wordData.find(
            (w) => w.id === hoveredElement?.id,
          )?.discoursemeId
          if (discoursemeId === undefined) {
            throw new Error(`Could not find discourseme id for ${word.id}`)
          }
          onUpdateDiscourseme?.(discoursemeId, word?.item)
        } else if (word.item !== hoveredElement.item) {
          onNewDiscourseme?.([word.item, hoveredElement.item])
        }
        return
      }

      if (semanticMapId !== undefined) {
        updateCoordinates({
          semanticMapId,
          item: word.item,
          x_user: clamp(newX, -1, 1),
          y_user: clamp(newY, -1, 1),
        })
      }
    }

    // This value feels like a hack
    let homeStrength = 1
    function originForce(alpha: number) {
      const nodes = simulation.nodes()
      for (let i = 0, n = nodes.length; i < n; ++i) {
        const node = nodes[i]
        // This would prevent discourseme items to be pulled back to their origin
        if (node.source === 'discourseme_items') continue
        const distanceX = node.x - node.originX
        const distanceY = node.y - node.originY
        const k = alpha * 0.05 * homeStrength

        node.vx -= distanceX * k * 2
        node.vy -= distanceY * k * 2
      }
    }

    const unsubscribeRouter = router.subscribe('onResolved', (event) => {
      filterItem = event.toLocation.search.clFilterItem ?? ''
      filterDiscoursemeIds = [
        ...(event.toLocation.search.clFilterDiscoursemeIds ?? []),
      ]
      render(true)
    })

    // TODO: add this event listener the 'react' way
    document.querySelector('#center-map')?.addEventListener('click', centerView)

    function centerView() {
      const centerX = svgWidth / 2
      const centerY = svgHeight / 2

      const zoomTransform = d3.zoomIdentity
        .translate(centerX, centerY)
        .scale(scaleRange[0])

      // @ts-expect-error TODO: type later
      svg.call(d3.zoom().transform, zoomTransform)
      zoomed({ transform: zoomTransform })
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    if (
      initialZoom !== undefined &&
      initialX !== undefined &&
      initialY !== undefined
    ) {
      const zoomTransform = d3.zoomIdentity
        .translate(initialX, initialY)
        .scale(getScaleFromNormalized(initialZoom))
      svg.call(d3.zoom().transform, zoomTransform)
      zoomed({ transform: zoomTransform })
    } else {
      centerView()
    }

    return () => {
      simulation.stop()
      miniMap.remove()
      miniMapViewport.remove()
      boundary.remove()
      originLine.remove()
      textGroup.remove()
      document
        .querySelector('#center-map')
        ?.removeEventListener('click', centerView)
      window.removeEventListener('resize', handleResize)
      unsubscribeRouter()
    }
  }, [
    router,
    words,
    navigate,
    theme,
    width,
    height,
    updateCoordinates,
    semanticMapId,
    onNewDiscourseme,
    onUpdateDiscourseme,
    boardPadding,
  ])

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        className="absolute h-full w-full overflow-visible rounded-md"
      >
        <defs>
          <mask id="highlight-mask">
            <rect x="0" y="0" width={width} height={height} fill="black" />
          </mask>
          <mask id="mini-map-mask">
            <rect width={width} height={height} fill="#fff" />
          </mask>
        </defs>
        {/* This rect merely serves as a "grabbing" area */}
        <rect fill="transparent" width="150%" height="150%" x="-25%" y="-25%" />
        <g></g>
      </svg>
      <Button
        className="absolute bottom-1 left-1 shadow"
        id="center-map"
        variant="outline"
        size="icon"
      >
        <LocateIcon />
      </Button>
    </div>
  )
}
