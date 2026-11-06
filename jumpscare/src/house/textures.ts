// Every texture is drawn here at startup, so the house needs no image files of its own. The
// paintings on the walls are images from media/.

import { imageByName } from "../media";
import { PAINTINGS } from "./story";

export const TEX = 128;

// TEX x TEX pixels, 0xAABBGGRR. Alpha 255 is a normal lit surface, 0 is transparent (sprites
// only), OUTSIDE is window glass (the renderer draws the view outside there), and anything
// else glows: it never gets darker than alpha / 255.
export type Texture = Uint32Array;
export const OUTSIDE = 1;

export type Textures = {
  walls: Texture[]; // indexed by map cell value
  floor: Texture;
  ceiling: Texture;
  ground: Texture; // outside
  siding: Texture; // the house's walls, seen from outside
  darkWindow: Texture; // its windows, seen from outside
  basementFloor: Texture;
  basementCeiling: Texture;
  figure: Texture;
  pale: PaleTextures;
  statue: StatueTextures;
  spider: [Texture, Texture]; // its legs on alternate steps
  lamp: Texture;
  table: Texture;
  chair: Texture;
  rocker: Texture;
  clock: [Texture, Texture]; // pendulum swung left, swung right
  journal: Texture;
  dresser: Texture;
  bed: Texture;
  coatrack: Texture;
  boxes: Texture;
  mannequin: Texture;
  vase: Texture;
  barrel: Texture;
  web: Texture;
};

// The statue in the basement, in the poses you catch it in. It only moves when you can't see.
export type StatueTextures = {
  praying: Texture; // on its plinth, until you first look away
  plinth: Texture; // what's left behind
  reaching: Texture;
  lunging: Texture; // this close, it isn't praying at all
};

// The pale thing from each side. Two of each, for its limbs on alternate steps.
export type PaleTextures = {
  front: [Texture, Texture];
  back: [Texture, Texture];
  right: [Texture, Texture]; // its head toward the right of the screen
  left: [Texture, Texture];
  reared: Texture; // up on its hind legs, sniffing
};

// The color of the fog outside, before it's dimmed for the light.
export const FOG: [number, number, number] = [40, 44, 48];

// In the order the R cells appear in the map, reading left to right, top to bottom.
export const MESSAGES = [
  "WHY DO\nYOU\nMATTER",
  "YOU\nFORGOT",
  "REMEMBER",
  "DON'T\nRUN",
  "WHO\nARE\nYOU",
];

const PAINTING_KEYS = Object.keys(PAINTINGS).sort();

// Map cell values. 0 is floor.
export const WALLPAPER = 1;
export const WOOD = 2;
export const DOOR = 3;
export const WINDOW = 4;
export const RIDDLE_DOOR = 5;
export const CLAWED = 6;
export const BOOKSHELF = 7;
export const FOG_WALL = 8;
export const STONE = 9;
export const STAIRS_DOWN = 10;
export const STAIRS_UP = 11;
export const DOUBLE_DOOR_LEFT = 12;
export const DOUBLE_DOOR_RIGHT = 13;
export const WRITING = 14; // one per message
const PAINTING = WRITING + MESSAGES.length; // one per painting

export function paintingTexture(key: string) {
  return PAINTING + PAINTING_KEYS.indexOf(key);
}

type Draw = (g: CanvasRenderingContext2D, rand: () => number) => void;

// Seeded, so the house looks the same every visit.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawPixels(draw: Draw, seed: number): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = TEX;
  canvas.height = TEX;
  const g = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(g, mulberry32(seed));
  return g.getImageData(0, 0, TEX, TEX).data;
}

function paint(draw: Draw, seed: number): Texture {
  return new Uint32Array(drawPixels(draw, seed).buffer);
}

function grain(g: CanvasRenderingContext2D, rand: () => number, amount: number) {
  const image = g.getImageData(0, 0, TEX, TEX);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(image, 0, 0);
}

function stain(g: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const gradient = g.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gradient;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

// Faded striped wallpaper over dark wainscoting, stained and streaked.
function wallpaper(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#3a3826";
  g.fillRect(0, 0, TEX, TEX);
  g.fillStyle = "rgba(96,88,54,0.35)";
  for (let x = 0; x < TEX; x += 16) g.fillRect(x + 5, 0, 6, 88);
  g.fillStyle = "rgba(20,18,10,0.4)";
  for (let y = 6, row = 0; y < 84; y += 14, row++) {
    for (let x = row % 2 ? 0 : 8; x < TEX; x += 16) {
      g.beginPath();
      g.moveTo(x, y - 3);
      g.lineTo(x + 3, y);
      g.lineTo(x, y + 3);
      g.lineTo(x - 3, y);
      g.fill();
    }
  }

  g.fillStyle = "#24170e";
  g.fillRect(0, 88, TEX, 40);
  g.fillStyle = "#130b06";
  g.fillRect(0, 86, TEX, 3);
  g.fillStyle = "rgba(255,220,170,0.08)";
  g.fillRect(0, 89, TEX, 1);
  g.strokeStyle = "#140c06";
  g.strokeRect(8.5, 96.5, 47, 24);
  g.strokeRect(72.5, 96.5, 47, 24);

  for (let i = 0; i < 5; i++) {
    stain(g, rand() * TEX, rand() * 90, 6 + rand() * 18, "rgba(25,18,8,0.5)");
  }
  g.fillStyle = "rgba(20,14,6,0.35)";
  for (let i = 0; i < 4; i++) g.fillRect(rand() * TEX, 0, 1 + rand() * 1.5, 10 + rand() * 50);
  grain(g, rand, 14);
}

function wood(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#2e1d12";
  g.fillRect(0, 0, TEX, TEX);
  for (let plank = 0; plank < TEX; plank += 32) {
    g.fillStyle = `rgba(${60 + rand() * 20},${35 + rand() * 10},20,0.4)`;
    g.fillRect(plank, 0, 32, TEX);
    g.strokeStyle = "rgba(0,0,0,0.3)";
    for (let k = 0; k < 9; k++) {
      const x = plank + rand() * 32;
      g.beginPath();
      g.moveTo(x, 0);
      for (let y = 0; y <= TEX; y += 8) g.lineTo(x + Math.sin(y * 0.05 + k) * 2, y);
      g.stroke();
    }
    g.fillStyle = "#120a05";
    g.fillRect(plank, 0, 2, TEX);
  }
  grain(g, rand, 10);
}

// A locked door, with something's claw marks near the bottom.
function door(g: CanvasRenderingContext2D, rand: () => number) {
  doorBase(g, rand);
  grain(g, rand, 12);
}

// A door with words scratched into its upper panel. These open, if you remember.
function riddleDoor(g: CanvasRenderingContext2D, rand: () => number) {
  doorBase(g, rand);
  g.strokeStyle = "rgba(225,200,170,0.4)";
  g.lineWidth = 1;
  for (let line = 0; line < 3; line++) {
    let x = 32;
    const y = 28 + line * 9;
    g.beginPath();
    g.moveTo(x, y);
    while (x < 94) {
      x += 2 + rand() * 3;
      g.lineTo(x, y + (rand() - 0.5) * 5);
      if (rand() < 0.15) {
        x += 4;
        g.moveTo(x, y);
      }
    }
    g.stroke();
  }
  grain(g, rand, 12);
}

function doorBase(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#2a170c";
  g.fillRect(0, 0, TEX, TEX);
  g.strokeStyle = "#170c05";
  g.lineWidth = 10;
  g.strokeRect(5, 5, TEX - 10, TEX - 5);
  g.lineWidth = 2;
  for (const [y, height] of [
    [18, 40],
    [70, 44],
  ]) {
    g.strokeStyle = "#140a04";
    g.strokeRect(24, y, 80, height);
    g.strokeStyle = "rgba(255,200,150,0.08)";
    g.strokeRect(26, y + 2, 76, height - 4);
  }
  g.fillStyle = "#8a6a2a";
  g.beginPath();
  g.arc(100, 66, 4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#000";
  g.fillRect(99, 72, 2, 4);
  g.strokeStyle = "rgba(200,170,140,0.3)";
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(40 + i * 6, 96 + rand() * 4);
    g.lineTo(52 + i * 6, 124);
    g.stroke();
  }
}

// One leaf of the double doors: tall boards and iron bands, with words scratched across.
// Drawn as the left leaf; `mirror` makes it the right one.
function doubleDoor(mirror: boolean): Draw {
  return (g, rand) => {
    g.save();
    if (mirror) {
      g.translate(TEX, 0);
      g.scale(-1, 1);
    }
    g.fillStyle = "#241309";
    g.fillRect(0, 0, TEX, TEX);
    for (let x = 7; x < TEX; x += 20) {
      g.fillStyle = `rgba(${50 + rand() * 25},${28 + rand() * 12},14,0.5)`;
      g.fillRect(x, 0, 20, TEX);
      g.fillStyle = "#0e0703";
      g.fillRect(x, 0, 1.5, TEX);
    }
    g.fillStyle = "#120904";
    g.fillRect(0, 0, TEX, 7);
    g.fillRect(0, 0, 7, TEX);
    for (const y of [22, 100]) {
      g.fillStyle = "#17171a";
      g.fillRect(7, y, TEX - 7, 9);
      g.fillStyle = "#3b3b40";
      for (let x = 14; x < TEX; x += 18) g.fillRect(x, y + 3, 3, 3);
    }
    g.fillStyle = "#040201";
    g.fillRect(TEX - 2, 0, 2, TEX);
    g.strokeStyle = "#7a6830";
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(TEX - 16, 72, 7, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = "rgba(225,200,170,0.4)";
    g.lineWidth = 1;
    for (let line = 0; line < 3; line++) {
      let x = 18;
      const y = 40 + line * 9;
      g.beginPath();
      g.moveTo(x, y);
      while (x < TEX - 4) {
        x += 2 + rand() * 3;
        g.lineTo(x, y + (rand() - 0.5) * 5);
        if (rand() < 0.15) {
          x += 4;
          g.moveTo(x, y);
        }
      }
      g.stroke();
    }
    g.restore();
    grain(g, rand, 12);
  };
}

// Steps going away from you through a dark opening, each one narrower. `lit` gives a step's
// brightness, from step 0 (the nearest) up.
function steps(g: CanvasRenderingContext2D, lit: (step: number) => number) {
  let y = TEX;
  let height = 16;
  let inset = 0;
  for (let step = 0; step < 8; step++) {
    const shade = lit(step);
    g.fillStyle = `rgb(${shade},${shade * 0.72},${shade * 0.48})`;
    g.fillRect(20 + inset, y - height, 88 - inset * 2, height - 2);
    y -= height;
    height *= 0.84;
    inset += 4;
  }
}

// The door to the basement, swung open onto stairs going down into the dark.
function stairsDown(g: CanvasRenderingContext2D, rand: () => number) {
  wallpaper(g, rand);
  g.fillStyle = "#020202";
  g.fillRect(20, 6, 88, 122);
  steps(g, (step) => Math.max(4, 58 - step * 9));
  g.fillStyle = "#2a170c";
  g.beginPath();
  g.moveTo(108, 6);
  g.lineTo(86, 20);
  g.lineTo(86, 120);
  g.lineTo(108, 128);
  g.closePath();
  g.fill();
  g.fillStyle = "#8a6a2a";
  g.beginPath();
  g.arc(90, 68, 2.5, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#170c05";
  g.lineWidth = 8;
  g.strokeRect(18, 4, 92, 128);
  grain(g, rand, 10);
}

// The way back up: steps rising out of the basement toward a little light.
function stairsUp(g: CanvasRenderingContext2D, rand: () => number) {
  stone(g, rand);
  g.fillStyle = "#050403";
  g.fillRect(20, 6, 88, 122);
  g.fillStyle = "#6b4a22";
  g.fillRect(46, 14, 36, 34);
  steps(g, (step) => 26 + step * 7);
  g.strokeStyle = "#141210";
  g.lineWidth = 8;
  g.strokeRect(18, 4, 92, 128);
  grain(g, rand, 10);
}

// Rough, damp stone blocks.
function stone(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#0e0d0b";
  g.fillRect(0, 0, TEX, TEX);
  for (let y = 0, row = 0; y < TEX; y += 26, row++) {
    for (let x = row % 2 ? -24 : 0; x < TEX; x += 48) {
      g.fillStyle = `hsl(40, 6%, ${13 + rand() * 7}%)`;
      g.fillRect(x + 1, y + 1, 46, 24);
    }
  }
  for (let i = 0; i < 6; i++) {
    stain(g, rand() * TEX, rand() * TEX, 8 + rand() * 20, "rgba(12,16,8,0.55)");
  }
  g.fillStyle = "rgba(10,12,8,0.4)";
  for (let i = 0; i < 4; i++) g.fillRect(rand() * TEX, 0, 1 + rand() * 2, 20 + rand() * 70);
  grain(g, rand, 16);
}

function basementFloor(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#1e1d19";
  g.fillRect(0, 0, TEX, TEX);
  for (let i = 0; i < 8; i++) stain(g, rand() * TEX, rand() * TEX, 8 + rand() * 24, "rgba(6,6,4,0.6)");
  g.strokeStyle = "rgba(4,4,3,0.7)";
  g.lineWidth = 1;
  let x = rand() * TEX;
  let y = 0;
  g.beginPath();
  g.moveTo(x, y);
  while (y < TEX) {
    x += (rand() - 0.5) * 16;
    y += 6 + rand() * 8;
    g.lineTo(x, y);
  }
  g.stroke();
  grain(g, rand, 16);
}

// The underside of the floor above: boards and heavy joists.
function basementCeiling(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#17110b";
  g.fillRect(0, 0, TEX, TEX);
  for (let x = 0; x < TEX; x += 16) {
    g.fillStyle = "#0c0805";
    g.fillRect(x, 0, 1, TEX);
  }
  g.fillStyle = "#271a10";
  g.fillRect(0, 48, TEX, 26);
  g.fillStyle = "#0a0603";
  g.fillRect(0, 74, TEX, 3);
  grain(g, rand, 12);
}

// A curtained window. The glass is painted pure blue here only so it can be found and marked
// as OUTSIDE afterwards.
function windowPixels(): Uint8ClampedArray {
  const pixels = drawPixels((g, rand) => {
    wallpaper(g, rand);
    // Tall, reaching well below eye level (y 64), so you can see down to the water.
    g.fillStyle = "#0000ff";
    g.fillRect(30, 12, 68, 94);
    g.fillStyle = "#140c06";
    g.fillRect(62, 12, 4, 94);
    g.fillRect(30, 56, 68, 4);
    g.strokeStyle = "#1c120a";
    g.lineWidth = 4;
    g.strokeRect(30, 12, 68, 94);
    for (const x of [20, 92]) {
      g.fillStyle = "#3a0d0f";
      g.fillRect(x, 6, 16, 106);
      g.fillStyle = "rgba(0,0,0,0.35)";
      for (let fold = x + 3; fold < x + 16; fold += 5) g.fillRect(fold, 6, 1.5, 106);
    }
  }, 4);
  for (let y = 12; y < 106; y++) {
    for (let x = 30; x < 98; x++) {
      const i = (y * TEX + x) * 4;
      if (pixels[i + 2] > 200 && pixels[i] < 40 && pixels[i + 1] < 40) pixels[i + 3] = OUTSIDE;
    }
  }
  return pixels;
}

function writing(message: string, seed: number): Texture {
  return paint((g, rand) => {
    wallpaper(g, rand);
    g.save();
    g.translate(64, 14);
    g.rotate((rand() - 0.5) * 0.12);
    g.textAlign = "center";
    g.textBaseline = "top";
    message.split("\n").forEach((line, row) => {
      g.font = "bold 20px Georgia, serif";
      const size = Math.min(20, (20 * 112) / g.measureText(line).width);
      g.font = `bold ${size}px Georgia, serif`;
      const x = (rand() - 0.5) * 6;
      const y = row * 23;
      g.fillStyle = "#5e0b0b";
      g.fillText(line, x, y);
      const width = g.measureText(line).width;
      for (let drip = 0; drip < 3; drip++) {
        g.fillRect(x + (rand() - 0.5) * width, y + size * 0.8, 1.5, 4 + rand() * 14);
      }
    });
    g.restore();
  }, seed);
}

function painting(image: HTMLImageElement | null, wall: Draw): Draw {
  return (g, rand) => {
    wall(g, rand);
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(36, 15, 60, 68);
    g.fillStyle = "#5a4418";
    g.fillRect(34, 12, 60, 68);
    g.fillStyle = "#2f230b";
    g.fillRect(38, 16, 52, 60);
    g.fillStyle = "#050505";
    g.fillRect(40, 18, 48, 56);
    if (image) {
      // Cover-fit the image into the frame, aged and darkened.
      const scale = Math.max(48 / image.width, 56 / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      g.save();
      g.beginPath();
      g.rect(40, 18, 48, 56);
      g.clip();
      g.filter = "sepia(0.6) brightness(0.65) contrast(1.3)";
      g.drawImage(image, 64 - w / 2, 46 - h / 2, w, h);
      g.restore();
    }
    grain(g, rand, 10);
  };
}

function floor(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#22160d";
  g.fillRect(0, 0, TEX, TEX);
  for (let y = 0; y < TEX; y += 16) {
    const offset = (y / 16) % 2 ? 32 : 0;
    for (let x = -64; x < TEX; x += 64) {
      g.fillStyle = `hsl(25, 35%, ${9 + rand() * 6}%)`;
      g.fillRect(x + offset, y, 64, 16);
      g.fillStyle = "#0c0704";
      g.fillRect(x + offset, y, 1, 16);
      g.fillRect(x + offset + 3, y + 3, 1, 1);
      g.fillRect(x + offset + 3, y + 12, 1, 1);
    }
    g.strokeStyle = "rgba(0,0,0,0.25)";
    for (let k = 0; k < 4; k++) {
      const gy = y + 2 + rand() * 12;
      g.beginPath();
      g.moveTo(0, gy);
      for (let x = 0; x <= TEX; x += 8) g.lineTo(x, gy + Math.sin(x * 0.07 + k) * 1.2);
      g.stroke();
    }
    g.fillStyle = "#0c0704";
    g.fillRect(0, y, TEX, 1);
  }
  grain(g, rand, 10);
}

function ceiling(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#3a362d";
  g.fillRect(0, 0, TEX, TEX);
  stain(g, 40, 70, 24, "rgba(60,45,20,0.3)");
  g.strokeStyle = "rgba(15,12,8,0.6)";
  g.lineWidth = 1;
  for (let crack = 0; crack < 3; crack++) {
    let x = rand() * TEX;
    let y = rand() * TEX;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < 12; i++) {
      x += (rand() - 0.5) * 12;
      y += (rand() - 0.5) * 12;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  grain(g, rand, 12);
}

// A tall, thin silhouette with pale eyes that glow in the dark.
function figure(): Texture {
  const pixels = drawPixels((g) => {
    g.fillStyle = "#060606";
    g.beginPath();
    g.ellipse(64, 22, 9, 11, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(61, 30, 6, 10);
    g.beginPath();
    g.moveTo(45, 40);
    g.lineTo(83, 40);
    g.lineTo(86, 128);
    g.lineTo(42, 128);
    g.closePath();
    g.fill();
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(64 + side * 19, 41);
      g.lineTo(64 + side * 27, 46);
      g.lineTo(64 + side * 31, 108);
      g.lineTo(64 + side * 26, 110);
      g.lineTo(64 + side * 20, 62);
      g.closePath();
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = "#060606";
      for (let finger = 0; finger < 3; finger++) {
        g.beginPath();
        g.moveTo(64 + side * (27 + finger * 1.5), 108);
        g.lineTo(64 + side * (26 + finger * 2.5), 118 + finger);
        g.stroke();
      }
    }
    g.fillStyle = "#e8e4d8";
    g.fillRect(58, 20, 3, 3);
    g.fillRect(67, 20, 3, 3);
  }, 9);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) pixels[i + 3] = 0;
    else pixels[i + 3] = pixels[i] > 150 ? 230 : 255;
  }
  return new Uint32Array(pixels.buffer);
}

const PALE = "#aaa496";
const PALE_DARK = "#716c60";
const HAIR = "#0a0909";
const EYE = "#d8ff9c"; // the only color here this green, so sprite() can make it glow

type Pixel = [number, number];

function limb(g: CanvasRenderingContext2D, color: string, width: number, points: Pixel[]) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(...points[0]);
  for (const point of points.slice(1)) g.lineTo(...point);
  g.stroke();
}

// Long fingers, splayed on the floor from a hand at (x, y).
function fingers(g: CanvasRenderingContext2D, color: string, x: number, y: number, spread: number) {
  for (let finger = -2; finger <= 2; finger++) {
    limb(g, color, 1.5, [
      [x, y],
      [x + finger * spread, 127],
    ]);
  }
}

// Long, lank strands falling from around the crown of the head at `top` to around `bottom`.
function hair(
  g: CanvasRenderingContext2D,
  rand: () => number,
  x0: number,
  x1: number,
  top: number,
  bottom: number,
  strands: number,
) {
  g.strokeStyle = HAIR;
  g.lineCap = "round";
  for (let strand = 0; strand < strands; strand++) {
    let x = x0 + ((x1 - x0) * (strand + rand())) / strands;
    const fromMiddle = (2 * (x - x0)) / (x1 - x0) - 1;
    const start = top + fromMiddle * fromMiddle * 12;
    const end = bottom - rand() * (bottom - top) * 0.25;
    g.lineWidth = 1 + rand() * 1.5;
    g.beginPath();
    g.moveTo(x, start);
    for (let y = start; y < end; y += 6) {
      x += (rand() - 0.5) * 2;
      g.lineTo(x, y);
    }
    g.stroke();
  }
}

function paleSprite(draw: Draw, seed: number): Texture {
  return sprite(draw, seed, (_r, g) => (g > 235 ? 252 : 255));
}

// Coming at you on all fours, head low, hair hanging to the floor, eyes showing through it.
function paleFront(step: number): Texture {
  return paleSprite((g, rand) => {
    for (const side of [-1, 1]) {
      limb(g, PALE_DARK, 8, [
        [64 + side * 16, 84],
        [64 + side * 30, 74],
        [64 + side * 26, 126],
      ]);
    }
    g.fillStyle = PALE_DARK;
    g.beginPath();
    g.ellipse(64, 66, 28, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALE;
    g.beginPath();
    g.ellipse(64, 78, 25, 13, 0, 0, Math.PI * 2);
    g.fill();
    for (const side of [-1, 1]) {
      const reaching = side === (step ? 1 : -1);
      const handX = 64 + side * (reaching ? 50 : 36);
      const handY = reaching ? 120 : 114;
      limb(g, PALE, 8, [
        [64 + side * 22, 76],
        [64 + side * (reaching ? 44 : 40), reaching ? 70 : 78],
        [handX, handY],
      ]);
      fingers(g, PALE, handX, handY, 3);
    }
    g.fillStyle = PALE;
    g.beginPath();
    g.ellipse(64, 92, 11, 13, 0, 0, Math.PI * 2);
    g.fill();
    hair(g, rand, 42, 86, 72, 128, 56);
    g.fillStyle = EYE;
    g.fillRect(56, 90, 5, 3);
    g.fillRect(67, 90, 5, 3);
  }, 30 + step);
}

// Going away from you: all spine and shoulder blades.
function paleBack(step: number): Texture {
  return paleSprite((g) => {
    for (const side of [-1, 1]) {
      const reaching = side === (step ? 1 : -1);
      limb(g, PALE_DARK, 7, [
        [64 + side * 20, 74],
        [64 + side * (reaching ? 44 : 38), reaching ? 70 : 78],
        [64 + side * (reaching ? 46 : 34), 124],
      ]);
      limb(g, PALE, 9, [
        [64 + side * 14, 92],
        [64 + side * 28, 80],
        [64 + side * 24, 126],
      ]);
    }
    g.fillStyle = PALE;
    g.beginPath();
    g.ellipse(64, 84, 24, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = PALE_DARK;
    for (let y = 68; y < 102; y += 6) g.fillRect(63, y, 3, 3);
    for (let rib = 0; rib < 4; rib++) {
      limb(g, PALE_DARK, 1, [
        [50, 74 + rib * 6],
        [60, 77 + rib * 6],
      ]);
      limb(g, PALE_DARK, 1, [
        [78, 74 + rib * 6],
        [68, 77 + rib * 6],
      ]);
    }
  }, 32 + step);
}

// Side on, stretched out long, with its head at the right. Far limbs are in shadow.
function paleSide(step: number, mirror: boolean): Texture {
  return paleSprite((g, rand) => {
    if (mirror) {
      g.translate(TEX, 0);
      g.scale(-1, 1);
    }
    const arm = (color: string, forward: boolean, width: number) => {
      const handX = forward ? 112 : 82;
      limb(g, color, width, [
        [90, 96],
        [forward ? 104 : 80, 90],
        [handX, 122],
      ]);
      fingers(g, color, handX, 122, 2);
    };
    const leg = (color: string, forward: boolean, width: number) => {
      limb(g, color, width, [
        [22, 94],
        [forward ? 38 : 12, 86],
        [forward ? 36 : 6, 126],
      ]);
    };
    arm(PALE_DARK, step === 1, 4.5);
    leg(PALE_DARK, step === 0, 5);
    g.strokeStyle = PALE;
    g.lineWidth = 15;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(22, 94);
    g.quadraticCurveTo(56, 76, 90, 96);
    g.stroke();
    limb(g, PALE, 6, [
      [90, 96],
      [108, 106],
    ]);
    g.fillStyle = PALE;
    g.beginPath();
    g.ellipse(112, 108, 8, 7, 0, 0, Math.PI * 2);
    g.fill();
    for (let rib = 0; rib < 5; rib++) {
      limb(g, PALE_DARK, 1, [
        [50 + rib * 7, 83 + rib],
        [52 + rib * 7, 93],
      ]);
    }
    arm(PALE, step === 0, 5);
    leg(PALE, step === 1, 6);
    hair(g, rand, 98, 122, 94, 128, 24);
    g.fillStyle = EYE;
    g.fillRect(114, 107, 4, 2);
  }, 34 + step);
}

// Risen to its full height, bent under the ceiling, arms hanging to the floor.
function paleReared(): Texture {
  return paleSprite((g, rand) => {
    limb(g, PALE_DARK, 8, [
      [54, 74],
      [50, 126],
    ]);
    limb(g, PALE_DARK, 8, [
      [74, 74],
      [78, 126],
    ]);
    limb(g, PALE, 17, [
      [64, 34],
      [64, 80],
    ]);
    for (let rib = 0; rib < 5; rib++) {
      limb(g, PALE_DARK, 1, [
        [57, 40 + rib * 6],
        [71, 42 + rib * 6],
      ]);
    }
    for (const side of [-1, 1]) {
      limb(g, PALE, 5, [
        [64 + side * 8, 32],
        [64 + side * 22, 72],
        [64 + side * 24, 114],
      ]);
      fingers(g, PALE, 64 + side * 24, 114, 2.5);
    }
    limb(g, PALE, 6, [
      [64, 34],
      [64, 24],
    ]);
    g.fillStyle = PALE;
    g.beginPath();
    g.ellipse(64, 15, 9, 11, 0, 0, Math.PI * 2);
    g.fill();
    hair(g, rand, 48, 80, 2, 90, 44);
    g.fillStyle = EYE;
    g.fillRect(57, 13, 5, 3);
    g.fillRect(66, 13, 5, 3);
  }, 36);
}

// A shaded bulb on a cord from the ceiling. The bulb glows.
function lamp(): Texture {
  const pixels = drawPixels((g) => {
    g.fillStyle = "#0c0a08";
    g.fillRect(63, 0, 2, 32);
    g.fillStyle = "#26301f";
    g.beginPath();
    g.moveTo(58, 30);
    g.lineTo(70, 30);
    g.lineTo(80, 44);
    g.lineTo(48, 44);
    g.closePath();
    g.fill();
    g.fillStyle = "#ffd98a";
    g.beginPath();
    g.arc(64, 46, 5, 0, Math.PI * 2);
    g.fill();
  }, 7);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) pixels[i + 3] = 0;
    else pixels[i + 3] = pixels[i] > 200 ? 250 : 255;
  }
  return new Uint32Array(pixels.buffer);
}

// Something dragged its claws down the wall, tearing the paper down to the plaster.
function clawed(g: CanvasRenderingContext2D, rand: () => number) {
  wallpaper(g, rand);
  const gouge = (x: number, y: number, dx: number, dy: number, color: string, width: number) => {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + dx * 0.6, y + dy * 0.5, x + dx, y + dy);
    g.stroke();
  };
  for (let set = 0; set < 3; set++) {
    const x = 8 + rand() * 84;
    const y = 4 + rand() * 40;
    const length = 30 + rand() * 40;
    const slant = (rand() - 0.5) * 24;
    for (let claw = 0; claw < 4; claw++) {
      const cx = x + claw * 6 + rand() * 2;
      const dy = length * (0.8 + rand() * 0.3);
      gouge(cx, y, slant, dy, "rgba(118,108,88,0.55)", 4);
      gouge(cx, y, slant, dy, "#0e0905", 2);
      gouge(cx + 2, y + 1, slant, dy - 2, "rgba(220,200,170,0.2)", 1);
    }
  }
  grain(g, rand, 8);
}

function bookshelf(g: CanvasRenderingContext2D, rand: () => number) {
  const spines = ["#3b1714", "#1f2a1c", "#2b2416", "#1a1f2b", "#3a2a14", "#2a1a24"];
  g.fillStyle = "#1a1009";
  g.fillRect(0, 0, TEX, TEX);
  for (const top of [6, 36, 66, 96]) {
    let x = 7;
    while (x < 120) {
      const w = 4 + rand() * 6;
      if (rand() > 0.12) {
        const h = 15 + rand() * 10;
        g.fillStyle = spines[Math.floor(rand() * spines.length)];
        g.fillRect(x, top + 26 - h, w, h);
        g.fillStyle = "rgba(255,230,190,0.08)";
        g.fillRect(x + 1, top + 30 - h, w - 2, 1);
      }
      x += w + 0.6;
    }
    g.fillStyle = "#2c1c10";
    g.fillRect(0, top + 26, TEX, 4);
  }
  g.fillStyle = "#24170d";
  g.fillRect(0, 0, 6, TEX);
  g.fillRect(122, 0, 6, TEX);
  g.strokeStyle = "rgba(200,200,190,0.18)";
  g.lineWidth = 0.5;
  for (let strand = 0; strand < 6; strand++) {
    g.beginPath();
    g.moveTo(6, 6 + strand * 3);
    g.lineTo(6 + strand * 4, 6);
    g.stroke();
  }
  grain(g, rand, 10);
}

// The fog at the edge of the world: a flat wall of it that glows its own color.
function fogWall(): Texture {
  const texture = new Uint32Array(TEX * TEX);
  texture.fill((254 << 24) | (FOG[2] << 16) | (FOG[1] << 8) | FOG[0]);
  return texture;
}

// Weathered boards on the outside of the house.
function siding(g: CanvasRenderingContext2D, rand: () => number) {
  for (let y = 0; y < TEX; y += 12) {
    const shade = 30 + rand() * 12;
    g.fillStyle = `rgb(${shade + 6},${shade + 2},${shade - 2})`;
    g.fillRect(0, y, TEX, 12);
    g.fillStyle = "#0d0b09";
    g.fillRect(0, y + 11, TEX, 1);
  }
  for (let i = 0; i < 4; i++) stain(g, rand() * TEX, 90 + rand() * 38, 10 + rand() * 20, "rgba(30,45,20,0.5)");
  grain(g, rand, 14);
}

function darkWindow(g: CanvasRenderingContext2D, rand: () => number) {
  siding(g, rand);
  g.fillStyle = "#050607";
  g.fillRect(30, 12, 68, 94);
  g.strokeStyle = "rgba(160,170,180,0.08)";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(36, 60);
  g.lineTo(70, 18);
  g.stroke();
  g.fillStyle = "#1c140d";
  g.fillRect(62, 12, 4, 94);
  g.fillRect(30, 56, 68, 4);
  g.strokeStyle = "#1c140d";
  g.lineWidth = 4;
  g.strokeRect(30, 12, 68, 94);
}

// Dead grass and mud.
function ground(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#1c1b15";
  g.fillRect(0, 0, TEX, TEX);
  for (let i = 0; i < 10; i++) stain(g, rand() * TEX, rand() * TEX, 8 + rand() * 20, "rgba(8,8,5,0.5)");
  g.strokeStyle = "rgba(95,88,60,0.35)";
  g.lineWidth = 1;
  for (let blade = 0; blade < 160; blade++) {
    const x = rand() * TEX;
    const y = rand() * TEX;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rand() - 0.5) * 4, y - 2 - rand() * 4);
    g.stroke();
  }
  grain(g, rand, 16);
}

// Furniture and other things drawn on a transparent canvas, then made fully opaque or fully
// see-through. `glow` gives the alpha for each opaque pixel, so a flame can light itself.
function sprite(
  draw: Draw,
  seed: number,
  glow: (r: number, g: number, b: number) => number = () => 255,
): Texture {
  const pixels = drawPixels(draw, seed);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i + 3] = pixels[i + 3] < 128 ? 0 : glow(pixels[i], pixels[i + 1], pixels[i + 2]);
  }
  return new Uint32Array(pixels.buffer);
}

// A small table under a stained cloth, with a lit candle.
function table(): Texture {
  return sprite(
    (g) => {
      g.fillStyle = "#2a180c";
      g.fillRect(32, 98, 5, 30);
      g.fillRect(91, 98, 5, 30);
      g.fillStyle = "#3a2414";
      g.fillRect(24, 76, 80, 5);
      g.fillStyle = "#7d766a";
      g.beginPath();
      g.moveTo(26, 80);
      g.lineTo(102, 80);
      for (let x = 102; x >= 26; x -= 8) g.quadraticCurveTo(x - 4, 106, x - 8, 98);
      g.closePath();
      g.fill();
      g.fillStyle = "rgba(60,35,20,0.6)";
      g.fillRect(48, 82, 14, 6);
      g.fillStyle = "#6b5320";
      g.fillRect(58, 72, 12, 4);
      g.fillStyle = "#d8cfb8";
      g.fillRect(62, 56, 4, 16);
      g.fillStyle = "#ffd27a";
      g.beginPath();
      g.ellipse(64, 51, 2.5, 5, 0, 0, Math.PI * 2);
      g.fill();
    },
    11,
    (r, g) => (r > 230 && g > 180 ? 250 : 255),
  );
}

function chair(): Texture {
  return sprite((g) => {
    g.fillStyle = "#2b1a0e";
    g.fillRect(46, 48, 4, 80);
    g.fillRect(78, 48, 4, 80);
    g.fillRect(46, 54, 36, 4);
    g.fillRect(46, 68, 36, 4);
    g.fillRect(42, 92, 44, 5);
    g.fillRect(42, 97, 4, 31);
    g.fillRect(82, 97, 4, 31);
  }, 12);
}

// It rocks on its own.
function rocker(): Texture {
  return sprite((g) => {
    g.fillStyle = "#2a190d";
    g.fillRect(48, 36, 4, 82);
    g.fillRect(76, 36, 4, 82);
    for (let slat = 0; slat < 4; slat++) g.fillRect(52, 42 + slat * 10, 24, 3);
    g.fillRect(42, 90, 44, 5);
    g.fillRect(44, 95, 4, 22);
    g.fillRect(80, 95, 4, 22);
    g.strokeStyle = "#2a190d";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(30, 112);
    g.quadraticCurveTo(64, 132, 98, 112);
    g.stroke();
  }, 13);
}

// A grandfather clock. `swing` is which way the pendulum hangs: -1 left, 1 right.
function clock(swing: number): Texture {
  return sprite(
    (g) => {
      g.fillStyle = "#2a170b";
      g.fillRect(44, 2, 40, 10);
      g.fillRect(47, 10, 34, 118);
      g.fillStyle = "#cfc6ae";
      g.beginPath();
      g.arc(64, 28, 12, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#1a1008";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(64, 28);
      g.lineTo(64, 19);
      g.moveTo(64, 28);
      g.lineTo(70, 31);
      g.stroke();
      g.fillStyle = "#0c0805";
      g.fillRect(54, 48, 20, 58);
      g.strokeStyle = "#8a6a2a";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(64, 50);
      g.lineTo(64 + swing * 6, 92);
      g.stroke();
      g.fillStyle = "#8a6a2a";
      g.beginPath();
      g.arc(64 + swing * 6, 94, 5, 0, Math.PI * 2);
      g.fill();
    },
    14,
    (r, g, b) => (r > 180 && g > 170 && b > 140 ? 110 : 255),
  );
}

const WOOD_DARK = "#2a190d";
const WOOD_MID = "#3b2614";

// A journal lying open on a little stand. Its pages catch what light there is, so you can spot
// one from across a dark room.
function journal(): Texture {
  return sprite(
    (g) => {
      g.fillStyle = WOOD_DARK;
      g.fillRect(61, 92, 6, 36);
      g.fillRect(50, 124, 28, 4);
      g.fillStyle = WOOD_MID;
      g.fillRect(42, 86, 44, 6);
      g.fillStyle = "#3a1712";
      g.fillRect(44, 80, 40, 6);
      g.fillStyle = "#d9d0b6";
      g.beginPath();
      g.moveTo(45, 80);
      g.quadraticCurveTo(54, 72, 64, 79);
      g.quadraticCurveTo(74, 72, 83, 80);
      g.closePath();
      g.fill();
      g.strokeStyle = "#5a5346";
      g.lineWidth = 0.75;
      g.beginPath();
      g.moveTo(64, 79);
      g.lineTo(64, 74);
      g.stroke();
    },
    40,
    (r, g, b) => (r > 170 && g > 160 && b > 130 ? 70 : 255),
  );
}

function dresser(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = WOOD_DARK;
  g.fillRect(30, 70, 68, 52);
  g.fillRect(34, 122, 6, 6);
  g.fillRect(88, 122, 6, 6);
  g.fillStyle = WOOD_MID;
  g.fillRect(27, 66, 74, 5);
  for (let drawer = 0; drawer < 3; drawer++) {
    const open = drawer === 1 ? 3 : 0;
    const y = 74 + drawer * 16;
    g.fillStyle = "#33210f";
    g.fillRect(33 - open, y, 62 + open * 2, 13);
    g.fillStyle = "#8a6a2a";
    g.fillRect(50, y + 5, 4, 2);
    g.fillRect(74, y + 5, 4, 2);
  }
  // A tilted mirror, gone nearly black.
  g.fillStyle = WOOD_MID;
  g.fillRect(40, 18, 48, 48);
  g.fillStyle = "#14171a";
  g.fillRect(44, 22, 40, 40);
  g.strokeStyle = "rgba(190,200,210,0.25)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(50, 26);
  g.lineTo(68, 44);
  g.lineTo(58, 60);
  g.moveTo(68, 44);
  g.lineTo(80, 38);
  g.stroke();
  grain(g, rand, 10);
}

// An iron bedstead, with something under the blanket about the size of a person.
function bed(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = "#3f382c";
  g.fillRect(4, 62, 5, 66);
  g.fillRect(24, 62, 5, 40);
  g.fillRect(4, 62, 25, 4);
  g.fillRect(4, 76, 25, 3);
  for (let bar = 12; bar < 24; bar += 5) g.fillRect(bar, 66, 2, 34);
  g.fillRect(119, 84, 5, 44);
  g.fillStyle = "#6d675a";
  g.fillRect(9, 96, 110, 14);
  g.fillStyle = "#474236";
  g.beginPath();
  g.moveTo(26, 100);
  g.quadraticCurveTo(40, 80, 62, 88);
  g.quadraticCurveTo(84, 82, 104, 92);
  g.lineTo(118, 100);
  g.lineTo(118, 118);
  g.lineTo(26, 118);
  g.closePath();
  g.fill();
  g.fillStyle = "#a59e8b";
  g.fillRect(10, 90, 18, 10);
  g.fillStyle = "#3f382c";
  g.fillRect(12, 110, 4, 18);
  g.fillRect(110, 110, 4, 18);
  grain(g, rand, 12);
}

// A coat on a stand, and from across a dark room it could be someone.
function coatrack(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = WOOD_DARK;
  g.fillRect(62, 8, 4, 116);
  g.fillRect(48, 124, 32, 4);
  g.fillRect(52, 14, 24, 3);
  g.fillStyle = "#16171b";
  g.beginPath();
  g.moveTo(58, 18);
  g.lineTo(72, 18);
  g.lineTo(82, 34);
  g.lineTo(84, 92);
  g.lineTo(46, 92);
  g.lineTo(48, 34);
  g.closePath();
  g.fill();
  g.fillStyle = "#0b0c0e";
  g.fillRect(63, 22, 2, 70);
  g.fillStyle = "#2a2118";
  g.beginPath();
  g.ellipse(65, 8, 11, 5, 0, 0, Math.PI * 2);
  g.fill();
  grain(g, rand, 8);
}

function boxes(g: CanvasRenderingContext2D, rand: () => number) {
  const box = (x: number, y: number, w: number, h: number, shade: number) => {
    g.fillStyle = `rgb(${shade + 22},${shade + 10},${shade})`;
    g.fillRect(x, y, w, h);
    g.fillStyle = `rgba(0,0,0,0.3)`;
    g.fillRect(x + w / 2 - 3, y, 6, h);
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.lineWidth = 1;
    g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  box(14, 86, 56, 42, 44);
  box(66, 94, 48, 34, 36);
  box(26, 52, 46, 34, 40);
  box(70, 66, 34, 28, 48);
  grain(g, rand, 12);
}

// A dressmaker's dummy: no head, no arms, and it's closer than you left it. It isn't, really.
function mannequin(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = WOOD_DARK;
  g.fillRect(62, 88, 4, 34);
  g.fillRect(46, 124, 36, 4);
  g.fillRect(62, 120, 4, 6);
  const body = g.createLinearGradient(44, 0, 84, 0);
  body.addColorStop(0, "#4a4436");
  body.addColorStop(0.5, "#8d8571");
  body.addColorStop(1, "#4a4436");
  g.fillStyle = body;
  g.beginPath();
  g.moveTo(58, 22);
  g.lineTo(70, 22);
  g.lineTo(84, 34);
  g.quadraticCurveTo(78, 56, 75, 62);
  g.quadraticCurveTo(84, 78, 80, 92);
  g.lineTo(48, 92);
  g.quadraticCurveTo(44, 78, 53, 62);
  g.quadraticCurveTo(50, 56, 44, 34);
  g.closePath();
  g.fill();
  g.fillStyle = WOOD_DARK;
  g.fillRect(60, 16, 8, 6);
  grain(g, rand, 10);
}

// A vase of something long dead.
function vase(g: CanvasRenderingContext2D, rand: () => number) {
  g.fillStyle = WOOD_DARK;
  g.fillRect(58, 88, 12, 36);
  g.fillRect(48, 124, 32, 4);
  g.fillStyle = WOOD_MID;
  g.fillRect(46, 84, 36, 5);
  g.fillStyle = "#4d5a57";
  g.beginPath();
  g.moveTo(58, 56);
  g.lineTo(70, 56);
  g.quadraticCurveTo(82, 70, 72, 84);
  g.lineTo(56, 84);
  g.quadraticCurveTo(46, 70, 58, 56);
  g.fill();
  g.strokeStyle = "#2c2415";
  g.lineWidth = 1.25;
  for (const [x, y] of [
    [46, 28],
    [58, 18],
    [66, 26],
    [78, 20],
    [84, 34],
  ]) {
    g.beginPath();
    g.moveTo(64, 56);
    g.quadraticCurveTo(64, 38, x, y);
    g.stroke();
    g.fillStyle = "#231a12";
    g.beginPath();
    g.arc(x, y, 2.5, 0, Math.PI * 2);
    g.fill();
  }
  grain(g, rand, 10);
}

function barrel(g: CanvasRenderingContext2D, rand: () => number) {
  const staves = g.createLinearGradient(34, 0, 94, 0);
  staves.addColorStop(0, "#1c1109");
  staves.addColorStop(0.5, "#46301b");
  staves.addColorStop(1, "#1c1109");
  g.fillStyle = staves;
  g.beginPath();
  g.moveTo(40, 66);
  g.lineTo(88, 66);
  g.quadraticCurveTo(100, 97, 88, 128);
  g.lineTo(40, 128);
  g.quadraticCurveTo(28, 97, 40, 66);
  g.fill();
  g.fillStyle = "rgba(0,0,0,0.35)";
  for (let x = 42; x < 88; x += 9) g.fillRect(x, 66, 1.5, 62);
  g.fillStyle = "#17171a";
  g.fillRect(36, 78, 56, 4);
  g.fillRect(34, 112, 60, 4);
  grain(g, rand, 10);
}

// A cobweb strung from wall to wall and floor to ceiling, thin and slack.
function web(g: CanvasRenderingContext2D, rand: () => number) {
  const cx = 64 + (rand() - 0.5) * 24;
  const cy = 54 + (rand() - 0.5) * 20;
  const spokes: Pixel[] = [];
  for (let spoke = 0; spoke < 18; spoke++) {
    const angle = ((spoke + (rand() - 0.5) * 0.6) / 18) * Math.PI * 2;
    spokes.push([Math.cos(angle), Math.sin(angle)]);
  }
  g.strokeStyle = "#b9b8ad";
  g.lineCap = "round";
  g.lineWidth = 1;
  for (const [dx, dy] of spokes) {
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + dx * 150, cy + dy * 150);
    g.stroke();
  }
  // Each ring sags between the spokes, and gets more ragged toward the edges.
  for (let ring = 14; ring < 110; ring += 11 + rand() * 6) {
    spokes.forEach(([dx, dy], i) => {
      if (rand() < ring / 260) return; // torn
      const [nx, ny] = spokes[(i + 1) % spokes.length];
      const r0 = ring * (0.95 + rand() * 0.1);
      const r1 = ring * (0.95 + rand() * 0.1);
      const mx = (dx + nx) * 0.5 * ring * 0.8;
      const my = (dy + ny) * 0.5 * ring * 0.8 + ring * 0.05;
      g.beginPath();
      g.moveTo(cx + dx * r0, cy + dy * r0);
      g.quadraticCurveTo(cx + mx, cy + my, cx + nx * r1, cy + ny * r1);
      g.stroke();
    });
  }
}

// A spider the size of a hand, seen low and head on. Its eyes glow a little.
function spider(step: number): Texture {
  return sprite(
    (g) => {
      for (const side of [-1, 1]) {
        for (let leg = 0; leg < 4; leg++) {
          const lifted = (leg + step) % 2 === 0 ? 7 : 0;
          const out = 22 + leg * 11;
          limb(g, "#2a1d14", 3, [
            [64 + side * 9, 84 + leg * 3],
            [64 + side * out, 62 + leg * 6 - lifted],
            [64 + side * (out + 13), 124 - lifted],
          ]);
        }
      }
      g.fillStyle = "#3f2c1e";
      g.beginPath();
      g.ellipse(64, 80, 20, 17, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#2c1f15";
      g.beginPath();
      g.ellipse(64, 96, 13, 11, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = EYE_RED;
      g.fillRect(58, 92, 3, 3);
      g.fillRect(67, 92, 3, 3);
      g.fillRect(62, 97, 2, 2);
      g.fillRect(65, 97, 2, 2);
    },
    41 + step,
    (r, g) => (r > 200 && g < 50 ? 150 : 255),
  );
}

const EYE_RED = "#e01c1c";
const STONE_LIGHT = "#8e8c82";
const STONE_MID = "#6c6a62";
const STONE_DARK = "#403f39";
const STONE_BLACK = "#080807";

function stoneGradient(g: CanvasRenderingContext2D, x0: number, x1: number) {
  const gradient = g.createLinearGradient(x0, 0, x1, 0);
  gradient.addColorStop(0, STONE_DARK);
  gradient.addColorStop(0.42, STONE_LIGHT);
  gradient.addColorStop(1, STONE_DARK);
  return gradient;
}

// A long stone gown: narrow shoulders, a thin waist, and heavy folds to the floor.
function gown(g: CanvasRenderingContext2D, top: number, hem: number) {
  const waist = top + 32;
  g.fillStyle = stoneGradient(g, 64 - hem, 64 + hem);
  g.beginPath();
  g.moveTo(52, top);
  g.lineTo(76, top);
  g.quadraticCurveTo(84, top + 6, 79, top + 14);
  g.lineTo(73, waist);
  g.quadraticCurveTo(77, waist + 30, 64 + hem, 127);
  g.lineTo(64 - hem, 127);
  g.quadraticCurveTo(51, waist + 30, 55, waist);
  g.lineTo(49, top + 14);
  g.quadraticCurveTo(44, top + 6, 52, top);
  g.fill();
  g.strokeStyle = "rgba(10,10,8,0.6)";
  g.lineWidth = 1.5;
  for (const [x, spread] of [
    [58, -0.75],
    [62, -0.3],
    [66, 0.2],
    [70, 0.7],
  ]) {
    g.beginPath();
    g.moveTo(x, waist + 2);
    g.quadraticCurveTo(x + spread * 3, waist + 40, 64 + spread * hem * 0.92, 127);
    g.stroke();
  }
  g.fillStyle = "rgba(8,8,7,0.45)";
  g.fillRect(55, waist - 1, 18, 2);
}

// A veil over a bowed head, the face in its shadow.
function veil(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.fillStyle = stoneGradient(g, x - r * 1.5, x + r * 1.5);
  g.beginPath();
  g.moveTo(x - r * 1.5, y + r * 2.3);
  g.quadraticCurveTo(x - r * 1.3, y - r * 1.3, x, y - r * 1.25);
  g.quadraticCurveTo(x + r * 1.3, y - r * 1.3, x + r * 1.5, y + r * 2.3);
  g.closePath();
  g.fill();
}

// A woman at prayer on a plinth: head bowed, eyes closed, hands together.
function statuePraying(): Texture {
  return sprite((g, rand) => {
    g.fillStyle = STONE_DARK;
    g.fillRect(34, 118, 60, 10);
    g.fillStyle = STONE_MID;
    g.fillRect(38, 114, 52, 5);
    gown(g, 46, 25);
    veil(g, 64, 28, 11);
    g.fillStyle = STONE_MID;
    g.beginPath();
    g.ellipse(64, 32, 8, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = STONE_BLACK;
    g.lineWidth = 1.25;
    g.beginPath();
    g.moveTo(59, 31);
    g.lineTo(62, 32);
    g.moveTo(66, 32);
    g.lineTo(69, 31);
    g.moveTo(62, 38);
    g.lineTo(66, 38);
    g.stroke();
    limb(g, STONE_MID, 6, [
      [50, 54],
      [52, 72],
      [63, 62],
    ]);
    limb(g, STONE_MID, 6, [
      [78, 54],
      [76, 72],
      [65, 62],
    ]);
    g.fillStyle = STONE_LIGHT;
    g.beginPath();
    g.ellipse(64, 55, 4, 10, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = STONE_DARK;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(64, 46);
    g.lineTo(64, 65);
    g.stroke();
    grain(g, rand, 14);
  }, 43);
}

function statuePlinth(): Texture {
  return sprite((g, rand) => {
    g.fillStyle = STONE_DARK;
    g.fillRect(34, 118, 60, 10);
    g.fillStyle = STONE_MID;
    g.fillRect(38, 114, 52, 5);
    grain(g, rand, 14);
  }, 43);
}

// A long-fingered stone hand at (x, y), its claws fanned toward `angle`.
function stoneClaw(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
) {
  g.fillStyle = STONE_MID;
  g.beginPath();
  g.ellipse(x, y, size * 0.22, size * 0.26, angle, 0, Math.PI * 2);
  g.fill();
  for (let finger = -2; finger <= 2; finger++) {
    const a = angle + finger * 0.34;
    const bend = angle + finger * 0.1;
    const midX = x + Math.cos(a) * size * 0.55;
    const midY = y + Math.sin(a) * size * 0.55;
    limb(g, STONE_LIGHT, Math.max(1.25, size * 0.09), [
      [x, y],
      [midX, midY],
      [midX + Math.cos(bend) * size * 0.5, midY + Math.sin(bend) * size * 0.5],
    ]);
  }
}

// It has stopped pretending: sunken sockets and a jaw hanging further open than a jaw should.
function gauntFace(g: CanvasRenderingContext2D, x: number, y: number, r: number, tilt: number) {
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  // The veil, thrown back behind the head.
  g.fillStyle = STONE_DARK;
  g.beginPath();
  g.moveTo(-r * 1.05, r * 1.7);
  g.quadraticCurveTo(-r * 1.2, -r * 1.25, 0, -r * 1.2);
  g.quadraticCurveTo(r * 1.2, -r * 1.25, r * 1.05, r * 1.7);
  g.closePath();
  g.fill();
  // A long skull, narrowing to the chin.
  g.fillStyle = stoneGradient(g, -r * 0.8, r * 0.8);
  g.beginPath();
  g.moveTo(-r * 0.68, -r * 0.35);
  g.quadraticCurveTo(-r * 0.66, -r * 1.05, 0, -r * 1.05);
  g.quadraticCurveTo(r * 0.66, -r * 1.05, r * 0.68, -r * 0.35);
  g.quadraticCurveTo(r * 0.62, r * 0.55, r * 0.26, r * 1.35);
  g.lineTo(-r * 0.26, r * 1.35);
  g.quadraticCurveTo(-r * 0.62, r * 0.55, -r * 0.68, -r * 0.35);
  g.fill();
  // Hollow cheeks.
  g.fillStyle = "rgba(8,8,7,0.55)";
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(side * r * 0.46, r * 0.26, r * 0.13, r * 0.36, side * 0.2, 0, Math.PI * 2);
    g.fill();
  }
  // Sockets, slanting in toward the nose, with nothing in them.
  g.fillStyle = STONE_BLACK;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.ellipse(side * r * 0.3, -r * 0.3, r * 0.2, r * 0.25, side * 0.45, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.moveTo(-r * 0.05, -r * 0.05);
  g.lineTo(r * 0.05, -r * 0.05);
  g.lineTo(r * 0.09, r * 0.12);
  g.lineTo(-r * 0.09, r * 0.12);
  g.closePath();
  g.fill();
  // The mouth, and everything in it.
  g.beginPath();
  g.ellipse(0, r * 0.68, r * 0.25, r * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = STONE_LIGHT;
  for (let tooth = -2; tooth <= 2; tooth++) {
    const tx = tooth * r * 0.085;
    for (const [from, to] of [
      [0.28, 0.5],
      [1.1, 0.86],
    ]) {
      g.beginPath();
      g.moveTo(tx - r * 0.035, r * from);
      g.lineTo(tx + r * 0.035, r * from);
      g.lineTo(tx, r * to);
      g.closePath();
      g.fill();
    }
  }
  g.restore();
}

// Caught mid-stride, one arm out for you, its head on one side.
function statueReaching(): Texture {
  return sprite((g, rand) => {
    gown(g, 44, 27);
    limb(g, STONE_MID, 5, [
      [79, 50],
      [92, 70],
      [86, 88],
    ]);
    stoneClaw(g, 86, 88, 1.9, 15);
    limb(g, STONE_MID, 5, [
      [64, 34],
      [64, 46],
    ]);
    gauntFace(g, 65, 26, 11, 0.2);
    limb(g, STONE_MID, 5, [
      [49, 50],
      [32, 58],
      [20, 46],
    ]);
    stoneClaw(g, 20, 46, -2.3, 16);
    grain(g, rand, 14);
  }, 44);
}

// Right in front of you, hunched, both hands coming for your face.
function statueLunging(): Texture {
  return sprite((g, rand) => {
    gown(g, 62, 30);
    limb(g, STONE_MID, 7, [
      [50, 66],
      [24, 88],
      [26, 56],
    ]);
    limb(g, STONE_MID, 7, [
      [78, 66],
      [108, 80],
      [100, 40],
    ]);
    limb(g, STONE_MID, 8, [
      [64, 50],
      [64, 66],
    ]);
    gauntFace(g, 63, 36, 21, -0.14);
    stoneClaw(g, 26, 52, -0.9, 24);
    stoneClaw(g, 100, 36, -2.3, 26);
    grain(g, rand, 14);
  }, 45);
}

function loadImage(name: string, onLoad: (image: HTMLImageElement) => void) {
  const url = imageByName(name);
  if (!url) {
    if (import.meta.env.DEV) console.warn(`House: media/${name} doesn't exist`);
    return;
  }
  const image = new Image();
  image.onload = () => onLoad(image);
  image.src = url;
}

export function createTextures(): Textures {
  const walls: Texture[] = [];
  walls[WALLPAPER] = paint(wallpaper, 1);
  walls[WOOD] = paint(wood, 2);
  walls[DOOR] = paint(door, 3);
  walls[WINDOW] = new Uint32Array(windowPixels().buffer);
  walls[RIDDLE_DOOR] = paint(riddleDoor, 3);
  walls[STONE] = paint(stone, 19);
  walls[STAIRS_DOWN] = paint(stairsDown, 3);
  walls[STAIRS_UP] = paint(stairsUp, 19);
  walls[DOUBLE_DOOR_LEFT] = paint(doubleDoor(false), 3);
  walls[DOUBLE_DOOR_RIGHT] = paint(doubleDoor(true), 3);
  walls[CLAWED] = paint(clawed, 15);
  walls[BOOKSHELF] = paint(bookshelf, 16);
  walls[FOG_WALL] = fogWall();
  MESSAGES.forEach((message, i) => (walls[WRITING + i] = writing(message, 10 + i)));

  // Frames start empty and fill in as their images load. A painting with no image stays black.
  PAINTING_KEYS.forEach((key, i) => {
    const seed = 20 + i;
    const wall = PAINTINGS[key].stone ? stone : wallpaper;
    const texture = paint(painting(null, wall), seed);
    walls[PAINTING + i] = texture;
    const name = PAINTINGS[key].image;
    if (!name) return;
    loadImage(name, (image) =>
      texture.set(new Uint32Array(drawPixels(painting(image, wall), seed).buffer)),
    );
  });

  return {
    walls,
    floor: paint(floor, 5),
    ceiling: paint(ceiling, 6),
    ground: paint(ground, 17),
    siding: paint(siding, 18),
    darkWindow: paint(darkWindow, 18),
    basementFloor: paint(basementFloor, 22),
    basementCeiling: paint(basementCeiling, 23),
    figure: figure(),
    pale: {
      front: [paleFront(0), paleFront(1)],
      back: [paleBack(0), paleBack(1)],
      right: [paleSide(0, false), paleSide(1, false)],
      left: [paleSide(0, true), paleSide(1, true)],
      reared: paleReared(),
    },
    statue: {
      praying: statuePraying(),
      plinth: statuePlinth(),
      reaching: statueReaching(),
      lunging: statueLunging(),
    },
    spider: [spider(0), spider(1)],
    lamp: lamp(),
    table: table(),
    chair: chair(),
    rocker: rocker(),
    clock: [clock(-1), clock(1)],
    journal: journal(),
    dresser: sprite(dresser, 46),
    bed: sprite(bed, 47),
    coatrack: sprite(coatrack, 48),
    boxes: sprite(boxes, 49),
    mannequin: sprite(mannequin, 50),
    vase: sprite(vase, 51),
    barrel: sprite(barrel, 52),
    web: sprite(web, 53),
  };
}
