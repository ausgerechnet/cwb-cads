import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@cads/shared/components/ui/tooltip'
import { TextTooltip } from '@cads/shared/components/text-tooltip'
import { createFileRoute } from '@tanstack/react-router'
import { Block, BlockComment } from './-block'

export const Route = createFileRoute('/components_/tooltip')({
  component: TooltipOverview,
})

function TooltipOverview() {
  return (
    <>
      <Block componentTag="Tooltip">
        <BlockComment>
          With <code>TooltipProvider</code>, <code>Tooltip</code>,{' '}
          <code>TooltipTrigger</code>, and <code>TooltipContent</code> you have
          a flexible way to create tooltips.
        </BlockComment>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="rounded bg-blue-500 p-2 text-white">
                Hover me
              </button>
            </TooltipTrigger>
            <TooltipContent>This is a tooltip content!</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Block>

      <Block componentTag="TextTooltip">
        <BlockComment>
          The <code>TextTooltip</code> component is a simple wrapper around the
          tooltip components that allows you to pass text as a tooltip with less
          boilerplate. Suitable for most use cases.
          <br />
          Pass <code>asChild</code> to use it with any element, or leave it out
          to use it with text nodes.
        </BlockComment>

        <TextTooltip tooltipText="This is a text tooltip!" asChild>
          <button className="rounded bg-blue-500 p-2 text-white">
            Also hover me
          </button>
        </TextTooltip>

        <br />
        <br />

        <TextTooltip tooltipText="This is another text tooltip!">
          Hover me, too!
        </TextTooltip>
      </Block>
    </>
  )
}
