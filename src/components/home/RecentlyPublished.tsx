import { ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { recentArtifacts, type ArtifactsQuery } from '../../lib/artifacts'
import LastUpdated from '../artifacts/LastUpdated'
import EmptyState from '../EmptyState'
import ErrorState from '../ErrorState'
import LoadingState from '../LoadingState'
import Skeleton from '../Skeleton'

const RECENT_COUNT = 3

/**
 * The most recently updated Artifacts documents. Hidden if GitHub reported no dates at all,
 * since "recent" would mean nothing.
 */
export default function RecentlyPublished({ artifacts }: { artifacts: ArtifactsQuery }) {
  if (artifacts.data && !artifacts.data.documents.some((doc) => doc.updatedAt)) return null
  return (
    <section aria-labelledby="recent-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-title" className="text-2xl font-semibold">
          Recently updated
        </h2>
        <Link
          to="/artifacts"
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-link hover:underline hover:underline-offset-4"
        >
          All artifacts
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="mt-6">
        <RecentlyPublishedBody artifacts={artifacts} />
      </div>
    </section>
  )
}

function RecentlyPublishedBody({ artifacts }: { artifacts: ArtifactsQuery }) {
  if (artifacts.loading) {
    return (
      <LoadingState>
        <div className="grid gap-6 sm:grid-cols-3">
          {Array.from({ length: RECENT_COUNT }, (_, i) => (
            <div key={i} className="shadow-card rounded-2xl bg-surface p-6">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-3 h-6 w-full" />
              <Skeleton className="mt-4 h-3 w-24" />
            </div>
          ))}
        </div>
      </LoadingState>
    )
  }
  if (artifacts.error || !artifacts.data) {
    return (
      <ErrorState message="We couldn't load the artifacts right now." onRetry={artifacts.refetch} />
    )
  }
  const recent = recentArtifacts(artifacts.data.documents, RECENT_COUNT)
  if (recent.length === 0) {
    return <EmptyState>Nothing published yet. Project documents will appear here.</EmptyState>
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-3">
      {recent.map((doc) => (
        <li key={doc.slug}>
          <Link
            to={`/artifacts/${doc.slug}`}
            className="group shadow-card hover:shadow-card-hover flex h-full card-hover flex-col rounded-2xl bg-surface p-6"
          >
            <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-ink-muted uppercase">
              <FileText aria-hidden="true" className="size-3.5" />
              {doc.folder ?? 'Document'}
            </span>
            <span className="mt-2 font-heading text-lg leading-snug font-semibold group-hover:text-link">
              {doc.title}
            </span>
            {doc.updatedAt && (
              <span className="mt-auto pt-4 text-sm text-ink-muted">
                <LastUpdated iso={doc.updatedAt} />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
