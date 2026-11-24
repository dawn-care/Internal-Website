import { describe, expect, it } from 'vitest'
import type { DriveFile, FeedItem, Meeting } from './drive'
import { parseLocalDate, toDateKey } from './drive/parse'
import { filterMeetings, meetingMonths, splitMeetings } from './selectors'

const TODAY = parseLocalDate('2026-09-29')!
const NOON_TODAY = new Date(2026, 8, 29, 12, 30)

function item(date: string, sourceKey: string): FeedItem {
  const file: DriveFile = {
    id: `${date}-${sourceKey}`,
    name: `${date} ${sourceKey}`,
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: '2026-09-01T00:00:00.000Z',
    webViewLink: '',
    iconLink: '',
  }
  return { file, date: parseLocalDate(date)!, sourceKey }
}

function meeting(date: string, { agenda = true, fourUp = true } = {}): Meeting {
  return {
    date: parseLocalDate(date)!,
    agenda: agenda ? item(date, 'agendas') : undefined,
    fourUp: fourUp ? item(date, 'fourUps') : undefined,
  }
}

const keys = (meetings: Meeting[]) => meetings.map((m) => toDateKey(m.date))

const MEETINGS = [
  meeting('2026-09-15'),
  meeting('2026-10-06', { fourUp: false }),
  meeting('2026-09-29'),
  meeting('2026-09-22', { agenda: false }),
  meeting('2026-10-13', { agenda: false }),
  meeting('2026-08-25'),
]

describe('splitMeetings', () => {
  it('puts today and later in upcoming (soonest first), earlier in past (latest first)', () => {
    const { upcoming, past } = splitMeetings(MEETINGS, TODAY)
    expect(keys(upcoming)).toEqual(['2026-09-29', '2026-10-06', '2026-10-13'])
    expect(keys(past)).toEqual(['2026-09-22', '2026-09-15', '2026-08-25'])
  })

  it('keeps a meeting dated today upcoming for the whole day', () => {
    expect(keys(splitMeetings(MEETINGS, NOON_TODAY).upcoming)[0]).toBe('2026-09-29')
  })
})

describe('filterMeetings', () => {
  it('keeps everything for "all"', () => {
    expect(filterMeetings(MEETINGS, 'all', TODAY)).toHaveLength(MEETINGS.length)
  })

  it('keeps meetings with agendas, plus upcoming ones still waiting for one', () => {
    expect(keys(filterMeetings(MEETINGS, 'agendas', TODAY))).toEqual([
      '2026-09-15',
      '2026-10-06',
      '2026-09-29',
      '2026-10-13',
      '2026-08-25',
    ])
  })

  it('keeps only meetings with a 4Up', () => {
    expect(keys(filterMeetings(MEETINGS, 'fourUps', TODAY))).toEqual([
      '2026-09-15',
      '2026-09-29',
      '2026-09-22',
      '2026-10-13',
      '2026-08-25',
    ])
  })
})

describe('meetingMonths', () => {
  it('lists distinct months, newest first', () => {
    expect(meetingMonths(MEETINGS).map((m) => m.key)).toEqual(['2026-10', '2026-09', '2026-08'])
  })
})
