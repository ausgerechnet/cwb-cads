import { useMemo } from 'react'
import { Shuffle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { corpusQueryOptions } from '@/lib/queries'
import { cn } from '@/lib/utils'

const emptyArray = [] as const

export function ConstellationFilter({
  corpusId,
  className,
}: {
  corpusId: number
  className?: string
}) {
  const { data: corpus } = useQuery(corpusQueryOptions(corpusId))
  const navigate = useNavigate()

  const searchParams = useSearch({
    from: '/_app/constellations/$constellationId',
  })
  const contextBreakList = corpus?.s_atts ?? emptyArray
  const pAttributes = corpus?.p_atts ?? emptyArray
  const primary = searchParams.primary ?? pAttributes[0]

  // Remember a few values between renders: this helps rendering a proper skeleton
  // thus avoiding flicker
  // TODO: maybe just remember the last concordanceLines and overlay a spinner?
  const secondary = searchParams.secondary ?? pAttributes[0]
  const contextBreak = searchParams.contextBreak ?? contextBreakList[0]
  const {
    windowSize = 3,
    clSortByOffset = 0,
    clSortOrder = 'random',
    filterItemPAtt,
  } = searchParams

  // TODO: Make it type safe
  const setSearch = useMemo(() => {
    const timeoutMap: Record<string, ReturnType<typeof setTimeout>> = {}
    return (paramName: string, value: string | number) => {
      clearTimeout(timeoutMap[paramName])
      timeoutMap[paramName] = setTimeout(() => {
        navigate({
          params: (p) => p,
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
            navigate({
              params: (p) => p,
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
        disabled
        title="endpoint is currently not implemented"
      >
        <Shuffle className="mr-2 h-4 w-4" />
        TODO: Shuffle
      </Button>
    </div>
  )
}
