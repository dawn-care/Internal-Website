import { DOORS, PAINTINGS } from "./story";
import {
  BOOKSHELF,
  CLAWED,
  DOOR,
  FOG_WALL,
  MESSAGES,
  RIDDLE_DOOR,
  WALLPAPER,
  WINDOW,
  WOOD,
  WRITING,
  paintingTexture,
} from "./textures";

// One character per cell, rows top to bottom.
//   Walls:  # wallpaper   W wood panelling   M wallpaper torn by claws   B bookshelf
//           X window   R writing on the wall   a-z painting (see PAINTINGS in story.ts)
//           D locked door (never opens)   1-9 door that opens with a riddle (see DOORS)
//   Floor:  . floor   S where you wake up (facing east)   F where the figure can stand
//           H where the floating head starts   L a lamp swinging from the ceiling
//           T table with a candle   C chair   Y rocking chair   K grandfather clock
//   Outside: , open ground in the fog   ~ fog you can't walk through
// The left 24 columns are the house you wake up in. Door 1 leads to the east wing, where
// the head lives. Door 2, in the east wing's south wall, leads outside.
const HOUSE = [
  "###X####X#####X####X#######X#####X##",
  "#TC....#..CC.....K#.Y..#..Y........#",
  "#..S...a..TT......R....#.......H...f",
  "b......#..CCF.....#..F.#.....L.....#",
  "X......M..........#....#.........T.#",
  "###..###WW..WWWW###.#######.####W###",
  "#..........L...........1...........#",
  "R......................R...........R",
  "####.#M#M#D##..#####.#####BB##.##B##",
  "B......#.....#.#.......##..........#",
  "#..F...c...Y.#.d...F...#h..TC......g",
  "e....C.#.....#.#.......M#..........#",
  "B....T.#..F..#.#.....CT#####.##M#M##",
  "###.####.....#.###.######..........#",
  "#......................##....L.....#",
  "#..F...M.....R......F..##..........i",
  "#......................##..........#",
  "#####X####DD##X##############2##X###",
];

// Outside: open ground lost in fog, closed in by more fog you can't walk through.
const OUTSIDE_ROWS = 28;
const OUTSIDE = Array.from({ length: OUTSIDE_ROWS }, (_, row) =>
  row === OUTSIDE_ROWS - 1 ? "~".repeat(36) : `~${",".repeat(34)}~`,
);

const LAYOUT = [...HOUSE, ...OUTSIDE];

const WALLS: Record<string, number> = {
  "#": WALLPAPER,
  W: WOOD,
  M: CLAWED,
  B: BOOKSHELF,
  D: DOOR,
  X: WINDOW,
  "~": FOG_WALL,
};

export type Point = { x: number; y: number };

export type PropKind = "table" | "chair" | "rocker" | "clock";
const PROPS: Record<string, PropKind> = { T: "table", C: "chair", Y: "rocker", K: "clock" };

export type Prop = Point & { kind: PropKind };

// Something that gives off light: a swinging lamp, or the candle on a table.
export type Light = Point & { kind: "lamp" | "candle" };

export type World = {
  width: number;
  height: number;
  cells: Uint8Array; // wall texture per cell, 0 for floor
  outdoors: Uint8Array; // 1 for cells outside the house
  spawn: Point;
  headHome: Point;
  figureSpots: Point[];
  lights: Light[];
  props: Prop[];
  propAt: Map<number, Prop>; // cell index → the furniture standing there
  paintings: Map<number, string>; // cell index → painting key
  doors: Map<number, string>; // cell index → riddle door key, while it's still shut
};

// How much of a cell's middle furniture takes up, so you walk around it.
export const PROP_RADIUS = 0.3;

// A fresh copy of the house, with every door shut.
export function createWorld(): World {
  const width = LAYOUT[0].length;
  const height = LAYOUT.length;
  const world: World = {
    width,
    height,
    cells: new Uint8Array(width * height),
    outdoors: new Uint8Array(width * height),
    spawn: { x: 1.5, y: 1.5 },
    headHome: { x: 1.5, y: 1.5 },
    figureSpots: [],
    lights: [],
    props: [],
    propAt: new Map(),
    paintings: new Map(),
    doors: new Map(),
  };
  let messages = 0;

  LAYOUT.forEach((row, y) => {
    if (row.length !== width) throw new Error(`House map row ${y} isn't ${width} wide`);
    [...row].forEach((char, x) => {
      const index = y * width + x;
      const center = { x: x + 0.5, y: y + 0.5 };
      let cell = WALLS[char] ?? 0;
      if (char >= "a" && char <= "z") {
        if (!PAINTINGS[char]) throw new Error(`The house map has painting "${char}", but story.ts doesn't`);
        cell = paintingTexture(char);
        world.paintings.set(index, char);
      } else if (char >= "1" && char <= "9") {
        if (!DOORS[char]) throw new Error(`The house map has door "${char}", but story.ts doesn't`);
        cell = RIDDLE_DOOR;
        world.doors.set(index, char);
      } else if (char === "R") {
        cell = WRITING + (messages++ % MESSAGES.length);
      } else if (char === "S") {
        world.spawn = center;
      } else if (char === "H") {
        world.headHome = center;
      } else if (char === "F") {
        world.figureSpots.push(center);
      } else if (char === "L") {
        world.lights.push({ ...center, kind: "lamp" });
      } else if (char === "," || char === "~") {
        world.outdoors[index] = 1;
      } else if (PROPS[char]) {
        const prop = { ...center, kind: PROPS[char] };
        world.props.push(prop);
        world.propAt.set(index, prop);
        if (char === "T") world.lights.push({ ...center, kind: "candle" });
      }
      world.cells[index] = cell;
    });
  });

  return world;
}

// The wall texture at a cell, or 0 for floor. Outside the map counts as wall.
export function cellAt(world: World, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return WALLPAPER;
  return world.cells[y * world.width + x];
}

export function isWall(world: World, x: number, y: number): boolean {
  return cellAt(world, Math.floor(x), Math.floor(y)) !== 0;
}

export function isOutdoors(world: World, x: number, y: number): boolean {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= world.width || cy >= world.height) return false;
  return world.outdoors[cy * world.width + cx] === 1;
}

// Walls and furniture: anything you can't walk through.
export function isSolid(world: World, x: number, y: number): boolean {
  if (isWall(world, x, y)) return true;
  const prop = world.propAt.get(Math.floor(y) * world.width + Math.floor(x));
  return prop !== undefined && Math.hypot(x - prop.x, y - prop.y) < PROP_RADIUS;
}

export function lineOfSight(world: World, ax: number, ay: number, bx: number, by: number) {
  const distance = Math.hypot(bx - ax, by - ay);
  const steps = Math.ceil(distance / 0.1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(world, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// Breadth-first search over floor cells from (x, y). `previous` links each reached cell back
// toward the start; `steps` is how far each one is (-1 if it can't be reached).
function search(world: World, x: number, y: number) {
  const size = world.width * world.height;
  const previous = new Int32Array(size).fill(-1);
  const steps = new Int32Array(size).fill(-1);
  const start = Math.floor(y) * world.width + Math.floor(x);
  const queue = [start];
  steps[start] = 0;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    const cx = index % world.width;
    const cy = (index - cx) / world.width;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = (cy + dy) * world.width + cx + dx;
      if (cellAt(world, cx + dx, cy + dy) !== 0 || steps[next] !== -1) continue;
      steps[next] = steps[index] + 1;
      previous[next] = index;
      queue.push(next);
    }
  }
  return { previous, steps };
}

function centerOf(world: World, index: number): Point {
  const x = index % world.width;
  return { x: x + 0.5, y: (index - x) / world.width + 0.5 };
}

// Cell centers to walk through to get from one point to another, or [] if there's no way.
export function findPath(world: World, from: Point, to: Point): Point[] {
  const { previous, steps } = search(world, from.x, from.y);
  let index = Math.floor(to.y) * world.width + Math.floor(to.x);
  if (index < 0 || index >= steps.length || steps[index] <= 0) return [];
  const path: Point[] = [];
  while (steps[index] > 0) {
    path.unshift(centerOf(world, index));
    index = previous[index];
  }
  return path;
}

// A random indoor floor cell reachable from `from`, between `near` and `far` steps away.
export function randomDestination(world: World, from: Point, near: number, far: number) {
  const { steps } = search(world, from.x, from.y);
  const options: number[] = [];
  steps.forEach((count, index) => {
    if (count >= near && count <= far && !world.outdoors[index]) options.push(index);
  });
  if (options.length === 0) return null;
  return centerOf(world, options[Math.floor(Math.random() * options.length)]);
}
