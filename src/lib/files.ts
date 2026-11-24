export type FileKind = 'doc' | 'slides' | 'sheet' | 'pdf' | 'other'

const KIND_BY_MIME: Record<string, FileKind> = {
  'application/vnd.google-apps.document': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
  'application/msword': 'doc',
  'application/vnd.google-apps.presentation': 'slides',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slides',
  'application/vnd.ms-powerpoint': 'slides',
  'application/vnd.google-apps.spreadsheet': 'sheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'sheet',
  'application/vnd.ms-excel': 'sheet',
  'text/csv': 'sheet',
  'application/pdf': 'pdf',
}

export function fileKind(mimeType: string): FileKind {
  return KIND_BY_MIME[mimeType] ?? 'other'
}

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  doc: 'Doc',
  slides: 'Slides',
  sheet: 'Sheet',
  pdf: 'PDF',
  other: 'File',
}
