import {
  ACCESSORIES,
  ACCESSORY_NAMES,
  BODIES,
  BODY_NAMES,
  CROPS,
  CROP_IDS,
  EGG_PRICE,
  FLOORS,
  FURNITURE,
  FURNITURE_IDS,
  HAIR_COLORS,
  HAIR_NAMES,
  HAIR_STYLES,
  OUTFIT_COLORS,
  PET_COATS,
  PET_KINDS,
  PET_NAME_MAX,
  PLOT_SIZES,
  POTTABLE,
  RECIPES,
  RECIPE_IDS,
  TREAT_PACK,
  cookable,
  plantPrice,
  type PetKind,
  PANTS_COLORS,
  SKIN_TONES,
  WALLPAPERS,
  FAMILY_MAX,
  FAMILY_MIN,
  POCKET_SLOTS,
  RELATIONS,
  type Relation,
} from '../shared/catalog'
import {
  INTRO,
  cleanName,
  photoWhere,
  type Dir,
  type Look,
  type MapId,
  type Relative,
} from '../shared/schema'
import { REL, looksOld, randomFamily, randomRelative } from './family'
import { BOARD_SIZE, LEADS, NOTE_MAX, type ClueId } from '../shared/story'
import { CLUES, type Paper, type PaperLine } from './forest/story/clues'
import type { Doc } from './forest/story/docs'
import { KEEPSAKES } from './forest/story/finds'
import { THOUGHT_GAP_MS, THOUGHT_MS, THOUGHT_PER_CHAR } from './forest/tuning'
import type { Person } from './forest/encounter'
import {
  C4_COLS,
  C4_ROWS,
  CK,
  GAME_NAMES,
  c4Drop,
  ckKing,
  ckMoves,
  ckOwner,
  type GameKind,
  type Side,
  type TableState,
} from '../shared/tables'
import { TABLE_PIECES } from './art'
import { cropIcon, finishSwatch, furnitureIcon, mealIcon, photoIcon, plantIcon } from './art'
import { keyIcon } from './forest/story/art'
import { ITEMS } from './forest/story/items'
import { LANDMARKS } from './forest/story/map'
import { drawSiteMap } from './forest/story/sitemap'
import { isMuted, setMuted, sfx, voice } from './audio'
import { isMusicOn, setMusicOn } from './music'
import { fmt, type Game } from './game'
import { INTRO_TASKS, isActive as introActive } from './intro'
import { eggIcon } from './animals'
import { petSprite, treatIcon } from './pets'
import { personSprite } from './people'
import { PORTRAIT, fakePortrait, portrait, type FakeFace, type Mood } from './portraits'

/* The DOM side of the game: HUD, hotbar, chat, toasts and the modal panels. */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { class?: string; text?: string; title?: string; type?: string } = {},
  ...children: (Node | string | null | false)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (props.class) e.className = props.class
  if (props.text !== undefined) e.textContent = props.text
  if (props.title) e.title = props.title
  if (props.type && e instanceof HTMLButtonElement) e.type = props.type as 'button'
  for (const c of children) if (c) e.append(c)
  return e
}

function button(text: string, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  const b = el('button', { class: cls, text, type: 'button' })
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    b.blur() // so Space/Enter go back to the game instead of re-pressing this button
    onClick()
  })
  return b
}

const coinIcon = () => el('span', { class: 'coin', title: 'coins' })

/** A choice offered at the end of a dialogue. */
export interface DialogueChoice {
  label: string
  onPick: () => void
}

/**
 * The illustrated photos papers can show (retirement/photos, by file name without the extension):
 * the second exception to drawing everything in code (retirement/CLAUDE.md). Bundled as URLs, so
 * each loads only when its paper is opened.
 */
const PHOTOS: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../photos/*.{webp,png,jpg}', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  ).map(([path, url]) => [path.replace(/^.*\/|\.[^.]+$/g, ''), url]),
)

export interface DialogueOptions {
  /** Base pitch of the speaker's voice blips (Hz). */
  pitch?: number
  /** Buttons shown once the last line has finished typing. */
  choices?: DialogueChoice[]
  /** Called when the dialogue closes without a choice (after the last line). */
  onDone?: () => void
  /** Who's talking: their portrait is shown on the left. */
  look?: Look
  /** Residents have smile lines; staff don't (see portraits.ts). */
  old?: boolean
  /** A badge on their chest (Nurse Ada always wears her Sunset Acres one). */
  badge?: 'sunset' | 'hollow'
  /** A different eye colour (a fake's tell). */
  eye?: string
  /** A facial expression for the portrait (a real relative you've turned away is hurt). */
  mood?: Mood
  /** An expression per line (falls back to `mood`): people's faces change as they talk. */
  moods?: (Mood | undefined)[]
  /** Marks that tell people apart (portraits.ts): Evie's scar, Nora's mole. */
  scar?: boolean
  mole?: boolean
  /** A fake from the forest: its transformation stage, and whether it never blinks. */
  fake?: FakeFace
  /** Letters type out this slowly (ms each); the forest's fakes slow down as they change. */
  typeMs?: number
  /** The voice blip's waveform (rougher for the fakes). */
  wave?: OscillatorType
  /** How loud the voice blip is (1 is the usual), and how long each one lasts (s). */
  voiceVolume?: number
  voiceMs?: number
  /** 0–1: letters shake and swap places as they type (the fakes, as they give up pretending). */
  garble?: number
}

const TYPE_MS = 24
/**
 * The forest's thoughts type out a little slower than speech; what you see when you look at
 * something types faster (play-testing: it felt slow to read).
 */
const NARR_TYPE_MS = 32
const LOOK_TYPE_MS = 18
/** The chat box in the forest. */
const QUIET = "…you can't hear anyone from here."

export class UI {
  private game!: Game
  private place = el('div', { class: 'place' })
  private clock = el('div', { class: 'clock' })
  private lastClock = ''
  private coins = el('div', { class: 'coins' })
  private saved = el('div', { class: 'saved' })
  private buttons = el('div', { class: 'buttons' })
  private online = el('div', { class: 'online' })
  private prompt = el('div', { class: 'prompt' })
  private hotbar = el('div', { class: 'hotbar' })
  private chatlog = el('div', { class: 'chatlog', title: 'Chat' })
  private chatForm = el('form', { class: 'chatform' })
  private chatInput = el('input')
  private toasts = el('div', { class: 'toasts' })
  private quest = el('div', { class: 'quest' })
  /** The introduction's shortcut (kept as one element so it survives the card's re-renders). */
  private questGrow = button('Finish growing', () => this.game.rushGrowth(), 'btn small quest-grow')
  private lastQuest = ''
  private dialogueBox = el('div', { class: 'dialogue' })
  private talk: {
    who: string
    lines: string[]
    i: number
    shown: number
    timer: number
    opts: DialogueOptions
    text: HTMLElement
    more: HTMLElement
    face: HTMLCanvasElement | null
    faceTimer: number
  } | null = null
  private boardcard = el('div', { class: 'boardcard' })
  private lastBoard = ''
  private resignArmed = false
  private decorbar = el('div', { class: 'decorbar' })
  private backdrop = el('div', { class: 'backdrop' })
  private panel: HTMLElement | null = null
  private lastPrompt: string | null = ''
  private lastOnline = ''

  constructor(root: HTMLElement) {
    this.chatInput.maxLength = 140
    this.chatInput.placeholder = 'Say something nice… (Enter to send, Esc to cancel)'
    this.chatInput.setAttribute('aria-label', 'Chat message')
    this.chatForm.append(this.chatInput)
    this.chatForm.hidden = true
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault()
      const text = this.chatInput.value
      this.chatInput.value = ''
      this.closeChat()
      if (text.trim()) this.game.sendChat(text)
    })
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.chatInput.value = ''
        this.closeChat()
      }
      e.stopPropagation()
    })
    this.backdrop.hidden = true
    this.backdrop.addEventListener('mousedown', (e) => {
      if (e.target === this.backdrop) this.closePanel()
    })
    this.decorbar.hidden = true
    this.boardcard.hidden = true
    this.boardcard.setAttribute('role', 'region')
    this.boardcard.setAttribute('aria-label', 'Games table')
    this.quest.hidden = true
    this.quest.setAttribute('aria-live', 'polite')
    this.dialogueBox.hidden = true
    this.dialogueBox.setAttribute('role', 'dialog')
    this.dialogueBox.addEventListener('mousedown', (e) => {
      e.stopPropagation()
      if (!(e.target instanceof HTMLButtonElement)) this.advanceDialogue()
    })
    root.append(
      el(
        'div',
        { class: 'hud-left' },
        this.place,
        this.clock,
        el('div', { class: 'row' }, this.coins, this.saved),
      ),
      this.quest,
      el('div', { class: 'hud-right' }, this.buttons, this.online),
      this.boardcard,
      this.toasts,
      this.narration,
      this.prompt,
      this.hotbar,
      this.chatlog,
      this.chatForm,
      this.decorbar,
      this.dialogueBox,
      this.backdrop,
    )
  }

  /** The stamina bar (in the forest only; null hides it). */
  private stamina = (() => {
    const bar = el('div', { class: 'stamina', title: 'Stamina: hurrying (Shift) uses it up' })
    bar.append(el('div'))
    bar.hidden = true
    bar.setAttribute('role', 'meter')
    bar.setAttribute('aria-label', 'Stamina')
    return bar
  })()
  private lastStamina = ''

  /** The stamina gauge's place in the hotbar, beside your pocket. */
  private staminaBox = el(
    'div',
    { class: 'stamina-box' },
    el('span', { class: 'label', text: 'Stamina' }),
    this.stamina,
  )

  setStamina(v: number | null, tired: boolean) {
    const key = v === null ? 'off' : `${Math.round(v * 50)}|${tired}`
    if (key === this.lastStamina) return
    this.lastStamina = key
    const show = v !== null
    if (show === this.stamina.hidden) {
      // Shown in the forest only: the hotbar makes room for it (or closes up again).
      this.stamina.hidden = !show
      this.renderHotbar()
    }
    if (v === null) return
    ;(this.stamina.firstElementChild as HTMLElement).style.height = `${Math.round(v * 100)}%`
    this.stamina.classList.toggle('tired', tired)
    this.stamina.setAttribute('aria-valuenow', String(Math.round(v * 100)))
  }

  /**
   * Holding the photo up to the person in front of you (FOREST.md "Carrying the family photo"):
   * the photo on one side, their face (as it is now, tells and all) on the other.
   */
  openCompare(p: Person, onClose: () => void) {
    const g = this.game
    const fam = g.save.family
    if (!fam) return onClose()
    const face = el('canvas', { class: 'family-face' })
    face.width = PORTRAIT
    face.height = PORTRAIT
    face.setAttribute('aria-hidden', 'true')
    const opts = { old: false, badge: p.badge, eye: p.eye }
    face
      .getContext('2d')!
      .drawImage(
        p.real
          ? portrait(p.look, opts)
          : fakePortrait(p.look, opts, { stage: p.stage, noBlink: p.tells.has('blink') }),
        0,
        0,
      )
    const done = button(
      'Put it away',
      () => {
        this.closePanel()
        onClose()
      },
      'btn primary',
    )
    const card = familyCard(fam.members, '', [done])
    card.querySelector('h2')!.textContent = 'You hold the photo up to your light'
    card.insertBefore(
      el(
        'div',
        { class: 'compare' },
        el(
          'div',
          { class: 'who-now' },
          face,
          el('strong', { text: p.nurse ? `Nurse ${p.name}` : p.name }),
          el('span', { text: `calls you "${p.calls}"` }),
          el('span', {
            class: 'muted',
            text: 'They keep talking while you look. Your light flickers.',
          }),
        ),
      ),
      card.querySelector('.family-faces'),
    )
    this.showPanel(card, false)
  }

  attach(game: Game) {
    this.game = game
  }

  // --- HUD ----------------------------------------------------------------------------------

  refresh() {
    const g = this.game
    this.place.textContent = g.placeName()
    this.coins.replaceChildren(
      coinIcon(),
      document.createTextNode(` ${g.save.coins.toLocaleString()}`),
    )
    this.renderButtons()
    this.renderHotbar()
    this.renderDecorbar()
    this.refreshOnline()
    this.renderQuest()
    this.renderTable()
  }

  /** Nurse Ada's checklist, shown while the introduction is running (after her greeting). */
  renderQuest() {
    const g = this.game
    const step = g.save.intro
    if (step === undefined || step === INTRO.greet || g.slot < 0) {
      this.quest.hidden = true
      this.lastQuest = ''
      return
    }
    const hint = g.introHint()
    const rush = g.canRushGrowth()
    const key = `${step}|${hint}|${rush}`
    if (key === this.lastQuest) return
    this.lastQuest = key
    this.quest.hidden = false
    const now = INTRO_TASKS.find((t) => t.step === step)
    const done = INTRO_TASKS.filter((t) => t.step < step).length
    this.quest.replaceChildren(
      el(
        'div',
        { class: 'quest-title' },
        el('span', { text: "Nurse Ada's list" }),
        el('span', { class: 'quest-count', text: `${done} of ${INTRO_TASKS.length} done` }),
      ),
      el('div', { class: 'quest-task', text: now?.label ?? '' }),
      el('div', { class: 'quest-hint', text: hint }),
      rush ? this.questGrow : '',
    )
  }

  // --- games tables ---------------------------------------------------------------------------

  inBoard(target: EventTarget | null): boolean {
    return target instanceof Node && this.boardcard.contains(target)
  }

  /**
   * The board card, shown while you sit at a games table (or stand watching one): who's playing,
   * whose turn it is, the board, and buttons to start a game or resign. Rebuilt only on change.
   */
  renderTable() {
    const g = this.game
    const v = g.tableView()
    if (!v) {
      this.boardcard.hidden = true
      this.lastBoard = ''
      this.resignArmed = false
      return
    }
    const t = v.state
    const canStart = g.canStartTable()
    const key = JSON.stringify([
      v.id,
      t?.version,
      v.side,
      v.seated,
      v.busy,
      g.tableSel,
      canStart,
      this.resignArmed,
    ])
    if (key === this.lastBoard) return
    const hadFocus = this.boardcard.contains(document.activeElement)
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset?.key
    this.lastBoard = key
    this.boardcard.hidden = false

    const me = g.login
    const playing = t && !t.result && t.players.includes(me) && v.side !== null
    const mySide: Side | null = t && t.players[0] === me ? 0 : t && t.players[1] === me ? 1 : null
    const live =
      t && !t.result && (t.players[0] === v.seated[0]?.login || t.players[1] === v.seated[1]?.login)
    const showGame = t && (t.result || live || !canStart)

    // Who sits where: the game's players if one is on, else whoever is on the stools.
    const who = (side: Side) => {
      const name = showGame && t ? t.names[side] : (v.seated[side]?.name ?? null)
      const login = showGame && t ? t.players[side] : v.seated[side]?.login
      const chip = el('div', {
        class: `bc-player${t && showGame && !t.result && t.turn === side ? ' turn' : ''}`,
      })
      if (showGame && t) {
        const dot = el('span', { class: 'bc-dot' })
        dot.style.background = pieceColor(t.game, side, t.first)
        chip.append(dot)
      }
      chip.append(
        el('span', {
          text: name ? `${name}${login === me ? ' (you)' : ''}` : 'Empty stool',
          class: name ? '' : 'bc-empty',
        }),
      )
      return chip
    }

    const status = el('div', { class: 'bc-status' })
    status.setAttribute('aria-live', 'polite')
    status.textContent = this.tableStatus(
      v.seated,
      t,
      showGame ? t : null,
      mySide,
      canStart,
      v.side,
    )

    const body: (HTMLElement | null)[] = [
      el(
        'div',
        { class: 'bc-head' },
        el('strong', { text: showGame && t ? GAME_NAMES[t.game] : 'Games table' }),
        v.side === null
          ? button(
              'Stop watching',
              () => {
                g.watching = null
                this.renderTable()
              },
              'btn small',
            )
          : el('span', { class: 'bc-hint', text: 'WASD to get up' }),
      ),
      el(
        'div',
        { class: 'bc-players' },
        who(0),
        el('span', { class: 'bc-vs', text: 'vs' }),
        who(1),
      ),
      status,
    ]
    if (showGame && t) body.push(this.boardEl(t, playing ? mySide : null, v.busy))

    const controls = el('div', { class: 'bc-controls' })
    if (v.side !== null && canStart) {
      for (const game of ['connect4', 'checkers'] as GameKind[])
        controls.append(
          button(
            t && t.result && t.game === game
              ? `Rematch: ${GAME_NAMES[game]}`
              : `Play ${GAME_NAMES[game]}`,
            () => void g.tableAction({ type: 'start', game }),
            'btn primary',
          ),
        )
    }
    if (t && !t.result && mySide !== null) {
      controls.append(
        button(
          this.resignArmed ? 'Really resign?' : 'Resign',
          () => {
            if (!this.resignArmed) {
              this.resignArmed = true
              window.setTimeout(() => {
                this.resignArmed = false
                this.renderTable()
              }, 4000)
              return this.renderTable()
            }
            this.resignArmed = false
            void g.tableAction({ type: 'resign' })
          },
          `btn${this.resignArmed ? ' danger' : ' quiet'}`,
        ),
      )
    }
    if (v.busy) for (const b of controls.querySelectorAll('button')) b.disabled = true
    if (controls.childElementCount) body.push(controls)
    this.boardcard.replaceChildren(...body.filter((b): b is HTMLElement => !!b))
    if (hadFocus && focusKey)
      this.boardcard.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus()
  }

  private tableStatus(
    seated: [{ login: string; name: string } | null, { login: string; name: string } | null],
    t: TableState | null,
    shown: TableState | null,
    mySide: Side | null,
    canStart: boolean,
    seatSide: Side | null,
  ): string {
    const me = this.game.login
    if (shown && shown.result) {
      const r = shown.result
      if (r.winner === null) return "It's a draw. Well played, both!"
      const winner = shown.players[r.winner] === me ? 'You win' : `${shown.names[r.winner]} wins`
      const loser = shown.names[r.winner === 0 ? 1 : 0]
      if (r.why === 'resign')
        return `${shown.players[r.winner === 0 ? 1 : 0] === me ? 'You' : loser} resigned. ${winner}!`
      return `${winner}!`
    }
    if (shown) {
      const turnName =
        shown.players[shown.turn] === me ? 'Your turn' : `${shown.names[shown.turn]}'s turn`
      if (mySide !== null && shown.turn === mySide && seated[mySide]?.login !== me)
        return 'Sit back down on your stool to carry on.'
      if (shown.game === 'checkers' && shown.turn === mySide) {
        const moves = ckMoves(shown.board, mySide)
        if (moves.some((m) => m.length > 2 || Math.abs(m[1] - m[0]) > CK + 1))
          return 'Your turn: you must jump!'
      }
      if (shown.game === 'connect4') return `${turnName}: drop a counter in a column.`
      return turnName
    }
    if (seatSide === null) return t ? 'The last game has finished.' : 'Nobody is playing just now.'
    if (!seated[0] || !seated[1]) return 'Waiting for someone to sit opposite…'
    return canStart ? 'Pick a game to play.' : ''
  }

  /** The board itself: Connect 4 columns, or a checkerboard turned so your pieces are nearest you. */
  private boardEl(t: TableState, mySide: Side | null, busy: boolean): HTMLElement {
    const g = this.game
    const myTurn = mySide !== null && t.turn === mySide && !busy
    const win = t.result?.why === 'win' ? new Set(t.last) : new Set<number>()
    const last = new Set(t.last)
    const piece = (side: number, king: boolean, extra = '') => {
      const p = el('span', { class: `bc-piece${king ? ' king' : ''}${extra}` })
      p.style.background = pieceColor(t.game, side as Side, t.first)
      return p
    }
    const sideName = (side: number) => (t.players[side] === g.login ? 'yours' : t.names[side])

    if (t.game === 'connect4') {
      const grid = el('div', { class: 'bc-c4' })
      for (let c = 0; c < C4_COLS; c++) {
        const open = c4Drop(t.board, c) >= 0
        const col = button('', () => void g.tableAction({ type: 'move', path: [c] }), 'bc-col')
        col.dataset.key = `c${c}`
        col.disabled = !myTurn || !open
        col.setAttribute('aria-label', `Column ${c + 1}${open ? '' : ', full'}`)
        // Keep focus on the board for keyboard play (button() blurs on click).
        col.addEventListener('click', () => col.focus())
        for (let r = 0; r < C4_ROWS; r++) {
          const i = r * C4_COLS + c
          const v = t.board[i]
          const cell = el('span', { class: 'bc-hole' })
          if (v)
            cell.append(piece(v - 1, false, `${win.has(i) ? ' win' : last.has(i) ? ' last' : ''}`))
          col.append(cell)
        }
        grid.append(col)
      }
      return grid
    }

    const moves = myTurn ? ckMoves(t.board, mySide) : []
    const sel = g.tableSel
    const nextSteps = new Set<number>()
    const movable = new Set<number>()
    for (const m of moves) {
      movable.add(m[0])
      if (sel.length && m.length > sel.length && sel.every((sq, i) => m[i] === sq))
        nextSteps.add(m[sel.length])
    }
    const grid = el('div', { class: 'bc-ck' })
    // Turned round for the player on side 1, so your own pieces are at the bottom.
    const flip = mySide === 1
    for (let rr = 0; rr < CK; rr++)
      for (let cc = 0; cc < CK; cc++) {
        const r = flip ? CK - 1 - rr : rr
        const c = flip ? CK - 1 - cc : cc
        const i = r * CK + c
        const dark = (r + c) % 2 === 1
        const v = t.board[i]
        const owner = ckOwner(v)
        const canPick = myTurn && movable.has(i) && sel.length <= 1
        const canLand = nextSteps.has(i)
        const cls = `bc-sq ${dark ? 'dark' : 'light'}${sel.includes(i) ? ' sel' : ''}${canLand ? ' to' : ''}${canPick ? ' can' : ''}${last.has(i) && !sel.length ? ' last' : ''}`
        if (!dark || (!canPick && !canLand)) {
          const sq = el('span', { class: cls })
          if (owner !== -1) sq.append(piece(owner, ckKing(v)))
          if (owner !== -1) sq.title = `${sideName(owner)}${ckKing(v) ? ' (king)' : ''}`
          grid.append(sq)
          continue
        }
        const sq = button(
          '',
          () => {
            if (canLand) {
              const path = [...sel, i]
              const exact = moves.some(
                (m) => m.length === path.length && m.every((s, k) => s === path[k]),
              )
              if (exact) return void g.tableAction({ type: 'move', path })
              g.tableSel = path
            } else g.tableSel = sel.length === 1 && sel[0] === i ? [] : [i]
            this.renderTable()
            this.boardcard.querySelector<HTMLElement>(`[data-key="s${i}"]`)?.focus()
          },
          cls,
        )
        sq.dataset.key = `s${i}`
        sq.setAttribute(
          'aria-label',
          `${String.fromCharCode(97 + c)}${CK - r}: ${canLand ? 'move here' : `your ${ckKing(v) ? 'king' : 'piece'}`}`,
        )
        if (owner !== -1) sq.append(piece(owner, ckKing(v)))
        grid.append(sq)
      }
    return grid
  }

  // --- dialogue -------------------------------------------------------------------------------

  dialogueOpen(): boolean {
    return this.talk !== null
  }

  /**
   * A framed speech box at the bottom of the screen: the speaker's portrait and name on the left,
   * the text on the right, typing out with a voice blip per letter while the portrait talks.
   */
  dialogue(who: string, lines: string[], opts: DialogueOptions = {}) {
    this.closeDialogue()
    this.game?.keys.clear()
    const text = el('p', { class: 'dialogue-text' })
    text.setAttribute('aria-live', 'polite')
    const more = el('div', { class: 'dialogue-more' })
    let face: HTMLCanvasElement | null = null
    let side: HTMLElement | null = null
    if (opts.look) {
      face = el('canvas', { class: 'dialogue-face' })
      face.width = PORTRAIT
      face.height = PORTRAIT
      face.setAttribute('aria-hidden', 'true')
      side = el(
        'div',
        { class: 'dialogue-side' },
        el('div', { class: 'dialogue-frame' }, face),
        el('div', { class: 'dialogue-name', text: who }),
      )
    }
    this.dialogueBox.replaceChildren(
      ...(side ? [side] : []),
      el(
        'div',
        { class: 'dialogue-body' },
        side ? null : el('div', { class: 'dialogue-who', text: who }),
        text,
        more,
      ),
    )
    this.dialogueBox.setAttribute('aria-label', `${who} says`)
    this.talk = { who, lines, i: 0, shown: 0, timer: 0, opts, text, more, face, faceTimer: 0 }
    this.dialogueBox.hidden = false
    if (face) this.animateFace()
    this.showLine()
  }

  /** Mouth moves while the text is typing; an occasional blink. */
  private animateFace() {
    const t = this.talk
    if (!t?.face || !t.opts.look) return
    const look = t.opts.look
    const c = t.face.getContext('2d')!
    let tick = 0
    let blinkAt = 20 + Math.floor(Math.random() * 30)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = () => {
      if (this.talk !== t) return
      const typing = t.shown < t.lines[t.i].length
      const talk = !reduce && typing && tick % 4 < 2
      const blink = !reduce && tick >= blinkAt && tick < blinkAt + 2
      if (tick >= blinkAt + 2) blinkAt = tick + 25 + Math.floor(Math.random() * 35)
      c.clearRect(0, 0, PORTRAIT, PORTRAIT)
      // Nurse Ada always wears her Sunset Acres badge, so you know it when you see the other one.
      const badge = t.opts.badge ?? (t.who === 'Nurse Ada' ? 'sunset' : undefined)
      const o = {
        old: t.opts.old,
        talk,
        blink,
        badge,
        eye: t.opts.eye,
        mood: t.opts.moods?.[t.i] ?? t.opts.mood,
        scar: t.opts.scar,
        mole: t.opts.mole,
      }
      c.drawImage(t.opts.fake ? fakePortrait(look, o, t.opts.fake) : portrait(look, o), 0, 0)
      tick++
    }
    draw()
    t.faceTimer = window.setInterval(draw, 90)
  }

  private showLine() {
    const t = this.talk
    if (!t) return
    window.clearInterval(t.timer)
    t.shown = 0
    t.more.replaceChildren()
    t.more.className = 'dialogue-more'
    const line = t.lines[t.i]
    t.text.setAttribute('aria-label', line)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      t.shown = line.length
      this.paintLine()
      return
    }
    t.timer = window.setInterval(() => {
      if (!this.talk || this.talk !== t) return
      t.shown++
      const ch = line[t.shown - 1]
      if (ch && /[a-z0-9]/i.test(ch) && t.shown % 2 === 1)
        voice(t.opts.pitch ?? 440, t.opts.wave, t.opts.voiceVolume, t.opts.voiceMs)
      this.paintLine()
      if (t.shown >= line.length) window.clearInterval(t.timer)
    }, t.opts.typeMs ?? TYPE_MS)
    this.paintLine()
  }

  private paintLine() {
    const t = this.talk
    if (!t) return
    const line = t.lines[t.i]
    const done = t.shown >= line.length
    const { text, more } = t
    const shown = line.slice(0, t.shown)
    const garble = t.opts.garble ?? 0
    text.textContent = garble > 0 ? scramble(shown, garble) : shown
    text.classList.toggle('shake', garble > 0)
    text.style.setProperty('--shake', `${Math.round(garble * 3)}px`)
    const last = t.i === t.lines.length - 1
    if (!done) {
      more.replaceChildren()
      return
    }
    if (last && t.opts.choices?.length) {
      if (more.querySelector('button')) return
      more.className = 'dialogue-choices'
      more.replaceChildren(
        ...t.opts.choices.map((c, n) =>
          button(
            c.label,
            () => {
              this.closeDialogue()
              c.onPick()
            },
            n === 0 ? 'btn primary' : 'btn',
          ),
        ),
      )
      more.querySelector<HTMLButtonElement>('button')?.focus()
    } else {
      more.className = 'dialogue-more'
      more.textContent = last ? 'E ✕' : 'E ▾'
      more.title = last ? 'Press E to close' : 'Press E for more'
    }
  }

  /** E / Space / a click: finish typing the line, or go on to the next one. */
  advanceDialogue() {
    const t = this.talk
    if (!t) return
    const line = t.lines[t.i]
    if (t.shown < line.length) {
      window.clearInterval(t.timer)
      t.shown = line.length
      this.paintLine()
      return
    }
    if (t.i < t.lines.length - 1) {
      t.i++
      sfx('blip')
      this.showLine()
      return
    }
    if (t.opts.choices?.length) return // waiting for a choice
    this.closeDialogue()
    t.opts.onDone?.()
  }

  /** Keys while a dialogue is open. Returns true if the key was used. */
  dialogueKey(e: KeyboardEvent): boolean {
    const t = this.talk
    if (!t) return false
    const k = e.key.toLowerCase()
    const buttons = [...this.dialogueBox.querySelectorAll<HTMLButtonElement>('button')]
    if (buttons.length) {
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
      if (['arrowleft', 'arrowup', 'arrowright', 'arrowdown', 'tab'].includes(k)) {
        e.preventDefault()
        const back = k === 'arrowleft' || k === 'arrowup' || (k === 'tab' && e.shiftKey)
        const next = (Math.max(0, at) + (back ? -1 : 1) + buttons.length) % buttons.length
        buttons[next].focus()
        return true
      }
      if (k === 'e' || k === ' ' || k === 'enter') {
        e.preventDefault()
        if (!e.repeat) (buttons[at] ?? buttons[0]).click()
        return true
      }
      return true
    }
    if (k === 'e' || k === ' ' || k === 'enter') {
      e.preventDefault()
      if (!e.repeat) this.advanceDialogue()
      return true
    }
    if (k === 'escape') {
      // Skip to the end of the conversation.
      window.clearInterval(t.timer)
      t.i = t.lines.length - 1
      t.shown = t.lines[t.i].length
      if (!t.opts.choices?.length) {
        this.closeDialogue()
        t.opts.onDone?.()
      } else this.showLineDone()
      return true
    }
    // Movement keys are swallowed so you don't walk off mid-sentence.
    return true
  }

  private showLineDone() {
    const t = this.talk
    if (!t) return
    this.showLine()
    window.clearInterval(t.timer)
    t.shown = t.lines[t.i].length
    this.paintLine()
  }

  closeDialogue() {
    if (this.talk) {
      window.clearInterval(this.talk.timer)
      window.clearInterval(this.talk.faceTimer)
    }
    this.talk = null
    this.dialogueBox.hidden = true
    this.dialogueBox.replaceChildren()
  }

  private renderButtons() {
    const g = this.game
    const b: HTMLButtonElement[] = []
    if (g.inOwnRoom()) {
      const catalog = button('Catalog', () => this.openCatalog())
      if (introActive(g.save) && g.save.intro === INTRO.buy) {
        catalog.classList.add('glow')
        catalog.title = "Nurse Ada's list: buy something for your room"
      }
      b.push(catalog)
      b.push(
        button(g.decor.active ? 'Done decorating' : 'Decorate', () =>
          g.decor.active ? g.endDecorate() : g.startDecorate(),
        ),
      )
    }
    b.push(button('Wardrobe', () => this.openWardrobe()))
    b.push(
      button(isMuted() ? 'Sound: off' : 'Sound: on', () => {
        setMuted(!isMuted())
        this.renderButtons()
      }),
    )
    b.push(
      button(isMusicOn() ? 'Music: on' : 'Music: off', () => {
        setMusicOn(!isMusicOn())
        this.renderButtons()
      }),
    )
    b.push(button('Help', () => this.openHelp()))
    this.buttons.replaceChildren(...b)
  }

  private renderHotbar() {
    const g = this.game
    const slots = CROP_IDS.map((id, i) => {
      const n = g.save.inv[`seed:${id}`] ?? 0
      // Potted plants you dug up are planted from the same slot (before any seeds).
      const pots = g.save.inv[`plant:${id}`] ?? 0
      const s = el(
        'button',
        {
          class: `slot${g.selectedSeed === id ? ' selected' : ''}${n || pots ? '' : ' empty'}`,
          title: `${CROPS[id].name} seeds (${i + 1})${pots ? `, and ${pots} potted plant${pots > 1 ? 's' : ''} to replant first` : ''}`,
          type: 'button',
        },
        el('span', { class: 'key', text: String(i + 1) }),
        cropIcon(id, false),
        el('span', { class: 'count', text: pots ? `${n}+${pots}` : String(n) }),
      )
      s.addEventListener('click', () => {
        s.blur()
        g.selectSeed(id)
      })
      return s
    })
    const produce = CROP_IDS.filter((id) => (g.save.inv[`crop:${id}`] ?? 0) > 0).map((id) =>
      el(
        'span',
        { class: 'produce', title: CROPS[id].name },
        cropIcon(id, true, 24),
        el('span', { text: `×${g.save.inv[`crop:${id}`]}` }),
      ),
    )
    for (const id of POTTABLE) {
      const n = g.save.inv[`plant:${id}`] ?? 0
      if (n)
        produce.push(
          el(
            'span',
            {
              class: 'produce',
              title: `Potted ${CROPS[id].name.toLowerCase()} plant (pick its seeds and plant it, or sell it to Chef Rosa)`,
            },
            plantIcon(id, 24),
            el('span', { text: `×${n}` }),
          ),
        )
    }
    for (const id of RECIPE_IDS) {
      const n = g.save.inv[`meal:${id}`] ?? 0
      if (n)
        produce.push(
          el(
            'span',
            {
              class: 'produce',
              title: `${RECIPES[id].name} (you cooked it; Chef Rosa buys meals)`,
            },
            mealIcon(id, 24),
            el('span', { text: `×${n}` }),
          ),
        )
    }
    const eggs = g.save.inv.egg ?? 0
    if (eggs)
      produce.push(
        el(
          'span',
          { class: 'produce', title: 'Eggs (Chef Rosa buys them)' },
          eggIcon(22),
          el('span', { text: `×${eggs}` }),
        ),
      )
    const treats = g.save.inv.treat ?? 0
    if (treats)
      produce.push(
        el(
          'span',
          { class: 'produce', title: 'Pet treats (F to give one)' },
          treatIcon(24),
          el('span', { text: `×${treats}` }),
        ),
      )
    const water = g.nearMyPlot()
      ? button(
          'Water all',
          () => {
            const n = g.waterAll()
            this.toast(
              n ? `Watered ${n} plant${n > 1 ? 's' : ''}.` : 'Everything is already watered.',
            )
            this.renderHotbar()
          },
          'btn water',
        )
      : null
    // Your pocket: the photo, keys from home, and keys picked up this trip (not yours until home).
    const pocket = [...(g.save.pocket ?? []), ...(g.trip?.story.carried ?? [])]
    const pocketSlots = Array.from({ length: POCKET_SLOTS }, (_, i) => {
      const it = pocket[i]
      if (it && it !== 'photo') {
        const item = ITEMS[it]
        const k = el('span', { class: 'slot pocket-slot' })
        k.title = item.name.replace(/^the /, 'The ')
        k.setAttribute('aria-label', k.title)
        k.append(keyIcon(item.tag, 36))
        return k
      }
      if (it === 'photo') {
        const b = button('', () => this.openPhoto(), 'slot pocket-slot')
        b.title = 'Your family photo (click to look at it)'
        b.setAttribute('aria-label', 'Your family photo: look at it')
        b.append(
          photoIcon(
            (g.save.family?.members ?? []).map((m) => m.look),
            36,
          ),
        )
        return b
      }
      return el('span', { class: 'slot pocket-slot empty', title: 'Empty pocket' })
    })
    this.hotbar.replaceChildren(
      el('div', { class: 'seeds' }, el('span', { class: 'label', text: 'Seeds' }), ...slots),
      // The pocket shows once you have something worth carrying (your family photo).
      ...(g.save.family || pocket.length
        ? [
            el(
              'div',
              { class: 'pocket' },
              el('span', { class: 'label', text: 'Pocket' }),
              ...pocketSlots,
            ),
          ]
        : []),
      ...(this.stamina.hidden ? [] : [this.staminaBox]),
      ...(g.trip?.story
        ? [this.notepadButton(g.trip.story.found.size + g.trip.story.kept.size)]
        : []),
      el(
        'div',
        { class: 'bag' },
        el('span', { class: 'label', text: 'Basket' }),
        ...(produce.length ? produce : [el('span', { class: 'muted', text: 'empty' })]),
      ),
      ...(water ? [water] : []),
    )
  }

  /** The notepad in the hotbar (in the forest): how many things you've found this trip. */
  private notepadButton(n: number): HTMLElement {
    const b = button('', () => this.openNotepad(), 'slot notepad-slot')
    b.title = 'Your notepad (N): what you’ve found this trip'
    b.setAttribute('aria-label', `Notepad: ${n} thing${n === 1 ? '' : 's'} found this trip`)
    b.append(
      el('span', { class: 'key', text: 'N' }),
      el('span', { class: 'pad' }),
      el('span', { class: 'count', text: String(n) }),
    )
    return el('div', { class: 'notepad-box' }, el('span', { class: 'label', text: 'Notepad' }), b)
  }

  private lastNear = false
  setPrompt(text: string | null) {
    const near = this.game.nearMyPlot()
    if (near !== this.lastNear) {
      this.lastNear = near
      this.renderHotbar()
    }
    if (text === this.lastPrompt) return
    this.lastPrompt = text
    this.prompt.hidden = !text
    if (text) {
      // Each "[Key]" is shown as a key cap; text that doesn't start with one is for E. A second
      // action goes after a " · ", e.g. "Water the Tomato · [X] Dig up".
      const parts = text.split(/\[([^\]]+)\] ?/)
      const nodes: Node[] = []
      if (parts[0]) nodes.push(el('kbd', { text: 'E' }), document.createTextNode(` ${parts[0]}`))
      for (let i = 1; i < parts.length; i += 2)
        nodes.push(el('kbd', { text: parts[i] }), document.createTextNode(` ${parts[i + 1] ?? ''}`))
      this.prompt.replaceChildren(...nodes)
    }
  }

  setClock(text: string) {
    if (text === this.lastClock) return
    this.lastClock = text
    this.clock.textContent = text
  }

  setSaved(ok: boolean) {
    this.saved.textContent = ok ? 'Saved' : 'Not saved yet, retrying…'
    this.saved.classList.toggle('warn', !ok)
    if (ok) {
      this.saved.classList.add('flash')
      setTimeout(() => this.saved.classList.remove('flash'), 1200)
    }
  }

  private connected = true
  setOnline(ok: boolean) {
    if (ok === this.connected) return
    this.connected = ok
    if (!ok) this.toast('Lost touch with the other residents. Reconnecting…')
    this.refreshOnline()
  }

  private mapName(map: MapId): string {
    if (map === 'grounds') return 'outside'
    if (map === 'hall') return 'hallway'
    if (map === 'infirmary') return 'the infirmary'
    // Friends notice you're gone, but not where (FOREST.md "Alone in the forest").
    if (map === 'forest') return 'wandered off…'
    const owner = map.slice(5)
    if (owner === this.game.login) return 'your room'
    return `${this.game.profiles.get(owner)?.look.name ?? owner}'s room`
  }

  refreshOnline() {
    const g = this.game
    const players = g.onlinePlayers()
    const key = `${this.connected}|${players.map((p) => `${p.login}:${p.map}:${p.look.name}`).join(',')}`
    if (key === this.lastOnline) return
    this.lastOnline = key
    const items = players.map((p) =>
      el(
        'li',
        {},
        el('strong', { text: p.look.name }),
        el('span', { text: ` · ${this.mapName(p.map)}` }),
      ),
    )
    this.online.replaceChildren(
      el('div', {
        class: 'label',
        text: this.connected ? `Neighbours online (${players.length})` : 'Offline',
      }),
      items.length
        ? el('ul', {}, ...items)
        : el('div', {
            class: 'muted',
            text: this.connected ? 'Just you right now.' : 'Reconnecting…',
          }),
    )
  }

  // --- the story: thoughts, papers, the notepad and the board (STORY.md) ----------------------

  /** Lines under you: what you see (plain) and what you think (italic), one at a time. */
  private narration = (() => {
    const n = el('div', { class: 'narration' })
    n.setAttribute('aria-live', 'polite')
    return n
  })()
  private narrQueue: { text: string; kind: 'look' | 'thought' }[] = []
  private narrBusy = false
  /** Bumped whenever what's shown is cut short, so the old line's timers stand down. */
  private narrToken = 0

  /** Something goes through your head (the inner voice). */
  thought(text: string | null) {
    if (text) this.narrate([{ text, kind: 'thought' }])
  }

  /**
   * A line of what you see, then maybe a thought about it. You asked to look, so it's shown at
   * once, in place of whatever was being thought.
   */
  look(text: string, thought?: string | null) {
    this.hushNarration()
    this.narrate([
      { text, kind: 'look' },
      ...(thought ? [{ text: thought, kind: 'thought' as const }] : []),
    ])
  }

  private narrate(lines: { text: string; kind: 'look' | 'thought' }[]) {
    // Only in the forest, and never once a trip is ending (the black screen and its line): a
    // thought queued a moment earlier (after a panel closes, a beat after a moment) is dropped.
    if (!this.game?.forest || this.game.trip?.end) return
    // A thought already waiting isn't said twice.
    for (const l of lines)
      if (!this.narrQueue.some((q) => q.text === l.text)) this.narrQueue.push(l)
    if (!this.narrBusy) this.nextNarration()
  }

  /** Clears what's being said (leaving the forest, a trip ending, looking at something). */
  hushNarration() {
    this.narrToken++
    this.narrQueue = []
    this.narration.replaceChildren()
    this.narrBusy = false
  }

  private nextNarration() {
    if (!this.game?.forest || this.game.trip?.end) return this.hushNarration()
    const l = this.narrQueue.shift()
    if (!l) {
      this.narrBusy = false
      return
    }
    this.narrBusy = true
    const token = this.narrToken
    const line = el('div', { class: `narr ${l.kind}` })
    line.setAttribute('aria-label', l.text)
    this.narration.replaceChildren(line)
    // Typed out with a soft blip, like dialogue: what you see in a plain voice, what you think in
    // a lower, quieter one. (Shown at once, silently, with reduced motion.)
    const typed = el('span', {})
    const rest = el('span', { class: 'narr-rest', text: l.text })
    line.append(typed, rest)
    const per = l.kind === 'look' ? LOOK_TYPE_MS : NARR_TYPE_MS
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let n = 0
      const timer = window.setInterval(() => {
        if (token !== this.narrToken || !line.isConnected || n >= l.text.length)
          return window.clearInterval(timer)
        n++
        typed.textContent = l.text.slice(0, n)
        rest.textContent = l.text.slice(n)
        const ch = l.text[n - 1]
        // (A blip every other letter, every third when looking: it types faster.)
        if (/[a-z0-9]/i.test(ch) && n % (l.kind === 'look' ? 3 : 2) === 1) {
          if (l.kind === 'look') voice(360, 'triangle', 1, 0.04)
          else voice(250, 'sine', 0.8, 0.05)
        }
      }, per)
      typed.textContent = ''
    } else typed.textContent = l.text
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) rest.textContent = ''
    const hold =
      l.text.length * per +
      THOUGHT_MS +
      l.text.length * THOUGHT_PER_CHAR * (l.kind === 'look' ? 1.3 : 1)
    window.setTimeout(() => line.classList.add('out'), hold)
    window.setTimeout(() => {
      if (token !== this.narrToken) return
      line.remove()
      window.setTimeout(
        () => {
          if (token === this.narrToken) this.nextNarration()
        },
        this.narrQueue.length ? THOUGHT_GAP_MS * 0.4 : 0,
      )
    }, hold + 700)
  }

  /** A clue's paper, the way it's physically written or printed. */
  /** A puzzle document (story/docs.ts): read it, then put it away. */
  openDoc(doc: Doc, onClose?: () => void) {
    let closed = false
    const done = () => {
      if (closed) return
      closed = true
      this.closePanel()
      onClose?.()
    }
    this.showPanel(
      el(
        'div',
        { class: 'panel-body clue-view' },
        el('p', { class: 'about', text: doc.paper.about }),
        this.paperEl(doc),
        doc.lead
          ? el('p', { class: 'muted center', text: 'You copy it into your notepad.' })
          : null,
        el('div', { class: 'row-buttons' }, button('Put it away', done)),
      ),
    )
  }

  /**
   * A combination lock (the service gate's padlock, PUZZLES.md P05; Bell's locker, P02): four number
   * dials you turn one at a time (the arrows, or click a dial and type). `pull` is the button that
   * tries it; `onTry` says whether it opened.
   */
  openPadlock(about: string, pull: string, onTry: (code: string) => boolean) {
    const digits = [0, 0, 0, 0]
    const dials = digits.map((_, i) => {
      const face = el('span', { class: 'dial-face', text: '0' })
      const turn = (by: number) => {
        digits[i] = (digits[i] + by + 10) % 10
        face.textContent = String(digits[i])
        face.setAttribute('aria-label', `Dial ${i + 1}: ${digits[i]}`)
      }
      const up = button('▲', () => turn(1), 'btn dial-turn')
      up.setAttribute('aria-label', `Turn dial ${i + 1} up`)
      const down = button('▼', () => turn(-1), 'btn dial-turn')
      down.setAttribute('aria-label', `Turn dial ${i + 1} down`)
      face.tabIndex = 0
      face.setAttribute('role', 'spinbutton')
      face.setAttribute('aria-label', `Dial ${i + 1}: 0`)
      face.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') turn(1)
        else if (e.key === 'ArrowDown') turn(-1)
        else if (/^[0-9]$/.test(e.key)) turn(Number(e.key) - digits[i])
        else return
        e.preventDefault()
        e.stopPropagation()
      })
      return el('div', { class: 'dial' }, up, face, down)
    })
    const result = el('p', { class: 'muted center', text: '' })
    const tryIt = button(
      pull,
      () => {
        if (onTry(digits.join(''))) this.closePanel()
        else result.textContent = 'It doesn’t open.'
      },
      'btn primary',
    )
    this.showPanel(
      el(
        'div',
        { class: 'panel-body padlock' },
        el('p', { class: 'about', text: about }),
        el('div', { class: 'dials' }, ...dials),
        result,
        el(
          'div',
          { class: 'row-buttons' },
          tryIt,
          button('Leave it', () => this.closePanel()),
        ),
      ),
    )
  }

  /**
   * The shed's shutter winch (PUZZLES.md P03): three parts to work (the catch, the spool, the
   * ratchet), with a line saying what each did. `onStep` answers with how far along it is (0–3, shown
   * as the shutter's height) and what happened; `done` closes it.
   */
  openWinch(
    about: string,
    onStep: (step: 'catch' | 'spool' | 'ratchet') => {
      state: number
      text: string
      done?: boolean
    },
  ) {
    const shutter = el('div', { class: 'winch-shutter' })
    shutter.setAttribute('aria-hidden', 'true')
    const result = el('p', { class: 'muted center', text: '' })
    result.setAttribute('aria-live', 'polite')
    const show = (state: number) => shutter.style.setProperty('--raised', String(state / 3))
    show(0)
    const act = (step: 'catch' | 'spool' | 'ratchet', label: string) =>
      button(label, () => {
        const r = onStep(step)
        show(r.state)
        result.textContent = r.text
        if (r.done) this.closePanel()
      })
    this.showPanel(
      el(
        'div',
        { class: 'panel-body winch' },
        el('p', { class: 'about', text: about }),
        el('div', { class: 'winch-frame' }, shutter),
        result,
        el(
          'div',
          { class: 'row-buttons' },
          act('catch', 'Release the catch'),
          act('spool', 'Turn the spool'),
          act('ratchet', 'Set the ratchet'),
        ),
        el(
          'div',
          { class: 'row-buttons' },
          button('Leave it', () => this.closePanel()),
        ),
      ),
    )
  }

  private paperEl(c: { paper: Paper }): HTMLElement {
    // Papers that name you ("{name}": the search roster, the clipping) use your character's name.
    const me = this.game.save.look.name || 'You'
    const named = (t: string) => t.replaceAll('{name}', me)
    const lines = c.paper.lines.map((l: PaperLine) => {
      if (l.style === 'gap') return el('div', { class: 'gap' })
      if (l.style === 'row') {
        const row = el('div', { class: 'row' })
        for (const cell of l.text.split('|')) row.append(el('span', { text: named(cell.trim()) }))
        return row
      }
      const src = l.style === 'art' && l.img ? PHOTOS[l.img] : undefined
      if (src) {
        const img = el('img')
        img.src = src
        img.alt = named(l.text)
        img.decoding = 'async'
        return el('figure', { class: 'photo' }, img)
      }
      return el('p', { class: l.style ?? 'plain', text: named(l.text) })
    })
    // A paper that is a picture of itself (the missing poster): the image is the paper, and its
    // lines, the same words, are there for screen readers only.
    const whole = c.paper.img ? PHOTOS[c.paper.img] : undefined
    if (whole) {
      const img = el('img')
      img.src = whole
      img.alt = ''
      img.decoding = 'async'
      return el(
        'div',
        { class: `paper whole ${c.paper.kind}` },
        el('figure', { class: 'photo' }, img),
        el('div', { class: 'sr-only' }, ...lines),
      )
    }
    return el('div', { class: `paper ${c.paper.kind}` }, ...lines)
  }

  /**
   * Reading a clue. `state`: new (you can take it), taken (it's in your notepad), known (already on
   * your board at home). `onClose` runs once it's put away.
   */
  openClue(
    id: ClueId,
    state: 'new' | 'taken' | 'known',
    opts: { onTake?: () => void; onClose?: () => void; note?: HTMLElement } = {},
  ) {
    const c = CLUES[id]
    if (!c) return
    let closed = false
    const done = () => {
      if (closed) return
      closed = true
      this.closePanel()
      opts.onClose?.()
    }
    const actions: HTMLElement[] = []
    if (state === 'new' && opts.onTake) {
      actions.push(
        button(
          c.paper.kind === 'printed' ? 'Copy it into your notepad' : 'Take it',
          () => {
            opts.onTake!()
            done()
          },
          'btn primary',
        ),
        button('Leave it', done),
      )
    } else actions.push(button('Put it away', done))
    const status =
      state === 'known'
        ? el('p', { class: 'muted center', text: 'It’s on your board at home.' })
        : state === 'taken'
          ? el('p', { class: 'muted center', text: 'It’s in your notepad.' })
          : null
    this.showPanel(
      el(
        'div',
        { class: 'panel-body clue-view' },
        el('p', { class: 'about', text: c.paper.about }),
        this.paperEl(c),
        status,
        opts.note ?? null,
        el('div', { class: 'row-buttons' }, ...actions),
      ),
    )
    // Closed any other way (×, the backdrop, Esc): still put away.
    const panel = this.panel
    const watch = window.setInterval(() => {
      if (this.panel !== panel) {
        window.clearInterval(watch)
        if (!closed) {
          closed = true
          opts.onClose?.()
        }
      }
    }, 200)
  }

  /** A note field (your own words on a clue). */
  private noteField(
    value: string,
    onChange: (v: string) => void,
    label = 'Your note',
  ): HTMLElement {
    const t = el('textarea', { class: 'note-field' })
    t.maxLength = NOTE_MAX
    t.rows = 2
    t.value = value
    t.placeholder = 'Write something to remember it by…'
    t.setAttribute('aria-label', label)
    t.addEventListener('keydown', (e) => e.stopPropagation())
    t.addEventListener('input', () => onChange(t.value))
    return el('label', { class: 'note' }, el('span', { class: 'label', text: label }), t)
  }

  /** Your notepad in the forest: what you've found this trip, unbanked until you're home. */
  openNotepad() {
    const story = this.game.trip?.story
    if (!story) return
    // Locks you've found and can't open yet: kept ones and this trip's.
    const leads = this.game.openLeads()
    // People you've written down (STORY.md "Memory"): this trip's and the ones on your board.
    const people = [
      ...new Set([
        ...[...story.found.keys()].filter((id) => CLUES[id]?.person),
        ...(this.game.save.board?.clues ?? []).map((c) => c.id).filter((id) => CLUES[id]?.person),
      ]),
    ]
    const rows = [...story.found.entries()]
      .filter(([id]) => !CLUES[id]?.person)
      .map(([id, f]) => {
        const c = CLUES[id]!
        const read = button(
          c.title,
          () => {
            this.openClue(id, 'taken', { onClose: () => this.openNotepad() })
          },
          'link',
        )
        return el(
          'li',
          {},
          read,
          this.noteField(f.note, (v) => this.game.setTripNote(id, v)),
        )
      })
    this.showPanel(
      el(
        'div',
        { class: 'panel-body notepad' },
        el('h2', { text: 'Notepad' }),
        el('p', {
          class: 'muted',
          text:
            rows.length || people.length || story.kept.size || story.carried.size || leads.length
              ? 'What you’ve found out here. It’s only safe once you’re home.'
              : 'Nothing yet. Look closely at what you come across.',
        }),
        rows.length ? el('ul', { class: 'found' }, ...rows) : null,
        people.length
          ? el(
              'div',
              { class: 'people' },
              el('h3', { text: 'People' }),
              el(
                'ul',
                {},
                ...people.map((id) =>
                  el(
                    'li',
                    {},
                    button(
                      CLUES[id]!.title,
                      () =>
                        this.openClue(id, story.found.has(id) ? 'taken' : 'known', {
                          onClose: () => this.openNotepad(),
                        }),
                      'link',
                    ),
                  ),
                ),
              ),
            )
          : null,
        story.kept.size
          ? el(
              'div',
              { class: 'kept' },
              el('h3', { text: 'Picked up' }),
              el('p', {
                class: 'muted',
                text: [...story.kept].map((k) => KEEPSAKES[k]?.name ?? k).join(' · '),
              }),
            )
          : null,
        leads.length
          ? el(
              'div',
              { class: 'leads' },
              el('h3', { text: 'Unresolved' }),
              el('ul', {}, ...leads.map((l) => el('li', { text: LEADS[l].text }))),
            )
          : null,
        el(
          'div',
          { class: 'row-buttons' },
          button('Map', () => this.openSiteMap(() => this.openNotepad())),
          button('Close', () => this.closePanel()),
        ),
      ),
    )
  }

  /**
   * The rough site map (MAP.md rule 7): the places you've been (kept, and this trip's) and the
   * locks you've found there, sketched in pencil. `back`: where Close goes.
   */
  openSiteMap(back: () => void) {
    const g = this.game
    const sites = new Set<string>([
      ...(g.save.story?.sites ?? []),
      ...(g.trip?.story.reached ?? []),
    ])
    const leads = new Set(g.openLeads())
    const names = LANDMARKS.filter((lm) => sites.has(lm.id)).map((lm) => lm.name)
    const sketch = drawSiteMap(sites, leads, 220)
    sketch.setAttribute('role', 'img')
    sketch.setAttribute(
      'aria-label',
      names.length ? `A sketch map of: ${names.join(', ')}.` : 'A blank page.',
    )
    this.showPanel(
      el(
        'div',
        { class: 'panel-body notepad sitemap' },
        el('h2', { text: 'Map' }),
        el('p', {
          class: 'muted',
          text: names.length
            ? 'Only what you’ve seen for yourself.'
            : 'Nothing yet. You haven’t been anywhere you could draw.',
        }),
        el('div', { class: 'sketch' }, sketch),
        el('div', { class: 'row-buttons' }, button('Back', back)),
      ),
    )
  }

  /**
   * The corkboard in your room: everything you've brought home, pinned where you put it, with
   * strings between them. Drag a card to move it; "String" joins two cards (or cuts the string).
   */
  openBoard() {
    const g = this.game
    const board = g.save.board
    if (!board?.clues.length) return
    const cork = el('div', { class: 'cork' })
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'strings')
    svg.setAttribute('aria-hidden', 'true')
    cork.append(svg)
    let stringFrom: ClueId | null = null
    const hint = el('p', { class: 'muted center' })
    const setHint = () => {
      hint.textContent = stringing
        ? stringFrom
          ? 'Now pick the card to tie it to (or the same one to stop).'
          : 'Pick a card to tie a string from. Tying two that are joined cuts the string.'
        : 'Drag a card to move it. Click one to read it and write on it.'
    }
    let stringing = false
    const cards = new Map<ClueId, HTMLElement>()
    // Strings run from pin to pin, over the cards (in the board's own pixels, once it's laid out).
    const drawStrings = () => {
      svg.replaceChildren()
      const box = cork.getBoundingClientRect()
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
      const pinAt = (id: ClueId) => {
        const r = cards.get(id)?.querySelector('.pin')?.getBoundingClientRect()
        return r && { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
      }
      for (const [a, b] of g.save.board?.links ?? []) {
        const pa = pinAt(a)
        const pb = pinAt(b)
        if (!pa || !pb) continue
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        line.setAttribute('x1', String(pa.x))
        line.setAttribute('y1', String(pa.y))
        line.setAttribute('x2', String(pb.x))
        line.setAttribute('y2', String(pb.y))
        svg.append(line)
      }
    }
    for (const bc of board.clues) {
      const c = CLUES[bc.id]
      const card = el(
        'button',
        { class: `pin-card ${c?.paper.kind ?? 'note'}`, type: 'button' },
        el('span', { class: 'pin' }),
        el('span', { class: 'title', text: c?.title ?? bc.id }),
        bc.note ? el('span', { class: 'scrawl', text: bc.note }) : null,
      )
      card.style.left = `${bc.x}%`
      card.style.top = `${bc.y}%`
      cards.set(bc.id, card)
      let drag: { x: number; y: number; moved: boolean } | null = null
      card.addEventListener('pointerdown', (e) => {
        if (stringing) return
        drag = { x: e.clientX, y: e.clientY, moved: false }
        card.setPointerCapture(e.pointerId)
      })
      card.addEventListener('pointermove', (e) => {
        if (!drag) return
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true
        if (!drag.moved) return
        const r = cork.getBoundingClientRect()
        const x = Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * BOARD_SIZE))
        const y = Math.max(5, Math.min(95, ((e.clientY - r.top) / r.height) * BOARD_SIZE))
        card.style.left = `${x}%`
        card.style.top = `${y}%`
        g.moveClue(bc.id, x, y)
        drawStrings()
      })
      card.addEventListener('pointerup', () => {
        const wasDrag = drag?.moved
        drag = null
        if (wasDrag) return
        if (stringing) {
          if (!stringFrom) {
            stringFrom = bc.id
            card.classList.add('picked')
          } else {
            if (stringFrom !== bc.id) g.toggleLink(stringFrom, bc.id)
            cards.get(stringFrom)?.classList.remove('picked')
            stringFrom = null
            drawStrings()
          }
          setHint()
          return
        }
        const cur = g.save.board?.clues.find((x) => x.id === bc.id)
        this.openClue(bc.id, 'known', {
          note: this.noteField(cur?.note ?? '', (v) => g.setBoardNote(bc.id, v)),
          onClose: () => this.openBoard(),
        })
      })
      // Keyboard: Enter/Space reads it (pointerup covers mouse and touch).
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          card.dispatchEvent(new PointerEvent('pointerup'))
        }
      })
      cork.append(card)
    }
    const toggle = button('String', () => {
      stringing = !stringing
      toggle.classList.toggle('primary', stringing)
      toggle.textContent = stringing ? 'Done with string' : 'String'
      if (stringFrom) cards.get(stringFrom)?.classList.remove('picked')
      stringFrom = null
      setHint()
    })
    setHint()
    this.showPanel(
      el(
        'div',
        { class: 'panel-body wide board' },
        el('h2', { text: 'Your corkboard' }),
        cork,
        hint,
        el(
          'div',
          { class: 'row-buttons' },
          toggle,
          ...(g.save.story?.sites?.length
            ? [button('Map', () => this.openSiteMap(() => this.openBoard()))]
            : []),
          button('Close', () => this.closePanel()),
        ),
      ),
    )
    requestAnimationFrame(drawStrings)
  }

  // --- toasts & chat ------------------------------------------------------------------------

  toast(text: string) {
    const t = el('div', { class: 'toast', text })
    this.toasts.append(t)
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove()
    setTimeout(() => t.classList.add('out'), 4200)
    setTimeout(() => t.remove(), 4800)
  }

  openChat() {
    if (this.game.forest) return this.toast(QUIET)
    this.chatForm.hidden = false
    this.chatInput.focus()
  }

  private closeChat() {
    this.chatForm.hidden = true
    this.chatInput.blur()
  }

  renderChat() {
    const g = this.game
    if (g.forest) {
      if (!this.chatForm.hidden) this.closeChat()
      this.chatlog.replaceChildren(el('div', { class: 'hint', text: QUIET }))
      return
    }
    const recent = Date.now() - 3 * 60_000
    const lines = g.chatLog
      .filter((m) => m.t > recent)
      .slice(-5)
      .map((m) => {
        const where = m.map === g.mapId ? '' : ` (${this.mapName(m.map)})`
        return el(
          'div',
          { class: `line${m.login === g.login ? ' mine' : ''}` },
          el('strong', { text: `${m.name}${where}: ` }),
          el('span', { text: m.text }),
        )
      })
    this.chatlog.replaceChildren(
      ...lines,
      el('div', { class: 'hint', text: 'Press Enter to chat' }),
    )
  }

  signedOut() {
    this.showPanel(
      el(
        'div',
        { class: 'panel-body center' },
        el('h2', { text: 'Your visit has ended' }),
        el('p', {
          text: 'Your GitHub session expired. Sign in again to keep playing. Your progress was saved up to your last change.',
        }),
        Object.assign(el('a', { class: 'btn primary', text: 'Sign in with GitHub' }), {
          href: '/api/auth/login?returnTo=%2Fretirement',
        }),
      ),
      false,
    )
  }

  // --- decorating -----------------------------------------------------------------------------

  private renderDecorbar() {
    const g = this.game
    this.decorbar.hidden = !g.decor.active
    if (!g.decor.active) return
    const stored = g.save.room.items
      .map((it, i) => ({ it, i }))
      .filter(({ it, i }) => it.x < 0 && i !== g.decor.held)
    const held = g.decor.held >= 0 ? FURNITURE[g.save.room.items[g.decor.held].k] : null
    this.decorbar.replaceChildren(
      el(
        'div',
        { class: 'decor-help' },
        el('strong', { text: held ? `Placing: ${held.name}` : 'Decorating' }),
        el('span', {
          text: held
            ? ' Click a spot to put it down · X to put it away · Esc to cancel'
            : ' Click a piece to pick it up · or choose one from storage',
        }),
      ),
      el(
        'div',
        { class: 'storage' },
        ...(stored.length
          ? stored.map(({ it, i }) => {
              const b = el(
                'button',
                { class: 'store-item', title: FURNITURE[it.k].name, type: 'button' },
                furnitureIcon(it.k),
                el('span', { text: FURNITURE[it.k].name }),
              )
              b.addEventListener('click', () => g.holdStored(i))
              return b
            })
          : [el('span', { class: 'muted', text: 'Storage is empty. Buy more from the Catalog!' })]),
      ),
      ...(held ? [button('Put away', () => g.storeHeld())] : []),
      button('Done', () => g.endDecorate(), 'btn primary'),
    )
  }

  // --- panels -------------------------------------------------------------------------------

  panelOpen(): boolean {
    return this.panel !== null
  }

  showPanel(body: HTMLElement, closable = true) {
    this.panel = el(
      'div',
      { class: 'panel' },
      closable ? button('×', () => this.closePanel(), 'close') : null,
      body,
    )
    this.panel.setAttribute('role', 'dialog')
    this.backdrop.replaceChildren(this.panel)
    this.backdrop.hidden = false
    this.game?.keys.clear()
    const first = this.panel.querySelector<HTMLElement>('input, button:not(.close)')
    first?.focus()
  }

  closePanel() {
    ;(document.activeElement as HTMLElement | null)?.blur()
    this.panel = null
    this.backdrop.hidden = true
    this.backdrop.replaceChildren()
  }

  openKitchen() {
    const g = this.game
    const render = (tab: 'sell' | 'seeds' | 'cook') => {
      const tabs = el(
        'div',
        { class: 'tabs' },
        button('Sell produce', () => render('sell'), `tab${tab === 'sell' ? ' active' : ''}`),
        button(
          g.save.pet ? 'Seeds & treats' : 'Buy seeds',
          () => render('seeds'),
          `tab${tab === 'seeds' ? ' active' : ''}`,
        ),
        button('Cook', () => render('cook'), `tab${tab === 'cook' ? ' active' : ''}`),
      )
      const rows =
        tab === 'cook'
          ? this.recipeRows('kitchen', () => render('cook'))
          : tab === 'sell'
            ? CROP_IDS.map((id) => {
                const n = g.save.inv[`crop:${id}`] ?? 0
                const c = CROPS[id]
                return el(
                  'div',
                  { class: `shop-row${n ? '' : ' dim'}` },
                  cropIcon(id, true),
                  el(
                    'div',
                    { class: 'grow' },
                    el('strong', { text: c.name }),
                    el('div', { class: 'muted', text: `You have ${n}` }),
                  ),
                  el(
                    'div',
                    { class: 'price' },
                    coinIcon(),
                    document.createTextNode(` ${c.sellPrice} each`),
                  ),
                  n ? button('Sell 1', () => (g.sell(id, 1), render('sell'))) : null,
                  n > 1
                    ? button(
                        `Sell all (${n * c.sellPrice})`,
                        () => (g.sell(id, n), render('sell')),
                        'btn primary',
                      )
                    : null,
                )
              })
            : CROP_IDS.map((id) => {
                const c = CROPS[id]
                return el(
                  'div',
                  { class: `shop-row${g.save.coins >= c.seedPrice ? '' : ' dim'}` },
                  cropIcon(id, false),
                  el(
                    'div',
                    { class: 'grow' },
                    el('strong', { text: `${c.name} seeds` }),
                    el('div', {
                      class: 'muted',
                      text: `Ripe in ${fmt(c.growMs)} of watering · sells for ${c.sellPrice}${c.regrows ? ' · keeps producing' : ''}`,
                    }),
                  ),
                  el(
                    'div',
                    { class: 'price' },
                    coinIcon(),
                    document.createTextNode(` ${c.seedPrice}`),
                  ),
                  button('Buy 1', () => (g.buySeeds(id, 1), render('seeds'))),
                  button('Buy 5', () => (g.buySeeds(id, 5), render('seeds')), 'btn primary'),
                )
              })
      if (tab === 'sell')
        for (const id of POTTABLE) {
          const n = g.save.inv[`plant:${id}`] ?? 0
          if (!n) continue
          rows.push(
            el(
              'div',
              { class: 'shop-row' },
              plantIcon(id, 32),
              el(
                'div',
                { class: 'grow' },
                el('strong', { text: `Potted ${CROPS[id].name.toLowerCase()} plant` }),
                el('div', { class: 'muted', text: `You have ${n} · dug up from your plot` }),
              ),
              el(
                'div',
                { class: 'price' },
                coinIcon(),
                document.createTextNode(` ${plantPrice(id)} each`),
              ),
              button('Sell 1', () => (g.sellPlants(id, 1), render('sell'))),
              n > 1
                ? button(
                    `Sell all (${n * plantPrice(id)})`,
                    () => (g.sellPlants(id, n), render('sell')),
                    'btn primary',
                  )
                : null,
            ),
          )
        }
      if (tab === 'sell')
        for (const id of RECIPE_IDS) {
          const n = g.save.inv[`meal:${id}`] ?? 0
          if (!n) continue
          const r = RECIPES[id]
          rows.push(
            el(
              'div',
              { class: 'shop-row' },
              mealIcon(id, 32),
              el(
                'div',
                { class: 'grow' },
                el('strong', { text: r.name }),
                el('div', { class: 'muted', text: `You have ${n} · home cooked` }),
              ),
              el(
                'div',
                { class: 'price' },
                coinIcon(),
                document.createTextNode(` ${r.sellPrice} each`),
              ),
              button('Sell 1', () => (g.sellMeal(id, 1), render('sell'))),
              n > 1
                ? button(
                    `Sell all (${n * r.sellPrice})`,
                    () => (g.sellMeal(id, n), render('sell')),
                    'btn primary',
                  )
                : null,
            ),
          )
        }
      const eggs = g.save.inv.egg ?? 0
      if (tab === 'sell')
        rows.push(
          el(
            'div',
            { class: `shop-row${eggs ? '' : ' dim'}` },
            eggIcon(30),
            el(
              'div',
              { class: 'grow' },
              el('strong', { text: 'Eggs' }),
              el('div', { class: 'muted', text: `You have ${eggs} · from the henhouse` }),
            ),
            el(
              'div',
              { class: 'price' },
              coinIcon(),
              document.createTextNode(` ${EGG_PRICE} each`),
            ),
            eggs ? button('Sell 1', () => (g.sellEggs(1), render('sell'))) : null,
            eggs > 1
              ? button(
                  `Sell all (${eggs * EGG_PRICE})`,
                  () => (g.sellEggs(eggs), render('sell')),
                  'btn primary',
                )
              : null,
          ),
        )
      if (tab === 'seeds' && g.save.pet)
        rows.push(
          el(
            'div',
            { class: `shop-row${g.save.coins >= TREAT_PACK.price ? '' : ' dim'}` },
            treatIcon(32),
            el(
              'div',
              { class: 'grow' },
              el('strong', { text: `Treats for ${g.save.pet.name}` }),
              el('div', {
                class: 'muted',
                text: `A pack of ${TREAT_PACK.count} · you have ${g.save.inv.treat ?? 0} · press F to give one`,
              }),
            ),
            el(
              'div',
              { class: 'price' },
              coinIcon(),
              document.createTextNode(` ${TREAT_PACK.price}`),
            ),
            button(
              `Buy ${TREAT_PACK.count}`,
              () => (g.buyTreats(), render('seeds')),
              'btn primary',
            ),
          ),
        )
      this.showPanel(
        el(
          'div',
          { class: 'panel-body' },
          el('h2', { text: 'Community Kitchen' }),
          el('p', {
            class: 'muted',
            text:
              tab === 'cook'
                ? 'Chef Rosa: "Pull up an apron! A home-cooked meal is worth more than what goes into it."'
                : 'Chef Rosa: "Fresh from the garden? I\'ll take it for tonight\'s soup!"',
          }),
          el(
            'div',
            { class: 'wallet' },
            coinIcon(),
            document.createTextNode(` ${g.save.coins.toLocaleString()} coins`),
          ),
          tabs,
          el('div', { class: 'shop' }, ...rows),
        ),
      )
    }
    render('sell')
  }

  /** Your own stove: cook the recipes you know (lessons are at the Kitchen). */
  openStove() {
    const render = () =>
      this.showPanel(
        el(
          'div',
          { class: 'panel-body' },
          el('h2', { text: 'Your stove' }),
          el('p', {
            class: 'muted',
            text: 'Cook what you know from your basket. Chef Rosa teaches new recipes at the Community Kitchen.',
          }),
          el('div', { class: 'shop' }, ...this.recipeRows('stove', render)),
        ),
      )
    render()
  }

  /**
   * One row per recipe: the ingredients (what you have of each), the meal's price, and Cook
   * buttons; at the Kitchen, recipes you don't know yet have a lesson to buy instead.
   */
  private recipeRows(where: 'kitchen' | 'stove', rerender: () => void): HTMLElement[] {
    const g = this.game
    const inv = g.save.inv
    const ids = where === 'stove' ? RECIPE_IDS.filter((id) => g.knows(id)) : RECIPE_IDS
    const rows = ids.map((id) => {
      const r = RECIPES[id]
      const known = g.knows(id)
      const n = known ? cookable(inv, id) : 0
      const parts = Object.entries(r.ingredients).map(([k, need]) => {
        const have = inv[k] ?? 0
        return el(
          'span',
          {
            class: `ingredient${have >= need ? '' : ' short'}`,
            title: `${ingredientName(k)}: you have ${have}, it needs ${need}`,
          },
          ingredientIcon(k),
          document.createTextNode(`${Math.min(have, 99)}/${need}`),
        )
      })
      const body = el(
        'div',
        { class: 'grow' },
        el('strong', { text: r.name }),
        el('div', { class: 'ingredients' }, ...parts),
        el('div', {
          class: 'muted',
          text: known
            ? `“${r.note}” · sells for ${r.sellPrice}`
            : `Sells for ${r.sellPrice} · Chef Rosa teaches it for ${r.lesson}`,
        }),
      )
      if (!known)
        return el(
          'div',
          { class: `shop-row${g.save.coins >= r.lesson ? '' : ' dim'}` },
          mealIcon(id, 32),
          body,
          el('div', { class: 'price' }, coinIcon(), document.createTextNode(` ${r.lesson}`)),
          button('Learn', () => (g.learnRecipe(id), rerender()), 'btn primary'),
        )
      return el(
        'div',
        { class: `shop-row${n ? '' : ' dim'}` },
        mealIcon(id, 32),
        body,
        n ? button('Cook 1', () => (g.cook(id, 1), rerender())) : null,
        n > 1 ? button(`Cook all (${n})`, () => (g.cook(id, n), rerender()), 'btn primary') : null,
      )
    })
    if (where === 'stove' && ids.length < RECIPE_IDS.length)
      rows.push(
        el('p', {
          class: 'muted',
          text: `Chef Rosa knows ${RECIPE_IDS.length - ids.length} more recipe${RECIPE_IDS.length - ids.length > 1 ? 's' : ''}. Visit her at the Kitchen to learn them.`,
        }),
      )
    return rows
  }

  /** The garden noticeboard: your plot's size, and the next size up for sale. */
  openNoticeboard() {
    const g = this.game
    const level = g.save.plot ?? 0
    const now = PLOT_SIZES[level]
    const next = g.nextPlot()
    const sizes = PLOT_SIZES.map((p, i) =>
      el(
        'div',
        { class: `shop-row${i === level ? ' current' : i < level ? ' dim' : ''}` },
        el('div', { class: 'plot-size', text: `${p.w} × ${p.h}` }),
        el(
          'div',
          { class: 'grow' },
          el('strong', {
            text:
              i === 0
                ? 'Starter plot'
                : i === PLOT_SIZES.length - 1
                  ? 'Full allotment'
                  : 'Bigger plot',
          }),
          el('div', {
            class: 'muted',
            text: `${p.w * p.h} squares${i === level ? ' · yours now' : i < level ? ' · done' : ''}`,
          }),
        ),
        i > 0
          ? el('div', { class: 'price' }, coinIcon(), document.createTextNode(` ${p.price}`))
          : null,
        next && i === level + 1
          ? (() => {
              const b = button(
                g.save.coins >= next.price ? 'Buy' : `Need ${next.price - g.save.coins} more`,
                () => {
                  if (g.buyPlot()) {
                    this.closePanel()
                    this.toast(
                      `Your plot is now ${next.w} × ${next.h}! The new ground is to the right and below.`,
                    )
                  }
                },
                'btn primary',
              )
              b.disabled = g.save.coins < next.price || g.slot < 0
              return b
            })()
          : null,
      ),
    )
    this.showPanel(
      el(
        'div',
        { class: 'panel-body' },
        el('h2', { text: 'Community Garden' }),
        el('p', {
          class: 'muted',
          text: "Till, plant, water, harvest, and sell your produce at the Kitchen. Every allotment has room to grow: buy a bigger plot and it spreads out over the grass, keeping everything you've planted where it is.",
        }),
        el(
          'div',
          { class: 'wallet' },
          coinIcon(),
          document.createTextNode(
            ` ${g.save.coins.toLocaleString()} coins · your plot is ${now.w} × ${now.h}`,
          ),
        ),
        el('div', { class: 'shop' }, ...sizes),
        el('p', {
          class: 'muted',
          text: 'Changed your mind about a plant? Face it and press X (or right-click it) to dig it up. Seeds go back in the packet, and strawberry and tomato plants come up potted, to replant or sell to Chef Rosa.',
        }),
      ),
    )
  }

  openCatalog() {
    const g = this.game
    const render = (tab: 'furniture' | 'wall' | 'floor') => {
      const tabs = el(
        'div',
        { class: 'tabs' },
        button(
          'Furniture',
          () => render('furniture'),
          `tab${tab === 'furniture' ? ' active' : ''}`,
        ),
        button('Wallpaper', () => render('wall'), `tab${tab === 'wall' ? ' active' : ''}`),
        button('Flooring', () => render('floor'), `tab${tab === 'floor' ? ' active' : ''}`),
      )
      let grid: HTMLElement
      if (tab === 'furniture') {
        grid = el(
          'div',
          { class: 'grid' },
          ...FURNITURE_IDS.filter((k) => FURNITURE[k].price > 0).map((k) => {
            const d = FURNITURE[k]
            const owned = g.save.room.items.filter((i) => i.k === k).length
            const card = el(
              'div',
              { class: `card${g.save.coins >= d.price ? '' : ' dim'}` },
              el('div', { class: 'art' }, furnitureIcon(k)),
              el('strong', { text: d.name }),
              el('div', {
                class: 'muted',
                text: `${d.wall ? 'Wall' : 'Floor'} · ${d.w}×${d.h}${owned ? ` · own ${owned}` : ''}`,
              }),
              button(
                `Buy · ${d.price}`,
                () => {
                  if (g.buyFurniture(k) && g.inOwnRoom()) this.closePanel()
                  else render('furniture')
                },
                'btn primary',
              ),
            )
            return card
          }),
        )
      } else {
        const list = tab === 'wall' ? WALLPAPERS : FLOORS
        const owned = tab === 'wall' ? g.save.room.walls : g.save.room.floors
        const current = tab === 'wall' ? g.save.room.wall : g.save.room.floor
        grid = el(
          'div',
          { class: 'grid' },
          ...Object.values(list).map((fin) => {
            const has = owned.includes(fin.id)
            return el(
              'div',
              { class: `card${has || g.save.coins >= fin.price ? '' : ' dim'}` },
              el('div', { class: 'art' }, finishSwatch(tab, fin.id)),
              el('strong', { text: fin.name }),
              current === fin.id
                ? el('div', { class: 'muted', text: 'In use' })
                : button(
                    has ? 'Use' : `Buy · ${fin.price}`,
                    () => (g.buyFinish(tab, fin.id, fin.price), render(tab)),
                    'btn primary',
                  ),
            )
          }),
        )
      }
      this.showPanel(
        el(
          'div',
          { class: 'panel-body wide' },
          el('h2', { text: 'Mail-order Catalog' }),
          el(
            'div',
            { class: 'wallet' },
            coinIcon(),
            document.createTextNode(` ${g.save.coins.toLocaleString()} coins`),
          ),
          tabs,
          grid,
        ),
      )
    }
    render('furniture')
  }

  openWardrobe() {
    const g = this.game
    this.showPanel(
      wardrobe(g.save.look, {
        title: 'Wardrobe',
        confirm: 'Looking sharp!',
        onDone: (look) => {
          g.setLook(look)
          this.closePanel()
        },
        extra: [button('Family photo…', () => this.openFamilyEditor(), 'btn')],
      }),
    )
  }

  /**
   * Who's in your family photo. `then` runs once it's saved (the forest uses it to carry on in).
   * The first time, the family is random to start from; after that it's the one you have.
   */
  openFamilyEditor(opts: { intro?: string; confirm?: string; then?: () => void } = {}) {
    const g = this.game
    this.showPanel(
      familyEditor(g.save.look, g.save.family?.members, {
        title: "Who's in your family photo?",
        intro:
          opts.intro ??
          'Two or three of the people you love most. Their photo hangs on your wall. Randomize for ideas, or make them yourself.',
        confirm: opts.confirm ?? 'Save the photo',
        onDone: (members) => {
          g.setFamily(members)
          this.closePanel()
          opts.then?.()
        },
      }),
    )
  }

  /** The family photo up close (from the wall or your pocket), with what you can do with it. */
  openPhoto() {
    const g = this.game
    const fam = g.save.family
    if (!fam) return
    const where = photoWhere(g.save)
    const close = button('Close', () => this.closePanel(), 'btn')
    if (where === 'lost')
      return this.showPanel(
        el(
          'div',
          { class: 'panel-body center' },
          el('h2', { text: 'An empty frame' }),
          el('p', {
            text: fam.reprintAt
              ? `Nurse Ada is having a copy printed. It'll be on your wall ${reprintWhen(fam.reprintAt)}.`
              : 'You lost the photo out there somewhere. Nurse Ada keeps a copy in your file. She could have it reprinted.',
          }),
          close,
        ),
      )
    const inRoom = g.inOwnRoom() && g.facingPhoto()
    const actions: HTMLElement[] = []
    if (where === 'wall' && inRoom)
      actions.push(
        button(
          'Take it with you',
          () => {
            if (g.takePhoto()) this.closePanel()
          },
          'btn primary',
        ),
      )
    if (where === 'pocket' && inRoom)
      actions.push(
        button(
          'Hang it back up',
          () => {
            g.hangPhoto()
            this.closePanel()
          },
          'btn primary',
        ),
      )
    actions.push(close)
    this.showPanel(
      familyCard(
        fam.members,
        where === 'pocket'
          ? 'You have it in your pocket. Real family look exactly like this.'
          : 'If you take it with you, it goes in your pocket. You can look at it wherever you are.',
        actions,
      ),
    )
  }

  /** Nurse Ada's pet programme: choose a dog or cat, a coat and a name (or just rename). */
  openAdoption(mode: 'adopt' | 'rename') {
    const g = this.game
    const pet = g.save.pet
    if (mode === 'rename' && !pet) return
    let kind: PetKind = pet?.kind ?? 'dog'
    let coat = pet?.coat ?? 0
    const nameInput = el('input')
    nameInput.maxLength = PET_NAME_MAX
    nameInput.value = pet?.name ?? 'Biscuit'
    nameInput.setAttribute('aria-label', 'Pet name')
    const error = el('div', { class: 'error' })
    const preview = el('canvas', { class: 'pet-preview' })
    preview.width = 18
    preview.height = 16
    preview.setAttribute('aria-hidden', 'true')
    const kinds = el('div', { class: 'tabs' })
    const coats = el('div', { class: 'pet-coats' })
    const draw = () => {
      const c = preview.getContext('2d')!
      c.clearRect(0, 0, 18, 16)
      c.drawImage(petSprite(kind, coat, 'sit', 0, 1), 0, 0)
    }
    const render = () => {
      kinds.replaceChildren(
        ...PET_KINDS.map((k) =>
          button(
            k === 'dog' ? 'Dog' : 'Cat',
            () => {
              if (kind !== k && nameInput.value === (kind === 'dog' ? 'Biscuit' : 'Pickles'))
                nameInput.value = k === 'dog' ? 'Biscuit' : 'Pickles'
              kind = k
              coat = Math.min(coat, PET_COATS[k].length - 1)
              render()
            },
            `tab${kind === k ? ' active' : ''}`,
          ),
        ),
      )
      coats.replaceChildren(
        ...PET_COATS[kind].map((c, i) => {
          const b = button(
            '',
            () => {
              coat = i
              render()
            },
            `chip pet-coat${coat === i ? ' active' : ''}`,
          )
          const icon = el('canvas')
          icon.width = 18
          icon.height = 16
          icon.getContext('2d')!.drawImage(petSprite(kind, i, 'sit', 0, 0), 0, 0)
          b.append(icon, el('span', { text: c.name }))
          b.setAttribute('aria-pressed', String(coat === i))
          return b
        }),
      )
      draw()
    }
    const confirm = () => {
      const name = cleanName(nameInput.value).slice(0, PET_NAME_MAX)
      if (!name) {
        error.textContent = 'Every pet needs a name.'
        return
      }
      this.closePanel()
      if (mode === 'rename') g.renamePet(name)
      else g.adoptPet({ kind, coat, name })
    }
    nameInput.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') confirm()
      if (e.key === 'Escape') this.closePanel()
    })
    render()
    this.showPanel(
      el(
        'div',
        { class: 'panel-body adopt' },
        el('h2', { text: mode === 'rename' ? `Rename ${pet!.name}` : 'The pet programme' }),
        el('p', {
          class: 'muted',
          text:
            mode === 'rename'
              ? 'A new name for your companion.'
              : 'Nurse Ada: "Every resident can have one companion. Who would you like?"',
        }),
        el(
          'div',
          { class: 'adopt-grid' },
          el('div', { class: 'pet-frame' }, preview),
          el(
            'div',
            { class: 'adopt-fields' },
            mode === 'adopt' ? kinds : null,
            mode === 'adopt' ? coats : null,
            el('label', { class: 'field' }, el('span', { text: 'Name' }), nameInput),
            error,
            button(mode === 'rename' ? 'Rename' : 'Adopt', confirm, 'btn primary'),
          ),
        ),
      ),
    )
    nameInput.focus()
    nameInput.select()
  }

  openHelp() {
    const rows: [string, string][] = [
      ['WASD / arrow keys', 'Walk (hold Shift to hurry)'],
      ['E or Space', 'Use whatever you are facing: doors, soil, crops, Chef Rosa'],
      ['Click', 'Act on a tile right next to you'],
      ['1–6', 'Choose which seeds to plant'],
      [
        'X or right-click',
        'Dig up a plant in your plot (strawberries and tomatoes come up potted)',
      ],
      ['Enter', 'Chat (shows as a speech bubble)'],
      ['F', 'Give your pet a treat (face it and press E to pet it)'],
      ['E at a bench or chair', 'Sit down (walk to get up)'],
      ['Esc', 'Close a window, stop decorating'],
    ]
    this.showPanel(
      el(
        'div',
        { class: 'panel-body' },
        el('h2', { text: 'Welcome to Sunset Acres' }),
        el('p', {
          text: 'Grow vegetables in your plot at the Community Garden (south of the home; the noticeboard at its gate sells bigger plots): till, plant, water, wait, harvest. Crops only grow while their soil is wet, and they keep growing while you are away. Sell your harvest to Chef Rosa at the Community Kitchen, or cook it into meals there (she teaches recipes, and meals sell for more than what goes into them; a stove for your room lets you cook at home), then spend your coins on seeds and on making your room cosy (your door is in the hallway of the home).',
        }),
        el(
          'table',
          { class: 'keys' },
          ...rows.map(([k, v]) =>
            el('tr', {}, el('td', {}, el('kbd', { text: k })), el('td', { text: v })),
          ),
        ),
        el('p', {
          class: 'muted',
          text: 'Everyone shares one world: you can see your neighbours, their gardens and their rooms. Your progress is saved to your GitHub account.',
        }),
      ),
    )
  }
}

// --- the character editor (also used to create a character) ------------------------------------

/**
 * The character editor's parts for one Look (edited in place): a turnable preview and the
 * fields (name, body, skin, hair, clothes, extras). Shared by the Wardrobe, the first visit and
 * the family photo editor. Call `dispose` when it's taken off screen.
 */
export function lookFields(
  look: Look,
  opts: { nameLabel?: string; onChange?: () => void } = {},
): { preview: HTMLElement; fields: HTMLElement; name: HTMLInputElement; dispose: () => void } {
  const preview = el('div', { class: 'preview' })
  // The character stands still and only turns when you press an arrow.
  const TURN: Dir[] = [0, 1, 3, 2] // front, left, back, right
  let facing = 0
  const sprite = el('div', { class: 'sprite-box' })
  const draw = () => {
    const cv = document.createElement('canvas')
    cv.width = 16
    cv.height = 24
    cv.getContext('2d')!.drawImage(personSprite(look, TURN[facing], 0), 0, 0)
    cv.className = 'sprite'
    sprite.replaceChildren(cv)
    opts.onChange?.()
  }
  const turn = (step: number) => {
    facing = (facing + step + TURN.length) % TURN.length
    draw()
  }
  const turnLeft = button('◀', () => turn(-1), 'turn')
  const turnRight = button('▶', () => turn(1), 'turn')
  turnLeft.setAttribute('aria-label', 'Turn left')
  turnRight.setAttribute('aria-label', 'Turn right')
  preview.append(turnLeft, sprite, turnRight)
  draw()
  const onKey = (e: KeyboardEvent) => {
    if (!preview.isConnected) return document.removeEventListener('keydown', onKey, true)
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      turn(e.key === 'ArrowLeft' ? -1 : 1)
    }
  }
  // Capture phase, so the game behind the panel doesn't also see the arrow.
  document.addEventListener('keydown', onKey, true)

  const name = el('input')
  name.value = look.name
  name.maxLength = 20
  name.setAttribute('aria-label', opts.nameLabel ?? 'Name')
  name.addEventListener('input', () => {
    look.name = name.value
    opts.onChange?.()
  })
  name.addEventListener('keydown', (e) => e.stopPropagation())

  const swatches = (
    label: string,
    colors: string[],
    key: 'skin' | 'hairColor' | 'outfit' | 'pants',
  ) => {
    const row = el('div', { class: 'swatches' })
    const render = () =>
      row.replaceChildren(
        ...colors.map((col, i) => {
          const b = el('button', {
            class: `swatch${look[key] === i ? ' on' : ''}`,
            title: `${label} ${i + 1}`,
            type: 'button',
          })
          b.style.background = col
          b.setAttribute('aria-label', `${label} ${i + 1}`)
          b.addEventListener('click', () => {
            look[key] = i
            render()
            draw()
          })
          return b
        }),
      )
    render()
    return el('div', { class: 'field' }, el('label', { text: label }), row)
  }

  const choices = <T extends string>(
    label: string,
    values: readonly T[],
    names: Record<T, string>,
    key: 'hair' | 'accessory' | 'body',
    onChange?: () => void,
  ) => {
    const row = el('div', { class: 'choices' })
    const render = () =>
      row.replaceChildren(
        ...values.map((v) => {
          const b = button(
            names[v],
            () => {
              ;(look as unknown as Record<string, string>)[key] = v
              render()
              draw()
              onChange?.()
            },
            `chip${look[key] === v ? ' on' : ''}`,
          )
          return b
        }),
      )
    render()
    return el('div', { class: 'field' }, el('label', { text: label }), row)
  }

  const bottoms = swatches(look.body === 'female' ? 'Skirt' : 'Trousers', PANTS_COLORS, 'pants')
  const fields = el(
    'div',
    { class: 'fields' },
    el('div', { class: 'field' }, el('label', { text: opts.nameLabel ?? 'Name' }), name),
    choices('Body', BODIES, BODY_NAMES, 'body', () => {
      bottoms.querySelector('label')!.textContent = look.body === 'female' ? 'Skirt' : 'Trousers'
    }),
    swatches('Skin', SKIN_TONES, 'skin'),
    choices('Hair', HAIR_STYLES, HAIR_NAMES, 'hair'),
    swatches('Hair colour', HAIR_COLORS, 'hairColor'),
    swatches('Cardigan', OUTFIT_COLORS, 'outfit'),
    bottoms,
    choices('Extra', ACCESSORIES, ACCESSORY_NAMES, 'accessory'),
  )
  return {
    preview,
    fields,
    name,
    dispose: () => document.removeEventListener('keydown', onKey, true),
  }
}

export function wardrobe(
  start: Look,
  opts: {
    title: string
    intro?: string
    confirm: string
    onDone: (look: Look) => void
    /** Extra buttons beside the confirm button (the Wardrobe's "Family photo"). */
    extra?: HTMLElement[]
  },
): HTMLElement {
  const look: Look = { ...start }
  const parts = lookFields(look)
  const error = el('div', { class: 'error' })
  const done = button(
    opts.confirm,
    () => {
      const n = cleanName(look.name)
      if (!n) {
        error.textContent = 'Please give your character a name.'
        parts.name.focus()
        return
      }
      look.name = n
      sfx('coin')
      parts.dispose()
      opts.onDone({ ...look })
    },
    'btn primary big',
  )

  return el(
    'div',
    { class: 'panel-body wardrobe' },
    el('h2', { text: opts.title }),
    opts.intro ? el('p', { text: opts.intro }) : null,
    el('div', { class: 'wardrobe-grid' }, parts.preview, parts.fields),
    error,
    opts.extra?.length ? el('div', { class: 'row-buttons' }, done, ...opts.extra) : done,
  )
}

/**
 * "Who's in your family photo?" (FOREST.md "Your family"): 2–3 relatives, each with a
 * relationship, a name, what they call you and a look, and a Randomize button for the lot.
 */
export function familyEditor(
  you: Look,
  start: Relative[] | undefined,
  opts: { title: string; intro: string; confirm: string; onDone: (members: Relative[]) => void },
): HTMLElement {
  const members: Relative[] = (start ?? randomFamily(you)).map((m) => ({
    ...m,
    look: { ...m.look },
  }))
  let current = 0
  let parts: ReturnType<typeof lookFields> | null = null
  const body = el('div', { class: 'family-member' })
  const tabs = el('div', { class: 'tabs family-tabs' })
  const error = el('div', { class: 'error' })

  const renderTabs = () =>
    tabs.replaceChildren(
      ...members.map((m, i) =>
        button(
          m.look.name.trim() || `Person ${i + 1}`,
          () => {
            current = i
            render()
          },
          `tab${i === current ? ' active' : ''}`,
        ),
      ),
      ...(members.length < FAMILY_MAX
        ? [
            button(
              '+ Add someone',
              () => {
                members.push(
                  randomRelative(
                    'granddaughter',
                    you,
                    members.map((m) => m.look.name),
                  ),
                )
                current = members.length - 1
                render()
              },
              'tab add',
            ),
          ]
        : []),
    )

  const render = () => {
    parts?.dispose()
    const m = members[current]
    parts = lookFields(m.look, { onChange: renderTabs })
    const rel = el('select')
    rel.setAttribute('aria-label', 'Relationship')
    for (const r of RELATIONS) {
      const o = el('option', { text: `Your ${REL[r].name}` })
      o.value = r
      o.selected = r === m.rel
      rel.append(o)
    }
    const calls = el('input')
    calls.maxLength = 20
    calls.value = m.calls
    calls.setAttribute('aria-label', 'What they call you')
    calls.addEventListener('input', () => (m.calls = calls.value))
    calls.addEventListener('keydown', (e) => e.stopPropagation())
    rel.addEventListener('change', () => {
      // Keep what they call you in step with the relationship, unless it was changed by hand.
      const was = REL[m.rel].calls(you)
      m.rel = rel.value as Relation
      if (m.calls === was) calls.value = m.calls = REL[m.rel].calls(you)
    })
    body.replaceChildren(
      el(
        'div',
        { class: 'family-who' },
        el('div', { class: 'field' }, el('label', { text: 'Who are they?' }), rel),
        el('div', { class: 'field' }, el('label', { text: 'They call you' }), calls),
        members.length > FAMILY_MIN
          ? button(
              'Remove from photo',
              () => {
                members.splice(current, 1)
                current = Math.min(current, members.length - 1)
                render()
              },
              'btn small',
            )
          : null,
      ),
      el('div', { class: 'wardrobe-grid' }, parts.preview, parts.fields),
    )
    renderTabs()
  }
  render()

  const randomize = button(
    'Randomize',
    () => {
      members.splice(0, members.length, ...randomFamily(you))
      current = 0
      sfx('blip')
      render()
    },
    'btn',
  )
  const done = button(
    opts.confirm,
    () => {
      for (const [i, m] of members.entries()) {
        const n = cleanName(m.look.name)
        const c = cleanName(m.calls)
        if (!n || !c) {
          current = i
          render()
          error.textContent = !n
            ? 'Everyone in the photo needs a name.'
            : 'Please say what they call you.'
          return
        }
        m.look.name = n
        m.calls = c
      }
      parts?.dispose()
      sfx('coin')
      opts.onDone(members.map((m) => ({ ...m, look: { ...m.look } })))
    },
    'btn primary big',
  )
  return el(
    'div',
    { class: 'panel-body wardrobe family' },
    el('h2', { text: opts.title }),
    el('p', { text: opts.intro }),
    el('div', { class: 'family-top' }, tabs, randomize),
    body,
    error,
    done,
  )
}

/**
 * The family photo, up close: each relative's portrait, name, who they are and what they call
 * you. It's the forest's answer key. `actions` go underneath (take it, put it back, close).
 */
export function familyCard(members: Relative[], note: string, actions: HTMLElement[]): HTMLElement {
  return el(
    'div',
    { class: 'panel-body family-card' },
    el('h2', { text: 'Your family photo' }),
    el(
      'div',
      { class: 'family-faces' },
      ...members.map((m) => {
        const face = el('canvas', { class: 'family-face' })
        face.width = PORTRAIT
        face.height = PORTRAIT
        face.getContext('2d')!.drawImage(portrait(m.look, { old: looksOld(m.rel) }), 0, 0)
        face.setAttribute('aria-hidden', 'true')
        return el(
          'figure',
          { class: 'family-person' },
          face,
          el(
            'figcaption',
            {},
            el('strong', { text: m.look.name }),
            el('span', { text: `your ${REL[m.rel].name}` }),
            el('span', { class: 'muted', text: `calls you "${m.calls}"` }),
          ),
        )
      }),
    ),
    note ? el('p', { class: 'muted', text: note }) : null,
    el('div', { class: 'row-buttons' }, ...actions),
  )
}

/** Swaps a few neighbouring letters, more with `amount` (0–1), for a fake's failing voice. */
function scramble(text: string, amount: number): string {
  const ch = text.split('')
  for (let i = 0; i < ch.length - 1; i++)
    if (/[a-z]/i.test(ch[i]) && /[a-z]/i.test(ch[i + 1]) && Math.random() < amount * 0.12) {
      ;[ch[i], ch[i + 1]] = [ch[i + 1], ch[i]]
      i++
    }
  return ch.join('')
}

/** "in a few minutes" / "tomorrow" for a reprint that's ready at `at` (24 real minutes a day). */
function reprintWhen(at: number): string {
  const min = Math.ceil((at - Date.now()) / 60_000)
  if (min <= 1) return 'any moment now'
  return `in about ${min} minutes`
}

function pieceColor(game: GameKind, side: Side, first: Side): string {
  return side === first ? TABLE_PIECES[game].first : TABLE_PIECES[game].second
}

function ingredientName(key: string): string {
  if (key === 'egg') return 'Eggs'
  const [, id] = key.split(':')
  return CROPS[id]?.name ?? key
}

function ingredientIcon(key: string): HTMLElement {
  if (key === 'egg') return eggIcon(16)
  return cropIcon(key.split(':')[1], true, 18)
}
