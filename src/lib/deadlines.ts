// Shared with /api (Node ESM): relative imports keep their .js extension.
import { DEADLINES, REFINEMENT_WINDOW_DAYS, type Deadline } from '../config/deadlines.js'
import { addDaysToDateKey } from './teamTime.js'

/*
 * Where today falls among the deadlines (src/config/deadlines.ts). Dates are "YYYY-MM-DD"
 * calendar keys in America/New_York, so plain string comparison orders them.
 */

export interface DeadlinePosition {
  /** The deadline containing today, else the next one to start; null when none is left. */
  deadline: Deadline | null
  /** True when today is inside `deadline`; false when it hasn't started yet. */
  active: boolean
  /**
   * The deadline that just ended, while its backlog refinement is due (the day after it
   * ends through REFINEMENT_WINDOW_DAYS later); else null.
   */
  justEnded: (Deadline & { refinementBy: string }) | null
}

export function deadlinePosition(
  today: string,
  deadlines: readonly Deadline[] = DEADLINES,
): DeadlinePosition {
  const sorted = [...deadlines].sort((a, b) => a.start.localeCompare(b.start))
  const current = sorted.find((d) => d.start <= today && today <= d.end)
  const next = current ?? sorted.find((d) => d.start > today) ?? null
  const ended = sorted.filter((d) => d.end < today).pop()
  const refinementBy = ended && addDaysToDateKey(ended.end, REFINEMENT_WINDOW_DAYS)
  return {
    deadline: next,
    active: Boolean(current),
    justEnded: ended && refinementBy && today <= refinementBy ? { ...ended, refinementBy } : null,
  }
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

const pad = (n: number) => String(n).padStart(2, '0')

function toKey(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return valid ? `${year}-${pad(month)}-${pad(day)}` : null
}

/**
 * The date the team wrote into a board column name, as "YYYY-MM-DD", or null when there is
 * none: "Active Backlog (DEADLINE 12-16-26)" → "2026-12-16". Understands 12-16-26, 12/16/2026,
 * 2026-12-16 and "Dec 16" (with or without a year; without one, `fallbackYear` is used).
 * Used only to warn when the board and src/config/deadlines.ts disagree.
 */
export function dateInName(name: string, fallbackYear: number): string | null {
  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(name)
  if (iso) return toKey(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  const us = /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/.exec(name)
  if (us) {
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3])
    return toKey(year, Number(us[1]), Number(us[2]))
  }
  const words = /\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i.exec(name)
  const month = words ? MONTHS.indexOf(words[1].toLowerCase()) + 1 : 0
  if (words && month > 0) {
    return toKey(words[3] ? Number(words[3]) : fallbackYear, month, Number(words[2]))
  }
  return null
}
