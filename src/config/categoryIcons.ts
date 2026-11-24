import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  Compass,
  DraftingCompass,
  FlaskConical,
  FileText,
  FolderOpen,
  ListChecks,
  Network,
  Presentation,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icons for the sections on /artifacts, keyed by slug: a "##" heading in the Artifacts
 * README (or, without one, a folder name without its "NN " prefix), lowercased and
 * hyphenated: "Architecture & Design" → "architecture-design".
 * Unlisted categories get DEFAULT_CATEGORY_ICON.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'project-management': ClipboardList,
  requirements: ListChecks,
  'architecture-design': DraftingCompass,
  design: DraftingCompass,
  testing: FlaskConical,
  presentations: Presentation,
  research: BookOpen,
  overview: Compass,
  process: Workflow,
  metrics: ChartColumn,
  documents: FileText,
  diagrams: Network,
}

export const DEFAULT_CATEGORY_ICON: LucideIcon = FolderOpen

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? DEFAULT_CATEGORY_ICON
}
