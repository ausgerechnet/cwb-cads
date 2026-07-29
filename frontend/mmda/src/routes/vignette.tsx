import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vignette')({
  component: Vignette,
})

function Vignette() {
  return (
<div className="p-8 space-y-6 max-w-3xl">

  <h1 className="text-4xl font-bold">
    Vignette
  </h1>

  <div className="rounded-lg border p-6 space-y-3">
    <p className="text-lg font-medium">
      A guided introduction to MMDA is currently under development.
    </p>

    <p>
      In the meantime, please consult the manual on{" "}
      <a
        href="https://github.com/ausgerechnet/cwb-cads/tree/main/manual"
        target="_blank"
        rel="noreferrer"
        className="underline font-medium"
      >
GitHub
      </a>.

    </p>
  </div>

</div>
  )
}