/**
 * Returns true if the two arrays contain the same items, regardless of order.
 */
export function arraysContainEqualItems<T>(arrA: T[], arrB: T[]) {
  if (arrA.length !== arrB.length) return false
  for (let i = 0; i < arrA.length; i++) {
    if (!arrB.includes(arrA[i])) return false
  }
  return true
}
