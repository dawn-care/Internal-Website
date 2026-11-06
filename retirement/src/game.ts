import {
  CROPS,
  FURNITURE,
  MAX_SLOTS,
  PLOT_H,
  PLOT_W,
  ROOM_DOOR_X,
  ROOM_FLOOR,
  ROOM_WALL,
} from '../shared/catalog'
import {
  MAX_CHAT_CHARS,
  MAX_ROOM_ITEMS,
  type ChatMsg,
  type Dir,
  type Look,
  type MapId,
  type Player,
  type Profile,
  type RoomItem,
  type Save,
} from '../shared/schema'
import {
  FLAT_KINDS,
  LAMP_LIGHT_Y,
  TS,
  drawCrop,
  drawFurniture,
  drawObject,
  drawSoil,
  drawWaterGlints,
  renderGround,
} from './art'
import { sfx } from './audio'
import { footstep, setAmbience, type Surface } from './soundscape'
import * as garden from './garden'
import {
  buildRoom,
  getGrounds,
  getHall,
  hallDoorX,
  T,
  groundAt,
  inBounds,
  plotAt,
  plotOrigin,
  roomId,
  type GameMap,
  type Interact,
  type Npc,
} from './maps'
import { NetError, type Net } from './net'
import { SPR_H, SPR_W, personSprite } from './people'
import type { UI } from './ui'

const SPEED = 3.3
const FAST = 5.2
const SYNC_MS = 1000
/** How far away (tiles) you can hear a neighbour's footsteps. */
const HEAR_STEPS = 8
const SYNC_HIDDEN_MS = 5000
const WORLD_MS = 20_000
const SAVE_GAP_MS = 8000
const BUBBLE_MS = 7000

interface Remote {
  p: Player
  rx: number
  ry: number
  anim: number
  /** Last walk frame, to play a footstep as each foot lands. */
  frame: number
}

/** Walk frames 1 and 3 are the ones where a foot comes down. */
const landed = (prev: number, anim: number) => {
  const f = Math.floor(anim) % 4
  return f !== prev && (f === 1 || f === 3)
}

interface Drawable {
  y: number
  draw: () => void
}

export class Game {
  readonly view: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  readonly overlay: HTMLCanvasElement
  private octx: CanvasRenderingContext2D
  scale = 3
  private vw = 0
  private vh = 0
  private cam = { x: 0, y: 0 }

  mapId: MapId = 'grounds'
  map: GameMap = getGrounds()
  private groundCache = new Map<string, HTMLCanvasElement>()
  private fences = new Set<string>()

  me = { x: 0, y: 0, dir: 0 as Dir, moving: false, anim: 0 }
  profiles = new Map<string, Profile>()
  private others = new Map<string, Remote>()
  private bubbles = new Map<string, { text: string; until: number }>()
  chatLog: ChatMsg[] = []
  private chatSince = 0
  private pendingMsg: string | null = null
  private serverSkew = 0

  keys = new Set<string>()
  selectedSeed = 'radish'
  decor: {
    active: boolean
    held: number
    from: { x: number; y: number } | null
    mouse: { x: number; y: number } | null
  } = {
    active: false,
    held: -1,
    from: null,
    mouse: null,
  }

  private dirty = false
  private dirtyAt = 0
  private lastSaveAt = 0
  private saving = false
  private fade = 0
  private last = performance.now()
  private time = 0
  private syncTimer = 0
  stopped = false

  constructor(
    readonly net: Net,
    readonly login: string,
    public save: Save,
    public slot: number,
    readonly ui: UI,
  ) {
    this.view = document.createElement('canvas')
    this.view.className = 'view'
    this.ctx = this.view.getContext('2d')!
    this.overlay = document.createElement('canvas')
    this.overlay.className = 'overlay'
    this.octx = this.overlay.getContext('2d')!
    this.save.slot = slot
    for (const o of getGrounds().objects) if (o.k === 'fence') this.fences.add(`${o.x},${o.y}`)
  }

  start(parent: HTMLElement) {
    parent.prepend(this.overlay)
    parent.prepend(this.view)
    this.resize()
    addEventListener('resize', () => this.resize())
    this.bindInput()
    this.warp('grounds', getGrounds().spawn.x, getGrounds().spawn.y, 0, false)
    this.ui.refresh()
    void this.refreshWorld()
    this.scheduleSync(50)
    window.setInterval(() => void this.refreshWorld(), WORLD_MS)
    addEventListener('pagehide', () => {
      if (this.dirty) this.net.saveOnExit(this.saveCopy())
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.dirty) void this.flushSave()
    })
    window.setInterval(() => this.saveTick(), 1000)
    window.setInterval(() => this.ui.renderChat(), 15_000)
    requestAnimationFrame((t) => this.frame(t))
  }

  // --- view -----------------------------------------------------------------------------------

  private resize() {
    const w = innerWidth
    const h = innerHeight
    let scale = Math.floor(Math.min(w / (20 * TS), h / (12 * TS)))
    // Indoors, zoom in until the room fills the window.
    if (!this.map.outdoor)
      scale = Math.max(
        scale,
        Math.floor(Math.min(w / ((this.map.w + 1) * TS), h / ((this.map.h + 3) * TS))),
      )
    this.scale = Math.max(2, Math.min(6, scale))
    this.vw = Math.ceil(w / this.scale)
    this.vh = Math.ceil(h / this.scale)
    this.view.width = this.vw
    this.view.height = this.vh
    this.view.style.width = `${this.vw * this.scale}px`
    this.view.style.height = `${this.vh * this.scale}px`
    this.ctx.imageSmoothingEnabled = false
    const dpr = devicePixelRatio || 1
    this.overlay.width = Math.round(w * dpr)
    this.overlay.height = Math.round(h * dpr)
    this.overlay.style.width = `${w}px`
    this.overlay.style.height = `${h}px`
    this.octx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  // --- input ----------------------------------------------------------------------------------

  private typing(): boolean {
    const el = document.activeElement
    return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
  }

  private bindInput() {
    addEventListener('keydown', (e) => {
      if (this.typing()) return
      const k = e.key.toLowerCase()
      if (this.ui.panelOpen()) {
        if (k === 'escape') this.ui.closePanel()
        return
      }
      if (k === 'enter' || k === 't') {
        e.preventDefault()
        this.ui.openChat()
        return
      }
      if (k === 'escape') {
        if (this.decor.active) this.endDecorate()
        return
      }
      if (k === 'e' || k === ' ') {
        e.preventDefault()
        if (!e.repeat) this.interact()
        return
      }
      if (this.decor.active && (k === 'delete' || k === 'backspace' || k === 'x')) {
        this.storeHeld()
        return
      }
      const n = Number(k)
      if (n >= 1 && n <= 9) {
        const id = Object.keys(CROPS)[n - 1]
        if (id) this.selectSeed(id)
        return
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
      this.keys.add(k)
    })
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()))
    addEventListener('blur', () => this.keys.clear())
    this.overlay.addEventListener('mousemove', (e) => {
      this.decor.mouse = { x: e.clientX, y: e.clientY }
    })
    this.overlay.addEventListener('mousedown', (e) => {
      if (this.ui.panelOpen()) return
      const t = this.tileAtScreen(e.clientX, e.clientY)
      if (this.decor.active) this.decorClick(t.x, t.y)
      else this.clickTile(t.x, t.y)
    })
  }

  private tileAtScreen(sx: number, sy: number) {
    return {
      x: Math.floor((sx / this.scale + this.cam.x) / TS),
      y: Math.floor((sy / this.scale + this.cam.y) / TS),
    }
  }

  selectSeed(id: string) {
    this.selectedSeed = id
    this.ui.refresh()
  }

  // --- maps -----------------------------------------------------------------------------------

  ownerOf(id: MapId): string | null {
    return id.startsWith('room:') ? id.slice(5) : null
  }

  roomOf(login: string): Profile['room'] | null {
    if (login === this.login) return this.save.room
    return this.profiles.get(login)?.room ?? null
  }

  private buildMap(id: MapId): GameMap {
    if (id === 'grounds') return getGrounds()
    if (id === 'hall') return getHall()
    const owner = this.ownerOf(id)!
    return buildRoom(owner, this.roomOf(owner) ?? { items: [] })
  }

  private groundFor(m: GameMap): HTMLCanvasElement {
    const owner = this.ownerOf(m.id)
    const room = owner ? this.roomOf(owner) : null
    const key = `${m.id}|${room?.wall ?? ''}|${room?.floor ?? ''}`
    let cv = this.groundCache.get(key)
    if (!cv) {
      cv = renderGround(m, room?.wall, room?.floor)
      this.groundCache.set(key, cv)
    }
    return cv
  }

  /** Rebuilds the current room (after furniture or finishes change). */
  refreshRoom() {
    if (this.ownerOf(this.mapId)) this.map = this.buildMap(this.mapId)
  }

  warp(to: MapId, x: number, y: number, dir: Dir, fade = true) {
    if (this.decor.active) this.endDecorate()
    this.mapId = to
    this.map = this.buildMap(to)
    this.me.x = x
    this.me.y = y
    this.me.dir = dir
    this.resize()
    if (fade) {
      this.fade = 1
      sfx('door')
    }
    this.ui.refresh()
    if (to !== 'grounds') void this.refreshWorld()
    this.scheduleSync(30)
  }

  placeName(): string {
    if (this.mapId === 'grounds') return 'Sunset Acres grounds'
    if (this.mapId === 'hall') return 'The hallway'
    const owner = this.ownerOf(this.mapId)!
    if (owner === this.login) return 'Your room'
    return `${this.profiles.get(owner)?.look.name ?? owner}'s room`
  }

  inOwnRoom(): boolean {
    return this.mapId === roomId(this.login)
  }

  // --- movement & collision -------------------------------------------------------------------

  private solid(tx: number, ty: number): boolean {
    if (!inBounds(this.map, tx, ty)) return true
    return this.map.solid[ty * this.map.w + tx] === 1
  }

  private myFrame = 0

  /** What's underfoot at (x, y), for the footstep sound. */
  surfaceAt(x: number, y: number): Surface {
    const tx = Math.floor(x)
    const ty = Math.floor(y - 0.1)
    const m = this.map
    for (const o of m.objects) {
      if (
        (o.k === 'exitMat' || o.k === 'hallRug') &&
        ty === o.y &&
        tx >= o.x &&
        tx < o.x + (o.w ?? 1)
      )
        return 'rug'
    }
    const owner = this.ownerOf(m.id)
    if (owner) {
      const room = this.roomOf(owner)
      const onRug = room?.items.some((it) => {
        const d = FURNITURE[it.k]
        return (
          d?.flat && it.x >= 0 && tx >= it.x && tx < it.x + d.w && ty >= it.y && ty < it.y + d.h
        )
      })
      if (onRug) return 'rug'
    }
    switch (groundAt(m, tx, ty)) {
      case T.PATH:
      case T.DIRT:
      case T.SAND:
        return 'gravel'
      case T.STONE:
        return 'stone'
      case T.HALL_FLOOR:
        return 'tile'
      case T.ROOM_FLOOR:
      case T.TRIM:
        return 'wood'
      default:
        return 'grass'
    }
  }

  private blocked(x: number, y: number): boolean {
    const hw = 0.28
    for (const [cx, cy] of [
      [x - hw, y - 0.3],
      [x + hw, y - 0.3],
      [x - hw, y - 0.02],
      [x + hw, y - 0.02],
    ]) {
      if (this.solid(Math.floor(cx), Math.floor(cy))) return true
    }
    return false
  }

  private update(dt: number) {
    let dx = 0
    let dy = 0
    if (!this.typing() && !this.ui.panelOpen()) {
      if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1
      if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1
      if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1
      if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1
    }
    const moving = dx !== 0 || dy !== 0
    if (moving) {
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) this.me.dir = dx < 0 ? 1 : 2
      if (dy !== 0 && (Math.abs(dy) > Math.abs(dx) || dx === 0)) this.me.dir = dy < 0 ? 3 : 0
      const len = Math.hypot(dx, dy)
      const sp = (this.keys.has('shift') ? FAST : SPEED) * dt
      const nx = this.me.x + (dx / len) * sp
      const ny = this.me.y + (dy / len) * sp
      let bumped = false
      const before = { x: this.me.x, y: this.me.y }
      if (!this.blocked(nx, this.me.y)) this.me.x = nx
      else bumped = true
      if (!this.blocked(this.me.x, ny)) this.me.y = ny
      else bumped = true
      // Hurrying shuffles the feet faster (and so steps come quicker).
      this.me.anim += dt * (this.keys.has('shift') ? 10 : 7)
      const walked = Math.hypot(this.me.x - before.x, this.me.y - before.y) > 0.001
      if (walked && landed(this.myFrame, this.me.anim))
        footstep(this.surfaceAt(this.me.x, this.me.y))
      this.myFrame = Math.floor(this.me.anim) % 4
      if (bumped) this.bumpDoor()
    } else {
      this.me.anim = 0
      this.myFrame = 0
    }
    if (this.me.moving !== moving) {
      this.me.moving = moving
      if (!moving) this.scheduleSync(80)
    }

    for (const r of this.others.values()) {
      const d = Math.hypot(r.p.x - r.rx, r.p.y - r.ry)
      if (d > 4) {
        r.rx = r.p.x
        r.ry = r.p.y
      } else {
        const k = Math.min(1, dt * 6)
        r.rx += (r.p.x - r.rx) * k
        r.ry += (r.p.y - r.ry) * k
      }
      r.anim = r.p.moving || d > 0.06 ? r.anim + dt * 7 : 0
      // Neighbours' footsteps, quieter with distance and panned to where they are.
      if (r.p.map === this.mapId && r.anim > 0 && landed(r.frame, r.anim)) {
        const dist = Math.hypot(r.rx - this.me.x, r.ry - this.me.y)
        if (dist < HEAR_STEPS)
          footstep(
            this.surfaceAt(r.rx, r.ry),
            0.6 * (1 - dist / HEAR_STEPS),
            (r.rx - this.me.x) / 6,
          )
      }
      r.frame = r.anim > 0 ? Math.floor(r.anim) % 4 : 0
    }
    this.fade = Math.max(0, this.fade - dt * 3)
    const hour = gameHour(Date.now() + this.serverSkew)
    this.ui.setClock(clockText(hour))
    setAmbience(hour, this.map.outdoor ? 'outdoors' : 'indoors')
    this.ui.setPrompt(this.decor.active ? null : this.promptText())
  }

  /** Walking into a door goes through it. */
  private bumpDoor() {
    const t = this.facingTile()
    const it = this.interactAt(t.x, t.y)
    if (it && it.kind === 'door') this.useDoor(it)
  }

  facingTile(): { x: number; y: number } {
    const { x, y, dir } = this.me
    switch (dir) {
      case 0:
        return { x: Math.floor(x), y: Math.floor(y + 0.5) }
      case 3:
        return { x: Math.floor(x), y: Math.floor(y - 0.8) }
      case 1:
        return { x: Math.floor(x - 0.7), y: Math.floor(y - 0.2) }
      default:
        return { x: Math.floor(x + 0.7), y: Math.floor(y - 0.2) }
    }
  }

  private interactAt(x: number, y: number): Interact | undefined {
    return this.map.interacts.find((i) => i.x === x && i.y === y)
  }

  // --- interaction ----------------------------------------------------------------------------

  private useDoor(it: Extract<Interact, { kind: 'door' }>) {
    if (this.fade > 0.3) return
    if (it.to === 'hall' && this.ownerOf(this.mapId)) {
      const owner = this.ownerOf(this.mapId)!
      const slot = owner === this.login ? this.slot : (this.profiles.get(owner)?.slot ?? -1)
      if (slot >= 0) return this.warp('hall', hallDoorX(slot) + 0.5, 3.7, 0)
      return this.warp('hall', getHall().spawn.x, getHall().spawn.y, 3)
    }
    this.warp(it.to, it.tx, it.ty, it.dir)
  }

  private profileInSlot(slot: number): Profile | null {
    if (slot === this.slot) return null
    for (const p of this.profiles.values()) if (p.slot === slot) return p
    return null
  }

  slotOwnerName(slot: number): string | null {
    if (slot === this.slot) return this.save.look.name
    return this.profileInSlot(slot)?.look.name ?? null
  }

  private promptText(): string | null {
    const t = this.facingTile()
    const it = this.interactAt(t.x, t.y)
    if (it) {
      switch (it.kind) {
        case 'door':
          return it.to === 'hall' && this.mapId === 'grounds'
            ? 'Enter Sunset Acres'
            : it.to === 'grounds'
              ? 'Go outside'
              : 'Leave the room'
        case 'roomDoor': {
          if (it.slot === this.slot) return 'Enter your room'
          const name = this.slotOwnerName(it.slot)
          return name ? `Visit ${name}'s room` : `Room ${101 + it.slot} · vacant`
        }
        case 'kitchen':
          return 'Trade with Chef Rosa'
        case 'nurse':
          return 'Talk to Nurse Ada'
        case 'sign':
          return 'Read'
      }
    }
    if (this.mapId === 'grounds') {
      const plot = plotAt(t.x, t.y)
      if (plot) return this.plotPrompt(plot.slot, plot.i)
    }
    if (this.ownerOf(this.mapId)) {
      const item = this.furnitureAt(t.x, t.y, false)
      if (item) return FURNITURE[item.k].name
    }
    return null
  }

  private plotPrompt(slot: number, i: number): string {
    const now = Date.now()
    if (slot !== this.slot) {
      const name = this.slotOwnerName(slot)
      return name ? `${name}'s plot` : 'An empty plot'
    }
    const tile = this.save.garden[i]
    if (tile.s === 0) return 'Till the soil'
    if (!tile.c) {
      const n = this.save.inv[`seed:${this.selectedSeed}`] ?? 0
      return n > 0
        ? `Plant ${CROPS[this.selectedSeed].name}`
        : `No ${CROPS[this.selectedSeed].name} seeds`
    }
    const st = garden.stage(tile, now)
    if (st === 3) return `Harvest ${CROPS[tile.c].name}`
    if (!garden.isWet(tile, now)) return `Water the ${CROPS[tile.c].name}`
    return `${CROPS[tile.c].name} · ${fmt(garden.timeLeft(tile, now))} to go`
  }

  interact() {
    if (this.decor.active) return
    const t = this.facingTile()
    this.actOn(t.x, t.y)
  }

  /** Clicking a tile next to you acts on it, as if you'd turned to face it. */
  private clickTile(x: number, y: number) {
    const cx = x + 0.5
    const cy = y + 0.5
    const dx = cx - this.me.x
    const dy = cy - (this.me.y - 0.3)
    if (Math.hypot(dx, dy) > 1.9) return
    this.me.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
    this.actOn(x, y)
  }

  private actOn(x: number, y: number) {
    const it = this.interactAt(x, y)
    if (it) {
      switch (it.kind) {
        case 'door':
          return this.useDoor(it)
        case 'roomDoor':
          return this.useRoomDoor(it.slot)
        case 'kitchen':
          sfx('blip')
          return this.ui.openKitchen()
        case 'nurse':
          return this.talkToNurse()
        case 'sign':
          return this.say(it.text)
      }
    }
    if (this.mapId === 'grounds') {
      const plot = plotAt(x, y)
      if (plot) return this.tend(plot.slot, plot.i)
    }
    if (this.ownerOf(this.mapId)) {
      const item = this.furnitureAt(x, y, false)
      if (item)
        return this.say(FLAVOR[item.k] ?? `A lovely ${FURNITURE[item.k].name.toLowerCase()}.`)
    }
  }

  private useRoomDoor(slot: number) {
    if (slot === this.slot) return this.warp(roomId(this.login), ROOM_DOOR_X + 0.5, 8.2, 3)
    const p = this.profileInSlot(slot)
    if (!p) return this.say(`Room ${101 + slot} is empty. A new neighbour may move in soon!`)
    this.warp(roomId(p.login), ROOM_DOOR_X + 0.5, 8.2, 3)
  }

  private talkToNurse() {
    if (this.slot < 0) {
      this.say("Nurse Ada: The home is full, dear, but I've set up a cot for you. This way!")
      return this.warp(roomId(this.login), ROOM_DOOR_X + 0.5, 8.2, 3)
    }
    const lines = [
      `Nurse Ada: Good to see you, ${this.save.look.name}! Your room is ${101 + this.slot}.`,
      'Nurse Ada: Remember to water your plants. They only grow while the soil is wet!',
      'Nurse Ada: Chef Rosa at the Kitchen buys produce. Pumpkins fetch the best price.',
      'Nurse Ada: Press Enter to chat with your neighbours.',
    ]
    this.say(lines[Math.floor(Math.random() * lines.length)])
  }

  private say(text: string) {
    this.ui.toast(text)
  }

  private tend(slot: number, i: number) {
    if (slot !== this.slot) {
      const name = this.slotOwnerName(slot)
      return this.say(name ? `That's ${name}'s plot. Looking good!` : 'Nobody has this plot yet.')
    }
    const now = Date.now()
    const tile = this.save.garden[i]
    if (tile.s === 0) {
      garden.till(tile)
      sfx('till')
    } else if (!tile.c) {
      const key = `seed:${this.selectedSeed}`
      if ((this.save.inv[key] ?? 0) <= 0)
        return this.say(
          `You're out of ${CROPS[this.selectedSeed].name} seeds. Chef Rosa sells more at the Kitchen.`,
        )
      this.save.inv[key] -= 1
      garden.plant(tile, this.selectedSeed, now)
      if (garden.isWet(tile, now)) garden.settle(tile, now)
      sfx('plant')
    } else if (garden.stage(tile, now) === 3) {
      const got = garden.harvest(tile, now)
      if (!got) return
      const key = `crop:${got.crop}`
      this.save.inv[key] = (this.save.inv[key] ?? 0) + got.count
      this.save.stats.harvested += got.count
      sfx('harvest')
      this.ui.toast(`+${got.count} ${CROPS[got.crop].name}${got.count > 1 ? 's' : ''}`)
    } else if (!garden.isWet(tile, now)) {
      garden.water(tile, now)
      sfx('water')
    } else {
      return this.say(`Growing nicely. About ${fmt(garden.timeLeft(tile, now))} to go.`)
    }
    this.markDirty()
    this.ui.refresh()
  }

  /** Waters every planted, dry tile in your plot (the watering-can button). */
  waterAll(): number {
    const now = Date.now()
    let n = 0
    for (const tile of this.save.garden) {
      if (tile.c && !garden.isWet(tile, now) && garden.stage(tile, now) < 3) {
        garden.water(tile, now)
        n++
      }
    }
    if (n) {
      sfx('water')
      this.markDirty()
    }
    return n
  }

  nearMyPlot(): boolean {
    if (this.mapId !== 'grounds' || this.slot < 0) return false
    const o = plotOrigin(this.slot)
    return (
      this.me.x > o.x - 2 &&
      this.me.x < o.x + PLOT_W + 2 &&
      this.me.y > o.y - 1.5 &&
      this.me.y < o.y + PLOT_H + 2
    )
  }

  // --- room decorating ------------------------------------------------------------------------

  private furnitureAt(x: number, y: number, includeFlat: boolean): RoomItem | undefined {
    const owner = this.ownerOf(this.mapId)
    const room = owner ? this.roomOf(owner) : null
    if (!room) return undefined
    const hits = room.items.filter((it) => {
      const d = FURNITURE[it.k]
      return d && it.x >= 0 && x >= it.x && x < it.x + d.w && y >= it.y && y < it.y + d.h
    })
    return hits.find((h) => !FURNITURE[h.k].flat) ?? (includeFlat ? hits[0] : undefined)
  }

  startDecorate() {
    if (!this.inOwnRoom()) return
    this.decor.active = true
    this.decor.held = -1
    this.ui.refresh()
  }

  endDecorate() {
    if (this.decor.held >= 0) {
      const it = this.save.room.items[this.decor.held]
      if (it && this.decor.from) {
        it.x = this.decor.from.x
        it.y = this.decor.from.y
      }
    }
    this.decor = { active: false, held: -1, from: null, mouse: null }
    this.refreshRoom()
    this.ui.refresh()
  }

  holdStored(index: number) {
    if (!this.decor.active) this.startDecorate()
    if (this.decor.held >= 0) this.storeHeld()
    this.decor.held = index
    this.decor.from = { x: -1, y: -1 }
    this.ui.refresh()
  }

  storeHeld() {
    if (this.decor.held < 0) return
    const it = this.save.room.items[this.decor.held]
    it.x = -1
    it.y = -1
    this.decor.held = -1
    this.decor.from = null
    this.markDirty()
    this.refreshRoom()
    this.ui.refresh()
  }

  canPlace(index: number, x: number, y: number): boolean {
    const it = this.save.room.items[index]
    const def = FURNITURE[it.k]
    const area = def.wall ? ROOM_WALL : ROOM_FLOOR
    if (x < area.x0 || y < area.y0 || x + def.w - 1 > area.x1 || y + def.h - 1 > area.y1)
      return false
    for (let j = 0; j < this.save.room.items.length; j++) {
      const o = this.save.room.items[j]
      if (j === index || o.x < 0) continue
      const od = FURNITURE[o.k]
      if (!!od.wall !== !!def.wall || !!od.flat !== !!def.flat) continue
      if (x < o.x + od.w && x + def.w > o.x && y < o.y + od.h && y + def.h > o.y) return false
    }
    if (!def.wall && !def.flat) {
      const px = Math.floor(this.me.x)
      const py = Math.floor(this.me.y - 0.1)
      if (px >= x && px < x + def.w && py >= y && py < y + def.h) return false
    }
    return true
  }

  private decorClick(x: number, y: number) {
    const items = this.save.room.items
    if (this.decor.held >= 0) {
      const def = FURNITURE[items[this.decor.held].k]
      const ox = x - Math.floor((def.w - 1) / 2)
      const oy = y - (def.h - 1)
      if (!this.canPlace(this.decor.held, ox, oy)) {
        sfx('nope')
        return this.ui.toast(def.wall ? 'Wall pieces go on the wall.' : "That doesn't fit there.")
      }
      items[this.decor.held].x = ox
      items[this.decor.held].y = oy
      this.decor.held = -1
      this.decor.from = null
      sfx('plant')
      this.markDirty()
      this.refreshRoom()
      this.ui.refresh()
      return
    }
    // Pick up: wall pieces first when clicking the wall, else the topmost floor piece.
    const hit =
      items.findIndex((it) => it.x >= 0 && FURNITURE[it.k].wall && inside(it, x, y)) >= 0
        ? items.findIndex((it) => it.x >= 0 && FURNITURE[it.k].wall && inside(it, x, y))
        : items.findIndex(
              (it) =>
                it.x >= 0 && !FURNITURE[it.k].wall && !FURNITURE[it.k].flat && inside(it, x, y),
            ) >= 0
          ? items.findIndex(
              (it) =>
                it.x >= 0 && !FURNITURE[it.k].wall && !FURNITURE[it.k].flat && inside(it, x, y),
            )
          : items.findIndex((it) => it.x >= 0 && FURNITURE[it.k].flat && inside(it, x, y))
    if (hit < 0) return
    this.decor.held = hit
    this.decor.from = { x: items[hit].x, y: items[hit].y }
    items[hit].x = -1
    items[hit].y = -1
    sfx('blip')
    this.refreshRoom()
    this.ui.refresh()
  }

  buyFurniture(k: string): boolean {
    const def = FURNITURE[k]
    if (this.save.room.items.length >= MAX_ROOM_ITEMS) {
      this.ui.toast("Your room can't hold any more. Put something away or skip this one.")
      return false
    }
    if (this.save.coins < def.price) {
      sfx('nope')
      this.ui.toast(`You need ${def.price - this.save.coins} more coins.`)
      return false
    }
    this.save.coins -= def.price
    this.save.room.items.push({ k, x: -1, y: -1 })
    sfx('coin')
    this.markDirty()
    if (this.inOwnRoom()) {
      this.holdStored(this.save.room.items.length - 1)
      this.ui.toast(`${def.name} bought! Click a spot in your room to put it down.`)
    } else {
      this.ui.toast(`${def.name} bought! It's waiting in your room.`)
    }
    this.ui.refresh()
    return true
  }

  buyFinish(kind: 'wall' | 'floor', id: string, price: number) {
    const owned = kind === 'wall' ? this.save.room.walls : this.save.room.floors
    if (!owned.includes(id)) {
      if (this.save.coins < price) {
        sfx('nope')
        return this.ui.toast(`You need ${price - this.save.coins} more coins.`)
      }
      this.save.coins -= price
      owned.push(id)
      sfx('coin')
    }
    if (kind === 'wall') this.save.room.wall = id
    else this.save.room.floor = id
    this.markDirty()
    this.refreshRoom()
    this.ui.refresh()
  }

  // --- trading --------------------------------------------------------------------------------

  sell(crop: string, count: number) {
    const key = `crop:${crop}`
    const have = this.save.inv[key] ?? 0
    const n = Math.min(have, count)
    if (n <= 0) return
    const earned = n * CROPS[crop].sellPrice
    this.save.inv[key] = have - n
    if (this.save.inv[key] === 0) delete this.save.inv[key]
    this.save.coins += earned
    this.save.stats.earned += earned
    sfx('coin')
    this.markDirty()
    this.ui.refresh()
  }

  buySeeds(crop: string, count: number) {
    const cost = CROPS[crop].seedPrice * count
    if (this.save.coins < cost) {
      sfx('nope')
      return this.ui.toast(`You need ${cost - this.save.coins} more coins.`)
    }
    this.save.coins -= cost
    const key = `seed:${crop}`
    this.save.inv[key] = (this.save.inv[key] ?? 0) + count
    sfx('coin')
    this.markDirty()
    this.ui.refresh()
  }

  setLook(look: Look) {
    this.save.look = look
    this.markDirty()
    this.scheduleSync(30)
    this.ui.refresh()
  }

  // --- saving ---------------------------------------------------------------------------------

  markDirty() {
    if (!this.dirty) this.dirtyAt = Date.now()
    this.dirty = true
  }

  private saveCopy(): Save {
    return JSON.parse(JSON.stringify(this.save)) as Save
  }

  private saveTick() {
    const now = Date.now()
    if (
      this.dirty &&
      !this.saving &&
      now - this.dirtyAt > 1500 &&
      now - this.lastSaveAt > SAVE_GAP_MS
    )
      void this.flushSave()
  }

  async flushSave() {
    if (this.saving) return
    this.saving = true
    this.dirty = false
    this.lastSaveAt = Date.now()
    try {
      const res = await this.net.save(this.saveCopy())
      if (res.slot !== this.slot) {
        this.slot = res.slot
        this.save.slot = res.slot
      }
      this.ui.setSaved(true)
    } catch (err) {
      this.markDirty()
      this.ui.setSaved(false)
      this.handleNetError(err)
    } finally {
      this.saving = false
    }
  }

  private handleNetError(err: unknown) {
    if (err instanceof NetError && err.status === 401) {
      this.stopped = true
      this.ui.signedOut()
    }
  }

  // --- multiplayer ----------------------------------------------------------------------------

  sendChat(text: string) {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_CHARS)
    if (!clean) return
    this.pendingMsg = clean
    this.bubbles.set(this.login, { text: clean, until: Date.now() + BUBBLE_MS })
    this.scheduleSync(0)
  }

  private scheduleSync(ms: number) {
    window.clearTimeout(this.syncTimer)
    this.syncTimer = window.setTimeout(() => void this.sync(), ms)
  }

  private syncing = false
  private async sync() {
    if (this.stopped) return
    if (this.syncing) return this.scheduleSync(200)
    this.syncing = true
    const msg = this.pendingMsg
    this.pendingMsg = null
    try {
      const res = await this.net.sync({
        p: {
          map: this.mapId,
          x: round2(this.me.x),
          y: round2(this.me.y),
          dir: this.me.dir,
          moving: this.me.moving,
        },
        look: this.save.look,
        msg: msg ?? undefined,
        since: this.chatSince,
      })
      this.serverSkew = res.now - Date.now()
      if (msg && !res.sent) this.ui.toast('Slow down a little, dear. Try again in a moment.')
      this.applyPlayers(res.players)
      this.applyChat(res.chat)
      this.ui.setOnline(true)
    } catch (err) {
      if (msg) this.pendingMsg = msg
      this.ui.setOnline(false)
      this.handleNetError(err)
    } finally {
      this.syncing = false
      this.scheduleSync(document.hidden ? SYNC_HIDDEN_MS : SYNC_MS)
    }
  }

  private applyPlayers(players: Player[]) {
    const seen = new Set<string>()
    for (const p of players) {
      seen.add(p.login)
      const r = this.others.get(p.login)
      if (r) {
        if (r.p.map !== p.map) {
          r.rx = p.x
          r.ry = p.y
        }
        r.p = p
      } else this.others.set(p.login, { p, rx: p.x, ry: p.y, anim: 0, frame: 0 })
    }
    for (const l of [...this.others.keys()]) if (!seen.has(l)) this.others.delete(l)
    this.ui.refreshOnline()
  }

  onlinePlayers(): Player[] {
    return [...this.others.values()].map((r) => r.p)
  }

  private applyChat(msgs: ChatMsg[]) {
    if (!msgs.length) return
    const first = this.chatSince === 0
    const now = Date.now() + this.serverSkew
    for (const m of msgs) {
      this.chatSince = Math.max(this.chatSince, m.id)
      this.chatLog.push(m)
      if (m.login !== this.login && !first && now - m.t < BUBBLE_MS) {
        this.bubbles.set(m.login, { text: m.text, until: Date.now() + BUBBLE_MS })
        if (m.map === this.mapId) sfx('chat')
      }
    }
    if (this.chatLog.length > 60) this.chatLog.splice(0, this.chatLog.length - 60)
    this.ui.renderChat()
  }

  private async refreshWorld() {
    try {
      const profiles = await this.net.world()
      this.profiles = new Map(
        profiles.filter((p) => p.login !== this.login).map((p) => [p.login, p]),
      )
      if (this.ownerOf(this.mapId) && !this.inOwnRoom()) this.refreshRoom()
      this.ui.refreshOnline()
    } catch (err) {
      this.handleNetError(err)
    }
  }

  // --- rendering ------------------------------------------------------------------------------

  private frame(t: number) {
    const dt = Math.min(0.05, (t - this.last) / 1000)
    this.last = t
    this.time = t
    if (!this.stopped) this.update(dt)
    this.render()
    requestAnimationFrame((nt) => this.frame(nt))
  }

  private render() {
    const c = this.ctx
    const m = this.map
    const W = m.w * TS
    const H = m.h * TS
    const tx = this.me.x * TS - this.vw / 2
    const ty = (this.me.y - 0.5) * TS - this.vh / 2
    this.cam.x = W <= this.vw ? (W - this.vw) / 2 : clamp(tx, 0, W - this.vw)
    this.cam.y = H <= this.vh ? (H - this.vh) / 2 : clamp(ty, 0, H - this.vh)
    this.cam.x = Math.round(this.cam.x)
    this.cam.y = Math.round(this.cam.y)
    const ox = -this.cam.x
    const oy = -this.cam.y

    c.fillStyle = m.outdoor ? '#3f7d32' : '#231c26'
    c.fillRect(0, 0, this.vw, this.vh)
    c.drawImage(this.groundFor(m), ox, oy)

    const x0 = Math.floor(this.cam.x / TS) - 3
    const y0 = Math.floor(this.cam.y / TS) - 3
    const x1 = Math.ceil((this.cam.x + this.vw) / TS) + 3
    const y1 = Math.ceil((this.cam.y + this.vh) / TS) + 4
    const visible = (x: number, y: number, w = 1, h = 1) =>
      x + w >= x0 && x <= x1 && y + h >= y0 && y <= y1
    if (m.outdoor) drawWaterGlints(c, m, x0, y0, x1, y1, this.time)

    const fenceAt = (x: number, y: number) => this.fences.has(`${x},${y}`)
    const list: Drawable[] = []
    for (const o of m.objects) {
      if (!visible(o.x, o.y, o.w ?? 1, o.h ?? 1)) continue
      const px = o.x * TS + ox
      const py = o.y * TS + oy
      if (FLAT_KINDS.has(o.k)) {
        drawObject(c, o, px, py, this.time, fenceAt)
        continue
      }
      const base =
        o.k === 'home' || o.k === 'kitchen' ? (o.y + (o.h ?? 1)) * TS : (o.y + 1) * TS - 1
      const seeThrough = (o.k === 'tree' || o.k === 'pine') && this.behindTree(o.x, o.y)
      list.push({
        y: base,
        draw: () => {
          // Trees fade when you walk behind them, so you're never lost under a canopy.
          if (seeThrough) c.globalAlpha = 0.45
          drawObject(c, o, px, py, this.time, fenceAt)
          c.globalAlpha = 1
        },
      })
    }

    if (m.id === 'grounds') this.collectGarden(list, ox, oy, visible)
    const owner = this.ownerOf(m.id)
    if (owner) this.collectRoom(list, owner, ox, oy)
    if (m.id === 'hall') this.drawHallPlates(ox, oy)

    for (const n of m.npcs) list.push({ y: n.y * TS, draw: () => this.drawNpc(n, ox, oy) })
    for (const r of this.others.values()) {
      if (r.p.map !== m.id) continue
      list.push({
        y: r.ry * TS,
        draw: () => this.drawPerson(r.p.look, r.rx, r.ry, r.p.dir, r.anim, ox, oy),
      })
    }
    list.push({
      y: this.me.y * TS,
      draw: () =>
        this.drawPerson(this.save.look, this.me.x, this.me.y, this.me.dir, this.me.anim, ox, oy),
    })

    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()

    if (this.decor.active) this.drawDecorGhost(ox, oy)
    if (!this.decor.active && !this.ui.panelOpen()) this.drawFacingCursor(ox, oy)
    if (m.outdoor) this.drawDaylight(ox, oy)
    if (this.fade > 0) {
      c.fillStyle = `rgba(20,16,28,${this.fade})`
      c.fillRect(0, 0, this.vw, this.vh)
    }
    this.renderOverlay()
  }

  private collectGarden(
    list: Drawable[],
    ox: number,
    oy: number,
    visible: (x: number, y: number, w?: number, h?: number) => boolean,
  ) {
    const c = this.ctx
    const now = Date.now()
    for (let s = 0; s < MAX_SLOTS; s++) {
      const o = plotOrigin(s)
      if (!visible(o.x - 1, o.y - 1, PLOT_W + 2, PLOT_H + 2)) continue
      const tiles = s === this.slot ? this.save.garden : this.profileInSlot(s)?.garden
      const mine = s === this.slot
      // Wooden edging around the plot, golden for your own.
      const ex = o.x * TS + ox - 1
      const ey = o.y * TS + oy - 1
      c.fillStyle = mine ? '#e0a83a' : '#8a5d34'
      c.fillRect(ex, ey, PLOT_W * TS + 2, 1)
      c.fillRect(ex, ey + PLOT_H * TS + 1, PLOT_W * TS + 2, 1)
      c.fillRect(ex, ey, 1, PLOT_H * TS + 2)
      c.fillRect(ex + PLOT_W * TS + 1, ey, 1, PLOT_H * TS + 2)
      if (!tiles) continue
      tiles.forEach((tile, i) => {
        const tx = o.x + (i % PLOT_W)
        const ty = o.y + Math.floor(i / PLOT_W)
        const px = tx * TS + ox
        const py = ty * TS + oy
        if (tile.s === 1) drawSoil(c, px, py, garden.isWet(tile, now))
        if (tile.c) {
          const st = garden.stage(tile, now)
          const crop = tile.c
          list.push({ y: (ty + 1) * TS - 2, draw: () => drawCrop(c, crop, st, px, py, this.time) })
        }
      })
    }
  }

  private collectRoom(list: Drawable[], owner: string, ox: number, oy: number) {
    const c = this.ctx
    const room = this.roomOf(owner)
    if (!room) return
    for (const it of room.items) {
      const def = FURNITURE[it.k]
      if (!def || it.x < 0) continue
      const px = it.x * TS + ox
      const py = it.y * TS + oy
      if (def.flat || def.wall) drawFurniture(c, it.k, px, py, this.time)
      else
        list.push({
          y: (it.y + def.h) * TS - 1,
          draw: () => drawFurniture(c, it.k, px, py, this.time),
        })
    }
  }

  private drawHallPlates(ox: number, oy: number) {
    const c = this.ctx
    for (let s = 0; s < MAX_SLOTS; s++) {
      const x = hallDoorX(s) * TS + ox
      const y = TS + oy
      const taken = this.slotOwnerName(s) !== null
      if (s === this.slot) {
        // A wreath on your own door.
        c.fillStyle = '#3f8a3a'
        c.fillRect(x + 5, y + 7, 6, 1)
        c.fillRect(x + 4, y + 8, 1, 4)
        c.fillRect(x + 11, y + 8, 1, 4)
        c.fillRect(x + 5, y + 12, 6, 1)
        c.fillStyle = '#e0475b'
        c.fillRect(x + 7, y + 12, 2, 2)
      } else if (!taken) {
        c.fillStyle = 'rgba(30,20,30,0.35)'
        c.fillRect(x + 2, y + 2, 12, 30)
      }
    }
  }

  /** Is the player standing behind (north of) the tree at (x, y), under its canopy? */
  private behindTree(x: number, y: number): boolean {
    const dx = this.me.x - (x + 0.5)
    const dy = this.me.y - (y + 1)
    return Math.abs(dx) < 2 && dy < 0 && dy > -4.4
  }

  private drawPerson(
    look: Look,
    x: number,
    y: number,
    dir: Dir,
    anim: number,
    ox: number,
    oy: number,
  ) {
    const c = this.ctx
    const px = Math.round(x * TS + ox)
    const py = Math.round(y * TS + oy)
    c.fillStyle = 'rgba(0,0,0,0.2)'
    c.fillRect(px - 5, py - 1, 10, 2)
    c.fillRect(px - 4, py - 2, 8, 4)
    const frame = anim > 0 ? Math.floor(anim) % 4 : 0
    c.drawImage(personSprite(look, dir, frame), px - SPR_W / 2, py - SPR_H + 1)
  }

  private drawNpc(n: Npc, ox: number, oy: number) {
    // NPCs turn to face you when you're near.
    let dir = n.dir
    const dx = this.me.x - n.x
    const dy = this.me.y - n.y
    if (Math.hypot(dx, dy) < 3)
      dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
    this.drawPerson(n.look, n.x, n.y, dir, 0, ox, oy)
    if (n.id === 'chef') {
      const c = this.ctx
      const px = Math.round(n.x * TS + ox)
      const py = Math.round(n.y * TS + oy)
      c.fillStyle = '#ffffff'
      c.fillRect(px - 4, py - 28, 8, 6)
      c.fillRect(px - 5, py - 30, 10, 3)
      c.fillStyle = '#d8d0c4'
      c.fillRect(px - 4, py - 23, 8, 1)
    }
  }

  private drawFacingCursor(ox: number, oy: number) {
    const t = this.facingTile()
    const actionable =
      !!this.interactAt(t.x, t.y) ||
      (this.mapId === 'grounds' && plotAt(t.x, t.y)?.slot === this.slot && this.slot >= 0)
    if (!actionable) return
    const c = this.ctx
    const px = t.x * TS + ox
    const py = t.y * TS + oy
    const a = 0.55 + Math.sin(this.time / 250) * 0.25
    c.fillStyle = `rgba(255,248,239,${a})`
    for (const [x, y, w, h] of [
      [0, 0, 4, 1],
      [0, 0, 1, 4],
      [12, 0, 4, 1],
      [15, 0, 1, 4],
      [0, 15, 4, 1],
      [0, 12, 1, 4],
      [12, 15, 4, 1],
      [15, 12, 1, 4],
    ])
      c.fillRect(px + x, py + y, w, h)
  }

  private drawDecorGhost(ox: number, oy: number) {
    const c = this.ctx
    const mt = this.decor.mouse ? this.tileAtScreen(this.decor.mouse.x, this.decor.mouse.y) : null
    // Outline the placeable areas.
    c.strokeStyle = 'rgba(242,184,75,0.5)'
    c.lineWidth = 1
    c.strokeRect(
      ROOM_FLOOR.x0 * TS + ox + 0.5,
      ROOM_FLOOR.y0 * TS + oy + 0.5,
      (ROOM_FLOOR.x1 - ROOM_FLOOR.x0 + 1) * TS - 1,
      (ROOM_FLOOR.y1 - ROOM_FLOOR.y0 + 1) * TS - 1,
    )
    c.strokeStyle = 'rgba(138,143,181,0.6)'
    c.strokeRect(
      ROOM_WALL.x0 * TS + ox + 0.5,
      ROOM_WALL.y0 * TS + oy + 0.5,
      (ROOM_WALL.x1 - ROOM_WALL.x0 + 1) * TS - 1,
      (ROOM_WALL.y1 - ROOM_WALL.y0 + 1) * TS - 1,
    )
    if (!mt) return
    if (this.decor.held < 0) {
      c.fillStyle = 'rgba(255,248,239,0.25)'
      c.fillRect(mt.x * TS + ox, mt.y * TS + oy, TS, TS)
      return
    }
    const it = this.save.room.items[this.decor.held]
    const def = FURNITURE[it.k]
    const gx = mt.x - Math.floor((def.w - 1) / 2)
    const gy = mt.y - (def.h - 1)
    const ok = this.canPlace(this.decor.held, gx, gy)
    c.globalAlpha = 0.75
    drawFurniture(c, it.k, gx * TS + ox, gy * TS + oy, this.time)
    c.globalAlpha = 1
    c.fillStyle = ok ? 'rgba(111,158,79,0.35)' : 'rgba(192,80,77,0.45)'
    c.fillRect(gx * TS + ox, gy * TS + oy, def.w * TS, def.h * TS)
  }

  /** Evening and night darken the grounds, and the lamps come on. */
  private drawDaylight(ox: number, oy: number) {
    const dark = darkness(gameHour(Date.now() + this.serverSkew))
    if (dark <= 0) return
    const c = this.ctx
    c.fillStyle = `rgba(24,26,70,${dark})`
    c.fillRect(0, 0, this.vw, this.vh)
    if (dark < 0.2) return
    c.globalCompositeOperation = 'lighter'
    for (const o of this.map.objects) {
      if (o.k !== 'lamp') continue
      const px = o.x * TS + 8 + ox
      const py = o.y * TS + LAMP_LIGHT_Y + oy
      const g = c.createRadialGradient(px, py, 1, px, py, 34)
      g.addColorStop(0, `rgba(255,214,140,${dark * 0.9})`)
      g.addColorStop(1, 'rgba(255,214,140,0)')
      c.fillStyle = g
      c.fillRect(px - 34, py - 34, 68, 68)
    }
    c.globalCompositeOperation = 'source-over'
  }

  private renderOverlay() {
    const c = this.octx
    c.clearRect(0, 0, innerWidth, innerHeight)
    const s = this.scale
    const toScreen = (x: number, y: number) => ({
      x: (x * TS - this.cam.x) * s,
      y: (y * TS - this.cam.y) * s,
    })
    c.textAlign = 'center'
    c.textBaseline = 'middle'

    for (const l of this.map.labels) {
      if (l.near && Math.hypot(this.me.x - l.x, this.me.y - l.y) > l.near) continue
      const p = toScreen(l.x, l.y)
      tag(c, l.text, p.x, p.y, Math.max(12, s * 3.6), '#fff8ef', 'rgba(110,74,47,0.92)')
    }
    if (this.mapId === 'grounds') {
      for (let slot = 0; slot < MAX_SLOTS; slot++) {
        const name = this.slotOwnerName(slot)
        if (!name) continue
        const o = plotOrigin(slot)
        if (Math.hypot(this.me.x - (o.x + PLOT_W / 2), this.me.y - (o.y + 1)) > 7) continue
        const p = toScreen(o.x + PLOT_W / 2, o.y - 0.25)
        tag(
          c,
          slot === this.slot ? 'Your plot' : name,
          p.x,
          p.y,
          Math.max(10, s * 2.8),
          '#fff8ef',
          slot === this.slot ? 'rgba(180,83,58,0.9)' : 'rgba(30,33,64,0.75)',
        )
      }
    }
    if (this.mapId === 'hall') {
      for (let slot = 0; slot < MAX_SLOTS; slot++) {
        const x = hallDoorX(slot) + 0.5
        if (Math.abs(this.me.x - x) > 1.1) continue
        const name = slot === this.slot ? 'You' : this.slotOwnerName(slot)
        const p = toScreen(x, 0.75)
        tag(
          c,
          `${101 + slot}${name ? ` · ${name}` : ''}`,
          p.x,
          p.y,
          Math.max(10, s * 2.6),
          '#1e2140',
          name ? '#f4ecd8' : 'rgba(244,236,216,0.6)',
        )
      }
    }

    const fontPx = Math.max(11, s * 3)
    const people: { login: string; name: string; x: number; y: number; me: boolean }[] = []
    for (const r of this.others.values())
      if (r.p.map === this.mapId)
        people.push({ login: r.p.login, name: r.p.look.name, x: r.rx, y: r.ry, me: false })
    people.push({
      login: this.login,
      name: this.save.look.name,
      x: this.me.x,
      y: this.me.y,
      me: true,
    })
    for (const n of this.map.npcs)
      people.push({ login: `npc:${n.id}`, name: n.name, x: n.x, y: n.y, me: false })
    const now = Date.now()
    for (const p of people) {
      const sp = toScreen(p.x, p.y - SPR_H / TS - 0.15)
      const b = this.bubbles.get(p.login)
      if (b && b.until > now) {
        bubble(c, b.text, sp.x, sp.y - 6, fontPx, Math.min(1, (b.until - now) / 600))
      } else if (!p.me) {
        tag(c, p.name, sp.x, sp.y - 2, fontPx * 0.9, '#fff8ef', 'rgba(30,33,64,0.7)')
      }
    }
  }
}

const FLAVOR: Record<string, string> = {
  bed: 'You fluff the pillows. Maybe a little nap later.',
  nightstand: 'Your reading glasses, a crossword, and a tin of butterscotch.',
  photos: 'The grandkids! They grow up so fast.',
  armchair: 'The comfiest seat in the house.',
  rocker: 'Creak... creak... creak. Lovely.',
  record: 'A little Glenn Miller fills the room.',
  tv: 'The game show is on. You know all the answers.',
  catbed: 'Mittens purrs and stretches. Prrrrt.',
  fishtank: 'The fish blow you little bubbles.',
  clock: 'Tick... tock... Right on time, as always.',
  piano: 'You play the first few bars of a song you love.',
  puzzle: 'Only 412 pieces left. All sky.',
  basket: 'A scarf for your grandson, nearly finished.',
  bookshelf: 'Mysteries, gardening guides, and a well-loved atlas.',
  fern: 'It could use a little water. You give it some.',
}

function inside(it: RoomItem, x: number, y: number): boolean {
  const d = FURNITURE[it.k]
  return x >= it.x && x < it.x + d.w && y >= it.y && y < it.y + d.h
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

/*
 * The world's clock: one in-game day every DAY_MS (a game hour is a real minute), worked out
 * from the timestamp so every player shares the same time of day.
 */
export const DAY_MS = 24 * 60_000
export function gameHour(now: number): number {
  return ((now % DAY_MS) / DAY_MS) * 24
}
const NIGHT = 0.38
/** How dark the grounds are: dusk 18–21, night 21–4, dawn 4–6. */
export function darkness(h: number): number {
  if (h >= 21 || h < 4) return NIGHT
  if (h >= 18) return ((h - 18) / 3) * NIGHT
  if (h < 6) return ((6 - h) / 2) * NIGHT
  return 0
}
export function clockText(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 6) * 10
  const ampm = hh < 12 ? 'am' : 'pm'
  const part =
    hh < 5 || hh >= 21 ? 'Night' : hh < 12 ? 'Morning' : hh < 18 ? 'Afternoon' : 'Evening'
  return `${part} · ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ampm}`
}

export function fmt(ms: number): string {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif'

function tag(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fg: string,
  bg: string,
) {
  c.font = `700 ${Math.round(size)}px ${FONT}`
  const w = c.measureText(text).width + size * 0.9
  const h = size * 1.45
  c.fillStyle = bg
  roundRect(c, x - w / 2, y - h / 2, w, h, h / 3)
  c.fill()
  c.fillStyle = fg
  c.fillText(text, x, y + 1)
}

function bubble(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  c.save()
  c.globalAlpha = alpha
  c.font = `600 ${Math.round(size)}px ${FONT}`
  const maxW = size * 14
  const lines = wrap(c, text, maxW)
  const lh = size * 1.25
  const w = Math.max(...lines.map((l) => c.measureText(l).width)) + size * 1.2
  const h = lines.length * lh + size * 0.8
  const bx = x - w / 2
  const by = y - h - size * 0.6
  c.fillStyle = '#fffdf7'
  c.strokeStyle = '#2b1d22'
  c.lineWidth = Math.max(2, size / 6)
  roundRect(c, bx, by, w, h, size * 0.5)
  c.fill()
  c.stroke()
  c.beginPath()
  c.moveTo(x - size * 0.45, by + h - 1)
  c.lineTo(x, by + h + size * 0.55)
  c.lineTo(x + size * 0.45, by + h - 1)
  c.closePath()
  c.fill()
  c.beginPath()
  c.moveTo(x - size * 0.45, by + h)
  c.lineTo(x, by + h + size * 0.55)
  c.lineTo(x + size * 0.45, by + h)
  c.stroke()
  c.fillStyle = '#2b1d22'
  lines.forEach((l, i) => c.fillText(l, x, by + size * 0.4 + lh * (i + 0.5)))
  c.restore()
}

function wrap(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (c.measureText(next).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines.slice(0, 5)
}

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
}
