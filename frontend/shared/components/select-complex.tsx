import { ReactNode, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

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
  searchValue: string
  renderValue?: ReactNode
}

export function ComplexSelect<IdType extends string | number>({
  items,
  itemId,
  onChange,
  disabled,
  selectMessage = 'Select an item',
  placeholder = 'Search…',
  emptyMessage = 'No items found.',
  allowCustomValue = false,
  className,
}: {
  items: Item<IdType>[]
  placeholder?: string
  selectMessage?: string
  emptyMessage?: string
  itemId?: IdType
  onChange?: (itemId: IdType | undefined, isCustomValue: boolean) => void
  disabled?: boolean
  allowCustomValue?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [userInput, setCustomInput] = useState('')

  const hasExactMatch = items.some(
    ({ searchValue }) => searchValue.toLowerCase() === userInput.toLowerCase(),
  )

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('flex justify-between', className)}
          value={itemId?.toString()}
          disabled={disabled}
        >
          {items.find(({ id }) => id === itemId)?.name ?? selectMessage}

          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 max-w-96 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            onValueChange={setCustomInput}
          />

          <CommandEmpty>{emptyMessage}</CommandEmpty>

          <CommandGroup>
            <ScrollArea className="h-80 max-h-[30svh]">
              {!hasExactMatch && allowCustomValue && userInput ? (
                <CommandItem
                  value={userInput}
                  onSelect={() => {
                    onChange?.(userInput as IdType, true)
                    setOpen(false)
                    setCustomInput('')
                  }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  <span className="text-muted-foreground mr-0.5">
                    Custom input:{' '}
                  </span>
                  {userInput}
                </CommandItem>
              ) : null}

              {items
                .filter(
                  ({ searchValue }) =>
                    searchValue
                      .toLowerCase()
                      .search(userInput.toLowerCase()) !== -1,
                )
                .map(({ searchValue, id, renderValue, name }) => (
                  <CommandItem
                    key={id ?? 'empty'}
                    value={searchValue}
                    onSelect={() => {
                      onChange?.(id, false)
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
                ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
