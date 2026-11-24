import { LayoutGrid, LayoutList } from 'lucide-react'

export type ArtifactView = 'list' | 'cards'

const OPTIONS: { value: ArtifactView; label: string; icon: typeof LayoutList }[] = [
  { value: 'list', label: 'List', icon: LayoutList },
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
]

/** List / Cards switch for /artifacts. Each option is a toggle button with a text label. */
export default function ViewToggle({
  view,
  onChange,
}: {
  view: ArtifactView
  onChange: (view: ArtifactView) => void
}) {
  return (
    <div role="group" aria-label="Layout" className="inline-flex rounded-full bg-ink/5 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = view === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              selected ? 'shadow-card bg-surface text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
