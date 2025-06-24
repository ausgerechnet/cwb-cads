import { z } from 'zod'
import { useEffect, useMemo, useState } from 'react'
import { Button } from './ui/button'
import { CheckSquareIcon, Columns3Icon, SquareIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from './ui/command'
import { cn } from '../lib/utils'

export const measures = [
  'O11',
  'E11',
  'ipm',
  'ipm_expected',
  'conservative_log_ratio',
  'log_likelihood',
  'z_score',
  't_score',
  'simple_ll',
  'dice',
  'log_ratio',
  'min_sensitivity',
  'liddell',
  'mutual_information',
  'local_mutual_information',
] as const

export const measureNameMap: Map<(typeof measures)[number], string> = new Map([
  ['O11', 'freq.'],
  ['E11', 'exp. freq.'],
  ['ipm', 'IPM'],
  ['ipm_expected', 'exp. IPM'],
  ['conservative_log_ratio', 'LRC'],
  ['log_likelihood', 'LLR'],
  ['z_score', 'z-score'],
  ['t_score', 't-score'],
  ['simple_ll', 'simple LLR'],
  ['dice', 'Dice'],
  ['log_ratio', 'log-ratio'],
  ['min_sensitivity', 'MS'],
  ['liddell', 'Liddell'],
  ['mutual_information', 'MI'],
  ['local_mutual_information', 'local MI'],
])

let selection: (typeof measures)[number][] = (function () {
  const Measures = z
    .array(z.enum(measures))
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'Array items must be unique',
    })
  const storedMeasures = localStorage.getItem('selected-measures')
  if (storedMeasures) {
    const parsedMeasures = JSON.parse(storedMeasures)
    if (Measures.safeParse(parsedMeasures).success) {
      return parsedMeasures
    }
  }
  return measures.slice(0, 4)
})()

const callbacks = new Set<
  (selectedMeasures: (typeof measures)[number][]) => void
>()

function toggleMeasure(measure: (typeof measures)[number]) {
  selection = selection.includes(measure)
    ? selection.filter((m) => m !== measure)
    : [...selection, measure]
  callbacks.forEach((callback) => callback(selection))
  localStorage.setItem('selected-measures', JSON.stringify(selection))
}

function subscribe(
  callback: (selectedMeasures: (typeof measures)[number][]) => void,
) {
  callbacks.add(callback)
  return () => void callbacks.delete(callback)
}

export function useMeasureSelection(
  mandatoryMeasure?: (typeof measures)[number],
) {
  const [savedSelectedMeasures, setSelectedMeasures] = useState(selection)
  useEffect(() => subscribe(setSelectedMeasures), [])
  const selectedMeasures = useMemo(() => {
    if (!mandatoryMeasure || savedSelectedMeasures.includes(mandatoryMeasure)) {
      return savedSelectedMeasures
    }
    return [...savedSelectedMeasures, mandatoryMeasure]
  }, [savedSelectedMeasures])
  return {
    measures,
    selectedMeasures,
    measureNameMap,
    toggleMeasure,
  }
}

export function MeasureSelect({ className }: { className?: string }) {
  const { selectedMeasures, toggleMeasure, measureNameMap } =
    useMeasureSelection()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn('-ml-[10px] mr-2 h-8 w-8 px-2 py-2', className)}
        >
          <Columns3Icon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Select a measure..." />

          <CommandEmpty>No measures found.</CommandEmpty>

          <CommandGroup>
            {measures.map((measure) => {
              return (
                <CommandItem
                  key={measure}
                  value={`${measure} ${measureNameMap.get(measure)}`}
                  onSelect={() => toggleMeasure(measure)}
                >
                  {selectedMeasures.includes(measure) ? (
                    <CheckSquareIcon className="mr-2 h-4 w-4 rounded-full" />
                  ) : (
                    <SquareIcon className="mr-2 h-4 w-4 rounded-full" />
                  )}

                  {measureNameMap.get(measure)}
                </CommandItem>
              )
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
