import type { ItemId } from '../../../shared/story'

/*
 * The forest's physical things (PUZZLES.md "Core mechanics": keys and tools, separate from the
 * evidence). Each is in exactly one place: your pocket, the key hook in your room, or back where it
 * was found (a key you lose in the forest is waiting there again). The ids and validation are in
 * shared/story.ts; this is what they're called and how they look.
 */

export interface ItemDef {
  /** As it's written in a sentence ("You hang up the administration key."). */
  name: string
  /** Its tag's colour (the key icon in your pocket and on the hook). */
  tag: string
}

export const ITEMS: Record<ItemId, ItemDef> = {
  ITEM_ADMIN_KEY: { name: 'the administration key', tag: '#e8e0c8' },
  ITEM_CLOSET_KEY: { name: 'the brass key with your room number', tag: '#e8c8a0' },
}

export function isItemId(v: string): v is ItemId {
  return v in ITEMS
}
