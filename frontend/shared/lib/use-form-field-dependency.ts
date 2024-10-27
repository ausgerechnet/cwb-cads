import { useEffect } from 'react'
import { FieldValues, UseFormReturn } from 'react-hook-form'

export function useFormFieldDependency<T extends FieldValues = FieldValues>(
  form: UseFormReturn<T>,
  fieldName: T[keyof T],
  legalValues: T[keyof T][] | undefined,
) {
  const value = form.watch(fieldName)
  useEffect(() => {
    if (
      (legalValues === undefined && value !== undefined) ||
      (legalValues !== undefined && !legalValues.includes(value))
    ) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      form.setValue(fieldName, undefined)
    }
  }, [value, legalValues, fieldName, form])
  return value
}
