import { describe, expect, it } from 'vitest'
import { mockArtifacts } from './mock'
import {
  artifactSourceUrl,
  findArtifact,
  recentArtifacts,
  resolveArtifactImage,
  resolveArtifactLink,
  searchArtifacts,
} from './selectors'
import type { ArtifactDoc } from './types'

const SOURCE = { url: 'https://github.com/dawn-care/Artifacts', branch: 'main' }

function doc(path: string, extra: Partial<ArtifactDoc> = {}): ArtifactDoc {
  return { path, slug: path, title: path, folder: null, updatedAt: null, markdown: '', ...extra }
}

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
      'Feature List',
    ])
  })
})
