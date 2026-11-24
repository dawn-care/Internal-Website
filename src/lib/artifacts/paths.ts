// Shared with /api (Node ESM): relative imports keep their .js extension.

/*
 * Pure path rules for the dawn-care/Artifacts repo, used by the server (to name and order
 * documents) and the browser (to resolve links between documents and to images).
 */

const ORDER_PREFIX = /^(\d+)\s+/

/** Image types a document may embed. SVGs are served sandboxed (see /api/artifacts). */
export const ARTIFACT_IMAGE_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Folders and files may use an optional "NN " prefix for ordering:
 * "02 Requirements" → { order: 2, name: "Requirements" }. Unprefixed names get order
 * Infinity so they sort after prefixed ones.
 */
export function parseOrderedName(raw: string): { order: number; name: string } {
  const trimmed = raw.trim()
  const prefix = ORDER_PREFIX.exec(trimmed)
  if (!prefix) return { order: Number.POSITIVE_INFINITY, name: trimmed }
  return { order: Number(prefix[1]), name: trimmed.slice(prefix[0].length).trim() }
}

/** Sort comparator for "NN "-prefixed names: by prefix number, then by name. */
export function compareOrderedNames(a: string, b: string): number {
  const x = parseOrderedName(a)
  const y = parseOrderedName(b)
  if (x.order !== y.order) return x.order < y.order ? -1 : 1
  return x.name.localeCompare(y.name, undefined, { numeric: true })
}

export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function isMarkdownPath(path: string): boolean {
  return extensionOf(path) === 'md'
}

export function isImagePath(path: string): boolean {
  return extensionOf(path) in ARTIFACT_IMAGE_TYPES
}

/** Hidden or tooling paths (".github/…", "_drafts/…") never appear on the site. */
export function isPublishablePath(path: string): boolean {
  return path.split('/').every((segment) => segment && !/^[._]/.test(segment))
}

/** "Feature List.md" → "Feature List"; "02 Design/01 Architecture.md" → "Architecture". */
export function titleForPath(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/i, '')
  return parseOrderedName(name).name || name
}

/** The top-level folder's display name, or null for a file at the repo root. */
export function folderForPath(path: string): string | null {
  const slash = path.indexOf('/')
  return slash === -1 ? null : parseOrderedName(path.slice(0, slash)).name
}

/** "02 Design/01 Architecture.md" → "design/architecture". */
export function slugForPath(path: string): string {
  return path
    .replace(/\.md$/i, '')
    .split('/')
    .map((segment) => slugify(parseOrderedName(segment).name) || slugify(segment) || 'untitled')
    .join('/')
}

/**
 * Orders documents the way the Artifacts page lists them: root files first, then each
 * top-level folder in "NN" order, and "NN" order within a folder.
 */
export function compareArtifactPaths(a: string, b: string): number {
  const aSegments = a.split('/')
  const bSegments = b.split('/')
  const aRoot = aSegments.length === 1
  const bRoot = bSegments.length === 1
  if (aRoot !== bRoot) return aRoot ? -1 : 1
  const length = Math.min(aSegments.length, bSegments.length)
  for (let i = 0; i < length; i++) {
    if (aSegments[i] === bSegments[i]) continue
    // A file sorts before a deeper folder at the same level.
    const aFile = i === aSegments.length - 1
    const bFile = i === bSegments.length - 1
    if (aFile !== bFile) return aFile ? -1 : 1
    return compareOrderedNames(
      aSegments[i].replace(/\.md$/i, ''),
      bSegments[i].replace(/\.md$/i, ''),
    )
  }
  return aSegments.length - bSegments.length
}

/**
 * Resolves a relative link target against the document that contains it, the way GitHub
 * does: "../diagrams/Domain%20Model.png" from "02 Design/Architecture.md" →
 * "diagrams/Domain Model.png". Returns null for links that leave the repo.
 */
export function resolveRepoPath(fromPath: string, target: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(target)
  } catch {
    decoded = target
  }
  const base = decoded.startsWith('/') ? [] : fromPath.split('/').slice(0, -1)
  const segments = [...base]
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return null
      segments.pop()
    } else {
      segments.push(segment)
    }
  }
  return segments.length > 0 ? segments.join('/') : null
}

/** The documents' slugs, made unique: a second "design/architecture" becomes "…-2". */
export function uniqueSlugs(paths: readonly string[]): Map<string, string> {
  const taken = new Set<string>()
  const result = new Map<string, string>()
  for (const path of paths) {
    const base = slugForPath(path)
    let slug = base
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
    taken.add(slug)
    result.set(path, slug)
  }
  return result
}
