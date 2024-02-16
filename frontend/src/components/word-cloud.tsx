import * as d3 from 'd3'
import { faker } from '@faker-js/faker'
import { useEffect, useRef } from 'react'

type Word = {
  id: string
  word: string
  x: number
  y: number
  significance: number
  radius: number
  discoursemes?: string[]
}

function createWord(override: Partial<Word> = {}): Word {
  return {
    id: faker.string.uuid(),
    word: faker.lorem.word(),
    x: faker.number.float({ min: 100, max: 800 }),
    y: faker.number.float({ min: 100, max: 800 }),
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
      x: word.x, // + Math.random() * 5000 - 2500,
      y: word.y, // + Math.random() * 5000 - 2500,
      originX: word.x,
      originY: word.y,
      radius: word.significance * 50 + 10,
    }))

    const drag = d3.drag<SVGCircleElement, Word>()

    const originLines = d3
      .select(svgRef.current)
      .selectAll('line')
      .data(data)
      .join((enter) =>
        enter
          .append('line')
          .attr('x1', (d) => d.x)
          .attr('y1', (d) => d.y)
          .attr('x2', (d) => d.originX)
          .attr('y2', (d) => d.originY)
          .attr('stroke', 'yellow')
          .attr('stroke-opacity', 0.1)
          .attr('stroke-width', 2),
      )

    d3.select(svgRef.current)
      .selectAll('g')
      .data(data)
      // @ts-expect-error TODO: type later
      .join((enter) => {
        const group = enter.append('g')
        group
          .append('circle')
          .attr('class', 'hover:fill-blue-500')
          .attr('fill', (d) =>
            d.discoursemes?.includes('a') ? 'orange' : 'currentColor',
          )
          .attr('fill-opacity', 0.5)
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          .attr('r', 0)
          .transition()
          .duration(1_000)
          .attr('r', (d) => d.radius)
      })
      .call(
        // @ts-expect-error TODO: type later
        drag.on('start', dragStarted).on('drag', dragged).on('end', dragEnded),
      )

    const simulation = d3
      .forceSimulation(data)
      .force(
        'collide',
        d3.forceCollide<Word>().radius((d) => d.radius),
      )
      .force('origin', originForce)
      .on('tick', () => {
        d3.select(svgRef.current)
          .selectAll('circle')
          .data(data)
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
        originLines
          .data(data)
          .attr('x1', (d) => d.x)
          .attr('y1', (d) => d.y)
          .attr('x2', (d) => d.originX)
          .attr('y2', (d) => d.originY)
      })

    // @ts-expect-error TODO: type later
    function dragStarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(0)
      homeStrength = 0
    }

    // @ts-expect-error TODO: type later
    function dragged(event) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    // @ts-expect-error TODO: type later
    function dragEnded(event) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
      // @ts-expect-error TODO: type later
      simulation.force('collide')?.strength?.(1)
      homeStrength = 1
    }

    // This value feels like a hack
    let homeStrength = 1
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
  }, [words])

  return <svg ref={svgRef} width={1000} height={1000} />
}
