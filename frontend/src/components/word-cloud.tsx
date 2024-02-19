import * as d3 from 'd3'
import { faker } from '@faker-js/faker'
import { useEffect, useRef } from 'react'

type Word = {
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

function createWord(override: Partial<Word> = {}): Word {
  const position = [
    faker.number.float({ min: 100, max: 800 }),
    faker.number.float({ min: 100, max: 800 }),
  ]
  return {
    id: faker.string.uuid(),
    word: faker.lorem.word(),
    x: position[0],
    y: position[1],
    originX: position[0],
    originY: position[1],
    significance: faker.number.float({ min: 0, max: 1 }),
    radius: 0,
    ...override,
  }
}

function createWordCloud(count = 500): Word[] {
  faker.seed(23)
  return [
    createWord({ discoursemes: ['a'] }),
    createWord({ discoursemes: ['a'] }),
    createWord({ discoursemes: ['a'] }),
    ...faker.helpers.multiple(createWord, { count }),
  ]
}

const defaultWords = createWordCloud(100)

export default function WordCloud({
  words = defaultWords,
}: {
  words?: Word[]
}) {
  const svgRef = useRef(null)

  useEffect(() => {
    const data = words.map((word) => ({
      ...word,
      radius: word.significance * 20 + 10,
    }))

    const drag = d3.drag<SVGCircleElement, Word>()

    const svg = d3.select(svgRef.current)

    const container = svg.select('g').attr('cursor', 'grab')

    const originLine = container
      .selectAll('.origin-line')
      .data(data)
      .join('line')
      .attr('stroke', 'limegreen')
      .attr('stroke-opacity', 0.5)
      .attr('x1', (d) => d.x)
      .attr('y1', (d) => d.y)
      .attr('x2', (d) => d.originX)
      .attr('y2', (d) => d.originY)

    const bubble = container
      .selectAll('.word-bubble')
      .data(data)
      .join('circle')
      .attr('class', 'hover:fill-blue-500 cursor-pointer')
      .attr('fill', 'transparent')
      .attr('stroke-width', 2)
      .attr('stroke', (d) =>
        d.discoursemes?.includes('a') ? 'orange' : 'currentColor',
      )
      .attr('stroke-opacity', (d) => (d.discoursemes?.includes('a') ? 1 : 0.05))
      .attr('transform', `translate(0, 0)`)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('r', (d) => d.radius)
      .call(
        // @ts-expect-error TODO: type later
        drag.on('start', dragStarted).on('drag', dragged).on('end', dragEnded),
      )

    const text = container
      .selectAll('.word-text')
      .data(data)
      .join('text')
      .attr('class', 'pointer-events-none')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('lengthAdjust', 'spacingAndGlyphs')
      .attr('textLength', (d) => d.radius * 2 - 5)
      .text((d) => d.word)

    const simulation = d3
      .forceSimulation<d3.SimulationNodeDatum>(data)
      .force(
        'collide',
        // @ts-expect-error TODO: type later
        d3.forceCollide().radius((d) => d.radius),
      )
      .force('origin', originForce)
      .on('tick', () => {
        bubble
          .data(data)
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
        originLine
          .data(data)
          .attr('x1', (d) => d.x)
          .attr('y1', (d) => d.y)
        text
          .data(data)
          .attr('x', (d) => d.x)
          .attr('y', (d) => d.y)
      })

    let transformationState: d3.ZoomTransform = new d3.ZoomTransform(1, 0, 0)

    // @ts-expect-error TODO: type later
    svg.call(d3.zoom().scaleExtent([0.5, 5]).on('zoom', zoomed))

    function zoomed({ transform }: { transform: d3.ZoomTransform }) {
      const k = transform.k
      transformationState = transform
      // @ts-expect-error TODO: type later
      bubble.attr('transform', transform).attr('r', (d) => d.radius / k)
      // @ts-expect-error TODO: type later
      originLine.attr('transform', transform)
      text
        // @ts-expect-error TODO: type later
        .attr('transform', transform)
        .attr('textLength', (d) => Math.max((d.radius * 2) / k - 5, 20))
      simulation.alpha(0.3).restart()
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.radius((d) => d.radius / k)
    }

    // @ts-expect-error TODO: type later
    function dragStarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      // event.subject.fx = event.subject.x
      // event.subject.fy = event.subject.y
      event.subject.dragStartX = event.subject.x
      event.subject.dragStartY = event.subject.y
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(0)
      homeStrength = 0
    }

    // @ts-expect-error TODO: type later
    function dragged(event, d) {
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

    // @ts-expect-error TODO: type later
    function dragEnded(event) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(1)
      homeStrength = 0.5
    }

    // This value feels like a hack
    let homeStrength = 0.5
    function originForce(alpha: number) {
      const nodes = simulation.nodes()
      for (let i = 0, n = nodes.length; i < n; ++i) {
        const k = alpha * 0.8 * homeStrength
        const node = nodes[i]
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
    }
  }, [words])

  return (
    <svg
      ref={svgRef}
      width={1000}
      height={1000}
      className="h-[calc(100svh-3.5rem)] w-full"
    >
      <g />
    </svg>
  )
}

function scaleFrom(position: number, origin: number, scale: number) {
  return (position - origin) / scale + origin
}
