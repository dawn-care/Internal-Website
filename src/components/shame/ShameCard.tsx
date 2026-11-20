import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SHAME_REPO } from '../../config/shame'
import { useShames, type ShameFile } from '../../lib/shame'
import { WidgetCard } from '../dashboard/Widget'
import EmptyState from '../EmptyState'
import ErrorState from '../ErrorState'
import LoadingState from '../LoadingState'
import Skeleton from '../Skeleton'

interface ShameCardProps {
  id: string
  title: string
  icon: LucideIcon
  children: (file: ShameFile) => ReactNode
}

/**
 * One shame card. Every card reads the same shared fetch (src/lib/shame) and handles its
 * own loading, error and empty states, so one never blocks another.
 */
export default function ShameCard({ id, title, icon, children }: ShameCardProps) {
  const query = useShames()
  let body: ReactNode
  if (query.loading) {
    body = (
      <LoadingState>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-5 h-6 w-full" />
        <Skeleton className="mt-3 h-6 w-3/4" />
      </LoadingState>
    )
  } else if (query.error) {
    body = <ErrorState message={query.error.message} onRetry={query.refetch} />
  } else if (!query.data || query.data.shames.length === 0) {
    body = (
      <EmptyState>
        Nobody has been shamed yet. The log appears once the shame bot in {SHAME_REPO} records its
        first shame.
      </EmptyState>
    )
  } else {
    body = children(query.data)
  }
  return (
    <WidgetCard id={id} title={title} icon={icon}>
      {body}
    </WidgetCard>
  )
}
