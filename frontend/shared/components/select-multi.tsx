import { ReactNode, useState } from 'react'
import { Check, ChevronsUpDown, XIcon } from 'lucide-react'

import { cn } from '@cads/shared/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@cads/shared/components/ui/popover'
import { Button } from '@cads/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@cads/shared/components/ui/command'
import { ScrollArea } from '@cads/shared/components/ui/scroll-area'

type Item<IdType> = {
  id: IdType | undefined
  name: string
  searchValue?: string
  renderValue?: ReactNode
}

export function SelectMulti<IdType extends string | number>({
  items,
  itemIds = [],
  onChange,
  disabled,
  selectMessage = 'Select an item',
  placeholder = 'Search…',
  emptyMessage = 'No items found.',
  className,
}: {
  items: Item<IdType>[]
  placeholder?: string
  selectMessage?: string
  emptyMessage?: string
  itemIds?: IdType[]
  onChange?: (itemId: IdType[]) => void
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)

  function toggleItem(id: IdType) {
    if (itemIds.includes(id)) {
      onChange?.(itemIds.filter((itemId) => itemId !== id))
    } else {
      onChange?.([...itemIds, id])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex justify-between',
            itemIds.length > 0 && 'pl-1',
            className,
          )}
          disabled={disabled}
        >
          <div className="flex gap-1">
            {itemIds.length === 0 ? selectMessage : null}
            {itemIds.map((itemId) => {
              const item = items.find(({ id }) => id === itemId)
              if (!item) return null
              return (
                <span
                  className="outline-muted-foreground hover:bg-destructive hover:text-destructive-foreground inline-flex h-auto gap-1 rounded-full py-1 pl-2 pr-1 text-sm leading-none outline outline-1"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleItem(item.id)
                  }}
                >
                  {item.name}
                  <XIcon className="my-auto h-3 w-3" />
                </span>
              )
            })}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-96 p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-auto max-h-[30svh]">
              {items.map(({ searchValue, id, renderValue, name }) => (
                <CommandItem
                  key={id ?? 'empty'}
                  value={searchValue}
                  onSelect={() => {
                    toggleItem(id)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      itemIds.includes(id) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {renderValue ? renderValue : name}
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
