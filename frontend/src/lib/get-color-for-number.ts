const colorMap = new Map<number, string>()

export function getColorForNumber(num: number) {
  if (colorMap.has(num)) {
    return colorMap.get(num) as string
  }
  const hue = Math.floor((num * 29.5) % 360) // use golden angle approximation
  const colorString = `hsl(${hue}, 50%, 50%)`
  colorMap.set(num, colorString)
  return colorString
}
