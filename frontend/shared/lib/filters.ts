export function filterDuplicates<T>(item: T, index: number, array: T[]) {
  return array.indexOf(item) === index
}

export function filterEmpty<T>(item: T): item is Exclude<T, null | undefined> {
  return item !== undefined && item !== null
}
