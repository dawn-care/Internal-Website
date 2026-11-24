// Shared with /api (Node ESM): relative imports keep their .js extension.

/** One Markdown file from the dawn-care/Artifacts repo. */
export interface ArtifactDoc {
  /** Path in the repo, e.g. "Feature List.md" or "02 Design/01 Architecture.md". */
  path: string
  /** URL path under /artifacts/, e.g. "feature-list" or "design/architecture". */
  slug: string
  /** The file name without its "NN " prefix and ".md". */
  title: string
  /** The top-level folder's name without its "NN " prefix; null for files at the repo root. */
  folder: string | null
  /** ISO 8601 time of the last commit that touched the file; null if GitHub couldn't say. */
  updatedAt: string | null
  markdown: string
}

/** GET /api/artifacts. */
export interface ArtifactsResponse {
  /** The GitHub repo the documents come from, for "View on GitHub" and links to other files. */
  source: { url: string; branch: string }
  /** Root files first, then each folder in "NN" order; "NN" order within each. */
  documents: ArtifactDoc[]
  /** Repo paths of images that documents may embed, served by /api/artifacts?asset=<path>. */
  assets: string[]
  generatedAt: string
}
