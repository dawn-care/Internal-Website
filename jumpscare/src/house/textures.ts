// Every texture is drawn here at startup, so the house needs no image files of its own. The
// paintings on the walls and the floating head are images from media/.

import { imageByName } from "../media";
import { HEAD_IMAGE, PAINTINGS } from "./story";

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
  figure: Texture;
  lamp: Texture;
  head: Texture;
  table: Texture;
  chair: Texture;
  rocker: Texture;
  clock: [Texture, Texture]; // pendulum swung left, swung right
};

// The color of the fog outside, before it's dimmed for the light.
export const FOG: [number, number, number] = [58, 63, 68];

// In the order the R cells appear in the map, reading left to right, top to bottom.
export const MESSAGES = [
  "WHY DO\nYOU\nMATTER",
  "YOU\nFORGOT",
  "REMEMBER",
  "DON'T\nLET IT\nSEE YOU",
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
export const WRITING = 9; // one per message
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

function painting(image: HTMLImageElement | null): Draw {
  return (g, rand) => {
    wallpaper(g, rand);
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

// The head's photo with its black background cut away. It glows faintly, so it can be seen
// coming in the dark.
function headPixels(image: HTMLImageElement): Uint32Array {
  const pixels = drawPixels((g) => {
    const scale = Math.min(TEX / image.width, TEX / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    g.drawImage(image, (TEX - w) / 2, (TEX - h) / 2, w, h);
  }, 8);
  for (let i = 0; i < pixels.length; i += 4) {
    const light = pixels[i] + pixels[i + 1] + pixels[i + 2];
    pixels[i + 3] = pixels[i + 3] < 128 || light < 60 ? 0 : 46;
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
  walls[CLAWED] = paint(clawed, 15);
  walls[BOOKSHELF] = paint(bookshelf, 16);
  walls[FOG_WALL] = fogWall();
  MESSAGES.forEach((message, i) => (walls[WRITING + i] = writing(message, 10 + i)));

  // Frames and the head start empty and fill in as their images load. A painting with no
  // image stays black.
  PAINTING_KEYS.forEach((key, i) => {
    const seed = 20 + i;
    const texture = paint(painting(null), seed);
    walls[PAINTING + i] = texture;
    const name = PAINTINGS[key].image;
    if (!name) return;
    loadImage(name, (image) =>
      texture.set(new Uint32Array(drawPixels(painting(image), seed).buffer)),
    );
  });
  const head = new Uint32Array(TEX * TEX);
  loadImage(HEAD_IMAGE, (image) => head.set(headPixels(image)));

  return {
    walls,
    floor: paint(floor, 5),
    ceiling: paint(ceiling, 6),
    ground: paint(ground, 17),
    siding: paint(siding, 18),
    darkWindow: paint(darkWindow, 18),
    figure: figure(),
    lamp: lamp(),
    head,
    table: table(),
    chair: chair(),
    rocker: rocker(),
    clock: [clock(-1), clock(1)],
  };
}
