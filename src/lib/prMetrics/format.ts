import { TEAM_TIME_ZONE } from '../teamTime'

const generatedFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: TEAM_TIME_ZONE,
})

/** "Nov 5, 2026" for a `generatedAt` ISO instant, in the team's time zone. */
export function formatGeneratedAt(generatedAt: string): string {
  return generatedFormat.format(new Date(generatedAt))
}

// Calendar dates are formatted as UTC midnight in UTC, so the day never shifts.
const dayFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function dayOf(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return dayFormat.format(new Date(Date.UTC(year, month - 1, day)))
}

/** "Oct 21 – Dec 3" for an iteration's inclusive "YYYY-MM-DD" dates. */
export function formatIterationDates(start: string, end: string): string {
  return `${dayOf(start)} – ${dayOf(end)}`
}
