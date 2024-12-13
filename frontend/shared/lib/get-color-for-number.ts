export function getColorForNumber(
  num: number,
  alpha = 1,
  s = 0.5,
  l = 0.5,
): string {
  const hue = Math.floor((num * 29.5) % 360)
  return `hsl(${hue} ${Math.floor(s * 100)}% ${Math.floor(
    l * 100,
  )}% / ${Math.floor(alpha * 100)}%)`
}
