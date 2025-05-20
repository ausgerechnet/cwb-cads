import { ErrorMessage } from '@cads/shared/components/error-message'
import { createFileRoute } from '@tanstack/react-router'
import { Block } from './-block'

export const Route = createFileRoute('/components_/error')({
  component: ErrorComponents,
})

function ErrorComponents() {
  return (
    <Block componentTag="ErrorMessage">
      <div className="flex flex-col gap-1">
        <ErrorMessage error={null} />

        <ErrorMessage error={undefined} />

        <ErrorMessage error="This is a string error message" />

        <ErrorMessage error={new Error('This is an error message')} />

        <ErrorMessage
          error={[
            new Error('This is an error message within an array 1/2'),
            new Error('This is another error message within an array 2/2'),
            undefined,
            null,
            [
              new Error(
                'This is an error message within an array WITHIN an array',
              ),
              (() => {
                const e = new Error('This is an error message')
                // @ts-expect-error - simulates an error thrown by axios
                e.response = { data: { message: 'Alert!' } }
                return e
              })(),
            ],
          ]}
        />
      </div>
    </Block>
  )
}
