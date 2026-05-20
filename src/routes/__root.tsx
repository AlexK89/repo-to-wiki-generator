import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { QueryClient } from '@tanstack/react-query'

import { StatusScreen } from '@/components/status-screen'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: () => (
    <StatusScreen
      variant="not-found"
      title="Page not found"
      description="The URL you followed does not exist. Generate a wiki from the home page to get started."
    />
  ),
  errorComponent: ({ error }) => (
    <StatusScreen
      variant="error"
      title="Something went wrong"
      description="An unexpected error occurred while rendering this page."
      detail={error instanceof Error ? error.message : String(error)}
    />
  ),
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-left" />
    </>
  )
}
