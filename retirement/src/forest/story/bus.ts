import type { Forest } from '../gen'
import { BUS_NEAR, BUS_WAIT_MS } from '../tuning'

/*
 * The Route 9 bus (STORY.md "Route 9 bus stop"). Once you're lost, a copy of the bus stop turns up
 * on a stretch of road that goes nowhere (the forest copies places), and when you come near it,
 * the bus comes: headlights through the trees, brakes, the doors fold open. No one is driving. It
 * waits, then goes.
 *
 * The rule (your own note, "DO NOT RIDE THE BUS ALONE"): riding it alone takes you the wrong way,
 * much deeper in, and something comes for you (game.ts rideBus). It never takes you home. With
 * your pet it would take the old route to the field office; your pet doesn't come into the forest
 * yet, so for now every ride is alone.
 */

export type BusStage = 'empty' | 'coming' | 'stopped' | 'leaving' | 'gone'

export interface BusHooks {
  sound(kind: 'arrive' | 'leave', x: number): void
  thought(text: string): void
  /** You've first seen the copied stop. */
  offStop(): void
}

export class Bus {
  stage: BusStage = 'empty'
  /** The bus's middle (tiles), and the row it drives along. */
  bx: number
  by: number
  private t = 0
  private seenStop = false
  private speed = 0

  constructor(
    forest: Forest,
    /** The shelter's anchor tile (its left end). */
    readonly x: number,
    readonly y: number,
  ) {
    forest.addStamp({
      clear: { x0: x - 4, y0: y - 3, x1: x + 6, y1: y + 4 },
      road: { x0: x - 18, y0: y + 2, x1: x + 22, y1: y + 3 },
      objects: [
        { o: { k: 'prop', x, y, v: 0, id: 'busstop' }, solid: true },
        { o: { k: 'prop', x: x - 1, y, v: 0, id: 'bussign' }, solid: true },
      ],
      solid: [
        { x: x + 1, y },
        { x: x + 2, y },
      ],
    })
    this.by = y + 3
    this.bx = x + 24
  }

  /** Where its door is (you get on there). */
  door(): { x: number; y: number } {
    return { x: this.bx - 1.5, y: this.by - 0.2 }
  }

  /** Close enough to its open door to get on. */
  canBoard(me: { x: number; y: number }): boolean {
    const d = this.door()
    return this.stage === 'stopped' && Math.hypot(me.x - d.x, me.y - d.y) < 1.9
  }

  update(dt: number, me: { x: number; y: number }, h: BusHooks) {
    const near = Math.hypot(me.x - (this.x + 1.5), me.y - this.y)
    if (!this.seenStop && near < 8) {
      this.seenStop = true
      // It shouldn't be here: the forest has copied it.
      h.offStop()
    }
    this.t += dt * 1000
    switch (this.stage) {
      case 'empty':
        if (near < BUS_NEAR && this.seenStop && this.t > 2500) {
          this.stage = 'coming'
          this.t = 0
          this.speed = 7
          h.sound('arrive', this.bx)
        }
        break
      case 'coming': {
        // Pulling in, slowing to stop with its door by the shelter.
        const stopAt = this.x + 3
        this.speed = Math.max(0.6, Math.min(7, (this.bx - stopAt) * 1.1))
        this.bx = Math.max(stopAt, this.bx - this.speed * dt)
        if (this.bx <= stopAt + 0.01) {
          this.stage = 'stopped'
          this.t = 0
          h.thought('There’s no one driving.')
        }
        break
      }
      case 'stopped':
        if (this.t > BUS_WAIT_MS) {
          this.stage = 'leaving'
          this.t = 0
          this.speed = 0
          h.sound('leave', this.bx)
        }
        break
      case 'leaving':
        this.speed = Math.min(9, this.speed + 2.5 * dt)
        this.bx -= this.speed * dt
        if (this.bx < this.x - 26) this.stage = 'gone'
        break
    }
  }

  /** Whether it's there to be drawn. */
  visible(): boolean {
    return this.stage === 'coming' || this.stage === 'stopped' || this.stage === 'leaving'
  }

  /** Its headlights are on while it moves (and dimmed while it waits). */
  lights(): number {
    return this.stage === 'stopped' ? 0.5 : this.visible() ? 1 : 0
  }
}
