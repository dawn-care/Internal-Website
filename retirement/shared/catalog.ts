/*
 * Game data shared by the browser game and the /api/retirement function (which uses it to
 * validate saves). Pure data: no DOM, no Node APIs.
 */

/**
 * Garden plot sizes, in tiles, smallest first. Everyone starts on the first; each later size is
 * bought in turn from the garden noticeboard. Every allotment in the garden has room for the
 * largest, so a plot grows in place (to the right and down) without moving anyone else's.
 */
export interface PlotSize {
  w: number
  h: number
  price: number
}
export const PLOT_SIZES: readonly PlotSize[] = [
  { w: 5, h: 3, price: 0 },
  { w: 7, h: 4, price: 600 },
  { w: 9, h: 5, price: 1500 },
]
export const PLOT_MAX = PLOT_SIZES[PLOT_SIZES.length - 1]

/** The size of plot `level` (an index into PLOT_SIZES; out-of-range reads as the first). */
export function plotSize(level: number | undefined): PlotSize {
  return PLOT_SIZES[level ?? 0] ?? PLOT_SIZES[0]
}
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
/** Crops that can be dug up and potted once grown (they keep fruiting, so they're worth moving). */
export const POTTABLE = CROP_IDS.filter((c) => CROPS[c].regrows)

/** What Chef Rosa pays for a potted plant you dug up: a little more than its seed. */
export function plantPrice(crop: string): number {
  return Math.round(CROPS[crop].seedPrice * 1.2)
}

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
  // Comes free with a pet (price 0 keeps it out of the Catalog).
  petbed: { id: 'petbed', name: 'Pet bed', price: 0, w: 1, h: 1 },
  fishtank: { id: 'fishtank', name: 'Fish tank', price: 200, w: 2, h: 1 },
  clock: { id: 'clock', name: 'Grandfather clock', price: 220, w: 1, h: 1 },
  piano: { id: 'piano', name: 'Upright piano', price: 400, w: 2, h: 1 },
  // Cook your known recipes at home (face it and press E).
  stove: { id: 'stove', name: 'Little stove', price: 250, w: 1, h: 1 },
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

// --- pets ----------------------------------------------------------------------------------

export const PET_KINDS = ['dog', 'cat'] as const
export type PetKind = (typeof PET_KINDS)[number]

export interface PetCoat {
  name: string
  base: string
  dark: string
  light: string
  /** Muzzle, chest and paws. */
  belly: string
  pattern: 'plain' | 'stripes' | 'patches' | 'tuxedo'
  /** Patch colour for calico. */
  patch?: string
}

export const PET_COATS: Record<PetKind, PetCoat[]> = {
  dog: [
    {
      name: 'Golden',
      base: '#e0a64e',
      dark: '#b07a2c',
      light: '#f3c97c',
      belly: '#f6e2b8',
      pattern: 'plain',
    },
    {
      name: 'Chocolate',
      base: '#7a4a2a',
      dark: '#55301a',
      light: '#9a6440',
      belly: '#b98a62',
      pattern: 'plain',
    },
    {
      name: 'Black & white',
      base: '#2e2a30',
      dark: '#1a171c',
      light: '#4a4550',
      belly: '#f4efe6',
      pattern: 'tuxedo',
    },
    {
      name: 'Silver',
      base: '#a3a3ae',
      dark: '#77777f',
      light: '#c6c6ce',
      belly: '#e6e6ea',
      pattern: 'plain',
    },
  ],
  cat: [
    {
      name: 'Orange tabby',
      base: '#e8933f',
      dark: '#b8621c',
      light: '#f6b56c',
      belly: '#f8dcb6',
      pattern: 'stripes',
    },
    {
      name: 'Black',
      base: '#2a2630',
      dark: '#18151c',
      light: '#45404e',
      belly: '#3a3542',
      pattern: 'plain',
    },
    {
      name: 'Grey tabby',
      base: '#8e8e9a',
      dark: '#5e5e6a',
      light: '#b2b2bc',
      belly: '#dcdce2',
      pattern: 'stripes',
    },
    {
      name: 'Calico',
      base: '#f4eee4',
      dark: '#c9c0b0',
      light: '#ffffff',
      belly: '#ffffff',
      pattern: 'patches',
      patch: '#e8933f',
    },
  ],
}

export const PET_NAME_MAX = 14
/** Affection, 0–HEARTS_MAX; petting and a treat each add one, at most once a day each. */
export const HEARTS_MAX = 10
/** From this many hearts your pet sometimes brings you a little gift (once a day at most). */
export const GIFT_HEARTS = 5
/** Chef Rosa sells treats in packs. */
export const TREAT_PACK = { count: 3, price: 10 }

// --- animals ---------------------------------------------------------------------------------

/** Hens in the henhouse; each lays one egg per game day, for every player to collect. */
export const HENS = 3
/** The game hour the hens lay. Eggs belong to the "egg day" that starts then. */
export const LAY_HOUR = 7
/** What Chef Rosa pays for an egg. */
export const EGG_PRICE = 15

// --- cooking ---------------------------------------------------------------------------------

/**
 * A recipe: what goes in (inventory keys, e.g. "crop:carrot" or "egg") and what the meal sells
 * for. Meals always sell for more than their ingredients would, so cooking pays even if you never
 * go into the forest. Chef Rosa teaches each recipe for `lesson` coins (0: everyone knows it).
 * What a meal does in the forest is FOREST.md "Meals"; forest-ingredient recipes (mushroom broth,
 * herbal tea) come with the forest.
 */
export interface RecipeDef {
  id: string
  name: string
  ingredients: Record<string, number>
  sellPrice: number
  lesson: number
  /** Chef Rosa's tip, shown with the recipe. */
  note: string
  /** Colours for the meal's icon: the bowl or plate, and the food on it. */
  dish: 'bowl' | 'plate' | 'jar' | 'pie'
  food: string
  foodDark: string
}

export const RECIPES: Record<string, RecipeDef> = {
  salad: {
    id: 'salad',
    name: 'Radish salad',
    ingredients: { 'crop:radish': 3 },
    sellPrice: 45,
    lesson: 0,
    note: 'Sliced thin, with a pinch of salt. Everyone starts somewhere!',
    dish: 'bowl',
    food: '#e0475b',
    foodDark: '#5fae3e',
  },
  omelette: {
    id: 'omelette',
    name: 'Garden omelette',
    ingredients: { egg: 2, 'crop:carrot': 1 },
    sellPrice: 75,
    lesson: 40,
    note: 'Fresh eggs from the henhouse and a grated carrot.',
    dish: 'plate',
    food: '#f6d65a',
    foodDark: '#f08a24',
  },
  soup: {
    id: 'soup',
    name: 'Vegetable soup',
    ingredients: { 'crop:radish': 1, 'crop:carrot': 1, 'crop:tomato': 1 },
    sellPrice: 100,
    lesson: 60,
    note: 'My mother’s recipe. It warms you right through.',
    dish: 'bowl',
    food: '#d9573a',
    foodDark: '#f08a24',
  },
  cake: {
    id: 'cake',
    name: 'Carrot cake',
    ingredients: { 'crop:carrot': 2, egg: 1 },
    sellPrice: 95,
    lesson: 80,
    note: 'The secret is a little cinnamon.',
    dish: 'plate',
    food: '#c98a4a',
    foodDark: '#fff1dc',
  },
  jam: {
    id: 'jam',
    name: 'Strawberry jam toast',
    ingredients: { 'crop:strawberry': 3 },
    sellPrice: 90,
    lesson: 80,
    note: 'Boil the berries down slowly and spread it thick.',
    dish: 'jar',
    food: '#c81f3a',
    foodDark: '#e0a95e',
  },
  seeds: {
    id: 'seeds',
    name: 'Roasted sunflower seeds',
    ingredients: { 'crop:sunflower': 1 },
    sellPrice: 120,
    lesson: 100,
    note: 'Roast them until they crackle. A lovely thing to share on a bench.',
    dish: 'bowl',
    food: '#7a4a1d',
    foodDark: '#e9d3a0',
  },
  pie: {
    id: 'pie',
    name: 'Pumpkin pie',
    ingredients: { 'crop:pumpkin': 1, egg: 2 },
    sellPrice: 260,
    lesson: 150,
    note: 'The pride of the autumn fair. Make it for someone you love.',
    dish: 'pie',
    food: '#e07a24',
    foodDark: '#c98a4a',
  },
}
export const RECIPE_IDS = Object.keys(RECIPES)
/** Recipes everyone knows from the start (they're never stored in the save). */
export const STARTER_RECIPES = RECIPE_IDS.filter((r) => RECIPES[r].lesson === 0)
/** The furniture you cook on at home. */
export const STOVE = 'stove'

/** What Chef Rosa pays for one of an inventory item (0 for things she doesn't buy). */
export function itemPrice(key: string): number {
  const [kind, id] = key.split(':')
  if (key === 'egg') return EGG_PRICE
  if (kind === 'crop' && CROPS[id]) return CROPS[id].sellPrice
  if (kind === 'plant' && POTTABLE.includes(id)) return plantPrice(id)
  if (kind === 'meal' && RECIPES[id]) return RECIPES[id].sellPrice
  return 0
}

/** How many of a recipe you could cook with what's in `inv`. */
export function cookable(inv: Record<string, number>, recipe: string): number {
  let n = Infinity
  for (const [k, need] of Object.entries(RECIPES[recipe].ingredients))
    n = Math.min(n, Math.floor((inv[k] ?? 0) / need))
  return n === Infinity ? 0 : n
}

/** Whether you know a recipe: a starter one, or one Chef Rosa taught you. */
export function knowsRecipe(learned: readonly string[] | undefined, recipe: string): boolean {
  return RECIPES[recipe]?.lesson === 0 || (learned ?? []).includes(recipe)
}
