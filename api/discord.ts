import type { VercelRequest } from '@vercel/node'
import { DispatchError, sendManualShame } from './_lib/discord/dispatch.js'
import {
  dispatchFailedReply,
  endorse,
  InteractionType,
  isShameCustomId,
  notSetUpReply,
  parseTeamMap,
  ResponseType,
  startShame,
  type Interaction,
  type TeamMap,
} from './_lib/discord/shame.js'
import { isValidDiscordSignature } from './_lib/discord/verify.js'
import { getDiscordPublicKey, getShameBotConfig } from './_lib/env.js'
import { sendError, sendJson, withErrors } from './_lib/http.js'
import { firstHeader } from './_lib/request.js'

/**
 * POST /api/discord: the Discord application's Interactions Endpoint URL. Runs the /shame
 * slash command and its Endorse button (see api/_lib/discord/shame.ts); at 2 endorsements
 * it hands the shame to dawn-care/Internal-Tools as a manual-shame repository_dispatch.
 *
 * Not a site endpoint: there's no session or Origin check. Instead every request must carry
 * Discord's Ed25519 signature, and anything unsigned gets 401 (Discord tests for that when
 * the URL is saved).
 */
export default withErrors(async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'method-not-allowed', 'Use POST for this endpoint.')
  }

  const publicKey = getDiscordPublicKey()
  const body = await readRawBody(req)
  const signed = isValidDiscordSignature(publicKey, {
    signature: firstHeader(req, 'x-signature-ed25519'),
    timestamp: firstHeader(req, 'x-signature-timestamp'),
    body,
  })
  if (!signed) return sendError(res, 401, 'bad-signature', 'Invalid request signature.')

  let interaction: Interaction
  try {
    interaction = JSON.parse(body.toString('utf8')) as Interaction
  } catch {
    return sendError(res, 400, 'invalid-input', 'The body must be JSON.')
  }

  if (interaction.type === InteractionType.PING) {
    return sendJson(res, 200, { type: ResponseType.PONG })
  }

  const isCommand =
    interaction.type === InteractionType.APPLICATION_COMMAND && interaction.data?.name === 'shame'
  const isEndorse =
    interaction.type === InteractionType.MESSAGE_COMPONENT &&
    isShameCustomId(interaction.data?.custom_id)
  if (!isCommand && !isEndorse) {
    return sendError(res, 400, 'unknown-interaction', 'This bot only handles /shame.')
  }

  const config = getShameBotConfig()
  if ('missing' in config) return sendJson(res, 200, notSetUpReply(config.missing))
  let team: TeamMap
  try {
    team = parseTeamMap(config.userMap)
  } catch (err) {
    console.error(`[discord] ${(err as Error).message}`)
    return sendJson(res, 200, notSetUpReply(['a valid DISCORD_USER_MAP']))
  }

  if (isCommand) return sendJson(res, 200, startShame(interaction, team))

  const outcome = endorse(interaction, team, Date.now())
  if (outcome.kind === 'reply') return sendJson(res, 200, outcome.response)

  // The deciding endorsement: tell DAWN first, and only mark the message as counted once
  // GitHub accepted it. If it didn't, the button stays so someone can try again.
  try {
    await sendManualShame(outcome.payload, config.dispatchToken)
  } catch (err) {
    if (!(err instanceof DispatchError)) throw err
    console.error(`[discord] ${err.message}`)
    return sendJson(res, 200, dispatchFailedReply())
  }
  return sendJson(res, 200, outcome.response)
})

/**
 * The exact bytes Discord signed. Vercel buffers the body and replays it through the
 * request's data/end events, so it's read that way rather than from the parsed req.body.
 */
function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
