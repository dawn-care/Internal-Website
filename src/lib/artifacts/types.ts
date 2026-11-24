// Shared with /api (Node ESM): relative imports keep their .js extension.

/** One artifact from the dawn-care/Artifacts repo: a Markdown document or a draw.io diagram. */
export interface ArtifactDoc {
  /** Path in the repo, e.g. "Feature List.md" or "diagrams/Domain Model.drawio". */
  path: string
  kind: 'markdown' | 'diagram'
  /** URL path under /artifacts/, e.g. "feature-list" or "design/architecture". */
  slug: string
  /** The file name without its "NN " prefix and ".md" / ".drawio". */
  title: string
  /** The top-level folder's name without its "NN " prefix; null for files at the repo root. */
  folder: string | null
  /** ISO 8601 time of the last commit that touched the file; null if GitHub couldn't say. */
  updatedAt: string | null
  /** The document's Markdown; "" for diagrams (the viewer loads them from GitHub). */
  markdown: string
}

/** GET /api/artifacts. */
export interface ArtifactsResponse {
  /**
   * The GitHub repo the documents come from: `url` for "View on GitHub" and links to other
   * files, `rawUrl` (raw.githubusercontent.com, CORS-enabled) for the diagram viewer.
   */
  source: { url: string; rawUrl: string; branch: string }
  /**
   * The repo's root README.md, which orders and groups the artifacts (see
   * organizeArtifacts); null when there isn't one (then folders and "NN" prefixes decide).
   */
  index: string | null
  /** Root files first, then each folder in "NN" order; "NN" order within each. */
  documents: ArtifactDoc[]
  /** Repo paths of images that documents may embed, served by /api/artifacts?asset=<path>. */
  assets: string[]
  generatedAt: string
}
