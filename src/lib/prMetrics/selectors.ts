import type {
  BalanceFlag,
  BalanceMetrics,
  BreadthMetrics,
  IterationMetrics,
  PrMetricsFile,
  PrMetricsTargets,
  SizeMetrics,
  SpeedMetrics,
} from './types'

/*
 * Pure view-model helpers for the PR metric widgets. The DAWN job does the counting; these
 * only pick, order, and judge numbers against the file's own targets.
 */

/** The picker's label for the whole-project scope, also its IterationMetrics name. */
export const ENTIRE_PROJECT = 'Entire project'

/**
 * What the cards show: the named iteration, or (no name, or an unknown one) every iteration
 * combined. Undefined when no iteration has started.
 */
export function selectScope(
  file: PrMetricsFile,
  name: string | null,
): IterationMetrics | undefined {
  return (
    (name ? file.iterations.find((it) => it.name === name) : undefined) ?? combineIterations(file)
  )
}

function sumBy<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((n, item) => n + pick(item), 0)
}

/** Sums per-login records of numbers across iterations. */
function sumRecords<T extends object>(records: Record<string, T>[]): Record<string, T> {
  const out: Record<string, Record<string, number>> = {}
  for (const record of records) {
    for (const [login, values] of Object.entries(record)) {
      const into = (out[login] ??= {})
      for (const [k, v] of Object.entries(values as Record<string, number>)) {
        into[k] = (into[k] ?? 0) + v
      }
    }
  }
  return out as Record<string, T>
}

/** Range flags for one person, the same rule the DAWN job applies per iteration. */
export function balanceFlags(
  authored: number,
  reviewed: number,
  min: number,
  max: number,
): BalanceFlag[] {
  const flags: BalanceFlag[] = []
  if (authored > max) flags.push('over-authoring')
  if (authored < min) flags.push('under-authoring')
  if (reviewed > max) flags.push('over-reviewing')
  if (reviewed < min) flags.push('under-reviewing')
  return flags
}

/**
 * Every iteration as one: counts add up exactly because each PR belongs to exactly one
 * iteration. Balance's even share and flags, and breadth's labels covered, are recomputed
 * from the totals with the file's own targets.
 */
export function combineIterations(file: PrMetricsFile): IterationMetrics | undefined {
  const its = file.iterations
  if (its.length === 0) return undefined
  const prCount = sumBy(its, (it) => it.prCount)
  const { minFactor, maxFactor } = file.targets.balance
  const evenShare = file.team.length > 0 ? prCount / file.team.length : 0
  const min = minFactor * evenShare
  const max = maxFactor * evenShare

  const totals = sumRecords(
    its.map((it) =>
      Object.fromEntries(
        Object.entries(it.balance.people).map(([login, p]) => [
          login,
          { authored: p.authored, reviewed: p.reviewed },
        ]),
      ),
    ),
  )
  const counts = sumRecords(
    its.map((it) =>
      Object.fromEntries(Object.entries(it.breadth.people).map(([login, p]) => [login, p.counts])),
    ),
  )

  return {
    name: ENTIRE_PROJECT,
    start: its[0].start,
    end: its[its.length - 1].end,
    current: false,
    prCount,
    size: {
      total: sumBy(its, (it) => it.size.total),
      within: sumBy(its, (it) => it.size.within),
      overLinesOnly: sumBy(its, (it) => it.size.overLinesOnly),
      overFilesOnly: sumBy(its, (it) => it.size.overFilesOnly),
      overBoth: sumBy(its, (it) => it.size.overBoth),
      byAuthor: sumRecords(its.map((it) => it.size.byAuthor)),
    },
    speed: {
      total: sumBy(its, (it) => it.speed.total),
      reviewedWithin: sumBy(its, (it) => it.speed.reviewedWithin),
      mergedWithin: sumBy(its, (it) => it.speed.mergedWithin),
    },
    balance: {
      evenShare,
      min,
      max,
      people: Object.fromEntries(
        Object.entries(totals).map(([login, p]) => [
          login,
          { ...p, flags: balanceFlags(p.authored, p.reviewed, min, max) },
        ]),
      ),
    },
    coverage: {
      labeled: sumBy(its, (it) => it.coverage.labeled),
      covered: sumBy(its, (it) => it.coverage.covered),
      unlabeled: sumBy(its, (it) => it.coverage.unlabeled),
      misses: its.flatMap((it) => it.coverage.misses),
    },
    breadth: {
      people: Object.fromEntries(
        Object.entries(counts).map(([login, c]) => [
          login,
          { counts: c, labelsCovered: file.breadthLabels.filter((l) => (c[l] ?? 0) > 0).length },
        ]),
      ),
    },
  }
}

/** n ÷ total, or null when there's nothing to divide. */
export function ratio(n: number, total: number): number | null {
  return total > 0 ? n / total : null
}

/** "65%" (rounded), or "—" with nothing to measure. */
export function formatPercent(n: number, total: number): string {
  const r = ratio(n, total)
  return r === null ? '—' : `${Math.round(r * 100)}%`
}

/** "90%" for a target share like 0.9. */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`
}

export type TargetStatus = 'met' | 'not-met' | 'no-data'

/** Met when n ÷ total reaches the target share. Compared unrounded: 89.6% is not 90%. */
export function shareStatus(n: number, total: number, target: number): TargetStatus {
  const r = ratio(n, total)
  if (r === null) return 'no-data'
  return r >= target ? 'met' : 'not-met'
}

/** Team logins in the file's order, then anyone else who shows up in `map`, by login. */
export function peopleIn(team: string[], map: Record<string, unknown>): string[] {
  const extra = Object.keys(map)
    .filter((login) => !team.includes(login))
    .sort((a, b) => a.localeCompare(b))
  return [...team.filter((login) => login in map), ...extra]
}

// ---- Summary ----

export type MetricKey = 'size' | 'speed' | 'balance' | 'coverage' | 'breadth'

export interface SummaryTile {
  key: MetricKey
  label: string
  /** The headline number, e.g. "65%". */
  value: string
  target: string
  status: TargetStatus
}

/** One tile per metric: the headline number, the target, and whether it was met. */
export function summaryTiles(file: PrMetricsFile, it: IterationMetrics): SummaryTile[] {
  const t = file.targets
  const speed = speedBars(it.speed, t)
  const balance = balancePeople(it.balance, file.team)
  const breadth = breadthRows(it.breadth, file.breadthLabels, file.team, t.breadth.minLabels)
  const balancePass = balance.filter((p) => p.flags.length === 0).length
  const breadthPass = breadth.filter((r) => r.passes).length
  const everyone = (pass: number, total: number): TargetStatus =>
    total === 0 ? 'no-data' : pass === total ? 'met' : 'not-met'
  const speedStatuses = speed.map((b) => b.status)

  return [
    {
      key: 'size',
      label: 'PR Size',
      value: formatPercent(it.size.within, it.size.total),
      target: `${formatShare(t.size.share)} with ≤ ${t.size.maxLines} lines and ≤ ${t.size.maxFiles} files`,
      status: shareStatus(it.size.within, it.size.total, t.size.share),
    },
    {
      key: 'speed',
      label: 'Review and Merge Time',
      value: speed.map((b) => b.percent).join(' / '),
      target: `${formatShare(t.speed.share)} reviewed in ${t.speed.firstReviewHours}h and merged in ${t.speed.mergeHours}h`,
      status: speedStatuses.includes('no-data')
        ? 'no-data'
        : speedStatuses.every((s) => s === 'met')
          ? 'met'
          : 'not-met',
    },
    {
      key: 'balance',
      label: 'Author and Review Balance',
      value: `${balancePass} of ${balance.length}`,
      target: `Everyone within ${formatRange(it.balance)} PRs authored and reviewed`,
      status: it.prCount === 0 ? 'no-data' : everyone(balancePass, balance.length),
    },
    {
      key: 'coverage',
      label: 'Focus-Area Coverage',
      value: formatPercent(it.coverage.covered, it.coverage.labeled),
      target: `${formatShare(t.coverage.share)} authored or reviewed by a focus-area expert`,
      status: shareStatus(it.coverage.covered, it.coverage.labeled, t.coverage.share),
    },
    {
      key: 'breadth',
      label: 'Breadth of Knowledge',
      value: `${breadthPass} of ${breadth.length}`,
      target: `Everyone on ${t.breadth.minLabels}+ focus areas`,
      status: it.prCount === 0 ? 'no-data' : everyone(breadthPass, breadth.length),
    },
  ]
}

// ---- 1. PR Size ----

export type SizeSegmentKey = 'within' | 'overLinesOnly' | 'overFilesOnly' | 'overBoth'

export interface SizeSegment {
  key: SizeSegmentKey
  label: string
  count: number
}

/** The four stacked-bar segments, in display order. */
export function sizeSegments(size: SizeMetrics): SizeSegment[] {
  return [
    { key: 'within', label: 'Within limits', count: size.within },
    { key: 'overLinesOnly', label: 'Over lines only', count: size.overLinesOnly },
    { key: 'overFilesOnly', label: 'Over files only', count: size.overFilesOnly },
    { key: 'overBoth', label: 'Over both', count: size.overBoth },
  ]
}

export interface AuthorSizeRow {
  login: string
  within: number
  total: number
  status: TargetStatus
}

/** Per-author share within limits, in team order; people with no PRs are left out. */
export function sizeByAuthor(size: SizeMetrics, team: string[], target: number): AuthorSizeRow[] {
  return peopleIn(team, size.byAuthor)
    .map((login) => ({ login, ...size.byAuthor[login] }))
    .filter((row) => row.total > 0)
    .map((row) => ({ ...row, status: shareStatus(row.within, row.total, target) }))
}

// ---- 2. Review and Merge Time ----

export interface SpeedBar {
  key: 'review' | 'merge'
  label: string
  count: number
  total: number
  percent: string
  status: TargetStatus
}

export function speedBars(speed: SpeedMetrics, targets: PrMetricsTargets): SpeedBar[] {
  const { firstReviewHours, mergeHours, share } = targets.speed
  const bar = (key: SpeedBar['key'], label: string, count: number): SpeedBar => ({
    key,
    label,
    count,
    total: speed.total,
    percent: formatPercent(count, speed.total),
    status: shareStatus(count, speed.total, share),
  })
  return [
    bar('review', `Reviewed within ${firstReviewHours} business hours`, speed.reviewedWithin),
    bar('merge', `Merged within ${mergeHours} business hours`, speed.mergedWithin),
  ]
}

// ---- 3. Author and Review Balance ----

const FLAG_LABELS: Record<BalanceFlag, string> = {
  'over-authoring': 'Over-authoring',
  'under-authoring': 'Under-authoring',
  'over-reviewing': 'Over-reviewing',
  'under-reviewing': 'Under-reviewing',
}

export function flagLabel(flag: BalanceFlag): string {
  return FLAG_LABELS[flag]
}

/** "4–16", or "2.8–11.2" when the range isn't whole. */
export function formatRange(balance: BalanceMetrics): string {
  const f = (n: number) => String(Math.round(n * 10) / 10)
  return `${f(balance.min)}–${f(balance.max)}`
}

export interface BalancePersonRow {
  login: string
  authored: number
  reviewed: number
  flags: BalanceFlag[]
}

export function balancePeople(balance: BalanceMetrics, team: string[]): BalancePersonRow[] {
  return peopleIn(team, balance.people).map((login) => ({ login, ...balance.people[login] }))
}

export interface BalancePoint {
  authored: number
  reviewed: number
  /** Everyone at this point, in team order (their names stack at one dot). */
  logins: string[]
  /** Anyone here is outside the target range. */
  flagged: boolean
}

/** People grouped by (authored, reviewed), so two people at one point share one dot. */
export function balancePoints(rows: BalancePersonRow[]): BalancePoint[] {
  const byKey = new Map<string, BalancePoint>()
  for (const row of rows) {
    const key = `${row.authored},${row.reviewed}`
    const point = byKey.get(key) ?? {
      authored: row.authored,
      reviewed: row.reviewed,
      logins: [],
      flagged: false,
    }
    point.logins.push(row.login)
    point.flagged ||= row.flags.length > 0
    byKey.set(key, point)
  }
  return [...byKey.values()]
}

/** A round axis maximum (multiple of 5) above every point and the range's top. */
export function balanceAxisMax(balance: BalanceMetrics, rows: BalancePersonRow[]): number {
  const top = Math.max(balance.max, ...rows.flatMap((r) => [r.authored, r.reviewed]))
  return Math.max(5, Math.ceil((top + 1) / 5) * 5)
}

// ---- 5. Breadth of Knowledge ----

export interface BreadthRow {
  login: string
  /** One per breadth label, in the file's label order. */
  counts: number[]
  labelsCovered: number
  passes: boolean
}

export function breadthRows(
  breadth: BreadthMetrics,
  labels: string[],
  team: string[],
  minLabels: number,
): BreadthRow[] {
  return peopleIn(team, breadth.people).map((login) => {
    const person = breadth.people[login]
    const counts = labels.map((label) => person.counts[label] ?? 0)
    const labelsCovered = counts.filter((n) => n > 0).length
    return { login, counts, labelsCovered, passes: labelsCovered >= minLabels }
  })
}

/**
 * Heatmap intensity for a count: 0 for none, else 0.12–0.55 scaled to the table's largest
 * count. Capped at 0.55 so ink text on the tinted cell keeps WCAG AA in both themes.
 */
export function heatLevel(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0
  return 0.12 + (0.43 * count) / maxCount
}

// ---- Bars ----

export type BarTone = 'good' | 'warn' | 'bad'

/** At or above target: good; within 10 points below: warn; further below: bad. */
export function barTone(n: number, total: number, target: number): BarTone {
  const r = ratio(n, total) ?? 0
  if (r >= target) return 'good'
  return r >= target - 0.1 ? 'warn' : 'bad'
}

// ---- The dashboard's "My PR metrics" ----

export interface MyPrMetrics {
  /** The deadline: the one containing the data's run date, else the latest. */
  iteration: { name: string; start: string; end: string; current: boolean }
  /** The login as it appears in the file. */
  login: string
  authored: number
  reviewed: number
  /** The fair-share band (Author and Review Balance), not rounded. */
  min: number
  max: number
  flags: BalanceFlag[]
  /** My authored PRs within the size limits. */
  sizeWithin: number
  sizeTotal: number
  /** Breadth of Knowledge: focus areas I've touched out of breadthLabels, and the target. */
  areasCovered: string[]
  areasMissing: string[]
  areasTarget: number
}

/**
 * One person's numbers for the current deadline, from the computed metrics. Null when the
 * person isn't on the team list, or no deadline has data yet.
 */
export function myPrMetrics(file: PrMetricsFile, login: string): MyPrMetrics | null {
  const it = file.iterations.find((i) => i.current) ?? file.iterations[file.iterations.length - 1]
  const me = file.team.find((l) => l.toLowerCase() === login.toLowerCase())
  if (!it || !me) return null
  const balance = it.balance.people[me] ?? { authored: 0, reviewed: 0, flags: [] }
  const size = it.size.byAuthor[me] ?? { within: 0, total: 0 }
  const counts = it.breadth.people[me]?.counts ?? {}
  return {
    iteration: { name: it.name, start: it.start, end: it.end, current: it.current },
    login: me,
    authored: balance.authored,
    reviewed: balance.reviewed,
    min: it.balance.min,
    max: it.balance.max,
    flags: balance.flags,
    sizeWithin: size.within,
    sizeTotal: size.total,
    areasCovered: file.breadthLabels.filter((label) => (counts[label] ?? 0) > 0),
    areasMissing: file.breadthLabels.filter((label) => !(counts[label] ?? 0)),
    areasTarget: file.targets.breadth.minLabels,
  }
}
