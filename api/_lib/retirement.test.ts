import type { VercelRequest, VercelResponse } from '@vercel/node'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newSave, defaultLook, type Save } from '../../retirement/shared/schema.js'
import handler from '../retirement.js'
import { createMemoryStore, setStore } from './retirement/store.js'
import { encryptSession } from './session.js'

const SECRET = 'test-secret-that-is-long-enough-for-hkdf'
const ORIGIN = 'http://localhost:3000'

interface FakeRes {
  statusCode: number
  body: unknown
}

async function call(init: {
  method: string
  op?: string
  page?: boolean
  body?: unknown
  login?: string | null
  origin?: string | null
}): Promise<FakeRes> {
  vi.stubEnv('GITHUB_CLIENT_ID', 'client-id')
  vi.stubEnv('GITHUB_CLIENT_SECRET', 'client-secret')
  vi.stubEnv('SESSION_SECRET', SECRET)
  vi.stubEnv('GITHUB_ORG', 'dawn')
  const cookies: Record<string, string> = {}
  const login = init.login === undefined ? 'ada' : init.login
  if (login) {
    cookies.dawn_session = await encryptSession(
      { accessToken: 'gho_test', user: { login, name: `${login} Lovelace`, avatarUrl: '' } },
      SECRET,
    )
  }
  const headers: Record<string, string> = { host: 'localhost:3000' }
  const origin = init.origin === undefined ? ORIGIN : init.origin
  if (origin) headers.origin = origin
  const query: Record<string, string> = {}
  if (init.op) query.op = init.op
  if (init.page) query.page = '1'
  const req = {
    method: init.method,
    url: '/api/retirement',
    query,
    cookies,
    headers,
    body: init.body,
  } as unknown as VercelRequest
  const out: FakeRes = { statusCode: 200, body: undefined }
  const res = {
    headersSent: false,
    setHeader: () => res,
    getHeader: () => undefined,
    status(code: number) {
      out.statusCode = code
      return res
    },
    json(body: unknown) {
      out.body = body
      return res
    },
    end(body?: unknown) {
      if (body !== undefined) out.body = body
      return res
    },
  } as unknown as VercelResponse
  await handler(req, res)
  return out
}

function save(name = 'Ada'): Save {
  return newSave(defaultLook(name), 1_700_000_000_000)
}

const presence = { map: 'grounds', x: 10, y: 12, dir: 0, moving: false }

describe('/api/retirement', () => {
  beforeEach(() => setStore(createMemoryStore()))
  afterEach(() => {
    setStore(null)
    vi.unstubAllEnvs()
  })

  it('needs a session', async () => {
    const res = await call({ method: 'GET', op: 'me', login: null })
    expect(res.statusCode).toBe(401)
  })

  it('serves a sign-in page instead of the game when signed out', async () => {
    const res = await call({ method: 'GET', page: true, login: null })
    expect(res.statusCode).toBe(200)
    expect(String(res.body)).toContain('Sign in with GitHub')
  })

  it('starts with no save and a free slot, then keeps what was saved', async () => {
    const first = await call({ method: 'GET', op: 'me' })
    expect(first.body).toMatchObject({ save: null, slot: 0, user: { login: 'ada' } })

    const s = save()
    s.coins = 123
    s.slot = 7 // ignored: the server hands out slots
    const put = await call({ method: 'POST', op: 'save', body: { save: s } })
    expect(put.statusCode).toBe(200)
    expect(put.body).toMatchObject({ slot: 0 })

    const again = await call({ method: 'GET', op: 'me' })
    expect(again.body).toMatchObject({ slot: 0, save: { coins: 123, slot: 0 } })
  })

  it('gives each player their own slot and shows everyone in the world', async () => {
    await call({ method: 'POST', op: 'save', body: { save: save('Ada') } })
    const grace = await call({
      method: 'POST',
      op: 'save',
      body: { save: save('Grace') },
      login: 'grace',
    })
    expect(grace.body).toMatchObject({ slot: 1 })
    const world = await call({ method: 'GET', op: 'world' })
    const profiles = (world.body as { profiles: { login: string; slot: number }[] }).profiles
    expect(profiles.map((p) => [p.login, p.slot]).sort()).toEqual([
      ['ada', 0],
      ['grace', 1],
    ])
  })

  it('refuses malformed saves without storing them', async () => {
    const bad = { ...save(), coins: -5 }
    const res = await call({ method: 'POST', op: 'save', body: { save: bad } })
    expect(res.statusCode).toBe(400)
    expect((await call({ method: 'GET', op: 'me' })).body).toMatchObject({ save: null })

    const furniture = save()
    furniture.room.items.push({ k: 'piano', x: 40, y: 3 })
    expect((await call({ method: 'POST', op: 'save', body: { save: furniture } })).statusCode).toBe(
      400,
    )
  })

  it('reads saves from before body types existed as female, and refuses unknown ones', async () => {
    const old = save() as unknown as { look: Record<string, unknown> }
    delete old.look.body
    expect((await call({ method: 'POST', op: 'save', body: { save: old } })).statusCode).toBe(200)
    expect((await call({ method: 'GET', op: 'me' })).body).toMatchObject({
      save: { look: { body: 'female' } },
    })

    const odd = save() as unknown as { look: Record<string, unknown> }
    odd.look.body = 'robot'
    expect((await call({ method: 'POST', op: 'save', body: { save: odd } })).statusCode).toBe(400)
  })

  it("starts new characters on Nurse Ada's introduction and keeps their step", async () => {
    expect(save().intro).toBe(0)
    const s = save()
    s.intro = 2
    expect((await call({ method: 'POST', op: 'save', body: { save: s } })).statusCode).toBe(200)
    expect((await call({ method: 'GET', op: 'me' })).body).toMatchObject({ save: { intro: 2 } })
  })

  it('treats saves without an introduction step as finished', async () => {
    const old = save() as unknown as Record<string, unknown>
    delete old.intro
    expect((await call({ method: 'POST', op: 'save', body: { save: old } })).statusCode).toBe(200)
    const me = (await call({ method: 'GET', op: 'me' })).body as { save: Record<string, unknown> }
    expect('intro' in me.save).toBe(false)
  })

  it('refuses introduction steps that do not exist', async () => {
    for (const intro of [-1, 4, 1.5, '1', null]) {
      const bad = { ...save(), intro }
      expect((await call({ method: 'POST', op: 'save', body: { save: bad } })).statusCode).toBe(400)
    }
  })

  it('rejects cross-site writes', async () => {
    const res = await call({
      method: 'POST',
      op: 'save',
      body: { save: save() },
      origin: 'https://evil.example',
    })
    expect(res.statusCode).toBe(403)
  })

  it('shares presence and chat between players', async () => {
    const look = defaultLook('Ada')
    await call({
      method: 'POST',
      op: 'sync',
      body: { p: presence, look, msg: '  hello\nthere  ', since: 0 },
    })
    const res = await call({
      method: 'POST',
      op: 'sync',
      login: 'grace',
      body: { p: { ...presence, x: 11 }, look: defaultLook('Grace'), since: 0 },
    })
    const body = res.body as {
      players: { login: string; x: number }[]
      chat: { login: string; text: string }[]
    }
    expect(body.players).toEqual([expect.objectContaining({ login: 'ada', x: 10 })])
    expect(body.chat).toEqual([expect.objectContaining({ login: 'ada', text: 'hello there' })])
  })

  it('rate-limits chat per player', async () => {
    const look = defaultLook('Ada')
    const a = await call({
      method: 'POST',
      op: 'sync',
      body: { p: presence, look, msg: 'one', since: 0 },
    })
    const b = await call({
      method: 'POST',
      op: 'sync',
      body: { p: presence, look, msg: 'two', since: 0 },
    })
    expect(a.body).toMatchObject({ sent: true })
    expect(b.body).toMatchObject({ sent: false })
  })

  it('rejects presence in places that do not exist', async () => {
    const res = await call({
      method: 'POST',
      op: 'sync',
      body: { p: { ...presence, map: '../etc' }, look: defaultLook('Ada'), since: 0 },
    })
    expect(res.statusCode).toBe(400)
  })

  describe('sitting', () => {
    const sync = (login: string, p: Record<string, unknown>) =>
      call({ method: 'POST', op: 'sync', login, body: { p, look: defaultLook(login), since: 0 } })

    it('shares where people sit', async () => {
      await sync('ada', { ...presence, sit: 'bench:19,14:0', sitAt: 100 })
      const res = await sync('grace', presence)
      const players = (res.body as { players: Record<string, unknown>[] }).players
      expect(players[0]).toMatchObject({ login: 'ada', sit: 'bench:19,14:0', sitAt: 100 })
    })

    it('only accepts real kinds of seat in the right kind of place', async () => {
      const room = { ...presence, map: 'room:ada' }
      const hall = { ...presence, map: 'hall' }
      const cases: [Record<string, unknown>, boolean][] = [
        [{ ...presence, sit: 'bench:7,15:1', sitAt: 1 }, true],
        [{ ...hall, sit: 'chairs:20,7:2', sitAt: 1 }, true],
        [{ ...room, sit: 'rocker:6,4:0', sitAt: 1 }, true],
        [{ ...presence, sit: 'chairs:20,7:0', sitAt: 1 }, false],
        [{ ...hall, sit: 'bench:7,15:0', sitAt: 1 }, false],
        [{ ...room, sit: 'bench:7,15:0', sitAt: 1 }, false],
        [{ ...presence, sit: 'throne:1,1:0', sitAt: 1 }, false],
        [{ ...presence, sit: 'bench:7,15:5', sitAt: 1 }, false],
        [{ ...presence, sit: 'bench:500,1:0', sitAt: 1 }, false],
        [{ ...presence, sit: 'bench:7,15:0' }, false],
        [{ ...presence, sit: 42, sitAt: 1 }, false],
      ]
      for (const [p, ok] of cases) {
        const res = await sync('ada', p)
        expect(res.statusCode, JSON.stringify(p)).toBe(ok ? 200 : 400)
      }
    })

    it('keeps a seat for whoever sat first', async () => {
      const seat = { ...presence, sit: 'bench:19,14:1' }
      await sync('ada', { ...seat, sitAt: 100 })
      const grace = await sync('grace', { ...seat, sitAt: 200 })
      expect(grace.body).toMatchObject({ seatTaken: true })
      const ada = await sync('ada', { ...seat, sitAt: 100 })
      expect((ada.body as Record<string, unknown>).seatTaken).toBeUndefined()
      // The other half of the bench is free.
      const other = await sync('grace', { ...presence, sit: 'bench:19,14:0', sitAt: 300 })
      expect((other.body as Record<string, unknown>).seatTaken).toBeUndefined()
    })
  })

  describe('eggs', () => {
    it('keeps eggs and the henhouse record, and loads saves without them', async () => {
      const s = { ...save(), coop: { day: 1234, taken: 2 }, inv: { egg: 5 } }
      expect((await call({ method: 'POST', op: 'save', body: { save: s } })).statusCode).toBe(200)
      expect((await call({ method: 'GET', op: 'me' })).body).toMatchObject({
        save: { coop: { day: 1234, taken: 2 }, inv: { egg: 5 } },
      })
      expect(save().coop).toBeUndefined()
    })

    it('refuses henhouse records that are not well-formed', async () => {
      for (const coop of [
        { day: 1, taken: 4 },
        { day: 1, taken: -1 },
        { day: -1, taken: 0 },
        { day: 1.5, taken: 0 },
        { taken: 1 },
        'today',
      ]) {
        const res = await call({ method: 'POST', op: 'save', body: { save: { ...save(), coop } } })
        expect(res.statusCode, JSON.stringify(coop)).toBe(400)
      }
    })
  })

  describe('pets', () => {
    const pet = {
      kind: 'dog',
      coat: 1,
      name: '  Biscuit\n',
      adoptedAt: 1_700_000_000_000,
      hearts: 3,
      pettedOn: '2026-11-06',
    }

    it('keeps a pet and treats in the save, and loads saves without a pet', async () => {
      const s = { ...save(), pet, inv: { treat: 2 } }
      expect((await call({ method: 'POST', op: 'save', body: { save: s } })).statusCode).toBe(200)
      expect((await call({ method: 'GET', op: 'me' })).body).toMatchObject({
        save: { pet: { kind: 'dog', coat: 1, name: 'Biscuit', hearts: 3 }, inv: { treat: 2 } },
      })
      expect(save().pet).toBeUndefined()
      expect((await call({ method: 'POST', op: 'save', body: { save: save() } })).statusCode).toBe(
        200,
      )
    })

    it('refuses pets that are not well-formed', async () => {
      const bad = [
        { ...pet, kind: 'dragon' },
        { ...pet, coat: 4 },
        { ...pet, coat: -1 },
        { ...pet, name: '   ' },
        { ...pet, hearts: 11 },
        { ...pet, hearts: 2.5 },
        { ...pet, fedOn: 'yesterday' },
        { ...pet, adoptedAt: 'soon' },
        'Biscuit',
      ]
      for (const p of bad) {
        const res = await call({
          method: 'POST',
          op: 'save',
          body: { save: { ...save(), pet: p } },
        })
        expect(res.statusCode, JSON.stringify(p)).toBe(400)
      }
    })

    it('shows a pet in the world profile without its care details', async () => {
      await call({ method: 'POST', op: 'save', body: { save: { ...save(), pet } } })
      const world = await call({ method: 'GET', op: 'world' })
      const [profile] = (world.body as { profiles: Record<string, unknown>[] }).profiles
      expect(profile.pet).toEqual({ kind: 'dog', coat: 1, name: 'Biscuit' })
    })

    it('shares a following pet through presence', async () => {
      const look = defaultLook('Ada')
      await call({
        method: 'POST',
        op: 'sync',
        body: {
          p: { ...presence, pet: { kind: 'cat', coat: 3, name: 'Pickles' } },
          look,
          since: 0,
        },
      })
      const res = await call({
        method: 'POST',
        op: 'sync',
        login: 'grace',
        body: { p: presence, look: defaultLook('Grace'), since: 0 },
      })
      const players = (res.body as { players: Record<string, unknown>[] }).players
      expect(players[0].pet).toEqual({ kind: 'cat', coat: 3, name: 'Pickles' })
    })

    it('refuses malformed pets in presence', async () => {
      for (const p of [
        { kind: 'cat', coat: 9, name: 'x' },
        { kind: 'cat', coat: 0, name: '' },
      ]) {
        const res = await call({
          method: 'POST',
          op: 'sync',
          body: { p: { ...presence, pet: p }, look: defaultLook('Ada'), since: 0 },
        })
        expect(res.statusCode).toBe(400)
      }
    })
  })
})
