import * as d3 from 'd3'
import { faker } from '@faker-js/faker'
import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'

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
  discoursemes?: string[]
}
//
// function createWord(override: Partial<Word> = {}): Word {
//   const position = [
//     faker.number.float({ min: 100, max: 800 }),
//     faker.number.float({ min: 100, max: 800 }),
//   ]
//   return {
//     id: faker.string.uuid(),
//     word: faker.lorem.word(),
//     x: position[0],
//     y: position[1],
//     originX: position[0],
//     originY: position[1],
//     significance: faker.number.float({ min: 0, max: 1 }),
//     radius: 0,
//     ...override,
//   }
// }
//
// function createWordCloud(count = 500): Word[] {
//   faker.seed(23)
//   return [
//     createWord({ discoursemes: ['a'] }),
//     createWord({ discoursemes: ['a'] }),
//     createWord({ discoursemes: ['a'] }),
//     ...faker.helpers.multiple(createWord, { count }),
//   ]
// }
//
// const defaultWords = createWordCloud(100)
const defaultWords: Word[] = []

export default function WordCloud({
  words = defaultWords,
}: {
  words?: Word[]
}) {
  const svgRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    let hoveredBubbleId: string | null = null

    // TODO: ensure that words and discoursemes have universally(!) unique identifiers
    const bubbleData = words.map((word) => ({
      ...word,
      radius: word.significance * 20 + 10,
    }))

    const discoursemeData = [
      ...new Set(words.map((words) => words.discoursemes ?? []).flat()),
    ].map((id) => {
      const bubbles = bubbleData.filter((b) => b.discoursemes?.includes(id))
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

    const discoursemeLinks = discoursemeData
      .map(({ id: discoursemeId, x, y, bubbles }) =>
        bubbles.map((bubble) => ({
          source: discoursemeId,
          sourceX: x,
          sourceY: y,
          target: bubble.id,
          targetX: bubble.x,
          targetY: bubble.y,
          targetBubble: bubble,
        })),
      )
      .flat()

    const drag = d3.drag<SVGCircleElement, Word>()

    const svg = d3.select(svgRef.current)

    const container = svg.select('g').attr('cursor', 'grab')

    // container.on('click', () => {
    //   navigate({
    //     params: (p) => p,
    //     search: (s) => ({ ...s, select: undefined }),
    //     replace: true,
    //   })
    // })

    const simulation = d3.forceSimulation()

    let discoursemeAnchor: d3.Selection<
      SVGCircleElement | d3.BaseType,
      {
        id: string
        x: number
        y: number
        originX: number
        originY: number
        bubbles: Word[]
      },
      SVGCircleElement | d3.BaseType,
      unknown
    >

    let discoursemeLink: d3.Selection<
      SVGLineElement | d3.BaseType,
      {
        source: string
        sourceX: number
        sourceY: number
        target: string
        targetX: number
        targetY: number
        targetBubble: Word
      },
      SVGLineElement | d3.BaseType,
      unknown
    >

    const originLine = container
      .selectAll('.origin-line')
      .data(bubbleData)
      .join('line')
      .attr('stroke', 'limegreen')
      .attr('stroke-opacity', 0.5)
      .attr('x1', (d) => d.x)
      .attr('y1', (d) => d.y)
      .attr('x2', (d) => d.originX)
      .attr('y2', (d) => d.originY)

    const bubbleUpdate = container.selectAll('.word-bubble').data(bubbleData)

    const bubble = bubbleUpdate
      .join('circle')
      .attr('stroke-opacity', (d) => (d.discoursemes?.includes('a') ? 1 : 0.05))
      .attr('transform', `translate(0, 0)`)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.radius)
      // @ts-expect-error TODO: type later
      .on('click', (event, d) => {
        event.stopPropagation()
        // navigate({
        //   params: (p) => p,
        //   search: (s) => ({ ...s, select: d.id }),
        //   replace: true,
        // })
      })
      .call(
        // @ts-expect-error TODO: type later
        drag.on('start', dragStarted).on('drag', dragged).on('end', dragEnded),
      )
      .on('mouseenter', (_, d) => {
        hoveredBubbleId = d.id
      })
      .on('mouseleave', (_, d) => {
        if (hoveredBubbleId === d.id) hoveredBubbleId = null
      })

    const text = container
      .selectAll('.word-text')
      .data(bubbleData)
      .join('text')
      .attr('class', 'pointer-events-none')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('opacity', (d) => d.significance * 0.4 + 0.6)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('lengthAdjust', 'spacingAndGlyphs')
      .attr('textLength', (d) => d.radius * 2 - 20)
      .text((d) => d.word)

    simulation
      .nodes([...bubbleData, ...discoursemeData])
      .force(
        'collide',
        d3
          .forceCollide()
          // @ts-expect-error TODO: type later
          .radius((d) => d.radius)
          .strength(1),
      )
      .force(
        'link',
        d3
          .forceLink(discoursemeLinks)
          // @ts-expect-error TODO: type later
          .id((d) => d.id)
          .distance(30),
      )
      .force('origin', originForce)
      .on('tick', () => {
        bubble
          .data(bubbleData)
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          .attr('class', (d) => {
            // @ts-expect-error TODO: type later
            const isDragging = !!d.isDragging
            const isWithinDiscourseme = (d.discoursemes?.length ?? 0) > 0
            if (isWithinDiscourseme) {
              return 'fill-blue-500 hover:fill-blue-600 cursor-pointer'
            }
            if (isDragging) {
              return 'fill-muted/50 pointer-events-none animate-pulse cursor-grab'
            }
            return 'fill-transparent hover:fill-green-500/50 cursor-grab'
          })
        originLine
          .data(bubbleData)
          .attr('x1', (d) => d.x)
          .attr('y1', (d) => d.y)
        text
          .data(bubbleData)
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y)
        discoursemeLink
          .data(discoursemeLinks)
          .attr('x2', (d) => d.targetBubble.x)
          .attr('y2', (d) => d.targetBubble.y)
      })

    let transformationState: d3.ZoomTransform = new d3.ZoomTransform(1, 0, 0)
    function render() {
      discoursemeAnchor?.remove()
      discoursemeAnchor = container
        .selectAll('.discourseme-anchor')
        .data(discoursemeData)
        .join('circle')
        .attr('cx', (d) => d.originX)
        .attr('cy', (d) => d.originY)
        .attr('r', 2)
        .attr('fill', 'yellow')
        // @ts-expect-error TODO: type later
        .attr('transform', transformationState)

      discoursemeLink?.remove()
      discoursemeLink = container
        .selectAll('.discourseme-link')
        .data(discoursemeLinks)
        .join('line')
        .attr('x1', (d) => d.sourceX)
        .attr('y1', (d) => d.sourceY)
        .attr('x2', (d) => d.targetX)
        .attr('y2', (d) => d.targetY)
        .attr('stroke', 'yellow')
        .attr('stroke-width', 1)
        // @ts-expect-error TODO: type later
        .attr('transform', transformationState)

      const k = transformationState.k
      bubble
        // @ts-expect-error TODO: type later
        .attr('transform', transformationState)
        .attr('r', (d) => d.radius / k)
      // @ts-expect-error TODO: type later
      originLine.attr('transform', transformationState)
      text
        // @ts-expect-error TODO: type later
        .attr('transform', transformationState)
        .attr('textLength', (d) => Math.max((d.radius * 2) / k - 20, 20))
      simulation.alpha(0.3).restart()
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.radius((d) => d.radius / k)
    }
    render()

    // @ts-expect-error TODO: type later
    svg.call(d3.zoom().scaleExtent([0.5, 5]).on('zoom', zoomed))

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
        .attr(
          'cx',
          (d.x = scaleFrom(
            event.x,
            d.dragStartX ?? d.originX,
            transformationState.k,
          )),
        )
        .attr(
          'cy',
          (d.y = scaleFrom(
            event.y,
            d.dragStartY ?? d.originY,
            transformationState.k,
          )),
        )
    }

    function groupToDiscourseme(itemAId: string, itemBId: string) {
      const bubbleA = bubbleData.find((d) => d.id === itemAId)
      const bubbleB = bubbleData.find((d) => d.id === itemBId)
      if (!bubbleA || !bubbleB) {
        console.warn('could not find bubbles', itemAId, itemBId)
        return
      }
      let discoursemeId: string | undefined =
        bubbleA.discoursemes?.[0] ?? bubbleB.discoursemes?.[0]
      let discoursemeDatum = discoursemeData.find((d) => d.id === discoursemeId)
      if (!discoursemeId || !discoursemeDatum) {
        discoursemeId = faker.string.uuid()
        discoursemeDatum = {
          id: discoursemeId,
          x: (bubbleA.originX + bubbleB.originX) / 2,
          y: (bubbleA.originY + bubbleB.originY) / 2,
          originX: (bubbleA.originX + bubbleB.originX) / 2,
          originY: (bubbleA.originY + bubbleB.originY) / 2,
          bubbles: [],
        }
        discoursemeData.push(discoursemeDatum)
      } // eslint-disable-next-line no-extra-semi
      ;[bubbleA, bubbleB].forEach((bubble) => {
        if (bubble.discoursemes?.includes(discoursemeId!)) return
        bubble.discoursemes = [...(bubble.discoursemes ?? []), discoursemeId!]
        discoursemeLinks.push({
          source: discoursemeDatum!.id,
          sourceX: discoursemeDatum!.originX,
          sourceY: discoursemeDatum!.originY,
          target: bubble.id,
          targetX: bubble.x,
          targetY: bubble.y,
          targetBubble: bubble,
        })
        if (discoursemeDatum!.bubbles.includes(bubble)) {
          discoursemeDatum!.bubbles.push(bubble)
        }
      })

      simulation.nodes([...bubbleData, ...discoursemeData])

      render()
    }

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

      const dragId = event.subject.id
      const dropId = hoveredBubbleId !== dragId ? hoveredBubbleId : null
      if (dropId) {
        groupToDiscourseme(dragId, dropId)
      }
    }

    // This value feels like a hack
    let homeStrength = 1
    function originForce(alpha: number) {
      const nodes = simulation.nodes()
      for (let i = 0, n = nodes.length; i < n; ++i) {
        const node = nodes[i]
        // @ts-expect-error TODO: type later
        if (node.discoursemes?.length) continue
        const k = alpha * 0.1 * homeStrength
        // @ts-expect-error TODO: type later
        node.vx -= (node.x - node.originX) * k * 2
        // @ts-expect-error TODO: type later
        node.vy -= (node.y - node.originY) * k * 2
      }
    }

    return () => {
      bubble.remove()
      originLine.remove()
      text.remove()
      discoursemeAnchor.remove()
      discoursemeLink.remove()
    }
  }, [words, navigate])

  return (
    <svg ref={svgRef} className="h-[calc(100svh-3.5rem)] w-full">
      <g>
        <rect fill="transparent" width="100%" height="100%" />
      </g>
    </svg>
  )
}

function scaleFrom(position: number, origin: number, scale: number) {
  return (position - origin) / scale + origin
}
