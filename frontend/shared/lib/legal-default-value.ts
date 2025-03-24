// This utility type will be part of TypeScript 5.4
type NoInfer<T> = T & { [K in keyof T]: T[K] }

export function legalDefaultValue<T, V>(
  defaultValue: T,
  legalValues: V[] | undefined,
  fallback: NoInfer<V> | undefined = undefined,
): V | undefined {
  if (!legalValues) {
    return fallback
  }
  // @ts-expect-error this function checks exactly for what TS complains about
  if (!legalValues.includes(fallback)) {
    fallback = legalValues[0]
  }
  // @ts-expect-error this function checks exactly for what TS complains about
  return legalValues.includes(defaultValue) ? defaultValue : fallback
}
