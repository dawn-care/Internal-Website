import { FileText, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import LastUpdated from '../components/artifacts/LastUpdated'
import CategoryIcon from '../components/CategoryIcon'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import Skeleton from '../components/Skeleton'
import {
  artifactExcerpt,
  groupArtifacts,
  searchArtifacts,
  slugify,
  useArtifacts,
  type ArtifactDoc,
  type ArtifactSearchResult,
} from '../lib/artifacts'

/** Public: the documents in dawn-care/Artifacts, read through /api/artifacts. */
export default function Artifacts() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <PageTitle title="Artifacts" />
      <h1 className="text-4xl font-semibold">Artifacts</h1>
      <p className="mt-3 max-w-prose text-ink-muted">
        The team&apos;s project documents: requirements, process, metrics and more.
      </p>
      <div aria-hidden="true" className="mt-6 horizon-line w-24" />
      <ArtifactsBody />
    </div>
  )
}

function ArtifactsBody() {
  const query = useArtifacts()
  // The search lives in the URL (?q=) so it can be shared or survive a reload.
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''

  if (query.loading) {
    return (
      <LoadingState>
        <Skeleton className="mt-10 h-12 w-full max-w-xl rounded-full" />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shadow-card rounded-2xl bg-surface p-5">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="mt-4 h-5 w-40" />
              <Skeleton className="mt-3 h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-3/4" />
            </div>
          ))}
        </div>
      </LoadingState>
    )
  }
  if (query.error || !query.data) {
    return (
      <div className="mt-10">
        <ErrorState
          message={query.error?.message || "We couldn't load the artifacts right now."}
          onRetry={query.refetch}
        />
      </div>
    )
  }
  const docs = query.data.documents
  if (docs.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState>
          No documents yet. They&apos;ll appear here once they&apos;re published.
        </EmptyState>
      </div>
    )
  }

  const searching = search.trim().length > 0
  return (
    <>
      <search className="mt-10 block">
        <label htmlFor="artifact-search" className="sr-only">
          Search artifacts
        </label>
        <div className="relative max-w-xl">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-muted"
          />
          <input
            id="artifact-search"
            type="search"
            value={search}
            onChange={(e) =>
              setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })
            }
            placeholder="Search titles and text"
            autoComplete="off"
            className="shadow-card w-full rounded-full border border-border bg-surface py-3 pr-4 pl-12 text-ink placeholder:text-ink-muted"
          />
        </div>
      </search>

      <div className="mt-12">
        {searching ? (
          <SearchResults query={search.trim()} results={searchArtifacts(search, docs)} />
        ) : (
          <DocumentGroups docs={docs} />
        )}
      </div>
    </>
  )
}

function DocumentGroups({ docs }: { docs: ArtifactDoc[] }) {
  const groups = groupArtifacts(docs)
  const onlyRoot = groups.length === 1 && groups[0].folder === null
  return (
    <div className="space-y-14">
      {groups.map((group) => {
        const headingId = `group-${slugify(group.folder ?? 'documents')}`
        return (
          <section
            key={group.folder ?? ''}
            aria-labelledby={onlyRoot ? undefined : headingId}
            aria-label={onlyRoot ? 'Documents' : undefined}
          >
            {!onlyRoot && (
              <h2 id={headingId} className="mb-5 flex items-center gap-3 text-2xl font-semibold">
                {group.folder && <CategoryIcon slug={slugify(group.folder)} />}
                {group.folder ?? 'Documents'}
              </h2>
            )}
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.docs.map((doc) => (
                <li key={doc.slug}>
                  <DocumentCard doc={doc} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function DocumentCard({ doc }: { doc: ArtifactDoc }) {
  const excerpt = artifactExcerpt(doc)
  return (
    <Link
      to={`/artifacts/${doc.slug}`}
      className="group shadow-card hover:shadow-card-hover flex h-full card-hover flex-col rounded-2xl bg-surface p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-link">
        <FileText aria-hidden="true" className="size-5" />
      </span>
      <span className="mt-4 font-heading text-lg leading-snug font-semibold group-hover:text-link">
        {doc.title}
      </span>
      {excerpt && <span className="mt-2 line-clamp-3 text-sm text-ink-muted">{excerpt}</span>}
      {doc.updatedAt && (
        <span className="mt-auto pt-4 text-sm text-ink-muted">
          <LastUpdated iso={doc.updatedAt} />
        </span>
      )}
    </Link>
  )
}

function SearchResults({ query, results }: { query: string; results: ArtifactSearchResult[] }) {
  return (
    <div>
      <p role="status" className="text-sm text-ink-muted">
        {results.length === 0
          ? `No documents match “${query}”.`
          : `${results.length} ${results.length === 1 ? 'document matches' : 'documents match'} “${query}”.`}
      </p>
      {results.length > 0 && (
        <ul className="mt-4 space-y-3">
          {results.map(({ doc, snippet }) => (
            <li key={doc.slug}>
              <Link
                to={`/artifacts/${doc.slug}`}
                className="group shadow-card hover:shadow-card-hover block card-hover rounded-2xl bg-surface px-5 py-4"
              >
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-heading text-lg font-semibold group-hover:text-link">
                    {doc.title}
                  </span>
                  <span className="text-sm text-ink-muted">
                    {doc.folder}
                    {doc.folder && doc.updatedAt && ' · '}
                    {doc.updatedAt && <LastUpdated iso={doc.updatedAt} />}
                  </span>
                </span>
                {snippet && (
                  <span className="mt-1.5 block text-sm text-ink-muted">
                    {snippet.before}
                    <mark className="rounded-sm bg-accent/25 px-0.5 text-ink">{snippet.match}</mark>
                    {snippet.after}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
