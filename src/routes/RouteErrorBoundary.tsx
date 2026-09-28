import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router-dom'
import { Button } from '@/components/primitives/Button'
import { Card } from '@/components/primitives/Card'

/** Route-level error boundary — a plain, on-brand "something went wrong"
 * card with a manual retry. */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const status = isRouteErrorResponse(error) ? error.status : undefined
  const message = error instanceof Error ? error.message : 'Something went wrong loading this page.'

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-8">
      <Card elevated className="max-w-md p-8 text-center">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
          {status ? `Error ${status}` : 'Something went wrong'}
        </p>
        <h2 className="mt-2 font-display text-xl text-ink">This page hit a snag.</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-body">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </Card>
    </div>
  )
}
