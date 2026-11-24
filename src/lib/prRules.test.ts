import { describe, expect, it } from 'vitest'
import { FOCUS_AREA_LABELS } from '../config/process'
import { PR_METRICS_RULES } from '../config/prMetrics'
import {
  changesUi,
  expectedBase,
  hasFocusAreaLabel,
  hasPrMedia,
  isOverSize,
  prSize,
  requiredApprovals,
  targetsCorrectBase,
  ticketFromBranch,
} from './prRules'

describe('hasPrMedia (a photo or video in the description)', () => {
  it.each([
    ['a GitHub upload', 'Demo:\n\nhttps://github.com/user-attachments/assets/1b2c3d4e-aaaa\n'],
    ['a Markdown image', '![screenshot](https://example.com/shot.png)'],
    ['an <img> tag', '<img width="400" alt="shot" src="https://x.test/a" />'],
    ['a .png link', 'Before: https://example.com/before.PNG'],
    ['an .mp4 link', 'See [demo](https://example.com/clips/demo.mp4)'],
    ['a .webm file with a query string', 'https://cdn.example.com/demo.webm?token=1'],
    ['YouTube', 'Walkthrough: https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['a youtu.be short link', 'https://youtu.be/dQw4w9WgXcQ'],
    ['Loom', 'Loom: https://www.loom.com/share/0123456789abcdef'],
    ['Google Drive', 'https://drive.google.com/file/d/abc123/view?usp=sharing'],
    ['a <video> tag', '<video src="https://x.test/v"></video>'],
  ])('finds %s', (_label, body) => {
    expect(hasPrMedia(body)).toBe(true)
  })

  it.each([
    ['an empty body', ''],
    ['no body', null],
    ['text only', 'Fixes the clock font size. Tested on the tablet.'],
    ['a word ending in mp4-ish text', 'We compared mp4 and webm formats in the notes.'],
    ['a YouTube channel link (not a video)', 'https://www.youtube.com/@dawnteam'],
    ['a Loom homepage link', 'https://www.loom.com/pricing'],
  ])('rejects %s', (_label, body) => {
    expect(hasPrMedia(body)).toBe(false)
  })
})

describe('requiredApprovals', () => {
  it('needs one approval into canary and two from canary into main', () => {
    expect(requiredApprovals('121-clock-font', 'canary')).toBe(1)
    expect(requiredApprovals('canary', 'main')).toBe(2)
  })
})

describe('ticketFromBranch', () => {
  it('reads the issue number a feature branch starts with', () => {
    expect(ticketFromBranch('121-caregiver-feature-slug')).toBe(121)
    expect(ticketFromBranch('feature/clock')).toBeNull()
    expect(ticketFromBranch('121')).toBeNull()
  })
})

describe('focus-area labels', () => {
  it('match the PR metrics focus-area experts', () => {
    expect([...FOCUS_AREA_LABELS].sort()).toEqual(Object.keys(PR_METRICS_RULES.focusOwners).sort())
  })

  it('are matched case-insensitively', () => {
    expect(hasFocusAreaLabel(['bug', 'staff member'])).toBe(true)
    expect(hasFocusAreaLabel(['bug', 'documentation'])).toBe(false)
  })
})

describe('changesUi', () => {
  it('is true for a UI label or UI files outside tests', () => {
    expect(changesUi(['Frontend'], [])).toBe(true)
    expect(changesUi([], ['caregiver/src/Clock.tsx'])).toBe(true)
    expect(changesUi([], ['caregiver/src/Clock.test.tsx', 'server/main.go'])).toBe(false)
  })
})

describe('PR size', () => {
  it('leaves out docs, tests, lockfiles and images, like the PR Size metric', () => {
    const size = prSize([
      { path: 'server/clock.go', additions: 300, deletions: 100 },
      { path: 'server/clock_test.go', additions: 900, deletions: 0 },
      { path: 'package-lock.json', additions: 4000, deletions: 10 },
      { path: 'README.md', additions: 20, deletions: 2 },
    ])
    expect(size).toEqual({ lines: 400, files: 1 })
    expect(isOverSize(size)).toBe(false)
    expect(isOverSize({ lines: 751, files: 1 })).toBe(true)
    expect(isOverSize({ lines: 10, files: 16 })).toBe(true)
  })
})

describe('base branch rule (feature → canary → main)', () => {
  it.each([
    ['feature/clock-font', 'canary', true],
    ['fix-weather-icon', 'canary', true],
    ['canary', 'main', true],
    ['feature/clock-font', 'main', false], // skips canary
    ['canary', 'canary', false],
    ['main', 'canary', false], // nothing merges out of main
    ['main', 'main', false],
    ['feature/x', 'release', false],
  ])('%s → %s is %s', (head, base, ok) => {
    expect(targetsCorrectBase(head, base)).toBe(ok)
  })

  it('names the expected base', () => {
    expect(expectedBase('feature/x')).toBe('canary')
    expect(expectedBase('canary')).toBe('main')
    expect(expectedBase('main')).toBeNull()
  })
})
