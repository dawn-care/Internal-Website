import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateKeyPairSync, sign } from 'node:crypto'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../discord.js'
import { isValidDiscordSignature } from './discord/verify.js'

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const PUBLIC_HEX = Buffer.from(publicKey.export({ format: 'jwk' }).x!, 'base64url').toString('hex')

const ALICE = '111111111111111111'
const BOB = '222222222222222222'
const CAROL = '333333333333333333'
const DAVE = '444444444444444444'

function signed(body: string, timestamp = String(Math.floor(Date.now() / 1000))) {
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex')
  return { 'x-signature-ed25519': signature, 'x-signature-timestamp': timestamp }
}

interface FakeRes {
  statusCode: number
  body: { type?: number; data?: Record<string, unknown>; error?: { code: string } }
}

async function call(
  body: string,
  headers: Record<string, string> = signed(body),
): Promise<FakeRes> {
  const req = Object.assign(Readable.from([Buffer.from(body)]), {
    method: 'POST',
    headers: { host: 'example.vercel.app', 'content-type': 'application/json', ...headers },
  }) as unknown as VercelRequest
  const out: FakeRes = { statusCode: 200, body: {} }
  const res = {
    headersSent: false,
    setHeader: () => res,
    status(code: number) {
      out.statusCode = code
      return res
    },
    json(value: FakeRes['body']) {
      out.body = value
      return res
    },
  } as unknown as VercelResponse
  await handler(req, res)
  return out
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv('DISCORD_PUBLIC_KEY', PUBLIC_HEX)
  vi.stubEnv(
    'DISCORD_USER_MAP',
    JSON.stringify({ alice: ALICE, bob: BOB, carol: CAROL, dave: DAVE }),
  )
  vi.stubEnv('SHAME_DISPATCH_TOKEN', 'github_pat_test')
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  fetchMock.mockReset()
})

describe('signature check', () => {
  const body = '{"type":1}'

  it('accepts a request Discord signed', () => {
    expect(
      isValidDiscordSignature(PUBLIC_HEX, {
        ...headersToSigned(signed(body)),
        body: Buffer.from(body),
      }),
    ).toBe(true)
  })

  it('rejects a tampered body, a wrong key, and old timestamps', () => {
    const headers = headersToSigned(signed(body))
    expect(
      isValidDiscordSignature(PUBLIC_HEX, { ...headers, body: Buffer.from('{"type":2}') }),
    ).toBe(false)
    const other = generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' }).x!
    const otherHex = Buffer.from(other, 'base64url').toString('hex')
    expect(isValidDiscordSignature(otherHex, { ...headers, body: Buffer.from(body) })).toBe(false)
    const old = String(Math.floor(Date.now() / 1000) - 600)
    expect(
      isValidDiscordSignature(PUBLIC_HEX, {
        ...headersToSigned(signed(body, old)),
        body: Buffer.from(body),
      }),
    ).toBe(false)
    expect(
      isValidDiscordSignature(PUBLIC_HEX, {
        signature: undefined,
        timestamp: undefined,
        body: Buffer.from(body),
      }),
    ).toBe(false)
  })

  function headersToSigned(h: Record<string, string>) {
    return { signature: h['x-signature-ed25519'], timestamp: h['x-signature-timestamp'] }
  }
})

describe('POST /api/discord', () => {
  it('answers PING with PONG', async () => {
    const res = await call('{"type":1}')
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ type: 1 })
  })

  it('401s an unsigned or badly signed request', async () => {
    expect((await call('{"type":1}', {})).statusCode).toBe(401)
    const headers = signed('{"type":1}')
    expect((await call('{"type":1} ', headers)).statusCode).toBe(401)
  })

  it('fails clearly without DISCORD_PUBLIC_KEY', async () => {
    vi.stubEnv('DISCORD_PUBLIC_KEY', '')
    const res = await call('{"type":1}')
    expect(res.statusCode).toBe(500)
    expect(JSON.stringify(res.body)).toContain('DISCORD_PUBLIC_KEY')
  })

  it('tells the person which setting is missing', async () => {
    vi.stubEnv('SHAME_DISPATCH_TOKEN', '')
    const res = await call(JSON.stringify(commandBody()))
    expect(res.body.data?.content).toContain('SHAME_DISPATCH_TOKEN')
    expect(res.body.data?.flags).toBe(64)
  })

  it('runs /shame, then dispatches to DAWN at the second endorsement', async () => {
    const posted = await call(JSON.stringify(commandBody()))
    expect(posted.body.type).toBe(4)

    const messageId = String((BigInt(Date.now()) - 1420070400000n) << 22n)
    const first = await call(JSON.stringify(clickBody(posted.body, CAROL, messageId)))
    expect(first.body.type).toBe(7)
    expect(fetchMock).not.toHaveBeenCalled()

    const second = await call(JSON.stringify(clickBody(first.body, DAVE, messageId)))
    expect(second.body.type).toBe(7)
    expect(second.body.data?.components).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/dawn-care/Internal-Tools/dispatches')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer github_pat_test')
    expect(JSON.parse(init?.body as string)).toEqual({
      event_type: 'manual-shame',
      client_payload: {
        messageId,
        target: BOB,
        by: ALICE,
        endorsedBy: [CAROL, DAVE],
        category: 'sleep',
        reason: 'pushed at 3am',
      },
    })
  })

  it('keeps the button and explains privately when GitHub refuses', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"Bad credentials"}', { status: 401 }))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const posted = await call(JSON.stringify(commandBody()))
    const messageId = String((BigInt(Date.now()) - 1420070400000n) << 22n)
    const first = await call(JSON.stringify(clickBody(posted.body, CAROL, messageId)))
    const second = await call(JSON.stringify(clickBody(first.body, DAVE, messageId)))
    expect(second.body.type).toBe(4)
    expect(second.body.data?.flags).toBe(64)
    expect(second.body.data?.content).toMatch(/Click Endorse again/)
    expect(JSON.stringify(second.body)).not.toContain('Bad credentials')
    errors.mockRestore()
  })
})

function commandBody() {
  return {
    type: 2,
    member: { user: { id: ALICE } },
    data: {
      name: 'shame',
      options: [
        { name: 'user', type: 6, value: BOB },
        { name: 'category', type: 3, value: 'sleep' },
        { name: 'reason', type: 3, value: 'pushed at 3am' },
      ],
    },
  }
}

function clickBody(message: FakeRes['body'], clicker: string, messageId: string) {
  const data = message.data as {
    content: string
    components: { components: { custom_id: string }[] }[]
  }
  return {
    type: 3,
    member: { user: { id: clicker } },
    data: { custom_id: data.components[0].components[0].custom_id, component_type: 2 },
    message: { id: messageId, content: data.content },
  }
}
