export function defaultValue<T>(
  legalValues: (T | undefined)[] | undefined,
  ...potentialValues: (T | undefined)[]
): T | undefined {
  if (!legalValues) {
    return undefined
  }
  for (const value of potentialValues) {
    if (legalValues.includes(value)) {
      return value
    }
  }
  return legalValues[0]
}
