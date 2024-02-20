import { Fragment } from 'react'
import { z } from 'zod'
import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
// TODO: Remove this when real data is available
import { faker } from '@faker-js/faker'

import { schemas } from '@/rest-client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { SortButtonView } from '@/components/data-table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ButtonTooltip } from '@/components/button-tooltip'

type Token = {
  word: string
  lemma: string
  cpos: number
  isKeyword: boolean
  isOutOfWindow: boolean
  discoursemes: z.infer<typeof schemas.DiscoursemeOut>[]
}

type ConcordanceLine = {
  id: number
  isExpanded: boolean
  meta: {
    key: string
    value: Date | string | boolean | number
  }[]
  tokens: Token[]
}

let cpos = faker.number.int()
function createToken(override: Partial<Token> = {}): Token {
  return {
    word: faker.lorem.word(),
    lemma: faker.lorem.word(),
    cpos: cpos++,
    isKeyword: true,
    isOutOfWindow: false,
    discoursemes: [],
    ...override,
  }
}

function createConcordanceLines(count: number): ConcordanceLine[] {
  faker.seed(123)
  return faker.helpers.multiple(
    (): ConcordanceLine => ({
      id: faker.number.int({ max: 5000 }),
      meta: [
        { key: 'corpus', value: faker.location.country() },
        { key: 'date', value: faker.date.recent() },
      ],
      isExpanded: faker.datatype.boolean(),
      tokens: [
        ...faker.helpers.multiple(
          () => createToken({ isKeyword: false, isOutOfWindow: true }),
          {
            count: { min: 0, max: 20 },
          },
        ),
        ...faker.helpers.multiple(
          () => createToken({ isKeyword: false, isOutOfWindow: false }),
          {
            count: { min: 0, max: 10 },
          },
        ),
        createToken({ isKeyword: true, isOutOfWindow: false }),
        ...faker.helpers.multiple(
          () => createToken({ isKeyword: false, isOutOfWindow: false }),
          {
            count: { min: 0, max: 10 },
          },
        ),
        ...faker.helpers.multiple(
          () => createToken({ isKeyword: false, isOutOfWindow: true }),
          {
            count: { min: 0, max: 10 },
          },
        ),
      ],
    }),
    { count },
  )
}
const defaultLines = createConcordanceLines(10)

export function ConcordanceLines({
  concordanceLines = defaultLines,
  className,
}: {
  concordanceLines?: ConcordanceLine[]
  className?: string
}) {
  return (
    <div className={cn('max-w-full rounded-md border', className)}>
      <Table className="grid w-full grid-cols-[min-content_1fr_max-content_1fr_min-content] overflow-hidden">
        <TableHeader className="col-span-full grid grid-cols-subgrid">
          <TableRow className="col-span-full grid grid-cols-subgrid">
            <TableHead className="flex items-center">
              <SortButtonView>ID</SortButtonView>
            </TableHead>
            <TableHead className="flex items-center justify-end">
              <SortButtonView>Context</SortButtonView>
            </TableHead>
            <TableHead className="flex items-center">
              <SortButtonView>Keyword</SortButtonView>
            </TableHead>
            <TableHead className="flex items-center">
              <SortButtonView>Context</SortButtonView>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody className="col-span-full grid grid-cols-subgrid">
          {concordanceLines.map((line) => (
            <ConcordanceLineRender key={line.id} concordanceLine={line} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MetaValue({ value }: { value: Date | string | boolean | number }) {
  if (typeof value === 'string') {
    return <>{value}</>
  }
  if (typeof value === 'number') {
    return <>{value}</>
  }
  if (typeof value === 'boolean') {
    return <>{value ? 'true' : 'false'}</>
  }
  return <>{value.toISOString()}</>
}

function ConcordanceLineRender({
  concordanceLine,
}: {
  concordanceLine: ConcordanceLine
}) {
  const { id, tokens, isExpanded, meta } = concordanceLine
  const keywordIndex = tokens.findIndex((token) => token.isKeyword)
  const preTokens = tokens.slice(0, keywordIndex)
  const postTokens = tokens.slice(keywordIndex + 1)
  return (
    <TableRow key={id} className="col-span-full grid grid-cols-subgrid">
      <TableCell className="w-max">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger>{id}</TooltipTrigger>
            <TooltipContent side="top" sideOffset={10}>
              <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1">
                {meta.map(({ key, value }) => (
                  <Fragment key={key}>
                    <dt className="even:bg-muted">{key}</dt>
                    <dd className="font-mono">
                      <MetaValue value={value} />
                    </dd>
                  </Fragment>
                ))}
              </dl>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="w-auto overflow-hidden overflow-ellipsis whitespace-nowrap pr-1 text-right [direction:rtl]">
        {preTokens.map((token, i) => (
          <TokenRender key={i} token={token} />
        ))}
      </TableCell>
      <TableCell className="mx-auto flex w-max items-center whitespace-nowrap px-1 text-center">
        <TokenRender token={tokens[keywordIndex]} />
      </TableCell>
      <TableCell className="w-auto items-center gap-1 overflow-hidden overflow-ellipsis whitespace-nowrap px-0 pl-1 text-left">
        {postTokens.map((token, i) => (
          <TokenRender key={i} token={token} />
        ))}
      </TableCell>
      <TableCell className="flex w-max items-center py-0">
        <ButtonTooltip
          tooltip={isExpanded ? 'Collapse' : 'Expand'}
          size="sm"
          variant="ghost"
          className="-mx-3"
        >
          {isExpanded ? (
            <ChevronsDownUp className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4" />
          )}
        </ButtonTooltip>
      </TableCell>
    </TableRow>
  )
}

function TokenRender({ token }: { token: Token }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'cursor-pointer rounded-md hover:bg-muted hover:ring-2 hover:ring-muted',
              token.isOutOfWindow && 'text-muted-foreground/70',
              token.isKeyword && 'font-bold',
            )}
          >
            {token.word}{' '}
          </span>
        </TooltipTrigger>
        <TooltipContent>Lemma: {token.lemma}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
