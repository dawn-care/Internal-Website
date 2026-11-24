import { describe, expect, it } from 'vitest'
import { MOCK_AGENDAS_FOLDER_ID } from '../../config/sources'
import { mockListFolder } from './mock'
import {
  classifyFeedFile,
  groupMeetings,
  parseLocalDate,
  toDateKey,
  type FeedMatcher,
} from './parse'
import type { DriveFile, FeedItem } from './types'

const FEEDS: FeedMatcher[] = [
  { key: 'agendas', suffix: 'Agenda' },
  { key: 'fourUps', suffix: '4Up' },
]

function file(name: string, modifiedTime = '2026-09-01T12:00:00.000Z'): DriveFile {
  return {
    id: name,
    name,
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime,
    webViewLink: `https://drive.google.com/${encodeURIComponent(name)}`,
    iconLink: '',
  }
}

function item(date: string, sourceKey: string, modifiedTime?: string): FeedItem {
  return {
    file: file(`${date} ${sourceKey}`, modifiedTime),
    date: parseLocalDate(date)!,
    sourceKey,
  }
}

describe('parseLocalDate', () => {
  it('runs in a timezone west of UTC', () => {
    // Guards the tests below: in UTC they would pass even with UTC parsing.
    expect(new Date(2026, 8, 29).getTimezoneOffset()).toBeGreaterThan(0)
  })

  it('parses as a local calendar date, not UTC midnight', () => {
    const date = parseLocalDate('2026-09-29')!
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 8, 29])
    expect([date.getHours(), date.getMinutes()]).toEqual([0, 0])
    // The naive parse lands on Sep 28 here; ours must not.
    expect(new Date('2026-09-29').getDate()).toBe(28)
  })

  it('round-trips through toDateKey', () => {
    expect(toDateKey(parseLocalDate('2026-01-05')!)).toBe('2026-01-05')
  })

  it.each(['2026-02-30', '2026-13-01', '2026-9-29', 'not a date'])('rejects %s', (input) => {
    expect(parseLocalDate(input)).toBeNull()
  })
})

describe('classifyFeedFile', () => {
  it('matches each feed by suffix', () => {
    expect(classifyFeedFile(file('2026-09-29 Agenda'), FEEDS)?.sourceKey).toBe('agendas')
    expect(classifyFeedFile(file('2026-09-29 4Up'), FEEDS)?.sourceKey).toBe('fourUps')
  })

  it('returns the file and its local date', () => {
    const f = file('2026-09-29 Agenda')
    const result = classifyFeedFile(f, FEEDS)!
    expect(result.file).toBe(f)
    expect(toDateKey(result.date)).toBe('2026-09-29')
  })

  it.each(['2026-09-29 agenda', '2026-09-29 AGENDA', '2026-09-29 aGeNdA'])(
    'is case-insensitive: %j',
    (name) => {
      expect(classifyFeedFile(file(name), FEEDS)?.sourceKey).toBe('agendas')
    },
  )

  it.each([
    '2026-09-29   Agenda',
    '2026-09-29 Agenda   ',
    '2026-09-29\tAgenda',
    '2026-09-29  4up ',
  ])('tolerates extra whitespace: %j', (name) => {
    expect(classifyFeedFile(file(name), FEEDS)).not.toBeNull()
  })

  it('collapses internal whitespace in multi-word suffixes', () => {
    const feeds = [{ key: 'sprint', suffix: 'Sprint Review' }]
    expect(classifyFeedFile(file('2026-10-06 sprint   review'), feeds)?.sourceKey).toBe('sprint')
  })

  it.each([
    '2026-09-29 Agenda (1)',
    '2026-09-29 Agenda copy',
    'Copy of 2026-09-29 Agenda',
    '2026-09-29Agenda',
    '2026-09-29 Agendas',
    '2026-09-29 4Up.pdf',
    '2026-02-30 Agenda',
    '09-29-2026 Agenda',
    'Agenda',
    'notes',
  ])('rejects %j', (name) => {
    expect(classifyFeedFile(file(name), FEEDS)).toBeNull()
  })

  it('ignores files for feeds that are not in this folder', () => {
    expect(classifyFeedFile(file('2026-09-29 Agenda'), [FEEDS[1]])).toBeNull()
  })
})

describe('junk files in the mock Agendas folder', () => {
  it('are ignored, while every real agenda and 4Up is kept', async () => {
    const files = await mockListFolder(MOCK_AGENDAS_FOLDER_ID, { filesOnly: true })
    const items = files.map((f) => classifyFeedFile(f, FEEDS))
    const ignored = files.filter((_, i) => items[i] === null).map((f) => f.name)

    expect(ignored).toHaveLength(3)
    expect(ignored).toContain('notes')
    expect(ignored).toContain('Agenda template')
    expect(ignored.some((name) => name.endsWith('Agenda (1)'))).toBe(true)
    expect(items.filter((i) => i?.sourceKey === 'agendas')).toHaveLength(8)
    expect(items.filter((i) => i?.sourceKey === 'fourUps')).toHaveLength(7)
  })
})

describe('groupMeetings', () => {
  it('pairs an agenda and a 4Up with the same date', () => {
    const agenda = item('2026-09-29', 'agendas')
    const fourUp = item('2026-09-29', 'fourUps')
    const [meeting, ...rest] = groupMeetings([agenda], [fourUp])
    expect(rest).toHaveLength(0)
    expect(meeting.agenda).toBe(agenda)
    expect(meeting.fourUp).toBe(fourUp)
    expect(toDateKey(meeting.date)).toBe('2026-09-29')
  })

  it('still yields a meeting when a date has only one of the two', () => {
    const meetings = groupMeetings([item('2026-10-06', 'agendas')], [item('2026-09-22', 'fourUps')])
    expect(meetings).toHaveLength(2)
    expect(meetings[0].agenda).toBeDefined()
    expect(meetings[0].fourUp).toBeUndefined()
    expect(meetings[1].agenda).toBeUndefined()
    expect(meetings[1].fourUp).toBeDefined()
  })

  it('does not pair different dates, and sorts newest first', () => {
    const meetings = groupMeetings(
      [item('2026-09-15', 'agendas'), item('2026-09-29', 'agendas')],
      [item('2026-09-22', 'fourUps')],
    )
    expect(meetings.map((m) => toDateKey(m.date))).toEqual([
      '2026-09-29',
      '2026-09-22',
      '2026-09-15',
    ])
  })

  it('keeps the most recently modified file when a date has duplicates', () => {
    const older = item('2026-09-29', 'agendas', '2026-09-20T00:00:00.000Z')
    const newer = item('2026-09-29', 'agendas', '2026-09-28T00:00:00.000Z')
    expect(groupMeetings([newer, older], [])[0].agenda).toBe(newer)
    expect(groupMeetings([older, newer], [])[0].agenda).toBe(newer)
  })
})
