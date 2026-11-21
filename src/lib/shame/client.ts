import { SHAME_URL } from '../../config/shame'
import type { ShameFile } from './types'

export class ShameError extends Error {
  /** HTTP status, or 0 when the request never got a response. */
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ShameError'
    this.status = status
  }
}

/**
 * Fetches metrics/shame.json from dawn-care/Internal-Tools' metrics branch (public, no auth). Null
 * means the shame bot hasn't logged anything yet — a 404, not an error.
 */
export async function fetchShames(url = SHAME_URL): Promise<ShameFile | null> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new ShameError("Couldn't reach GitHub. Check your connection.", 0)
  }
  if (res.status === 404) return null
  if (!res.ok) throw new ShameError(`Request failed (${res.status}): ${res.statusText}`, res.status)
  let file: unknown
  try {
    file = await res.json()
  } catch {
    throw new ShameError("The shame log isn't valid JSON.", res.status)
  }
  if (!isShameFile(file)) {
    throw new ShameError("The shame log isn't in the format this site reads.", res.status)
  }
  return file
}

function isShameFile(value: unknown): value is ShameFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Partial<ShameFile>
  return (
    !!file.categories &&
    typeof file.categories === 'object' &&
    Array.isArray(file.shames) &&
    file.shames.every(
      (s) =>
        !!s &&
        typeof s.at === 'string' &&
        typeof s.login === 'string' &&
        typeof s.category === 'string',
    )
  )
}
