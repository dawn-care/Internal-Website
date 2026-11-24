import { startOfDay } from './dates'
import type { Meeting } from './drive'

export type MeetingFilter = 'all' | 'agendas' | 'fourUps'

/** Upcoming (today or later, soonest first) and past (most recent first). */
export function splitMeetings(
  meetings: Meeting[],
  today = new Date(),
): { upcoming: Meeting[]; past: Meeting[] } {
  const cutoff = startOfDay(today).getTime()
  const upcoming = meetings
    .filter((m) => m.date.getTime() >= cutoff)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const past = meetings
    .filter((m) => m.date.getTime() < cutoff)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
  return { upcoming, past }
}

/**
 * Meetings that have something to show for the filter. Under "agendas", upcoming meetings
 * without one are kept so their card can say the agenda isn't posted yet.
 */
export function filterMeetings(
  meetings: Meeting[],
  show: MeetingFilter,
  today = new Date(),
): Meeting[] {
  const cutoff = startOfDay(today).getTime()
  switch (show) {
    case 'agendas':
      return meetings.filter((m) => m.agenda || m.date.getTime() >= cutoff)
    case 'fourUps':
      return meetings.filter((m) => m.fourUp)
    default:
      return meetings
  }
}

/** "YYYY-MM" for a date's local month. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** The distinct months that have meetings, newest first. */
export function meetingMonths(meetings: Meeting[]): { key: string; date: Date }[] {
  const byKey = new Map<string, Date>()
  for (const m of meetings) {
    const key = monthKey(m.date)
    if (!byKey.has(key)) byKey.set(key, new Date(m.date.getFullYear(), m.date.getMonth(), 1))
  }
  return [...byKey.entries()]
    .map(([key, date]) => ({ key, date }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}
