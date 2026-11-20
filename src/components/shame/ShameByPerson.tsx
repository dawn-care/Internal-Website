import { Users } from 'lucide-react'
import { members, nameForLogin } from '../../config/team'
import { categoryIds, categoryLabel, personRows } from '../../lib/shame'
import { heatLevel } from '../../lib/prMetrics'
import ShameCard from './ShameCard'

const TEAM = members.flatMap((m) => (m.login ? [m.login] : []))

/** Per person: shames in each category (a heatmap table) and what they're shamed for most. */
export default function ShameByPerson() {
  return (
    <ShameCard id="shame-people" title="Shames by Person" icon={Users}>
      {(file) => {
        const ids = categoryIds(file)
        const rows = personRows(file, TEAM, nameForLogin)
        const maxCount = Math.max(0, ...rows.flatMap((r) => r.counts))
        return (
          <div>
            <p className="text-sm text-ink-muted">
              Each cell is how many times someone was shamed in that category.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[60rem] border-separate border-spacing-1 text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-ink-muted">
                    <th scope="col" className="px-2 py-1 text-left">
                      Member
                    </th>
                    <th scope="col" className="px-2 py-1 text-left">
                      Most shamed for
                    </th>
                    <th scope="col" className="px-2 py-1 text-center">
                      Total
                    </th>
                    {ids.map((id) => (
                      <th key={id} scope="col" className="px-2 py-1 text-center">
                        {categoryLabel(file, id)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.login}>
                      <th
                        scope="row"
                        className="px-2 py-2 text-left font-medium whitespace-nowrap text-ink"
                      >
                        {nameForLogin(row.login)}
                      </th>
                      <td className="min-w-36 px-2 py-2 text-ink">
                        {row.top.length ? (
                          row.top.map((id) => categoryLabel(file, id)).join(', ')
                        ) : (
                          <span className="text-ink-muted">Clean record</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold text-ink tabular-nums">
                        {row.total}
                      </td>
                      {row.counts.map((count, i) => (
                        <td
                          key={ids[i]}
                          className={`rounded-md px-2 py-2 text-center tabular-nums ${count ? 'text-ink' : 'text-ink-muted'}`}
                          style={
                            count
                              ? {
                                  backgroundColor: `color-mix(in srgb, var(--accent) ${Math.round(heatLevel(count, maxCount) * 100)}%, var(--surface))`,
                                }
                              : undefined
                          }
                        >
                          {count}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }}
    </ShameCard>
  )
}
