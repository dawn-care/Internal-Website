/*
 * Game data shared by the browser game and the /api/retirement function (which uses it to
 * validate saves). Pure data: no DOM, no Node APIs.
 */

/** Each player's plot in the community garden, in tiles. */
export const PLOT_W = 5
export const PLOT_H = 3
/** Plots in the garden and doors in the hallway. */
export const MAX_SLOTS = 12
export const START_COINS = 60
/** How long one watering keeps a crop growing. Crops only grow while watered. */
export const WATER_MS = 3 * 60_000

/** The player's room, in tiles. Rows 1–2 are wall (for wall hangings), 3–8 floor. */
export const ROOM_W = 14
export const ROOM_H = 10
export const ROOM_FLOOR = { x0: 1, y0: 3, x1: 12, y1: 8 } as const
export const ROOM_WALL = { x0: 1, y0: 1, x1: 12, y1: 2 } as const
export const ROOM_DOOR_X = 7

export interface CropDef {
  id: string
  name: string
  seedPrice: number
  sellPrice: number
  growMs: number
  /** Regrowing crops go back to their last growth stage after harvest instead of vanishing. */
  regrows?: boolean
  fruit: string
  fruitDark: string
  leaf: string
}

export const CROPS: Record<string, CropDef> = {
  radish: {
    id: 'radish',
    name: 'Radish',
    seedPrice: 5,
    sellPrice: 12,
    growMs: 60_000,
    fruit: '#e0475b',
    fruitDark: '#9c2338',
    leaf: '#5fae3e',
  },
  carrot: {
    id: 'carrot',
    name: 'Carrot',
    seedPrice: 10,
    sellPrice: 26,
    growMs: 2 * 60_000,
    fruit: '#f08a24',
    fruitDark: '#b85a10',
    leaf: '#4f9e35',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    seedPrice: 25,
    sellPrice: 22,
    growMs: 3 * 60_000,
    regrows: true,
    fruit: '#e8344a',
    fruitDark: '#a01c30',
    leaf: '#3f8f3a',
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    seedPrice: 30,
    sellPrice: 34,
    growMs: 4 * 60_000,
    regrows: true,
    fruit: '#e5412f',
    fruitDark: '#a3281b',
    leaf: '#3d8a33',
  },
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    seedPrice: 35,
    sellPrice: 90,
    growMs: 5 * 60_000,
    fruit: '#f6c636',
    fruitDark: '#7a4a1d',
    leaf: '#4c9a30',
  },
  pumpkin: {
    id: 'pumpkin',
    name: 'Pumpkin',
    seedPrice: 50,
    sellPrice: 160,
    growMs: 8 * 60_000,
    fruit: '#ef8a1f',
    fruitDark: '#b0570e',
    leaf: '#45902f',
  },
}
export const CROP_IDS = Object.keys(CROPS)

export interface FurnitureDef {
  id: string
  name: string
  price: number
  w: number
  h: number
  /** Hangs on the wall rows instead of standing on the floor. */
  wall?: boolean
  /** Walkable (rugs). Everything else blocks movement. */
  flat?: boolean
}

export const FURNITURE: Record<string, FurnitureDef> = {
  bed: { id: 'bed', name: 'Quilted bed', price: 0, w: 2, h: 3 },
  nightstand: { id: 'nightstand', name: 'Nightstand', price: 0, w: 1, h: 1 },
  photos: { id: 'photos', name: 'Family photos', price: 15, w: 1, h: 1, wall: true },
  fern: { id: 'fern', name: 'Potted fern', price: 20, w: 1, h: 1 },
  basket: { id: 'basket', name: 'Knitting basket', price: 25, w: 1, h: 1 },
  painting: { id: 'painting', name: 'Flower painting', price: 30, w: 1, h: 1, wall: true },
  lamp: { id: 'lamp', name: 'Floor lamp', price: 35, w: 1, h: 1 },
  wallclock: { id: 'wallclock', name: 'Wall clock', price: 40, w: 1, h: 1, wall: true },
  armchair: { id: 'armchair', name: 'Armchair', price: 45, w: 1, h: 1 },
  rug: { id: 'rug', name: 'Braided rug', price: 45, w: 3, h: 2, flat: true },
  table: { id: 'table', name: 'Tea table', price: 55, w: 2, h: 1 },
  rocker: { id: 'rocker', name: 'Rocking chair', price: 60, w: 1, h: 1 },
  puzzle: { id: 'puzzle', name: 'Jigsaw table', price: 65, w: 2, h: 1 },
  landscape: { id: 'landscape', name: 'Lake landscape', price: 70, w: 2, h: 1, wall: true },
  bookshelf: { id: 'bookshelf', name: 'Bookshelf', price: 80, w: 2, h: 1 },
  quilt: { id: 'quilt', name: 'Quilt hanging', price: 90, w: 2, h: 1, wall: true },
  record: { id: 'record', name: 'Record player', price: 120, w: 1, h: 1 },
  tv: { id: 'tv', name: 'Television', price: 150, w: 2, h: 1 },
  catbed: { id: 'catbed', name: 'Cat (with bed)', price: 175, w: 1, h: 1 },
  fishtank: { id: 'fishtank', name: 'Fish tank', price: 200, w: 2, h: 1 },
  clock: { id: 'clock', name: 'Grandfather clock', price: 220, w: 1, h: 1 },
  piano: { id: 'piano', name: 'Upright piano', price: 400, w: 2, h: 1 },
}
export const FURNITURE_IDS = Object.keys(FURNITURE)

export interface Finish {
  id: string
  name: string
  price: number
  base: string
  accent: string
}

export const WALLPAPERS: Record<string, Finish> = {
  cream: { id: 'cream', name: 'Cream stripes', price: 0, base: '#f3e6c8', accent: '#e6d3aa' },
  rose: { id: 'rose', name: 'Rose floral', price: 40, base: '#efc9c4', accent: '#d98b8b' },
  sage: { id: 'sage', name: 'Sage', price: 40, base: '#c5d6b0', accent: '#a8bf8e' },
  lavender: { id: 'lavender', name: 'Lavender', price: 50, base: '#d3c8e6', accent: '#b4a5d3' },
  damask: { id: 'damask', name: 'Blue damask', price: 60, base: '#a9bfd8', accent: '#8aa3c2' },
  panel: { id: 'panel', name: 'Wood paneling', price: 80, base: '#a8754a', accent: '#8c5d37' },
}
export const FLOORS: Record<string, Finish> = {
  oak: { id: 'oak', name: 'Oak boards', price: 0, base: '#c08a55', accent: '#a5703f' },
  checker: { id: 'checker', name: 'Checker lino', price: 30, base: '#ece4d2', accent: '#b8483e' },
  moss: { id: 'moss', name: 'Moss carpet', price: 40, base: '#7f9a5a', accent: '#6f8a4c' },
  rosecarpet: {
    id: 'rosecarpet',
    name: 'Rose carpet',
    price: 40,
    base: '#c98a8f',
    accent: '#b5767c',
  },
  parquet: { id: 'parquet', name: 'Parquet', price: 70, base: '#9a6a3c', accent: '#7d532c' },
}

export const SKIN_TONES = ['#f7d7c0', '#eec1a0', '#d9a27a', '#b97d55', '#8d5a3b', '#5e3b26']
export const HAIR_COLORS = ['#f4f1ea', '#d2d0cc', '#a9a8a6', '#c9c3e6', '#b9d3e8', '#6b6158']
export const OUTFIT_COLORS = [
  '#d4423c',
  '#e98131',
  '#f0bc35',
  '#5aa83c',
  '#2f95b8',
  '#4a66c8',
  '#8e4fbb',
  '#d85a9d',
]
export const PANTS_COLORS = ['#433f62', '#6e5232', '#2f5a80', '#77705f', '#94443f']
export const BODIES = ['female', 'male'] as const
export type Body = (typeof BODIES)[number]
export const BODY_NAMES: Record<Body, string> = { female: 'Female', male: 'Male' }
export const HAIR_STYLES = ['bun', 'short', 'curly', 'perm', 'long', 'bald'] as const
export const ACCESSORIES = ['none', 'glasses', 'hat', 'cane', 'pearls', 'scarf'] as const
export type HairStyle = (typeof HAIR_STYLES)[number]
export type Accessory = (typeof ACCESSORIES)[number]

export const HAIR_NAMES: Record<HairStyle, string> = {
  bun: 'Bun',
  short: 'Short',
  curly: 'Curls',
  perm: 'Perm',
  long: 'Long',
  bald: 'Bald',
}
export const ACCESSORY_NAMES: Record<Accessory, string> = {
  none: 'None',
  glasses: 'Glasses',
  hat: 'Sun hat',
  cane: 'Cane',
  pearls: 'Pearls',
  scarf: 'Scarf',
}
