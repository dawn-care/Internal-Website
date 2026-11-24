import { describe, expect, it } from 'vitest'
import { addDays, parseDateKey, todayKey } from './dates.js'

describe('parseDateKey', () => {
  it('keeps GitHub calendar dates as-is (no UTC shift)', () => {
    expect(parseDateKey('2026-09-29')).toBe('2026-09-29')
    expect(parseDateKey('2026-01-01')).toBe('2026-01-01')
  })

  it('takes the date part of a timestamp', () => {
    expect(parseDateKey('2026-09-29T00:00:00Z')).toBe('2026-09-29')
  })

  it.each(['2026-02-30', '2026-13-01', '29/09/2026', '', null, 42])('rejects %j', (value) => {
    expect(parseDateKey(value)).toBeUndefined()
  })
})

describe('todayKey', () => {
  it('uses the team time zone, not UTC', () => {
    // 11:30pm on Sep 29 in New York is already Sep 30 in UTC.
    const lateEvening = new Date('2026-09-30T03:30:00Z')
    expect(todayKey(lateEvening)).toBe('2026-09-29')
    expect(todayKey(lateEvening, 'UTC')).toBe('2026-09-30')
  })

  it('handles the day DST ends', () => {
    expect(todayKey(new Date('2026-11-01T04:30:00Z'))).toBe('2026-11-01')
  })
})

describe('addDays', () => {
  it('does calendar math across months, years, and DST', () => {
    expect(addDays('2026-09-29', 14)).toBe('2026-10-13')
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08')
    expect(addDays('2026-10-25', 14)).toBe('2026-11-08')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
