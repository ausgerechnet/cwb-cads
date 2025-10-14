import { useDescription } from '../-use-description'

export function useCollocationAnalysisDescription() {
  return useDescription({ mayDefaultToFirstAnnotation: false })
}
