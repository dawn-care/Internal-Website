import { artifactAssetUrl } from './client'
import { blocksText, parseMarkdown, type Block } from './markdown'
import { resolveRepoPath } from './paths'
import type { ArtifactDoc, ArtifactsResponse } from './types'

/** A file's page on GitHub ("blob" also redirects to folders). */
export function artifactSourceUrl(source: ArtifactsResponse['source'], path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/')
  return `${source.url}/blob/${encodeURIComponent(source.branch)}/${encoded}`
}

export interface ParsedDoc {
  blocks: Block[]
  /** Plain text of the whole document, for search and excerpts. */
  text: string
}

const parsed = new WeakMap<ArtifactDoc, ParsedDoc>()

/** The document's parsed Markdown, computed once per document object. */
export function parseDoc(doc: ArtifactDoc): ParsedDoc {
  let result = parsed.get(doc)
  if (!result) {
    const blocks = parseMarkdown(doc.markdown)
    result = { blocks, text: blocksText(blocks) }
    parsed.set(doc, result)
  }
  return result
}

export function findArtifact(docs: readonly ArtifactDoc[], slug: string): ArtifactDoc | null {
  const wanted = slug.replace(/^\/+|\/+$/g, '').toLowerCase()
  return docs.find((doc) => doc.slug === wanted) ?? null
}

export interface ArtifactGroup {
  /** null for documents at the repo root. */
  folder: string | null
  docs: ArtifactDoc[]
}

/** Consecutive documents sharing a folder, in the server's order (root files first). */
export function groupArtifacts(docs: readonly ArtifactDoc[]): ArtifactGroup[] {
  const groups: ArtifactGroup[] = []
  for (const doc of docs) {
    const last = groups[groups.length - 1]
    if (last && last.folder === doc.folder) last.docs.push(doc)
    else groups.push({ folder: doc.folder, docs: [doc] })
  }
  return groups
}

/** The most recently changed documents. */
export function recentArtifacts(docs: readonly ArtifactDoc[], limit: number): ArtifactDoc[] {
  return [...docs]
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, limit)
}

function clip(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, '')}…`
}

/** The document's first paragraph, shortened: the blurb on its card. */
export function artifactExcerpt(doc: ArtifactDoc, max = 180): string {
  const first = parseDoc(doc).blocks.find((b) => b.type === 'paragraph')
  return first ? clip(blocksText([first]), max) : ''
}

export interface ArtifactSearchResult {
  doc: ArtifactDoc
  /** Text around the first match; `match` is the matched words as written. */
  snippet: { before: string; match: string; after: string } | null
}

/**
 * Documents containing every word of the query (in the title, folder or text). Title
 * matches come first; otherwise the server's order is kept.
 */
export function searchArtifacts(
  query: string,
  docs: readonly ArtifactDoc[],
): ArtifactSearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  const results: (ArtifactSearchResult & { inTitle: boolean })[] = []
  for (const doc of docs) {
    const { text } = parseDoc(doc)
    const flat = text.replace(/\s+/g, ' ')
    const haystack = `${doc.title} ${doc.folder ?? ''} ${flat}`.toLowerCase()
    if (!terms.every((term) => haystack.includes(term))) continue
    const title = doc.title.toLowerCase()
    results.push({
      doc,
      inTitle: terms.every((term) => title.includes(term)),
      snippet: snippetFor(flat, terms),
    })
  }
  return results
    .sort((a, b) => Number(b.inTitle) - Number(a.inTitle))
    .map(({ doc, snippet }) => ({ doc, snippet }))
}

function snippetFor(text: string, terms: string[]): ArtifactSearchResult['snippet'] {
  const lower = text.toLowerCase()
  let index = -1
  let term = ''
  for (const t of terms) {
    const at = lower.indexOf(t)
    if (at !== -1 && (index === -1 || at < index)) {
      index = at
      term = t
    }
  }
  if (index === -1) return null
  const start = Math.max(0, index - 60)
  const end = Math.min(text.length, index + term.length + 100)
  let before = text.slice(start, index)
  let after = text.slice(index + term.length, end)
  if (start > 0) before = `…${before.replace(/^\S*\s/, '')}`
  if (end < text.length) after = `${after.replace(/\s\S*$/, '')}…`
  return { before, match: text.slice(index, index + term.length), after }
}

export type ResolvedLink =
  /** Another site (opens in a new tab). */
  | { kind: 'external'; href: string }
  /** Another document on this site. */
  | { kind: 'internal'; to: string }
  /** A heading in the same document. */
  | { kind: 'anchor'; href: string }
  /** Nothing visitors can open (an unsafe or unresolvable URL): plain text. */
  | { kind: 'none' }

const SCHEME = /^([a-z][a-z0-9+.-]*):/i

/**
 * Where a link in `from` should go. Relative links to other Markdown documents become site
 * links; links to any other file in the repo (a .drawio diagram, a folder) open it on GitHub.
 */
export function resolveArtifactLink(
  href: string,
  from: ArtifactDoc,
  slugByPath: ReadonlyMap<string, string>,
  source: ArtifactsResponse['source'],
): ResolvedLink {
  const target = href.trim()
  if (!target) return { kind: 'none' }
  if (target.startsWith('#'))
    return target.length > 1 ? { kind: 'anchor', href: target } : { kind: 'none' }
  const scheme = SCHEME.exec(target)?.[1].toLowerCase()
  if (scheme) {
    return ['http', 'https', 'mailto'].includes(scheme)
      ? { kind: 'external', href: target }
      : { kind: 'none' }
  }
  if (target.startsWith('//')) return { kind: 'none' }

  const hashAt = target.indexOf('#')
  const hash = hashAt === -1 ? '' : target.slice(hashAt)
  const pathPart = (hashAt === -1 ? target : target.slice(0, hashAt)).split('?')[0]
  if (!pathPart) return hash ? { kind: 'anchor', href: hash } : { kind: 'none' }
  const repoPath = resolveRepoPath(from.path, pathPart)
  if (!repoPath) return { kind: 'none' }
  const slug = slugByPath.get(repoPath)
  if (!slug) return { kind: 'external', href: artifactSourceUrl(source, repoPath) + hash }
  return { kind: 'internal', to: `/artifacts/${slug}${hash.length > 1 ? hash : ''}` }
}

/** Where an image in `from` loads from, or null if visitors can't see it. */
export function resolveArtifactImage(
  src: string,
  from: ArtifactDoc,
  assets: ReadonlySet<string>,
): string | null {
  const target = src.trim()
  if (/^https:\/\//i.test(target)) return target
  if (SCHEME.test(target) || target.startsWith('//') || !target) return null
  const repoPath = resolveRepoPath(from.path, target.split(/[?#]/)[0])
  return repoPath && assets.has(repoPath) ? artifactAssetUrl(repoPath) : null
}
