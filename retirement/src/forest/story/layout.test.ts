import { describe, expect, it } from 'vitest'
import { OFF_PATH_LOST_MAX } from '../tuning'
import { layout } from './layout'
import { INTERIORS, LANDMARKS } from './map'

/*
 * MAP.md's acceptance checks for the fixed map, walked tile by tile: everything is reachable on
 * foot from the treeline without getting lost, and nothing beyond the locked service gate is (no
 * way round a fence). "Without getting lost" is generous here: a little more than the furthest
 * you can ever be from the paths before you're lost.
 */

const LOST = OFF_PATH_LOST_MAX + 2

/**
 * Every tile you can walk to from the gap (or from `from`) without ever being further than LOST
 * from the paths.
 */
function reachable(from: [number, number] = [0, -1]): Set<string> {
  const L = layout()
  const seen = new Set<string>([`${from[0]},${from[1]}`])
  const queue: [number, number][] = [from]
  while (queue.length) {
    const [x, y] = queue.pop()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx
      const ny = y + dy
      const k = `${nx},${ny}`
      if (seen.has(k) || ny > 1 || L.solid(nx, ny) || L.off(nx, ny) > LOST) continue
      seen.add(k)
      queue.push([nx, ny])
    }
  }
  return seen
}

describe('Hollow Pines map', () => {
  const can = reachable()
  const at = (x: number, y: number) => can.has(`${Math.floor(x)},${Math.floor(y)}`)

  // Past the service gate (once it's open): walked from just north of it.
  const deep = reachable([0, -160])
  const atDeep = (x: number, y: number) => deep.has(`${Math.floor(x)},${Math.floor(y)}`)

  it('reaches every site on foot: up to the service gate, and past it once it’s open', () => {
    for (const lm of LANDMARKS) {
      // (Insides are reached only through their doors.)
      if (lm.id === 'DRESSING' || INTERIORS.includes(lm)) continue
      const reach = lm.y < -158 ? atDeep : at
      // (Its point can be on the building itself: anywhere a step or two from it will do.)
      let near = false
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) near ||= reach(lm.x + dx, lm.y + dy)
      expect(near, lm.id).toBe(true)
    }
  })

  it('crosses the stream cut only by the footbridge, past the watchman’s shelter', () => {
    const L = layout()
    // The road's bridge is gone: water where it would be.
    expect(L.solid(0, -178)).toBe(true)
    // The footbridge is there, and walkable.
    expect(L.ground(7, -178)).toBe('plank')
    expect(L.solid(7, -178)).toBe(false)
    // Every way over the water is within a step or two of the footbridge.
    for (let x = -60; x <= 60; x++)
      for (let y = -182; y <= -176; y++)
        if (L.ground(x, y) === 'plank') expect(Math.abs(x - 7), `${x},${y}`).toBeLessThanOrEqual(1)
  })

  it('keeps you out of the ravine', () => {
    for (let x = -44; x <= -18; x++) expect(atDeep(x, -219), `${x}`).toBe(false)
  })

  it('never loses you for standing right up against the camp’s fence from inside', () => {
    // (Your position can reach just into the fence's row: the fence tile counts as its nearest
    // side.)
    const L = layout()
    for (let x = -21; x <= 21; x++) {
      expect(L.off(x, -127), `south ${x}`).toBeLessThan(2)
      expect(L.off(x, -158), `north ${x}`).toBeLessThan(2)
    }
    for (let y = -157; y <= -128; y++) {
      expect(L.off(-22, y), `west ${y}`).toBeLessThan(2)
      expect(L.off(22, y), `east ${y}`).toBeLessThan(2)
    }
  })

  it('keeps the insides sealed: on the path inside, never walked into from outside', () => {
    const L = layout()
    for (const lm of INTERIORS) {
      const a = lm.areas[0]
      for (let y = a.y0; y <= a.y1; y++)
        for (let x = a.x0; x <= a.x1; x++) expect(L.off(x, y), `${lm.id} ${x},${y}`).toBe(0)
      expect(at(lm.x, lm.y), lm.id).toBe(false)
      // Its walls are solid all round.
      for (let x = a.x0 - 1; x <= a.x1 + 1; x++) {
        expect(L.solid(x, a.y0 - 1)).toBe(true)
        expect(L.solid(x, a.y1 + 1)).toBe(true)
      }
      for (let y = a.y0; y <= a.y1; y++) {
        expect(L.solid(a.x0 - 1, y)).toBe(true)
        expect(L.solid(a.x1 + 1, y)).toBe(true)
      }
    }
  })

  it('never gets past the locked service gate, even round the fence', () => {
    // The deep road beyond the gate, and the woods either side of it.
    for (const [x, y] of [
      [0, -170],
      [-4, -188],
      [-6, -203],
      [-40, -170],
      [40, -170],
    ])
      expect(at(x, y), `${x},${y}`).toBe(false)
  })

  it('only gets into the camp through its gate', () => {
    // Fill from the yard with the camp gate's opening shut: nothing outside is reachable.
    const L = layout()
    const inside = new Set<string>(['0,-140'])
    const queue: [number, number][] = [[0, -140]]
    while (queue.length) {
      const [x, y] = queue.pop()!
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        const k = `${nx},${ny}`
        const gateGap = ny === -127 && nx >= -1 && nx <= 2
        if (inside.has(k) || gateGap || L.solid(nx, ny) || L.off(nx, ny) > LOST) continue
        inside.add(k)
        queue.push([nx, ny])
      }
    }
    expect(inside.has('0,-110')).toBe(false)
    expect(inside.has('0,-170')).toBe(false)
    expect(inside.size).toBeLessThan(80 * 60)
  })
})
