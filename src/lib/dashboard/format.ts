import { businessHoursBetween } from '../businessTime'
import { meetingDateKey, meetingEnd, meetingStart, type Meeting } from '../meetings'
import {
  TEAM_TIME_ZONE,
  addDaysToDateKey,
  daysBetweenKeys,
  zonedDateKey,
  zonedHour,
} from '../teamTime'

/*
 * Labels for the Developer dashboard. Everything is in the team's time zone
 * (America/New_York), wherever the browser is.
 */

const LOCALE = 'en-US'

/** "Good morning" (5am–noon), "Good afternoon" (noon–5pm), else "Good evening". */
export function greeting(now = new Date()): string {
  const hour = zonedHour(now)
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** "Ada Lovelace" → "Ada"; falls back to the login when there's no name. */
export function firstName(user: { name: string; login: string }): string {
  return user.name.trim().split(/\s+/)[0] || user.login
}

/** Calendar dates format as themselves, whatever the browser's zone. */
const keyFormat = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function keyToUtcDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** "Mon, Oct 12" for a "YYYY-MM-DD" key. */
export function formatDateKey(key: string): string {
  return keyFormat.format(keyToUtcDate(key))
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "Due Mon, Oct 12 · 4 business days left" (or "Due today"). */
export function deadlineDueLabel(endDate: string, daysLeft: number, now = new Date()): string {
  const today = zonedDateKey(now)
  if (endDate === today) return 'Due today'
  const left = daysLeft === 0 ? 'no business days left' : `${plural(daysLeft, 'business day')} left`
  return `Due ${formatDateKey(endDate)} · ${left}`
}

/** How far into the deadline today is: day number (1-based) and the elapsed fraction. */
export function deadlineProgress(
  startDate: string,
  endDate: string,
  now = new Date(),
): { day: number; totalDays: number; fraction: number } {
  const totalDays = daysBetweenKeys(startDate, endDate) + 1
  const day = Math.min(totalDays, Math.max(1, daysBetweenKeys(startDate, zonedDateKey(now)) + 1))
  return { day, totalDays, fraction: totalDays > 0 ? day / totalDays : 0 }
}

/** "35m", "5h", "1d 3h": business time (Mon–Fri) since `since`, 1d = 24 business hours. */
export function formatBusinessWait(since: string | Date, now = new Date()): string {
  const hours = businessHoursBetween(new Date(since), now)
  if (hours < 1) return `${Math.max(1, Math.floor(hours * 60))}m`
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = Math.floor(hours / 24)
  const rest = Math.floor(hours - days * 24)
  return rest > 0 ? `${days}d ${rest}h` : `${days}d`
}

/** "just now", "2 min ago", "3 h ago". */
export function updatedAgo(fetchedAt: number, now = Date.now()): string {
  const minutes = Math.floor((now - fetchedAt) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} h ago`
}

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: TEAM_TIME_ZONE,
})

/** "Today", "Tomorrow", or "Wed, Sep 30", by the meeting's date in America/New_York. */
export function meetingDayLabel(meeting: Meeting, now = new Date()): string {
  const key = meetingDateKey(meeting)
  const today = zonedDateKey(now)
  if (key === today) return 'Today'
  if (key === addDaysToDateKey(today, 1)) return 'Tomorrow'
  return formatDateKey(key)
}

/** "5:00 – 6:15 PM", "11:30 AM – 12:15 PM", or "All day". */
export function meetingTimeRange(meeting: Meeting): string {
  if (meeting.allDay) return 'All day'
  const start = timeFormat.formatToParts(meetingStart(meeting))
  const end = timeFormat.format(meetingEnd(meeting))
  const period = (parts: Intl.DateTimeFormatPart[]) =>
    parts.find((p) => p.type === 'dayPeriod')?.value
  const endPeriod = period(timeFormat.formatToParts(meetingEnd(meeting)))
  // Drop the start's AM/PM when both ends share it: "5:00 – 6:15 PM".
  const startText =
    period(start) === endPeriod
      ? start
          .filter((p) => p.type !== 'dayPeriod')
          .map((p) => p.value)
          .join('')
          .trim()
      : start.map((p) => p.value).join('')
  return `${startText} – ${end}`
}

export function isHappeningNow(meeting: Meeting, now = new Date()): boolean {
  const t = now.getTime()
  return meetingStart(meeting).getTime() <= t && t < meetingEnd(meeting).getTime()
}

/** "dawn-app#58": the repo's name (without the org) and the number. */
export function repoRef(item: { repo: string; number: number }): string {
  return `${item.repo.split('/').pop()}#${item.number}`
}
