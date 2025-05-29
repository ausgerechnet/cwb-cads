import { Headline1 } from '@cads/shared/components/ui/typography'
import { Link, Outlet } from '@tanstack/react-router'
import { ComponentProps } from 'react'

export function ComponentOverview() {
  return (
    <div className="mx-auto max-w-[86rem] p-2 pb-16">
      <Headline1 className="mb-4 mt-16">Component Overview</Headline1>

      <div className="flex gap-8">
        <nav>
          <ul className="sticky top-16 flex flex-col gap-2">
            <SubLink to="/components/graph">Graph</SubLink>
            <SubLink to="/components/time-series">TimeSeries</SubLink>
            <SubLink to="/components/meta-frequency">MetaFrequency</SubLink>
            <SubLink to="/components/toggle-bar">ToggleBar</SubLink>
            <SubLink to="/components/table">Table</SubLink>
            <SubLink to="/components/discourseme-breakdown">
              DiscoursemeBreakdown
            </SubLink>
            <SubLink to="/components/discourseme-collocate-table">
              DiscoursemeCollocateTable
            </SubLink>
            <SubLink to="/components/association-matrix">
              AssociationMatrix
            </SubLink>
            <SubLink to="/components/word-cloud">WordCloud</SubLink>
            <SubLink to="/components/word-cloud-alt">WordCloudAlt</SubLink>
            <SubLink to="/components/ellipsis">Ellipsis</SubLink>
            <SubLink to="/components/input">Input</SubLink>
            <SubLink to="/components/error">Error</SubLink>
            <SubLink to="/components/measure">MeasureSelect</SubLink>
            <SubLink to="/components/tooltip">Tooltip</SubLink>
          </ul>
        </nav>

        <div className="flex-grow">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function SubLink({ to, ...props }: ComponentProps<typeof Link>) {
  return (
    <li>
      <Link
        to={to}
        className="text-muted-foreground hover:text-primary data-[status=active]:text-primary block text-sm"
        {...props}
      />
    </li>
  )
}
