import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vignette')({
  component: Vignette,
})

function Vignette() {
  return (
    <div className="max-w-3xl space-y-6 p-8">
      <h1 className="text-4xl font-bold">Vignette</h1>

      <div className="space-y-3 rounded-lg border p-6">
        <p className="text-lg font-medium">
          A guided introduction to MMDA is currently under development.
        </p>

        <p>
          In the meantime, please consult the manual on{' '}
          <a
            href="https://github.com/ausgerechnet/cwb-cads/tree/main/manual"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </div>
  )
}
