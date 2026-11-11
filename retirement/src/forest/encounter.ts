import { ACCESSORIES, HAIR_COLORS, OUTFIT_COLORS, type Relation } from '../../shared/catalog'
import type { Dir, Look, Save } from '../../shared/schema'
import { photoWhere } from '../../shared/schema'
import type { DialogueOptions } from '../ui'
import { EYE_COLORS, eyeFor } from '../portraits'
import {
  FAKE_NURSE_NAMES,
  FAMILY_SCRIPT,
  FAMILY_TELLS,
  NURSE_PITCH,
  NURSE_SCRIPT,
  NURSE_TELLS,
  VOICE_PITCH,
  caughtLine,
  fill,
  homeLine,
  wrongCalls,
  type Script,
  type Tell,
} from './encounters'
import {
  CHASE_CATCH,
  CHASE_LOSE,
  CHASE_GIVE_UP_MS,
  CHASE_DREAD,
  CHASE_LIGHT,
  PAUSE_DREAD,
  STAGE_DREAD,
  CHASE_LOSE_MS,
  CHASE_PAUSE_MS,
  CHASE_SPEED,
  ENCOUNTER_EVERY,
  STARE_MS,
  ENCOUNTER_FIRST,
  CALL_COME,
  CALL_EVERY,
  CALL_EVERY_FAKE,
  CALL_NEAREST,
  CALL_WAIT,
  CALL_WRONG_SIDE,
  FAKE_LEAVE_MS,
  FOLLOW_MS,
  FOLLOW_NEAR,
  LUNGE_SPEED,
  TURN_MS,
  ENCOUNTER_LOST_EVERY,
  ENCOUNTER_LOST_FIRST,
  ENCOUNTER_SPAWN,
  ENCOUNTER_TALK,
  FAKE_ASKS,
  FOREST_VOICE,
  VOICE_FLOOR,
  VOICE_LOW_BOOST,
  STAGE_VOICE_S,
  FAKE_PER_MINUTE,
  FAKE_PER_TILE,
  LED_MS,
  LOOK_LIGHT,
  NURSE_CHANCE,
  PERSON_SPEED,
  REAL_CHANCE,
  REAL_CHANCE_MIN,
  RETURN_AFTER,
  RETURN_CHANCE,
  STAGE_LIGHT,
  STAGE_PITCH,
  STAGE_TYPE_MS,
  TELLS,
  TELL_COLOR_MIN,
  TELL_EYE_MIN,
} from './tuning'

/*
 * People who find you in the forest (FOREST.md "Encounters: the nurse and the family"): a nurse
 * who looks like Nurse Ada, or one of the family in your photo. Most are real; some are fakes,
 * each with one or two tells. Everything here runs in your own browser only.
 *
 * Phases: someone walks up out of the dark ('approach') and talks ('talk', or 'compare' while you
 * hold up the photo). Go with a real one and they walk you home; refuse and they're hurt and walk
 * away ('leave'). Go with a fake and it leads you deeper ('lead') until you're caught; refuse and
 * it asks again, a stage further gone, until it stands still ('pause') and comes for you
 * ('chase'). Lose it in the dark and it may come back later.
 */

export interface Person {
  real: boolean
  nurse: boolean
  rel: Relation | 'nurse'
  /** How they look now (a fake's tells are already in it). */
  look: Look
  /** Who they say they are, and what they call you. */
  name: string
  calls: string
  tells: Set<Tell>
  eye?: string
  badge?: 'sunset' | 'hollow'
  pitch: number
  x: number
  y: number
  dir: Dir
  anim: number
  phase:
    /** Lost: a searcher off in the dark with a torch, calling, waiting for you to come. */
    | 'call'
    | 'approach'
    | 'talk'
    | 'compare'
    | 'leave'
    | 'lead'
    | 'stare'
    | 'pause'
    | 'chase'
    /** You followed a grinning one: it stops, grows and turns... */
    | 'turn'
    /** ...and lunges. */
    | 'lunge'
  /** How far a fake has given up pretending (0–3), and how often you've said no. */
  stage: number
  asks: number
  /** Time in this phase (ms). */
  t: number
  /** You've already held up the photo to them. */
  looked: boolean
  /** Which way it goes round things in its way (1 or -1). */
  side: number
  /** How long (ms) you've been out of its reach while it chases you. */
  far: number
  /** Where it has walked while leading you (you follow it). */
  trail: { x: number; y: number }[]
  /** A searcher's next call (ms). */
  callIn?: number
  /** A fake you turned away: it backs off into the dark facing you, grinning. */
  grin?: boolean
  /** How long (ms) you've been following it as it goes, and where you were last frame. */
  followed?: number
  lx?: number
  ly?: number
}

/** What the encounters need from the game. */
export interface Host {
  readonly me: { x: number; y: number }
  readonly save: Save
  /** Whether a body standing at (x, y) would be inside something solid. */
  blocked(x: number, y: number): boolean
  dialogue(who: string, lines: string[], opts: DialogueOptions): void
  closeDialogue(): void
  /** The photo next to the person in front of you; `onClose` when you put it away. */
  compare(person: Person, onClose: () => void): void
  closePanel(): void
  /** A step on the leaves, from (x, y); `heavy` while it runs at you. */
  step(x: number, y: number, heavy?: boolean): void
  /** The trip ends on a black screen with a line: home (notes kept) or caught (the infirmary). */
  end(kind: 'home' | 'caught', line: string, who?: Person): void
  /** Straight-line distance from where you came in (deeper means more fakes). */
  depth(): number
  /**
   * Whether the forest copies people yet: only once the service gate's padlock is open (P05). Before
   * that, everyone who comes looking for you is real (so the copies don't give the story away before
   * the camp's papers do).
   */
  copies(): boolean
  /** You're lost: people come looking far more often (there's nothing else to do but wait). */
  lost(): boolean
  /** You're sitting down, waiting (searchers come to you sooner). */
  waiting(): boolean
  /** How far you can see on screen (half the view's shorter side, tiles). */
  viewR(): number
  /** A searcher calls out: Ada whistles, family call your name; a fake's may come from the wrong side. */
  call(p: Person, wrongSide: boolean): void
  /** Whether people may turn up now (not mid-collapse, not leaving). */
  quiet(): boolean
  /** Whether a dialogue or panel is open (someone is talking to you). */
  talking(): boolean
  /** A slow rising swell of sound as it changes (stage 1–3). */
  swell(stage: number): void
  /** A recorded sound from (x, y): flesh as it changes, bones as it stretches, the rise as it
   * comes for you, a moan as it loses you. */
  play(name: 'flesh' | 'bones' | 'rise' | 'moan', x: number, y: number, volume?: number): void
  /** Whether this trip can still have a real danger (one at most: story/plan.ts), and using it. */
  danger(): boolean
  spendDanger(): void
  /** Something goes through your head. */
  thought(text: string): void
}

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a)
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]

export class Encounters {
  person: Person | null = null
  private next = between(ENCOUNTER_FIRST)
  private wasLost = false
  /** A chaser you lost may come back: ms until it does (0: it won't). */
  private comeBack = 0
  private comeBackAs: Person | null = null
  /** Minutes out (for fakes getting more common the longer you stay). */
  private out = 0

  constructor(private host: Host) {}

  /** How much of your light is left: it shrinks as a fake changes, and while you hold the photo. */
  lightScale(time: number): number {
    const p = this.person
    if (!p) return 1
    // Running for your life, the light flares back up so you can see where you're going.
    if (p.phase === 'chase') return CHASE_LIGHT
    let k = STAGE_LIGHT[Math.min(3, p.stage)] ?? 1
    if (p.phase === 'compare') k *= LOOK_LIGHT + Math.sin(time / 60) * 0.04
    return k
  }

  /**
   * How close the chase is, for its sound and the red at the edge of the screen: 0 (no chase),
   * about half while it stands still, rising to 1 as it closes in.
   */
  chaseLevel(): number {
    const p = this.person
    if (!p) return 0
    if (p.phase === 'pause') return PAUSE_DREAD
    if (p.phase === 'turn' || p.phase === 'lunge') return 1
    if (p.phase === 'lead') return 0
    if (p.phase !== 'chase') return STAGE_DREAD[Math.min(3, p.stage)] ?? 0
    const d = Math.hypot(p.x - this.host.me.x, p.y - this.host.me.y)
    return Math.max(CHASE_DREAD, Math.min(1, 1 - (d - 1) / (CHASE_LOSE + 2)))
  }

  /**
   * While a fake leads you away, which way you're pulled (you can't stop yourself): along the
   * path it walked, so you go round the same trees it did.
   */
  leading(): { x: number; y: number } | null {
    const p = this.person
    if (!p || p.phase !== 'lead') return null
    const me = this.host.me
    while (p.trail.length && Math.hypot(p.trail[0].x - me.x, p.trail[0].y - me.y) < 0.3)
      p.trail.shift()
    const to = p.trail[0]
    if (!to || Math.hypot(p.x - me.x, p.y - me.y) < 1.1) return { x: 0, y: 0 }
    const dx = to.x - me.x
    const dy = to.y - me.y
    const d = Math.hypot(dx, dy) || 1
    return { x: dx / d, y: dy / d }
  }

  /** Whether someone is in the middle of finding you (no collapsing mid-conversation). */
  busy(): boolean {
    return !!this.person
  }

  /** Back on the map (a safe bus ride, PUZZLES.md P04): no longer lost. */
  found() {
    this.wasLost = false
  }

  update(dt: number) {
    const ms = dt * 1000
    this.out += dt / 60
    const p = this.person
    if (!p) {
      if (this.comeBack > 0) {
        this.comeBack -= ms
        if (this.comeBack <= 0 && this.comeBackAs && this.host.quiet()) {
          const back = this.comeBackAs
          this.comeBackAs = null
          this.placeOutOfSight(back)
          back.phase = 'chase'
          back.t = 0
          this.person = back
        }
        return
      }
      // Once you're lost they start looking for you in earnest: the next is soon.
      if (this.host.lost() && !this.wasLost) {
        this.wasLost = true
        this.next = Math.min(this.next, between(ENCOUNTER_LOST_FIRST))
      }
      this.next -= ms
      if (this.next <= 0 && this.host.quiet()) this.spawn()
      return
    }
    p.t += ms
    const me = this.host.me
    const dist = Math.hypot(p.x - me.x, p.y - me.y)
    switch (p.phase) {
      case 'call': {
        this.face(p)
        p.callIn = (p.callIn ?? 0) - ms
        if (p.callIn <= 0) {
          // A real one calls steadily; a fake at odd intervals, and now and then from where it
          // isn't.
          this.host.call(p, !p.real && Math.random() < CALL_WRONG_SIDE)
          p.callIn = p.real ? CALL_EVERY : between(CALL_EVERY_FAKE)
        }
        const wait = this.host.waiting() ? CALL_WAIT / 2 : CALL_WAIT
        if (dist < CALL_COME || p.t > wait) {
          p.phase = 'approach'
          p.t = 0
        }
        break
      }
      case 'approach':
        if (dist <= ENCOUNTER_TALK) {
          p.phase = 'talk'
          p.t = 0
          this.face(p)
          this.greet(p)
        } else if (p.t > 25_000 && dist > CHASE_LOSE) {
          // You kept walking away: they lose you in the dark.
          this.done()
        } else if (!this.walk(p, me.x, me.y, PERSON_SPEED, dt) && p.t > 6000) {
          // Stuck behind the trees: they find another way round (out of sight, then closer).
          this.placeOutOfSight(p, 4)
          p.t = 0
        }
        break
      case 'talk':
        // The conversation was closed without an answer: they ask again.
        if (!this.host.talking() && p.t > 800) {
          p.t = 0
          this.reask(p)
        }
        break
      case 'compare':
        // Real or fake, they wait while you look (the cost is your light). If the photo was put
        // away without "Put it away" (Escape), the conversation carries on.
        if (!this.host.talking()) this.afterLooking(p)
        break
      case 'leave': {
        // Walking away into the dark, the way they came.
        const ax = p.x + (p.x - me.x)
        const ay = p.y + (p.y - me.y)
        if (!p.grin) {
          this.walk(p, ax, ay, PERSON_SPEED, dt)
          if (dist > CHASE_LOSE || p.t > 9000) this.done()
          break
        }
        // A fake you turned away backs off slowly, still facing you, grinning. Follow it, and
        // it stops.
        this.walk(p, ax, ay, PERSON_SPEED * 0.7, dt)
        this.face(p)
        const toward =
          p.lx === undefined
            ? 0
            : ((me.x - p.lx) * (p.x - me.x) + (me.y - (p.ly ?? me.y)) * (p.y - me.y)) /
              Math.max(0.01, dist)
        p.lx = me.x
        p.ly = me.y
        p.followed =
          dist < FOLLOW_NEAR && toward > 0.005
            ? (p.followed ?? 0) + ms
            : Math.max(0, (p.followed ?? 0) - ms * 0.5)
        if ((p.followed ?? 0) > FOLLOW_MS) {
          // It grows, all at once, and turns its whole self to you.
          p.phase = 'turn'
          p.t = 0
          p.stage = 3
          this.host.swell(3)
          this.host.play('bones', p.x, p.y)
          this.host.play('rise', p.x, p.y)
        } else if (dist > CHASE_LOSE * 1.4 || p.t > FAKE_LEAVE_MS) this.done()
        break
      }
      case 'turn':
        this.face(p)
        if (p.t > TURN_MS) {
          p.phase = 'lunge'
          p.t = 0
        }
        break
      case 'lunge':
        this.walk(p, me.x, me.y, LUNGE_SPEED, dt, true)
        if (dist < CHASE_CATCH) {
          this.person = null
          this.host.end('caught', 'You shouldn’t have followed it.', p)
        } else if (p.t > 3000) this.done()
        break
      case 'lead': {
        // Away from where you came in, deeper in, a little ahead of you (it waits if you fall
        // behind). You follow the trail it leaves.
        if (dist < 2.6) {
          const ox = p.x - 0.5
          const oy = p.y - 0.5
          const l = Math.hypot(ox, oy) || 1
          this.walk(p, p.x + (ox / l) * 2, p.y + (oy / l) * 2, PERSON_SPEED * 1.2, dt)
          const last = p.trail[p.trail.length - 1]
          if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.25)
            p.trail.push({ x: p.x, y: p.y })
        }
        if (p.t > LED_MS) {
          this.person = null
          this.host.end('caught', caughtLine(p.rel), p)
        }
        break
      }
      case 'stare':
        // It just looks at you. Then it turns and goes, and you hear it a long way off.
        if (p.t > STARE_MS) {
          p.phase = 'leave'
          p.t = 0
          p.grin = true
        }
        break
      case 'pause':
        if (p.t > CHASE_PAUSE_MS) {
          p.phase = 'chase'
          p.t = 0
        }
        break
      case 'chase':
        this.walk(p, me.x, me.y, CHASE_SPEED, dt, true)
        p.far = dist > CHASE_LOSE ? p.far + ms : 0
        if (dist < CHASE_CATCH) {
          this.person = null
          this.host.end('caught', caughtLine(p.rel), p)
        } else if (p.far > CHASE_LOSE_MS || p.t > CHASE_GIVE_UP_MS) {
          // Lost in the dark: it moans away into the trees. It may come back.
          this.host.play('moan', p.x, p.y, 0.8)
          if (Math.random() < RETURN_CHANCE) {
            this.comeBack = between(RETURN_AFTER)
            this.comeBackAs = p
          }
          this.done()
        }
        break
    }
  }

  // --- who comes ----------------------------------------------------------------------------

  private spawn() {
    const save = this.host.save
    const family = save.family?.members ?? []
    const nurse = !family.length || Math.random() < NURSE_CHANCE
    const chance = Math.max(
      REAL_CHANCE_MIN,
      REAL_CHANCE - this.host.depth() * FAKE_PER_TILE - this.out * FAKE_PER_MINUTE,
    )
    const real = !this.host.copies() || Math.random() < chance
    const member = nurse ? null : pick(family)
    const tells = new Set<Tell>()
    if (!real) {
      const pool = [...(nurse ? NURSE_TELLS : FAMILY_TELLS)]
      const n = Math.round(between([TELLS[0], TELLS[1] + 0.49]))
      while (tells.size < n && pool.length)
        tells.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    const base: Look = nurse ? { ...ADA_LOOK } : { ...member!.look }
    const look = applyTells(base, tells)
    const realCalls = nurse ? save.look.name : member!.calls
    const p: Person = {
      real,
      nurse,
      rel: nurse ? 'nurse' : member!.rel,
      look,
      name: nurse ? (tells.has('name') ? pick(FAKE_NURSE_NAMES) : 'Ada') : member!.look.name,
      calls: tells.has('calls') ? wrongCalls(realCalls, Math.random()) : realCalls,
      tells,
      eye: tells.has('eyes') ? clearlyOther(EYE_COLORS, eyeFor(base), TELL_EYE_MIN) : undefined,
      badge: nurse ? (tells.has('badge') ? 'hollow' : 'sunset') : undefined,
      pitch: nurse ? NURSE_PITCH : VOICE_PITCH[member!.rel],
      x: 0,
      y: 0,
      dir: 0,
      anim: 0,
      phase: 'approach',
      stage: 0,
      asks: 0,
      t: 0,
      looked: false,
      side: Math.random() < 0.5 ? 1 : -1,
      far: 0,
      trail: [],
    }
    // The look the player sees is the person's name in the dialogue (portraits take eye colour
    // from it), so a fake's face keeps the real one's name.
    p.look.name = base.name
    if (this.host.lost()) {
      // Lost: they don't just walk up. Off in the dark, a torch and a voice: go to them.
      p.phase = 'call'
      p.callIn = 600
      this.placeOutOfSight(p, Math.max(CALL_NEAREST, this.host.viewR() - 1.5))
    } else this.placeOutOfSight(p)
    this.person = p
  }

  /** Somewhere out in the dark round you that a body fits. */
  private placeOutOfSight(p: Person, r = ENCOUNTER_SPAWN) {
    const me = this.host.me
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2
      const x = me.x + Math.cos(a) * r
      const y = me.y + Math.sin(a) * r
      if (!this.host.blocked(x, y)) {
        p.x = x
        p.y = y
        return
      }
    }
    p.x = me.x + r
    p.y = me.y
  }

  // --- talking ------------------------------------------------------------------------------

  private script(p: Person): Script {
    return p.nurse ? NURSE_SCRIPT : FAMILY_SCRIPT
  }

  private say(p: Person, lines: string[], choices: boolean, onDone?: () => void, mood?: 'hurt') {
    const v = { calls: p.calls, name: p.name, you: this.host.save.look.name, rel: String(p.rel) }
    const stage = p.stage
    const voicePitch = Math.max(VOICE_FLOOR, p.pitch * STAGE_PITCH[stage])
    // 0 for a voice at 300 Hz or higher, 1 down at the floor.
    const lowness = Math.max(0, Math.min(1, (300 - voicePitch) / (300 - VOICE_FLOOR)))
    const opts: DialogueOptions = {
      look: p.look,
      old:
        !p.nurse &&
        (p.rel === 'husband' ||
          p.rel === 'wife' ||
          p.rel === 'partner' ||
          p.rel === 'sister' ||
          p.rel === 'brother'),
      badge: p.badge,
      eye: p.eye,
      pitch: voicePitch,
      voiceVolume: FOREST_VOICE * (1 + (VOICE_LOW_BOOST - 1) * lowness),
      voiceMs: STAGE_VOICE_S[stage],
      typeMs: STAGE_TYPE_MS[stage],
      wave: stage >= 2 ? 'sawtooth' : stage === 1 ? 'square' : 'triangle',
      garble: stage / 3,
      fake: !p.real ? { stage, noBlink: p.tells.has('blink') } : undefined,
      mood,
      onDone,
    }
    if (choices) {
      const go = { label: `Go with ${p.nurse ? 'her' : p.name}`, onPick: () => this.go(p) }
      const no = { label: "No. I'm staying here", onPick: () => this.refuse(p) }
      const look =
        !p.nurse && !p.looked && photoWhere(this.host.save) === 'pocket'
          ? [{ label: 'Look at the photo', onPick: () => this.lookAtPhoto(p) }]
          : []
      opts.choices = [go, ...look, no]
    }
    const who = p.nurse ? `Nurse ${p.name}` : p.name
    this.host.dialogue(
      who,
      lines.map((l) => fill(l, v)),
      opts,
    )
  }

  private greet(p: Person) {
    this.say(p, this.script(p).greet, true)
  }

  /** Asks again where things stand (after a conversation was closed without an answer). */
  private reask(p: Person) {
    if (p.asks >= FAKE_ASKS) {
      p.phase = 'pause'
      return
    }
    if (p.stage === 0) return this.say(p, this.script(p).greet.slice(-1), true)
    const again = this.script(p).again
    this.say(p, [again[Math.min(again.length - 1, p.asks - 1)]], true)
  }

  private go(p: Person) {
    this.say(p, this.script(p).go, false, () => {
      if (p.real) {
        this.person = null
        this.host.end('home', homeLine(p.name, p.nurse))
      } else {
        p.phase = 'lead'
        p.t = 0
      }
    })
  }

  private refuse(p: Person) {
    // A fake, turned away, stops pretending: it stands and stares, then backs off into the dark
    // grinning. It never chases you for saying no (play-testing: the chase felt random); it only
    // comes for you if you follow it (case 'leave').
    if (!p.real) {
      p.stage = 1
      p.phase = 'stare'
      p.t = 0
      this.host.closeDialogue()
      this.host.swell(1)
      this.face(p)
      return
    }
    if (p.real) {
      // Sad, but safe: they're hurt and leave, and that's one way home gone.
      return this.say(
        p,
        this.script(p).hurt,
        false,
        () => {
          p.phase = 'leave'
          p.t = 0
        },
        'hurt',
      )
    }
  }

  private lookAtPhoto(p: Person) {
    p.looked = true
    p.phase = 'compare'
    p.t = 0
    this.host.compare(p, () => {
      if (this.person === p && p.phase === 'compare') this.afterLooking(p)
    })
  }

  /** Back from the photo: they ask again, the same whether they're real or not. */
  private afterLooking(p: Person) {
    p.phase = 'talk'
    p.t = 0
    this.say(p, ["What is it, {calls}? It's getting dark. Come on."], true)
  }

  // --- moving -------------------------------------------------------------------------------

  /** Walks towards (tx, ty), sliding along whatever's in the way. False if it didn't move. */
  private walk(p: Person, tx: number, ty: number, speed: number, dt: number, chase = false) {
    const dx = tx - p.x
    const dy = ty - p.y
    const d = Math.hypot(dx, dy)
    if (d < 0.05) return true
    const step = Math.min(d, speed * dt)
    const before = { x: p.x, y: p.y }
    // Straight there, sliding along what's in the way; if that gets nowhere, angle round it (the
    // side it last went round first, so it doesn't dither).
    const base = Math.atan2(dy, dx)
    const tries = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8].map((a) => a * p.side)
    for (const a of tries) {
      const nx = p.x + Math.cos(base + a) * step
      const ny = p.y + Math.sin(base + a) * step
      if (!this.host.blocked(nx, p.y)) p.x = nx
      if (!this.host.blocked(p.x, ny)) p.y = ny
      if (Math.hypot(p.x - before.x, p.y - before.y) > step * 0.4) {
        if (a !== 0) p.side = a > 0 ? 1 : -1
        break
      }
    }
    const moved = Math.hypot(p.x - before.x, p.y - before.y)
    if (moved > 0.001) {
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
      const was = Math.floor(p.anim) % 4
      p.anim += dt * (chase ? 9 : 7)
      const now = Math.floor(p.anim) % 4
      // Once it's chasing you the pretending is over: you hear it coming, whatever it was hiding.
      if (now !== was && (now === 1 || now === 3) && (chase || !p.tells.has('steps')))
        this.host.step(p.x, p.y, chase)
      return true
    }
    p.anim = 0
    return false
  }

  private face(p: Person) {
    const dx = this.host.me.x - p.x
    const dy = this.host.me.y - p.y
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
    p.anim = 0
  }

  private done() {
    this.person = null
    this.next = between(this.host.lost() ? ENCOUNTER_LOST_EVERY : ENCOUNTER_EVERY)
  }
}

/** Nurse Ada as she looks at home (the forest's nurse looks like her). */
export const ADA_LOOK: Look = {
  name: 'Nurse Ada',
  body: 'female',
  skin: 4,
  hair: 'short',
  hairColor: 5,
  outfit: 4,
  pants: 2,
  accessory: 'none',
}

/** A copy of `look` with a fake's visible tells: a wrong hair or cardigan colour, an extra. */
export function applyTells(look: Look, tells: Set<Tell>): Look {
  const out = { ...look }
  if (tells.has('hair'))
    out.hairColor = HAIR_COLORS.indexOf(
      clearlyOther(HAIR_COLORS, HAIR_COLORS[out.hairColor], TELL_COLOR_MIN),
    )
  if (tells.has('outfit'))
    out.outfit = OUTFIT_COLORS.indexOf(
      clearlyOther(OUTFIT_COLORS, OUTFIT_COLORS[out.outfit], TELL_COLOR_MIN),
    )
  if (tells.has('accessory'))
    out.accessory =
      out.accessory === 'none'
        ? pick(ACCESSORIES.filter((a) => a === 'glasses' || a === 'hat' || a === 'scarf'))
        : 'none'
  return out
}

/** How different two #rrggbb colours look (the "redmean" weighted distance, 0 to about 765). */
export function colorDistance(a: string, b: string): number {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [r1, g1, b1] = p(a)
  const [r2, g2, b2] = p(b)
  const rm = (r1 + r2) / 2
  return Math.sqrt(
    (2 + rm / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - rm) / 256) * (b1 - b2) ** 2,
  )
}

/**
 * A colour from `palette` that's obviously not `real` (at least `min` apart): any family, as long
 * as you'd notice. Falls back to the most different one if none is far enough.
 */
export function clearlyOther(palette: readonly string[], real: string, min: number): string {
  const far = palette.filter((c) => colorDistance(c, real) >= min)
  if (far.length) return pick(far)
  return [...palette].sort((x, y) => colorDistance(y, real) - colorDistance(x, real))[0]
}
