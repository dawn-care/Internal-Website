export interface DriveFile {
  id: string
  name: string
  mimeType: string
  /** ISO 8601 timestamp. */
  modifiedTime: string
  webViewLink: string
  iconLink: string
}

/** A file from a dated feed (agendas, 4Ups, later sprint artifacts). */
export interface FeedItem {
  file: DriveFile
  /** Local calendar date from the "YYYY-MM-DD" filename prefix (midnight local time). */
  date: Date
  sourceKey: string
}

/** An Agenda and/or 4Up sharing one date. */
export interface Meeting {
  date: Date
  agenda?: FeedItem
  fourUp?: FeedItem
}
