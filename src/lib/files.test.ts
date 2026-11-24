import { describe, expect, it } from 'vitest'
import { fileKind } from './files'

describe('fileKind', () => {
  it.each([
    ['application/vnd.google-apps.document', 'doc'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'doc'],
    ['application/vnd.google-apps.presentation', 'slides'],
    ['application/vnd.ms-powerpoint', 'slides'],
    ['application/vnd.google-apps.spreadsheet', 'sheet'],
    ['text/csv', 'sheet'],
    ['application/pdf', 'pdf'],
    ['image/png', 'other'],
    ['', 'other'],
  ])('%s → %s', (mimeType, kind) => {
    expect(fileKind(mimeType)).toBe(kind)
  })
})
