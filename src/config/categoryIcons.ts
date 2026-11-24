import {
  BookOpen,
  ClipboardList,
  DraftingCompass,
  FlaskConical,
  FolderOpen,
  ListChecks,
  Presentation,
  type LucideIcon,
} from 'lucide-react'

/**
 * Icons for Artifacts folders (shown as groups on /artifacts), keyed by slug (the folder name
 * without its "NN " prefix, lowercased and hyphenated: "03 Architecture & Design" →
 * "architecture-design").
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
}

export const DEFAULT_CATEGORY_ICON: LucideIcon = FolderOpen

export function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? DEFAULT_CATEGORY_ICON
}
