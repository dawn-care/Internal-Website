import { MOCK_USER } from '../auth/mock'
import { toDateKey } from '../drive/parse'
import type {
  Assignee,
  StatusKey,
  StatusOption,
  Task,
  TaskMeta,
  TasksResponse,
  TeamMember,
} from './types'

/*
 * Fake /api/tasks data for VITE_TASKS_MOCK=true. Dates are relative to today, so there's
 * always an overdue task and something due soon. Covers: drafts, issues and a PR; every board
 * column; a Blocked item; and an item with no Estimate.
 */

const PROJECT_URL = 'https://github.com/orgs/dawn-team/projects/1'
const REPO = 'dawn-team/dawn-app'

function dayKey(today: Date, offset: number): string {
  return toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset))
}

/** Name, key, and the color each option has on the real board. */
const STATUSES: [string, StatusKey, string][] = [
  ['Product Backlog', 'productBacklog', 'GREEN'],
  // The real board puts the deadline in the column name.
  ['Active Backlog (DEADLINE 12-16-26)', 'activeBacklog', 'BLUE'],
  ['In progress', 'inProgress', 'YELLOW'],
  ['In review', 'inReview', 'PURPLE'],
  ['Done', 'done', 'ORANGE'],
  ['Blocked', 'blocked', 'RED'],
]

const options = (names: string[], prefix: string) =>
  names.map((name) => ({ id: `${prefix}_${name.replace(/\W/g, '')}`, name }))

const TEAM: TeamMember[] = [
  { id: 'U_me', login: MOCK_USER.login, name: MOCK_USER.name, avatarUrl: '' },
  { id: 'U_rb', login: 'river-b', name: 'River Bennett', avatarUrl: '' },
  { id: 'U_sk', login: 'sam-k', name: 'Sam Kowalski', avatarUrl: '' },
  { id: 'U_pn', login: 'priya-n', name: 'Priya Natarajan', avatarUrl: '' },
]

const person = (login: string): Assignee => ({
  login,
  avatarUrl: TEAM.find((m) => m.login === login)?.avatarUrl ?? '',
})

const ME = MOCK_USER.login

export function createMockTasks(today = new Date()): TasksResponse {
  let n = 0
  const task = (fields: Partial<Task> & Pick<Task, 'title'> & { key?: StatusKey }): Task => {
    n += 1
    const { key = 'activeBacklog', ...rest } = fields
    const kind = rest.kind ?? 'draft'
    const number = 40 + n
    return {
      itemId: `PVTI_mock${n}`,
      contentId: `${kind === 'draft' ? 'DI' : kind === 'pr' ? 'PR' : 'I'}_mock${n}`,
      kind,
      assignees: [],
      status: STATUSES.find(([, k]) => k === key)![0],
      statusKey: key,
      updatedAt: new Date(today.getTime() - n * 3_600_000).toISOString(),
      ...(kind === 'draft'
        ? {}
        : {
            url: `https://github.com/${REPO}/${kind === 'pr' ? 'pull' : 'issues'}/${number}`,
            repo: REPO,
            number,
          }),
      ...rest,
    }
  }

  const tasks: Task[] = [
    // Mine
    task({
      title: 'Wire the morning greeting to the caregiver schedule',
      kind: 'issue',
      labels: [
        { name: 'enhancement', color: 'a2eeef' },
        { name: 'greeting', color: 'f2b84b' },
      ],
      key: 'inProgress',
      assignees: [person(ME)],
      type: 'Dev',
      priority: 'P0',
      size: 'M',
      estimateHours: 6,
      doneBy: dayKey(today, -2),
    }),
    task({
      title: 'Large-print weather card: contrast pass',
      kind: 'issue',
      labels: [
        { name: 'accessibility', color: '5319e7' },
        { name: 'blocked-by-design', color: 'd73a4a' },
      ],
      key: 'blocked',
      assignees: [person(ME), person('priya-n')],
      type: 'Dev',
      priority: 'P1',
      size: 'S',
      estimateHours: 4,
      doneBy: dayKey(today, 1),
    }),
    task({
      title: 'Draft usability test script for St. Ann’s visit',
      key: 'inReview',
      assignees: [person(ME)],
      type: 'Docs',
      priority: 'P1',
      size: 'S',
      estimateHours: 3,
      doneBy: dayKey(today, 3),
    }),
    task({
      title: 'Update the Deadline 2 retrospective notes',
      key: 'activeBacklog',
      assignees: [person(ME)],
      type: 'Admin',
      priority: 'P2',
      size: 'XS',
      estimateHours: 1,
      doneBy: dayKey(today, 9),
    }),
    task({
      title: 'Research tablet kiosk mode options',
      key: 'activeBacklog',
      assignees: [person(ME)],
      type: 'Dev',
      size: 'M',
    }),
    task({
      title: 'Add “today is” date banner',
      kind: 'pr',
      labels: [{ name: 'ui', color: 'ffffff' }],
      key: 'done',
      assignees: [person(ME)],
      type: 'Dev',
      priority: 'P1',
      size: 'S',
      estimateHours: 2,
      doneBy: dayKey(today, -1),
    }),
    // Teammates
    task({
      title: 'Caregiver photo upload: resize on device',
      kind: 'issue',
      key: 'inProgress',
      assignees: [person('river-b')],
      type: 'Dev',
      priority: 'P0',
      size: 'L',
      estimateHours: 10,
      doneBy: dayKey(today, 2),
    }),
    task({
      title: 'Offline cache for the daily schedule',
      kind: 'issue',
      key: 'blocked',
      assignees: [person('sam-k')],
      type: 'Dev',
      priority: 'P1',
      size: 'M',
      estimateHours: 8,
      doneBy: dayKey(today, 5),
    }),
    task({
      title: 'Write the accessibility section of the design doc',
      key: 'activeBacklog',
      assignees: [person('priya-n')],
      type: 'Docs',
      priority: 'P2',
      size: 'S',
      estimateHours: 4,
      doneBy: dayKey(today, 8),
    }),
    task({
      title: 'Schedule the sponsor demo',
      key: 'done',
      assignees: [person('sam-k')],
      type: 'Admin',
      priority: 'P1',
      size: 'XS',
      estimateHours: 1,
      doneBy: dayKey(today, -3),
    }),
    task({
      title: 'Spike: text-to-speech voices on the beta tablets',
      key: 'activeBacklog',
      type: 'Dev',
      size: 'S',
      doneBy: dayKey(today, 6),
    }),
    // Waiting in Active Backlog for someone to pick it up.
    task({
      title: 'Night-mode color tokens',
      key: 'activeBacklog',
      assignees: [person('river-b')],
      type: 'Dev',
      priority: 'P2',
      size: 'S',
    }),
    // Finished earlier
    task({
      title: 'Set up CI for the tablet app',
      kind: 'issue',
      key: 'done',
      assignees: [person('sam-k')],
      type: 'Dev',
      priority: 'P0',
      size: 'M',
      estimateHours: 6,
      doneBy: dayKey(today, -8),
    }),
    task({
      title: 'Requirements review with the coach',
      key: 'done',
      assignees: [person(ME)],
      type: 'Admin',
      priority: 'P1',
      size: 'S',
      doneBy: dayKey(today, -10),
    }),
    // Later: Product Backlog
    task({
      title: 'Family message inbox',
      kind: 'issue',
      key: 'productBacklog',
      assignees: [person(ME)],
      type: 'Dev',
      priority: 'P1',
      size: 'L',
      doneBy: dayKey(today, 20),
    }),
    task({
      title: 'Explore medication reminders',
      key: 'productBacklog',
      type: 'Dev',
      size: 'XL',
    }),
  ]

  const statuses: StatusOption[] = STATUSES.map(([name, key, color]) => ({
    id: `S_${key}`,
    name,
    key,
    color,
  }))
  const meta: TaskMeta = {
    projectUrl: PROJECT_URL,
    issueRepository: REPO,
    hasEstimate: true,
    statuses,
    priorities: options(['P0', 'P1', 'P2'], 'PR'),
    sizes: options(['XS', 'S', 'M', 'L', 'XL'], 'SZ'),
    types: options(['Dev', 'Docs', 'Admin'], 'T'),
  }
  return { tasks, hiddenCount: 0, meta, team: TEAM }
}
