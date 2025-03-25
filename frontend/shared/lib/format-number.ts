const format = new Intl.NumberFormat('en-US').format

const thinSpace = '\u2009'

export const formatNumber = (value: number, shorten = false) => {
  if (shorten) {
    if (value >= 1e9) {
      return `${format(value / 1e9)}${thinSpace}B`
    }
    if (value >= 1e6) {
      return `${format(value / 1e6)}${thinSpace}M`
    }
    if (value >= 1e3) {
      return `${format(value / 1e3)}${thinSpace}k`
    }
  }
  return format(value)
}
