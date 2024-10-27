import * as d3 from 'd3'
import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getColorForNumber } from '@cads/shared/lib/get-color-for-number'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@cads/shared/components/ui/button'
import { LocateIcon } from 'lucide-react'
import { clamp } from '@cads/shared/lib/clamp'

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

export default function WordCloud({ words }: { words: Word[] }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const navigate = useNavigate()
  const { theme } = useTheme()

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
      return {
        id,
        x,
        y,
        originX: x,
        originY: y,
        bubbles,
      }
    })

    // const discoursemeLinks = discoursemeData
    //   .map(({ id: discoursemeId, x, y, bubbles }) =>
    //     bubbles.map((bubble) => ({
    //       source: discoursemeId,
    //       sourceX: x,
    //       sourceY: y,
    //       target: bubble.id,
    //       targetX: bubble.x,
    //       targetY: bubble.y,
    //       targetBubble: bubble,
    //     })),
    //   )
    //   .flat()

    const drag = d3.drag<SVGCircleElement, Word>()

    const svg = d3.select(svgRef.current)

    const container = svg.select('g')

    const simulation = d3.forceSimulation().alphaDecay(0.001)

    // let discoursemeAnchor: d3.Selection<
    //   SVGCircleElement | d3.BaseType,
    //   {
    //     id: string
    //     x: number
    //     y: number
    //     originX: number
    //     originY: number
    //     bubbles: Word[]
    //   },
    //   SVGCircleElement | d3.BaseType,
    //   unknown
    // >
    //
    // let discoursemeLink: d3.Selection<
    //   SVGLineElement | d3.BaseType,
    //   {
    //     source: string
    //     sourceX: number
    //     sourceY: number
    //     target: string
    //     targetX: number
    //     targetY: number
    //     targetBubble: Word
    //   },
    //   SVGLineElement | d3.BaseType,
    //   unknown
    // >

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

    // Custom force to repel overlapping rectangles
    // function forceRectangles() {
    //   let nodes
    //   let strength = 1
    //
    //   function force(alpha) {
    //     for (let i = 0; i < nodes.length; ++i) {
    //       for (let j = i + 1; j < nodes.length; ++j) {
    //         const nodeA = nodes[i]
    //         const nodeB = nodes[j]
    //
    //         const dx = nodeB.x - nodeA.x
    //         const dy = nodeB.y - nodeA.y
    //
    //         const k = (1 / (transformationState.k ?? 1)) * 2
    //         const widthA = nodeA.width * k
    //         const heightA = nodeA.height * k
    //         const widthB = nodeB.width * k
    //         const heightB = nodeB.height * k
    //
    //         const minDistanceX = (widthA + widthB) / 2
    //         const minDistanceY = (heightA + heightB) / 2
    //
    //         if (Math.abs(dx) < minDistanceX && Math.abs(dy) < minDistanceY) {
    //           const overlapX = minDistanceX - Math.abs(dx)
    //           const overlapY = minDistanceY - Math.abs(dy)
    //
    //           if (overlapX > 0 && overlapY > 0) {
    //             const moveX = (overlapX / 2) * strength * Math.min(1, alpha * 2)
    //             const moveY = (overlapY / 2) * strength * Math.min(1, alpha * 2)
    //
    //             if (dx > 0) {
    //               nodeA.x -= moveX
    //               nodeB.x += moveX
    //             } else {
    //               nodeA.x += moveX
    //               nodeB.x -= moveX
    //             }
    //
    //             if (dy > 0) {
    //               nodeA.y -= moveY
    //               nodeB.y += moveY
    //             } else {
    //               nodeA.y += moveY
    //               nodeB.y -= moveY
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    //
    //   force.initialize = function (newNodes) {
    //     nodes = newNodes
    //   }
    //
    //   force.strength = function (newStrength: number) {
    //     strength = newStrength
    //   }
    //
    //   return force
    // }

    simulation
      .nodes([...wordData, ...discoursemeData])
      .force(
        'collide',
        // forceRectangles(),
        d3
          .forceCollide()
          // @ts-expect-error TODO: type later
          .radius((d) => d.width)
          .strength(1),
      )
      // This forces discoursemes together
      // .force(
      //   'link',
      //   d3
      //     .forceLink(discoursemeLinks)
      //     // @ts-expect-error TODO: type later
      //     .id((d) => d.id)
      //     .distance(30),
      // )
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

        // discoursemeLink
        //   .data(discoursemeLinks)
        //   .attr('x2', (d) => d.targetBubble.x)
        //   .attr('y2', (d) => d.targetBubble.y)
      })

    function render() {
      // Renders the discourseme connection lines ans central bubble
      // discoursemeAnchor?.remove()
      // discoursemeAnchor = container
      //   .selectAll('.discourseme-anchor')
      //   .data(discoursemeData)
      //   .join('circle')
      //   .attr('cx', (d) => d.originX)
      //   .attr('cy', (d) => d.originY)
      //   .attr('r', 2)
      //   .attr('fill', 'yellow')
      //   // @ts-expect-error TODO: type later
      //   .attr('transform', transformationState)
      //
      // discoursemeLink?.remove()
      // discoursemeLink = container
      //   .selectAll('.discourseme-link')
      //   .data(discoursemeLinks)
      //   .join('line')
      //   .attr('x1', (d) => d.sourceX)
      //   .attr('y1', (d) => d.sourceY)
      //   .attr('x2', (d) => d.targetX)
      //   .attr('y2', (d) => d.targetY)
      //   .attr('stroke', 'yellow')
      //   .attr('stroke-width', 1)
      //   // @ts-expect-error TODO: type later
      //   .attr('transform', transformationState)

      const k = transformationState.k
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
    render()
    setTimeout(render, 1_000)

    // @ts-expect-error TODO: type later
    svg.call(d3.zoom().scaleExtent([0.25, 10]).on('zoom', zoomed))

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

    // function groupToDiscourseme(itemAId: string, itemBId: string) {
    //   const bubbleA = bubbleData.find((d) => d.id === itemAId)
    //   const bubbleB = bubbleData.find((d) => d.id === itemBId)
    //   if (!bubbleA || !bubbleB) {
    //     console.warn('could not find bubbles', itemAId, itemBId)
    //     return
    //   }
    //   let discoursemeId: number | undefined =
    //     bubbleA.discoursemes?.[0] ?? bubbleB.discoursemes?.[0]
    //   let discoursemeDatum = discoursemeData.find((d) => d.id === discoursemeId)
    //   if (!discoursemeId || !discoursemeDatum) {
    //     discoursemeId = Math.ceil(Math.random() * 1_000_000) + 1_000_000
    //     discoursemeDatum = {
    //       id: discoursemeId,
    //       x: (bubbleA.originX + bubbleB.originX) / 2,
    //       y: (bubbleA.originY + bubbleB.originY) / 2,
    //       originX: (bubbleA.originX + bubbleB.originX) / 2,
    //       originY: (bubbleA.originY + bubbleB.originY) / 2,
    //       bubbles: [],
    //     }
    //     discoursemeData.push(discoursemeDatum)
    //   } // eslint-disable-next-line no-extra-semi
    //   ;[bubbleA, bubbleB].forEach((bubble) => {
    //     if (bubble.discoursemes?.includes(discoursemeId!)) return
    //     bubble.discoursemes = [...(bubble.discoursemes ?? []), discoursemeId!]
    //     discoursemeLinks.push({
    //       source: discoursemeDatum!.id,
    //       sourceX: discoursemeDatum!.originX,
    //       sourceY: discoursemeDatum!.originY,
    //       target: bubble.id,
    //       targetX: bubble.x,
    //       targetY: bubble.y,
    //       targetBubble: bubble,
    //     })
    //     if (discoursemeDatum!.bubbles.includes(bubble)) {
    //       discoursemeDatum!.bubbles.push(bubble)
    //     }
    //   })
    //
    //   simulation.nodes([...bubbleData, ...discoursemeData])
    //
    //   render()
    // }

    // @ts-expect-error TODO: type later
    function dragEnded(event) {
      simulation.alphaTarget(0.3).restart()
      event.subject.fx = null
      event.subject.fy = null
      event.subject.isDragging = false
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(1)
      // @ts-expect-error TODO: type later
      simulation.force('link')?.strength?.(1)
      homeStrength = 1
      //
      // const dragId = event.subject.id
      // const dropId = hoveredBubbleId !== dragId ? hoveredBubbleId : null
      // if (dropId) {
      //   groupToDiscourseme(dragId, dropId)
      // }
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
      const svg = d3.select(svgRef.current)
      const width = svgRef.current?.clientWidth ?? 0
      const height = svgRef.current?.clientHeight ?? 0
      const centerX = width / 2
      const centerY = height / 2

      const zoomTransform = d3.zoomIdentity.translate(centerX, centerY).scale(1)

      // @ts-expect-error TODO: type later
      svg.call(d3.zoom().transform, zoomTransform)
      zoomed({ transform: zoomTransform })
    }

    centerView()

    return () => {
      // bubble.remove()
      originLine.remove()
      textGroup.remove()
      document
        .querySelector('#center-map')
        ?.removeEventListener('click', centerView)
      // discoursemeAnchor.remove()
      // discoursemeLink.remove()
    }
  }, [words, navigate, theme])

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
