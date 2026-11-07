import {
  ACCESSORIES,
  FAMILY_MAX,
  FAMILY_MIN,
  OUTFIT_COLORS,
  PANTS_COLORS,
  SKIN_TONES,
  type Accessory,
  type Body,
  type HairStyle,
  type Relation,
} from '../shared/catalog'
import type { Look, Relative } from '../shared/schema'

/*
 * Your family (FOREST.md "Your family"): the 2–3 people in the photo on your wall. This is the
 * data about relationships (what to call them, what they'd call you, who looks old or young) and
 * the Randomize button. The photo is the forest's answer key: real relatives look exactly like
 * it, and call you what it says.
 */

interface RelInfo {
  /** "your son" */
  name: string
  /** Who usually fills the role, for the default look and names. */
  body: Body | 'either'
  /** Your generation (grey hair, smile lines) or younger. */
  age: 'old' | 'grown' | 'young'
  /** What they call you, by default (you can change it). */
  calls: (you: Look) => string
}

const parent = (you: Look) => (you.body === 'male' ? 'Dad' : 'Mum')
const grand = (you: Look) => (you.body === 'male' ? 'Grandad' : 'Gran')
const aunt = (you: Look) => `${you.body === 'male' ? 'Uncle' : 'Auntie'} ${you.name}`.slice(0, 20)
const own = (you: Look) => you.name

export const REL: Record<Relation, RelInfo> = {
  son: { name: 'son', body: 'male', age: 'grown', calls: parent },
  daughter: { name: 'daughter', body: 'female', age: 'grown', calls: parent },
  husband: { name: 'husband', body: 'male', age: 'old', calls: own },
  wife: { name: 'wife', body: 'female', age: 'old', calls: own },
  partner: { name: 'partner', body: 'either', age: 'old', calls: own },
  grandson: { name: 'grandson', body: 'male', age: 'young', calls: grand },
  granddaughter: { name: 'granddaughter', body: 'female', age: 'young', calls: grand },
  sister: { name: 'sister', body: 'female', age: 'old', calls: own },
  brother: { name: 'brother', body: 'male', age: 'old', calls: own },
  niece: { name: 'niece', body: 'female', age: 'grown', calls: aunt },
  nephew: { name: 'nephew', body: 'male', age: 'grown', calls: aunt },
}

/** "Tom, your son" */
export function relLabel(m: Relative): string {
  return `${m.look.name}, your ${REL[m.rel].name}`
}

/** Portraits of people your age get smile lines (see portraits.ts). */
export function looksOld(rel: Relation): boolean {
  return REL[rel].age === 'old'
}

const NAMES: Record<Body, Record<RelInfo['age'], string[]>> = {
  male: {
    old: ['Harold', 'Walter', 'Frank', 'Arthur', 'Ernest', 'George', 'Albert', 'Stanley'],
    grown: ['Tom', 'Michael', 'David', 'Paul', 'Mark', 'Richard', 'Steven', 'Andrew', 'Peter'],
    young: ['Liam', 'Noah', 'Ethan', 'Jack', 'Leo', 'Oliver', 'Sam', 'Max', 'Theo'],
  },
  female: {
    old: ['Dorothy', 'Edith', 'Margaret', 'Joan', 'Irene', 'Betty', 'Ruth', 'Phyllis'],
    grown: ['Susan', 'Karen', 'Linda', 'Julie', 'Sarah', 'Helen', 'Anne', 'Claire', 'Rachel'],
    young: ['Lily', 'Emma', 'Chloe', 'Mia', 'Grace', 'Ava', 'Ella', 'Rosie', 'Zoe'],
  },
}

/** Hair colours by age (indexes into HAIR_COLORS): greys and rinses, then natural colours. */
const HAIR_BY_AGE: Record<RelInfo['age'], number[]> = {
  old: [0, 1, 2, 3, 4],
  grown: [2, 5, 6, 7, 8, 9],
  young: [6, 7, 8, 9],
}
const ACCESSORY_BY_AGE: Record<RelInfo['age'], Accessory[]> = {
  old: ['none', 'glasses', 'hat', 'cane', 'pearls', 'scarf'],
  grown: ['none', 'none', 'glasses', 'scarf', 'hat'],
  young: ['none', 'none', 'none', 'hat', 'scarf'],
}
const HAIR_BY_BODY: Record<Body, HairStyle[]> = {
  female: ['bun', 'short', 'curly', 'perm', 'long'],
  male: ['short', 'curly', 'bald', 'short'],
}

const pick = <T>(list: readonly T[], r = Math.random): T => list[Math.floor(r() * list.length)]

/** A random look for someone in this relationship (their name is chosen too). */
export function randomLook(rel: Relation, taken: string[] = []): Look {
  const info = REL[rel]
  const body: Body = info.body === 'either' ? pick(['female', 'male'] as const) : info.body
  const names = NAMES[body][info.age].filter((n) => !taken.includes(n))
  let hair = pick(HAIR_BY_BODY[body])
  // Nobody young is bald.
  if (hair === 'bald' && info.age === 'young') hair = 'short'
  return {
    name: pick(names.length ? names : NAMES[body][info.age]),
    body,
    skin: Math.floor(Math.random() * SKIN_TONES.length),
    hair,
    hairColor: pick(HAIR_BY_AGE[info.age]),
    outfit: Math.floor(Math.random() * OUTFIT_COLORS.length),
    pants: Math.floor(Math.random() * PANTS_COLORS.length),
    accessory: pick(ACCESSORY_BY_AGE[info.age].filter((a) => ACCESSORIES.includes(a))),
  }
}

/** Someone new in this relationship: a random look, and the default for what they call you. */
export function randomRelative(rel: Relation, you: Look, taken: string[] = []): Relative {
  return { rel, calls: REL[rel].calls(you), look: randomLook(rel, taken) }
}

/**
 * A whole random family: always a child, then a husband or wife or a grandchild, and sometimes a
 * third (a grandchild, a brother or sister, a niece or nephew). Skin tones run in the family.
 */
export function randomFamily(you: Look): Relative[] {
  const spouse: Relation = you.body === 'male' ? 'wife' : 'husband'
  const rels: Relation[] = [
    pick(['son', 'daughter'] as const),
    pick([spouse, 'partner', 'grandson', 'granddaughter'] as const),
  ]
  if (Math.random() < 0.65)
    rels.push(pick(['grandson', 'granddaughter', 'sister', 'brother', 'niece', 'nephew'] as const))
  const out: Relative[] = []
  for (const rel of rels.slice(0, FAMILY_MAX)) {
    const m = randomRelative(
      rel,
      you,
      out.map((o) => o.look.name),
    )
    // Children and grandchildren usually share your skin tone (or near it).
    if (REL[rel].age !== 'old' && Math.random() < 0.7)
      m.look.skin = Math.max(0, Math.min(SKIN_TONES.length - 1, you.skin + pick([-1, 0, 0, 1])))
    out.push(m)
  }
  return out.length >= FAMILY_MIN ? out : randomFamily(you)
}
