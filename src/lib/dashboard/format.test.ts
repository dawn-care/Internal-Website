import { describe, expect, it } from 'vitest'
import type { Meeting } from '../meetings'
import { zonedInstant } from '../teamTime'
import {
  firstName,
  formatBusinessWait,
  greeting,
  isHappeningNow,
  meetingDayLabel,
  meetingTimeRange,
  repoRef,
  deadlineDueLabel,
  deadlineProgress,
  updatedAgo,
} from './format'

// Wednesday 2026-09-30 in America/New_York.
const at = (hour: number, minute = 0, day = '2026-09-30') => zonedInstant(day, hour, minute)

function meeting(start: Date, end: Date, fields: Partial<Meeting> = {}): Meeting {
  return {
    id: 'm',
    title: 'Sponsor Meeting',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    kind: 'official',
    recurring: false,
    htmlLink: 'https://calendar.google.com/',
    ...fields,
  }
}

describe('greeting', () => {
  it.each([
    [4, 'Good evening'],
    [5, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [23, 'Good evening'],
  ])('at %i:00 in New York says %s', (hour, expected) => {
    expect(greeting(at(hour))).toBe(expected)
  })
})

describe('firstName', () => {
  it('uses the first word of the name, else the login', () => {
    expect(firstName({ name: 'Ada Lovelace', login: 'ada' })).toBe('Ada')
    expect(firstName({ name: '  ', login: 'ada' })).toBe('ada')
  })
})

describe('deadline labels', () => {
  it('says when the deadline is due and how many business days are left', () => {
    expect(deadlineDueLabel('2026-10-12', 9, at(10))).toBe('Due Mon, Oct 12 · 9 business days left')
    expect(deadlineDueLabel('2026-10-01', 1, at(10))).toBe('Due Thu, Oct 1 · 1 business day left')
    expect(deadlineDueLabel('2026-09-30', 1, at(10))).toBe('Due today')
  })

  it('counts the deadline day, clamped to the deadline', () => {
    expect(deadlineProgress('2026-09-28', '2026-10-11', at(10))).toEqual({
      day: 3,
      totalDays: 14,
      fraction: 3 / 14,
    })
    expect(deadlineProgress('2026-10-01', '2026-10-14', at(10)).day).toBe(1)
  })
})

describe('formatBusinessWait', () => {
  it('counts only Monday–Friday time', () => {
    expect(formatBusinessWait(at(9, 50), at(10))).toBe('10m')
    expect(formatBusinessWait(at(5), at(10))).toBe('5h')
    expect(formatBusinessWait(at(7, 0, '2026-09-29'), at(10))).toBe('1d 3h')
    // Friday 4pm → Monday 10am: 8h Friday + 10h Monday; the weekend doesn't count.
    expect(formatBusinessWait(at(16, 0, '2026-09-25'), at(10, 0, '2026-09-28'))).toBe('18h')
  })
})

describe('updatedAgo', () => {
  it('rounds down to minutes, then hours', () => {
    expect(updatedAgo(0, 30_000)).toBe('just now')
    expect(updatedAgo(0, 125_000)).toBe('2 min ago')
    expect(updatedAgo(0, 2 * 3_600_000 + 5)).toBe('2 h ago')
  })
})

describe('meeting labels', () => {
  it('names today and tomorrow in New York time', () => {
    const now = at(10)
    expect(meetingDayLabel(meeting(at(17), at(18, 15)), now)).toBe('Today')
    expect(meetingDayLabel(meeting(at(17, 0, '2026-10-01'), at(18, 0, '2026-10-01')), now)).toBe(
      'Tomorrow',
    )
    expect(meetingDayLabel(meeting(at(20, 0, '2026-10-05'), at(21, 0, '2026-10-05')), now)).toBe(
      'Mon, Oct 5',
    )
  })

  it('shares AM/PM across a range when it can', () => {
    // Intl puts a narrow no-break space before AM/PM.
    const range = (m: Meeting) => meetingTimeRange(m).replace(/\u202f/g, ' ')
    expect(range(meeting(at(17), at(18, 15)))).toBe('5:00 – 6:15 PM')
    expect(range(meeting(at(11, 30), at(12, 15)))).toBe('11:30 AM – 12:15 PM')
    expect(
      meetingTimeRange(
        meeting(at(0), at(0), { allDay: true, start: '2026-09-30', end: '2026-10-01' }),
      ),
    ).toBe('All day')
  })

  it('is happening from its start until (not including) its end', () => {
    const m = meeting(at(17), at(18, 15))
    expect(isHappeningNow(m, at(16, 59))).toBe(false)
    expect(isHappeningNow(m, at(17))).toBe(true)
    expect(isHappeningNow(m, at(18, 15))).toBe(false)
  })
})

describe('repoRef', () => {
  it('drops the org', () => {
    expect(repoRef({ repo: 'dawn-team/dawn-app', number: 58 })).toBe('dawn-app#58')
  })
})
