import { CROPS, PLOT_H, PLOT_W } from '../shared/catalog'
import { INTRO, type IntroStep, type MapId, type Save } from '../shared/schema'
import * as garden from './garden'
import { HOME_DOOR, getHall, plotOrigin, roomId, type GameMap, type Npc } from './maps'

/*
 * Nurse Ada's introduction: greet, then plant something, sell it, and buy a piece of furniture.
 * The step lives in the save (`intro`); a save without it has finished (or predates) the intro.
 * This file is the data and the "where to next" logic; Game wires it to events and drawing.
 */

/** Ada waits on the plaza just west of where new arrivals appear, until the intro is done. */
export const INTRO_ADA: Npc = {
  id: 'nurse-intro',
  x: 21.5,
  y: 11.6,
  dir: 0,
  name: 'Nurse Ada',
  look: {
    name: 'Nurse Ada',
    body: 'female',
    skin: 4,
    hair: 'short',
    hairColor: 5,
    outfit: 4,
    pants: 2,
    accessory: 'none',
  },
}
export const INTRO_ADA_TILE = { x: 21, y: 11 } as const

/** Where Chef Rosa stands (arrow target for "sell it"). */
const ROSA = { x: 42.5, y: 16.9 }

/** What Ada gives you for finishing: a piece of furniture into storage. */
export const INTRO_GIFT = 'painting'

export const INTRO_TASKS: { step: IntroStep; label: string }[] = [
  { step: INTRO.plant, label: 'Plant something in your plot' },
  { step: INTRO.sell, label: 'Sell your harvest to Chef Rosa' },
  { step: INTRO.buy, label: 'Buy something for your room' },
]

export const ADA_VOICE = 520

export function greeting(name: string): string[] {
  return [
    `Welcome to Sunset Acres, ${name}! I'm Nurse Ada. You'll usually find me at the front desk inside.`,
    "Let's get you settled in. Just three little things: plant something in your garden plot, sell what you grow to Chef Rosa, and buy something nice for your room.",
    'Your plot is in the Community Garden, just south of here. Follow the little arrow, dear.',
  ]
}

export const AFTER_PLANT =
  'Nurse Ada: Lovely! Now give it some water. Plants only grow while the soil is wet.'
export const AFTER_SELL =
  "Nurse Ada: Your first coins! Now let's make your room feel like home. Pick something from the Catalog."

export function finale(name: string, giftName: string): string[] {
  return [
    `Oh, that looks lovely in here, ${name}. You're all settled in!`,
    `I've left you a little welcome present: a ${giftName.toLowerCase()}. It's waiting in your storage; you'll find it under Decorate.`,
    'If you ever forget how something works, press Help. And come and say hello at the front desk any time. Welcome home, dear.',
  ]
}

export function isActive(save: Save): boolean {
  return save.intro !== undefined
}

/** The hint under the current task in the checklist (and what Ada says if you talk to her). */
export function hint(
  save: Save,
  slot: number,
  mapId: MapId,
  login: string,
  now: number,
  nearPlot: boolean,
): string {
  switch (save.intro) {
    case INTRO.greet:
      return 'Talk to Nurse Ada, just outside the front door.'
    case INTRO.plant: {
      if (mapId !== 'grounds') return 'Head outside to the Community Garden, south of the home.'
      if (!nearPlot)
        return 'Your plot is in the Community Garden, south of the home. Follow the arrow.'
      if (!Object.keys(save.inv).some((k) => k.startsWith('seed:') && save.inv[k] > 0))
        return "You're out of seeds. Chef Rosa sells more at the Kitchen."
      if (save.garden.some((t) => t.s === 1 && !t.c))
        return 'Face a dug square in your plot and press E to plant a radish.'
      return 'Face a square of your plot and press E to dig it, then press E again to plant.'
    }
    case INTRO.sell: {
      if (Object.keys(save.inv).some((k) => k.startsWith('crop:') && save.inv[k] > 0))
        return 'Take your harvest to Chef Rosa at the Community Kitchen (east of the home) and sell it.'
      if (!nearPlot) return 'Go and check on your plot in the Community Garden.'
      const planted = save.garden.filter((t) => t.c)
      if (planted.some((t) => garden.stage(t, now) === 3))
        return "It's ready! Face it and press E to pick it."
      if (planted.some((t) => !garden.isWet(t, now)))
        return 'Water it: face the plant and press E, or use the Water all button.'
      const growing = planted.filter((t) => garden.isWet(t, now))
      if (growing.length) {
        const left = Math.min(...growing.map((t) => garden.timeLeft(t, now)))
        const crop = CROPS[growing[0].c!].name.toLowerCase()
        return `Your ${crop} is growing. About ${Math.max(1, Math.ceil(left / 1000))}s to go while the soil is wet.`
      }
      return 'Plant another seed in your plot and grow it.'
    }
    case INTRO.buy:
      if (mapId === roomId(login)) return 'Press Catalog (top right) and buy something you like.'
      if (mapId === 'hall')
        return `Your room is ${101 + slot}, along the hallway. Follow the arrow.`
      if (mapId === 'grounds') return `Go in through the front door, then to Room ${101 + slot}.`
      return `Head back to the hallway and find Room ${101 + slot}.`
    default:
      return ''
  }
}

interface Goal {
  map: MapId
  x: number
  y: number
  plot?: boolean
}

function goal(save: Save, slot: number, login: string): Goal | null {
  switch (save.intro) {
    case INTRO.greet:
      return { map: 'grounds', x: INTRO_ADA.x, y: INTRO_ADA.y - 2.25 }
    case INTRO.plant:
    case INTRO.sell: {
      const hasCrop = Object.keys(save.inv).some((k) => k.startsWith('crop:') && save.inv[k] > 0)
      if (save.intro === INTRO.sell && hasCrop)
        return { map: 'grounds', x: ROSA.x, y: ROSA.y - 2.25 }
      const o = plotOrigin(slot)
      return { map: 'grounds', x: o.x + PLOT_W / 2, y: o.y + PLOT_H / 2 - 0.6, plot: true }
    }
    case INTRO.buy:
      // In your own room the Catalog button glows instead.
      return { map: roomId(login), x: -1, y: -1 }
    default:
      return null
  }
}

/**
 * Where the guide arrow points on the current map (tile coordinates of its tip), or null.
 * When the goal is on another map, it points at the door that leads there.
 */
export function arrowTarget(
  save: Save,
  slot: number,
  login: string,
  map: GameMap,
  nearPlot: boolean,
): { x: number; y: number } | null {
  if (slot < 0) return null
  const g = goal(save, slot, login)
  if (!g) return null
  // At your plot the hint says what to do; an arrow would only hide the seedlings.
  if (g.plot && nearPlot) return null
  if (g.map === map.id) return g.x < 0 ? null : { x: g.x, y: g.y }
  const door = (to: (it: GameMap['interacts'][number]) => boolean) => {
    const it = map.interacts.find(to)
    return it ? { x: it.x + 0.5, y: it.y - 0.4 } : null
  }
  if (map.id === 'grounds') return { x: HOME_DOOR.x + 1, y: HOME_DOOR.y - 0.4 }
  if (map.id === 'hall') {
    if (g.map === 'grounds') {
      const exits = getHall().interacts.filter((i) => i.kind === 'door' && i.to === 'grounds')
      if (!exits.length) return null
      const x = exits.reduce((s, i) => s + i.x, 0) / exits.length
      return { x: x + 0.5, y: exits[0].y - 0.4 }
    }
    return door((i) => i.kind === 'roomDoor' && i.slot === slot)
  }
  // In a room: the way out.
  return door((i) => i.kind === 'door')
}
