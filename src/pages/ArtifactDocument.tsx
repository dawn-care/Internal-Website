import { useEffect, useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import LastUpdated from '../components/artifacts/LastUpdated'
import Markdown, { type MarkdownContext } from '../components/artifacts/Markdown'
import Breadcrumb from '../components/Breadcrumb'
import { buttonClasses } from '../components/buttonStyles'
import ErrorState from '../components/ErrorState'
import ExternalLinkLabel from '../components/ExternalLinkLabel'
import LoadingState from '../components/LoadingState'
import PageTitle from '../components/PageTitle'
import Skeleton from '../components/Skeleton'
import {
  artifactSourceUrl,
  findArtifact,
  inlineText,
  parseDoc,
  useArtifacts,
  type ArtifactDoc,
  type ArtifactsResponse,
} from '../lib/artifacts'

/** Public: one document from dawn-care/Artifacts, at /artifacts/<slug>. */
export default function ArtifactDocument() {
  const slug = useParams()['*'] ?? ''
  const query = useArtifacts()

  let body
  if (query.loading) {
    body = (
      <LoadingState>
        <PageTitle title="Artifacts" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-10 w-80 max-w-full" />
        <Skeleton className="mt-3 h-4 w-32" />
        <div className="mt-10 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
          <Skeleton className="h-4 w-2/3" />
        </div>
      </LoadingState>
    )
  } else if (query.error || !query.data) {
    body = (
      <>
        <PageTitle title="Artifacts" />
        <Breadcrumb items={[{ label: 'Artifacts', to: '/artifacts' }, { label: 'Document' }]} />
        <div className="mt-8">
          <ErrorState
            message={query.error?.message || "We couldn't load this document right now."}
            onRetry={query.refetch}
          />
        </div>
      </>
    )
  } else {
    const doc = findArtifact(query.data.documents, slug)
    body = doc ? (
      <DocumentView doc={doc} data={query.data} />
    ) : (
      <NotFound message="We couldn't find that document. It may have been renamed or moved." />
    )
  }

  return <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">{body}</div>
}

function DocumentView({ doc, data }: { doc: ArtifactDoc; data: ArtifactsResponse }) {
  const { blocks } = parseDoc(doc)
  const context = useMemo<MarkdownContext>(
    () => ({
      doc,
      slugByPath: new Map(data.documents.map((d) => [d.path, d.slug])),
      assets: new Set(data.assets),
      source: data.source,
    }),
    [doc, data],
  )
  const hasTitle = blocks[0]?.type === 'heading' && blocks[0].level === 1
  const sections = blocks.filter(
    (b): b is Extract<typeof b, { type: 'heading' }> => b.type === 'heading' && b.level === 2,
  )
  useScrollToHash(doc)

  return (
    <>
      <PageTitle title={doc.title} />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Breadcrumb items={[{ label: 'Artifacts', to: '/artifacts' }, { label: doc.title }]} />
        <a
          href={artifactSourceUrl(data.source, doc.path)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-link hover:underline hover:underline-offset-4"
        >
          View on GitHub
          <ExternalLinkLabel />
        </a>
      </div>
      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
        <article className="max-w-3xl min-w-0">
          {(doc.folder || doc.updatedAt) && (
            <p className="mb-3 text-sm text-ink-muted">
              {doc.folder}
              {doc.folder && doc.updatedAt && ' · '}
              {doc.updatedAt && <LastUpdated iso={doc.updatedAt} relative />}
            </p>
          )}
          {!hasTitle && <h1 className="text-4xl font-semibold">{doc.title}</h1>}
          {doc.markdown.trim() ? (
            <div className={hasTitle ? '' : 'mt-8'}>
              <Markdown blocks={blocks} context={context} />
            </div>
          ) : (
            <p className="mt-8 text-ink-muted">This document is empty.</p>
          )}
        </article>
        {sections.length >= 3 && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold tracking-wider text-ink-muted uppercase">
                On this page
              </p>
              <ul className="mt-3 space-y-2 border-l border-border text-sm">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="-ml-px block rounded-sm border-l-2 border-transparent pl-3 text-ink-muted hover:border-accent hover:text-link"
                    >
                      {inlineText(section.children)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
    </>
  )
}

/**
 * Links between documents can target a heading ("Feature List.md#carepartner-tablet").
 * The router doesn't scroll to it, and Layout scrolls new pages to the top after this
 * page's effects run, so wait a frame before scrolling.
 */
function useScrollToHash(doc: ArtifactDoc) {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash.length < 2) return
    const frame = requestAnimationFrame(() => {
      let id = hash.slice(1)
      try {
        id = decodeURIComponent(id)
      } catch {
        // keep it as written
      }
      document.getElementById(id)?.scrollIntoView()
    })
    return () => cancelAnimationFrame(frame)
  }, [hash, doc])
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start">
      <PageTitle title="Document not found" />
      <Breadcrumb items={[{ label: 'Artifacts', to: '/artifacts' }, { label: 'Not found' }]} />
      <h1 className="mt-5 text-4xl font-semibold">Document not found</h1>
      <p className="mt-3 max-w-prose text-ink-muted">{message}</p>
      <Link to="/artifacts" className={`mt-8 ${buttonClasses('secondary')}`}>
        Back to all artifacts
      </Link>
    </div>
  )
}
