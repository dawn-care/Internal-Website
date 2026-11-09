import { HOUR_MS, gameHour } from '../../clock'
import type { Forest, Stamp } from '../gen'
import {
  BUS_CREW_HOURS,
  BUS_CREW_LEAD_MS,
  BUS_EMPTY_AFTER,
  BUS_EMPTY_GAP_MS,
  BUS_EMPTY_QUIET_MS,
  BUS_HEAR,
  BUS_NEAR,
  BUS_WAIT_MS,
} from '../tuning'

/*
 * The Route 9 bus (PUZZLES.md P04; STORY.md "The forest replays what it watched for years"). The
 * forest still runs it on the old crew timetable (BUS_CREW_HOURS on the shared game clock): on the
 * hour a full bus pulls in, the crew standing in its windows, and it takes you safely to the camp
 * gate. Off the timetable there's nothing to replay, and the bus that comes is empty: a lure with
 * SUNSET ACRES on its board. Ride that one alone and it drops you deep in the forest
 * (story/ride.ts). Which bus it is shows only in its windows: nothing tells you.
 *
 * It runs at the real stop on the map, and at a copy of the stop that turns up when you're lost
 * (with a stretch of road that goes nowhere: the forest copies places).
 */

export type BusStage = 'idle' | 'coming' | 'stopped' | 'leaving'

export interface BusHooks {
  sound(kind: 'arrive' | 'leave', x: number): void
  /** You've first seen the copied stop. */
  offStop(): void
}

/** How long (real ms) until the next crew run reaches the stop, from game time `now`. */
export function untilCrew(now: number): number {
  const hour = gameHour(now)
  let best = Infinity
  for (const h of BUS_CREW_HOURS) {
    let d = h - hour
    if (d <= 0) d += 24
    best = Math.min(best, d * HOUR_MS)
  }
  return best
}

export class Bus {
  stage: BusStage = 'idle'
  /** This run's passengers: the crew (safe) or no one (alone). */
  full = false
  /** The bus's middle (tiles), and the row it drives along. */
  bx: number
  readonly by: number
  /** How visible it is (it doesn't drive away: it fades). */
  alpha = 1
  private t = 0
  private near = 0
  private seenStop = false
  private speed = 0
  private lastRun = -1
  private stamp: Stamp | null = null

  constructor(
    /** The shelter's anchor tile (its left end). */
    readonly x: number,
    readonly y: number,
    /** Which way it drives: -1 left (it comes from the right), 1 right. */
    readonly dir: -1 | 1,
    /** The row of the road it drives along. */
    roadY: number,
    /** The copied stop (lost): put into the forest with its own stretch of road. */
    forest?: Forest,
  ) {
    this.by = roadY
    this.bx = this.stopAt() - dir * 26
    if (forest) {
      this.stamp = {
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
      }
      forest.addStamp(this.stamp)
    }
  }

  /** Takes the copied stop out of the forest again. */
  remove(forest: Forest) {
    if (this.stamp) forest.removeStamp(this.stamp)
  }

  /** Where its middle stops: its door by the shelter. */
  private stopAt(): number {
    return this.x + 1.5 - this.dir * 1.6
  }

  /** Where its door is (you get on there): just behind the front. */
  door(): { x: number; y: number } {
    return { x: this.bx + this.dir * 1.6, y: this.by - 0.2 }
  }

  /** Its front (for the headlights). */
  front(): number {
    return this.bx + this.dir * 3.4
  }

  /** Close enough to its open door to get on. */
  canBoard(me: { x: number; y: number }): boolean {
    const d = this.door()
    return this.stage === 'stopped' && Math.hypot(me.x - d.x, me.y - d.y) < 1.9
  }

  /** You got on: it shuts and goes, out of sight. */
  boarded() {
    this.stage = 'idle'
    this.t = 0
    this.near = 0
    this.alpha = 1
    this.bx = this.stopAt() - this.dir * 26
  }

  /** `now`: game time (ms, the shared clock). */
  update(dt: number, me: { x: number; y: number }, now: number, h: BusHooks, copied: boolean) {
    const ms = dt * 1000
    const near = Math.hypot(me.x - (this.x + 1.5), me.y - this.y)
    if (copied && !this.seenStop && near < 8) {
      this.seenStop = true
      // It shouldn't be here: the forest has copied it.
      h.offStop()
    }
    this.t += ms
    switch (this.stage) {
      case 'idle': {
        this.near = near < BUS_NEAR ? this.near + ms : Math.max(0, this.near - ms)
        // A crew run, on the hour: it sets off a little ahead so it stops on time.
        const until = untilCrew(now)
        const run = Math.floor((now + until) / (HOUR_MS / 4))
        if (until <= BUS_CREW_LEAD_MS && run !== this.lastRun && near < BUS_HEAR) {
          this.lastRun = run
          return this.come(true, h)
        }
        // Off the timetable: an empty one, if you hang about at the stop.
        if (
          this.near > BUS_EMPTY_AFTER &&
          this.t > BUS_EMPTY_GAP_MS &&
          until > BUS_EMPTY_QUIET_MS &&
          (!copied || this.seenStop)
        )
          this.come(false, h)
        break
      }
      case 'coming': {
        // Pulling in, slowing to stop with its door by the shelter.
        const stopAt = this.stopAt()
        const left = (stopAt - this.bx) * this.dir
        this.speed = Math.max(0.6, Math.min(7, left * 1.1))
        this.bx += this.dir * Math.min(left, this.speed * dt)
        if (left - this.speed * dt <= 0.01) {
          this.bx = stopAt
          this.stage = 'stopped'
          this.t = 0
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
        // It pulls away and is gone: not down the road, just gone, a little way on.
        this.speed = Math.min(6, this.speed + 2.5 * dt)
        this.bx += this.dir * this.speed * dt
        this.alpha = Math.max(0, 1 - Math.max(0, this.t - 1500) / 1500)
        if (this.alpha <= 0) {
          this.stage = 'idle'
          this.t = 0
          this.near = 0
          this.alpha = 1
          this.bx = this.stopAt() - this.dir * 26
        }
        break
    }
  }

  private come(full: boolean, h: BusHooks) {
    this.full = full
    this.stage = 'coming'
    this.t = 0
    this.speed = 7
    this.alpha = 1
    this.bx = this.stopAt() - this.dir * 26
    h.sound('arrive', this.bx)
  }

  /** Whether it's there to be drawn. */
  visible(): boolean {
    return this.stage !== 'idle'
  }

  /** Its headlights are on while it moves (and dimmed while it waits). */
  lights(): number {
    return (this.stage === 'stopped' ? 0.5 : this.visible() ? 1 : 0) * this.alpha
  }
}
