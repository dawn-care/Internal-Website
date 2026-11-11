import type { Dir } from '../../../shared/schema'
import type { ClueId, ItemId, LeadId, PuzzleId } from '../../../shared/story'
import type { Forest, Stamp } from '../gen'
import { FINDS_PER_TRIP, PRINTS, SHELTER_MARK_EVERY } from '../tuning'
import { CLUES } from './clues'
import { FINDS, type Find } from './finds'
import { layout } from './layout'
import type { Landmark, Spot } from './map'

/*
 * This trip on the Hollow Pines map (story/map.ts): what's in your notepad, what you've looked at,
 * which landmarks you've reached, and the small finds lying about this time. The map itself is the
 * same every trip; only the finds (FINDS_PER_TRIP of them, at the map's find spots just off the
 * paths) change.
 */

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a)
const DIRS: Record<Dir, { x: number; y: number }> = {
  0: { x: 0, y: 1 },
  1: { x: -1, y: 0 },
  2: { x: 1, y: 0 },
  3: { x: 0, y: -1 },
}

export class StoryPlan {
  /** This trip's clues, in your notepad: unbanked until you're home safe. */
  found = new Map<ClueId, { note: string }>()
  /** Things you've looked at this trip (their thought is said only the first time). */
  looked = new Set<string>()
  /** Keepsakes you've picked up this trip (unbanked, like the notepad). */
  kept = new Set<string>()
  /**
   * Keys you've picked up this trip: in your pocket, but only yours once you're home safe (caught,
   * they're back where you found them).
   */
  carried = new Set<ItemId>()
  /** Locks you've found this trip and can't open yet (PUZZLES.md: unresolved leads). */
  leads = new Set<LeadId>()
  /**
   * Puzzles solved this trip (a door unlocked, the gate opened): open for the rest of it, and kept
   * if you get home safe (PUZZLES.md: committed on a safe return).
   */
  opened = new Set<PuzzleId>()
  /** Landmarks you've reached this trip (MAP.md site ids, for the rough site map). */
  readonly reached = new Set<string>()

  constructor(
    private forest: Forest,
    /** Clues already on your board. */
    readonly banked: ReadonlySet<ClueId>,
  ) {
    // Scatter this trip's finds at some of the map's find spots.
    const spots = [...layout().findSpots].sort(() => Math.random() - 0.5)
    for (const find of chooseFinds()) {
      const at = spots.find(([x, y]) => {
        const d = Math.hypot(x, y)
        return d >= find.depth[0] && d <= find.depth[1]
      })
      if (!at) continue
      spots.splice(spots.indexOf(at), 1)
      forest.addStamp(findStamp(find, at[0], at[1]))
    }
  }

  /** The first time you come near a landmark: it, so its thought can be said. */
  update(me: { x: number; y: number }): Landmark | null {
    for (const lm of layout().landmarks) {
      if (this.reached.has(lm.id) || !this.forest.isMap(Math.floor(lm.x), Math.floor(lm.y)))
        continue
      if (Math.hypot(me.x - lm.x, me.y - lm.y) < lm.r) {
        this.reached.add(lm.id)
        return lm
      }
    }
    return null
  }

  /**
   * Footprints beside you, going the way you face, starting just beyond your light (an uncanny
   * moment, story/events.ts).
   */
  prints(me: { x: number; y: number; dir: Dir }, from: number) {
    const f = this.forest
    const d = DIRS[me.dir]
    const side = { x: -d.y, y: d.x }
    const objects: Stamp['objects'] = []
    for (let i = 0; i < PRINTS; i++) {
      const s = from + i
      const x = Math.floor(me.x + d.x * s + side.x * 1.2)
      const y = Math.floor(me.y + d.y * s + side.y * 1.2)
      if (f.solid(x, y) || f.storyAt(x, y)) continue
      objects.push({ o: { k: 'prints', x, y, v: i % 2, id: String(me.dir) }, solid: false })
    }
    if (objects.length) f.addStamp({ clear: { x0: 1, y0: 1, x1: 0, y1: 0 }, objects })
  }

  /** Something to examine at a tile (wherever the map is still what's drawn). */
  spotAt(x: number, y: number): Spot | undefined {
    if (!this.forest.isMap(x, y)) return undefined
    return layout().spotAt(x, y)
  }

  /** Where your 1987 self sheltered when lost (put out once you're lost: game.ts). */
  shelter: { x: number; y: number; seen: boolean } | null = null

  /**
   * Your old lean-to, `dist` tiles away along (dx, dy), with the tin box of notes in front of it,
   * and your red marks on the trees leading there from `from` tiles out (off-screen).
   */
  placeShelter(me: { x: number; y: number }, dx: number, dy: number, dist: number, from: number) {
    const f = this.forest
    const l = Math.hypot(dx, dy) || 1
    const ux = dx / l
    const uy = dy / l
    const x = Math.floor(me.x + ux * dist)
    const y = Math.floor(me.y + uy * dist)
    f.addStamp({
      clear: { x0: x - 3, y0: y - 3, x1: x + 4, y1: y + 3 },
      objects: [
        { o: { k: 'prop', x, y, v: 0, id: 'leanto' }, solid: true },
        { o: { k: 'find', x, y: y + 1, v: 0, id: 'tinbox' }, solid: false },
      ],
      solid: [{ x: x + 1, y }],
    })
    // The marks: every few tiles along the way, on a tree a step to the side.
    const arrow = FINDS.find((fd) => fd.id === 'arrow')!
    for (let d = from; d < dist - 3; d += SHELTER_MARK_EVERY) {
      const side = (d / SHELTER_MARK_EVERY) % 2 < 1 ? 1 : -1
      const mx = Math.floor(me.x + ux * d - uy * 1.5 * side)
      const my = Math.floor(me.y + uy * d + ux * 1.5 * side)
      f.addStamp(findStamp(arrow, mx, my))
    }
    this.shelter = { x: x + 0.5, y: y + 0.5, seen: false }
  }

  /** Where clues are waiting to be found (for their faint glint). */
  /**
   * The clue waiting at a spot this trip: its own, or once that's taken (or on your board), the
   * second one in the same place (`also`). Null when there's nothing left to find there.
   */
  clueAt(s: Spot): ClueId | null {
    for (const id of [s.clue, s.also])
      if (id && this.canFind(id) && !this.found.has(id) && !this.banked.has(id)) return id
    return null
  }

  /**
   * The clue to show when you look at a spot: one still to find, or one you already have (to read
   * again). Null when neither can turn up yet (STORY.md's reveal gates): the spot's own look then.
   */
  clueToShow(s: Spot): ClueId | null {
    const fresh = this.clueAt(s)
    if (fresh) return fresh
    for (const id of [s.clue, s.also])
      if (id && (this.found.has(id) || this.banked.has(id))) return id
    return null
  }

  *clueSpots(): Generator<{ x: number; y: number }> {
    if (
      this.shelter &&
      this.canFind('lost_journal') &&
      !this.found.has('lost_journal') &&
      !this.banked.has('lost_journal')
    )
      yield { x: Math.floor(this.shelter.x), y: Math.floor(this.shelter.y) + 1 }
    for (const s of layout().clueSpots) if (this.forest.isMap(s.x, s.y) && this.clueAt(s)) yield s
  }

  /** Whether a clue can be had on this trip (it's written, and its gates are met). */
  canFind(id: ClueId): boolean {
    const c = CLUES[id]
    return !!c && c.needs.every((n) => this.banked.has(n))
  }
}

function chooseFinds(): Find[] {
  const n = Math.round(between(FINDS_PER_TRIP))
  const left = FINDS.filter((f) => f.weight > 0)
  const out: Find[] = []
  while (out.length < n && left.length) {
    const total = left.reduce((s, f) => s + f.weight, 0)
    let r = Math.random() * total
    const i = left.findIndex((f) => (r -= f.weight) < 0)
    out.push(...left.splice(i < 0 ? 0 : i, 1))
  }
  return out
}

function findStamp(find: Find, x: number, y: number): Stamp {
  return {
    // A tree for it to be on (if it's on one), and nothing else on its tile.
    clear: { x0: x, y0: y, x1: x, y1: y },
    objects: [
      ...(find.onTree ? [{ o: { k: 'dead' as const, x, y, v: 1 }, solid: true }] : []),
      { o: { k: 'find' as const, x, y, v: 0, id: find.id }, solid: !!find.onTree },
    ],
  }
}
