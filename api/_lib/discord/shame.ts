import {
  ENDORSE_WINDOW_MS,
  ENDORSEMENTS_NEEDED,
  isShameCategory,
  REASON_MAX,
  SHAME_CATEGORIES,
  type ShameCategory,
} from './command.js'

/*
 * /shame and its Endorse button, as pure functions of the interaction and the clock, so
 * the rules are testable without Discord or GitHub. api/discord.ts does the I/O.
 *
 * State lives in the message itself, not in storage: the Endorse button's custom_id
 * holds the target, the shamer, the category and the endorsers so far (custom_ids are set
 * by this bot and Discord only accepts clicks on components the message really has), the
 * reason is read back from the message text this bot wrote, and the posting time comes
 * from the message ID (a snowflake). Nothing to store, clean up or keep in sync, and the
 * 2-endorsement dispatch is idempotent on the shame bot's side (one log entry per messageId).
 */

// Discord interaction / response types we use.
export const InteractionType = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3 } as const
export const ResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE: 4,
  UPDATE_MESSAGE: 7,
} as const
const EPHEMERAL = 1 << 6
const DISCORD_EPOCH = 1420070400000n

export interface DiscordUser {
  id: string
  bot?: boolean
}

/** The parts of a Discord interaction this bot reads. */
export interface Interaction {
  type: number
  member?: { user?: DiscordUser }
  user?: DiscordUser
  data?: {
    name?: string
    custom_id?: string
    options?: { name: string; type: number; value: unknown }[]
  }
  message?: { id: string; content: string }
}

export interface InteractionResponse {
  type: number
  data?: {
    content?: string
    flags?: number
    components?: unknown[]
    allowed_mentions?: { parse: string[]; users?: string[] }
  }
}

/** The client_payload of the shame bot's manual-shame repository_dispatch (its shame README). */
export interface ManualShamePayload {
  messageId: string
  target: string
  by: string
  endorsedBy: string[]
  category: ShameCategory
  reason: string
}

/** A pending /shame, as carried by its Endorse button. */
export interface ShameState {
  target: string
  by: string
  category: ShameCategory
  endorsedBy: string[]
}

/** Discord user ID → GitHub login, from DISCORD_USER_MAP (JSON of login → Discord ID). */
export type TeamMap = ReadonlyMap<string, string>

export function parseTeamMap(raw: string): TeamMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('DISCORD_USER_MAP must be JSON: {"githubLogin": "discordUserId", ...}.')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('DISCORD_USER_MAP must be a JSON object of GitHub login → Discord user ID.')
  }
  const map = new Map<string, string>()
  for (const [login, id] of Object.entries(parsed)) {
    const discordId = String(id)
    if (!/^\d+$/.test(discordId)) {
      throw new Error(`DISCORD_USER_MAP: "${login}" needs a numeric Discord user ID.`)
    }
    map.set(discordId, login)
  }
  return map
}

// ---- Endorse button state ----------------------------------------------------------------

const CUSTOM_ID_PREFIX = 'shame'
const SNOWFLAKE = /^\d{1,20}$/

/** shame:<target>:<by>:<category>:<endorser,endorser>. At most ~90 of Discord's 100 chars. */
export function encodeCustomId(state: ShameState): string {
  return [
    CUSTOM_ID_PREFIX,
    state.target,
    state.by,
    state.category,
    state.endorsedBy.join(','),
  ].join(':')
}

export function decodeCustomId(customId: string): ShameState | null {
  const parts = customId.split(':')
  if (parts.length !== 5 || parts[0] !== CUSTOM_ID_PREFIX) return null
  const [, target, by, category, endorsers] = parts
  const endorsedBy = endorsers ? endorsers.split(',') : []
  if (![target, by, ...endorsedBy].every((id) => SNOWFLAKE.test(id))) return null
  if (!isShameCategory(category)) return null
  return { target, by, category, endorsedBy }
}

export function isShameCustomId(customId: string | undefined): boolean {
  return customId?.startsWith(`${CUSTOM_ID_PREFIX}:`) ?? false
}

/** When a Discord ID (snowflake) was created, in ms since the Unix epoch. */
export function snowflakeTime(id: string): number {
  return Number((BigInt(id) >> 22n) + DISCORD_EPOCH)
}

// ---- Message text -------------------------------------------------------------------------

const mention = (id: string) => `<@${id}>`

type Headline = (by: string, target: string, label: string, reason: string) => string

/**
 * One is picked at random when a shame is posted; endorsing keeps whichever was posted.
 * Each must end with the reason in quotes and have no `"` before it, so readShameMessage
 * can find the reason again.
 */
export const HEADLINES: readonly Headline[] = [
  (by, target, label, reason) => `🫵😐 ${by} casts shame on ${target} for ${label}: "${reason}"`,
  (by, target, label, reason) => `${by} is shaming ${target} for ${label}: "${reason}"`,
  (by, target, label, reason) =>
    `${target}'s ${label}...so shameful 🙂‍↔️. ${by} says they "${reason}"`,
  (by, target, label, reason) =>
    `${by} would like to politely shame ${target} for ${label}: "${reason}"`,
  (by, target, label, reason) => `${by} is accusing ${target} of bad ${label}: "${reason}"`,
  (by, target, label, reason) => `🤢 ${by} thinks ${target} STINKS at ${label}: "${reason}"`,
]

function headline(
  state: Pick<ShameState, 'by' | 'target' | 'category'>,
  reason: string,
  random: () => number,
): string {
  const pick = HEADLINES[Math.floor(random() * HEADLINES.length)] ?? HEADLINES[0]
  return pick(mention(state.by), mention(state.target), SHAME_CATEGORIES[state.category], reason)
}

function endorsementLine(endorsedBy: string[]): string {
  const who = endorsedBy.length ? ` · ${endorsedBy.map(mention).join(', ')}` : ''
  return `Endorsements: ${endorsedBy.length}/${ENDORSEMENTS_NEEDED}${who}`
}

/**
 * A /shame message read back: the headline is everything before the last line (the
 * endorsement line never contains a newline; the reason may), and the reason sits between
 * the headline's first `"` (no headline, label or mention has one before it) and its
 * closing quote.
 */
export function readShameMessage(content: string): { head: string; reason: string } | null {
  const lastLine = content.lastIndexOf('\n')
  if (lastLine < 0) return null
  const head = content.slice(0, lastLine)
  const start = head.indexOf('"')
  if (start < 0 || !head.endsWith('"') || head.length < start + 3) return null
  return { head, reason: head.slice(start + 1, -1) }
}

export function reasonFromContent(content: string): string | null {
  return readShameMessage(content)?.reason ?? null
}

function endorseButton(state: ShameState) {
  return [
    {
      type: 1, // action row
      components: [
        {
          type: 2, // button
          style: 1, // primary
          label: 'Endorse',
          emoji: { name: '👍' },
          custom_id: encodeCustomId(state),
        },
      ],
    },
  ]
}

function ephemeral(content: string): InteractionResponse {
  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } },
  }
}

function invoker(interaction: Interaction): string | undefined {
  return interaction.member?.user?.id ?? interaction.user?.id
}

// ---- /shame -------------------------------------------------------------------------------

/** The reply to `/shame user category reason`: a public message with an Endorse button. */
export function startShame(
  interaction: Interaction,
  team: TeamMap,
  random: () => number = Math.random,
): InteractionResponse {
  const by = invoker(interaction)
  if (!by || !team.has(by)) return ephemeral('Only the D.A.W.N. team can use /shame.')

  const option = (name: string) => interaction.data?.options?.find((o) => o.name === name)?.value
  const target = option('user')
  const category = option('category')
  const reason = typeof option('reason') === 'string' ? (option('reason') as string).trim() : ''

  if (typeof target !== 'string' || !team.has(target)) {
    return ephemeral('You can only shame someone on the D.A.W.N. team.')
  }
  if (!isShameCategory(category)) return ephemeral('Pick one of the listed categories.')
  if (!reason) return ephemeral('Give a reason.')
  if (reason.length > REASON_MAX) {
    return ephemeral(`Keep the reason to ${REASON_MAX} characters (it's ${reason.length}).`)
  }

  const state: ShameState = { target, by, category, endorsedBy: [] }
  return {
    type: ResponseType.CHANNEL_MESSAGE,
    data: {
      content: `${headline(state, reason, random)}\n${endorsementLine([])}`,
      // Ping only the person shamed: never the shamer, and nobody named in the reason
      // (no @everyone, roles or users from the text).
      allowed_mentions: { parse: [], users: [target] },
      components: endorseButton(state),
    },
  }
}

// ---- Endorse ------------------------------------------------------------------------------

export type EndorseOutcome =
  /** Refused or still pending: answer with this and do nothing else. */
  | { kind: 'reply'; response: InteractionResponse }
  /** The deciding endorsement: dispatch to the shame bot, then answer with `response`. */
  | { kind: 'counted'; payload: ManualShamePayload; response: InteractionResponse }

/** One click on a /shame's Endorse button, judged at `now` (ms). */
export function endorse(interaction: Interaction, team: TeamMap, now: number): EndorseOutcome {
  const reply = (content: string): EndorseOutcome => ({
    kind: 'reply',
    response: ephemeral(content),
  })
  const message = interaction.message
  const state = decodeCustomId(interaction.data?.custom_id ?? '')
  const read = message ? readShameMessage(message.content) : null
  if (!message || !SNOWFLAKE.test(message.id) || !state || !read) {
    return reply("Couldn't read this shame. Start a new one with /shame.")
  }
  // Keep the headline as posted (it was picked at random), only the endorsements change.
  const { head, reason } = read

  const clicker = invoker(interaction)
  if (!clicker || !team.has(clicker)) return reply('Only the D.A.W.N. team can endorse a shame.')
  if (clicker === state.by) return reply("You started this shame, so you can't endorse it.")
  if (clicker === state.target) return reply("Nice try. You can't endorse your own shame.")
  if (state.endorsedBy.includes(clicker)) return reply('You already endorsed this shame.')
  if (now - snowflakeTime(message.id) > ENDORSE_WINDOW_MS) {
    return reply('This shame has expired: endorsements close 24 hours after it was posted.')
  }

  const next: ShameState = { ...state, endorsedBy: [...state.endorsedBy, clicker] }

  if (next.endorsedBy.length < ENDORSEMENTS_NEEDED) {
    return {
      kind: 'reply',
      response: {
        type: ResponseType.UPDATE_MESSAGE,
        data: {
          content: `${head}\n${endorsementLine(next.endorsedBy)}`,
          allowed_mentions: { parse: [] },
          components: endorseButton(next),
        },
      },
    }
  }

  const who = next.endorsedBy.map(mention).join(' and ')
  return {
    kind: 'counted',
    payload: {
      messageId: message.id,
      target: next.target,
      by: next.by,
      endorsedBy: next.endorsedBy,
      category: next.category,
      reason,
    },
    response: {
      type: ResponseType.UPDATE_MESSAGE,
      data: {
        content: `${head}\n✅ It counts: endorsed by ${who}.`,
        allowed_mentions: { parse: [] },
        components: [],
      },
    },
  }
}

/** The refusal shown when the shame bot couldn't be told (the message keeps its button). */
export function dispatchFailedReply(): InteractionResponse {
  return ephemeral("Couldn't record the shame on GitHub just now. Click Endorse again in a minute.")
}

/** Shown when the bot's own settings are missing (names the variable, never a value). */
export function notSetUpReply(missing: string[]): InteractionResponse {
  return ephemeral(`/shame isn't set up yet: the site is missing ${missing.join(', ')}.`)
}
