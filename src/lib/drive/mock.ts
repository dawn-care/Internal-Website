import { MOCK_AGENDAS_FOLDER_ID } from '../../config/sources'
import { FOLDER_MIME_TYPE, type ListFolderOptions } from './client'
import { toDateKey } from './parse'
import type { DriveFile } from './types'

/*
 * Fake Drive folder listings, served in place of the API when there's no API key.
 * Dates are relative to today so there are always past and upcoming meetings.
 */

const DOC = 'application/vnd.google-apps.document'
const SLIDES = 'application/vnd.google-apps.presentation'

const MEETING_WEEKDAY = 2 // Tuesday

function daysFromToday(days: number): Date {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

/** A modifiedTime that's never in the future. */
function modifiedAt(date: Date): string {
  return new Date(Math.min(date.getTime(), Date.now())).toISOString()
}

function mockFile(id: string, name: string, mimeType: string, modified: Date): DriveFile {
  return {
    id: `mock-${id}`,
    name,
    mimeType,
    modifiedTime: modifiedAt(modified),
    webViewLink: `https://drive.google.com/file/d/mock-${id}/view`,
    iconLink: `https://drive-thirdparty.googleusercontent.com/16/type/${mimeType}`,
  }
}

function agendasFolder(): DriveFile[] {
  const today = daysFromToday(0)
  const lastMeeting = -((today.getDay() - MEETING_WEEKDAY + 7) % 7)
  const files: DriveFile[] = []

  // Eight weekly meetings: six past (or today), two upcoming.
  for (let week = -5; week <= 2; week++) {
    const offset = lastMeeting + week * 7
    const meetingDay = daysFromToday(offset)
    const key = toDateKey(meetingDay)
    // Filenames vary a little in case and spacing, like real uploads do.
    const agendaName = week === -2 ? `${key} agenda` : `${key} Agenda`
    const fourUpName = week === -1 ? `${key}  4Up ` : `${key} 4Up`

    files.push(mockFile(`agenda-${key}`, agendaName, DOC, daysFromToday(offset - 1)))
    // The furthest-out meeting has an agenda but no 4Up yet.
    if (week < 2) files.push(mockFile(`4up-${key}`, fourUpName, SLIDES, daysFromToday(offset - 1)))
  }

  // Junk that must be ignored.
  files.push(
    mockFile('notes', 'notes', DOC, daysFromToday(-3)),
    mockFile('template', 'Agenda template', DOC, daysFromToday(-90)),
    mockFile('dupe', `${toDateKey(daysFromToday(lastMeeting))} Agenda (1)`, DOC, daysFromToday(-2)),
  )
  return files
}

function folderContents(folderId: string): DriveFile[] {
  return folderId === MOCK_AGENDAS_FOLDER_ID ? agendasFolder() : []
}

/** Same contract as client.listFolder, backed by the fake listings above. */
export async function mockListFolder(
  folderId: string,
  { foldersOnly, filesOnly }: ListFolderOptions = {},
): Promise<DriveFile[]> {
  return folderContents(folderId).filter((f) => {
    const isFolder = f.mimeType === FOLDER_MIME_TYPE
    return foldersOnly ? isFolder : filesOnly ? !isFolder : true
  })
}
