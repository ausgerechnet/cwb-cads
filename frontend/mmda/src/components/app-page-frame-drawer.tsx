import { ComponentProps, type ReactNode } from 'react'
import { cn } from '@cads/shared/lib/utils'
import { AppPageFrame } from './app-page-frame'
import { Drawer } from './drawer'

export function AppPageFrameSemanticMap({
  showsSemanticMap,
  title,
  children,
  drawerContent,
  mapContent,
  isDrawerVisible,
  onDrawerToggle,
  classNameContainer,
  classNameContent,
  ...props
}: ComponentProps<typeof AppPageFrame> & {
  showsSemanticMap: boolean
  title: ReactNode
  children: ReactNode
  drawerContent: ReactNode
  mapContent: ReactNode
  isDrawerVisible: boolean
  onDrawerToggle: (isVisible: boolean) => void
}) {
  return (
    <AppPageFrame
      title={showsSemanticMap ? undefined : title}
      classNameContainer={cn(
        'flex-grow pb-0',
        showsSemanticMap && 'p-0',
        classNameContainer,
      )}
      classNameContent={cn(
        'relative',
        showsSemanticMap && 'p-0',
        classNameContent,
      )}
      {...props}
    >
      {showsSemanticMap ? mapContent : children}
      <Drawer
        className={cn(
          'z-20 -mx-2',
          showsSemanticMap && 'absolute left-0 right-0 mx-0 w-full',
        )}
        isVisible={isDrawerVisible}
        onToggle={onDrawerToggle}
      >
        {drawerContent}
      </Drawer>
    </AppPageFrame>
  )
}
