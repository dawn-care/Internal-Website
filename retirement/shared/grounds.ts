/*
 * The size of the grounds, shared by the game and the server (the tables' positions depend on it).
 *
 * The established community (home, Kitchen, garden, henhouse, pond: everything with buildings and
 * paths) is EST_W × EST_H tiles. Round it is a band of open outskirts, then the treeline (see
 * FOREST.md "The outskirts"). EST is where the established area's top-left corner sits on the
 * grounds map: everything in it is laid out in its own coordinates and shifted by EST.
 */

export const EST_W = 48
export const EST_H = 49
/** Tiles of open country between the established area and the treeline, on each side. (tune) */
export const OUTSKIRTS = 40
/** How many tiles deep the solid treeline is, at the very edge of the grounds. */
export const TREELINE = 5
export const EST = { x: OUTSKIRTS + TREELINE, y: OUTSKIRTS + TREELINE } as const
export const GROUNDS_W = EST_W + EST.x * 2
export const GROUNDS_H = EST_H + EST.y * 2
