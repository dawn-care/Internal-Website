/*
 * The /shame slash command, shared by api/discord.ts and scripts/register-discord-command.mjs.
 * No imports, so the plain-Node registration script can load it with type stripping.
 *
 * The categories, reason limit and endorsement count mirror CATEGORIES, REASON_MAX and
 * ENDORSEMENTS_NEEDED in dawn-care/DAWN's .github/scripts/shame/rules.mjs, which re-checks
 * every manual-shame dispatch. Ids are stored in metrics/shame.json: never rename one.
 */

export const SHAME_CATEGORIES = {
  reviews: 'Reviews',
  follow_through: 'Follow-through',
  pr_size: 'PR size',
  sleep: 'Sleep',
  meetings: 'Meetings',
  deadlines: 'Deadlines',
  broke_something: 'Broke something',
  communication: 'Communication',
  other: 'Other',
} as const

export type ShameCategory = keyof typeof SHAME_CATEGORIES

export function isShameCategory(value: unknown): value is ShameCategory {
  return typeof value === 'string' && Object.hasOwn(SHAME_CATEGORIES, value)
}

/** Longest reason DAWN accepts. */
export const REASON_MAX = 300

/** Endorsements needed from teammates other than the shamer and the person shamed. */
export const ENDORSEMENTS_NEEDED = 2

/** A /shame stops taking endorsements this long after it was posted. */
export const ENDORSE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Discord's application command JSON (PUT /applications/{id}/commands). */
export const SHAME_COMMAND = {
  name: 'shame',
  type: 1, // CHAT_INPUT
  description: `Shame a teammate. It counts once ${ENDORSEMENTS_NEEDED} other teammates endorse it.`,
  contexts: [0], // servers only, so every interaction carries a member
  integration_types: [0], // installed to the server, not to a user
  options: [
    { type: 6, name: 'user', description: 'Who to shame', required: true },
    {
      type: 3,
      name: 'category',
      description: 'What for',
      required: true,
      choices: Object.entries(SHAME_CATEGORIES).map(([value, name]) => ({ name, value })),
    },
    {
      type: 3,
      name: 'reason',
      description: 'Why (anyone mentioned here is not pinged)',
      required: true,
      min_length: 1,
      max_length: REASON_MAX,
    },
  ],
}
