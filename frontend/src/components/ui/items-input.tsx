import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useState } from 'react'

export function ItemsInput({
  className,
  defaultValue = [],
  onChange,
}: {
  className?: string
  defaultValue?: string[]
  onChange?: (value: string[]) => void
}) {
  const [items, setItems] = useState(defaultValue)
  const [value, setValue] = useState(items.join(', '))

  function assignInputValues() {
    const newValues = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      // Filter out duplicates
      .filter((item, index, self) => self.indexOf(item) === index)
    setItems(newValues)
    setValue(newValues.join(', '))
    onChange?.(newValues)
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  function removeItem(item: string) {
    const newItems = items.filter((i) => i !== item)
    setItems(newItems)
    setValue(newItems.join(', '))
    onChange?.(newItems)
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        className="peer [&:not(:focus)]:text-transparent "
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={assignInputValues}
      />
      <div className="absolute bottom-0 left-1 top-0 flex flex-wrap items-center gap-1 peer-focus:pointer-events-none peer-focus:opacity-0">
        {items.map((item) => (
          <button
            key={item}
            className="flex items-center rounded-xl bg-muted py-1 pl-1 pr-2 text-sm leading-none hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground focus:outline-none"
            onClick={() => removeItem(item)}
          >
            <X className="h-3 w-3" />
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}
