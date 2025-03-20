/**
 * Create a map of level to keys from a list of s-annotation strings (e.g. '<level>_<key>' 'corpus_name', 'text_id', 'text_who).
 */
export function createLevelKeyMap(
  sAnnotations: string[],
): Record<string, string[]> {
  const levelKeyPairs = sAnnotations.map((annotation) => {
    const [level, key] = annotation.split('_')
    return { level, key }
  })
  return levelKeyPairs.reduce(
    (acc, { level, key }) => {
      if (acc[level] === undefined) {
        acc[level] = []
      }
      if (!acc[level].includes(key) && key !== undefined) {
        acc[level].push(key)
      }
      return acc
    },
    {} as Record<string, string[]>,
  )
}
