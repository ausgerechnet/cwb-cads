import { ComponentProps } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export function SelectSingle({
  items,
  placeholder,
  className,
  ...props
}: ComponentProps<typeof Select> & {
  items: string[]
  placeholder?: string
  className?: string
}) {
  return (
    <Select {...props}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
