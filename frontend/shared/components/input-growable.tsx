import { type FormEvent, type HTMLProps, useRef, useEffect } from 'react'
import { cn } from '../lib/utils'

export const InputGrowable = function ({
  className,
  classNameLabel,
  ...props
}: HTMLProps<HTMLInputElement> & {
  className?: string
  classNameLabel?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLLabelElement>(null)

  function updateContent() {
    if (!labelRef.current || !inputRef.current) return
    labelRef.current.dataset.input = inputRef.current.value || 'X'
  }

  function handleInput(event: FormEvent<HTMLInputElement>) {
    props?.onInput?.(event)
    updateContent()
  }

  useEffect(() => {
    void updateContent()
    window.addEventListener('resize', updateContent)
    return () => {
      window.removeEventListener('resize', updateContent)
    }
  }, [])

  return (
    <label
      ref={labelRef}
      className={cn(
        'relative inline-block min-w-[1ch] before:pointer-events-none before:whitespace-pre before:opacity-0 before:content-[attr(data-input)]',
        classNameLabel,
      )}
      data-input=""
    >
      <input
        {...props}
        className={cn(
          'absolute bottom-0 left-0 right-0 top-0 w-full bg-transparent',
          className,
        )}
        ref={inputRef}
        onInput={handleInput}
      />
    </label>
  )
}
