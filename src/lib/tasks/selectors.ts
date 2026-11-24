import { parseLocalDate, toDateKey } from '../drive/parse'
import type { Task, TeamMember } from './types'

/*
 * Pure task selectors. Dates are compared as "YYYY-MM-DD" keys in local time, so a GitHub
 * calendar date is never shifted by a UTC conversion.
 */

/** Days from today (inclusive) that count as "due soon". */
export const DUE_SOON_DAYS = 3
/** "Due this week" = due in the next 7 days, today included. */
export const THIS_WEEK_DAYS = 7

export function addDaysKey(today: Date, days: number): string {
  return toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days))
}

/** A task's "Done by" as a local Date (midnight), for display. */
export function doneByDate(task: Task): Date | null {
  return task.doneBy ? parseLocalDate(task.doneBy) : null
}

export const isDone = (task: Task) => task.statusKey === 'done'
export const isOpen = (task: Task) => !isDone(task)
export const isBlocked = (task: Task) => task.statusKey === 'blocked'

export function isOverdue(task: Task, today = new Date()): boolean {
  return isOpen(task) && task.doneBy !== undefined && task.doneBy < toDateKey(today)
}

/** Open, and due today or within the next DUE_SOON_DAYS days. Overdue tasks don't count. */
export function isDueSoon(task: Task, today = new Date()): boolean {
  if (!isOpen(task) || !task.doneBy) return false
  return task.doneBy >= toDateKey(today) && task.doneBy <= addDaysKey(today, DUE_SOON_DAYS)
}

export const selectOverdue = (tasks: Task[], today = new Date()) =>
  tasks.filter((t) => isOverdue(t, today))

export const selectDueSoon = (tasks: Task[], today = new Date()) =>
  tasks.filter((t) => isDueSoon(t, today))

export const selectBlocked = (tasks: Task[]) => tasks.filter(isBlocked)

export function isAssignedTo(task: Task, login: string): boolean {
  const lower = login.toLowerCase()
  return task.assignees.some((a) => a.login.toLowerCase() === lower)
}

export const selectMine = (tasks: Task[], login: string) =>
  tasks.filter((t) => isAssignedTo(t, login))

/** P0 before P1 before P2; no priority last. */
export function comparePriority(a: Task, b: Task): number {
  if (a.priority === b.priority) return 0
  if (a.priority === undefined) return 1
  if (b.priority === undefined) return -1
  return a.priority.localeCompare(b.priority, 'en', { numeric: true })
}

/** By "Done by" (undated last), then Priority (P0 first), then title. */
export function compareByDoneBy(a: Task, b: Task): number {
  if (a.doneBy !== b.doneBy) {
    if (a.doneBy === undefined) return 1
    if (b.doneBy === undefined) return -1
    return a.doneBy < b.doneBy ? -1 : 1
  }
  return comparePriority(a, b) || a.title.localeCompare(b.title)
}

/** Blocked first, then by "Done by". */
export function compareBlockedFirst(a: Task, b: Task): number {
  return Number(isBlocked(b)) - Number(isBlocked(a)) || compareByDoneBy(a, b)
}

export interface DueGroups {
  overdue: Task[]
  thisWeek: Task[]
  later: Task[]
  noDate: Task[]
  done: Task[]
}

/** The "My tasks" buckets, each sorted by "Done by" then Priority. */
export function groupByDue(tasks: Task[], today = new Date()): DueGroups {
  const groups: DueGroups = { overdue: [], thisWeek: [], later: [], noDate: [], done: [] }
  const todayKey = toDateKey(today)
  const weekEnd = addDaysKey(today, THIS_WEEK_DAYS - 1)
  for (const task of tasks) {
    if (isDone(task)) groups.done.push(task)
    else if (!task.doneBy) groups.noDate.push(task)
    else if (task.doneBy < todayKey) groups.overdue.push(task)
    else if (task.doneBy <= weekEnd) groups.thisWeek.push(task)
    else groups.later.push(task)
  }
  for (const list of Object.values(groups)) list.sort(compareByDoneBy)
  return groups
}

export interface AssigneeGroup {
  /** The org member, or a stand-in for an assignee outside the org. Null = unassigned. */
  member: TeamMember | null
  tasks: Task[]
}

/**
 * One group per team member (even with no tasks), then any assignees outside the team,
 * then unassigned tasks (only if there are any). Tasks within a group: Blocked first.
 */
export function groupByAssignee(tasks: Task[], team: TeamMember[]): AssigneeGroup[] {
  const groups = new Map<string, AssigneeGroup>()
  for (const member of team) groups.set(member.login.toLowerCase(), { member, tasks: [] })
  const unassigned: Task[] = []

  for (const task of tasks) {
    if (task.assignees.length === 0) unassigned.push(task)
    for (const a of task.assignees) {
      const key = a.login.toLowerCase()
      let group = groups.get(key)
      if (!group) {
        group = {
          member: { id: a.login, login: a.login, name: a.login, avatarUrl: a.avatarUrl },
          tasks: [],
        }
        groups.set(key, group)
      }
      group.tasks.push(task)
    }
  }

  const result = [...groups.values()]
  if (unassigned.length > 0) result.push({ member: null, tasks: unassigned })
  for (const group of result) group.tasks.sort(compareBlockedFirst)
  return result
}

export interface Totals {
  estimateHours: number
  /** Tasks with no Estimate. */
  unestimated: number
}

export function sumTotals(tasks: Task[]): Totals {
  return tasks.reduce<Totals>(
    (sum, t) => ({
      estimateHours: sum.estimateHours + (t.estimateHours ?? 0),
      unestimated: sum.unestimated + (t.estimateHours === undefined ? 1 : 0),
    }),
    { estimateHours: 0, unestimated: 0 },
  )
}

export interface TaskFilters {
  /** Option names; "" = any. */
  type: string
  status: string
  priority: string
  showDone: boolean
}

export const DEFAULT_FILTERS: TaskFilters = {
  type: '',
  status: '',
  priority: '',
  showDone: false,
}

/**
 * Applies the Tasks page filters. Done tasks are hidden unless "Show Done" is on or the
 * Status filter asks for them.
 */
export function applyFilters(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter(
    (t) =>
      (!filters.type || t.type === filters.type) &&
      (!filters.status || t.status === filters.status) &&
      (!filters.priority || t.priority === filters.priority) &&
      (filters.showDone || filters.status !== '' || isOpen(t)),
  )
}

/** Where "Open in GitHub" goes: the issue/PR itself, or the project board for drafts. */
export function githubLink(task: Task, projectUrl: string): { href: string; label: string } {
  if (task.url) {
    const what = task.kind === 'pr' ? 'pull request' : 'issue'
    return { href: task.url, label: `Open ${what} #${task.number} in GitHub` }
  }
  return { href: projectUrl, label: 'Open the project board in GitHub (draft)' }
}
