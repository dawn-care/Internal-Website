import { describe, expect, it } from 'vitest'
import { SHAME_COMMAND } from './command.js'
import { dispatchBody } from './dispatch.js'
import {
  decodeCustomId,
  encodeCustomId,
  endorse,
  HEADLINES,
  parseTeamMap,
  reasonFromContent,
  snowflakeTime,
  startShame,
  type Interaction,
  type InteractionResponse,
} from './shame.js'

const ALICE = '111111111111111111'
const BOB = '222222222222222222'
const CAROL = '333333333333333333'
const DAVE = '444444444444444444'
const OUTSIDER = '999999999999999999'

const TEAM = parseTeamMap(JSON.stringify({ alice: ALICE, bob: BOB, carol: CAROL, dave: DAVE }))

/** A snowflake for a message posted at `ms`. */
function messageIdAt(ms: number): string {
  return String((BigInt(ms) - 1420070400000n) << 22n)
}

const POSTED = Date.parse('2026-11-19T15:00:00Z')
const MESSAGE_ID = messageIdAt(POSTED)

function command(by: string, options: Record<string, unknown>): Interaction {
  return {
    type: 2,
    member: { user: { id: by } },
    data: {
      name: 'shame',
      options: Object.entries(options).map(([name, value]) => ({ name, type: 3, value })),
    },
  }
}

/** Posts a /shame with the first headline, or the one `random` picks. */
const shame = (reason = 'late to standup', random = () => 0) =>
  startShame(command(ALICE, { user: BOB, category: 'meetings', reason }), TEAM, random)

/** A click on the Endorse button of the message a response posted. */
function click(posted: InteractionResponse, clicker: string, messageId = MESSAGE_ID): Interaction {
  const row = posted.data?.components?.[0] as { components: { custom_id: string }[] }
  return {
    type: 3,
    member: { user: { id: clicker } },
    data: { custom_id: row.components[0].custom_id },
    message: { id: messageId, content: posted.data!.content! },
  }
}

function replyText(outcome: ReturnType<typeof endorse>): string | undefined {
  return outcome.response.data?.content
}

describe('parseTeamMap', () => {
  it('maps Discord IDs to GitHub logins', () => {
    expect(TEAM.get(BOB)).toBe('bob')
  })
  it('names the problem for a bad map', () => {
    expect(() => parseTeamMap('nope')).toThrow(/DISCORD_USER_MAP must be JSON/)
    expect(() => parseTeamMap('{"a":"x1"}')).toThrow(/numeric Discord user ID/)
  })
})

describe('the command definition', () => {
  it('offers exactly the shame bot category ids', () => {
    const category = SHAME_COMMAND.options.find((o) => o.name === 'category')!
    expect(category.choices?.map((c) => c.value)).toEqual([
      'reviews',
      'follow_through',
      'pr_size',
      'sleep',
      'meetings',
      'deadlines',
      'broke_something',
      'communication',
      'other',
    ])
  })
})

describe('/shame', () => {
  it('posts a public message that pings only the target, with an Endorse button', () => {
    const res = shame('late to standup, ask @everyone <@333333333333333333>')
    expect(res.type).toBe(4)
    expect(res.data?.flags).toBeUndefined()
    expect(res.data?.content).toBe(
      `🫵😐 <@${ALICE}> casts shame on <@${BOB}> for Meetings: "late to standup, ask @everyone <@${CAROL}>"\nEndorsements: 0/2`,
    )
    expect(res.data?.allowed_mentions).toEqual({ parse: [], users: [BOB] })
    expect(click(res, CAROL).data?.custom_id).toBe(`shame:${BOB}:${ALICE}:meetings:`)
  })

  it.each([
    [
      'a non-member shames',
      command(OUTSIDER, { user: BOB, category: 'meetings', reason: 'x' }),
      /Only the D.A.W.N. team/,
    ],
    [
      'the target is not on the team',
      command(ALICE, { user: OUTSIDER, category: 'meetings', reason: 'x' }),
      /someone on the D.A.W.N. team/,
    ],
    [
      'the category is unknown',
      command(ALICE, { user: BOB, category: 'vibes', reason: 'x' }),
      /listed categories/,
    ],
    [
      'the reason is blank',
      command(ALICE, { user: BOB, category: 'sleep', reason: '   ' }),
      /Give a reason/,
    ],
    [
      'the reason is too long',
      command(ALICE, { user: BOB, category: 'sleep', reason: 'x'.repeat(301) }),
      /300 characters/,
    ],
  ])('refuses privately when %s', (_, interaction, message) => {
    const res = startShame(interaction, TEAM)
    expect(res.data?.flags).toBe(64)
    expect(res.data?.content).toMatch(message)
    expect(res.data?.components).toBeUndefined()
  })

  it('picks a headline at random', () => {
    expect(shame('x', () => 0.99).data?.content).toMatch(/STINKS at Meetings: "x"\n/)
    expect(shame('x', () => 0.4).data?.content).toMatch(/^<@\d+>'s Meetings\.\.\./)
  })

  it('trims the reason', () => {
    expect(shame('  slept in  ').data?.content).toContain(': "slept in"\n')
  })
})

describe('reasonFromContent', () => {
  it('reads back reasons with quotes, colons and newlines', () => {
    const reason = 'said "done": it was not\nat all'
    expect(reasonFromContent(shame(reason).data!.content!)).toBe(reason)
  })
  it('reads the reason back from every headline', () => {
    const reason = 'said "done": it was not\nat all'
    HEADLINES.forEach((_, i) => {
      const posted = shame(reason, () => i / HEADLINES.length)
      expect(reasonFromContent(posted.data!.content!)).toBe(reason)
    })
  })
  it('rejects text it did not write', () => {
    expect(reasonFromContent('hello')).toBeNull()
    expect(reasonFromContent('hi: "no closing\nEndorsements: 0/2')).toBeNull()
  })
})

describe('custom_id', () => {
  it('round-trips and fits in 100 characters', () => {
    const state = {
      target: '12345678901234567890',
      by: '12345678901234567890',
      category: 'broke_something' as const,
      endorsedBy: ['12345678901234567890'],
    }
    const id = encodeCustomId(state)
    expect(id.length).toBeLessThanOrEqual(100)
    expect(decodeCustomId(id)).toEqual(state)
  })
  it('rejects malformed ids', () => {
    expect(decodeCustomId('shame:1:2:vibes:')).toBeNull()
    expect(decodeCustomId('other:1:2:sleep:')).toBeNull()
    expect(decodeCustomId('shame:1:x:sleep:')).toBeNull()
  })
})

describe('endorsing', () => {
  const now = POSTED + 60_000

  it('decodes the posting time from the message ID', () => {
    expect(snowflakeTime(MESSAGE_ID)).toBe(POSTED)
  })

  it('counts the first endorsement and keeps the button', () => {
    const out = endorse(click(shame(), CAROL), TEAM, now)
    expect(out.kind).toBe('reply')
    expect(out.response.type).toBe(7)
    expect(replyText(out)).toBe(
      `🫵😐 <@${ALICE}> casts shame on <@${BOB}> for Meetings: "late to standup"\nEndorsements: 1/2 · <@${CAROL}>`,
    )
    expect(out.response.data?.allowed_mentions).toEqual({ parse: [] })
    expect(decodeCustomId(click(out.response, DAVE).data!.custom_id!)?.endorsedBy).toEqual([CAROL])
  })

  it('keeps the posted headline through every endorsement', () => {
    HEADLINES.forEach((_, i) => {
      const posted = shame('late to standup', () => i / HEADLINES.length)
      const head = posted.data!.content!.split('\n')[0]
      const first = endorse(click(posted, CAROL), TEAM, now)
      const second = endorse(click(first.response, DAVE), TEAM, now)
      expect(replyText(first)?.startsWith(`${head}\nEndorsements: 1/2`)).toBe(true)
      expect(second.kind).toBe('counted')
      expect(replyText(second)?.startsWith(`${head}\n✅ It counts`)).toBe(true)
      if (second.kind === 'counted') expect(second.payload.reason).toBe('late to standup')
    })
  })

  it('dispatches on the second endorsement and removes the button', () => {
    const first = endorse(click(shame(), CAROL), TEAM, now)
    const second = endorse(click(first.response, DAVE), TEAM, now)
    expect(second.kind).toBe('counted')
    if (second.kind !== 'counted') return
    expect(second.response.type).toBe(7)
    expect(second.response.data?.components).toEqual([])
    expect(second.response.data?.allowed_mentions).toEqual({ parse: [] })
    expect(replyText(second)).toContain(`✅ It counts: endorsed by <@${CAROL}> and <@${DAVE}>.`)
    expect(dispatchBody(second.payload)).toEqual({
      event_type: 'manual-shame',
      client_payload: {
        messageId: MESSAGE_ID,
        target: BOB,
        by: ALICE,
        endorsedBy: [CAROL, DAVE],
        category: 'meetings',
        reason: 'late to standup',
      },
    })
  })

  it.each([
    ['the shamer', ALICE, /You started this shame/],
    ['the target', BOB, /your own shame/],
    ['a non-member', OUTSIDER, /Only the D.A.W.N. team/],
  ])('refuses %s privately', (_, clicker, message) => {
    const out = endorse(click(shame(), clicker), TEAM, now)
    expect(out.kind).toBe('reply')
    expect(out.response.data?.flags).toBe(64)
    expect(replyText(out)).toMatch(message)
  })

  it('refuses a second endorsement from the same person', () => {
    const first = endorse(click(shame(), CAROL), TEAM, now)
    const again = endorse(click(first.response, CAROL), TEAM, now)
    expect(again.response.data?.flags).toBe(64)
    expect(replyText(again)).toMatch(/already endorsed/)
  })

  it('stops taking endorsements 24 hours after posting', () => {
    const day = 24 * 60 * 60 * 1000
    expect(endorse(click(shame(), CAROL), TEAM, POSTED + day).response.type).toBe(7)
    const late = endorse(click(shame(), CAROL), TEAM, POSTED + day + 1)
    expect(late.response.data?.flags).toBe(64)
    expect(replyText(late)).toMatch(/expired/)
  })

  it('refuses a click it cannot read', () => {
    const interaction = click(shame(), CAROL)
    interaction.message!.content = 'edited by someone'
    expect(replyText(endorse(interaction, TEAM, now))).toMatch(/Couldn't read this shame/)
  })
})
