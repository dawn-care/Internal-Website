import { describe, expect, it } from 'vitest'
import { dateInName, deadlinePosition } from './deadlines'

const DEADLINES = [
  { name: 'Deadline 1', start: '2026-09-27', end: '2026-10-20' },
  { name: 'Deadline 2', start: '2026-10-21', end: '2026-12-03' },
  // A gap (winter break) before this one.
  { name: 'Deadline 3', start: '2027-01-20', end: '2027-02-15' },
]

describe('deadlinePosition', () => {
  it('finds the deadline containing today, both ends included', () => {
    expect(deadlinePosition('2026-09-27', DEADLINES)).toMatchObject({
      deadline: { name: 'Deadline 1' },
      active: true,
      justEnded: null,
    })
    expect(deadlinePosition('2026-10-20', DEADLINES).deadline?.name).toBe('Deadline 1')
  })

  it('flags backlog refinement for two days after a deadline ends', () => {
    const day1 = deadlinePosition('2026-10-21', DEADLINES)
    expect(day1).toMatchObject({ deadline: { name: 'Deadline 2' }, active: true })
    expect(day1.justEnded).toMatchObject({ name: 'Deadline 1', refinementBy: '2026-10-22' })
    expect(deadlinePosition('2026-10-22', DEADLINES).justEnded?.name).toBe('Deadline 1')
    expect(deadlinePosition('2026-10-23', DEADLINES).justEnded).toBeNull()
  })

  it('points at the next deadline during a gap', () => {
    expect(deadlinePosition('2026-12-20', DEADLINES)).toMatchObject({
      deadline: { name: 'Deadline 3' },
      active: false,
      justEnded: null,
    })
  })

  it('has nothing after the last deadline, or with none configured', () => {
    expect(deadlinePosition('2027-03-01', DEADLINES).deadline).toBeNull()
    expect(deadlinePosition('2026-10-01', [])).toEqual({
      deadline: null,
      active: false,
      justEnded: null,
    })
  })
})

describe('dateInName', () => {
  it.each([
    ['Active Backlog (DEADLINE 12-16-26)', '2026-12-16'],
    ['Active Backlog (12/16/2026)', '2026-12-16'],
    ['Active Backlog – 2026-12-16', '2026-12-16'],
    ['Active Backlog (Dec 16)', '2026-12-16'],
    ['Active Backlog (December 16th, 2027)', '2027-12-16'],
  ])('%s → %s', (name, key) => {
    expect(dateInName(name, 2026)).toBe(key)
  })

  it.each([['Active Backlog'], ['Active Backlog (DEADLINE TBD)'], ['Active Backlog (13-45-26)']])(
    'finds no date in %s',
    (name) => {
      expect(dateInName(name, 2026)).toBeNull()
    },
  )
})
