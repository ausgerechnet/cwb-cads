import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@cads/shared/lib/utils'

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
  const [value, setValue] = useState('')
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  const [container, setContainer] = useState<HTMLLabelElement | null>(null)

  const inputId = useId()

  function moveFocus(offset: -1 | 1) {
    if (!container || !input) return
    const buttons = Array.from(
      container.querySelectorAll('button') ?? [],
    ) as HTMLButtonElement[]
    if (document.activeElement === input && input.selectionStart === 0) {
      if (offset < 0 && buttons.length > 0) {
        buttons[buttons.length - 1].focus?.()
      }
      return
    }
    const indexOfActive = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    )
    if (indexOfActive === -1) return
    if (indexOfActive === buttons.length - 1 && offset > 0) {
      input?.focus()
      return
    }
    buttons[
      Math.max(0, Math.min(buttons.length - 1, indexOfActive + offset))
    ].focus?.()
  }

  function handleCursorKeys(event: React.KeyboardEvent<HTMLLabelElement>) {
    if (event.key === 'ArrowLeft') {
      moveFocus(-1)
    }
    if (event.key === 'ArrowRight') {
      moveFocus(1)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (value.trim() === '') return
      const newItems = items.includes(value.trim())
        ? items
        : [...items, value.trim()]
      setItems(newItems)
      onChange?.(newItems)
      setValue('')
    }
    if (event.key === 'Backspace' && value === '') {
      moveFocus(-1)
    }
  }

  function removeItem(button: HTMLButtonElement, item: string) {
    if (button === document.activeElement) {
      moveFocus(1)
    }
    const newItems = items.filter((i) => i !== item)
    setItems(newItems)
    onChange?.(newItems)
  }

  return (
    <label
      htmlFor={inputId}
      ref={setContainer}
      className={cn(
        'border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-within:ring-ring focus-visible:ring-ring peer flex min-h-10 w-full flex-wrap gap-x-2 rounded-md border px-3 py-1 text-sm focus-within:ring-2 focus-within:ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 has-[button:focus-visible]:ring-0',
        className,
      )}
      onKeyDown={handleCursorKeys}
    >
      {items.map((item) => (
        <button
          type="button"
          key={item}
          tabIndex={-1}
          className="bg-muted hover:bg-destructive hover:text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground focus-visible:ring-destructive focus-visible:ring-offset-background my-1 flex items-center self-center rounded-xl py-1 pl-1 pr-2 text-sm leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          onClick={(event) =>
            removeItem(event.currentTarget as HTMLButtonElement, item)
          }
        >
          <X className="h-3 w-3" />
          {item}
        </button>
      ))}
      <input
        ref={setInput}
        type="text"
        className="my-1 min-w-20 flex-grow bg-transparent focus-visible:outline-none"
        onKeyDown={handleKeyDown}
        value={value}
        id={inputId}
        onChange={(e) => setValue(e.target.value)}
      />
    </label>
  )
}
