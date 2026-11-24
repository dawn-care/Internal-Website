import type { DriveFile, FeedItem, Meeting } from './types'

const FEED_FILENAME = /^(\d{4}-\d{2}-\d{2})\s+(.+?)\s*$/

/**
 * Parses "YYYY-MM-DD" as a local calendar date (midnight local time), so it never shifts
 * a day in time zones west of UTC the way `new Date("2026-09-29")` does.
 * Returns null for impossible dates like 2026-02-30.
 */
export function parseLocalDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(year, month - 1, day)
  const valid =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return valid ? date : null
}

/** "YYYY-MM-DD" for a Date's local calendar day. */
export function toDateKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

function normalizeSuffix(suffix: string): string {
  return suffix.trim().replace(/\s+/g, ' ').toLowerCase()
}

export interface FeedMatcher {
  key: string
  suffix: string
}

/**
 * Matches "YYYY-MM-DD <Suffix>" against the feeds sharing a folder. The suffix match is
 * case-insensitive and whitespace-tolerant but otherwise exact, so "Agenda (1)" or
 * "Agenda copy" don't match. There is no fallback to modifiedTime: no match means null.
 */
export function classifyFeedFile(file: DriveFile, feeds: readonly FeedMatcher[]): FeedItem | null {
  const match = FEED_FILENAME.exec(file.name)
  if (!match) return null

  const date = parseLocalDate(match[1])
  if (!date) return null

  const suffix = normalizeSuffix(match[2])
  const feed = feeds.find((f) => normalizeSuffix(f.suffix) === suffix)
  return feed ? { file, date, sourceKey: feed.key } : null
}

/**
 * Pairs agendas and 4Ups that share a date. A date with only one of the two still yields
 * a Meeting. If a date has duplicates, the most recently modified file wins.
 * Returned newest first.
 */
export function groupMeetings(
  agendas: readonly FeedItem[],
  fourUps: readonly FeedItem[],
): Meeting[] {
  const byDate = new Map<string, Meeting>()

  function add(item: FeedItem, slot: 'agenda' | 'fourUp') {
    const key = toDateKey(item.date)
    const meeting = byDate.get(key) ?? { date: item.date }
    const existing = meeting[slot]
    if (!existing || item.file.modifiedTime > existing.file.modifiedTime) meeting[slot] = item
    byDate.set(key, meeting)
  }

  agendas.forEach((item) => add(item, 'agenda'))
  fourUps.forEach((item) => add(item, 'fourUp'))

  return [...byDate.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
}
