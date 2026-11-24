import { FileText, Network, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LastUpdated from '../components/artifacts/LastUpdated'
import ViewToggle, { type ArtifactView } from '../components/artifacts/ViewToggle'
import CategoryIcon from '../components/CategoryIcon'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import Skeleton from '../components/Skeleton'
import { readPreference, writePreference } from '../lib/storage'
import {
  artifactExcerpt,
  organizeArtifacts,
  searchArtifacts,
  sectionByPath,
  slugify,
  useArtifacts,
  type ArtifactDoc,
  type ArtifactGroup,
  type ArtifactSearchResult,
} from '../lib/artifacts'

/** Remembered per browser; list is the default. */
const VIEW_KEY = 'dawn:artifact-view'
const ARTIFACT_VIEWS: readonly ArtifactView[] = ['list', 'cards']

/**
 * Public: the artifacts in dawn-care/Artifacts, read through /api/artifacts, in the sections
 * and order of the repo's README.md (see organizeArtifacts).
 */
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
  const [view, setView] = useState<ArtifactView>(() =>
    readPreference(VIEW_KEY, ARTIFACT_VIEWS, 'list'),
  )
  function changeView(next: ArtifactView) {
    setView(next)
    writePreference(VIEW_KEY, next)
  }

  if (query.loading) {
    return (
      <LoadingState>
        <Skeleton className="mt-10 h-12 w-full max-w-xl rounded-full" />
        {view === 'cards' ? (
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
        ) : (
          <div className="shadow-card mt-12 divide-y divide-border rounded-2xl bg-surface">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-3.5 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}
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
  const groups = organizeArtifacts(docs, query.data.index)
  const sections = sectionByPath(groups)
  if (docs.length === 0) {
    return (
      <div className="mt-10">
        <EmptyState>
          No artifacts yet. They&apos;ll appear here once they&apos;re published.
        </EmptyState>
      </div>
    )
  }

  const searching = search.trim().length > 0
  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <search className="block w-full max-w-xl">
          <label htmlFor="artifact-search" className="sr-only">
            Search artifacts
          </label>
          <div className="relative">
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
        {!searching && <ViewToggle view={view} onChange={changeView} />}
      </div>

      <div className="mt-12">
        {searching ? (
          <SearchResults
            query={search.trim()}
            // In index order, so results follow the page's own order.
            results={searchArtifacts(
              search,
              groups.flatMap((g) => g.docs),
              sections,
            )}
            sections={sections}
          />
        ) : (
          <DocumentGroups groups={groups} view={view} />
        )}
      </div>
    </>
  )
}

function DocumentGroups({ groups, view }: { groups: ArtifactGroup[]; view: ArtifactView }) {
  const untitled = groups.length === 1 && groups[0].title === null
  return (
    <div className="space-y-14">
      {groups.map((group, i) => {
        const headingId = `group-${i}-${slugify(group.title ?? 'documents')}`
        return (
          <section
            key={`${i}-${group.title ?? ''}`}
            aria-labelledby={untitled ? undefined : headingId}
            aria-label={untitled ? 'Documents' : undefined}
          >
            {!untitled && (
              <div className="mb-5">
                <h2 id={headingId} className="flex items-center gap-3 text-2xl font-semibold">
                  <CategoryIcon slug={slugify(group.title ?? 'documents')} />
                  {group.title ?? 'Documents'}
                </h2>
                {group.description && (
                  <p className="mt-2 max-w-prose text-ink-muted">{group.description}</p>
                )}
              </div>
            )}
            {view === 'cards' ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.docs.map((doc) => (
                  <li key={doc.slug}>
                    <DocumentCard doc={doc} />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="shadow-card divide-y divide-border overflow-hidden rounded-2xl bg-surface">
                {group.docs.map((doc) => (
                  <li key={doc.slug}>
                    <DocumentRow doc={doc} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function describe(doc: ArtifactDoc): { excerpt: string; Icon: typeof FileText } {
  return doc.kind === 'diagram'
    ? { excerpt: 'A draw.io diagram. Open it to pan, zoom and switch pages.', Icon: Network }
    : { excerpt: artifactExcerpt(doc), Icon: FileText }
}

/** One artifact in the list view: icon, title, one line of its opening, last updated. */
function DocumentRow({ doc }: { doc: ArtifactDoc }) {
  const { excerpt, Icon } = describe(doc)
  return (
    <Link
      to={`/artifacts/${doc.slug}`}
      className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-page dark:hover:bg-surface-raised"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-link">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span className="font-medium group-hover:text-link group-hover:underline group-hover:underline-offset-4">
            {doc.title}
          </span>
          {doc.updatedAt && (
            <span className="text-sm whitespace-nowrap text-ink-muted">
              <LastUpdated iso={doc.updatedAt} />
            </span>
          )}
        </span>
        {excerpt && <span className="mt-0.5 block truncate text-sm text-ink-muted">{excerpt}</span>}
      </span>
    </Link>
  )
}

function DocumentCard({ doc }: { doc: ArtifactDoc }) {
  const { excerpt, Icon } = describe(doc)
  return (
    <Link
      to={`/artifacts/${doc.slug}`}
      className="group shadow-card hover:shadow-card-hover flex h-full card-hover flex-col rounded-2xl bg-surface p-5"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-link">
        <Icon aria-hidden="true" className="size-5" />
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

function SearchResults({
  query,
  results,
  sections,
}: {
  query: string
  results: ArtifactSearchResult[]
  sections: ReadonlyMap<string, string | null>
}) {
  return (
    <div>
      <p role="status" className="text-sm text-ink-muted">
        {results.length === 0
          ? `No artifacts match “${query}”.`
          : `${results.length} ${results.length === 1 ? 'artifact matches' : 'artifacts match'} “${query}”.`}
      </p>
      {results.length > 0 && (
        <ul className="mt-4 space-y-3">
          {results.map(({ doc, snippet }) => {
            const section = sections.get(doc.path) ?? null
            return (
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
                      {section}
                      {section && doc.updatedAt && ' · '}
                      {doc.updatedAt && <LastUpdated iso={doc.updatedAt} />}
                    </span>
                  </span>
                  {snippet && (
                    <span className="mt-1.5 block text-sm text-ink-muted">
                      {snippet.before}
                      <mark className="rounded-sm bg-accent/25 px-0.5 text-ink">
                        {snippet.match}
                      </mark>
                      {snippet.after}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
