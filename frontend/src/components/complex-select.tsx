import { ReactNode, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'

type Item = {
  id: number | undefined
  name: string
  searchValue: string
  renderValue?: ReactNode
}

export function ComplexSelect({
  items,
  itemId,
  onChange,
  selectMessage = 'Select an item',
  placeholder = 'Search…',
  emptyMessage = 'No items found.',
  className,
}: {
  items: Item[]
  placeholder?: string
  selectMessage?: string
  emptyMessage?: string
  itemId?: number
  onChange?: (itemId: number | undefined) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('flex justify-between', className)}
          value={itemId?.toString()}
        >
          {items.find(({ id }) => id === itemId)?.name ?? selectMessage}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-96 p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-80 max-h-[30svh]">
              {items.map(({ searchValue, id, renderValue, name }) => {
                return (
                  <CommandItem
                    key={id}
                    value={searchValue}
                    onSelect={() => {
                      onChange?.(id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        id === itemId ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {renderValue ? renderValue : name}
                  </CommandItem>
                )
              })}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
