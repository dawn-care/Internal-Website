// A classic grid raycaster (see lodev.org/cgtutor/raycasting.html), drawn into a small pixel
// buffer that the canvas scales up. Light comes from your flashlight and the odd swinging
// lamp, and fades with distance, so anything far away is black. Through the windows there's
// only fog and the sea. Outside the house, everything fades into fog instead of black.

import { cellAt, type World } from "./map";
import {
  DOOR,
  FOG_WALL,
  OUTSIDE,
  RIDDLE_DOOR,
  TEX,
  WINDOW,
  type Texture,
  type Textures,
} from "./textures";

const MASK = TEX - 1;

export type Frame = {
  w: number;
  h: number;
  image: ImageData;
  pixels: Uint32Array;
  depth: Float32Array; // distance to the wall in each column, for hiding sprites behind walls
  spot: Float32Array; // flashlight brightness at each pixel
  seed: number;
  center: { cell: number; index: number; distance: number }; // the wall straight ahead
};

export type Lamp = {
  x: number; // where the light comes from, which swings with the lamp
  y: number;
  light: number;
  lit: Uint8Array; // per map cell: 1 if the lamp can see it
};

export type View = {
  x: number;
  y: number;
  angle: number;
  bob: number; // head bob, in pixels
  light: number; // flashlight, 0 (off) to 1
  ambient: number; // light that reaches everything nearby, even outside the flashlight
  outside: number; // brightness of the view through the windows, and of the fog outdoors
  time: number; // seconds, for the waves and fog
  lamps: Lamp[];
  fog: [number, number, number]; // the fog's color outdoors
  fogDensity: number; // how quickly things outdoors disappear into it, per cell
};

export type Sprite = {
  x: number;
  y: number;
  texture: Texture;
  scale: number; // 1 = floor to ceiling
  lift: number; // cells above eye level
  opacity?: number; // 0 (invisible) to 1 (the default)
  haze?: number; // how much the fog hides it outdoors, 1 by default; less for huge things
};

export function createFrame(w: number, h: number): Frame {
  const image = new ImageData(w, h);
  const spot = new Float32Array(w * h);
  const radius = h * 0.6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const r = Math.hypot(x - w / 2, y - h / 2) / radius;
      const t = Math.min(1, Math.max(0, (r - 0.35) / 0.75));
      spot[y * w + x] = 0.2 + 0.8 * (1 - t * t * (3 - 2 * t));
    }
  }
  return {
    w,
    h,
    image,
    pixels: new Uint32Array(image.data.buffer),
    depth: new Float32Array(w),
    spot,
    seed: 1,
    center: { cell: 0, index: 0, distance: Infinity },
  };
}

// The camera plane's half-width. Matching it to the aspect ratio keeps pixels square.
export function planeLength(frame: Frame) {
  return (0.5 * frame.w) / frame.h;
}

// The textures are dark to begin with, so the flashlight can brighten them past their colors.
const FLASHLIGHT = 1.7;
const LAMP_REACH = 4.5;

function falloff(distance: number) {
  return FLASHLIGHT / (1 + 0.12 * distance * distance);
}

// The index of the map cell at (x, y), or -1 if it's off the map.
function cellIndex(world: World, x: number, y: number) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= world.width || cy >= world.height) return -1;
  return cy * world.width + cx;
}

// Warm light reaching (x, y), in the cell at `index`, from any lamps that can see it.
function lampLight(lamps: Lamp[], index: number, x: number, y: number) {
  if (lamps.length === 0 || index < 0) return 0;
  let warm = 0;
  for (const lamp of lamps) {
    if (!lamp.lit[index]) continue;
    const d2 = (x - lamp.x) ** 2 + (y - lamp.y) ** 2;
    if (d2 < LAMP_REACH * LAMP_REACH) {
      warm += (lamp.light * (1 - d2 / (LAMP_REACH * LAMP_REACH))) / (1 + 1.2 * d2);
    }
  }
  return warm;
}

function shade(color: number, brightness: number, warm: number): number {
  const alpha = color >>> 24;
  if (alpha !== 255 && brightness < alpha / 255) brightness = alpha / 255;
  const r = Math.min(255, (color & 255) * (brightness + warm)) | 0;
  const g = Math.min(255, ((color >> 8) & 255) * (brightness + warm * 0.72)) | 0;
  const b = Math.min(255, ((color >> 16) & 255) * (brightness + warm * 0.45)) | 0;
  return 0xff000000 | (b << 16) | (g << 8) | r;
}

// Smooth, tiling random noise for the fog and the waves.
const NOISE_SIZE = 256;
const noise = (() => {
  const raw = new Float32Array(NOISE_SIZE * NOISE_SIZE).map(() => Math.random());
  const blurred = new Float32Array(raw.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < NOISE_SIZE; y++) {
      for (let x = 0; x < NOISE_SIZE; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += raw[((y + dy) & 255) * NOISE_SIZE + ((x + dx) & 255)];
          }
        }
        blurred[y * NOISE_SIZE + x] = sum / 9;
      }
    }
    raw.set(blurred);
  }
  // Stretch back out to roughly 0..1 after blurring flattened it.
  return raw.map((v) => Math.min(1, Math.max(0, (v - 0.5) * 4 + 0.5)));
})();

function sampleNoise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const at = (dx: number, dy: number) => noise[((y0 + dy) & 255) * NOISE_SIZE + ((x0 + dx) & 255)];
  const top = at(0, 0) + (at(1, 0) - at(0, 0)) * fx;
  const bottom = at(0, 1) + (at(1, 1) - at(0, 1)) * fx;
  return top + (bottom - top) * fy;
}

function rgb(r: number, g: number, b: number) {
  return 0xff000000 | (Math.min(255, b) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
}

// `amount` of the way from `from` to `to`.
function mix(from: number, to: number, amount: number) {
  const r = from & 255;
  const g = (from >> 8) & 255;
  const b = (from >> 16) & 255;
  return rgb(
    (r + ((to & 255) - r) * amount) | 0,
    (g + (((to >> 8) & 255) - g) * amount) | 0,
    (b + (((to >> 16) & 255) - b) * amount) | 0,
  );
}

function fogAmount(view: View, distance: number, haze = 1) {
  return 1 - Math.exp(-distance * view.fogDensity * haze);
}

// How bright the open ground is outside, with no flashlight on it.
const OUTDOOR_AMBIENT = 0.1;

// What you see through a window: drifting fog over a dark sea, forever. `below` is how far
// under the horizon the pixel is, as a fraction of the screen height (negative above it).
function outsideColor(angle: number, below: number, time: number, brightness: number) {
  const fogR = 92;
  const fogG = 102;
  const fogB = 110;
  if (below <= 0.004) {
    const up = Math.min(1, -below * 4);
    const wisps = (sampleNoise(angle * 40 + time * 1.2, -below * 220 + time * 0.3) - 0.5) * 34;
    const r = fogR + (30 - fogR) * up + wisps;
    const g = fogG + (36 - fogG) * up + wisps;
    const b = fogB + (42 - fogB) * up + wisps;
    return rgb(Math.max(0, r * brightness) | 0, Math.max(0, g * brightness) | 0, Math.max(0, b * brightness) | 0);
  }
  // Each pixel below the horizon is a point on the water; nearer points are lower down.
  const distance = 0.8 / below;
  const wx = Math.cos(angle) * distance;
  const wy = Math.sin(angle) * distance;
  const waves = sampleNoise(wx * 5 + time * 1.5, wy * 5) * 0.6 + sampleNoise(wx * 2, wy * 2 - time) * 0.4;
  const crest = waves > 0.72 ? (waves - 0.72) * 3 : 0;
  const fog = 1 - Math.exp(-distance * 0.05);
  const r = 12 + waves * 22 + crest * 60;
  const g = 20 + waves * 28 + crest * 64;
  const b = 25 + waves * 30 + crest * 66;
  return rgb(
    ((r + (fogR - r) * fog) * brightness) | 0,
    ((g + (fogG - g) * fog) * brightness) | 0,
    ((b + (fogB - b) * fog) * brightness) | 0,
  );
}

// Draws the view into frame.pixels and records the wall straight ahead in frame.center.
// Returns the nearest sprite you're looking right at (centered on screen, not behind a
// wall), if any.
export function render(
  frame: Frame,
  world: World,
  view: View,
  textures: Textures,
  sprites: Sprite[],
): Sprite | null {
  const { w, h, pixels, depth, spot } = frame;
  const dirX = Math.cos(view.angle);
  const dirY = Math.sin(view.angle);
  const plane = planeLength(frame);
  const planeX = -dirY * plane;
  const planeY = dirX * plane;
  const horizon = h / 2 + view.bob;
  const { lamps } = view;
  const fog = rgb(view.fog[0], view.fog[1], view.fog[2]);
  const sky = mix(fog, 0xff000000, 0.25); // fog overhead, a little darker than at the horizon

  // Floor and ceiling, a row at a time: every pixel in a row is the same distance away.
  const leftX = dirX - planeX;
  const leftY = dirY - planeY;
  const spanX = (2 * planeX) / w;
  const spanY = (2 * planeY) / w;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const fromHorizon = Math.max(0.5, Math.abs(y + 0.5 - horizon));
    const distance = h / 2 / fromHorizon;
    const fade = falloff(distance);
    const lit = view.light * fade;
    const ambient = view.ambient * fade;
    const below = y > horizon;
    const texture = below ? textures.floor : textures.ceiling;
    const hidden = fogAmount(view, distance);
    const outdoorLight = OUTDOOR_AMBIENT * view.outside * fade;
    let fx = view.x + distance * leftX;
    let fy = view.y + distance * leftY;
    const stepX = distance * spanX;
    const stepY = distance * spanY;
    for (let x = 0; x < w; x++) {
      const tx = (fx * TEX) & MASK;
      const ty = (fy * TEX) & MASK;
      const index = cellIndex(world, fx, fy);
      const i = row + x;
      // Off the map counts as outside: indoors, walls always cover it, but outdoors the sky
      // near the horizon is that far away.
      if (index < 0 || world.outdoors[index]) {
        const color = below
          ? shade(textures.ground[ty * TEX + tx], lit * spot[i] + ambient + outdoorLight, 0)
          : sky;
        pixels[i] = mix(color, fog, hidden);
      } else {
        const warm = lampLight(lamps, index, fx, fy);
        pixels[i] = shade(texture[ty * TEX + tx], lit * spot[i] + ambient, warm);
      }
      fx += stepX;
      fy += stepY;
    }
  }

  // Walls, a column at a time, stepping through the grid until the ray hits one.
  const middle = w >> 1;
  for (let x = 0; x < w; x++) {
    const camera = (2 * x) / w - 1;
    const rayX = dirX + planeX * camera;
    const rayY = dirY + planeY * camera;
    let mapX = Math.floor(view.x);
    let mapY = Math.floor(view.y);
    let fromX = mapX;
    let fromY = mapY;
    const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
    const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
    const stepX = rayX < 0 ? -1 : 1;
    const stepY = rayY < 0 ? -1 : 1;
    let sideX = (rayX < 0 ? view.x - mapX : mapX + 1 - view.x) * deltaX;
    let sideY = (rayY < 0 ? view.y - mapY : mapY + 1 - view.y) * deltaY;
    let side = 0;
    let cell = 0;
    for (let i = 0; i < 64 && cell === 0; i++) {
      fromX = mapX;
      fromY = mapY;
      if (sideX < sideY) {
        sideX += deltaX;
        mapX += stepX;
        side = 0;
      } else {
        sideY += deltaY;
        mapY += stepY;
        side = 1;
      }
      cell = cellAt(world, mapX, mapY);
    }

    const distance = side === 0 ? sideX - deltaX : sideY - deltaY;
    depth[x] = distance;
    if (x === middle) {
      frame.center = { cell, index: mapY * world.width + mapX, distance };
    }
    const height = h / distance;
    const top = horizon - height / 2;
    const y0 = Math.max(0, Math.ceil(top));
    const y1 = Math.min(h, Math.ceil(top + height));

    let wallX = side === 0 ? view.y + distance * rayY : view.x + distance * rayX;
    wallX -= Math.floor(wallX);
    let tx = (wallX * TEX) | 0;
    // Keeps textures (and the writing on them) unmirrored. y points down here, unlike the
    // tutorial, so these are the opposite of its conditions.
    if ((side === 0 && rayX < 0) || (side === 1 && rayY > 0)) tx = MASK - tx;

    // Seen from outside, the house is weathered boards and dark windows.
    const fromIndex = fromY * world.width + fromX;
    const outdoors = world.outdoors[fromIndex] === 1;
    let texture = textures.walls[cell];
    if (outdoors && cell !== FOG_WALL && cell !== DOOR && cell !== RIDDLE_DOOR) {
      texture = cell === WINDOW ? textures.darkWindow : textures.siding;
    }
    const fade = falloff(distance) * (side === 1 ? 0.75 : 1);
    const lit = view.light * fade;
    const ambient = view.ambient * fade + (outdoors ? OUTDOOR_AMBIENT * view.outside * fade : 0);
    const hidden = outdoors ? fogAmount(view, distance) : 0;
    const warm = lampLight(lamps, fromIndex, view.x + distance * rayX, view.y + distance * rayY);
    const rayAngle = Math.atan2(rayY, rayX);
    const step = TEX / height;
    let ty = (y0 - top) * step;
    for (let y = y0; y < y1; y++) {
      const i = y * w + x;
      const color = texture[((ty | 0) & MASK) * TEX + tx];
      const lighted =
        color >>> 24 === OUTSIDE
          ? outsideColor(rayAngle, (y + 0.5 - horizon) / h, view.time, view.outside)
          : shade(color, lit * spot[i] + ambient, warm);
      pixels[i] = hidden > 0 ? mix(lighted, fog, hidden) : lighted;
      ty += step;
    }
  }

  // Sprites, farthest first so nearer ones draw over them.
  const sorted = sprites
    .map((sprite) => ({ sprite, d2: (sprite.x - view.x) ** 2 + (sprite.y - view.y) ** 2 }))
    .sort((a, b) => b.d2 - a.d2);
  let lookingAt: Sprite | null = null;
  for (const { sprite } of sorted) {
    if (drawSprite(frame, world, view, sprite, dirX, dirY, planeX, planeY, fog)) lookingAt = sprite;
  }

  addGrain(frame);
  return lookingAt;
}

function drawSprite(
  frame: Frame,
  world: World,
  view: View,
  sprite: Sprite,
  dirX: number,
  dirY: number,
  planeX: number,
  planeY: number,
  fog: number,
) {
  const { w, h, pixels, depth, spot } = frame;
  const opacity = sprite.opacity ?? 1;
  if (opacity <= 0) return false;
  const dx = sprite.x - view.x;
  const dy = sprite.y - view.y;
  const invDet = 1 / (planeX * dirY - dirX * planeY);
  const across = invDet * (dirY * dx - dirX * dy);
  const ahead = invDet * (-planeY * dx + planeX * dy);
  if (ahead < 0.2) return false;

  const size = (h / ahead) * sprite.scale;
  const centerX = (w / 2) * (1 + across / ahead);
  const left = centerX - size / 2;
  const top = h / 2 + view.bob - (sprite.lift * h) / ahead - size / 2;
  const x0 = Math.max(0, Math.ceil(left));
  const x1 = Math.min(w, Math.ceil(left + size));
  const y0 = Math.max(0, Math.ceil(top));
  const y1 = Math.min(h, Math.ceil(top + size));
  const fade = falloff(ahead);
  const index = cellIndex(world, sprite.x, sprite.y);
  const outdoors = index >= 0 && world.outdoors[index] === 1;
  const lit = view.light * fade;
  const ambient = view.ambient * fade + (outdoors ? OUTDOOR_AMBIENT * view.outside * fade : 0);
  const hidden = outdoors ? fogAmount(view, ahead, sprite.haze) : 0;
  const warm = lampLight(view.lamps, index, sprite.x, sprite.y);

  for (let x = x0; x < x1; x++) {
    if (ahead >= depth[x]) continue;
    const tx = Math.min(MASK, (((x - left) * TEX) / size) | 0);
    for (let y = y0; y < y1; y++) {
      const ty = Math.min(MASK, (((y - top) * TEX) / size) | 0);
      const color = sprite.texture[ty * TEX + tx];
      if (color >>> 24 === 0) continue;
      const i = y * w + x;
      let lighted = shade(color, lit * spot[i] + ambient, warm);
      if (hidden > 0) lighted = mix(lighted, fog, hidden);
      pixels[i] = opacity < 1 ? mix(pixels[i], lighted, opacity) : lighted;
    }
  }

  const middle = w >> 1;
  return Math.abs(centerX - middle) < size * 0.2 + 4 && ahead < depth[middle];
}

// Film grain, so the dark never sits perfectly still.
function addGrain(frame: Frame) {
  const { pixels } = frame;
  let seed = frame.seed;
  for (let i = 0; i < pixels.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const n = seed & 7;
    const c = pixels[i];
    const r = Math.min(255, (c & 255) + n);
    const g = Math.min(255, ((c >> 8) & 255) + n);
    const b = Math.min(255, ((c >> 16) & 255) + n);
    pixels[i] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
  frame.seed = seed;
}
