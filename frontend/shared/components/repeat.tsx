import { Fragment, ReactNode } from 'react'

export function Repeat({
  count,
  children,
}: {
  count: number
  children: ReactNode
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>{children}</Fragment>
      ))}
    </>
  )
}
