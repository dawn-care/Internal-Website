import type { ManualShamePayload } from './shame.js'

/** The repo whose shame bot logs manual shames (its shame-bot/README.md). */
export const SHAME_REPO = 'dawn-care/Internal-Tools'
export const MANUAL_SHAME_EVENT = 'manual-shame'

/** Discord wants an answer within 3 seconds, so GitHub gets at most this long. */
export const DISPATCH_TIMEOUT_MS = 2000

export class DispatchError extends Error {
  /** GitHub's status, or 0 when there was no response (timeout, network). */
  readonly status: number

  constructor(status: number) {
    super(
      status
        ? `GitHub refused the manual-shame dispatch (${status}).`
        : 'GitHub did not answer in time.',
    )
    this.name = 'DispatchError'
    this.status = status
  }
}

/** The exact request body the shame bot's README specifies. */
export function dispatchBody(payload: ManualShamePayload) {
  return { event_type: MANUAL_SHAME_EVENT, client_payload: payload }
}

/**
 * Sends the manual-shame repository_dispatch. The shame bot re-checks it, logs it once per
 * messageId and posts its own Discord message. GitHub answers 204 with no body.
 */
export async function sendManualShame(payload: ManualShamePayload, token: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`https://api.github.com/repos/${SHAME_REPO}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'dawn-team-site',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify(dispatchBody(payload)),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    })
  } catch {
    throw new DispatchError(0)
  }
  if (!res.ok) throw new DispatchError(res.status)
}
