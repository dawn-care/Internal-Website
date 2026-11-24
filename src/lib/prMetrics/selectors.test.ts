import { describe, expect, it } from 'vitest'
import { mockPrMetrics } from './mock'
import {
  balanceAxisMax,
  balancePeople,
  balancePoints,
  barTone,
  breadthRows,
  formatPercent,
  formatRange,
  heatLevel,
  myPrMetrics,
  peopleIn,
  selectScope,
  combineIterations,
  balanceFlags,
  ENTIRE_PROJECT,
  shareStatus,
  sizeByAuthor,
  sizeSegments,
  speedBars,
  summaryTiles,
} from './selectors'

const file = mockPrMetrics()
const current = selectScope(file, 'Deadline 2')!

describe('selectScope', () => {
  it('defaults to the entire project, and picks an iteration by name', () => {
    expect(selectScope(file, null)?.name).toBe(ENTIRE_PROJECT)
    expect(selectScope(file, 'Deadline 1')?.name).toBe('Deadline 1')
    expect(current.name).toBe('Deadline 2')
  })

  it('falls back to the entire project for an unknown name, undefined with no iterations', () => {
    expect(selectScope(file, 'Deadline 9')?.name).toBe(ENTIRE_PROJECT)
    expect(selectScope({ ...file, iterations: [] }, null)).toBeUndefined()
  })
})

describe('combineIterations', () => {
  const all = combineIterations(file)!

  it('spans every iteration and adds up the counts', () => {
    expect(all).toMatchObject({ start: '2026-09-27', end: '2026-12-03', prCount: 102 })
    expect(all.size).toMatchObject({ total: 102, within: 69, overBoth: 9 })
    expect(all.size.byAuthor.saltyypanda).toEqual({ within: 16, total: 28 })
    expect(all.speed).toEqual({ total: 102, reviewedWithin: 89, mergedWithin: 87 })
    expect(all.coverage).toMatchObject({ labeled: 100, covered: 96, unlabeled: 2 })
    expect(all.coverage.misses).toHaveLength(4)
  })

  it('recomputes balance from the totals', () => {
    expect(all.balance.evenShare).toBe(17)
    expect(all.balance.min).toBeCloseTo(6.8)
    expect(all.balance.max).toBeCloseTo(27.2)
    expect(all.balance.people.saltyypanda).toEqual({
      authored: 28,
      reviewed: 13,
      flags: ['over-authoring'],
    })
    expect(all.balance.people.dgh4572.flags).toEqual(['over-reviewing'])
    expect(all.balance.people.ha4716.flags).toEqual([])
  })

  it('recomputes breadth labels covered from the summed counts', () => {
    expect(all.breadth.people['ashton-michelstein']).toMatchObject({
      counts: { Caregiver: 3, 'UI/UX': 0, Server: 17 },
      labelsCovered: 5,
    })
  })
})

describe('balanceFlags', () => {
  it('checks authored and reviewed separately, so one person can get two flags', () => {
    expect(balanceFlags(2, 20, 4, 16)).toEqual(['under-authoring', 'over-reviewing'])
    expect(balanceFlags(4, 16, 4, 16)).toEqual([])
  })
})

describe('shares', () => {
  it('formats rounded percents and a dash for nothing to measure', () => {
    expect(formatPercent(53, 60)).toBe('88%')
    expect(formatPercent(0, 0)).toBe('—')
  })

  it('compares unrounded against the target', () => {
    expect(shareStatus(9, 10, 0.9)).toBe('met')
    expect(shareStatus(53, 60, 0.9)).toBe('not-met')
    expect(shareStatus(0, 0, 0.9)).toBe('no-data')
  })

  it('tones bars good at target, warn within 10 points, bad below that', () => {
    expect(barTone(9, 10, 0.9)).toBe('good')
    expect(barTone(53, 60, 0.9)).toBe('warn')
    expect(barTone(39, 60, 0.9)).toBe('bad')
  })
})

describe('summaryTiles (mock Deadline 2)', () => {
  const tiles = Object.fromEntries(summaryTiles(file, current).map((t) => [t.key, t]))

  it('matches the expected numbers and statuses', () => {
    expect(tiles.size).toMatchObject({ value: '65%', status: 'not-met' })
    expect(tiles.speed).toMatchObject({ value: '88% / 88%', status: 'not-met' })
    expect(tiles.balance).toMatchObject({ value: '3 of 6', status: 'not-met' })
    expect(tiles.coverage).toMatchObject({ value: '98%', status: 'met' })
    expect(tiles.breadth).toMatchObject({ value: '6 of 6', status: 'met' })
  })

  it('reports no data for an iteration without PRs', () => {
    const empty = {
      ...current,
      prCount: 0,
      size: { ...current.size, total: 0, within: 0 },
      speed: { total: 0, reviewedWithin: 0, mergedWithin: 0 },
      coverage: { ...current.coverage, labeled: 0, covered: 0 },
    }
    for (const tile of summaryTiles(file, empty)) expect(tile.status).toBe('no-data')
  })
})

describe('PR size', () => {
  it('lists the four segments, summing to the total', () => {
    const segs = sizeSegments(current.size)
    expect(segs.map((s) => s.count)).toEqual([39, 12, 3, 6])
    expect(segs.reduce((n, s) => n + s.count, 0)).toBe(current.size.total)
  })

  it('lists authors in team order with their status, skipping people with no PRs', () => {
    const rows = sizeByAuthor(
      { ...current.size, byAuthor: { ...current.size.byAuthor, dgh4572: { within: 0, total: 0 } } },
      file.team,
      0.9,
    )
    expect(rows.map((r) => r.login)).toEqual([
      'saltyypanda',
      'AJBruno23',
      'ashton-michelstein',
      'jmd9268',
      'ha4716',
    ])
    expect(rows[0]).toMatchObject({ within: 9, total: 17, status: 'not-met' })
  })
})

describe('speedBars', () => {
  it('labels both bars from the targets', () => {
    const bars = speedBars(current.speed, file.targets)
    expect(bars.map((b) => b.label)).toEqual([
      'Reviewed within 24 business hours',
      'Merged within 48 business hours',
    ])
    expect(bars.map((b) => `${b.count}/${b.total} ${b.percent}`)).toEqual([
      '53/60 88%',
      '53/60 88%',
    ])
  })
})

describe('balance', () => {
  const rows = balancePeople(current.balance, file.team)

  it('carries the flags for Tess, Haroon and David', () => {
    const flagged = Object.fromEntries(
      rows.filter((r) => r.flags.length).map((r) => [r.login, r.flags]),
    )
    expect(flagged).toEqual({
      saltyypanda: ['over-authoring'],
      ha4716: ['under-authoring'],
      dgh4572: ['over-reviewing'],
    })
  })

  it('stacks people who share a point', () => {
    const shared = balancePoints(rows).find((p) => p.logins.length > 1)
    expect(shared).toMatchObject({ authored: 12, reviewed: 12, logins: ['AJBruno23', 'jmd9268'] })
    expect(shared?.flagged).toBe(false)
    expect(balancePoints(rows)).toHaveLength(5)
  })

  it('rounds the axis up past every value and formats the range', () => {
    expect(balanceAxisMax(current.balance, rows)).toBe(20)
    expect(formatRange(current.balance)).toBe('4–16')
    expect(formatRange(file.iterations[0].balance)).toBe('2.8–11.2')
  })
})

describe('breadthRows', () => {
  it('orders counts by breadth label and judges 5+ labels', () => {
    const rows = breadthRows(current.breadth, file.breadthLabels, file.team, 5)
    expect(rows.every((r) => r.passes)).toBe(true)
    expect(rows.find((r) => r.login === 'ha4716')).toMatchObject({
      counts: [3, 4, 9, 13, 10, 0],
      labelsCovered: 5,
    })
    const d1 = breadthRows(file.iterations[0].breadth, file.breadthLabels, file.team, 5)
    expect(d1.filter((r) => !r.passes).map((r) => r.login)).toEqual(['ashton-michelstein'])
  })

  it('counts a missing label as 0', () => {
    const [row] = breadthRows(
      { people: { a: { counts: { Server: 2 }, labelsCovered: 1 } } },
      ['Caregiver', 'Server'],
      ['a'],
      1,
    )
    expect(row).toMatchObject({ counts: [0, 2], labelsCovered: 1, passes: true })
  })

  it('keeps heat between 0.12 and 0.55, 0 for none', () => {
    expect(heatLevel(0, 10)).toBe(0)
    expect(heatLevel(1, 10)).toBeGreaterThanOrEqual(0.12)
    expect(heatLevel(10, 10)).toBeCloseTo(0.55)
  })
})

describe('peopleIn', () => {
  it('keeps team order and appends unknown logins by name', () => {
    expect(peopleIn(['b', 'a', 'z'], { a: 1, b: 1, y: 1, x: 1 })).toEqual(['b', 'a', 'x', 'y'])
  })
})

describe('myPrMetrics (the dashboard widget)', () => {
  it('picks the current deadline and one person’s numbers, login case-insensitively', () => {
    const it = file.iterations.find((i) => i.current)!
    const login = file.team[0]
    const mine = myPrMetrics(file, login.toUpperCase())!
    expect(mine.login).toBe(login)
    expect(mine.iteration).toEqual({ name: it.name, start: it.start, end: it.end, current: true })
    expect(mine).toMatchObject({
      authored: it.balance.people[login].authored,
      reviewed: it.balance.people[login].reviewed,
      min: it.balance.min,
      max: it.balance.max,
      flags: it.balance.people[login].flags,
      sizeWithin: it.size.byAuthor[login].within,
      sizeTotal: it.size.byAuthor[login].total,
      areasTarget: file.targets.breadth.minLabels,
    })
    // Every breadth label is either covered or missing, in display order.
    expect([...mine.areasCovered, ...mine.areasMissing].sort()).toEqual(
      [...file.breadthLabels].sort(),
    )
    for (const label of mine.areasCovered) {
      expect(it.breadth.people[login].counts[label]).toBeGreaterThan(0)
    }
  })

  it('is null for someone not on the team', () => {
    expect(myPrMetrics(file, 'not-a-member')).toBeNull()
  })

  it('falls back to the latest deadline when none is current', () => {
    const past = { ...file, iterations: file.iterations.map((i) => ({ ...i, current: false })) }
    expect(myPrMetrics(past, file.team[0])?.iteration.name).toBe(
      file.iterations[file.iterations.length - 1].name,
    )
  })
})
