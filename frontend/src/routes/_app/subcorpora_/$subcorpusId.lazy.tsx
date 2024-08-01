import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/_app/subcorpora/$subcorpusId')({
  component: Subcorpus,
})

function Subcorpus() {
  return <div>Subcorpus</div>
}
