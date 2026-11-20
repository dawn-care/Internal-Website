import { addDaysToDateKey, weekdayOf, zonedDateKey } from '../teamTime'
import type { ShameEntry, ShameFile } from './types'

/*
 * Everything the shame page shows, computed from the raw log. Pure functions, so they're
 * tested without the network. Grouping is by category id; labels come from the file.
 */

/** Category ids in the file's order, then any id a shame uses that `categories` lacks. */
export function categoryIds(file: ShameFile): string[] {
  const ids = Object.keys(file.categories)
  for (const shame of file.shames) if (!ids.includes(shame.category)) ids.push(shame.category)
  return ids
}

/** The file's label for a category id, else the id itself. */
export function categoryLabel(file: ShameFile, id: string): string {
  return file.categories[id] ?? id
}

export interface CategoryTotal {
  category: string
  label: string
  count: number
}

/** Shames per category across the team, most first (ties keep the file's order). */
export function categoryTotals(file: ShameFile): CategoryTotal[] {
  const counts = countBy(file.shames, (s) => s.category)
  return categoryIds(file)
    .map((category) => ({
      category,
      label: categoryLabel(file, category),
      count: counts.get(category) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export interface PersonRow {
  login: string
  total: number
  /** Aligned with categoryIds(file). */
  counts: number[]
  /** The categories this person is shamed for most (several on a tie; none at 0 shames). */
  top: string[]
}

/**
 * Shames per person, broken down by category, most-shamed first. `team` logins appear even
 * with no shames; anyone else in the log is listed too. Logins match case-insensitively.
 */
export function personRows(
  file: ShameFile,
  team: string[] = [],
  nameOf: (login: string) => string = (l) => l,
): PersonRow[] {
  const ids = categoryIds(file)
  const people = new Map<string, string>()
  for (const login of [...team, ...file.shames.map((s) => s.login)]) {
    if (!people.has(login.toLowerCase())) people.set(login.toLowerCase(), login)
  }
  const byPerson = groupBy(file.shames, (s) => s.login.toLowerCase())
  return [...people]
    .map(([key, login]) => {
      const counts = countBy(byPerson.get(key) ?? [], (s) => s.category)
      const row = ids.map((id) => counts.get(id) ?? 0)
      const max = Math.max(0, ...row)
      return {
        login,
        total: row.reduce((a, b) => a + b, 0),
        counts: row,
        top: max === 0 ? [] : ids.filter((_, i) => row[i] === max),
      }
    })
    .sort((a, b) => b.total - a.total || nameOf(a.login).localeCompare(nameOf(b.login)))
}

export interface WeekBucket {
  /** The week's Monday, "YYYY-MM-DD" (America/New_York). */
  weekStart: string
  count: number
  manual: number
}

/** The Monday of a date key's week. */
export function mondayOf(dateKey: string): string {
  return addDaysToDateKey(dateKey, -((weekdayOf(dateKey) + 6) % 7))
}

/**
 * Shames per week (Monday to Sunday, team time), from the first shame's week through the
 * week of `now`, with empty weeks included so gaps show. Empty when there are no shames.
 */
export function weeklyCounts(file: ShameFile, now: Date): WeekBucket[] {
  if (file.shames.length === 0) return []
  const weekOf = (s: ShameEntry) => mondayOf(zonedDateKey(new Date(s.at)))
  const weeks = file.shames.map(weekOf)
  const first = weeks.reduce((a, b) => (b < a ? b : a))
  const last = [mondayOf(zonedDateKey(now)), ...weeks].reduce((a, b) => (b > a ? b : a))
  const buckets: WeekBucket[] = []
  for (let week = first; week <= last; week = addDaysToDateKey(week, 7)) {
    buckets.push({ weekStart: week, count: 0, manual: 0 })
  }
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]))
  file.shames.forEach((s, i) => {
    const bucket = buckets[index.get(weeks[i])!]
    bucket.count++
    if (s.type === 'manual') bucket.manual++
  })
  return buckets
}

/** The newest `limit` shames, newest first. */
export function recentShames(file: ShameFile, limit: number): ShameEntry[] {
  return [...file.shames].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit)
}

export interface ShameSummary {
  total: number
  manual: number
  automatic: number
  /** People shamed at least once. */
  people: number
}

export function shameSummary(file: ShameFile): ShameSummary {
  const manual = file.shames.filter((s) => s.type === 'manual').length
  return {
    total: file.shames.length,
    manual,
    automatic: file.shames.length - manual,
    people: new Set(file.shames.map((s) => s.login.toLowerCase())).size,
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const group = groups.get(k)
    if (group) group.push(item)
    else groups.set(k, [item])
  }
  return groups
}

function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return counts
}
