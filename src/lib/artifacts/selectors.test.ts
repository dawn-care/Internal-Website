import { describe, expect, it } from 'vitest'
import { mockArtifacts } from './mock'
import {
  artifactSourceUrl,
  diagramViewerUrl,
  findArtifact,
  organizeArtifacts,
  recentArtifacts,
  resolveArtifactImage,
  resolveArtifactLink,
  searchArtifacts,
  sectionByPath,
} from './selectors'
import type { ArtifactDoc } from './types'

const SOURCE = {
  url: 'https://github.com/dawn-care/Artifacts',
  rawUrl: 'https://raw.githubusercontent.com/dawn-care/Artifacts',
  branch: 'main',
}

function doc(path: string, extra: Partial<ArtifactDoc> = {}): ArtifactDoc {
  return {
    path,
    kind: path.endsWith('.drawio') ? 'diagram' : 'markdown',
    slug: path,
    title: path,
    folder: path.includes('/') ? path.split('/')[0] : null,
    updatedAt: null,
    markdown: '',
    ...extra,
  }
}

describe('organizeArtifacts', () => {
  const docs = [
    doc('Feature List.md'),
    doc('Process Metrics.md'),
    doc('Project Synopsis.md'),
    doc('Requirements.md'),
    doc('diagrams/Domain Model.drawio'),
  ]
  const titles = (groups: ReturnType<typeof organizeArtifacts>) =>
    groups.map((g) => [g.title, g.docs.map((d) => d.path)])

  it('follows the README: "##" sections, links in order, the rest under "Other"', () => {
    const index = `# D.A.W.N. Artifacts

Everything the team publishes.

## Overview

Start here.

- [Project Synopsis](Project%20Synopsis.md)

## Requirements

1. [Requirements](./Requirements.md#functional)
2. [Feature List](Feature%20List.md) and again [the list](Feature%20List.md)

## Design

| Artifact | About |
| --- | --- |
| [Domain Model](diagrams/Domain%20Model.drawio) | The data model |

## Empty

- [Gone](Deleted.md)
- [GitHub](https://github.com)
`
    const groups = organizeArtifacts(docs, index)
    expect(titles(groups)).toEqual([
      ['Overview', ['Project Synopsis.md']],
      ['Requirements', ['Requirements.md', 'Feature List.md']],
      ['Design', ['diagrams/Domain Model.drawio']],
      ['Other', ['Process Metrics.md']],
    ])
    expect(groups[0].description).toBe('Start here.')
    expect(groups[1].description).toBeNull()
    expect(sectionByPath(groups).get('Feature List.md')).toBe('Requirements')
  })

  it('keeps links before the first section in an untitled group', () => {
    const groups = organizeArtifacts(docs, '- [Synopsis](Project%20Synopsis.md)')
    expect(titles(groups)[0]).toEqual([null, ['Project Synopsis.md']])
  })

  it('falls back to folders without a README, or when it links to nothing', () => {
    // Root files are "Documents" next to folders; folder names are capitalized.
    const byFolder = [
      [
        'Documents',
        ['Feature List.md', 'Process Metrics.md', 'Project Synopsis.md', 'Requirements.md'],
      ],
      ['Diagrams', ['diagrams/Domain Model.drawio']],
    ]
    expect(titles(organizeArtifacts(docs, null))).toEqual(byFolder)
    expect(titles(organizeArtifacts(docs, '# Hi\n\nNo links here.'))).toEqual(byFolder)
  })

  it('leaves root files untitled when there are no folders', () => {
    const rootOnly = docs.filter((d) => !d.path.includes('/'))
    expect(titles(organizeArtifacts(rootOnly, null))).toEqual([[null, rootOnly.map((d) => d.path)]])
  })
})

describe('diagramViewerUrl', () => {
  it('points the diagrams.net viewer at the raw file', () => {
    const url = diagramViewerUrl(
      SOURCE,
      doc('diagrams/Domain Model.drawio', { title: 'Domain Model' }),
    )
    const [query, file] = url.split('#U')
    expect(query).toMatch(/^https:\/\/viewer\.diagrams\.net\/\?/)
    expect(query).toContain('title=Domain%20Model')
    expect(query).not.toContain('lightbox=1')
    expect(decodeURIComponent(file)).toBe(
      'https://raw.githubusercontent.com/dawn-care/Artifacts/main/diagrams/Domain%20Model.drawio',
    )
    expect(diagramViewerUrl(SOURCE, doc('a.drawio'), { lightbox: true })).toContain('lightbox=1')
  })
})

describe('resolveArtifactLink', () => {
  const from = doc('02 Design/Architecture.md')
  const slugs = new Map([
    ['Feature List.md', 'feature-list'],
    ['02 Design/Architecture.md', 'design/architecture'],
  ])
  const resolve = (href: string) => resolveArtifactLink(href, from, slugs, SOURCE)

  it('turns links to other documents into site links, keeping the heading', () => {
    expect(resolve('../Feature%20List.md#carepartner-tablet')).toEqual({
      kind: 'internal',
      to: '/artifacts/feature-list#carepartner-tablet',
    })
  })

  it('opens other repo files on GitHub', () => {
    expect(resolve('../diagrams/Domain%20Model.drawio')).toEqual({
      kind: 'external',
      href: 'https://github.com/dawn-care/Artifacts/blob/main/diagrams/Domain%20Model.drawio',
    })
  })

  it('keeps anchors and safe external links, and drops unsafe ones', () => {
    expect(resolve('#scope')).toEqual({ kind: 'anchor', href: '#scope' })
    expect(resolve('https://rit.edu')).toEqual({ kind: 'external', href: 'https://rit.edu' })
    expect(resolve('javascript:alert(1)')).toEqual({ kind: 'none' })
    expect(resolve('../../outside.md')).toEqual({ kind: 'none' })
  })
})

describe('resolveArtifactImage', () => {
  it('serves listed repo images through /api and allows https images', () => {
    const from = doc('02 Design/Architecture.md')
    const assets = new Set(['diagrams/model.png'])
    expect(resolveArtifactImage('../diagrams/model.png', from, assets)).toBe(
      '/api/artifacts?asset=diagrams%2Fmodel.png',
    )
    expect(resolveArtifactImage('missing.png', from, assets)).toBeNull()
    expect(resolveArtifactImage('https://x.test/a.png', from, assets)).toBe('https://x.test/a.png')
    expect(resolveArtifactImage('data:image/png;base64,AA', from, assets)).toBeNull()
  })
})

describe('artifactSourceUrl', () => {
  it('encodes each path segment', () => {
    expect(artifactSourceUrl(SOURCE, '02 Design/A & B.md')).toBe(
      'https://github.com/dawn-care/Artifacts/blob/main/02%20Design/A%20%26%20B.md',
    )
  })
})

describe('selectors on the mock data', () => {
  const { documents } = mockArtifacts()

  it('finds documents by slug', () => {
    expect(findArtifact(documents, 'design/architecture')?.title).toBe('Architecture')
    expect(findArtifact(documents, 'nope')).toBeNull()
  })

  it('searches every word, title matches first, with a snippet', () => {
    const results = searchArtifacts('feature list', documents)
    expect(results[0].doc.title).toBe('Feature List')
    expect(searchArtifacts('kiosk zebra', documents)).toEqual([])
    const [hit] = searchArtifacts('captions', documents)
    expect(hit.snippet?.match.toLowerCase()).toBe('captions')
  })

  it('orders recent documents by last update', () => {
    expect(recentArtifacts(documents, 2).map((d) => d.title)).toEqual([
      'Project Synopsis',
      'Domain Model',
    ])
  })
})
