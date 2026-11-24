import { describe, expect, it } from 'vitest'
import {
  compareArtifactPaths,
  compareOrderedNames,
  folderForPath,
  isPublishablePath,
  parseOrderedName,
  resolveRepoPath,
  slugForPath,
  titleForPath,
  uniqueSlugs,
} from './paths'

describe('parseOrderedName', () => {
  it('splits off the "NN " prefix as the order', () => {
    expect(parseOrderedName('02 Requirements')).toEqual({ order: 2, name: 'Requirements' })
    expect(parseOrderedName(' 10   Final Report.md ')).toEqual({
      order: 10,
      name: 'Final Report.md',
    })
  })

  it('gives unprefixed names order Infinity and needs whitespace after the number', () => {
    expect(parseOrderedName('Misc')).toEqual({ order: Number.POSITIVE_INFINITY, name: 'Misc' })
    expect(parseOrderedName('3D Models').order).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('compareOrderedNames', () => {
  it('orders by prefix number, then name, with unprefixed names last', () => {
    const names = ['Zeta', '10 Ten', '02 Two', 'Alpha', '01 One', '02 Also Two']
    expect([...names].sort(compareOrderedNames)).toEqual([
      '01 One',
      '02 Also Two',
      '02 Two',
      '10 Ten',
      'Alpha',
      'Zeta',
    ])
  })
})

describe('document names', () => {
  it('derives title, folder and slug from the path', () => {
    expect(titleForPath('Feature List.md')).toBe('Feature List')
    expect(titleForPath('02 Design/01 Architecture & Data.md')).toBe('Architecture & Data')
    expect(folderForPath('Feature List.md')).toBeNull()
    expect(folderForPath('02 Design/sub/Doc.md')).toBe('Design')
    expect(slugForPath('Functional and Non-Functional Requirements.md')).toBe(
      'functional-and-non-functional-requirements',
    )
    expect(slugForPath('02 Design/01 Architecture & Data.md')).toBe('design/architecture-data')
  })

  it('makes colliding slugs unique', () => {
    expect([...uniqueSlugs(['A b.md', 'a-b.md', '01 A B.md']).values()]).toEqual([
      'a-b',
      'a-b-2',
      'a-b-3',
    ])
  })

  it('hides dot and underscore paths', () => {
    expect(isPublishablePath('Feature List.md')).toBe(true)
    expect(isPublishablePath('.github/PULL_REQUEST_TEMPLATE.md')).toBe(false)
    expect(isPublishablePath('_drafts/Idea.md')).toBe(false)
  })
})

describe('compareArtifactPaths', () => {
  it('lists root files first, then folders in "NN" order', () => {
    const paths = ['02 Design/B.md', 'Zed.md', '01 Plan/02 Two.md', '01 Plan/01 One.md', 'Alpha.md']
    expect([...paths].sort(compareArtifactPaths)).toEqual([
      'Alpha.md',
      'Zed.md',
      '01 Plan/01 One.md',
      '01 Plan/02 Two.md',
      '02 Design/B.md',
    ])
  })
})

describe('resolveRepoPath', () => {
  it('resolves relative and encoded links against the document folder', () => {
    expect(resolveRepoPath('Project Synopsis.md', 'Feature%20List.md')).toBe('Feature List.md')
    expect(resolveRepoPath('02 Design/A.md', '../diagrams/Model.png')).toBe('diagrams/Model.png')
    expect(resolveRepoPath('02 Design/A.md', './B.md')).toBe('02 Design/B.md')
    expect(resolveRepoPath('02 Design/A.md', '/Feature List.md')).toBe('Feature List.md')
  })

  it('refuses links that climb out of the repo', () => {
    expect(resolveRepoPath('A.md', '../secret.md')).toBeNull()
  })
})
