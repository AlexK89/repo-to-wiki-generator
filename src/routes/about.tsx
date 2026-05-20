import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutComponent,
})

function AboutComponent() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">About</h1>
      <p className="text-muted-foreground">
        File-based routing via @tanstack/router-plugin. Add a file under{' '}
        <code className="bg-muted rounded px-1 py-0.5">src/routes</code> to register a new route.
      </p>
    </div>
  )
}
