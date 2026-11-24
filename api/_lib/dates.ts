import { TEAM_TIME_ZONE } from './config.js'

/**
 * GitHub date and iteration fields are calendar dates ("YYYY-MM-DD"), not instants. They're
 * kept as date keys and compared as strings, so a server running in UTC never shifts them
 * a day. Only "today" depends on a time zone: the team's.
 */

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

/** "YYYY-MM-DD" if `value` is a real calendar date (GitHub may also send a full timestamp). */
export function parseDateKey(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const key = value.slice(0, 10)
  const match = DATE_KEY.exec(key)
  if (!match) return undefined
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return valid ? key : undefined
}

const keyFormatters = new Map<string, Intl.DateTimeFormat>()

/** Today's date key in `timeZone` (default: the team's). */
export function todayKey(now = new Date(), timeZone = TEAM_TIME_ZONE): string {
  let format = keyFormatters.get(timeZone)
  if (!format) {
    // en-CA formats dates as YYYY-MM-DD.
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    keyFormatters.set(timeZone, format)
  }
  return format.format(now)
}

/** Calendar arithmetic on a date key (UTC internally, so no DST surprises). */
export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}
