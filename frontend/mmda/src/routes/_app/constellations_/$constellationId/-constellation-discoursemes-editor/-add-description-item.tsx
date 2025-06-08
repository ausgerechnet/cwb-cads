import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'

import { addDescriptionItem } from '@cads/shared/queries'
import { ErrorMessage } from '@cads/shared/components/error-message'
import { ComplexSelect } from '@cads/shared/components/select-complex'

import { useDescription } from '../-use-description'
import { useFilterSelection } from '../-use-filter-selection'
import { useCollocation } from '../-use-collocation-doof'

export function AddDescriptionItem({
  discoursemeDescriptionId,
  discoursemeId,
}: {
  discoursemeDescriptionId: number
  discoursemeId: number
}) {
  const {
    mutate: addItem,
    isPending: isAddingItem,
    error: errorAddItem,
  } = useMutation(addDescriptionItem)
  const { secondary } = useFilterSelection(
    '/_app/constellations_/$constellationId',
  )
  const { description } = useDescription()
  const { mapItems: collocationItemsMap } = useCollocation(description?.id)

  const mapItems = useMemo(
    () =>
      (collocationItemsMap?.map ?? [])
        .filter(({ source }) => source === 'items')
        .map(({ item }) => ({
          id: item,
          name: item,
          searchValue: item,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [collocationItemsMap],
  )

  return (
    <>
      <ErrorMessage error={errorAddItem} />

      <ComplexSelect
        className="m-2"
        selectMessage="Select description item to add"
        disabled={isAddingItem}
        items={mapItems}
        onChange={(itemId) => {
          if (itemId === undefined) return
          const surface = mapItems.find(({ id }) => id === itemId)?.name
          if (surface === undefined || secondary === undefined) {
            console.warn('Could not add item, missing values', {
              surface,
              secondary,
            })
            return
          }
          return void addItem({
            discoursemeId,
            descriptionId: discoursemeDescriptionId,
            surface: surface,
            p: secondary,
          })
        }}
      />
    </>
  )
}
