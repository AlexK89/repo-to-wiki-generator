import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomeComponent,
})

function HomeComponent() {
  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: ['ping'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 400))
      return { message: 'pong', at: new Date().toISOString() }
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to cubic</h1>
        <p className="text-muted-foreground mt-2">
          React + Vite + TanStack Router + Query + shadcn/ui + Tailwind v4.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Query status: </span>
          {isPending ? 'loading…' : `${data?.message} @ ${data?.at}`}
        </div>
        <Button className="mt-3" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refetching…' : 'Refetch'}
        </Button>
      </div>
    </div>
  )
}
