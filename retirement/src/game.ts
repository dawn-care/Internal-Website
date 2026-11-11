import {
  CROPS,
  EGG_PRICE,
  RECIPES,
  STOVE,
  cookable,
  knowsRecipe,
  FURNITURE,
  GIFT_HEARTS,
  HENS,
  TREAT_PACK,
  HEARTS_MAX,
  MAX_SLOTS,
  PET_COATS,
  PET_KINDS,
  PLOT_MAX,
  PLOT_SIZES,
  ROOM_DOOR_X,
  plantPrice,
  plotSize,
  type PlotSize,
  ROOM_FLOOR,
  ROOM_WALL,
  CLOSET,
  KEY_HOOK,
  POCKET_SLOTS,
  pocketMeal as mealOf,
  SKIN_TONES,
} from '../shared/catalog'
import {
  INTRO,
  MAX_CHAT_CHARS,
  photoOnWall,
  hasItem,
  photoWhere,
  cleanText,
  type Relative,
  growGarden,
  MAX_ROOM_ITEMS,
  type ChatMsg,
  type Dir,
  type Look,
  type MapId,
  type PetLook,
  petLook,
  type Player,
  type Profile,
  type RoomItem,
  type Save,
} from '../shared/schema'
import {
  canStart,
  seatedAt,
  tableOfSeat,
  type Seated,
  type Side,
  type TableAction,
  type TableState,
} from '../shared/tables'
import {
  FLAT_KINDS,
  LAMP_LIGHT_Y,
  TS,
  buildingWindows,
  drawCrop,
  drawFurniture,
  drawObject,
  drawSoil,
  drawStakes,
  drawTableGame,
  drawWaterGlints,
  familyPhotoSprite,
  plotFrame,
  renderGround,
} from './art'
import { sfx } from './audio'
import {
  footstep,
  hasClip,
  petSound,
  playClip,
  setAmbience,
  setForestBeds,
  type Surface,
} from './soundscape'
import { setMusicLevel } from './music'
import { TREELINE } from '../shared/grounds'
import { Forest } from './forest/gen'
import { TALL, chunkGround, drawForestObj, fakeSprite, flatKind, warmForest } from './forest/art'
import {
  Darkness,
  darknessAt,
  deepness,
  drawFog,
  mapDeepness,
  forestGrade,
  lightRadius,
  outskirtsGrade,
} from './forest/light'
import {
  hushWarnings,
  setChase,
  setForestAmbience,
  swell,
  threatSound,
  stomp,
  synthWarning,
  twigSnap,
  uncanny,
  paperRustle,
  busSound,
  lockSound,
} from './forest/sound'
import { Encounters, type Host, type Person } from './forest/encounter'
import { prepareScare, showScare, type Scare } from './forest/scare'
import { Threats, drawArm, drawFace, warmFace, type ThreatHost } from './forest/threats'
import { Thing, thingFrame, warmThing, type ThingHost } from './forest/thing'
import { StoryPlan } from './forest/story/plan'
import { Bus, untilCrew } from './forest/story/bus'
import { Ride, crewLook, warmRide } from './forest/story/ride'
import { drawBus } from './forest/story/art'
import { Director } from './forest/story/director'
import { CLUES } from './forest/story/clues'
import {
  AGAIN,
  CAMP_SPOTS,
  LEAVE_CREEK,
  LEAVE_EAST,
  LEAVE_NORTH,
  MEET_1,
  MEET_2_GREET,
  MEET_2_KNOWN,
  MEET_2_REMIND,
  MEET_2_REST,
  NORA_LOOK,
  NORA_PITCH,
  NORA_CAMP,
  NORA_SEAT,
  NORA_THOUGHTS,
  SIGHTINGS,
  NORA_UNNAMED,
  Nora,
  STARTLE,
  STARTLE_MOODS,
  AGAIN_MOODS,
  MEET_1_MOODS,
  MEET_2_GREET_MOODS,
  MEET_2_KNOWN_MOODS,
  MEET_2_REMIND_MOODS,
  MEET_2_REST_MOODS,
  YARD_SPOTS,
  type NoraKind,
} from './forest/story/nora'
import { FIND_BY_ID, KEEPSAKES, type Find, type FindId } from './forest/story/finds'
import {
  LANDMARKS,
  NATURE_LOOKS,
  PROP_LOOKS,
  roomAt,
  COMBOS,
  DOORS,
  type ComboId,
  type Door,
  type Spot,
} from './forest/story/map'
import { DOCS, type Doc } from './forest/story/docs'
import { PROP_SIZE, layout } from './forest/story/layout'
import { voiceFor } from './forest/story/voice'
import {
  BOARD_LINKS_MAX,
  BOARD_SIZE,
  ITEM_IDS,
  LEADS,
  NOTE_MAX,
  SITE_IDS,
  type ClueId,
  type EventId,
  type ItemId,
  type LeadId,
  type PuzzleId,
  type SiteId,
} from '../shared/story'
import { ITEMS } from './forest/story/items'
import { type EventCue } from './forest/story/events'
import type { DirectorHost } from './forest/story/director'
import {
  BIRDS_AT_TREELINE,
  CHUNK,
  ARM_FROM,
  ARM_SEEN_IN_DARK,
  CAUGHT_GRAB_MS,
  CAUGHT_SHAKE,
  CHASE_FLICKER,
  SCARE_MS,
  LIGHT_LEAST,
  LIGHT_TAKEN,
  DEEP_BED,
  DEEP_BED_FROM,
  DREAD_HUSH,
  LOST_BED,
  CHASE_SEEN,
  CHASE_VIGNETTE,
  COLLAPSE_FADE_MS,
  COLLAPSE_HOLD_MS,
  ENERGY_DRAIN,
  ENERGY_HURRY,
  ENERGY_INDOORS,
  ENERGY_LOST,
  ENERGY_LOW,
  ENERGY_SIT,
  ENERGY_UNEASY,
  MEAL_ENERGY,
  THING_BUS_START,
  THING_LOST_START,
  THING_START,
  THING_START_MIN,
  THING_SOUTH,
  UNEASE_FALL,
  UNEASE_RISE,
  UNEASY,
  EXIT_BACK,
  HOME_GLOW_UNTIL,
  MUSIC_SILENT_FROM,
  OFF_PATH_LOST,
  OFF_PATH_LOST_MAX,
  MUSE_GAP_MS,
  FEELS_OFF_CHANCE,
  BUS_AFTER,
  BUS_DIST,
  BUS_COPY_SOON,
  BUS_DEEP,
  BUS_DEEP_WIND,
  BUS_DROP,
  GRIN_GLOW,
  SHELTER_AFTER,
  SHELTER_DIST,
  WAIT_FASTER,
  WAIT_EYES_MS,
  WAIT_THOUGHT_MS,
  OFF_PATH_WARN,
  LOST_DEEP,
  LOST_DANGER,
  DEEP_EASE_S,
  PATH_GLOW,
  TURN_BACK_DOT,
  TURN_BACK_MS,
  PET_GAP_NEAR,
  PET_HOLD,
  PET_WARN_COOLDOWN_MS,
  PET_WARN_EDGE,
  PET_WARN_GAP_EDGE,
  PET_WARN_MS,
  SEE_THROUGH,
  SEE_THROUGH_H,
  SEE_THROUGH_W,
  PET_RUMBLE,
  REPRINT_COST,
  REPRINT_WAIT_MS,
  STAMINA_AGAIN,
  STAMINA_DRAIN,
  STAMINA_REST,
  STAMINA_SPENT,
  STAMINA_WALK,
  TWIG_CHANCE,
  WIND_AT_TREELINE,
  WIND_FROM,
  DANGER_PER_TRIP,
  GLINT_NEAR,
  NORA_MEET_AFTER,
  NORA_SIGHT_CHANCE,
  GLINT_PERIOD,
} from './forest/tuning'
import * as garden from './garden'
import {
  HOME_DOOR,
  FRONT_STEP,
  INFIRMARY_WAKE,
  buildRoom,
  forestStub,
  gapAt,
  gapDistance,
  gapReturn,
  getInfirmary,
  outskirts,
  toTreeline,
  type Gap,
  getGrounds,
  getHall,
  hallDoorX,
  T,
  groundAt,
  inBounds,
  allotmentAt,
  plotOrigin,
  roomId,
  seatsOf,
  type GameMap,
  type Interact,
  type Npc,
  type Obj,
  type Seat,
} from './maps'
import { HOUSE_CAT, Wildlife, eggDay, eggsLeft, houseCat } from './animals'
import { gameHour } from './clock'
import * as intro from './intro'
import { REL } from './family'
import { NetError, type Net } from './net'
import {
  Follower,
  PET_H,
  PET_W,
  heartsText,
  petBedtime,
  petDay,
  petSprite,
  pickGift,
  type PetPose,
} from './pets'
import { SPR_H, SPR_W, lookKey, personSprite, seatedSprite } from './people'
import { perf } from './perf'
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
  /** The visible canvas; the scene is drawn into `ctx` (an offscreen canvas) and copied here. */
  private vctx: CanvasRenderingContext2D
  private scene = document.createElement('canvas')
  private ctx: CanvasRenderingContext2D
  /** Whether the colour grade can be applied while copying (canvas filters); else it's CSS. */
  private canvasFilter = 'filter' in CanvasRenderingContext2D.prototype
  readonly overlay: HTMLCanvasElement
  private octx: CanvasRenderingContext2D
  scale = 3
  private vw = 0
  private vh = 0
  private cam = { x: 0, y: 0 }

  mapId: MapId = 'grounds'
  map: GameMap = getGrounds()
  /** The forest you're in, if you're in it (FOREST.md). It only ever exists in this browser. */
  forest: Forest | null = null
  /**
   * This trip into the forest: the gap you came in by, how long you've been lost, and the collapse
   * (ms since it began, 0 if not). Never saved: reload and you're back on the grounds.
   */
  trip: {
    gap: Gap
    lostFor: number
    deep: number
    /** The trip is ending on a black screen with a line (ms since it began), then where to. */
    end: {
      kind: 'collapse' | 'caught' | 'home'
      t: number
      line: string
      /** An impostor that caught you (its face is shown), or a threat (the face in the dark). */
      who?: Person
      face?: boolean
      /** The jumpscare has been shown (after the grab). */
      scared?: boolean
    } | null
    /** People who find you (FOREST.md "Encounters"). */
    enc: Encounters
    /** Things that can catch you between encounters (footsteps behind you, the eyes). */
    threats: Threats
    /** How much of your light is left after things have taken some (1 is all of it). */
    lightLeft: number
    /** The jumpscare this trip will use if something catches you (loaded up front). */
    scare: Scare
    /** 0–1: hurrying drains it, walking refills it. */
    stamina: number
    /**
     * 0–1: how long until you collapse (FOREST.md "Unease and energy"). It drains all trip, faster
     * lost, hurrying or very uneasy; meals and sitting down give some back. Empty: you collapse.
     */
    energy: number
    /** You've felt it running low (said once a trip). */
    energyLow: boolean
    /** 0–1: how close something bad is (the thing above all), never which way. */
    unease: number
    /** The thing in the deep (forest/thing.ts), once it's hunting you this trip. */
    thing: Thing | null
    /** Ran out: no hurrying until it's refilled a little. */
    tired: boolean
    /** What this trip has to find, where, and what's in your notepad (story/plan.ts). */
    story: StoryPlan
    /** The inner voice and the uncanny moments (story/director.ts). */
    director: Director
    /** Real danger this trip can still have (DANGER_PER_TRIP at the start). */
    danger: number
    /** You've wandered off the paths (and been warned). */
    offPath: boolean
    /** Sitting down to wait (lost): ms you've been sitting, or -1 standing. */
    waiting: number
    /** The Route 9 bus (story/bus.ts): at the stop on the map, or at its copy once you're lost. */
    bus: Bus | null
    /** Let off the empty bus, deep in: the dark closes right in until you're found. */
    deeper: boolean
    /** On the bus (story/ride.ts): the forest stops while you ride. */
    ride: Ride | null
    /** The crew walking in through the camp gate after a safe ride, fading as they go. */
    crewWalk: { x: number; y: number; look: Look; a: number; anim: number }[]
    /** What "Something feels... off." has been said for this trip. */
    offFelt: Set<string>
    /** Nora, while she's here (story/nora.ts), and this trip's bookkeeping for her scenes. */
    nora: Nora | null
    noraSightTried: boolean
    /** Time spent in the courtyard, and whether you've looked at anything there (Meet 1's cue). */
    yardTime: number
    yardLooked: boolean
    /** Time spent at her camp by the creek (where you can run into her too). */
    campTime: number
    /** A meeting happened this trip (the second needs a later trip). */
    noraMetNow: boolean
    /**
     * Where you got lost, and how long you've been heading back that way (ms), looking for the
     * path, with where you were last frame.
     */
    lostFrom?: { x: number; y: number; heading: number; lx: number; ly: number }
  } | null = null
  private darkness = new Darkness()
  private musicLevel = -1
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
    this.vctx = this.view.getContext('2d')!
    this.ctx = this.scene.getContext('2d')!
    this.overlay = document.createElement('canvas')
    this.overlay.className = 'overlay'
    this.octx = this.overlay.getContext('2d')!
    this.save.slot = slot
    this.clearCloset()
    // The colour grade: applied on the small canvas when copying the scene (far fewer pixels than
    // filtering the scaled-up element), or as a CSS filter where canvas filters aren't supported.
    if (!this.canvasFilter) this.view.style.filter = MOODS.property
    for (const o of getGrounds().objects) if (o.k === 'fence') this.fences.add(`${o.x},${o.y}`)
  }

  start(parent: HTMLElement) {
    parent.prepend(this.overlay)
    parent.prepend(this.view)
    this.resize()
    addEventListener('resize', () => this.resize())
    this.bindInput()
    this.warp('grounds', getGrounds().spawn.x, getGrounds().spawn.y, 0, false)
    this.warmLooks()
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
    this.startIntro()
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
    this.scene.width = this.vw
    this.scene.height = this.vh
    this.vctx.imageSmoothingEnabled = false
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
      // Enter and Space press the focused square or button on a games-table board.
      if ((k === 'enter' || k === ' ') && this.ui.inBoard(e.target)) return
      if (!this.ui.panelOpen() && this.ui.dialogueKey(e)) return
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
      if (k === 'f') {
        if (!e.repeat) this.feedPet()
        return
      }
      if (k === 'n' && this.trip) {
        if (!e.repeat) this.ui.openNotepad()
        return
      }
      if (this.decor.active && (k === 'delete' || k === 'backspace' || k === 'x')) {
        this.storeHeld()
        return
      }
      if (k === 'x') {
        if (!e.repeat) this.digFacing()
        return
      }
      const n = Number(k)
      if (n >= 1 && n <= 9) {
        const id = Object.keys(CROPS)[n - 1]
        if (id) this.selectSeed(id)
        return
      }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
      // Keys still held from walking in through the gap don't count until they're let go.
      if (this.heldThrough.has(k)) return
      this.keys.add(k)
    })
    addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase())
      this.heldThrough.delete(e.key.toLowerCase())
    })
    addEventListener('blur', () => {
      this.keys.clear()
      this.heldThrough.clear()
    })
    this.overlay.addEventListener('mousemove', (e) => {
      this.decor.mouse = { x: e.clientX, y: e.clientY }
    })
    // Right-click a tile of your plot next to you to dig up what's growing there.
    this.overlay.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      if (this.ui.panelOpen() || this.ui.dialogueOpen() || this.decor.active || this.seat) return
      const t = this.tileAtScreen(e.clientX, e.clientY)
      if (Math.hypot(t.x + 0.5 - this.me.x, t.y + 0.5 - (this.me.y - 0.3)) > 1.9) return
      const p = this.plotTile(t.x, t.y)
      if (p && p.i !== null) this.dig(p.slot, p.i)
    })
    this.overlay.addEventListener('mousedown', (e) => {
      if (e.button === 2) return
      if (this.ui.panelOpen()) return
      if (this.ui.dialogueOpen()) return this.ui.advanceDialogue()
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
    if (id === 'infirmary') return getInfirmary()
    if (id === 'forest') return forestStub()
    const owner = this.ownerOf(id)!
    const m = buildRoom(owner, this.roomOf(owner) ?? { items: [] })
    // Your keys on your hook (only in your own room: your story is yours alone).
    if (owner === this.login) {
      const hook = m.objects.find((o) => o.k === 'keyhook')
      if (hook) hook.n = this.save.story?.hook?.length ?? 0
    }
    return m
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

  warp(to: MapId, x: number, y: number, dir: Dir, fade = true, door = true) {
    if (this.decor.active) this.endDecorate()
    const fromForest = this.mapId === 'forest'
    if (to !== 'forest') {
      this.forest = null
      this.trip = null
    }
    this.mapId = to
    this.map = this.buildMap(to)
    this.me.x = x
    this.me.y = y
    this.me.dir = dir
    this.seat = null
    // Your pet won't go into the forest: it stays where it stopped, and is there when you're back.
    if (this.petOut && to !== 'forest' && !(fromForest && to === 'grounds')) this.myPet.reset(x, y)
    this.remotePets.clear()
    this.resize()
    // Build this place's cached ground and sprites now, under the fade, not mid-walk.
    this.warm(this.map)
    if (fade) {
      this.fade = 1
      if (door) sfx('door')
    }
    this.ui.refresh()
    this.ui.renderChat()
    if (to !== 'grounds') void this.refreshWorld()
    this.scheduleSync(30)
  }

  placeName(): string {
    if (this.mapId === 'grounds') return 'Sunset Acres grounds'
    if (this.mapId === 'hall') return 'The hallway'
    if (this.mapId === 'infirmary') return 'The infirmary'
    // Where you are in the forest: you don't know (FOREST.md "Build status").
    if (this.mapId === 'forest') return 'Unknown'
    const owner = this.ownerOf(this.mapId)!
    if (owner === this.login) return 'Your room'
    return `${this.profiles.get(owner)?.look.name ?? owner}'s room`
  }

  inOwnRoom(): boolean {
    return this.mapId === roomId(this.login)
  }

  // --- movement & collision -------------------------------------------------------------------

  private solid(tx: number, ty: number): boolean {
    if (this.forest) return this.forest.solid(tx, ty)
    if (!inBounds(this.map, tx, ty)) return true
    if (this.introAdaHere() && tx === intro.INTRO_ADA_TILE.x && ty === intro.INTRO_ADA_TILE.y)
      return true
    return this.map.solid[ty * this.map.w + tx] === 1
  }

  private myFrame = 0

  /** What's underfoot at (x, y), for the footstep sound. */
  surfaceAt(x: number, y: number): Surface {
    if (this.forest) return 'leaves'
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
    const collapsing = !!this.trip?.end
    const led = this.trip?.enc.leading() ?? null
    if (led) {
      // Following a fake: you can't stop yourself.
      dx = led.x
      dy = led.y
    } else if (!this.typing() && !this.ui.panelOpen() && !this.ui.dialogueOpen() && !collapsing) {
      if (this.keys.has('arrowleft') || this.keys.has('a')) dx -= 1
      if (this.keys.has('arrowright') || this.keys.has('d')) dx += 1
      if (this.keys.has('arrowup') || this.keys.has('w')) dy -= 1
      if (this.keys.has('arrowdown') || this.keys.has('s')) dy += 1
    }
    if (this.trip?.ride) {
      // On the bus: you walk the aisle instead (story/ride.ts), not the forest.
      dx = 0
      dy = 0
    }
    if (this.trip && this.trip.waiting >= 0) {
      // Sitting among the roots: any movement key gets you up.
      if (dx || dy) this.trip.waiting = -1
      dx = 0
      dy = 0
    }
    if (this.seat) {
      // Any movement key gets you up; otherwise you stay put (and doze off after a while).
      if (dx || dy) this.standUp()
      else this.seatedFor += dt
      dx = 0
      dy = 0
    }
    const moving = dx !== 0 || dy !== 0
    if (moving) {
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) this.me.dir = dx < 0 ? 1 : 2
      if (dy !== 0 && (Math.abs(dy) > Math.abs(dx) || dx === 0)) this.me.dir = dy < 0 ? 3 : 0
      const len = Math.hypot(dx, dy)
      const hurry = this.hurrying()
      const sp = (led ? SPEED * 0.8 : hurry ? FAST : SPEED) * dt
      const nx = this.me.x + (dx / len) * sp
      const ny = this.me.y + (dy / len) * sp
      let bumped = false
      const before = { x: this.me.x, y: this.me.y }
      if (!this.blocked(nx, this.me.y)) this.me.x = nx
      else bumped = true
      if (!this.blocked(this.me.x, ny)) this.me.y = ny
      else bumped = true
      // Hurrying shuffles the feet faster (and so steps come quicker).
      this.me.anim += dt * (hurry ? 10 : 7)
      const walked = Math.hypot(this.me.x - before.x, this.me.y - before.y) > 0.001
      if (walked && landed(this.myFrame, this.me.anim)) {
        footstep(this.surfaceAt(this.me.x, this.me.y))
        if (this.forest && Math.random() < TWIG_CHANCE) twigSnap(0.6 + Math.random() * 0.4)
      }
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
    this.updateStamina(dt, moving)

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
      if (r.p.map === this.mapId && !this.forest && r.anim > 0 && landed(r.frame, r.anim)) {
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
    this.updatePets(dt)
    if (this.forest) this.updateForest(dt)
    else if (this.mapId === 'grounds') this.checkTreeline()
    this.updateWatching()
    if (this.mapId === 'grounds') {
      const threats = [{ x: this.me.x, y: this.me.y }]
      if (this.petOut) threats.push({ x: this.myPet.x, y: this.myPet.y })
      for (const r of this.others.values())
        if (r.p.map === 'grounds') threats.push({ x: r.rx, y: r.ry })
      for (const f of this.remotePets.values()) threats.push({ x: f.x, y: f.y })
      this.wild.update(this.gameNow(), threats, playClip)
    }
    {
      const now = this.gameNow()
      this.wild.sounds(
        now,
        gameHour(now),
        this.mapId === 'grounds' ? { x: this.me.x, y: this.me.y } : null,
        playClip,
      )
    }
    this.fade = Math.max(0, this.fade - dt * 3)
    const hour = gameHour(Date.now() + this.serverSkew)
    this.ui.setClock(clockText(hour))
    this.updateSound(hour)
    this.ui.setPrompt(this.decor.active || this.ui.dialogueOpen() ? null : this.promptText())
    if (intro.isActive(this.save)) {
      this.ui.renderQuest()
      if (
        this.introFinale &&
        !this.ui.panelOpen() &&
        !this.ui.dialogueOpen() &&
        this.decor.held < 0
      )
        this.finishIntro()
    }
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
    if (this.introAdaHere() && x === intro.INTRO_ADA_TILE.x && y === intro.INTRO_ADA_TILE.y)
      return { kind: 'nurse', x, y }
    return this.map.interacts.find((i) => i.x === x && i.y === y)
  }

  // --- Nurse Ada's introduction -----------------------------------------------------------------

  /** Set once the last task is done; the goodbye waits until panels and placing are finished. */
  private introFinale = false

  /** Ada stands outside to greet you while your introduction is running. */
  private introAdaHere(): boolean {
    return this.mapId === 'grounds' && intro.isActive(this.save) && !this.introFinale
  }

  /** The people standing around this map: its own NPCs, plus Ada outside during the intro. */
  private npcs(): Npc[] {
    return this.introAdaHere() ? [...this.map.npcs, intro.INTRO_ADA] : this.map.npcs
  }

  introHint(): string {
    return intro.hint(this.save, this.slot, this.mapId, this.login, Date.now(), this.nearMyPlot())
  }

  /**
   * The introduction's "Finish growing" shortcut: offered once something in your plot is planted
   * and watered but not ripe, while the intro is on its plant or sell task, so new players needn't
   * wait out a whole growth (watering still has to be done first, so they learn it).
   */
  canRushGrowth(): boolean {
    if (this.save.intro !== INTRO.plant && this.save.intro !== INTRO.sell) return false
    const now = Date.now()
    return this.save.garden.some((t) => t.c && garden.isWet(t, now) && garden.stage(t, now) < 3)
  }

  rushGrowth() {
    if (!this.canRushGrowth()) return
    const now = Date.now()
    let n = 0
    for (const t of this.save.garden) {
      if (!t.c || !garden.isWet(t, now) || garden.stage(t, now) === 3) continue
      t.g = CROPS[t.c].growMs
      t.t = now
      n++
    }
    sfx('harvest')
    this.say(
      n > 1
        ? "Nurse Ada gives your plants a little encouragement. They're ready to pick!"
        : "Nurse Ada gives your plant a little encouragement. It's ready to pick!",
    )
    this.markDirty()
    this.ui.refresh()
  }

  private startIntro() {
    if (!intro.isActive(this.save)) return
    // Without a garden plot (the home is full) there's nothing to plant: skip the tour.
    if (this.slot < 0) {
      delete this.save.intro
      this.markDirty()
      return
    }
    if (this.save.intro === INTRO.greet) window.setTimeout(() => this.greet(), 700)
  }

  private greet() {
    if (this.save.intro !== INTRO.greet || this.ui.dialogueOpen()) return
    this.ui.dialogue('Nurse Ada', intro.greeting(this.save.look.name), {
      pitch: intro.ADA_VOICE,
      look: intro.INTRO_ADA.look,
      old: false,
      choices: [
        { label: 'Lead the way!', onPick: () => this.setIntro(INTRO.plant) },
        {
          label: 'I know my way around',
          onPick: () => {
            this.endIntro()
            this.say('Nurse Ada: Of course, dear. You know where to find me.')
          },
        },
      ],
    })
  }

  private setIntro(step: (typeof INTRO)[keyof typeof INTRO]) {
    if (step === INTRO.done) return this.endIntro()
    this.save.intro = step
    this.markDirty()
    this.ui.refresh()
  }

  private endIntro() {
    delete this.save.intro
    this.introFinale = false
    this.markDirty()
    this.ui.refresh()
  }

  /** Something happened that may tick off the current task. */
  private introEvent(what: 'plant' | 'sell' | 'buy') {
    const step = this.save.intro
    if (step === INTRO.plant && what === 'plant') {
      this.setIntro(INTRO.sell)
      this.say(intro.AFTER_PLANT)
    } else if (step === INTRO.sell && what === 'sell') {
      this.setIntro(INTRO.buy)
      this.say(intro.AFTER_SELL)
    } else if (step === INTRO.buy && what === 'buy') {
      this.introFinale = true
    }
  }

  private finishIntro() {
    this.introFinale = false
    const def = FURNITURE[intro.INTRO_GIFT]
    let gift = def.name
    if (this.save.room.items.length < MAX_ROOM_ITEMS) {
      this.save.room.items.push({ k: def.id, x: -1, y: -1 })
    } else {
      // No room in storage: the same value in coins instead.
      this.save.coins += def.price
      gift = `${def.price} coins`
    }
    this.endIntro()
    sfx('harvest')
    this.ui.dialogue('Nurse Ada', intro.finale(this.save.look.name, gift), {
      pitch: intro.ADA_VOICE,
      look: intro.INTRO_ADA.look,
      old: false,
    })
  }

  private drawIntroArrow(ox: number, oy: number) {
    if (!intro.isActive(this.save) || this.introFinale) return
    const t = intro.arrowTarget(this.save, this.slot, this.login, this.map, this.nearMyPlot())
    if (!t) return
    const c = this.ctx
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const bob = reduce ? 0 : Math.round(Math.sin(this.time / 220) * 2)
    const px = Math.round(t.x * TS + ox)
    const py = Math.round(t.y * TS + oy) + bob
    // The part of the view that isn't under the HUD (hotbar and chat at the bottom).
    const l = 14
    const r = this.vw - 14
    const top = Math.ceil(70 / this.scale)
    const bot = this.vh - Math.ceil(100 / this.scale)
    if (px < l || py < top + 10 || px > r || py > bot) {
      // Off screen: a pointer at the edge of the view, aimed at the target.
      const cx = (l + r) / 2
      const cy = (top + bot) / 2
      const ang = Math.atan2(py - cy, px - cx)
      const k = Math.min(
        Math.abs((r - l) / 2 / (Math.cos(ang) || 1e-6)),
        Math.abs((bot - top) / 2 / (Math.sin(ang) || 1e-6)),
      )
      const ex = cx + Math.cos(ang) * k
      const ey = cy + Math.sin(ang) * k
      const pulse = reduce ? 0 : Math.sin(this.time / 220) * 1.5
      c.save()
      c.translate(Math.round(ex), Math.round(ey))
      c.rotate(ang)
      for (const [col, grow] of [
        ['#1e2140', 1.5],
        ['#f2b84b', 0],
      ] as const) {
        c.fillStyle = col
        c.beginPath()
        c.moveTo(6 + grow + pulse, 0)
        c.lineTo(-5 - grow + pulse, -6 - grow)
        c.lineTo(-2 + pulse, 0)
        c.lineTo(-5 - grow + pulse, 6 + grow)
        c.closePath()
        c.fill()
      }
      c.restore()
      return
    }
    // A small gold arrow pointing down, outlined in night blue.
    const rows: [number, number][] = [
      [-2, 5],
      [-2, 5],
      [-2, 5],
      [-5, 11],
      [-4, 9],
      [-3, 7],
      [-2, 5],
      [-1, 3],
      [0, 1],
    ]
    c.fillStyle = '#1e2140'
    rows.forEach(([x, w], i) => c.fillRect(px + x - 1, py - rows.length + i - 1, w + 2, 3))
    c.fillStyle = '#f2b84b'
    rows.forEach(([x, w], i) => c.fillRect(px + x, py - rows.length + i, w, 1))
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
    if (this.seat) return '[WASD] Get up'
    if (this.forest) return this.forestPrompt()
    const pet = this.petInFront()
    {
      const ft = this.facingTile()
      const table = this.tableAtTile(ft.x, ft.y)
      if (table) {
        const t = this.tables.get(table)
        if (this.watching === table) return 'Stop watching'
        return t && !t.result ? 'Watch the game' : 'Games table · sit on a stool to play'
      }
    }
    if (pet) return this.petPrompt(pet)
    const t = this.facingTile()
    const seat = this.seatAtTile(t.x, t.y)
    if (seat) return seat.free ? 'Sit down' : 'No room here'
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
        case 'closet':
          return 'A closet door'
        case 'keyhook': {
          if (this.ownerOf(this.mapId) !== this.login) return 'A key hook'
          const carrying = this.pocketKeys().length
          if (carrying) return carrying > 1 ? 'Hang up your keys' : 'Hang up the key'
          const n = this.save.story?.hook?.length ?? 0
          return n ? (n > 1 ? 'Take the keys' : 'Take the key') : 'A key hook'
        }
        case 'noticeboard':
          return 'Read the garden noticeboard'
        case 'nest': {
          const n = eggsLeft(this.save, this.gameNow())
          return n ? `Collect ${n} egg${n > 1 ? 's' : ''}` : 'Nest boxes · fresh eggs at 7:00 am'
        }
      }
    }
    const plot = this.plotTile(t.x, t.y)
    if (plot) {
      if (plot.i !== null) return this.plotPrompt(plot.slot, plot.i)
      if (plot.slot === this.slot)
        return 'Room to grow · bigger plots at the noticeboard by the gate'
      const name = this.slotOwnerName(plot.slot)
      return name ? `${name}'s allotment` : 'An empty allotment'
    }
    if (this.ownerOf(this.mapId)) {
      const item = this.furnitureAt(t.x, t.y, false, true)
      if (item?.k === 'familyphoto') {
        if (!this.inOwnRoom()) return 'Their family photo'
        const where = photoWhere(this.save)
        return where === 'wall'
          ? 'Look at your family photo'
          : where === 'none'
            ? 'An empty photo frame'
            : 'Your photo frame (empty)'
      }
      if (item?.k === STOVE && this.inOwnRoom()) return 'Cook at your stove'
      if (item?.k === 'corkboard')
        return this.inOwnRoom() ? 'Look at your corkboard' : 'A corkboard'
      if (item) return FURNITURE[item.k].name
    }
    return null
  }

  /** The size of the plot in `slot` (yours from your save, others' from their profile). */
  plotSizeOf(slot: number): PlotSize {
    return slot === this.slot ? plotSize(this.save.plot) : plotSize(this.profileInSlot(slot)?.plot)
  }

  /**
   * The garden tile at (x, y) on the grounds: its slot, and its index in that plot's garden, or
   * `i: null` for the grass in the allotment beyond a plot that hasn't grown to full size.
   */
  private plotTile(x: number, y: number): { slot: number; i: number | null } | null {
    if (this.mapId !== 'grounds') return null
    const a = allotmentAt(x, y)
    if (!a) return null
    const { w, h } = this.plotSizeOf(a.slot)
    return { slot: a.slot, i: a.dx < w && a.dy < h ? a.dy * w + a.dx : null }
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
      const name = CROPS[this.selectedSeed].name
      if ((this.save.inv[`plant:${this.selectedSeed}`] ?? 0) > 0) return `Replant a potted ${name}`
      const n = this.save.inv[`seed:${this.selectedSeed}`] ?? 0
      return n > 0 ? `Plant ${name}` : `No ${name} seeds`
    }
    const st = garden.stage(tile, now)
    const name = CROPS[tile.c].name
    const dig = ' · [X] Dig up'
    if (st === 3) return `Harvest ${name}${dig}`
    if (!garden.isWet(tile, now)) return `Water the ${name}${dig}`
    return `${name} · ${fmt(garden.timeLeft(tile, now))} to go${dig}`
  }

  interact() {
    if (this.decor.active || this.seat) return
    const pet = this.petInFront()
    if (pet) return this.petPet(pet)
    const t = this.facingTile()
    this.actOn(t.x, t.y)
  }

  /** Clicking a tile next to you acts on it, as if you'd turned to face it. */
  private clickTile(x: number, y: number) {
    // In the forest, clicking anywhere on a thing's picture (the bus shelter's roof, a tree's
    // crown) means the thing: the tile it stands on nearest you.
    if (this.forest && !this.storyThing(x, y)) {
      const at = this.thingUnder(x, y)
      if (at) [x, y] = at
    }
    const cx = x + 0.5
    const cy = y + 0.5
    const dx = cx - this.me.x
    const dy = cy - (this.me.y - 0.3)
    if (Math.hypot(dx, dy) > 1.9) return
    this.me.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0
    this.actOn(x, y)
  }

  /** The base tile (nearest you) of whatever's drawn over a tile in the forest, if anything. */
  private thingUnder(x: number, y: number): [number, number] | null {
    const f = this.forest
    if (!f) return null
    if (f.isMap(x, y)) {
      const p = layout().propAt(x, y, true)
      if (p) {
        const w = PROP_SIZE[p.id]?.w ?? 1
        const bx = Math.max(p.x, Math.min(p.x + w - 1, x))
        return [bx, p.y]
      }
    }
    // A tree's crown: its trunk is a few tiles below.
    for (let k = 1; k <= 5; k++) {
      const o = f.objectAt(x, y + k)
      if (o && TALL.has(o.k)) return [x, y + k]
    }
    return null
  }

  private actOn(x: number, y: number) {
    if (this.seat) return
    if (this.forest) return this.examine(x, y)
    const pet = this.petAt(x, y)
    if (pet) return this.petPet(pet)
    const table = this.tableAtTile(x, y)
    if (table) {
      this.watching = this.watching === table ? null : table
      sfx('blip')
      return this.ui.renderTable()
    }
    const seat = this.seatAtTile(x, y)
    if (seat) {
      if (seat.free) return this.sitDown(seat.free)
      return this.say("There's no room here just now. Maybe the next bench along?")
    }
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
        case 'closet':
          // Just a locked door (STORY.md "Act I"). Nothing says what's behind it. (It's noted as a
          // lead: PUZZLES.md P06.)
          sfx('blip')
          if (this.ownerOf(this.mapId) === this.login) this.addLeadAtHome('closet_locked')
          return this.say("It's locked.")
        case 'keyhook':
          return this.useKeyHook()
        case 'noticeboard':
          sfx('blip')
          return this.ui.openNoticeboard()
        case 'nest':
          return this.collectEggs()
      }
    }
    const plot = this.plotTile(x, y)
    if (plot) {
      if (plot.i !== null) return this.tend(plot.slot, plot.i)
      if (plot.slot === this.slot)
        return this.say(
          'This part of your allotment is still grass. The noticeboard by the garden gate has bigger plots for sale.',
        )
      return this.tend(plot.slot, -1)
    }
    if (this.ownerOf(this.mapId)) {
      const item = this.furnitureAt(x, y, false, true)
      if (item?.k === 'familyphoto') return this.lookAtPhoto()
      if (item?.k === 'corkboard') {
        if (!this.inOwnRoom())
          return this.say("It's covered in old papers and string. Not yours to read.")
        if (!this.save.board?.clues.length) return this.say('An empty corkboard.')
        sfx('blip')
        return this.ui.openBoard()
      }
      if (item?.k === STOVE && this.inOwnRoom()) {
        sfx('blip')
        return this.ui.openStove()
      }
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
    if (intro.isActive(this.save) && this.slot >= 0) {
      if (this.save.intro === INTRO.greet) return this.greet()
      return this.ui.dialogue('Nurse Ada', [`You're doing well, dear. ${this.introHint()}`], {
        pitch: intro.ADA_VOICE,
        look: intro.INTRO_ADA.look,
        old: false,
      })
    }
    if (this.slot < 0) {
      this.say("Nurse Ada: The home is full, dear, but I've set up a cot for you. This way!")
      return this.warp(roomId(this.login), ROOM_DOOR_X + 0.5, 8.2, 3)
    }
    const ada = { pitch: intro.ADA_VOICE, look: intro.INTRO_ADA.look, old: false }
    const fam = this.save.family
    if (fam?.lost && fam.reprintAt)
      return this.ui.dialogue(
        'Nurse Ada',
        [
          "Your photo's being printed, dear. I'll hang it on your wall myself as soon as it's ready.",
        ],
        ada,
      )
    if (fam?.lost)
      return this.ui.dialogue(
        'Nurse Ada',
        [
          `Oh, ${this.save.look.name}. Your family photo's gone missing, hasn't it?`,
          "Don't you worry. We keep a copy in your file. I can have it printed by tomorrow, or there's the quick machine in the office, but that costs a little.",
        ],
        {
          ...ada,
          choices: [
            {
              label: 'Tomorrow is fine',
              onPick: () => {
                this.orderReprint(false)
                this.say("Nurse Ada: It'll be on your wall by tomorrow, dear.")
              },
            },
            {
              label: `Right away (${REPRINT_COST} coins)`,
              onPick: () => {
                if (!this.orderReprint(true))
                  this.say(`You need ${REPRINT_COST} coins for the quick machine.`)
              },
            },
            { label: 'Not now', onPick: () => {} },
          ],
        },
      )
    const pet = this.save.pet
    if (!pet) {
      return this.ui.dialogue(
        'Nurse Ada',
        [
          `Good to see you, ${this.save.look.name}!`,
          'We have a little pet programme here: a dog or a cat of your own, to keep you company. Would you like one?',
        ],
        {
          ...ada,
          choices: [
            { label: 'Yes, please!', onPick: () => this.ui.openAdoption('adopt') },
            { label: 'Maybe later', onPick: () => {} },
          ],
        },
      )
    }
    const lines = [
      `How is ${pet.name} getting on? You two look very happy together.`,
      'Remember to water your plants. They only grow while the soil is wet!',
      'Chef Rosa at the Kitchen buys produce. Pumpkins fetch the best price.',
      `Chef Rosa sells treats for ${pet.name}, too. One a day keeps the tail wagging.`,
      'Press Enter to chat with your neighbours.',
    ]
    this.ui.dialogue('Nurse Ada', [lines[Math.floor(Math.random() * lines.length)]], {
      ...ada,
      choices: [
        { label: 'Bye for now', onPick: () => {} },
        { label: `Rename ${pet.name}`, onPick: () => this.ui.openAdoption('rename') },
      ],
    })
  }

  // --- sitting ---------------------------------------------------------------------------------

  /** The seat you're on (benches, hallway chairs, armchairs and rocking chairs). */
  seat: Seat | null = null
  private seatAt = 0
  private seatedFor = 0

  private seatsHere(): Seat[] {
    const owner = this.ownerOf(this.mapId)
    return seatsOf(this.map, owner ? this.roomOf(owner)?.items : undefined)
  }

  private seatTakenBy(seat: Seat): boolean {
    for (const r of this.others.values())
      if (r.p.map === this.mapId && r.p.sit === seat.id) return true
    return false
  }

  /**
   * The seat you'd get by facing tile (x, y): the place on that tile, or another free one on the
   * same bench. `free` is null if the bench is full. Null if there's nothing to sit on there.
   */
  private seatAtTile(x: number, y: number): { free: Seat | null } | null {
    if (this.decor.active) return null
    const seats = this.seatsHere()
    const here = seats.find((s) => s.tx === x && s.ty === y)
    if (!here) return null
    if (!this.seatTakenBy(here)) return { free: here }
    const other = seats.find((s) => s.group === here.group && !this.seatTakenBy(s))
    return { free: other ?? null }
  }

  private sitDown(seat: Seat) {
    this.seat = seat
    this.seatAt = Date.now()
    this.seatedFor = 0
    this.me.x = seat.x
    this.me.y = seat.y
    this.me.dir = seat.face ?? 0
    this.me.moving = false
    this.me.anim = 0
    this.keys.clear()
    this.myPet.retrail()
    sfx('blip')
    this.scheduleSync(30)
    if (tableOfSeat(seat.id)) {
      this.watching = null
      this.tableSel = []
      this.ui.renderTable()
    }
  }

  /** Back on your feet, just in front of the seat. */
  standUp() {
    const s = this.seat
    if (!s) return
    this.seat = null
    // Step out in front if there's room, else above or to a side (chairs against a wall).
    const spot = this.freeNear(s.x, s.y, [
      [0, 0.75],
      [0, 1.1],
      [0, -1.15],
      [-1, 0.6],
      [1, 0.6],
    ])
    if (spot) {
      this.me.x = spot.x
      this.me.y = spot.y
    }
    this.me.dir = 0
    this.myPet.retrail()
    this.scheduleSync(30)
    if (tableOfSeat(s.id)) this.ui.renderTable()
  }

  /** The first of the offsets from (x, y) you could stand on, if any. */
  private freeNear(x: number, y: number, offsets: number[][]): { x: number; y: number } | null {
    for (const [dx, dy] of offsets)
      if (!this.blocked(x + dx, y + dy)) return { x: x + dx, y: y + dy }
    return null
  }

  /** Where a pet settles while its owner sits: by their feet, wherever there's floor. */
  private feetSpot(x: number, y: number): { x: number; y: number } {
    return (
      this.freeNear(x, y, [
        [1.05, 0.95],
        [-1.05, 0.95],
        [0, 1.15],
        [1.1, 0.2],
        [-1.1, 0.2],
        [1.15, -0.9],
        [-1.15, -0.9],
        [0, -1.1],
      ]) ?? { x, y: y + 0.95 }
    )
  }

  /** Dozing off: after half a minute sitting still (but never at a games table). */
  private dozing(sitAt: number | undefined, now: number, seat?: string): boolean {
    return sitAt !== undefined && now - sitAt > 30_000 && !tableOfSeat(seat)
  }

  private drawSeated(
    look: Look,
    x: number,
    y: number,
    doze: boolean,
    ox: number,
    oy: number,
    dir: Dir = 0,
  ) {
    const c = this.ctx
    const px = Math.round(x * TS + ox)
    const py = Math.round(y * TS + oy)
    c.drawImage(seatedSprite(look, doze, dir), px - SPR_W / 2, py - SPR_H + 1)
    if (doze) {
      const t = (this.time / 1800) % 1
      c.fillStyle = `rgba(59,63,128,${0.9 * (1 - t)})`
      const zx = px + 5 + Math.round(t * 4)
      const zy = py - 22 - Math.round(t * 8)
      c.fillRect(zx, zy, 3, 1)
      c.fillRect(zx + 1, zy + 1, 1, 1)
      c.fillRect(zx, zy + 2, 3, 1)
    }
  }

  // --- board-game tables -----------------------------------------------------------------------

  /** Every table's state as last heard from the server (or from your own move). */
  tables = new Map<string, TableState>()
  /** A table you're standing by and watching (you face it and press E). */
  watching: string | null = null
  /** Checkers: the squares picked so far for your move (the piece, then any jumps). */
  tableSel: number[] = []
  tableBusy = false

  /** The id of the games table on tile (x, y), if there is one on this map. */
  private tableAtTile(x: number, y: number): string | null {
    if (this.mapId !== 'grounds') return null
    const o = this.map.objects.find((o) => o.k === 'gametable' && o.x === x && o.y === y)
    return o ? `table:${o.x},${o.y}` : null
  }

  /** The table you're sitting at (and on which side), or watching. Null if neither. */
  tableView(): {
    id: string
    state: TableState | null
    side: Side | null
    seated: Seated
    busy: boolean
  } | null {
    const at = tableOfSeat(this.seat?.id)
    const id = at?.id ?? this.watching
    if (!id) return null
    const me = { login: this.login, look: this.save.look, map: this.mapId }
    const people = [...this.others.values()].map((r) => r.p)
    const seated = seatedAt(
      id,
      this.seat ? [...people, { ...me, sit: this.seat.id, sitAt: this.seatAt }] : people,
    )
    return {
      id,
      state: this.tables.get(id) ?? null,
      side: at?.side ?? null,
      seated,
      busy: this.tableBusy,
    }
  }

  canStartTable(): boolean {
    const v = this.tableView()
    return !!v && v.side !== null && canStart(v.state, v.seated)
  }

  /** Sends a start, move or resign for the table you're sitting at. */
  async tableAction(action: TableAction) {
    const v = this.tableView()
    // Resigning works standing up too (you might have wandered off mid-game); the rest needs a stool.
    if (!v || this.tableBusy || (v.side === null && action.type !== 'resign')) return
    this.tableBusy = true
    this.ui.renderTable()
    try {
      const { table } = await this.net.table({ id: v.id, version: v.state?.version ?? 0, action })
      this.tables.set(table.id, table)
      this.tableSel = []
      sfx(action.type === 'move' ? 'clack' : 'blip')
      if (table.result) this.tableOver(table)
    } catch (err) {
      this.tableSel = []
      if (err instanceof NetError && (err.status === 409 || err.status === 400)) {
        sfx('nope')
        this.ui.toast(err.message)
        this.scheduleSync(0)
      } else this.handleNetError(err)
    } finally {
      this.tableBusy = false
      this.ui.renderTable()
    }
  }

  private tableOver(t: TableState) {
    const mine = t.players[0] === this.login ? 0 : t.players[1] === this.login ? 1 : null
    if (mine !== null && t.result?.winner === mine) sfx('harvest')
  }

  /** New states from a sync: plays the opponent's moves and tells you when it's your turn. */
  private applyTables(list: TableState[]) {
    const view = this.tableView()
    let changed = false
    for (const t of list) {
      const prev = this.tables.get(t.id)
      if (prev && prev.version >= t.version) continue
      this.tables.set(t.id, t)
      if (t.id !== view?.id) continue
      changed = true
      if (prev && prev.game === t.game && t.version === prev.version + 1 && t.last.length)
        sfx('clack')
      if (t.result) this.tableOver(t)
      else if (view.side !== null && t.turn === view.side && t.players[view.side] === this.login)
        sfx('chat')
    }
    if (changed) {
      this.tableSel = []
      this.ui.renderTable()
    }
  }

  /** Watching ends when you walk away from the table. */
  private updateWatching() {
    if (!this.watching) return
    const [x, y] = this.watching.slice(6).split(',').map(Number)
    if (
      this.mapId !== 'grounds' ||
      Math.hypot(this.me.x - (x + 0.5), this.me.y - (y + 0.5)) > 3.5
    ) {
      this.watching = null
      this.ui.renderTable()
    }
  }

  private drawTableTop(id: string, px: number, py: number) {
    const t = this.tables.get(id)
    drawTableGame(this.ctx, px, py, t?.game ?? null, t?.board ?? null, t?.first ?? 0)
  }

  // --- animals --------------------------------------------------------------------------------

  private wild = new Wildlife(getGrounds())

  /** The shared game clock's "now" (server time). */
  gameNow(): number {
    return Date.now() + this.serverSkew
  }

  /** The nest boxes: take this game day's eggs (everyone collects their own). */
  private collectEggs() {
    const now = this.gameNow()
    const n = eggsLeft(this.save, now)
    if (!n) return this.say("The nests are empty. The hens lay again at 7 o'clock in the morning.")
    this.save.inv.egg = (this.save.inv.egg ?? 0) + n
    this.save.coop = { day: eggDay(now), taken: HENS }
    sfx('harvest')
    playClip('cluck', 0.8)
    this.markDirty()
    this.ui.refresh()
    this.say(`+${n} egg${n > 1 ? 's' : ''}, still warm. Chef Rosa buys them at the Kitchen.`)
  }

  sellEggs(count: number) {
    const have = this.save.inv.egg ?? 0
    const n = Math.min(have, count)
    if (n <= 0) return
    const earned = n * EGG_PRICE
    this.save.inv.egg = have - n
    if (!this.save.inv.egg) delete this.save.inv.egg
    this.save.coins += earned
    this.save.stats.earned += earned
    sfx('coin')
    this.markDirty()
    this.introEvent('sell')
    this.ui.refresh()
  }

  // --- pets -----------------------------------------------------------------------------------

  private myPet = new Follower()
  /** Your pet is out with you on this map (not asleep at home). */
  private petOut = false
  private remotePets = new Map<string, Follower>()
  private petFx: { x: number; y: number; t0: number }[] = []
  private petOutFor = 0
  private giftChecked = false

  /** Where your pet is: none, asleep in its bed (your room), asleep at home (night), or out. */
  private petMode(): 'none' | 'bed' | 'home' | 'follow' {
    if (!this.save.pet) return 'none'
    if (this.mapId === roomId(this.login)) return 'bed'
    if (petBedtime(gameHour(Date.now() + this.serverSkew))) return 'home'
    return 'follow'
  }

  /** Where a room's pet sleeps: on its bed, or on the floor if the bed isn't put down. */
  private bedSpot(room: { items: RoomItem[] } | null): { x: number; y: number } {
    const bed = room?.items.find((i) => i.k === 'petbed' && i.x >= 0)
    if (bed) return { x: bed.x + 0.5, y: bed.y + 0.62 }
    return { x: ROOM_FLOOR.x0 + 1.5, y: ROOM_FLOOR.y1 + 0.8 }
  }

  private updatePets(dt: number) {
    const out = this.petMode() === 'follow'
    if (out && !this.petOut) {
      // Coming out to join you: from the front door on the grounds, else right behind you.
      if (this.mapId === 'grounds') {
        this.myPet.reset(HOME_DOOR.x + 1, HOME_DOOR.y + 1.4)
        // A happy hello as it trots out of the front door to find you.
        const kind = this.save.pet!.kind
        window.setTimeout(() => petSound(kind === 'dog' ? 'bark' : 'meow', 0.7), 600)
      } else this.myPet.reset(this.me.x, this.me.y)
      this.scheduleSync(50)
    }
    if (!out && this.petOut) this.scheduleSync(50)
    this.petOut = out
    if (out && !this.forest) {
      const alarm = this.petAlarm.get(this.login)
      if (alarm && alarm.until > this.time)
        // Warning at the treeline: it stops dead where it is, facing the trees, until it's done.
        this.myPet.hold(dt, alarm.dir)
      else if (this.seat) {
        const spot = this.feetSpot(this.seat.x, this.seat.y)
        this.myPet.settle(dt, spot.x, spot.y)
      } else if (
        this.mapId === 'grounds' &&
        toTreeline(this.myPet.x, this.myPet.y) < PET_HOLD &&
        toTreeline(this.me.x, this.me.y) < toTreeline(this.myPet.x, this.myPet.y)
      )
        // Right at the treeline it won't come any closer: it stands and faces the trees.
        this.myPet.hold(dt, facingEdge(this.myPet.x, this.myPet.y))
      else this.myPet.update(dt, this.me.x, this.me.y)
      if (this.mapId === 'grounds')
        this.petAtTreeline(this.login, this.myPet, this.save.pet!.kind, true)
      this.petOutFor += dt
      if (!this.giftChecked && this.petOutFor > 4) {
        this.giftChecked = true
        this.maybeGift()
      }
    }
    for (const [login, r] of this.others) {
      const pet = r.p.pet
      if (!pet || r.p.map !== this.mapId) {
        this.remotePets.delete(login)
        continue
      }
      let fl = this.remotePets.get(login)
      if (!fl) {
        fl = new Follower()
        fl.reset(r.rx, r.ry)
        this.remotePets.set(login, fl)
      }
      const alarm = this.petAlarm.get(login)
      if (alarm && alarm.until > this.time) fl.hold(dt, alarm.dir)
      else if (r.p.sit) {
        const spot = this.feetSpot(r.p.x, r.p.y)
        fl.settle(dt, spot.x, spot.y)
      } else fl.update(dt, r.rx, r.ry)
      if (this.mapId === 'grounds') this.petAtTreeline(login, fl, pet.kind, false)
    }
    for (const login of this.remotePets.keys())
      if (!this.others.has(login)) this.remotePets.delete(login)
    this.petFx = this.petFx.filter((f) => this.time - f.t0 < 1400)
  }

  /** Every pet on this map: yours, neighbours' out with them, and a room owner's asleep. */
  private visiblePets(): {
    look: PetLook
    mine: boolean
    owner: string
    x: number
    y: number
    pose: PetPose
    dir: Dir
    frame: number
  }[] {
    const out: ReturnType<Game['visiblePets']> = []
    const pet = this.save.pet
    const wag = Math.floor(this.time / 260) % 2
    const follower = (look: PetLook, owner: string, f: Follower, mine: boolean) => {
      // Growling or hissing at the treeline: standing, stiff, facing the trees.
      // Warning at the treeline: it's held still (updatePets), standing stiff and facing the trees.
      const alarm = this.petAlarm.get(owner)
      if (alarm && alarm.until > this.time && !f.moving) {
        out.push({ look, mine, owner, x: f.x, y: f.y, pose: 'walk', dir: alarm.dir, frame: 0 })
        return
      }
      const pose = f.pose()
      out.push({
        look,
        mine,
        owner,
        x: f.x,
        y: f.y,
        pose,
        dir: f.dir,
        frame: pose === 'walk' ? Math.floor(f.anim) % 4 : wag,
      })
    }
    if (pet && this.petOut && !this.forest) follower(pet, this.login, this.myPet, true)
    const cat = houseCat(this.gameNow(), gameHour(this.gameNow()))
    if (cat.map === this.mapId) out.push({ look: HOUSE_CAT, mine: false, owner: 'house', ...cat })
    for (const [login, f] of this.remotePets) {
      const look = this.others.get(login)?.p.pet
      if (look) follower(look, login, f, false)
    }
    const owner = this.ownerOf(this.mapId)
    if (owner) {
      const look = owner === this.login ? pet : this.profiles.get(owner)?.pet
      const away = owner !== this.login && !!this.others.get(owner)?.p.pet
      if (look && !away) {
        const spot = this.bedSpot(this.roomOf(owner))
        out.push({
          look,
          mine: owner === this.login,
          owner,
          ...spot,
          pose: 'sleep',
          dir: 0,
          frame: 0,
        })
      }
    }
    return out
  }

  private petAt(tx: number, ty: number) {
    if (this.decor.active) return null
    return (
      this.visiblePets().find(
        (p) => Math.abs(p.x - (tx + 0.5)) < 0.9 && Math.abs(p.y - 0.25 - (ty + 0.5)) < 0.9,
      ) ?? null
    )
  }

  /** The pet just in front of you, if any (pets don't sit neatly on tiles). */
  private petInFront() {
    if (this.decor.active) return null
    const [dx, dy] = [
      [0, 1],
      [-1, 0],
      [1, 0],
      [0, -1],
    ][this.me.dir]
    const fx = this.me.x + dx * 0.9
    const fy = this.me.y - 0.1 + dy * 0.9
    let best: ReturnType<Game['visiblePets']>[number] | null = null
    let bestD = 0.85
    for (const p of this.visiblePets()) {
      const d = Math.hypot(p.x - fx, p.y - 0.2 - fy)
      if (d < bestD) {
        best = p
        bestD = d
      }
    }
    return best
  }

  private petPrompt(p: ReturnType<Game['visiblePets']>[number]): string {
    const verb = p.pose === 'sleep' ? 'Stroke' : 'Pet'
    if (!p.mine) return `${verb} ${p.look.name}`
    const pet = this.save.pet!
    const treat = (this.save.inv.treat ?? 0) > 0 && pet.fedOn !== petDay(Date.now())
    return `${verb} ${pet.name}${treat ? ' · [F] Give a treat' : ''}`
  }

  /** Whether a pet is close enough to the treeline to be uneasy (the same distance it warns at). */
  private uneasy(x: number, y: number): boolean {
    if (this.mapId !== 'grounds') return false
    const near = gapDistance(x, y) < PET_GAP_NEAR
    return toTreeline(x, y) <= (near ? PET_WARN_GAP_EDGE : PET_WARN_EDGE)
  }

  private petPet(p: ReturnType<Game['visiblePets']>[number]) {
    const dog = p.look.kind === 'dog'
    // By the treeline it's too uneasy to enjoy it (FOREST.md "Your pet").
    if (p.owner !== 'house' && p.pose !== 'sleep' && this.uneasy(p.x, p.y)) {
      const name = p.mine ? this.save.pet!.name : p.look.name
      if (dog) petSound('whine', 0.6)
      return this.say(
        dog
          ? `${name} looks nervous... its ears are flat, and it won't take its eyes off the trees.`
          : `${name} looks nervous... its tail is puffed up, and it keeps staring at the trees.`,
      )
    }
    this.petFx.push({ x: p.x, y: p.y, t0: this.time })
    if (p.pose === 'sleep') petSound(dog ? 'pant' : 'purr', 0.5)
    else petSound(dog ? 'pant' : 'purr')
    if (p.owner === 'house')
      return this.say(
        p.pose === 'sleep'
          ? 'Mittens stretches in the sun and purrs. Prrrrt.'
          : 'Mittens winds round your ankles.',
      )
    if (!p.mine) {
      const name = p.look.name
      return this.say(
        p.pose === 'sleep'
          ? `${name} sighs happily in their sleep.`
          : dog
            ? `${name} wags at you.`
            : `${name} purrs and leans into your hand.`,
      )
    }
    const pet = this.save.pet!
    const today = petDay(Date.now())
    if (pet.pettedOn !== today) {
      pet.pettedOn = today
      pet.hearts = Math.min(HEARTS_MAX, pet.hearts + 1)
      this.markDirty()
      return this.say(`${pet.name} loves that! ${heartsText(pet.hearts, HEARTS_MAX)}`)
    }
    this.say(`${pet.name} ${dog ? 'wags happily' : 'purrs'}. ${heartsText(pet.hearts, HEARTS_MAX)}`)
  }

  /** F: give your pet a treat (one a day counts towards hearts). */
  feedPet() {
    const pet = this.save.pet
    if (!pet || this.ui.panelOpen() || this.ui.dialogueOpen()) return
    const mine = this.visiblePets().find((p) => p.mine)
    if (!mine) return this.say(`${pet.name} is curled up asleep at home.`)
    if (Math.hypot(mine.x - this.me.x, mine.y - this.me.y) > 2.5)
      return this.say(`Get a little closer to ${pet.name} first.`)
    // Begging: a whine from a dog, a meow from a cat.
    const beg = () => petSound(pet.kind === 'dog' ? 'whine' : 'meow')
    if ((this.save.inv.treat ?? 0) <= 0) {
      beg()
      return this.say(`You're out of treats. Chef Rosa sells them at the Kitchen.`)
    }
    const today = petDay(Date.now())
    if (pet.fedOn === today) {
      beg()
      return this.say(`${pet.name} has already had a treat today. Tomorrow!`)
    }
    this.save.inv.treat -= 1
    if (this.save.inv.treat <= 0) delete this.save.inv.treat
    pet.fedOn = today
    pet.hearts = Math.min(HEARTS_MAX, pet.hearts + 1)
    sfx('crunch')
    window.setTimeout(() => petSound(pet.kind === 'dog' ? 'bark' : 'meow'), 350)
    this.petFx.push({ x: mine.x, y: mine.y, t0: this.time })
    this.markDirty()
    this.ui.refresh()
    this.say(`${pet.name} gobbles it up! ${heartsText(pet.hearts, HEARTS_MAX)}`)
  }

  /** From GIFT_HEARTS hearts, once a day, your pet sometimes brings you something. */
  private maybeGift() {
    const pet = this.save.pet
    const today = petDay(Date.now())
    if (!pet || pet.hearts < GIFT_HEARTS || pet.giftOn === today) return
    pet.giftOn = today
    this.markDirty()
    const gift = pickGift(Math.random(), Math.random())
    if (!gift) return
    let what: string
    if ('coins' in gift) {
      this.save.coins += gift.coins
      what = `${gift.coins} coins`
    } else {
      const key = `seed:${gift.seed}`
      this.save.inv[key] = (this.save.inv[key] ?? 0) + gift.count
      what = `${gift.count} ${CROPS[gift.seed].name} seed${gift.count > 1 ? 's' : ''}`
    }
    petSound(pet.kind === 'dog' ? 'bark' : 'meow')
    this.petFx.push({ x: this.myPet.x, y: this.myPet.y, t0: this.time })
    this.ui.refresh()
    this.say(`${pet.name} ${pet.kind === 'dog' ? 'dug up' : 'brought you'} ${what}!`)
  }

  adoptPet(look: PetLook) {
    if (this.save.pet) return
    const pet = { ...look, adoptedAt: Date.now(), hearts: 0 }
    this.save.pet = pet
    // Its bed goes in your room, in the first free spot from the bottom right.
    let placed = false
    const items = this.save.room.items
    if (items.length < MAX_ROOM_ITEMS) {
      items.push({ k: 'petbed', x: -1, y: -1 })
      const i = items.length - 1
      for (let y = ROOM_FLOOR.y1; y >= ROOM_FLOOR.y0 && !placed; y--)
        for (let x = ROOM_FLOOR.x1; x >= ROOM_FLOOR.x0 && !placed; x--)
          if (this.canPlace(i, x, y)) {
            items[i].x = x
            items[i].y = y
            placed = true
          }
      if (this.ownerOf(this.mapId) === this.login) this.refreshRoom()
    }
    this.giftChecked = true
    this.markDirty()
    void this.flushSave()
    this.ui.refresh()
    petSound(pet.kind === 'dog' ? 'bark' : 'meow')
    const they = pet.kind === 'dog' ? 'He' : 'She'
    this.ui.dialogue(
      'Nurse Ada',
      [
        `${pet.name}! What a sweetheart. ${they}'ll follow you around the grounds, and curl up in ${pet.kind === 'dog' ? 'his' : 'her'} bed in your room${placed ? '. I put the bed in your room for you' : ' (the bed is in your storage, under Decorate)'}.`,
        `Give ${pet.name} a pat each day (face them and press E) and a treat (press F), and you'll be the best of friends. Chef Rosa sells treats at the Kitchen.`,
        `Pets get sleepy at night, so ${pet.name} will be tucked up at home after nine.`,
      ],
      { pitch: intro.ADA_VOICE, look: intro.INTRO_ADA.look, old: false },
    )
  }

  renamePet(name: string) {
    const pet = this.save.pet
    if (!pet || !name) return
    pet.name = name
    this.markDirty()
    this.scheduleSync(30)
    this.say(`Nurse Ada: ${name} it is! It suits them.`)
  }

  buyTreats() {
    if (this.save.coins < TREAT_PACK.price) {
      sfx('nope')
      return this.ui.toast(`You need ${TREAT_PACK.price - this.save.coins} more coins.`)
    }
    this.save.coins -= TREAT_PACK.price
    this.save.inv.treat = (this.save.inv.treat ?? 0) + TREAT_PACK.count
    sfx('coin')
    this.markDirty()
    this.ui.refresh()
  }

  private drawPet(p: ReturnType<Game['visiblePets']>[number], ox: number, oy: number) {
    const c = this.ctx
    const alarm = this.petAlarm.get(p.owner)
    const tense = !!alarm && alarm.until > this.time && p.pose === 'walk' && p.frame === 0
    // A tense little tremble while it growls.
    const shake = tense ? (Math.floor(this.time / 70) % 2 ? 1 : 0) : 0
    const px = Math.round(p.x * TS + ox) + shake
    const py = Math.round(p.y * TS + oy)
    c.fillStyle = 'rgba(0,0,0,0.18)'
    c.fillRect(px - 5, py - 1, 10, 2)
    c.drawImage(
      petSprite(p.look.kind, p.look.coat, p.pose, p.dir, p.frame),
      px - PET_W / 2,
      py - PET_H + 1,
    )
    if (tense) {
      // Hackles up: a ridge of raised fur along its back, ears flat (dark spikes over the sprite).
      c.fillStyle = 'rgba(30,24,20,0.85)'
      const top = py - PET_H + 6
      for (let i = -3; i <= 3; i += 2) c.fillRect(px + i, top - (i % 4 === 1 ? 2 : 1), 1, 2)
    }
    if (p.pose === 'sleep') {
      // Little z's drifting up.
      const t = (this.time / 1600) % 1
      c.fillStyle = `rgba(59,63,128,${0.9 * (1 - t)})`
      const zx = px + 4 + Math.round(t * 4)
      const zy = py - 14 - Math.round(t * 8)
      c.fillRect(zx, zy, 3, 1)
      c.fillRect(zx + 1, zy + 1, 1, 1)
      c.fillRect(zx, zy + 2, 3, 1)
    }
  }

  private drawPetFx(ox: number, oy: number) {
    const c = this.ctx
    for (const fx of this.petFx) {
      const age = (this.time - fx.t0) / 1400
      for (let i = 0; i < 3; i++) {
        const a = Math.max(0, Math.min(1, (age - i * 0.12) * 1.6))
        if (a <= 0 || a >= 1) continue
        const hx = Math.round(fx.x * TS + ox + (i - 1) * 5 + Math.sin(age * 8 + i) * 2)
        const hy = Math.round(fx.y * TS + oy - 16 - a * 12)
        c.globalAlpha = 1 - a
        c.fillStyle = '#e8475b'
        c.fillRect(hx, hy, 2, 2)
        c.fillRect(hx + 3, hy, 2, 2)
        c.fillRect(hx, hy + 1, 5, 2)
        c.fillRect(hx + 1, hy + 3, 3, 1)
        c.fillRect(hx + 2, hy + 4, 1, 1)
        c.fillStyle = '#ffb3be'
        c.fillRect(hx, hy, 1, 1)
        c.globalAlpha = 1
      }
    }
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
    } else if (!tile.c && (this.save.inv[`plant:${this.selectedSeed}`] ?? 0) > 0) {
      // A potted plant you dug up goes in before seeds: it's already established.
      const key = `plant:${this.selectedSeed}`
      this.save.inv[key] -= 1
      if (!this.save.inv[key]) delete this.save.inv[key]
      garden.transplant(tile, this.selectedSeed, now)
      if (garden.isWet(tile, now)) garden.settle(tile, now)
      sfx('plant')
      this.introEvent('plant')
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
      this.introEvent('plant')
    } else if (garden.stage(tile, now) === 3) {
      const got = garden.harvest(tile, now)
      if (!got) return
      const key = `crop:${got.crop}`
      this.save.inv[key] = (this.save.inv[key] ?? 0) + got.count
      this.save.stats.harvested += got.count
      sfx('harvest')
      this.ui.toast(`+${got.count} ${plural(CROPS[got.crop].name, got.count)}`)
    } else if (!garden.isWet(tile, now)) {
      garden.water(tile, now)
      sfx('water')
    } else {
      return this.say(`Growing nicely. About ${fmt(garden.timeLeft(tile, now))} to go.`)
    }
    this.markDirty()
    this.ui.refresh()
  }

  /** Asked to confirm pulling up an unripe crop: the tile, until when. */
  private digArm: { i: number; until: number } | null = null

  private digFacing() {
    if (this.decor.active || this.seat || this.ui.panelOpen() || this.ui.dialogueOpen()) return
    const t = this.facingTile()
    const p = this.plotTile(t.x, t.y)
    if (p && p.i !== null) this.dig(p.slot, p.i)
  }

  /**
   * Digs up what's growing in tile i of your plot: seeds come back, strawberry and tomato plants
   * come up potted (to sell to Chef Rosa or replant), anything else unripe needs a second X.
   */
  dig(slot: number, i: number) {
    if (slot !== this.slot) return this.say("That's not your plot to dig up!")
    const tile = this.save.garden[i]
    if (!tile?.c) return this.say(tile?.s ? 'Nothing is growing here yet.' : 'Just grass here.')
    const now = Date.now()
    const name = CROPS[tile.c].name
    if (garden.digLoses(tile, now)) {
      const armed = this.digArm && this.digArm.i === i && Date.now() < this.digArm.until
      if (!armed) {
        this.digArm = { i, until: Date.now() + 4000 }
        sfx('nope')
        return this.say(`Press X again to pull up the ${name}. It isn't ripe, so it would be lost.`)
      }
    }
    this.digArm = null
    const got = garden.digUp(tile, now)
    if (!got) return
    const add = (key: string, n: number) => (this.save.inv[key] = (this.save.inv[key] ?? 0) + n)
    const said: string[] = []
    if (got.fruit) {
      add(`crop:${got.fruit.crop}`, got.fruit.count)
      this.save.stats.harvested += got.fruit.count
      said.push(`+${got.fruit.count} ${plural(name, got.fruit.count)}`)
    }
    if (got.seed) {
      add(`seed:${got.seed}`, 1)
      said.push(`The ${name} seed goes back in its packet.`)
    }
    if (got.plant) {
      add(`plant:${got.plant}`, 1)
      said.push(
        `You pot up the ${name} plant. Chef Rosa buys potted plants, or plant it somewhere else.`,
      )
    }
    if (got.lost) said.push(`You pull up the ${name}. Into the compost it goes.`)
    sfx('till')
    this.say(said.join(' '))
    this.markDirty()
    this.ui.refresh()
  }

  /** The next plot size you could buy, if any. */
  nextPlot(): PlotSize | null {
    return PLOT_SIZES[(this.save.plot ?? 0) + 1] ?? null
  }

  /** Buys the next plot size: your plot grows to the right and down, keeping what's planted. */
  buyPlot(): boolean {
    const next = this.nextPlot()
    if (!next || this.slot < 0 || this.save.coins < next.price) return false
    const from = this.save.plot ?? 0
    this.save.coins -= next.price
    this.save.garden = growGarden(this.save.garden, from, from + 1)
    this.save.plot = from + 1
    sfx('coin')
    this.markDirty()
    void this.flushSave()
    this.ui.refresh()
    return true
  }

  sellPlants(crop: string, count: number) {
    const key = `plant:${crop}`
    const have = this.save.inv[key] ?? 0
    const n = Math.min(have, count)
    if (n <= 0) return
    const earned = n * plantPrice(crop)
    this.save.inv[key] = have - n
    if (this.save.inv[key] === 0) delete this.save.inv[key]
    this.save.coins += earned
    this.save.stats.earned += earned
    sfx('coin')
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
    const { w, h } = this.plotSizeOf(this.slot)
    return (
      this.me.x > o.x - 2 &&
      this.me.x < o.x + w + 2 &&
      this.me.y > o.y - 1.5 &&
      this.me.y < o.y + h + 2
    )
  }

  // --- room decorating ------------------------------------------------------------------------

  /** The piece of furniture at (x, y). `reach`: facing the wall reaches pictures hung above. */
  private furnitureAt(
    x: number,
    y: number,
    includeFlat: boolean,
    reach = false,
  ): RoomItem | undefined {
    const owner = this.ownerOf(this.mapId)
    const room = owner ? this.roomOf(owner) : null
    if (!room) return undefined
    const hits = room.items.filter((it) => {
      const d = FURNITURE[it.k]
      if (!d || it.x < 0 || x < it.x || x >= it.x + d.w) return false
      // Facing the wall reaches anything hung above you in that column, not only the bottom row.
      if (reach && d.wall && y >= ROOM_WALL.y0 && y <= ROOM_WALL.y1) return y >= it.y
      return y >= it.y && y < it.y + d.h
    })
    // The lowest (nearest) piece on the wall first.
    hits.sort((a, b) => b.y - a.y)
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
    // Nothing hangs over the closet door or the key hook, or stands right in front of them.
    if (!def.flat && x <= CLOSET.x && x + def.w > CLOSET.x) {
      if (def.wall && y < CLOSET.y + CLOSET.h && y + def.h > CLOSET.y) return false
      if (!def.wall && y <= CLOSET.y + CLOSET.h && y + def.h > CLOSET.y + CLOSET.h) return false
    }
    if (!def.flat && x <= KEY_HOOK.x && x + def.w > KEY_HOOK.x) {
      if (def.wall && y <= KEY_HOOK.y && y + def.h > KEY_HOOK.y) return false
      if (!def.wall && y <= KEY_HOOK.y + 1 && y + def.h > KEY_HOOK.y + 1) return false
    }
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
    this.introEvent('buy')
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
    this.introEvent('sell')
    this.ui.refresh()
  }

  // --- cooking --------------------------------------------------------------------------------

  knows(recipe: string): boolean {
    return knowsRecipe(this.save.recipes, recipe)
  }

  /** Chef Rosa teaches you a recipe, for its lesson fee. */
  learnRecipe(recipe: string) {
    const r = RECIPES[recipe]
    if (!r || this.knows(recipe)) return
    if (this.save.coins < r.lesson) {
      sfx('nope')
      return this.ui.toast(`You need ${r.lesson - this.save.coins} more coins for that lesson.`)
    }
    this.save.coins -= r.lesson
    this.save.recipes = [...(this.save.recipes ?? []), recipe]
    sfx('coin')
    this.markDirty()
    this.ui.toast(`Chef Rosa shows you how to make ${r.name.toLowerCase()}.`)
    this.ui.refresh()
  }

  /** Cooks `count` of a recipe you know from what's in your basket. Returns how many were made. */
  cook(recipe: string, count: number): number {
    const r = RECIPES[recipe]
    if (!r || !this.knows(recipe)) return 0
    const n = Math.min(count, cookable(this.save.inv, recipe))
    if (n <= 0) {
      sfx('nope')
      this.ui.toast(`You don't have everything for ${r.name.toLowerCase()}.`)
      return 0
    }
    const inv = this.save.inv
    for (const [k, need] of Object.entries(r.ingredients)) {
      inv[k] -= need * n
      if (inv[k] <= 0) delete inv[k]
    }
    inv[`meal:${recipe}`] = (inv[`meal:${recipe}`] ?? 0) + n
    sfx('sizzle')
    this.markDirty()
    this.ui.toast(
      n > 1 ? `You cook ${n} × ${r.name.toLowerCase()}.` : `You cook ${r.name.toLowerCase()}.`,
    )
    this.ui.refresh()
    return n
  }

  sellMeal(recipe: string, count: number) {
    const key = `meal:${recipe}`
    const have = this.save.inv[key] ?? 0
    const n = Math.min(have, count)
    if (n <= 0) return
    const earned = n * RECIPES[recipe].sellPrice
    this.save.inv[key] = have - n
    if (!this.save.inv[key]) delete this.save.inv[key]
    this.save.coins += earned
    this.save.stats.earned += earned
    sfx('coin')
    this.markDirty()
    this.introEvent('sell')
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

  // --- your family photo (FOREST.md "Your family") ----------------------------------------------

  /** Sets who's in your family photo (keeping where the photo is), and makes sure it's hung. */
  setFamily(members: Relative[]) {
    this.save.family = { ...this.save.family, members }
    this.ensurePhotoInRoom()
    this.markDirty()
    this.refreshRoom()
    this.ui.refresh()
  }

  // --- your corkboard (STORY.md "Board, failure and persistence") -----------------------------

  /** Your corkboard goes up the first time you bring something home (on a free bit of wall). */
  private ensureBoardInRoom() {
    const items = this.save.room.items
    if (items.some((i) => i.k === 'corkboard')) return
    if (items.length >= MAX_ROOM_ITEMS) return
    items.push({ k: 'corkboard', x: -1, y: -1 })
    const i = items.length - 1
    // Somewhere you can stand in front of it (nothing on the floor below), if there's room.
    const reachable = (x: number) =>
      [x, x + 1].some(
        (fx) =>
          !items.some((o) => {
            const d = FURNITURE[o.k]
            return (
              o.x >= 0 && !d.wall && !d.flat && fx >= o.x && fx < o.x + d.w && o.y <= ROOM_FLOOR.y0
            )
          }),
      )
    for (const need of [true, false])
      for (let y = ROOM_WALL.y0; y <= ROOM_WALL.y1; y++)
        for (let x = ROOM_WALL.x0; x <= ROOM_WALL.x1; x++)
          if ((!need || reachable(x)) && this.canPlace(i, x, y)) {
            items[i] = { k: 'corkboard', x, y }
            return
          }
  }

  /** Older rooms: anything hung where the closet door or the key hook now is goes into storage. */
  private clearCloset() {
    for (const it of this.save.room.items) {
      const def = FURNITURE[it.k]
      if (!def?.wall || it.x < 0) continue
      const over = (x: number, y0: number, y1: number) =>
        it.x <= x && it.x + def.w > x && it.y <= y1 && it.y + def.h > y0
      if (
        over(CLOSET.x, CLOSET.y, CLOSET.y + CLOSET.h - 1) ||
        over(KEY_HOOK.x, KEY_HOOK.y, KEY_HOOK.y)
      ) {
        it.x = -1
        it.y = -1
      }
    }
  }

  /**
   * Home safe: this trip's notepad goes on your board (STORY.md: "Notes obtained in a forest trip
   * are unbanked until the player reaches real Sunset Acres").
   */
  private bank(found: Map<ClueId, { note: string }>, kept: Set<string> = new Set()) {
    // Keepsakes: into your room's storage, to hang where you like.
    const keepsakes = [...kept].filter(
      (id) => !this.save.room.items.some((i) => i.k === `keep_${id}`),
    )
    for (const id of keepsakes)
      if (this.save.room.items.length < MAX_ROOM_ITEMS)
        this.save.room.items.push({ k: `keep_${id}`, x: -1, y: -1 })
    if (keepsakes.length) {
      this.markDirty()
      window.setTimeout(
        () =>
          this.say(
            keepsakes.length === 1
              ? `You brought home ${KEEPSAKES[keepsakes[0]].name.toLowerCase()}. It's in your room's storage (Decorate).`
              : `You brought home ${keepsakes.length} keepsakes. They're in your room's storage (Decorate).`,
          ),
        2600,
      )
    }
    const board = this.save.board ?? { clues: [] }
    const fresh = [...found].filter(([id]) => !board.clues.some((c) => c.id === id))
    if (!fresh.length) return
    for (const [id, f] of fresh) {
      const n = board.clues.length
      // Pinned in loose rows, each a little askew of the last.
      const x = 14 + (n % 5) * 18 + ((n * 37) % 7) - 3
      const y = 18 + (Math.floor(n / 5) % 3) * 30 + ((n * 53) % 9) - 4
      const note = cleanText(f.note, NOTE_MAX)
      board.clues.push({
        id,
        ...(note ? { note } : {}),
        x: Math.max(4, Math.min(96, x)),
        y: Math.max(5, Math.min(95, y)),
        at: Date.now(),
      })
    }
    this.save.board = board
    this.ensureBoardInRoom()
    this.markDirty()
    this.refreshRoom()
    window.setTimeout(() => {
      this.say(
        fresh.length === 1
          ? 'You remember what you found. It’s on the corkboard in your room.'
          : `You remember what you found: ${fresh.length} things, on the corkboard in your room.`,
      )
      this.ui.thought(voiceFor('banked'))
    }, 1400)
  }

  moveClue(id: ClueId, x: number, y: number) {
    const c = this.save.board?.clues.find((b) => b.id === id)
    if (!c) return
    c.x = Math.round(Math.max(0, Math.min(BOARD_SIZE, x)) * 10) / 10
    c.y = Math.round(Math.max(0, Math.min(BOARD_SIZE, y)) * 10) / 10
    this.markDirty()
  }

  setBoardNote(id: ClueId, text: string) {
    const c = this.save.board?.clues.find((b) => b.id === id)
    if (!c) return
    const note = cleanText(text, NOTE_MAX)
    if (note) c.note = note
    else delete c.note
    this.markDirty()
  }

  /** Ties a string between two pinned clues, or cuts the one that's there. */
  toggleLink(a: ClueId, b: ClueId) {
    const board = this.save.board
    if (!board || a === b) return
    const links = board.links ?? []
    const i = links.findIndex(([p, q]) => (p === a && q === b) || (p === b && q === a))
    if (i >= 0) links.splice(i, 1)
    else if (links.length < BOARD_LINKS_MAX) links.push([a, b])
    if (links.length) board.links = links
    else delete board.links
    this.markDirty()
  }

  /** Every room has the family photo: older rooms get one on a free bit of wall (or in storage). */
  private ensurePhotoInRoom() {
    const items = this.save.room.items
    if (items.some((i) => i.k === 'familyphoto')) return
    if (items.length >= MAX_ROOM_ITEMS) return
    items.push({ k: 'familyphoto', x: -1, y: -1 })
    const i = items.length - 1
    for (let y = ROOM_WALL.y0; y <= ROOM_WALL.y1; y++)
      for (let x = ROOM_WALL.x0; x <= ROOM_WALL.x1; x++)
        if (this.canPlace(i, x, y)) {
          items[i] = { k: 'familyphoto', x, y }
          return
        }
  }

  /** Whose faces are in `owner`'s photo frame right now (null: the frame is empty). */
  private photoLooks(owner: string): Look[] | null {
    if (owner === this.login)
      return photoOnWall(this.save) ? this.save.family!.members.map((m) => m.look) : null
    return this.profiles.get(owner)?.family?.map((m) => m.look) ?? null
  }

  /** Whether you're facing your family photo (in your own room). */
  facingPhoto(): boolean {
    const t = this.facingTile()
    return this.inOwnRoom() && this.furnitureAt(t.x, t.y, false, true)?.k === 'familyphoto'
  }

  private lookAtPhoto() {
    sfx('blip')
    const owner = this.ownerOf(this.mapId)
    if (owner && owner !== this.login) {
      const fam = this.profiles.get(owner)?.family
      const name = this.profiles.get(owner)?.look.name ?? owner
      if (!fam) return this.say(`${name}'s photo frame is empty.`)
      const who = fam.map((m) => `${m.look.name} (${REL[m.rel].name})`).join(', ')
      return this.say(`${name}'s family: ${who}.`)
    }
    if (!this.save.family)
      return this.ui.openFamilyEditor({
        intro: 'An empty frame, waiting for a photo. Who should be in it?',
      })
    this.ui.openPhoto()
  }

  /** Takes the photo off your wall into your pocket. */
  takePhoto(): boolean {
    if (photoWhere(this.save) !== 'wall') return false
    const pocket = (this.save.pocket ??= [])
    if (pocket.length >= POCKET_SLOTS) {
      this.say('Your pocket is full.')
      return false
    }
    pocket.push('photo')
    this.say('You take the photo off the wall and tuck it in your pocket.')
    this.photoChanged()
    return true
  }

  /** Hangs the photo from your pocket back on the wall. */
  hangPhoto() {
    if (photoWhere(this.save) !== 'pocket') return
    this.save.pocket = this.save.pocket!.filter((p) => p !== 'photo')
    if (!this.save.pocket.length) delete this.save.pocket
    this.say('You hang the photo back on the wall.')
    this.photoChanged()
  }

  /**
   * The photo is lost in the forest: out of your pocket, and the frame stays empty until it's
   * found or reprinted. (Being caught does this from stage 3; `window.game.losePhoto()` in dev.)
   */
  losePhoto() {
    if (!this.save.family) return
    if (this.save.pocket) {
      this.save.pocket = this.save.pocket.filter((p) => p !== 'photo')
      if (!this.save.pocket.length) delete this.save.pocket
    }
    this.save.family.lost = true
    delete this.save.family.reprintAt
    this.photoChanged()
  }

  /** Nurse Ada reprints the photo: `pay` for it straight away, or free after REPRINT_WAIT_MS. */
  orderReprint(pay: boolean): boolean {
    const fam = this.save.family
    if (!fam?.lost || fam.reprintAt) return false
    if (pay) {
      if (this.save.coins < REPRINT_COST) return false
      this.save.coins -= REPRINT_COST
      sfx('coin')
      fam.reprintAt = Date.now()
    } else fam.reprintAt = Date.now() + REPRINT_WAIT_MS
    this.markDirty()
    this.checkReprint()
    this.ui.refresh()
    return true
  }

  /** A reprint that's ready goes up on your wall. */
  private checkReprint() {
    const fam = this.save.family
    if (!fam?.lost || !fam.reprintAt || Date.now() < fam.reprintAt) return
    delete fam.lost
    delete fam.reprintAt
    this.say('Nurse Ada has hung a new copy of your family photo on your wall.')
    this.photoChanged()
  }

  private photoChanged() {
    this.markDirty()
    this.ui.refresh()
    this.scheduleSync(30)
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
    this.checkReprint()
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
    if (this.forest) return
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
        // In the forest nobody can see you: no position, no pet, nothing (FOREST.md).
        p: this.forest
          ? { map: 'forest', x: 0, y: 0, dir: 0, moving: false }
          : {
              map: this.mapId,
              x: round2(this.me.x),
              y: round2(this.me.y),
              dir: this.me.dir,
              moving: this.me.moving,
              ...(this.petOut && this.save.pet ? { pet: petLook(this.save.pet) } : {}),
              ...(this.seat ? { sit: this.seat.id, sitAt: this.seatAt } : {}),
            },
        look: this.save.look,
        msg: msg ?? undefined,
        since: this.chatSince,
      })
      this.serverSkew = res.now - Date.now()
      if (res.seatTaken && this.seat) {
        this.standUp()
        this.ui.toast('Someone sat down there just before you. There are other seats!')
      }
      if (msg && !res.sent) this.ui.toast('Slow down a little, dear. Try again in a moment.')
      this.applyPlayers(res.players)
      this.applyChat(res.chat)
      if (res.tables) this.applyTables(res.tables)
      this.ui.renderTable()
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
    // You can't hear anyone from the forest: what's said while you're there never reaches you.
    if (this.forest) {
      for (const m of msgs) this.chatSince = Math.max(this.chatSince, m.id)
      return
    }
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
    const gap = t - this.last
    const dt = Math.min(0.05, gap / 1000)
    this.last = t
    this.time = t
    perf?.begin(gap)
    perf?.mark('update')
    if (!this.stopped) this.update(dt)
    this.render()
    perf?.end()
    requestAnimationFrame((nt) => this.frame(nt))
  }

  // --- warming caches -------------------------------------------------------------------------
  //
  // Sprites are drawn once and cached the first time they're needed. Doing that mid-walk is a
  // visible hitch (the grounds take a few hundred ms), so it happens up front: a place's ground,
  // objects, crops and soil when you arrive (under the fade), and people's sprites when they
  // first appear (in idle time).

  private warmed = new Set<string>()
  private scratch = document.createElement('canvas').getContext('2d')!

  private warm(m: GameMap) {
    this.groundFor(m)
    if (this.warmed.has(m.id)) return
    this.warmed.add(m.id)
    const c = this.scratch
    const fenceAt = (x: number, y: number) => this.fences.has(`${x},${y}`)
    for (const o of m.objects) drawObject(c, o, -64, -64, 0, fenceAt)
    for (const n of m.npcs) this.warmLook(n.look)
    if (m.id !== 'grounds') return
    for (const crop of Object.keys(CROPS))
      for (let st = 0; st < 4; st++)
        for (const time of [0, 700 * 1.6, 700 * 4.7]) drawCrop(c, crop, st, -64, -64, time, 0)
    for (const wet of [false, true])
      for (let v = 0; v < 16; v++) drawSoil(c, -64, -64, wet, v, v * 3)
    for (let lv = 0; lv < PLOT_SIZES.length; lv++) {
      const { w, h } = plotSize(lv)
      plotFrame(w, h, true)
      plotFrame(w, h, false)
    }
    glowSprite(24, [255, 170, 80])
    glowSprite(34, [255, 214, 140])
  }

  /** Someone's sprites (every direction and step, sitting, dozing), built in idle time. */
  private warmLook(look: Look) {
    const key = JSON.stringify(look)
    if (this.warmed.has(key)) return
    this.warmed.add(key)
    const build = () => {
      for (const dir of [0, 1, 2, 3] as Dir[])
        for (let f = 0; f < 4; f++) personSprite(look, dir, f)
      for (const doze of [false, true])
        for (const d of [0, 1, 2] as Dir[]) seatedSprite(look, doze, d)
    }
    if ('requestIdleCallback' in window) requestIdleCallback(build, { timeout: 2000 })
    else setTimeout(build, 0)
  }

  /** Your look, Ada's, and every pet, at the start. */
  private warmLooks() {
    this.warmLook(this.save.look)
    this.warmLook(intro.INTRO_ADA.look)
    const pets = () => {
      for (const kind of PET_KINDS)
        for (let coat = 0; coat < PET_COATS[kind].length; coat++)
          for (const pose of ['walk', 'sit', 'sleep'] as PetPose[])
            for (const dir of [0, 1, 2, 3] as Dir[])
              for (let f = 0; f < 4; f++) petSprite(kind, coat, pose, dir, f)
    }
    if ('requestIdleCallback' in window) requestIdleCallback(pets, { timeout: 3000 })
    else setTimeout(pets, 0)
  }

  private render() {
    if (this.forest) return this.renderForest(this.forest)
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

    perf?.mark('ground')
    c.fillStyle = m.outdoor ? '#3f7d32' : '#231c26'
    c.fillRect(0, 0, this.vw, this.vh)
    c.drawImage(this.groundFor(m), ox, oy)
    perf?.mark('objects')

    const x0 = Math.floor(this.cam.x / TS) - 3
    const y0 = Math.floor(this.cam.y / TS) - 3
    const x1 = Math.ceil((this.cam.x + this.vw) / TS) + 3
    const y1 = Math.ceil((this.cam.y + this.vh) / TS) + 4
    const visible = (x: number, y: number, w = 1, h = 1) =>
      x + w >= x0 && x <= x1 && y + h >= y0 && y <= y1
    if (m.outdoor) drawWaterGlints(c, m, x0, y0, x1, y1, this.time)

    const fenceAt = (x: number, y: number) => this.fences.has(`${x},${y}`)
    const list: Drawable[] = []
    // Only the rows near the view (the grounds have hundreds of treeline trees).
    const rows = this.objectRows(m)
    const r0 = Math.max(0, y0 - MAX_OBJ_H)
    const r1 = Math.min(rows.length - 1, y1)
    for (let row = r0; row <= r1; row++)
      for (const o of rows[row]) {
        if (!visible(o.x, o.y, o.w ?? 1, o.h ?? 1)) continue
        const px = o.x * TS + ox
        const py = o.y * TS + oy
        if (FLAT_KINDS.has(o.k)) {
          drawObject(c, o, px, py, this.time, fenceAt)
          continue
        }
        const base =
          o.k === 'home' || o.k === 'kitchen' ? (o.y + (o.h ?? 1)) * TS : (o.y + 1) * TS - 1
        const seeThrough = TALL_KINDS.has(o.k) && this.behindTree(o.x, o.y)
        list.push({
          y: base,
          draw: () => {
            // Trees fade when you walk behind them, so you're never lost under a canopy.
            if (seeThrough) c.globalAlpha = 0.45
            drawObject(c, o, px, py, this.time, fenceAt)
            c.globalAlpha = 1
            if (o.k === 'gametable') this.drawTableTop(`table:${o.x},${o.y}`, px, py)
          },
        })
      }

    if (m.id === 'grounds') {
      perf?.mark('garden')
      this.collectGarden(list, ox, oy, visible)
      perf?.mark('animals')
      const now = this.gameNow()
      this.wild.collect(list, c, ox, oy, now, gameHour(now), eggsLeft(this.save, now))
    }
    const owner = this.ownerOf(m.id)
    if (owner) this.collectRoom(list, owner, ox, oy)
    if (m.id === 'hall') this.drawHallPlates(ox, oy)

    for (const n of this.npcs()) list.push({ y: n.y * TS, draw: () => this.drawNpc(n, ox, oy) })
    for (const p of this.visiblePets())
      // A pet asleep in its bed is drawn after (on top of) the bed. Everyone else, Mittens napping
      // out on the grounds included, sorts by where their feet are, so you can stand in front.
      list.push({
        y:
          p.pose === 'sleep' && p.owner !== 'house'
            ? (Math.floor(p.y) + 1) * TS + 1
            : p.y * TS - 0.5,
        draw: () => this.drawPet(p, ox, oy),
      })
    for (const r of this.others.values()) {
      if (r.p.map !== m.id) continue
      if (r.p.sit) {
        const doze = this.dozing(r.p.sitAt, Date.now(), r.p.sit)
        list.push({
          y: r.ry * TS + 6,
          draw: () => this.drawSeated(r.p.look, r.rx, r.ry, doze, ox, oy, r.p.dir),
        })
        continue
      }
      list.push({
        y: r.ry * TS,
        draw: () => this.drawPerson(r.p.look, r.rx, r.ry, r.p.dir, r.anim, ox, oy),
      })
    }
    if (this.seat) {
      const doze = this.seatedFor > 30 && !tableOfSeat(this.seat.id)
      list.push({
        y: this.me.y * TS + 6,
        draw: () =>
          this.drawSeated(this.save.look, this.me.x, this.me.y, doze, ox, oy, this.me.dir),
      })
    } else
      list.push({
        y: this.me.y * TS,
        draw: () =>
          this.drawPerson(this.save.look, this.me.x, this.me.y, this.me.dir, this.me.anim, ox, oy),
      })

    perf?.mark('people')
    list.sort((a, b) => a.y - b.y)
    perf?.mark('draw')
    for (const d of list) d.draw()
    this.drawPetFx(ox, oy)

    if (this.decor.active) this.drawDecorGhost(ox, oy)
    if (!this.decor.active && !this.ui.panelOpen() && !this.ui.dialogueOpen())
      this.drawFacingCursor(ox, oy)
    perf?.mark('light')
    if (m.outdoor) this.drawDaylight(ox, oy)
    this.drawIntroArrow(ox, oy)
    if (this.fade > 0) {
      c.fillStyle = `rgba(20,16,28,${this.fade})`
      c.fillRect(0, 0, this.vw, this.vh)
    }
    perf?.mark('present')
    const v = this.vctx
    // The colour grade drains as you walk out across the outskirts (FOREST.md).
    if (this.canvasFilter)
      v.filter =
        m.id === 'grounds' ? outskirtsGrade(outskirts(this.me.x, this.me.y)) : MOODS.property
    v.drawImage(this.scene, 0, 0)
    if (this.canvasFilter) v.filter = 'none'
    perf?.mark('overlay')
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
      if (!visible(o.x - 1, o.y - 1, PLOT_MAX.w + 2, PLOT_MAX.h + 2)) continue
      const tiles = s === this.slot ? this.save.garden : this.profileInSlot(s)?.garden
      const mine = s === this.slot
      const { w, h } = this.plotSizeOf(s)
      // Your allotment's full extent is marked with stakes and string while there's room to grow.
      if (mine && (w < PLOT_MAX.w || h < PLOT_MAX.h))
        drawStakes(c, o.x * TS + ox, o.y * TS + oy, PLOT_MAX.w, PLOT_MAX.h)
      // A raised wooden bed round the plot, with brass caps on your own.
      c.drawImage(plotFrame(w, h, mine), o.x * TS + ox - 4, o.y * TS + oy - 4)
      if (!tiles || tiles.length !== w * h) continue
      tiles.forEach((tile, i) => {
        const tx = o.x + (i % w)
        const ty = o.y + Math.floor(i / w)
        const px = tx * TS + ox
        const py = ty * TS + oy
        if (tile.s === 1) drawSoil(c, px, py, garden.isWet(tile, now), tx, ty)
        if (tile.c) {
          const st = garden.stage(tile, now)
          const crop = tile.c
          list.push({
            y: (ty + 1) * TS - 2,
            draw: () => drawCrop(c, crop, st, px, py, this.time, tx),
          })
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
      if (it.k === 'familyphoto') c.drawImage(familyPhotoSprite(this.photoLooks(owner)), px, py)
      else if (def.flat || def.wall) drawFurniture(c, it.k, px, py, this.time)
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
      !!this.interactAt(t.x, t.y) || (this.plotTile(t.x, t.y)?.slot === this.slot && this.slot >= 0)
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
    // Multiply rather than paint over, so colours stay rich: warm at dusk/dawn, deep blue at night.
    c.globalCompositeOperation = 'multiply'
    c.fillStyle = nightTint(dark / NIGHT)
    c.fillRect(0, 0, this.vw, this.vh)
    c.globalCompositeOperation = 'source-over'
    if (dark < 0.2) return
    // Lit windows: the home is warm and awake after dark.
    const k = Math.min(1, dark / NIGHT)
    const panes: { x: number; y: number; w: number; h: number }[] = []
    for (const o of this.map.objects)
      for (const w of buildingWindows(o))
        panes.push({ x: o.x * TS + ox + w.x, y: o.y * TS + oy + w.y, w: w.w, h: w.h })
    for (const p of panes) {
      c.fillStyle = `rgba(255,196,104,${0.9 * k})`
      c.fillRect(p.x, p.y, p.w, p.h)
      c.fillStyle = `rgba(255,236,170,${0.8 * k})`
      c.fillRect(p.x + 1, p.y + 1, 5, 3)
      c.fillStyle = `rgba(120,70,40,${0.9 * k})`
      c.fillRect(p.x + 7, p.y, 2, p.h)
      c.fillRect(p.x, p.y + 7, p.w, 2)
    }
    c.globalCompositeOperation = 'lighter'
    if (this.mapId === 'grounds') this.wild.glow(c, ox, oy, this.gameNow(), k)
    // Glows are cached sprites at full strength, faded with globalAlpha (no gradients per frame).
    const windowGlow = glowSprite(24, [255, 170, 80])
    c.globalAlpha = 0.35 * k
    for (const p of panes)
      c.drawImage(windowGlow, Math.round(p.x + p.w / 2 - 24), Math.round(p.y + p.h / 2 - 24))
    const lampGlow = glowSprite(34, [255, 214, 140])
    c.globalAlpha = Math.min(1, dark * 0.9)
    for (const o of this.map.objects) {
      if (o.k !== 'lamp') continue
      c.drawImage(lampGlow, o.x * TS + 8 + ox - 34, o.y * TS + LAMP_LIGHT_Y + oy - 34)
    }
    c.globalAlpha = 1
    c.globalCompositeOperation = 'source-over'
  }

  // --- the forest (FOREST.md) --------------------------------------------------------------

  /** Walking out through a gap in the treeline takes you into the forest. Nothing marks it. */
  private checkTreeline() {
    if (this.fade > 0.3 || this.seat) return
    const g = gapAt(Math.floor(this.me.x), Math.floor(this.me.y - 0.1))
    if (!g || toTreeline(this.me.x, this.me.y) >= -(TREELINE - 0.8)) return
    if (this.save.family) return this.enterForest(g)
    // Characters from before families existed set theirs up now, on the way in (stage 2). Step
    // back out of the gap first, so closing the panel doesn't leave you in it.
    const back = gapReturn(g)
    this.me.x = back.x
    this.me.y = back.y
    this.ui.openFamilyEditor({
      intro:
        "Pushing through the branches, you find yourself thinking of home, and the photo on your wall. Who's in it?",
      confirm: 'Go on',
      then: () => this.enterForest(g),
    })
  }

  /** The recorded growl or hiss playing at the treeline, so crossing over can cut it off. */
  private warningClip: GainNode | undefined

  /**
   * Keys held as you came through a gap: ignored until they're let go, so you stop at the
   * trailhead facing up the road instead of walking straight off it (or back into the treeline).
   */
  private heldThrough = new Set<string>()

  private enterForest(gap: Gap) {
    for (const k of this.keys) this.heldThrough.add(k)
    this.keys.clear()
    // Nothing from the grounds follows you in, not even your pet's growl.
    hushWarnings()
    const ac = this.warningClip?.context
    if (ac) this.warningClip!.gain.setTargetAtTime(0, ac.currentTime, 0.08)
    this.warningClip = undefined
    // Every gap opens onto the same map (story/map.ts), with the forest to the north.
    const f = new Forest(Math.floor(Math.random() * 2 ** 30), 'n')
    const s = f.start()
    // Build the first few chunks and every sprite now, under the fade, not mid-step.
    warmForest()
    warmRide()
    warmFace()
    warmThing()
    for (const ch of f.chunksIn(s.x - 24, s.y - 16, s.x + 24, s.y + 16)) chunkGround(ch)
    this.warp('forest', s.x, s.y, s.dir, true, false)
    this.forest = f
    // What you opened on an earlier trip and got home from stays open: the service gate (P05),
    // Bell's locker (P02), the shed's shutter (P03).
    const solvedBefore = this.save.story?.puzzles ?? []
    for (const [p, c] of Object.entries(COMBOS))
      if (solvedBefore.includes(p as ComboId)) f.open(c.prop)
    // Nora's camp, once she's gone up the deep road (E_NORA_MEET_2): her kettle and bedroll gone.
    if (this.save.story?.events?.includes('E_NORA_MEET_2')) {
      f.open('kettle')
      f.open('bedroll')
    }
    if (solvedBefore.includes('P03')) {
      f.open('bay')
      f.open('shed')
    }
    this.trip = {
      gap,
      lostFor: 0,
      deep: 0,
      end: null,
      enc: new Encounters(this.encounterHost()),
      threats: new Threats(this.threatHost()),
      lightLeft: 1,
      scare: prepareScare(),
      stamina: 1,
      tired: false,
      energy: 1,
      energyLow: false,
      unease: 0,
      thing: null,
      story: new StoryPlan(f, new Set(this.save.board?.clues.map((c) => c.id))),
      director: new Director(this.directorHost()),
      // (Once the thing hunts you, the other threats are cues: it's the trip's real danger.)
      danger: solvedBefore.includes('P05') ? 0 : DANGER_PER_TRIP,
      offPath: false,
      waiting: -1,
      bus: mapBus(),
      ride: null,
      deeper: false,
      crewWalk: [],
      offFelt: new Set(),
      nora: null,
      noraSightTried: false,
      yardTime: 0,
      yardLooked: false,
      campTime: 0,
      noraMetNow: false,
    }
    // It lives up the deep road: it hunts once the service gate is open.
    if (solvedBefore.includes('P05')) this.wakeThing('start')
    this.ui.refresh()
    this.ui.renderChat()
    this.scheduleSync(30)
  }

  /** Back down the strip of undergrowth, before you're lost: home, to the gap you used. */
  private leaveForest() {
    const r = gapReturn(this.trip!.gap)
    const plan = this.trip!.story
    const { found, kept } = plan
    this.warp('grounds', r.x, r.y, r.dir, true, false)
    this.ui.hushNarration()
    this.bank(found, kept)
    this.bankStory(plan)
    this.ui.renderChat()
  }

  private updateForest(dt: number) {
    const f = this.forest!
    const t = this.trip!
    if (t.end) {
      t.end.t += dt * 1000
      if (t.end.kind === 'caught' && !t.end.scared && t.end.t >= CAUGHT_GRAB_MS) {
        t.end.scared = true
        showScare(t.scare, SCARE_MS)
      }
      if (t.end.t > endLineAt(t.end.kind) + COLLAPSE_HOLD_MS) this.finishTrip(t.end.kind)
      return
    }
    if (t.ride) return this.updateRide(dt)
    this.updateCrewWalk(dt)
    // Sitting to wait: everything that comes to you comes three times as fast.
    const wait = t.waiting >= 0 ? WAIT_FASTER : 1
    if (t.waiting >= 0) {
      const was = t.waiting
      t.waiting += dt * 1000
      if (was < WAIT_THOUGHT_MS && t.waiting >= WAIT_THOUGHT_MS) this.muse(voiceFor('sitLong'))
    }
    // (Only the wait before something comes is shortened: once it's here, it moves as it should.)
    t.enc.update(t.enc.person ? dt : dt * wait)
    if (t.end) return
    t.threats.update(t.threats.busy() ? dt : dt * wait)
    if (t.end) return
    this.updateThing(dt, wait)
    if (t.end) return
    this.updateStory(dt, wait)
    this.updateNora(dt)
    // (Inside a building, as dark as it is at its door.)
    const room = roomAt(Math.floor(this.me.x), Math.floor(this.me.y))
    const depth = room ? f.depth(room.out.x, room.out.y) : f.depth(this.me.x, this.me.y)
    // On the map it only gets so dark (so you can see the places); lost, it closes right in.
    // It eases there rather than jumping: losing the path, your light slowly shrinks and the dark
    // closes in over several seconds.
    const deepTo = f.lost
      ? Math.max(deepness(depth), t.deeper ? BUS_DEEP : LOST_DEEP)
      : mapDeepness(depth)
    t.deep += (deepTo - t.deep) * Math.min(1, dt / (deepTo > t.deep ? DEEP_EASE_S : 1.5))
    if (!f.lost) {
      if (f.onWayHome(this.me.x, this.me.y) && f.back(this.me.x, this.me.y) > EXIT_BACK)
        return this.leaveForest()
      // Lost by leaving the paths: a thought first, then the way home is gone (nothing announces
      // that, the forest just stops being the map).
      // At the trailhead or behind it (the treeline and the way home) you're never off the path.
      const off =
        f.back(this.me.x, this.me.y) > -1
          ? 0
          : layout().off(Math.floor(this.me.x), Math.floor(this.me.y))
      // Lost only once every path is well out of sight (never while you can still see one), and
      // then everything you can't see is made again.
      const vx = this.vw / TS / 2 + 2
      const vy = this.vh / TS / 2 + 3
      if (off > Math.min(OFF_PATH_LOST_MAX, Math.max(OFF_PATH_LOST, Math.hypot(vx, vy)))) {
        this.getLost()
      } else if (off > Math.max(OFF_PATH_WARN, Math.min(vx, vy)) && !t.offPath) {
        // (Once the path has gone off the edge of the screen.)
        t.offPath = true
        this.muse(pick(OFF_PATH_LINES), true)
      } else if (off < 1 && t.offPath) {
        t.offPath = false
      }
      this.updateBus(dt)
    } else {
      t.lostFor += dt * 1000 * wait
      this.lookingForPath(dt)
      this.updateShelter()
      this.updateBus(dt)
    }
    // Out of energy: you sit down among the roots and wake up in the infirmary. (Not with someone
    // talking to you, or a bus pulling in: that one might be your way out.)
    if (t.energy <= 0 && !t.enc.busy() && !t.threats.busy() && !t.bus?.visible())
      this.endTrip('collapse', COLLAPSE_LINE)
    f.prune(this.me.x, this.me.y)
    const vx = this.vw / TS / 2 + 4
    const vy = this.vh / TS / 2 + 6
    f.forgetHome(this.me.x - vx, this.me.y - vy, this.me.x + vx, this.me.y + vy)
    // Make the chunks just beyond the view in idle time, so walking on never hitches.
    if (Math.floor(this.time / 500) !== this.warmTick) {
      this.warmTick = Math.floor(this.time / 500)
      const r = 26
      const ahead = f.chunksIn(this.me.x - r, this.me.y - r, this.me.x + r, this.me.y + r)
      const next = ahead.find((ch) => !ch.canvas)
      if (next) {
        if ('requestIdleCallback' in window)
          requestIdleCallback(() => chunkGround(next), { timeout: 400 })
        else chunkGround(next)
      }
    }
  }
  private warmTick = 0

  /**
   * Lost, and walking back towards where you came from (where you got lost, or the way in): the
   * forest isn't what you remember (a thought from the director).
   */
  private lookingForPath(dt: number) {
    const t = this.trip!
    const l = t.lostFrom
    if (!l) return
    const sx = this.me.x - l.lx
    const sy = this.me.y - l.ly
    l.lx = this.me.x
    l.ly = this.me.y
    const step = Math.hypot(sx, sy)
    if (step < 0.001) return
    // Back towards where you lost the path, or towards the way in (the treeline, then home).
    const dirs = [
      { x: l.x - this.me.x, y: l.y - this.me.y },
      { x: -this.me.x, y: -this.me.y },
    ]
    const back = dirs.some((v) => {
      const len = Math.hypot(v.x, v.y)
      return len > 1 && (sx * v.x + sy * v.y) / (len * step) > TURN_BACK_DOT
    })
    l.heading = back ? l.heading + dt * 1000 : Math.max(0, l.heading - dt * 2000)
    if (l.heading > TURN_BACK_MS) {
      l.heading = 0
      t.director.turnedBack()
    }
  }

  /**
   * Lost a while: your old lean-to is put out ahead of you, your red marks on the trees leading
   * there; the first time you're near it, a thought.
   */
  private updateShelter() {
    const t = this.trip!
    const story = t.story
    if (!story.shelter) {
      if (t.lostFor < SHELTER_AFTER || t.waiting >= 0) return
      const d = DIR_VEC[this.me.dir]
      const from = Math.max(this.vw, this.vh) / TS / 2 + 1
      story.placeShelter(this.me, d.x, d.y, SHELTER_DIST, from)
      return
    }
    const s = story.shelter
    if (!s.seen && Math.hypot(this.me.x - s.x, this.me.y - s.y) < 7) s.seen = true
  }

  /**
   * The Route 9 bus (PUZZLES.md P04): at the real stop on the map, or, once you're lost, at a copy
   * of the stop put out off to one side, but only when a crew run is coming soon enough to wait
   * for before you'd collapse (so a safe ride is always possible from it).
   */
  private updateBus(dt: number) {
    const t = this.trip!
    const f = this.forest!
    const now = this.gameNow()
    if (!t.bus) {
      if (!f.lost || t.lostFor < BUS_AFTER || t.waiting >= 0 || !t.story.shelter) return
      // Only once you've found the real stop (it's a way up Route 9, past the cabin): the forest
      // copies places you know.
      if (!t.story.reached.has('BUS_STOP') && !this.save.story?.sites?.includes('BUS_STOP')) return
      const until = untilCrew(now)
      if (until < BUS_COPY_SOON[0] || until > BUS_COPY_SOON[1]) return
      if (this.energyLeftMs() < until + 30_000) return
      // Off to the side of the way you're facing (the lean-to is straight ahead).
      const d = DIR_VEC[this.me.dir]
      const side = Math.random() < 0.5 ? 1 : -1
      const x = Math.floor(this.me.x - d.y * side * BUS_DIST)
      const y = Math.floor(this.me.y + d.x * side * BUS_DIST)
      t.bus = new Bus(x, y, -1, y + 3, f)
      return
    }
    t.bus.update(
      dt,
      this.me,
      now,
      {
        sound: (kind, x) => busSound(kind, (x - this.me.x) / 10, 0.9),
        offStop: () => this.feelsOff('copy'),
      },
      f.lost,
    )
  }

  /**
   * Getting on the bus (PUZZLES.md P04). A crew run takes you to the camp gate, with the crew
   * dozing round you; the empty bus is the forest's, and you're riding it alone (story/ride.ts).
   */
  private board() {
    const t = this.trip
    if (!t?.bus) return
    const full = t.bus.full
    t.bus.boarded()
    t.waiting = -1
    this.keys.clear()
    this.fade = 1
    busSound('leave', 0, 0.7)
    t.ride = new Ride(full, this.save.look)
  }

  /**
   * The way home stops existing: everything you can't see is made again as lost forest. (By
   * leaving the paths, or being let off the empty bus.)
   */
  private getLost() {
    const t = this.trip!
    const f = this.forest!
    const vx = this.vw / TS / 2 + 2
    const vy = this.vh / TS / 2 + 3
    const was = f.lost
    f.lose({ x0: this.me.x - vx, y0: this.me.y - vy, x1: this.me.x + vx, y1: this.me.y + vy })
    // The real stop is gone with the map; a copied one is left behind (a new copy may turn up).
    if (t.bus) {
      t.bus.remove(f)
      t.bus = null
    }
    if (was) return
    // Lost, it's never far off.
    this.wakeThing('lost')
    // Lost is dangerous: one more real danger this trip.
    t.danger += LOST_DANGER
    // Where the path was: the nearest bit of it (heading back that way is turning back).
    const near = nearestPath(this.me.x, this.me.y)
    t.lostFrom = { x: near.x, y: near.y, heading: 0, lx: this.me.x, ly: this.me.y }
  }

  /**
   * The empty bus lets you off (PUZZLES.md P04): a long way from where you got on, far from any
   * path, lost. Deep in: the dark closes right in (BUS_DEEP) until someone finds you, and there's
   * one more real danger this trip.
   */
  private rideDropped() {
    const t = this.trip!
    const f = this.forest!
    t.ride = null
    const L = layout()
    let x = this.me.x
    let y = this.me.y
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2
      x = this.me.x + Math.cos(a) * BUS_DROP
      y = this.me.y + Math.sin(a) * BUS_DROP
      if (y < -8 && L.off(Math.floor(x), Math.floor(y)) > OFF_PATH_LOST_MAX + 8) break
    }
    this.me.x = Math.floor(x) + 0.5
    this.me.y = Math.floor(y) + 0.5
    this.me.dir = 0
    this.getLost()
    // Somewhere you can stand.
    for (let r = 0; r < 12 && this.blocked(this.me.x, this.me.y); r++) this.me.x += 1
    t.deeper = true
    t.danger += 1
    // Let off deep, where it is: it finds you much sooner.
    this.wakeThing('bus')
    t.waiting = -1
    this.fade = 1
    const vx = this.vw / TS / 2 + 4
    const vy = this.vh / TS / 2 + 6
    for (const ch of f.chunksIn(this.me.x - vx, this.me.y - vy, this.me.x + vx, this.me.y + vy))
      chunkGround(ch)
    window.setTimeout(() => this.ui.thought('...where am I?'), 5000)
  }

  /** Riding: you walk the aisle; nothing else in the forest happens until you're off. */
  private updateRide(dt: number) {
    const t = this.trip!
    let move = 0
    if (!this.typing() && !this.ui.panelOpen() && !this.ui.dialogueOpen()) {
      if (this.keys.has('arrowleft') || this.keys.has('a')) move -= 1
      if (this.keys.has('arrowright') || this.keys.has('d')) move += 1
    }
    t.ride!.update(dt, move, this.hurrying(), {
      sound: (kind) => {
        busSound(kind, -0.3, 0.9)
      },
      arrive: () => this.rideArrive(),
      dropped: () => this.rideDropped(),
    })
  }

  /**
   * A crew run reaches the camp gate: you're let off on the road outside it, the crew walk in
   * through the gate and are gone, and so is the bus. If you were lost, you're found: the map is
   * back round you (but nothing is kept until you get home).
   */
  private rideArrive() {
    const t = this.trip!
    const f = this.forest!
    t.ride = null
    if (f.lost) {
      t.bus?.remove(f)
      f.found()
      t.enc.found()
      t.threats.found()
      t.lostFor = 0
      t.lostFrom = undefined
      t.offPath = false
      t.deeper = false
      t.story.shelter = null
    }
    t.bus = mapBus()
    const gate = campGate()
    this.me.x = gate.x
    this.me.y = gate.y
    this.me.dir = 3
    this.fade = 1
    for (const ch of f.chunksIn(gate.x - 24, gate.y - 16, gate.x + 24, gate.y + 16)) chunkGround(ch)
    // The crew, ahead of you, walking in through the gate.
    t.crewWalk = Array.from({ length: 7 }, (_, i) => ({
      x: gate.x - 1.2 + (i % 3) * 1.1 + Math.random() * 0.3,
      y: gate.y - 1 - Math.floor(i / 3) * 0.9 - Math.random() * 0.4,
      look: crewLook(),
      a: 1,
      anim: Math.random() * 4,
    }))
  }

  /** The crew walking in through the gate, fading as they pass it. */
  private updateCrewWalk(dt: number) {
    const t = this.trip!
    if (!t.crewWalk.length) return
    const gateY = campGate().y - 3.5
    for (const w of t.crewWalk) {
      w.y -= 2.2 * dt
      w.x += (0.5 - w.x) * Math.min(1, dt * 0.8)
      w.anim += dt * 6
      if (w.y < gateY) w.a = Math.max(0, w.a - dt * 1.2)
    }
    t.crewWalk = t.crewWalk.filter((w) => w.a > 0)
  }

  /** The stalker's breath, playing while its arm reaches in. */
  private stalkerBreath: GainNode | undefined
  private hushBreath() {
    const g = this.stalkerBreath
    if (g) g.gain.setTargetAtTime(0, g.context.currentTime, 0.25)
    this.stalkerBreath = undefined
  }

  /** The trip ends: the screen goes black with a line, then home or the infirmary. */
  private endTrip(kind: 'collapse' | 'caught' | 'home', line: string, who?: Person, face = false) {
    const t = this.trip
    if (!t || t.end) return
    t.end = { kind, t: 1, line, who, face }
    this.hushBreath()
    // Whatever was being thought or looked at stops: the end screen has only its own line.
    this.ui.hushNarration()
    // Caught: a jumpscare, as in /game (an image filling the screen, a scream), then the black
    // screen and its line.
    // Caught: first the grab (a heavy hit and the crack of bones as your light collapses), then,
    // right after it, the jumpscare (see updateForest).
    if (kind === 'caught') {
      swell(3)
      playClip('impact', 1)
      window.setTimeout(() => playClip('bones', 0.9), 250)
    }
    this.keys.clear()
    this.ui.closeDialogue()
    if (this.ui.panelOpen()) this.ui.closePanel()
  }

  private finishTrip(kind: 'collapse' | 'caught' | 'home') {
    const plan = this.trip?.story
    const found = this.trip?.story.found ?? new Map()
    const kept = this.trip?.story.kept ?? new Set<string>()
    this.ui.hushNarration()
    if (kind === 'home') {
      // Walked home by someone real: out at the front of the home, safe (notes are kept).
      this.warp('grounds', FRONT_STEP.x, FRONT_STEP.y, 0, true, false)
      this.fade = 1
      this.say("You're home.")
      this.bank(found, kept)
      if (plan) this.bankStory(plan)
      return
    }
    // Caught: if you had the photo with you, it's left out there (FOREST.md "Caught").
    const lostPhoto = kind === 'caught' && photoWhere(this.save) === 'pocket'
    if (lostPhoto) this.losePhoto()
    // Caught or collapsed: any key in your pocket is gone, back where it was found (PUZZLES.md).
    const lostKey = this.loseKeys()
    // Caught or collapsed: this trip's notepad is gone (STORY.md "Board, failure and persistence").
    this.wakeInInfirmary(lostPhoto, found.size + kept.size > 0)
    if (lostKey) window.setTimeout(() => this.say('Your pocket is lighter. The key is gone.'), 8000)
  }

  private wakeInInfirmary(lostPhoto = false, lostNotes = false) {
    const w = INFIRMARY_WAKE
    this.warp('infirmary', w.x, w.y, w.dir, true, false)
    this.fade = 1
    window.setTimeout(() => this.ui.thought(voiceFor('wake')), 250)
    if (lostPhoto)
      window.setTimeout(() => this.say('Your pocket is empty. The photo is gone.'), 6000)
    window.setTimeout(() => {
      this.ui.dialogue(
        'Nurse Ada',
        [
          'There you are, dear. They found you wandering by the fence again.',
          ...(lostNotes
            ? [
                "You had a notepad with you. It's soaked through... you can't remember what you found, can you.",
              ]
            : []),
          "You're in the infirmary. Have a little rest before you go back out, won't you?",
        ],
        { pitch: intro.ADA_VOICE, look: intro.INTRO_ADA.look, old: false },
      )
    }, 900)
  }

  /** Music, birdsong and the forest's own sound, from how far out (or in) you are. */
  private updateSound(hour: number) {
    let music: number
    const f = this.forest
    // Caught: your heart races through the grab, then stops.
    const end = this.trip?.end
    const grabbing = end?.kind === 'caught' && end.t < CAUGHT_GRAB_MS
    setChase(
      !this.trip
        ? 0
        : end
          ? grabbing
            ? 1
            : 0
          : this.trip.ride
            ? this.trip.ride.dread()
            : this.dread(),
    )
    if (f) {
      setAmbience(hour, 'none')
      // The wind drops away as dread builds: the forest holds its breath.
      const dread = this.dread()
      // An uncanny silence (story/events.ts) stills it all, drones and all.
      const still = 1 - (this.trip?.director.hush() ?? 0)
      const hush = (1 - DREAD_HUSH * Math.min(1, dread * 1.6)) * still
      // Deep in (after the empty bus), the wind all but dies.
      const deepest = this.deepest()
      setForestAmbience(
        this.trip?.end ? 0 : hush * (1 - (1 - BUS_DEEP_WIND) * deepest),
        still < 1 ? 900 : 2500,
      )
      // Drone beds under it: one rising as you go deeper, a heavier one once you're lost.
      const deep = this.trip?.deep ?? 0
      const under = this.trip?.end ? 0 : (0.5 + 0.5 * hush) * still
      // Deep in (after the empty bus), both at once.
      setForestBeds(
        (f.lost ? deepest : Math.max(0, Math.min(1, (deep - DEEP_BED_FROM) / 0.5))) *
          DEEP_BED *
          under,
        f.lost ? LOST_BED * under : 0,
      )
      music = 0
    } else {
      setForestBeds(0, 0)
      const w = this.mapId === 'grounds' ? outskirts(this.me.x, this.me.y) : 0
      // Out past WIND_FROM the forest's wind starts to reach you, over the silence.
      setForestAmbience(Math.max(0, (w - WIND_FROM) / (1 - WIND_FROM)) * WIND_AT_TREELINE)
      setAmbience(hour, this.map.outdoor ? 'outdoors' : 'indoors', 1 - (1 - BIRDS_AT_TREELINE) * w)
      music = Math.max(0, 1 - w / MUSIC_SILENT_FROM)
    }
    const v = Math.round(music * 100) / 100
    if (v !== this.musicLevel) {
      this.musicLevel = v
      setMusicLevel(v, 1200)
    }
  }

  /** When each pet last warned at the treeline, and its current warning (until, facing). */
  private petWarned = new Map<string, number>()
  private petAlarm = new Map<string, { until: number; dir: Dir }>()

  /**
   * A pet right by the treeline stops and growls (dog) or hisses (cat) at the trees: anywhere
   * along it, but sooner near a gap (FOREST.md "Your pet"). Never a wall, never a text box.
   */
  private petAtTreeline(owner: string, f: Follower, kind: PetLook['kind'], mine: boolean) {
    const edge = toTreeline(f.x, f.y)
    const nearGap = gapDistance(f.x, f.y) < PET_GAP_NEAR
    if (edge > (nearGap ? PET_WARN_GAP_EDGE : PET_WARN_EDGE)) return
    const now = performance.now()
    if (now - (this.petWarned.get(owner) ?? -Infinity) < PET_WARN_COOLDOWN_MS) return
    this.petWarned.set(owner, now)
    const dir = facingEdge(f.x, f.y)
    this.petAlarm.set(owner, { until: this.time + PET_WARN_MS, dir })
    const dist = Math.hypot(f.x - this.me.x, f.y - this.me.y)
    const vol = (mine ? 1 : Math.max(0, 1 - dist / 12)) * (nearGap ? 1 : 0.7)
    if (vol <= 0.02) return
    const clip = kind === 'dog' ? 'growl' : 'hiss'
    // The recording, with a low synthesized rumble under it (for a cat too: it's the dread).
    if (hasClip(clip)) this.warningClip = playClip(clip, vol, (f.x - this.me.x) / 6)
    else synthWarning(clip, vol)
    synthWarning('growl', vol * PET_RUMBLE, kind === 'dog' ? 3.8 : 2.4)
  }

  private rowCache = new WeakMap<GameMap, Obj[][]>()
  /** A map's objects bucketed by row (built once per map; rooms are rebuilt as they change). */
  private objectRows(m: GameMap): Obj[][] {
    let rows = this.rowCache.get(m)
    if (!rows) {
      rows = Array.from({ length: m.h }, () => [] as Obj[])
      for (const o of m.objects) rows[Math.max(0, Math.min(m.h - 1, o.y))].push(o)
      this.rowCache.set(m, rows)
    }
    return rows
  }

  /** Someone who found you: their sprite (a fake's changing), with no shadow if that's a tell. */
  private drawForestPerson(p: Person, ox: number, oy: number, shadow = true) {
    const c = this.ctx
    const px = Math.round(p.x * TS + ox)
    const py = Math.round(p.y * TS + oy)
    if (shadow && !p.tells.has('shadow')) {
      c.fillStyle = 'rgba(0,0,0,0.2)'
      c.fillRect(px - 5, py - 1, 10, 2)
      c.fillRect(px - 4, py - 2, 8, 4)
    }
    const frame = p.anim > 0 ? Math.floor(p.anim) % 4 : 0
    const base = personSprite(p.look, p.dir, frame)
    const spr = p.real ? base : fakeSprite(base, `${lookKey(p.look)}|${p.dir}|${frame}`, p.stage)
    c.drawImage(spr, px - SPR_W / 2, py - spr.height + 1)
    // A fake you turned away grins at you as it backs off: a smile far too wide for its face,
    // facing you or from behind (its head has turned all the way round to you); side on, no grin
    // (play-testing: the profile grin didn't work).
    if (!p.real && p.grin && p.dir !== 1 && p.dir !== 2) this.drawGrin(p, ox, oy, 'face')
  }

  /**
   * A grinning fake's grin (grinSprite): `face` is all of it, drawn with the person; `pale` is only
   * its teeth and eyes, drawn again over the dark so the grin still hangs there once it has backed
   * off beyond your light.
   */
  private drawGrin(p: Person, ox: number, oy: number, part: 'face' | 'pale') {
    if (p.dir === 1 || p.dir === 2) return
    const frame = p.anim > 0 ? Math.floor(p.anim) % 4 : 0
    // (Its sprite is cached already: this only reads its height, which grows with its stage.)
    const h = fakeSprite(
      personSprite(p.look, p.dir, frame),
      `${lookKey(p.look)}|${p.dir}|${frame}`,
      p.stage,
    ).height
    const g = grinSprite(p.dir, frame % 2 === 1 ? 1 : 0, p.look.skin)[part]
    const px = Math.round(p.x * TS + ox)
    const py = Math.round(p.y * TS + oy)
    // (Stretched along with the rest of it once it's grown.)
    this.ctx.drawImage(g, px - SPR_W / 2, py - h + 1, SPR_W, h)
  }

  /** Whether you're hurrying: Shift held, and (in the forest) not out of breath. */
  private hurrying(): boolean {
    if (!this.keys.has('shift')) return false
    return !this.trip || !this.trip.tired
  }

  /** Stamina, in the forest only: hurrying drains it, walking and standing refill it. */
  private updateStamina(dt: number, moving: boolean) {
    const t = this.trip
    if (!t) return this.ui.setStamina(null, false)
    if (moving && this.hurrying()) t.stamina = Math.max(0, t.stamina - STAMINA_DRAIN * dt)
    else t.stamina = Math.min(1, t.stamina + (moving ? STAMINA_WALK : STAMINA_REST) * dt)
    if (t.stamina <= STAMINA_SPENT) t.tired = true
    else if (t.tired && t.stamina >= STAMINA_AGAIN) t.tired = false
    this.ui.setStamina(t.stamina, t.tired)
  }

  /** Your light's radius now, in tiles (depth, a fake changing, the photo held up, what's been taken). */
  private lightTiles(): number {
    const t = this.trip!
    return lightRadius(t.deep) * t.enc.lightScale(this.time) * t.lightLeft
  }

  /** The threats' cues, drawn over the darkness so you see them out in the dark. */
  /**
   * The threats' cues. Drawn twice: `under` the darkness (the arm, as solid as you are, so it's only
   * really seen once it creeps into your light) and `over` it (the face and its shape, and a faint
   * trace of the arm out in the dark, so you can only just make it out).
   */
  private drawThreats(th: Threats, ox: number, oy: number, layer: 'under' | 'over') {
    const c = this.ctx
    const now = th.now
    if (!now) return
    const mx = this.me.x * TS + ox
    const my = (this.me.y - 0.6) * TS + oy
    if (now.kind === 'eyes') {
      if (layer === 'under') return
      const open = now.closing ? Math.max(0, 1 - now.closing / 900) : Math.min(1, now.t / 1600)
      // Its grin opens as it comes, and is at least half open once it has taken your light.
      const grin = Math.max(now.near, now.took ? 0.5 : 0)
      drawFace(c, now.x * TS + ox, (now.y - 1) * TS + oy, open, grin, this.time)
      return
    }
    // The arm: creeping into your light from behind once it's close, out of the dark. It starts
    // slow and speeds up (eased), and fades in over its first stretch rather than appearing.
    if (!now.real || now.near < ARM_FROM) return
    const k = (now.near - ARM_FROM) / (1 - ARM_FROM)
    const reach = k * k * (3 - 2 * k)
    const from = this.lightTiles() * TS + 34
    const fx = mx + now.v.x * from
    const fy = my + now.v.y * from
    c.globalAlpha = Math.min(1, k / 0.35) * (layer === 'under' ? 1 : ARM_SEEN_IN_DARK)
    drawArm(c, fx, fy, mx, my, (from - 6) * reach, this.time)
    c.globalAlpha = 1
  }

  /** What the threats need from the game (src/forest/threats.ts). */
  // --- the story in the forest (STORY.md; src/forest/story) ------------------------------------

  private directorHost(): DirectorHost {
    return {
      me: this.me,
      depth: () => this.forest?.depth(this.me.x, this.me.y) ?? 0,
      lost: () => !!this.forest?.lost,
      night: () => darkness(gameHour(this.gameNow())) / NIGHT > 0.5,
      busy: () => {
        const t = this.trip
        return (
          !t ||
          !!t.end ||
          t.enc.busy() ||
          t.threats.busy() ||
          this.thingNear() ||
          this.ui.dialogueOpen() ||
          this.ui.panelOpen()
        )
      },
      hasPet: () => !!this.save.pet,
      thought: (text, important) => {
        if (this.forest) this.muse(text, important)
      },
      cue: (cue) => this.forestCue(cue),
    }
  }

  /**
   * An unprompted thought (play-testing: the inner voice talked far too much): at most one a
   * minute, unless it's `important` (losing the path, turning back to look for it).
   */
  private muse(text: string | null, important = false) {
    if (!text) return
    if (!important && this.time - this.lastMuse < MUSE_GAP_MS) return
    this.lastMuse = this.time
    this.ui.thought(text)
  }
  private lastMuse = -Infinity

  /**
   * "Something feels... off." Only when something really is (play-testing: as a throwaway on an
   * uncanny silence it meant nothing): a real threat starting (only sometimes, so silence never
   * means you're safe, and never for a false alarm), or the first sight of a place the forest has
   * copied. Once a trip for each.
   */
  private feelsOff(why: 'threat' | 'copy') {
    const t = this.trip
    if (!t || t.offFelt.has(why)) return
    if (why === 'threat' && Math.random() >= FEELS_OFF_CHANCE) return
    t.offFelt.add(why)
    this.muse('Something feels... off.', true)
  }

  private updateStory(dt: number, wait = 1) {
    const t = this.trip!
    const seen = t.story.update(this.me)
    // (Landmarks have no arrival lines now; any that do are said as an unprompted thought.)
    const line = seen?.seen[Math.floor(Math.random() * seen.seen.length)]
    if (line) {
      t.director.noteSaid(line)
      this.muse(line)
    } else if (seen && this.save.story?.sites?.includes(seen.id as SiteId)) {
      // Somewhere you've been before, and not quite sure of it.
      t.director.arrivedAgain()
    }
    t.director.update(dt * wait)
  }

  /** An uncanny moment's sound or sight (story/events.ts). */
  private forestCue(cue: EventCue) {
    const t = this.trip
    if (!t) return
    const pan = Math.random() * 1.6 - 0.8
    const d = DIR_VEC[this.me.dir]
    switch (cue) {
      case 'name':
        return uncanny('name', pan, 0.5)
      case 'twig':
        return twigSnap(0.9)
      case 'musicbox':
        return uncanny('musicbox', pan, 0.8)
      case 'knock':
        return uncanny('knock', pan, 0.9)
      case 'prints':
        return t.story.prints(this.me, Math.ceil(this.lightTiles()))
      case 'light': {
        // Out in the dark beyond your light, but still on screen.
        const half = (d.x ? this.vw : this.vh) / TS / 2
        const far = Math.max(this.lightTiles() + 1.5, half - 1.2)
        const side = (Math.random() * 2 - 1) * 2
        return t.director.showLight(
          this.me.x + d.x * far - d.y * side,
          this.me.y + d.y * far + d.x * side - 0.5,
        )
      }
    }
  }

  /** What's there to examine in front of you (or at your feet), in the forest. */
  private storyThing(x: number, y: number): StoryThing | null {
    const t = this.trip
    const f = this.forest
    if (!t || !f) return null
    // A building's door: from outside (go in), or its inside's front wall (go out).
    if (f.isMap(x, y))
      for (const d of DOORS) {
        if (d.outside.x === x && d.outside.y === y) return { kind: 'door', door: d, side: 'out' }
        if (d.door.x === x && d.door.y === y) return { kind: 'door', door: d, side: 'in' }
      }
    const spot = t.story.spotAt(x, y)
    if (spot) return { kind: 'part', part: spot }
    if (f.isMap(x, y)) {
      // Any part of a prop: its own spot nearest where you are, or what it looks like.
      const L = layout()
      const p = L.propAt(x, y)
      if (p) {
        const on = L.spotOn(p, x, y)
        if (on) return { kind: 'part', part: on }
        const pl = PROP_LOOKS[p.id]
        if (pl) return { kind: 'look', prompt: pl.prompt, look: pickAt(pl.look, p.x, p.y) }
      }
    }
    for (const [tx, ty] of [
      [x, y],
      [Math.floor(this.me.x), Math.floor(this.me.y - 0.1)],
    ]) {
      const o = f.storyAt(tx, ty)
      if (o?.k === 'find') {
        const find = FIND_BY_ID.get(o.id as FindId)
        if (find) return { kind: 'find', find, x: tx, y: ty }
      }
      if (o?.k === 'prints') return { kind: 'prints' }
    }
    // The forest's own things: trees, stumps, logs, stones, mushrooms, brambles.
    const o = f.objectAt(x, y)
    const nl = o && NATURE_LOOKS[o.k]
    if (nl) return { kind: 'look', prompt: nl.prompt, look: pickAt(nl.look, x, y) }
    return null
  }

  /** Whether a keepsake can still be had: not picked up this trip, and not already at home. */
  private keepable(id: string): boolean {
    return (
      !!this.trip &&
      !this.trip.story.kept.has(id) &&
      !this.save.room.items.some((i) => i.k === `keep_${id}`)
    )
  }

  private forestPrompt(): string | null {
    const t = this.trip
    if (t?.ride) return null
    const ft = this.facingTile()
    const thing = this.storyThing(ft.x, ft.y)
    if (t && t.waiting >= 0) return '[WASD] Get up'
    if (t?.bus?.canBoard(this.me) && !t.enc.busy() && !t.threats.busy()) return 'Get on the bus'
    if (!thing) return this.forest?.lost && t && !t.enc.busy() ? 'Sit down and wait' : null
    if (thing.kind === 'door') {
      if (thing.side === 'in') return 'Go out'
      const d = thing.door
      if (d.lock && !this.solved(d.lock))
        return d.key && this.pocketKeys().includes(d.key) ? 'Unlock the door' : 'Try the door'
      return 'Go in'
    }
    if (thing.kind === 'part' && thing.part.combo && this.solved(thing.part.combo))
      return COMBOS[thing.part.combo].openPrompt
    if (thing.kind === 'part' && thing.part.winch && this.solved('P03')) return 'Look at the winch'
    if (thing.kind === 'part') return thing.part.prompt
    if (thing.kind === 'look') return thing.prompt
    if (thing.kind === 'find')
      return thing.find.keep && this.keepable(thing.find.id)
        ? thing.find.prompt.replace(/^Look at/, 'Pick up')
        : thing.find.prompt
    return 'Look at the footprints'
  }

  // --- keys and leads (PUZZLES.md "Core mechanics and state model") -------------------------------

  /** The keys in your pocket: brought from home, and picked up this trip. */
  pocketKeys(): ItemId[] {
    const mine = (this.save.pocket ?? []).filter((p): p is ItemId =>
      (ITEM_IDS as readonly string[]).includes(p),
    )
    return [...mine, ...(this.trip?.story.carried ?? [])]
  }

  /** How full your pocket is (the photo, keys from home, and keys picked up this trip). */
  private pocketUsed(): number {
    return (this.save.pocket?.length ?? 0) + (this.trip?.story.carried.size ?? 0)
  }

  /**
   * A key where it was left (PUZZLES.md): you see it and take it, into your pocket for this trip.
   * If it's already yours (in your pocket or on your hook), it isn't here.
   */
  private takeItem(part: Spot, firstLook: boolean) {
    const t = this.trip!
    const id = part.item!
    if (hasItem(this.save, id) || t.story.carried.has(id)) return this.ui.look(part.lookAfter ?? '')
    this.ui.look(part.look ?? '', firstLook ? part.voice : null)
    if (this.pocketUsed() >= POCKET_SLOTS) {
      window.setTimeout(() => this.say('Your pocket is full.'), 400)
      return
    }
    t.story.carried.add(id)
    paperRustle(0.4)
    window.setTimeout(() => this.say(`You take ${ITEMS[id].name}.`), 300)
    this.ui.refresh()
  }

  /** Locks you've found and can't open yet: kept ones and this trip's (for the notepad and map). */
  openLeads(): LeadId[] {
    const all = [...(this.save.story?.leads ?? []), ...(this.trip?.story.leads ?? [])]
    return [...new Set(all)].filter((l) => !this.leadSolved(l))
  }

  /**
   * Inside a building (story/map.ts INTERIORS): nobody comes to find you there, and nothing comes
   * for you (they wait till you're out).
   */
  private indoors(): boolean {
    return !!this.forest && !!roomAt(Math.floor(this.me.x), Math.floor(this.me.y))
  }

  /** Whether a puzzle is solved: kept from an earlier trip, or done on this one. */
  private solved(p: PuzzleId): boolean {
    return !!this.save.story?.puzzles?.includes(p) || !!this.trip?.story.opened.has(p)
  }

  /** Whether a lead's lock is open (its puzzle solved). */
  private leadSolved(id: LeadId): boolean {
    return this.solved(LEADS[id].puzzle)
  }

  /**
   * A building's door (story/map.ts DOORS): in, or out again. A locked one (PUZZLES.md P01) opens
   * with its key in your pocket, for the rest of the trip, and for good once you're home safe.
   */
  private useForestDoor(d: Door, side: 'out' | 'in') {
    const t = this.trip!
    if (side === 'out' && d.lock && !this.solved(d.lock)) {
      if (!d.key || !this.pocketKeys().includes(d.key)) {
        lockSound('rattle', 0.7)
        if (d.lead) this.noteLead(d.lead)
        return this.ui.look(d.locked ?? 'It’s locked.')
      }
      t.story.opened.add(d.lock)
      lockSound('open')
      window.setTimeout(() => this.say('The key turns.'), 300)
    } else lockSound('door', 0.8)
    const to = side === 'out' ? d.in : d.out
    this.me.x = to.x
    this.me.y = to.y
    this.me.dir = side === 'out' ? 3 : 0
    this.keys.clear()
    this.fade = 1
    const f = this.forest!
    for (const ch of f.chunksIn(to.x - 24, to.y - 16, to.x + 24, to.y + 16)) chunkGround(ch)
    this.ui.refresh()
  }

  /** A puzzle document (story/docs.ts): read it; what it holds goes in your notepad as a lead. */
  private readDoc(id: keyof typeof DOCS, firstLook: (key: string) => boolean) {
    const doc: Doc = DOCS[id]
    paperRustle(0.8)
    if (doc.lead) this.noteLead(doc.lead)
    this.ui.openDoc(doc, () => {
      if (doc.voice && firstLook(`doc:${id}`)) this.ui.thought(doc.voice)
    })
  }

  /**
   * A combination lock (story/map.ts COMBOS): the service gate's padlock (PUZZLES.md P05) or Bell's
   * locker (P02), four dials. The right code opens it for the rest of the trip (and for good once
   * you're home safe); a wrong one just rattles. Once open, there's what's inside to look at.
   */
  private useCombo(part: Spot, firstLook: (key: string) => boolean) {
    const id = part.combo!
    const c = COMBOS[id]
    if (this.solved(id)) return c.doc ? this.readDoc(c.doc, firstLook) : this.ui.look(c.open)
    if (part.lead) this.noteLead(part.lead)
    this.ui.openPadlock(part.look ?? '', c.pull, (code) => {
      if (code !== c.code) {
        lockSound('rattle')
        return false
      }
      this.trip!.story.opened.add(id)
      lockSound('open')
      this.forest!.open(c.prop)
      window.setTimeout(() => this.say(c.sprung), 400)
      this.ui.refresh()
      return true
    })
  }

  /**
   * The shed's shutter winch (PUZZLES.md P03): release the catch, turn the spool, set the ratchet,
   * in that order (the diagram on the wall says so). Out of order, the rope snaps loose and it all
   * goes back to the start: no harm done, try again.
   */
  private useWinch(part: Spot) {
    if (this.solved('P03'))
      return this.ui.look('The ratchet holds. The shutter stays up, the shelf behind it open.')
    this.noteLead('shutter_jammed')
    const ORDER = ['catch', 'spool', 'ratchet'] as const
    let done = 0
    this.ui.openWinch(part.look ?? '', (step) => {
      if (step !== ORDER[done]) {
        done = 0
        lockSound('rattle')
        return {
          state: 0,
          text:
            step === 'spool'
              ? 'The crank won’t turn against the catch. Something jerks loose and the rope drops back slack.'
              : 'It clacks against nothing. The rope jerks loose and drops back slack.',
        }
      }
      done++
      if (done === 1) {
        lockSound('door', 0.4)
        return { state: 1, text: 'The catch lifts with a squeal. The spool is free to turn.' }
      }
      if (done === 2) {
        lockSound('door', 0.6)
        return {
          state: 2,
          text: 'The rope tightens over the pulley. The shutter lifts, shaking, and hangs there.',
        }
      }
      this.trip!.story.opened.add('P03')
      lockSound('open')
      this.forest!.open('bay')
      this.forest!.open('shed')
      window.setTimeout(() => this.say('The shutter rolls up and stays.'), 400)
      this.ui.refresh()
      return { state: 3, text: '', done: true }
    })
  }

  /** A lock you can't open yet: noted in this trip's notepad (kept if you get home). */
  private noteLead(id: LeadId) {
    const t = this.trip
    if (!t || this.leadSolved(id) || this.save.story?.leads?.includes(id)) return
    if (t.story.leads.has(id)) return
    t.story.leads.add(id)
    this.ui.refresh()
  }

  /** A lead found at home (your own closet): straight into your saved story. */
  private addLeadAtHome(id: LeadId) {
    if (this.leadSolved(id)) return
    const story = (this.save.story ??= {})
    if (story.leads?.includes(id)) return
    story.leads = [...(story.leads ?? []), id]
    this.markDirty()
  }

  /**
   * Home safe (PUZZLES.md "Safe return must be atomic"): the keys you picked up go in your pocket for
   * good, and the leads you found and the places you reached are kept.
   */
  private bankStory(plan: StoryPlan) {
    const story = (this.save.story ??= {})
    // Doors unlocked and gates opened this trip: open for good now.
    if (plan.opened.size) story.puzzles = [...new Set([...(story.puzzles ?? []), ...plan.opened])]
    for (const id of plan.carried) if (!hasItem(this.save, id)) (this.save.pocket ??= []).push(id)
    const leads = [...plan.leads].filter((l) => !this.leadSolved(l))
    story.leads = [...new Set([...(story.leads ?? []), ...leads])]
    const sites = [...plan.reached].filter((r): r is SiteId =>
      (SITE_IDS as readonly string[]).includes(r),
    )
    story.sites = [...new Set([...(story.sites ?? []), ...sites])]
    // (Leads whose lock is now open are done with.)
    story.leads = story.leads.filter((l) => !this.leadSolved(l))
    for (const k of ['leads', 'sites'] as const) if (!story[k]?.length) delete story[k]
    if (!Object.keys(story).length) delete this.save.story
    this.markDirty()
    this.ui.refresh()
  }

  // --- Nora (PUZZLES.md E_NORA_SIGHTING, E_NORA_MEET_1, E_NORA_MEET_2; story/nora.ts) ----------

  /** In the camp's courtyard, outdoors (inside the fence). */
  private inYard(): boolean {
    const { x, y } = this.me
    return !!this.forest && x > -21 && x < 21 && y > -157 && y < -127 && !this.indoors()
  }

  private hasEvent(id: EventId): boolean {
    return !!this.save.story?.events?.includes(id)
  }

  /**
   * A scripted encounter has happened. Kept at once, even if you don't get home (PUZZLES.md: NPC
   * encounter flags persist independently of unbanked notes).
   */
  private addEvent(id: EventId) {
    if (this.hasEvent(id)) return
    const s = (this.save.story ??= {})
    s.events = [...(s.events ?? []), id]
    this.markDirty()
  }

  /** Whether Nora's note is on your board (you wrote her down and got home with it). */
  private knowsNora(): boolean {
    return !!this.save.board?.clues.some((c) => c.id === 'note_nora')
  }

  private updateNora(dt: number) {
    const t = this.trip!
    const f = this.forest!
    if (t.nora) {
      if (t.nora.update(dt, this.me) === 'talk') this.noraTalks(t.nora)
      if (!t.nora.busy()) t.nora = null
      return
    }
    if (f.lost || t.enc.busy() || t.threats.busy() || this.ui.dialogueOpen()) return
    // The sighting: once, a way past the fork, before you've met her (and only sometimes).
    const sight =
      !t.noraSightTried &&
      !this.hasEvent('E_NORA_SIGHTING') &&
      !this.hasEvent('E_NORA_STARTLED') &&
      !this.hasEvent('E_NORA_MEET_1')
        ? SIGHTINGS.find((s) => Math.hypot(this.me.x - s.at.x, this.me.y - s.at.y) < 2.5)
        : undefined
    if (sight) {
      t.noraSightTried = true
      if (Math.random() < NORA_SIGHT_CHANCE) {
        this.addEvent('E_NORA_SIGHTING')
        t.nora = new Nora('sighting', sight.stand.x, sight.stand.y, sight.to)
      }
      return
    }
    if (t.noraMetNow) return
    // Which beat is next: she warms up slowly, one meeting a trip (startled, wary, then her name),
    // and the second real meeting once Evie's 1978 file is on your board. (Saves from before the
    // warming up, with E_NORA_MEET_1 already, skip straight on.)
    const met1 = this.hasEvent('E_NORA_MEET_1')
    const kind: NoraKind | null = met1
      ? !this.hasEvent('E_NORA_MEET_2') && t.story.banked.has('evie_case_1978')
        ? 'meet2'
        : null
      : !this.hasEvent('E_NORA_STARTLED')
        ? 'startle'
        : !this.hasEvent('E_NORA_AGAIN')
          ? 'again'
          : 'meet1'
    if (!kind) return
    // Where: the courtyard always; her camp by the creek too once she's run from you there.
    const atCamp =
      (kind === 'again' || kind === 'meet1') &&
      Math.hypot(this.me.x - NORA_CAMP.x, this.me.y - NORA_CAMP.y) < 9
    if (atCamp) t.campTime += dt
    else if (this.inYard()) t.yardTime += dt
    else return
    const ready = atCamp
      ? t.campTime > 1.5
      : kind === 'startle'
        ? t.yardLooked || t.yardTime > NORA_MEET_AFTER
        : t.yardTime > 3
    if (!ready) return
    // Somewhere in sight but not on top of you.
    const spots = atCamp ? CAMP_SPOTS : YARD_SPOTS
    const by = [...spots].sort((a, b) => {
      const da = Math.hypot(a.x - this.me.x, a.y - this.me.y)
      const db = Math.hypot(b.x - this.me.x, b.y - this.me.y)
      const score = (d: number) => (d >= 6 && d <= 12 ? 0 : 1) + Math.abs(d - 8) / 100
      return score(da) - score(db)
    })[0]
    // The second meeting: she's sitting at a table with her kettle, not standing waiting for you.
    if (kind === 'meet2') t.nora = new Nora(kind, NORA_SEAT.x, NORA_SEAT.y, LEAVE_NORTH, true)
    else t.nora = new Nora(kind, by.x, by.y, atCamp ? LEAVE_CREEK : LEAVE_EAST)
  }

  /** You've come close: the conversation (her lines, your thoughts between). */
  private noraTalks(n: Nora) {
    const t = this.trip!
    const opts = { look: NORA_LOOK, old: false, mole: true, pitch: NORA_PITCH }
    this.me.dir = (n.x < this.me.x ? 1 : n.x > this.me.x ? 2 : 3) as Dir
    if (Math.abs(n.y - this.me.y) > Math.abs(n.x - this.me.x)) this.me.dir = n.y < this.me.y ? 3 : 0
    // Before she's told you her name: frightened, then wary. She goes as soon as she's said it.
    if (n.kind === 'startle' || n.kind === 'again') {
      this.addEvent(n.kind === 'startle' ? 'E_NORA_STARTLED' : 'E_NORA_AGAIN')
      t.noraMetNow = true
      this.ui.dialogue(NORA_UNNAMED, n.kind === 'startle' ? STARTLE : AGAIN, {
        ...opts,
        moods: n.kind === 'startle' ? STARTLE_MOODS : AGAIN_MOODS,
        onDone: () => n.leave(),
      })
      return
    }
    if (n.kind === 'meet1') {
      this.addEvent('E_NORA_MEET_1')
      t.noraMetNow = true
      this.ui.dialogue(NORA_UNNAMED, MEET_1, {
        ...opts,
        moods: MEET_1_MOODS,
        onDone: () => {
          n.leave()
          window.setTimeout(() => {
            if (this.trip !== t) return
            this.ui.thought(NORA_THOUGHTS.afterMeet1)
            this.writeDownNora()
          }, 1600)
        },
      })
      return
    }
    // The second meeting: she knows you. Whether you know her is what you wrote down. Her camp by
    // the creek is packed up from now (out of sight of here).
    this.addEvent('E_NORA_MEET_2')
    this.forest?.open('kettle')
    this.forest?.open('bedroll')
    t.noraMetNow = true
    const known = this.knowsNora()
    this.ui.dialogue('Nora', MEET_2_GREET, {
      ...opts,
      moods: MEET_2_GREET_MOODS,
      onDone: () => {
        this.ui.thought(known ? NORA_THOUGHTS.meet2Known : NORA_THOUGHTS.meet2Unknown)
        window.setTimeout(() => {
          if (this.trip !== t) return
          this.ui.dialogue('Nora', [...(known ? MEET_2_KNOWN : MEET_2_REMIND), ...MEET_2_REST], {
            ...opts,
            moods: [...(known ? MEET_2_KNOWN_MOODS : MEET_2_REMIND_MOODS), ...MEET_2_REST_MOODS],
            onDone: () => {
              n.linger()
              if (!known) window.setTimeout(() => this.trip === t && this.writeDownNora(), 1600)
            },
          })
        }, 2600)
      },
    })
  }

  /** The protagonist writes her down (STORY.md "Memory"): her note goes in your notepad. */
  private writeDownNora() {
    const t = this.trip
    if (!t || t.story.found.has('note_nora') || t.story.banked.has('note_nora')) return
    this.takeClue('note_nora')
  }

  /**
   * Caught or collapsed: every key in your pocket is gone, and waits back where it was found
   * (PUZZLES.md: a unique item is recoverable from its source). Keys on your hook are safe.
   * Whether any went.
   */
  private loseKeys(): boolean {
    const pocket = this.save.pocket
    if (!pocket) return false
    const kept = pocket.filter((p) => !(ITEM_IDS as readonly string[]).includes(p))
    if (kept.length === pocket.length) return false
    if (kept.length) this.save.pocket = kept
    else delete this.save.pocket
    this.markDirty()
    return true
  }

  /**
   * Your key hook: hang up what you're carrying, or (with nothing in your pocket) take down what's
   * there, as many as your pocket holds. A key is only ever in one place.
   */
  private useKeyHook() {
    if (this.ownerOf(this.mapId) !== this.login) return this.say('Someone else’s key hook.')
    const story = (this.save.story ??= {})
    const carrying = this.pocketKeys()
    if (carrying.length) {
      story.hook = [...(story.hook ?? []), ...carrying]
      this.save.pocket = (this.save.pocket ?? []).filter((p) => !carrying.includes(p as ItemId))
      if (!this.save.pocket.length) delete this.save.pocket
      this.say(
        carrying.length > 1
          ? 'You hang your keys on the hook.'
          : `You hang ${ITEMS[carrying[0]].name} on the hook.`,
      )
    } else if (story.hook?.length) {
      const room = POCKET_SLOTS - (this.save.pocket?.length ?? 0)
      if (room <= 0) return this.say('Your pocket is full.')
      const taking = story.hook.slice(0, room)
      story.hook = story.hook.slice(room)
      this.save.pocket = [...(this.save.pocket ?? []), ...taking]
      this.say(
        taking.length > 1
          ? 'You take your keys off the hook.'
          : `You take ${ITEMS[taking[0]].name} off the hook.`,
      )
    } else {
      if (!Object.keys(story).length) delete this.save.story
      return this.say('A little key hook. Nothing on it.')
    }
    if (!story.hook?.length) delete story.hook
    if (!Object.keys(story).length) delete this.save.story
    sfx('blip')
    this.markDirty()
    this.refreshRoom()
    this.ui.refresh()
  }

  /** Picks up a keepsake (it goes home with your notepad, if you get home). */
  private keep(id: string) {
    const t = this.trip
    if (!t || !this.keepable(id)) return
    t.story.kept.add(id)
    paperRustle(0.6)
    window.setTimeout(() => this.say(KEEPSAKES[id]?.took ?? 'You keep it.'), 300)
    this.ui.refresh()
  }

  /** Examining something in the forest: a clue's paper, or a look and maybe a thought. */
  private examine(x: number, y: number) {
    const t = this.trip
    if (t?.ride) return
    const thing = this.storyThing(x, y)
    if (t?.bus?.canBoard(this.me) && t.waiting < 0 && !t.enc.busy() && !t.threats.busy())
      return this.board()
    // Lost, with nothing in front of you: sit down among the roots and wait for someone.
    if (t && !thing && !t.end && this.forest?.lost && t.waiting < 0 && !t.enc.busy()) {
      t.waiting = 0
      this.keys.clear()
      this.ui.thought(voiceFor('sit'))
      return
    }
    if (!t || !thing || t.end) return
    if (this.inYard()) t.yardLooked = true
    const first = (key: string) => {
      if (t.story.looked.has(key)) return false
      t.story.looked.add(key)
      return true
    }
    if (thing.kind === 'door') return this.useForestDoor(thing.door, thing.side)
    if (thing.kind === 'part' && thing.part.combo) return this.useCombo(thing.part, first)
    if (thing.kind === 'part' && thing.part.winch) return this.useWinch(thing.part)
    if (thing.kind === 'part' && thing.part.shut && !this.solved(thing.part.shut.puzzle)) {
      if (thing.part.lead) this.noteLead(thing.part.lead)
      return this.ui.look(thing.part.shut.look)
    }
    if (thing.kind === 'part' && thing.part.doc) return this.readDoc(thing.part.doc, first)
    if (thing.kind === 'prints')
      return this.ui.look(
        'Footprints in the soft earth, going on ahead of you. The same tread as your own shoes.',
      )
    if (thing.kind === 'look') return this.ui.look(thing.look)
    if (thing.kind === 'find' && !thing.find.clue) {
      const f = thing.find
      this.ui.look(f.look, first(`find:${f.id}`) ? f.voice : null)
      if (f.keep && this.keepable(f.id)) {
        this.keep(f.id)
        this.forest?.removeStory(thing.x, thing.y, 'find')
      }
      return
    }
    // (A find holding a clue, like the tin box of notes, opens like any other clue.)
    const part: Spot =
      thing.kind === 'find'
        ? { x: thing.x, y: thing.y, prompt: thing.find.prompt, clue: thing.find.clue }
        : thing.part
    if (!part.clue) {
      if (part.lead) this.noteLead(part.lead)
      if (part.item) return this.takeItem(part, first(part.prompt))
      if (part.keep && !this.keepable(part.keep))
        return this.ui.look(part.lookAfter ?? part.look ?? '')
      const met = part.met?.filter((m) => this.hasEvent(m.event)).at(-1)
      this.ui.look(met?.look ?? part.look ?? '', !met && first(part.prompt) ? part.voice : null)
      if (part.keep) this.keep(part.keep)
      return
    }
    // (A spot with a second clue, like the envelope with Evie's card and photo, shows the one still
    // to find; once both are yours, the first.)
    const id = thing.kind === 'find' ? part.clue : t.story.clueToShow(part)
    if (!id) return this.ui.look(part.look ?? '')
    const clue = CLUES[id]
    if (!clue) return
    if (clue.lead) this.noteLead(clue.lead)
    const state = t.story.banked.has(id) ? 'known' : t.story.found.has(id) ? 'taken' : 'new'
    let took = false
    paperRustle(0.8)
    this.ui.openClue(id, state, {
      onTake: () => {
        took = true
        this.takeClue(id)
      },
      onClose: () => {
        if (!this.forest) return
        let line: string | null = null
        // (Some papers have no thought at all: silence is often better.)
        if (took) line = clue.voice[Math.floor(Math.random() * clue.voice.length)] ?? null
        else if (state === 'known' && first(`known:${id}`)) line = voiceFor('known')
        if (line) {
          t.director.noteSaid(line)
          window.setTimeout(() => this.ui.thought(line), 500)
        }
      },
    })
  }

  /** A clue goes in your notepad (unbanked until you're home). */
  private takeClue(id: ClueId) {
    const t = this.trip
    if (!t || t.story.found.has(id)) return
    t.story.found.set(id, { note: '' })
    paperRustle()
    this.ui.refresh()
  }

  /** Your own note on something in your notepad. */
  setTripNote(id: ClueId, text: string) {
    const f = this.trip?.story.found.get(id)
    if (f) f.note = text.slice(0, NOTE_MAX)
  }

  /** Clues waiting to be found glint now and then, faintly, even out in the dark. */
  private drawGlints(story: StoryPlan, ox: number, oy: number) {
    const c = this.ctx
    for (const p of story.clueSpots()) {
      if (Math.hypot(p.x + 0.5 - this.me.x, p.y - this.me.y) > GLINT_NEAR) continue
      const offset = ((p.x * 73856093) ^ (p.y * 19349663)) >>> 0
      const phase = ((this.time + offset) % GLINT_PERIOD) / GLINT_PERIOD
      if (phase > 0.14) continue
      const a = Math.sin((phase / 0.14) * Math.PI) * 0.85
      const px = Math.round(p.x * TS + ox + 8)
      const py = Math.round(p.y * TS + oy - 6)
      c.globalAlpha = a
      c.fillStyle = '#fff4d8'
      c.fillRect(px, py, 1, 1)
      c.globalAlpha = a * 0.6
      c.fillRect(px - 2, py, 2, 1)
      c.fillRect(px + 1, py, 2, 1)
      c.fillRect(px, py - 2, 1, 2)
      c.fillRect(px, py + 1, 1, 2)
      c.globalAlpha = 1
    }
  }

  private threatHost(): ThreatHost {
    return {
      me: this.me,
      lightTiles: () => this.lightTiles(),
      view: () => ({ w: this.vw / TS / 2, h: this.vh / TS / 2 }),
      blocked: (x, y) => this.blocked(x, y),
      step: (x, y, volume) => {
        const d = Math.hypot(x - this.me.x, y - this.me.y)
        footstep('leaves', volume * Math.max(0.2, 1 - d / 12), (x - this.me.x) / 5)
      },
      sound: (kind, x) => threatSound(kind, 1, (x - this.me.x) / 6),
      gasp: (volume, x) => playClip('gasp', volume, (x - this.me.x) / 6),
      breath: (on, x) => {
        if (on) this.stalkerBreath = playClip('breath', 1, (x - this.me.x) / 4)
        else this.hushBreath()
      },
      quiet: () =>
        !!this.trip &&
        !this.trip.end &&
        !this.trip.enc.busy() &&
        !this.trip.nora?.busy() &&
        !this.ui.dialogueOpen() &&
        !this.ui.panelOpen() &&
        !this.thingNear() &&
        !this.indoors(),
      deepness: () => this.trip?.deep ?? 0,
      lost: () => !!this.forest?.lost,
      danger: () => (this.trip?.danger ?? 0) > 0,
      spendDanger: () => {
        if (this.trip) this.trip.danger--
      },
      caught: (line) => this.endTrip('caught', line, undefined, true),
      realStarting: () => this.feelsOff('threat'),
      takeLight: () => {
        const t = this.trip
        if (!t) return
        t.lightLeft = Math.max(LIGHT_LEAST, t.lightLeft - LIGHT_TAKEN)
        swell(1)
      },
      takeBreath: () => {
        const t = this.trip
        if (!t) return
        t.stamina = 0
        t.tired = true
      },
    }
  }

  // --- the thing in the deep, your unease and your energy (FOREST.md "The thing in the deep") ---

  /**
   * The thing starts hunting (or, already hunting, comes closer): `start` up the deep road (or at
   * least THING_START_MIN off), `lost` not far off, `bus` closer still. Always out of sight.
   */
  private wakeThing(why: 'start' | 'lost' | 'bus') {
    const t = this.trip
    if (!t) return
    const r = why === 'bus' ? THING_BUS_START : why === 'lost' ? THING_LOST_START : THING_START_MIN
    if (t.thing && t.thing.phase !== 'away' && t.thing.dist() <= r) return
    let x = THING_START.x
    let y = THING_START.y
    if (why !== 'start' || Math.hypot(x - this.me.x, y - this.me.y) < r) {
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2
        x = this.me.x + Math.cos(a) * r
        y = this.me.y + Math.sin(a) * r
        if (why !== 'start' || y < THING_SOUTH) break
      }
    }
    if (t.thing && t.thing.phase !== 'away') {
      t.thing.x = x
      t.thing.y = y
    } else t.thing = new Thing(this.thingHost(), x, y)
    // From here it's the trip's real danger: the other threats are cues (lost still adds some).
    if (why === 'start') t.danger = Math.min(t.danger, 0)
  }

  private thingHost(): ThingHost {
    return {
      me: () => {
        // Inside a building, you're at its door as far as it's concerned.
        const room = roomAt(Math.floor(this.me.x), Math.floor(this.me.y))
        return room
          ? { x: room.out.x, y: room.out.y, moving: false }
          : { x: this.me.x, y: this.me.y, moving: this.me.moving }
      },
      indoors: () => this.indoors(),
      lost: () => !!this.forest?.lost,
      blocked: (x, y) => this.blocked(x, y),
      view: () => ({ w: this.vw / TS / 2, h: this.vh / TS / 2 }),
      // Heavy, low steps (the leaves pitched right down).
      step: (x, _y, volume) =>
        footstep('leaves', Math.min(1, volume * 1.6), (x - this.thingFrom().x) / 8, 0.55),
      sound: (kind, x) =>
        playClip(kind === 'notice' ? 'rise' : 'moan', 0.8, (x - this.thingFrom().x) / 6),
      caught: (line) => this.endTrip('caught', line),
    }
  }

  /** Where you are for the thing's sounds (at the door, inside a building). */
  private thingFrom(): { x: number; y: number } {
    const room = roomAt(Math.floor(this.me.x), Math.floor(this.me.y))
    return room ? room.out : this.me
  }

  /** The thing, your unease and your energy, each frame. */
  private updateThing(dt: number, wait: number) {
    const t = this.trip!
    // It hunts once the gate is open (solved on this trip too), and whenever you're lost.
    if (!t.thing && this.solved('P05')) this.wakeThing('start')
    const th = t.thing
    // (It waits while someone is talking to you, or you're reading something.)
    const held = t.enc.busy() || !!t.nora?.busy() || this.ui.dialogueOpen() || this.ui.panelOpen()
    if (th && !held) th.update(th.phase === 'hunt' ? dt * wait : dt)
    if (t.end) return
    // Unease: the thing above all, or a fake beginning to change, or something real starting.
    const want = Math.max(th?.closeness() ?? 0, t.enc.chaseLevel(), t.threats.now?.real ? 0.45 : 0)
    t.unease +=
      (want - t.unease) * Math.min(1, dt * (want > t.unease ? UNEASE_RISE : UNEASE_FALL) * 4)
    this.ui.setGauge('unease', t.unease)
    // Energy: draining all trip, faster lost, hurrying or very uneasy; slower indoors; a little
    // back sitting down to wait.
    if (t.waiting >= 0) t.energy = Math.min(1, t.energy + ENERGY_SIT * dt)
    else {
      let k = 1
      if (this.forest?.lost) k *= ENERGY_LOST
      if (this.me.moving && this.hurrying()) k *= ENERGY_HURRY
      if (t.unease > UNEASY) k *= ENERGY_UNEASY
      if (this.indoors()) k *= ENERGY_INDOORS
      t.energy = Math.max(0, t.energy - ENERGY_DRAIN * k * dt * wait)
    }
    if (!t.energyLow && t.energy < ENERGY_LOW) {
      t.energyLow = true
      this.muse('I’m so tired.', true)
    }
    this.ui.setGauge('energy', t.energy)
  }

  /**
   * The thing is coming for you, or close: nobody else turns up (no rescuers, no other threats, no
   * uncanny moments) on top of it.
   */
  private thingNear(): boolean {
    const th = this.trip?.thing
    return !!th && (th.phase === 'chase' || th.closeness() > 0.55)
  }

  /** Roughly how long your energy will last as things are (ms). */
  private energyLeftMs(): number {
    const t = this.trip
    if (!t) return Infinity
    const k = this.forest?.lost ? ENERGY_LOST : 1
    return (t.energy / (ENERGY_DRAIN * k)) * 1000
  }

  /** Puts one of a meal from your basket in your pocket, for the forest (FOREST.md "Meals"). */
  pocketMeal(id: string) {
    if (this.trip) return this.say('You can’t sort your pocket out here.')
    const key = `meal:${id}`
    if ((this.save.inv[key] ?? 0) <= 0) return
    const pocket = (this.save.pocket ??= [])
    if (pocket.length >= POCKET_SLOTS) {
      if (!pocket.length) delete this.save.pocket
      return this.say('Your pocket is full.')
    }
    this.save.inv[key]--
    if (!this.save.inv[key]) delete this.save.inv[key]
    pocket.push(`meal:${id}`)
    this.say(`You wrap up the ${RECIPES[id].name.toLowerCase()} and put it in your pocket.`)
    this.markDirty()
    this.ui.refresh()
  }

  /** Takes a meal out of your pocket, back into your basket (at home). */
  unpocketMeal(i: number) {
    const it = this.save.pocket?.[i]
    const id = it ? mealOf(it) : null
    if (!id || this.trip) return
    this.save.pocket!.splice(i, 1)
    if (!this.save.pocket!.length) delete this.save.pocket
    this.save.inv[`meal:${id}`] = (this.save.inv[`meal:${id}`] ?? 0) + 1
    this.markDirty()
    this.ui.refresh()
  }

  /** Eats a meal from your pocket (in the forest): energy back, and soup warms you right up. */
  eatMeal(i: number) {
    const t = this.trip
    const it = this.save.pocket?.[i]
    if (!t || !it || !mealOf(it)) return
    this.save.pocket!.splice(i, 1)
    if (!this.save.pocket!.length) delete this.save.pocket
    t.energy = Math.min(1, t.energy + MEAL_ENERGY)
    if (it === 'meal:soup') {
      t.stamina = 1
      t.tired = false
    }
    if (t.energy >= ENERGY_LOW) t.energyLow = false
    this.markDirty()
    this.ui.refresh()
  }

  /** How afraid you are right now, for the heartbeat, the red edge and your light (0–1). */
  dread(): number {
    const t = this.trip
    if (!t || t.end) return 0
    return Math.max(t.enc.chaseLevel(), t.thing?.chaseLevel() ?? 0)
  }

  /** Draws the thing: in your light (`under` the dark), and faintly past it while it comes. */
  private drawThing(ox: number, oy: number, layer: 'under' | 'over') {
    const t = this.trip!
    const th = t.thing
    if (!th || th.phase === 'away' || !th.inView()) return
    // Past your light you only see it coming for you: a pale shape in the dark.
    const seen = layer === 'over' ? (th.phase === 'chase' ? 0.18 + 0.3 * th.chaseLevel() : 0) : 1
    if (seen <= 0) return
    const { cv, flip } = thingFrame(th.dir, Math.floor(th.anim) % 2)
    const px = Math.round(th.x * TS + ox)
    const py = Math.round(th.y * TS + oy)
    const c = this.ctx
    c.save()
    c.globalAlpha *= seen
    c.translate(px, py - cv.height + 4)
    if (flip) c.scale(-1, 1)
    c.drawImage(cv, -cv.width / 2, 0)
    c.restore()
  }

  /** What the forest's people need from the game (src/forest/encounter.ts). */
  private encounterHost(): Host {
    return {
      me: this.me,
      save: this.save,
      blocked: (x, y) => this.blocked(x, y),
      dialogue: (who, lines, opts) => this.ui.dialogue(who, lines, opts),
      closeDialogue: () => this.ui.closeDialogue(),
      compare: (p, onClose) => this.ui.openCompare(p, onClose),
      closePanel: () => this.ui.closePanel(),
      step: (x, y, heavy) => {
        const d = Math.hypot(x - this.me.x, y - this.me.y)
        const pan = (x - this.me.x) / 6
        if (heavy) {
          // Its running footfalls carry further, and thud.
          const v = Math.max(0, 1 - d / 16)
          footstep('leaves', 1.2 * v, pan)
          stomp(v, pan, this.trip?.enc.chaseLevel() ?? 0)
        } else if (d < 10) footstep('leaves', 0.7 * (1 - d / 10), pan)
      },
      end: (kind, line, who) => this.endTrip(kind, line, who),
      depth: () => this.forest?.depth(this.me.x, this.me.y) ?? 0,
      copies: () => this.solved('P05'),
      lost: () => !!this.forest?.lost,
      waiting: () => (this.trip?.waiting ?? -1) >= 0,
      viewR: () => Math.min(this.vw, this.vh) / TS / 2,
      call: (p, wrongSide) => {
        // From where they stand (or, a fake, sometimes from the other side of you), quieter the
        // further off; Nurse Ada whistles, family call your name.
        const dx = wrongSide ? this.me.x - p.x : p.x - this.me.x
        const d = Math.hypot(p.x - this.me.x, p.y - this.me.y)
        const vol = Math.max(0.25, 1 - d / 24)
        uncanny(p.nurse ? 'whistle' : 'name', Math.max(-0.9, Math.min(0.9, dx / 8)), vol)
      },
      quiet: () =>
        !!this.trip &&
        !this.trip.end &&
        !this.ui.panelOpen() &&
        !this.trip.threats.busy() &&
        !this.trip.nora?.busy() &&
        !this.thingNear() &&
        !this.indoors(),
      talking: () => this.ui.dialogueOpen() || this.ui.panelOpen(),
      danger: () => (this.trip?.danger ?? 0) > 0,
      spendDanger: () => {
        if (this.trip) this.trip.danger--
      },
      thought: (text) => window.setTimeout(() => this.ui.thought(text), 1200),
      swell: (stage) => swell(stage),
      play: (name, x, y, volume = 1) => {
        const d = Math.hypot(x - this.me.x, y - this.me.y)
        playClip(name, volume * Math.max(0.35, 1 - d / 20), (x - this.me.x) / 6)
      },
    }
  }

  private renderForest(f: Forest) {
    const c = this.ctx
    const t = this.trip!
    if (t.ride) return this.renderRide(t.ride)
    this.cam.x = Math.round(this.me.x * TS - this.vw / 2)
    this.cam.y = Math.round((this.me.y - 0.5) * TS - this.vh / 2)
    // Caught: the screen shakes as it grabs you, settling as the light goes (not with reduced motion).
    const grab = t.end?.kind === 'caught' ? Math.min(1, t.end.t / CAUGHT_GRAB_MS) : 0
    if (grab > 0 && grab < 1 && !REDUCED_MOTION) {
      const k = CAUGHT_SHAKE * (1 - grab)
      this.cam.x += Math.round((Math.random() * 2 - 1) * k)
      this.cam.y += Math.round((Math.random() * 2 - 1) * k)
    }
    const ox = -this.cam.x
    const oy = -this.cam.y
    perf?.mark('ground')
    c.fillStyle = '#14100c'
    c.fillRect(0, 0, this.vw, this.vh)
    const x0 = Math.floor(this.cam.x / TS) - 3
    const y0 = Math.floor(this.cam.y / TS) - 2
    const x1 = Math.ceil((this.cam.x + this.vw) / TS) + 3
    const y1 = Math.ceil((this.cam.y + this.vh) / TS) + 7
    const chunks = f.chunksIn(x0, y0, x1, y1)
    for (const ch of chunks)
      c.drawImage(chunkGround(ch), ch.cx * CHUNK * TS + ox, ch.cy * CHUNK * TS + oy)
    perf?.mark('objects')
    const list: Drawable[] = []
    for (const ch of chunks)
      for (const o of ch.objects) {
        if (o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1) continue
        const px = o.x * TS + ox
        const py = o.y * TS + oy
        if (flatKind(o)) {
          drawForestObj(c, o, px, py)
          continue
        }
        // Forest trees are taller and closer together: they fade over a wider area round you.
        const dx = this.me.x - (o.x + 0.5)
        const dy = this.me.y - (o.y + 1)
        const see = TALL.has(o.k) && Math.abs(dx) < SEE_THROUGH_W && dy < 0 && dy > -SEE_THROUGH_H
        list.push({
          y: (o.y + 1) * TS - 1,
          draw: () => {
            if (see) c.globalAlpha = SEE_THROUGH
            drawForestObj(c, o, px, py)
            c.globalAlpha = 1
          },
        })
      }
    list.push({
      y: this.me.y * TS,
      draw: () =>
        t.waiting >= 0
          ? this.ctx.drawImage(
              // Sitting among the roots, eyes shut after a moment (no dozing z's out here).
              seatedSprite(this.save.look, t.waiting > WAIT_EYES_MS, 0),
              Math.round(this.me.x * TS + ox) - SPR_W / 2,
              Math.round(this.me.y * TS + oy) - SPR_H + 1,
            )
          : this.drawPerson(
              this.save.look,
              this.me.x,
              this.me.y,
              this.me.dir,
              this.me.anim,
              ox,
              oy,
            ),
    })
    const who = t.enc.person
    if (who) list.push({ y: who.y * TS, draw: () => this.drawForestPerson(who, ox, oy) })
    const bus = t.bus
    if (bus?.visible())
      list.push({
        y: (bus.by + 0.6) * TS,
        draw: () =>
          drawBus(
            c,
            bus.bx * TS + ox,
            (bus.by + 0.6) * TS + oy,
            bus.stage === 'stopped',
            bus.full,
            bus.dir,
            bus.alpha,
          ),
      })
    // The crew walking in through the gate: no shadows, fading.
    for (const w of t.crewWalk)
      list.push({
        y: w.y * TS,
        draw: () => {
          c.globalAlpha = w.a
          c.drawImage(
            personSprite(w.look, 3, Math.floor(w.anim) % 4),
            Math.round(w.x * TS + ox - SPR_W / 2),
            Math.round(w.y * TS + oy - SPR_H + 1),
          )
          c.globalAlpha = 1
        },
      })
    // Nora (story/nora.ts): a real person, with a shadow and her lantern.
    const nora = t.nora
    if (nora?.busy())
      list.push({
        y: nora.y * TS,
        draw: () => {
          const px = Math.round(nora.x * TS + ox)
          const py = Math.round(nora.y * TS + oy)
          c.globalAlpha = nora.a
          if (nora.seated) {
            const spr = seatedSprite(NORA_LOOK, false, 0)
            c.drawImage(spr, px - SPR_W / 2, py - spr.height + 1)
          } else {
            c.fillStyle = 'rgba(0,0,0,0.2)'
            c.fillRect(px - 5, py - 1, 10, 2)
            c.drawImage(
              personSprite(NORA_LOOK, nora.dir, nora.anim > 0 ? Math.floor(nora.anim) % 4 : 0),
              px - SPR_W / 2,
              py - SPR_H + 1,
            )
          }
          c.globalAlpha = 1
        },
      })
    perf?.mark('draw')
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()
    perf?.mark('light')
    drawFog(
      c,
      this.vw,
      this.vh,
      this.cam.x,
      this.cam.y,
      this.time,
      0.6 + 0.4 * t.deep + 1.6 * t.director.fog(),
    )
    const night = darkness(gameHour(this.gameNow())) / NIGHT
    const depth = f.depth(this.me.x, this.me.y)
    const glowsAt: { x: number; y: number; r: number; a: number }[] = []
    // The home's lights, faint through the trees behind you, until you're far enough in.
    if (!f.lost && depth < HOME_GLOW_UNTIL) {
      const hx = 0.5 - f.into.x * 6
      const hy = 0.5 - f.into.y * 6
      glowsAt.push({
        x: hx * TS + ox,
        y: hy * TS + oy,
        r: 6 * TS,
        a: 0.6 * (1 - depth / HOME_GLOW_UNTIL),
      })
    }
    // A searcher's torch out in the dark, sweeping between the trees: steady if they're real,
    // guttering if not.
    const caller = t.enc.person
    if (caller?.phase === 'call') {
      const sweep = Math.sin(this.time / 900) * 1.2
      const a = caller.real
        ? 0.8
        : 0.35 + 0.55 * Math.abs(Math.sin(this.time / 97) * Math.sin(this.time / 233))
      glowsAt.push({
        x: (caller.x + sweep * 0.6) * TS + ox,
        y: (caller.y - 0.8 + Math.cos(this.time / 900) * 0.4) * TS + oy,
        r: 2.6 * TS,
        a,
      })
    }
    // Nora's lantern, steady and warm.
    if (t.nora?.busy())
      glowsAt.push({
        x: (t.nora.x + 0.3) * TS + ox,
        y: (t.nora.y - 0.7) * TS + oy,
        r: 2.4 * TS,
        a: 0.75 * t.nora.a,
      })
    // The bus's headlights, cutting through the trees ahead of it.
    if (t.bus?.visible())
      glowsAt.push({
        x: t.bus.front() * TS + ox,
        y: (t.bus.by - 0.6) * TS + oy,
        r: 3.4 * TS,
        a: 0.85 * t.bus.lights(),
      })
    // A warm light between the trees (an uncanny moment), there and gone.
    const ev = t.director.light
    if (ev) {
      const a = t.director.lightLevel()
      if (a > 0) glowsAt.push({ x: ev.x * TS + ox, y: ev.y * TS + oy, r: 2.2 * TS, a: 0.9 * a })
    }
    // Your light wavers; with something coming for you it shakes and gutters, more as it closes in.
    const fear = this.dread()
    const flicker =
      1 +
      Math.sin(this.time / 310) * 0.02 +
      Math.sin(this.time / 83) * 0.01 -
      fear * CHASE_FLICKER * (0.5 + 0.5 * Math.sin(this.time / 47) * Math.sin(this.time / 113))
    this.drawThreats(t.threats, ox, oy, 'under')
    this.drawThing(ox, oy, 'under')
    this.darkness.draw(
      c,
      this.vw,
      this.vh,
      this.me.x * TS + ox,
      (this.me.y - 0.6) * TS + oy,
      // (Caught: your light collapses to nothing over the grab.)
      this.lightTiles() * TS * flicker * (1 - grab),
      darknessAt(t.deep, night),
      glowsAt,
      // The road and paths stay faintly pale in the dark, so you can see where they go.
      (dc) => {
        dc.globalAlpha = PATH_GLOW
        dc.imageSmoothingEnabled = true
        for (const ch of chunks)
          if (ch.mask)
            dc.drawImage(
              ch.mask,
              ch.cx * CHUNK * TS + ox,
              ch.cy * CHUNK * TS + oy,
              CHUNK * TS,
              CHUNK * TS,
            )
      },
    )
    // The chase: you can make it out even in the dark, a pale shape coming, and the edge of the
    // world goes red as it closes in, pulsing with your heartbeat.
    // (Caught: the red stays at full through the grab.)
    const level = t.end ? (t.end.kind === 'caught' && grab < 1 ? 1 : 0) : this.dread()
    const chased = t.end ? level : t.enc.chaseLevel()
    if (chased > 0 && who) {
      c.globalAlpha = CHASE_SEEN[0] + (CHASE_SEEN[1] - CHASE_SEEN[0]) * chased
      this.drawForestPerson(who, ox, oy, false)
      c.globalAlpha = 1
    }
    // A grinning fake backing off: past your light its grin still shows, hanging in the dark.
    if (who && !who.real && who.grin && chased <= 0 && !t.end) {
      c.globalAlpha = GRIN_GLOW
      this.drawGrin(who, ox, oy, 'pale')
      c.globalAlpha = 1
    }
    this.drawThreats(t.threats, ox, oy, 'over')
    this.drawThing(ox, oy, 'over')
    if (!t.end) this.drawGlints(t.story, ox, oy)
    // Caught by someone: it stays there in front of you as the light goes, drawn over the dark.
    if (t.end?.kind === 'caught' && t.end.who && grab < 1) {
      c.globalAlpha = 1 - grab * grab
      this.drawForestPerson(t.end.who, ox, oy, false)
      c.globalAlpha = 1
    }
    // Caught: straight to black (the jumpscare is over it); otherwise a slow fade.
    // Caught: black once the grab is over (the jumpscare is on top); otherwise a slow fade.
    const black = !t.end
      ? 0
      : t.end.kind === 'caught'
        ? grab >= 1
          ? 1
          : 0
        : Math.min(1, t.end.t / COLLAPSE_FADE_MS)
    const fade = Math.max(this.fade, black)
    if (fade > 0) {
      c.fillStyle = `rgba(8,8,12,${fade})`
      c.fillRect(0, 0, this.vw, this.vh)
    }
    perf?.mark('present')
    const v = this.vctx
    if (this.canvasFilter) v.filter = forestGrade(t.deep, this.deepest())
    v.drawImage(this.scene, 0, 0)
    if (this.canvasFilter) v.filter = 'none'
    // After the grade (which would drain it to grey): the red at the edge, pulsing with your heart.
    if (level > 0) {
      const beat = 0.8 + 0.2 * Math.sin((this.time / (860 - 460 * level)) * Math.PI * 2)
      v.globalAlpha = CHASE_VIGNETTE * level * beat
      v.drawImage(vignette(this.vw, this.vh), 0, 0)
      v.globalAlpha = 1
    }
    perf?.mark('overlay')
    this.renderOverlay()
  }

  /**
   * How far into the deepest forest you are (0–1): only after the empty bus has let you off, as
   * the dark closes in past being lost (LOST_DEEP) towards BUS_DEEP.
   */
  private deepest(): number {
    const t = this.trip
    if (!t?.deeper) return 0
    return Math.max(0, Math.min(1, (t.deep - LOST_DEEP) / (BUS_DEEP - LOST_DEEP)))
  }

  /** On the bus: its inside instead of the forest (story/ride.ts), with the grab if it gets you. */
  private renderRide(ride: Ride) {
    const t = this.trip!
    const c = this.ctx
    const grab = t.end?.kind === 'caught' ? Math.min(1, t.end.t / CAUGHT_GRAB_MS) : 0
    const shake = grab > 0 && grab < 1 && !REDUCED_MOTION ? CAUGHT_SHAKE * (1 - grab) : 0
    ride.draw(c, this.vw, this.vh, this.time, shake)
    // Caught: the light goes as it takes you, then black (the jumpscare is on top).
    const black = t.end?.kind === 'caught' ? (grab >= 1 ? 1 : grab * 0.8) : 0
    const fade = Math.max(this.fade, black)
    if (fade > 0) {
      c.fillStyle = `rgba(8,8,12,${fade})`
      c.fillRect(0, 0, this.vw, this.vh)
    }
    const v = this.vctx
    if (this.canvasFilter) v.filter = forestGrade(Math.min(0.4, t.deep))
    v.drawImage(this.scene, 0, 0)
    if (this.canvasFilter) v.filter = 'none'
    const level = t.end ? (grab < 1 && t.end.kind === 'caught' ? 1 : 0) : ride.dread()
    if (level > 0) {
      const beat = 0.8 + 0.2 * Math.sin((this.time / (860 - 460 * level)) * Math.PI * 2)
      v.globalAlpha = CHASE_VIGNETTE * level * beat
      v.drawImage(vignette(this.vw, this.vh), 0, 0)
      v.globalAlpha = 1
    }
    this.renderOverlay()
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
        const { w } = this.plotSizeOf(slot)
        if (Math.hypot(this.me.x - (o.x + w / 2), this.me.y - (o.y + 1)) > 8) continue
        const p = toScreen(o.x + w / 2, o.y - 0.25)
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
      if (r.p.map === this.mapId && !this.forest)
        people.push({ login: r.p.login, name: r.p.look.name, x: r.rx, y: r.ry, me: false })
    people.push({
      login: this.login,
      name: this.save.look.name,
      x: this.me.x,
      y: this.me.y,
      me: true,
    })
    for (const n of this.npcs())
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
    // The end of a trip: on the black screen, one line, fading in.
    const end = this.trip?.end
    const lineAt = end ? endLineAt(end.kind) - COLLAPSE_FADE_MS * 0.2 : 0
    if (end && end.t > lineAt) {
      c.globalAlpha = Math.min(1, (end.t - lineAt) / 1200)
      c.fillStyle = '#d8d2c8'
      c.font = `italic ${Math.max(16, s * 5)}px ${FONT}`
      c.fillText(end.line, innerWidth / 2, innerHeight / 2)
      c.globalAlpha = 1
    }
  }
}

/** The Route 9 bus at the real stop on the map (story/map.ts BUS_STOP): it drives east along the road. */
function mapBus(): Bus {
  const stop = LANDMARKS.find((l) => l.id === 'BUS_STOP')!.props.find((p) => p.id === 'busstop')!
  return new Bus(stop.x, stop.y, 1, stop.y + 3)
}

/** Where a safe ride lets you off: on the road just outside the camp gate, facing it. */
function campGate(): { x: number; y: number } {
  const sign = LANDMARKS.find((l) => l.id === 'CAMP_GATE')!.props.find((p) => p.id === 'campsign')!
  return { x: sign.x + 2.5, y: sign.y + 3.5 }
}

/** The nearest road, path or clearing tile to (x, y), from the map (or where you came in). */
function nearestPath(x: number, y: number): { x: number; y: number } {
  const L = layout()
  let best = { x: 0.5, y: -1, d: Math.hypot(x - 0.5, y + 1) }
  const cx = Math.floor(x)
  const cy = Math.floor(y)
  for (let r = 1; r <= 40 && best.d > r - 1; r++)
    for (let j = -r; j <= r; j++)
      for (let i = -r; i <= r; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue
        if (L.off(cx + i, cy + j) > 0.5) continue
        const d = Math.hypot(i, j)
        if (d < best.d) best = { x: cx + i + 0.5, y: cy + j + 0.5, d }
      }
  return best
}

/** Wandering off the paths (a warning), and finding one again. */
const OFF_PATH_LINES = ['I’ve lost the path.']
const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]
/** One of several lines, always the same one for the same place. */
const pickAt = (list: readonly string[], x: number, y: number): string =>
  list[(((x * 73856093) ^ (y * 19349663)) >>> 0) % list.length]

/** Something to examine in the forest: a piece of a site, a small find, or footprints. */
type StoryThing =
  | { kind: 'door'; door: Door; side: 'out' | 'in' }
  | { kind: 'part'; part: Spot }
  | { kind: 'find'; find: Find; x: number; y: number }
  | { kind: 'look'; prompt: string; look: string }
  | { kind: 'prints' }

/**
 * The grin, drawn over a fake's face, the person sprite's size: a dark mouth from ear to ear,
 * curling up at the corners, crowded with small pale teeth, and pinprick pale eyes. From behind,
 * the face is on the back of its head (it has turned its head all the way round to keep looking at
 * you). Never side on. `bob` is the walk's bob (the head is a pixel
 * higher on a step). `pale` holds only the teeth and the eyes' glints (drawn over the dark).
 */
const grins = new Map<string, { face: HTMLCanvasElement; pale: HTMLCanvasElement }>()
function grinSprite(dir: Dir, bob: number, skin: number) {
  const key = `${dir}|${bob}|${skin}`
  let g = grins.get(key)
  if (g) return g
  const face = document.createElement('canvas')
  const pale = document.createElement('canvas')
  for (const cv of [face, pale]) {
    cv.width = SPR_W
    cv.height = SPR_H
  }
  const fc = face.getContext('2d')!
  const pc = pale.getContext('2d')!
  const dark = (x: number, y: number, w = 1, h = 1) => {
    fc.fillStyle = '#140c0e'
    fc.fillRect(x, y, w, h)
  }
  const light = (x: number, y: number, w = 1, h = 1) => {
    for (const c of [fc, pc]) {
      c.fillStyle = '#e4dccb'
      c.fillRect(x, y, w, h)
    }
  }
  const y = 9 - bob
  if (dir === 3) {
    // The face, where the back of its head should be.
    fc.fillStyle = SKIN_TONES[skin] ?? SKIN_TONES[0]
    fc.fillRect(5, 5 - bob, 6, 6)
  }
  // Ear to ear, curling sharply up at both ends.
  dark(4, y, 8, 1)
  dark(5, y + 1, 6, 1)
  dark(3, y - 1)
  dark(12, y - 1)
  dark(2, y - 2)
  dark(13, y - 2)
  // Teeth, top and bottom, crowded.
  for (const x of [4, 6, 8, 10]) light(x, y)
  for (const x of [5, 7, 9]) light(x, y + 1)
  // Its eyes: pinpricks of light in the dark of them.
  dark(5, 6 - bob, 2, 2)
  dark(9, 6 - bob, 2, 2)
  light(6, 7 - bob)
  light(9, 7 - bob)
  g = { face, pale }
  grins.set(key, g)
  return g
}

/** Which way each facing points, as a tile step. */
const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  0: { x: 0, y: 1 },
  1: { x: -1, y: 0 },
  2: { x: 1, y: 0 },
  3: { x: 0, y: -1 },
}

/** Objects tall enough to hide you: they fade when you walk behind them. */
const TALL_KINDS = new Set(['tree', 'pine', 'deadtree', 'edgepine', 'edgetree'])

/** The tallest object footprint in tiles (the home): how far above the view to look for objects. */
const MAX_OBJ_H = 8

/** What you see on the black screen when you collapse in the forest. */
const COLLAPSE_LINE = 'You sit down among the roots, just for a moment…'

const vignettes = new Map<string, HTMLCanvasElement>()
/** A dark red edge round the screen, clear in the middle (cached per screen size). */
function vignette(w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}`
  let cv = vignettes.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const c = cv.getContext('2d')!
    const r = Math.hypot(w, h) / 2
    const g = c.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r)
    g.addColorStop(0, 'rgba(130,8,18,0)')
    g.addColorStop(0.55, 'rgba(130,8,18,0.5)')
    g.addColorStop(1, 'rgba(110,4,14,1)')
    c.fillStyle = g
    c.fillRect(0, 0, w, h)
    vignettes.set(key, cv)
  }
  return cv
}

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches

/** When the line appears on the black screen at the end of a trip (ms in). */
function endLineAt(kind: 'collapse' | 'caught' | 'home'): number {
  return kind === 'caught' ? CAUGHT_GRAB_MS + SCARE_MS + COLLAPSE_FADE_MS * 0.2 : COLLAPSE_FADE_MS
}

/** Which way faces the nearest edge of the grounds (for a pet staring at the treeline). */
function facingEdge(x: number, y: number): Dir {
  const g = getGrounds()
  const d = [y, g.h - y, x, g.w - x]
  const i = d.indexOf(Math.min(...d))
  return ([3, 0, 1, 2] as Dir[])[i]
}

const FLAVOR: Record<string, string> = {
  // Keepsakes from the forest, framed.
  keep_nametag: 'HOLLOW PINES CAMP · STAFF. The name scratched off. You wonder whose it was.',
  keep_glasses:
    'Someone’s reading glasses, folded. Not yours. You’re fairly sure they’re not yours.',
  keep_teacup: 'A china teacup. It was still warm when you found it.',
  keep_ticket: 'ROUTE 9 · SINGLE. Never punched.',
  keep_mitten: 'A child’s red mitten. You keep meaning to find out whose it is.',
  bed: 'You fluff the pillows. Maybe a little nap later.',
  nightstand: 'Your reading glasses, a crossword, and a tin of butterscotch.',
  photos: 'The grandkids! They grow up so fast.',
  armchair: 'The comfiest seat in the house.',
  rocker: 'Creak... creak... creak. Lovely.',
  record: 'A little Glenn Miller fills the room.',
  tv: 'The game show is on. You know all the answers.',
  catbed: 'The cat purrs and stretches. Prrrrt.',
  petbed: 'A soft, well-loved bed, with a little dent where someone curls up.',
  fishtank: 'The fish blow you little bubbles.',
  clock: 'Tick... tock... Right on time, as always.',
  piano: 'You play the first few bars of a song you love.',
  puzzle: 'Only 412 pieces left. All sky.',
  basket: 'A scarf for your grandson, nearly finished.',
  bookshelf: 'Mysteries, gardening guides, and a well-loved atlas.',
  fern: 'It could use a little water. You give it some.',
  stove: 'Still warm. Something good was cooked here today.',
}

function inside(it: RoomItem, x: number, y: number): boolean {
  const d = FURNITURE[it.k]
  return x >= it.x && x < it.x + d.w && y >= it.y && y < it.y + d.h
}

/** "Tomato" → "Tomatoes", "Strawberry" → "Strawberries", "Radish" → "Radishes". */
function plural(name: string, n: number): string {
  if (n === 1) return name
  if (/[^aeiou]y$/.test(name)) return `${name.slice(0, -1)}ies`
  if (/(o|sh|ch|s)$/.test(name)) return `${name}es`
  return `${name}s`
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v))
}

function round2(v: number) {
  return Math.round(v * 100) / 100
}

export { DAY_MS, gameHour } from './clock'
const NIGHT = 0.38
const DUSK_RGB = [255, 196, 150]
const NIGHT_RGB = [92, 108, 196]
/** The multiply colour for how far into the night it is (0 day, 1 full night). */
function nightTint(k: number): string {
  const lerp = (a: number[], b: number[], t: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * t))
  const rgb =
    k < 0.4 ? lerp([255, 255, 255], DUSK_RGB, k / 0.4) : lerp(DUSK_RGB, NIGHT_RGB, (k - 0.4) / 0.6)
  return `rgb(${rgb.join(',')})`
}

/**
 * A colour grade over the whole scene, per area. The property is bright and lively; the forest
 * (FOREST.md) will use a drained, darker grade, so the two halves of the game feel different.
 */
export const MOODS = {
  property: 'saturate(1.18) contrast(1.06)',
  forest: 'saturate(0.55) brightness(0.8) contrast(1.1)',
} as const
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

/** A soft round glow (for lamps and lit windows), drawn once per size and colour. */
const glows = new Map<string, HTMLCanvasElement>()
function glowSprite(r: number, [cr, cg, cb]: number[]): HTMLCanvasElement {
  const key = `${r}|${cr},${cg},${cb}`
  let cv = glows.get(key)
  if (!cv) {
    cv = document.createElement('canvas')
    cv.width = cv.height = r * 2
    const c = cv.getContext('2d')!
    const g = c.createRadialGradient(r, r, r / 8, r, r, r)
    g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`)
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
    c.fillStyle = g
    c.fillRect(0, 0, r * 2, r * 2)
    glows.set(key, cv)
  }
  return cv
}

/**
 * Name tags and speech bubbles are drawn once into bitmaps (at the overlay's pixel ratio) and
 * copied each frame: text layout every frame for every label adds up.
 */
const textCache = new Map<
  string,
  { cv: HTMLCanvasElement; w: number; h: number; ax: number; ay: number }
>()
function textSprite(
  key: string,
  dpr: number,
  make: (c: CanvasRenderingContext2D) => {
    w: number
    h: number
    ax: number
    ay: number
    paint: (c: CanvasRenderingContext2D) => void
  },
) {
  let e = textCache.get(key)
  if (!e) {
    if (textCache.size > 300) textCache.clear()
    const cv = document.createElement('canvas')
    const m = make(cv.getContext('2d')!)
    cv.width = Math.ceil(m.w * dpr)
    cv.height = Math.ceil(m.h * dpr)
    const c = cv.getContext('2d')!
    c.scale(dpr, dpr)
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    m.paint(c)
    e = { cv, w: m.w, h: m.h, ax: m.ax, ay: m.ay }
    textCache.set(key, e)
  }
  return e
}

/** Draws a cached sprite so its anchor lands on (x, y), snapped to device pixels. */
function blitText(
  c: CanvasRenderingContext2D,
  e: { cv: HTMLCanvasElement; w: number; h: number; ax: number; ay: number },
  x: number,
  y: number,
  dpr: number,
) {
  const px = Math.round((x - e.ax) * dpr) / dpr
  const py = Math.round((y - e.ay) * dpr) / dpr
  c.drawImage(e.cv, px, py, e.w, e.h)
}

function tag(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fg: string,
  bg: string,
) {
  const dpr = c.getTransform().a || 1
  const font = `700 ${Math.round(size)}px ${FONT}`
  const e = textSprite(`t|${text}|${font}|${fg}|${bg}|${dpr}`, dpr, (m) => {
    m.font = font
    const w = Math.ceil(m.measureText(text).width + size * 0.9)
    const h = Math.ceil(size * 1.45)
    return {
      w,
      h,
      ax: w / 2,
      ay: h / 2,
      paint: (g) => {
        g.font = font
        g.fillStyle = bg
        roundRect(g, 0, 0, w, h, h / 3)
        g.fill()
        g.fillStyle = fg
        g.fillText(text, w / 2, h / 2 + 1)
      },
    }
  })
  blitText(c, e, x, y, dpr)
}

function bubble(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  alpha: number,
) {
  const dpr = c.getTransform().a || 1
  const font = `600 ${Math.round(size)}px ${FONT}`
  const e = textSprite(`b|${text}|${font}|${dpr}`, dpr, (m) => {
    m.font = font
    const lines = wrap(m, text, size * 14)
    const lh = size * 1.25
    const bw = Math.max(...lines.map((l) => m.measureText(l).width)) + size * 1.2
    const bh = lines.length * lh + size * 0.8
    const lw = Math.max(2, size / 6)
    const w = Math.ceil(bw + lw * 2)
    const h = Math.ceil(bh + size * 0.55 + lw * 2)
    return {
      w,
      h,
      // The tail's tip sits size * 0.6 below the bubble; the anchor is where it points.
      ax: w / 2,
      ay: lw + bh + size * 0.6,
      paint: (g) => {
        g.font = font
        paintBubble(g, lines, w / 2, lw + bh + size * 0.6, size, bw, bh, lh)
      },
    }
  })
  c.save()
  c.globalAlpha = alpha
  blitText(c, e, x, y, dpr)
  c.restore()
}

function paintBubble(
  c: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  size: number,
  w: number,
  h: number,
  lh: number,
) {
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
