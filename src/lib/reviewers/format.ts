import { TEAM_TIME_ZONE } from '../teamTime'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: TEAM_TIME_ZONE,
})

/** "Nov 5, 2026" for a `generatedAt` ISO instant. */
export function formatGeneratedAt(generatedAt: string): string {
  return dateFormat.format(new Date(generatedAt))
}
