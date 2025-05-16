import { createFileRoute } from '@tanstack/react-router'

import { Graph, GraphRange } from '@cads/shared/components/graph'
import { Block, BlockComment } from './-block'

export const Route = createFileRoute('/components_/graph')({
  component: GraphComponents,
})

function rnd(seed: number) {
  const x = Math.sin(seed) * 1_000_000
  return x - Math.floor(x)
}

const sineGraph = [
  Array.from({ length: 800 }).map((_, i): [number, number] => [
    i / 100,
    Math.sin(i / 10),
  ]),
]

const sinePoints = Array.from({ length: 800 })
  .map(
    (_, i) =>
      ({
        position: [
          i / 100,
          Math.sin(i / 10) + (rnd(i ** 2) - 0.8) * 0.3,
        ] satisfies [number, number],
      }) as const,
  )
  .filter((_, i) => rnd(i) > 0.7)

function GraphComponents() {
  return (
    <>
      <Block componentName="Graph" componentTag="Graph">
        <BlockComment>
          Bar graph with a single value, lower y boundary is set to `0`
        </BlockComment>
        <Graph
          className="my-3"
          pointStyle="bar"
          dataPoints={[
            { position: [0, 2] },
            { position: [1, 4] },
            { position: [2, 3] },
            { position: [3, 2] },
            { position: [4, 1] },
            { position: [5, 2] },
            { position: [6, 2] },
          ]}
          viewportY={[0]}
          value={2}
        />

        <BlockComment>
          The same data, but with circular points instead of bars
        </BlockComment>
        <Graph
          className="my-3"
          pointStyle="circle"
          dataPoints={[
            { position: [0, 2] },
            { position: [1, 4] },
            { position: [2, 3] },
            { position: [3, 2] },
            { position: [4, 1] },
            { position: [5, 2] },
            { position: [6, 2] },
          ]}
          viewportY={[0]}
          value={2}
        />

        <BlockComment>
          Bar graph with a value range, lower y boundary is set to `0`
        </BlockComment>
        <Graph
          className="my-3"
          pointStyle="bar"
          dataPoints={[
            { position: [0, 2] },
            { position: [1, 4] },
            { position: [2, 3] },
            { position: [3, 2] },
            { position: [4, 1] },
            { position: [5, 2] },
            { position: [6, 2] },
          ]}
          viewportY={[0]}
          value={[2, 4]}
        />

        <BlockComment>
          Collection of all possible visuals: data points, lines and bands
        </BlockComment>

        <Graph
          dataPoints={[
            { position: [0, 0] },
            { position: [1, 4] },
            { position: [2, 0] },
            { position: [3, 1] },
          ]}
          lines={[
            [
              [0, 0],
              [1, 4],
            ],
            [
              [1.5, 0.5],
              [2, 0],
              [3, 1],
            ],
            [
              [4, 3],
              [5, 2],
              [6, 3],
              [7, 3],
              [8, 3],
              [9, 4],
              [10, 3],
            ],
            [
              [-1, -15],
              [10, -15],
            ],
          ]}
          bands={[
            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5,
                  ],
                ],
              ),
            },
          ]}
        />

        <BlockComment>
          Collection of all possible visuals: data points, lines and bands
          <br />
          Values range
        </BlockComment>

        <Graph
          dataPoints={[
            { position: [0, 0] },
            { position: [1, 4] },
            { position: [2, 0] },
            { position: [3, 1] },
          ]}
          lines={[
            [
              [0, 0],
              [1, 4],
            ],
            [
              [1.5, 0.5],
              [2, 0],
              [3, 1],
            ],
            [
              [4, 3],
              [5, 2],
              [6, 3],
              [7, 3],
              [8, 3],
              [9, 4],
              [10, 3],
            ],
            [
              [-1, -15],
              [10, -15],
            ],
          ]}
          bands={[
            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5,
                  ],
                ],
              ),
            },
          ]}
          value={[2, 4]}
        />

        <BlockComment>
          Collection of all possible visuals: data points, lines and bands
          <br />
          The viewport is fixed
        </BlockComment>

        <Graph
          className="overflow-hidden"
          dataPoints={[{ position: [0, 0] }, { position: [1, 4] }]}
          lines={[
            [
              [0, 0],
              [1, 1],
            ],
            [
              [0, 0],
              [1, 4],
            ],
            [
              [1.5, 0.5],
              [2, 0],
              [3, 1],
            ],
            [
              [4, 3],
              [5, 2],
              [6, 3],
              [7, 3],
              [8, 3],
              [9, 4],
              [10, 3],
            ],
            [
              [-1, -15],
              [10, -15],
            ],
          ]}
          bands={[
            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5,
                  ],
                ],
              ),
              className: 'fill-red-500/20',
            },

            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10 + 3,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5 - 3,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5 - 3,
                  ],
                ],
              ),
              className: 'fill-yellow-800',
            },
          ]}
          viewportX={[0, 1]}
          viewportY={[0, 1]}
        />

        <BlockComment>
          A collection of many data points and lines resembling a sine wave
        </BlockComment>

        <Graph className="my-5" dataPoints={sinePoints} lines={sineGraph} />
      </Block>

      <Block componentName="GraphRange" componentTag="GraphRange">
        <GraphRange
          className="my-5"
          pointStyle="bar"
          dataPoints={Array.from({ length: 500 })
            .map((_, i) => ({
              position: [
                i / 10,
                1.5 + Math.sin(i / 10) + (rnd(i ** 2) - 0.8) * 0.3,
              ] satisfies [number, number],
              type: 'bar',
            }))
            .filter((_, i) => rnd(i) > 0.2)}
          viewportY={[0]}
        />

        <GraphRange
          className="my-5"
          pointStyle="bar"
          dataPoints={Array.from({ length: 500 })
            .map((_, i) => ({
              position: [
                i / 10,
                1.5 + Math.sin(i / 10) + (rnd(i ** 2) - 0.8) * 0.3,
              ] satisfies [number, number],
              type: 'bar',
            }))
            .filter((_, i) => rnd(i) > 0.2)}
          viewportY={[0]}
          value={[0, 2]}
        />

        <GraphRange
          className="my-5"
          dataPoints={[{ position: [0, 0] }, { position: [1, 4] }]}
          lines={[
            [
              [0, 0],
              [1, 1],
            ],
            [
              [0, 0],
              [1, 4],
            ],
            [
              [1.5, 0.5],
              [2, 0],
              [3, 1],
            ],
            [
              [4, 3],
              [5, 2],
              [6, 3],
              [7, 3],
              [8, 3],
              [9, 4],
              [10, 3],
            ],
            [
              [0, -15],
              [10, -15],
            ],
          ]}
          bands={[
            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5,
                  ],
                ],
              ),
              className: 'fill-red-500/20',
            },

            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10 + 3,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5 - 3,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5 - 3,
                  ],
                ],
              ),
              className: 'fill-yellow-800',
            },
          ]}
        />

        <GraphRange
          className="my-5"
          dataPoints={sinePoints}
          lines={sineGraph}
        />

        <GraphRange
          bands={[
            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5,
                  ],
                ],
              ),
              className: 'fill-red-500/20',
            },

            {
              points: Array.from({ length: 100 }).map(
                (_, i): [number, [number, number]] => [
                  i / 10 + 3,
                  [
                    Math.sin(i / 10) * 1 + 0.2 + rnd(i) * 3.5 - 3,
                    Math.sin(i / 10) * 1 - 3 + rnd(i) * 3.5 - 3,
                  ],
                ],
              ),
              className: 'fill-yellow-800',
            },
          ]}
        />
      </Block>
    </>
  )
}
