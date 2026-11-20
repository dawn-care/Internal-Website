import { createPublicKey, verify, type KeyObject } from 'node:crypto'

/*
 * Discord signs every interaction with the application's Ed25519 key: the signature
 * (X-Signature-Ed25519, hex) covers the X-Signature-Timestamp header followed by the raw
 * body. Node's crypto verifies Ed25519 natively, so no dependency is needed.
 */

/** DER prefix of an Ed25519 SubjectPublicKeyInfo; the 32 raw key bytes follow it. */
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

/** Requests signed longer ago than this are refused, so a captured request can't be replayed later. */
export const MAX_SIGNATURE_AGE_SECONDS = 5 * 60

const keyCache = new Map<string, KeyObject>()

/** The application's public key (64 hex characters, from the Developer Portal). */
export function discordPublicKey(hex: string): KeyObject {
  const cached = keyCache.get(hex)
  if (cached) return cached
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error('DISCORD_PUBLIC_KEY must be the 64-character hex public key.')
  }
  const key = createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, Buffer.from(hex, 'hex')]),
    format: 'der',
    type: 'spki',
  })
  keyCache.set(hex, key)
  return key
}

export interface SignedRequest {
  signature: string | undefined
  timestamp: string | undefined
  body: Buffer
}

/** True only for a request Discord signed with this key, within MAX_SIGNATURE_AGE_SECONDS. */
export function isValidDiscordSignature(
  publicKeyHex: string,
  { signature, timestamp, body }: SignedRequest,
  nowMs = Date.now(),
): boolean {
  if (!signature || !timestamp || !/^[0-9a-f]{128}$/i.test(signature) || !/^\d+$/.test(timestamp)) {
    return false
  }
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > MAX_SIGNATURE_AGE_SECONDS) return false
  try {
    return verify(
      null,
      Buffer.concat([Buffer.from(timestamp, 'utf8'), body]),
      discordPublicKey(publicKeyHex),
      Buffer.from(signature, 'hex'),
    )
  } catch {
    return false
  }
}
