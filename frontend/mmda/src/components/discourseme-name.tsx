import { useQuery } from '@tanstack/react-query'
import { discoursemesList } from '@cads/shared/queries'

/**
 * Display the name of a discourseme by its ID. The name is fetched from the API if necessary.
 */
export function DiscoursemeName({ discoursemeId }: { discoursemeId: number }) {
  const { data } = useQuery(discoursemesList)
  const discoursemeName =
    data?.find((d) => d.id === discoursemeId)?.name ?? 'Unknown'
  return <>{discoursemeName}</>
}
