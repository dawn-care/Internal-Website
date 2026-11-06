import {
  ACCESSORIES,
  ACCESSORY_NAMES,
  BODIES,
  BODY_NAMES,
  CROPS,
  CROP_IDS,
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
  TREAT_PACK,
  type PetKind,
  PANTS_COLORS,
  SKIN_TONES,
  WALLPAPERS,
} from '../shared/catalog'
import { INTRO, cleanName, type Dir, type Look, type MapId } from '../shared/schema'
import { cropIcon, finishSwatch, furnitureIcon } from './art'
import { isMuted, setMuted, sfx, voice } from './audio'
import { isMusicOn, setMusicOn } from './music'
import { fmt, type Game } from './game'
import { INTRO_TASKS, isActive as introActive } from './intro'
import { petSprite, treatIcon } from './pets'
import { personSprite } from './people'
import { PORTRAIT, portrait } from './portraits'

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
}

const TYPE_MS = 24

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
      this.toasts,
      this.prompt,
      this.hotbar,
      this.chatlog,
      this.chatForm,
      this.decorbar,
      this.dialogueBox,
      this.backdrop,
    )
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
    const key = `${step}|${hint}`
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
    )
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
      c.drawImage(portrait(look, { old: t.opts.old, talk, blink }), 0, 0)
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
      if (ch && /[a-z0-9]/i.test(ch) && t.shown % 2 === 1) voice(t.opts.pitch ?? 440)
      this.paintLine()
      if (t.shown >= line.length) window.clearInterval(t.timer)
    }, TYPE_MS)
    this.paintLine()
  }

  private paintLine() {
    const t = this.talk
    if (!t) return
    const line = t.lines[t.i]
    const done = t.shown >= line.length
    const { text, more } = t
    text.textContent = line.slice(0, t.shown)
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

  private closeDialogue() {
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
      const s = el(
        'button',
        {
          class: `slot${g.selectedSeed === id ? ' selected' : ''}${n ? '' : ' empty'}`,
          title: `${CROPS[id].name} seeds (${i + 1})`,
          type: 'button',
        },
        el('span', { class: 'key', text: String(i + 1) }),
        cropIcon(id, false),
        el('span', { class: 'count', text: String(n) }),
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
    this.hotbar.replaceChildren(
      el('div', { class: 'seeds' }, el('span', { class: 'label', text: 'Seeds' }), ...slots),
      el(
        'div',
        { class: 'bag' },
        el('span', { class: 'label', text: 'Basket' }),
        ...(produce.length ? produce : [el('span', { class: 'muted', text: 'empty' })]),
      ),
      ...(water ? [water] : []),
    )
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
    if (text)
      this.prompt.replaceChildren(el('kbd', { text: 'E' }), document.createTextNode(` ${text}`))
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

  // --- toasts & chat ------------------------------------------------------------------------

  toast(text: string) {
    const t = el('div', { class: 'toast', text })
    this.toasts.append(t)
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove()
    setTimeout(() => t.classList.add('out'), 4200)
    setTimeout(() => t.remove(), 4800)
  }

  openChat() {
    this.chatForm.hidden = false
    this.chatInput.focus()
  }

  private closeChat() {
    this.chatForm.hidden = true
    this.chatInput.blur()
  }

  renderChat() {
    const g = this.game
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
    const render = (tab: 'sell' | 'seeds') => {
      const tabs = el(
        'div',
        { class: 'tabs' },
        button('Sell produce', () => render('sell'), `tab${tab === 'sell' ? ' active' : ''}`),
        button(
          g.save.pet ? 'Seeds & treats' : 'Buy seeds',
          () => render('seeds'),
          `tab${tab === 'seeds' ? ' active' : ''}`,
        ),
      )
      const rows =
        tab === 'sell'
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
            text: 'Chef Rosa: "Fresh from the garden? I\'ll take it for tonight\'s soup!"',
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
      }),
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
      ['Enter', 'Chat (shows as a speech bubble)'],
      ['F', 'Give your pet a treat (face it and press E to pet it)'],
      ['Esc', 'Close a window, stop decorating'],
    ]
    this.showPanel(
      el(
        'div',
        { class: 'panel-body' },
        el('h2', { text: 'Welcome to Sunset Acres' }),
        el('p', {
          text: 'Grow vegetables in your plot at the Community Garden (bottom left of the grounds): till, plant, water, wait, harvest. Crops only grow while their soil is wet, and they keep growing while you are away. Sell your harvest to Chef Rosa at the Community Kitchen, then spend your coins on seeds and on making your room cosy (your door is in the hallway of the home).',
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

export function wardrobe(
  start: Look,
  opts: { title: string; intro?: string; confirm: string; onDone: (look: Look) => void },
): HTMLElement {
  const look: Look = { ...start }
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
    if (!preview.isConnected) return document.removeEventListener('keydown', onKey)
    if (e.target instanceof HTMLInputElement) return
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
  name.setAttribute('aria-label', 'Name')
  name.addEventListener('input', () => (look.name = name.value))
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

  const error = el('div', { class: 'error' })
  const done = button(
    opts.confirm,
    () => {
      const n = cleanName(look.name)
      if (!n) {
        error.textContent = 'Please give your character a name.'
        name.focus()
        return
      }
      look.name = n
      sfx('coin')
      document.removeEventListener('keydown', onKey, true)
      opts.onDone({ ...look })
    },
    'btn primary big',
  )

  return el(
    'div',
    { class: 'panel-body wardrobe' },
    el('h2', { text: opts.title }),
    opts.intro ? el('p', { text: opts.intro }) : null,
    el(
      'div',
      { class: 'wardrobe-grid' },
      preview,
      el(
        'div',
        { class: 'fields' },
        el('div', { class: 'field' }, el('label', { text: 'Name' }), name),
        choices('Body', BODIES, BODY_NAMES, 'body', () => {
          bottoms.querySelector('label')!.textContent =
            look.body === 'female' ? 'Skirt' : 'Trousers'
        }),
        swatches('Skin', SKIN_TONES, 'skin'),
        choices('Hair', HAIR_STYLES, HAIR_NAMES, 'hair'),
        swatches('Hair colour', HAIR_COLORS, 'hairColor'),
        swatches('Cardigan', OUTFIT_COLORS, 'outfit'),
        bottoms,
        choices('Extra', ACCESSORIES, ACCESSORY_NAMES, 'accessory'),
      ),
    ),
    error,
    done,
  )
}
