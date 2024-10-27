import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Loader2Icon, ShuffleIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import { corpusById, shuffleQueryConcordances } from '@/queries/queries'
import { Slider } from '@cads/shared/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cads/shared/components/ui/select'
import { Button } from '@cads/shared/components/ui/button'

const emptyArray = [] as const

// TODO: Unify this with -constellation-filter.tsx
export function QueryFilter({
  corpusId,
  queryId,
  className,
}: {
  corpusId: number
  queryId: number
  className?: string
}) {
  const navigate = useNavigate()

  const searchParams = useSearch({
    from: '/_app/queries/$queryId',
  })
  const {
    windowSize = 3,
    clSortByOffset = 0,
    clSortOrder = 'random',
    filterItemPAtt,
  } = searchParams

  // This is only rendered if corpusId actually exists
  const { data: corpus } = useQuery(corpusById(corpusId))
  const contextBreakList = corpus?.s_atts ?? emptyArray
  const pAttributes = corpus?.p_atts ?? emptyArray
  const primary =
    searchParams.primary ??
    pAttributes.find((a) => a === 'word') ??
    pAttributes[0]

  const { mutate: shuffle, isPending: isShuffling } = useMutation(
    shuffleQueryConcordances,
  )

  // Remember a few values between renders: this helps rendering a proper skeleton
  // thus avoiding flicker
  // TODO: maybe just remember the last concordanceLines and overlay a spinner?
  const secondary = searchParams.secondary ?? pAttributes[0]
  const contextBreak = searchParams.contextBreak ?? contextBreakList[0]

  const setSearch = useMemo(() => {
    const timeoutMap: Record<string, ReturnType<typeof setTimeout>> = {}
    return (paramName: string, value: string | number) => {
      clearTimeout(timeoutMap[paramName])
      timeoutMap[paramName] = setTimeout(() => {
        void navigate({
          // TODO: Use properly typed params
          // eslint-disable-next-line
          // @ts-ignore
          params: (p) => p,
          // eslint-disable-next-line
          // @ts-ignore
          search: (s) => ({ ...s, [paramName]: value }),
          replace: true,
        })
      }, 200)
    }
  }, [navigate])

  return (
    <div className={cn('mb-8 grid grid-cols-8 gap-2', className)}>
      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Window Size {windowSize}</span>
        <Slider
          defaultValue={[windowSize]}
          onValueChange={([newValue]) => setSearch('windowSize', newValue)}
          min={0}
          max={24}
          className="my-auto"
        />
      </div>
      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Sort By Offset {clSortByOffset}</span>
        <Slider
          defaultValue={[clSortByOffset]}
          onValueChange={([newValue]) => setSearch('clSortByOffset', newValue)}
          min={-5}
          max={5}
          className="my-auto"
        />
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Sort Order</span>
        <Select
          value={clSortOrder}
          onValueChange={(value) => setSearch('clSortOrder', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {['ascending', 'descending', 'random'].map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Filter Item PAtt</span>
        <Select
          value={filterItemPAtt}
          onValueChange={(value) => setSearch('filterItemPAtt', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter Item PAttr" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {pAttributes.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Context Break</span>
        <Select
          value={contextBreak}
          onValueChange={(value) => setSearch('contextBreak', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Context Break" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {contextBreakList.map((contextBreak) => (
                <SelectItem key={contextBreak} value={contextBreak}>
                  {contextBreak}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Primary</span>
        <Select
          value={primary}
          onValueChange={(value) => {
            void navigate({
              // TODO: Use properly typed params
              // eslint-disable-next-line
              // @ts-ignore
              params: (p) => p,
              // eslint-disable-next-line
              // @ts-ignore
              search: (s) => ({ ...s, primary: value }),
              replace: true,
            })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Primary" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {pAttributes.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-grow flex-col gap-2 whitespace-nowrap">
        <span>Secondary</span>
        <Select
          value={secondary}
          onValueChange={(value) => setSearch('secondary', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Secondary" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {pAttributes.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Button
        className="mt-auto"
        onClick={() => {
          shuffle(queryId)
        }}
        disabled={isShuffling}
      >
        {isShuffling ? (
          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShuffleIcon className="mr-2 h-4 w-4" />
        )}
        Shuffle
      </Button>
    </div>
  )
}
