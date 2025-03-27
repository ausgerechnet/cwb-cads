export function parseAnnotations(annotations: string[]) {
  const annotationRecord: Record<string, string[]> = {}
  annotations.forEach((annotation) => {
    const [key, value] = annotation.split('_').map((s) => s.trim())
    if (!annotationRecord[key]) {
      annotationRecord[key] = []
    }
    if (value) {
      annotationRecord[key].push(value)
    }
  })
  return annotationRecord
}
