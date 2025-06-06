/**
 * Generates a color in HSL format based on a number.
 * @param num - The number to generate a color for.
 * @param alpha - The alpha value for the color, must be between 0 and 1, default is 1
 * @param s - The saturation value for the color, must be between 0 and 1, default is 0.5
 * @param l - The lightness value for the color, must be between 0 and 1, default is 0.5
 * @returns A string representing the color in HSL format.
 */
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
