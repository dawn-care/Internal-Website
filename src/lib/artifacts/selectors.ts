import { artifactAssetUrl } from './client'
import { blocksText, inlineText, parseMarkdown, type Block, type Inline } from './markdown'
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
  /** The section heading; null for an untitled group (root files with no index). */
  title: string | null
  /** The index's text under the heading, before its first link (plain text). */
  description: string | null
  docs: ArtifactDoc[]
}

/** "diagrams" → "Diagrams": folder names are often lowercase. */
function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('en-US') + text.slice(1)
}

export const ROOT_SECTION = 'Documents'

/**
 * Without an index: consecutive artifacts sharing a top-level folder (root files first),
 * titled by the folder name, capitalized. Root files are titled "Documents" when folders
 * exist too, and untitled when they're all there is.
 */
function groupByFolder(docs: readonly ArtifactDoc[]): ArtifactGroup[] {
  const groups: (ArtifactGroup & { folder: string | null })[] = []
  for (const doc of docs) {
    const last = groups[groups.length - 1]
    if (last && last.folder === doc.folder) last.docs.push(doc)
    else groups.push({ folder: doc.folder, title: null, description: null, docs: [doc] })
  }
  const onlyRoot = groups.length === 1 && groups[0].folder === null
  return groups.map(({ folder, description, docs }) => ({
    title: folder === null ? (onlyRoot ? null : ROOT_SECTION) : capitalize(folder),
    description,
    docs,
  }))
}

/** Every link target in the blocks, in reading order. */
function linkTargets(blocks: readonly Block[]): string[] {
  const fromInlines = (nodes: readonly Inline[]): string[] =>
    nodes.flatMap((node) => {
      if (node.type === 'link') return [node.href]
      if ('children' in node) return fromInlines(node.children)
      return []
    })
  return blocks.flatMap((block) => {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        return fromInlines(block.children)
      case 'blockquote':
        return linkTargets(block.children)
      case 'list':
        return block.items.flatMap((item) => linkTargets(item.children))
      case 'table':
        return [block.head, ...block.rows].flatMap((row) => row.flatMap(fromInlines))
      default:
        return []
    }
  })
}

export const OTHER_SECTION = 'Other'

/**
 * The artifacts in sections, in order. With an index (the repo's root README.md), each "##"
 * (or deeper) heading starts a section and its links list the section's artifacts in order;
 * a paragraph under a heading, before any link, becomes its description. Artifacts the index
 * doesn't link to go in a final "Other" section, in the default (folder, "NN") order.
 * Without an index, or if it links to no artifact, artifacts are grouped by folder.
 */
export function organizeArtifacts(
  docs: readonly ArtifactDoc[],
  index: string | null,
): ArtifactGroup[] {
  if (!index?.trim()) return groupByFolder(docs)
  const byPath = new Map(docs.map((doc) => [doc.path, doc]))
  const used = new Set<string>()
  const groups: ArtifactGroup[] = []
  let current: ArtifactGroup = { title: null, description: null, docs: [] }

  for (const block of parseMarkdown(index)) {
    if (block.type === 'heading') {
      if (block.level === 1) continue // the README's own title
      groups.push(current)
      current = { title: inlineText(block.children).trim(), description: null, docs: [] }
      continue
    }
    const targets = linkTargets([block])
    if (block.type === 'paragraph' && targets.length === 0) {
      if (current.docs.length === 0 && !current.description) {
        current.description = inlineText(block.children).replace(/\s+/g, ' ').trim()
      }
      continue
    }
    for (const href of targets) {
      if (SCHEME.test(href)) continue
      const path = resolveRepoPath('README.md', href.split('#')[0].split('?')[0])
      const doc = path ? byPath.get(path) : undefined
      if (doc && !used.has(doc.path)) {
        used.add(doc.path)
        current.docs.push(doc)
      }
    }
  }
  groups.push(current)

  if (used.size === 0) return groupByFolder(docs)
  const other = docs.filter((doc) => !used.has(doc.path))
  if (other.length > 0) groups.push({ title: OTHER_SECTION, description: null, docs: other })
  return groups.filter((group) => group.docs.length > 0)
}

/** Each artifact's section title (null when its group is untitled). */
export function sectionByPath(groups: readonly ArtifactGroup[]): Map<string, string | null> {
  return new Map(groups.flatMap((group) => group.docs.map((doc) => [doc.path, group.title])))
}

/**
 * The diagrams.net viewer for a diagram, loading it straight from raw.githubusercontent.com
 * (public, CORS-enabled). `lightbox` is the full-window version for "Open full screen".
 */
export function diagramViewerUrl(
  source: ArtifactsResponse['source'],
  doc: ArtifactDoc,
  { lightbox = false }: { lightbox?: boolean } = {},
): string {
  const encoded = doc.path.split('/').map(encodeURIComponent).join('/')
  const file = `${source.rawUrl}/${encodeURIComponent(source.branch)}/${encoded}`
  const params = new URLSearchParams({
    ...(lightbox ? { lightbox: '1' } : {}),
    highlight: '0000ff',
    nav: '1',
    layers: '1',
    toolbar: 'pages zoom layers lightbox',
    title: doc.title,
  })
  return `https://viewer.diagrams.net/?${params.toString().replace(/\+/g, '%20')}#U${encodeURIComponent(file)}`
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
 * Artifacts containing every word of the query (in the title, section or folder, or text).
 * Title matches come first; otherwise the given order is kept.
 */
export function searchArtifacts(
  query: string,
  docs: readonly ArtifactDoc[],
  sections: ReadonlyMap<string, string | null> = new Map(),
): ArtifactSearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  const results: (ArtifactSearchResult & { inTitle: boolean })[] = []
  for (const doc of docs) {
    const { text } = parseDoc(doc)
    const flat = text.replace(/\s+/g, ' ')
    const section = sections.get(doc.path) ?? doc.folder ?? ''
    const haystack = `${doc.title} ${section} ${flat}`.toLowerCase()
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
