import {
  playCrawl,
  playCreakAt,
  playDoorOpen,
  playDoorSlam,
  playEnding,
  playBite,
  playDrip,
  playFootstep,
  playGiantStep,
  playGrowl,
  playRunningBehind,
  playShriek,
  playSkitter,
  playSniff,
  playStairs,
  playStatueStep,
  playSting,
  playStoneGrind,
  playTick,
  playWebRustle,
  startAmbience,
  unlockAudio,
} from "../audio";
import {
  createWorld,
  findPath,
  isOutdoors,
  isSolid,
  isWall,
  lineOfSight,
  randomDestination,
  type Point,
  type PropKind,
  type World,
} from "./map";
import { createFrame, planeLength, render, type Frame, type Lamp, type Sprite } from "./raycaster";
import {
  createTextures,
  DOOR,
  DOUBLE_DOOR_LEFT,
  FOG,
  FOG_WALL,
  STAIRS_DOWN,
  STAIRS_UP,
  type Texture,
} from "./textures";

const HEIGHT = 200; // render height in pixels; the canvas scales it up
const WALK_SPEED = 1.5; // cells per second
const RUN_SPEED = 2.6;
const WALK_STRIDE = 0.75; // cells per footstep
const RUN_STRIDE = 0.95;
const TURN_SPEED = 2.2; // radians per second, for the arrow keys
const MOUSE_LOOK = 0.0022; // radians per pixel
const TOUCH_LOOK = 0.006;
const TOUCH_WALK = 50; // pixels of drag for full speed
const RADIUS = 0.22; // how close you can get to a wall
const FADE_IN_SECONDS = 3;
const STAIRS_HOLD_MS = 1100; // in the dark, on the way up or down
const STAIRS_FADE_SECONDS = 0.8;
const REACH = 1.6; // how close you need to be to a painting or door to use it
// How much you can see outside the flashlight's beam: nearly nothing, and less downstairs.
const AMBIENT = 0.012;
const BASEMENT_AMBIENT = 0.004;

// The figure vanishes if you walk up to it. Stare at it from afar for too long and it doesn't.
const VANISH_DISTANCE = 3.5;
const STARE_DISTANCE = 8; // beyond this it's too dark to see, so looking doesn't count
const STARE_SECONDS = 2.5;
const FIRST_FIGURE_SECONDS = 8;
const MIN_FIGURE_DISTANCE = 7;

const CAUGHT_HOLD_MS = 3000;

// The statue in the basement looks like a woman praying, and stays that way until the first
// time you look away. After that it only ever moves when you can't see it, but when it moves it
// sprints: faster than you walk, slower than you run. You can see it if it's in your flashlight's
// beam, or standing in a lamp's light on your screen, so when the flashlight flickers it moves.
const STATUE_SPEED = 1.9;
const STATUE_STRIDE = 0.55; // cells per footstep
const STATUE_BEAM = 0.45; // radians either side of straight ahead
const STATUE_RANGE = 9; // beyond this your flashlight doesn't reach it
const STATUE_REPATH_SECONDS = 0.4;
const STATUE_CATCH = 0.7;
const STATUE_SIZE = 0.35; // you can't walk through it
const STATUE_LUNGE_DISTANCE = 2.5; // closer than this, you catch it in its worst pose
const STATUE_SCALE = 0.95;
const STATUE_CLEARANCE = 7; // coming back downstairs, it's at least this far from the stairs

// Spiders in the basement scatter from the flashlight and creep up on you in the dark. Cobwebs
// and bites both slow you down.
const SPIDER_COUNT = 14;
const SPIDER_SCALE = 0.28;
const SPIDER_FLEE_SPEED = 2.4;
const SPIDER_CREEP_SPEED = 0.8;
const SPIDER_WANDER_SPEED = 0.5;
const SPIDER_SIGHT = 6;
const SPIDER_BEAM = 0.6;
const SPIDER_BITE = 0.35;
const SPIDER_DRAW_RANGE = 9;
const BITE_SECONDS = 2;
const BITE_SLOW = 0.6;
const BITE_COOLDOWN = 4;
const WEB_SLOW = 0.35;
const WEB_OPACITY = 0.55;
const JOURNAL_ANGLE = 0.4; // how directly you need to be facing a journal to pick it up

// The pale thing behind door 2 is an animal, not a hunter. It wanders with its nose to the
// floor until it catches your scent, then follows you, slower than you walk and in fits and
// starts. It stops just out of reach to rear up and sniff at you, and if you stay put it gets
// bored and goes away for a while. Walk into it, or run while it's near, and it goes for you.
// It can't take the stairs, so the basement shakes it off.
const PALE_SPEED = 0.7;
const PALE_STRIDE = 0.4; // cells per step
const PALE_SIDE_SCALE = 1.7; // seen side on it's longer than a cell
const PALE_SCENT = 14; // how far it can smell you from, in cells of walking
const PALE_LOSES_SCENT = 22; // how far you have to get from it once it's following you
const PALE_REPATH_SECONDS = 0.75;
const PALE_SNIFF_DISTANCE = 2.2; // it comes this close, no closer
const PALE_BITE_DISTANCE = 1.4; // come this close to it and it attacks
const PALE_SPOOK_DISTANCE = 3.2; // run this close to it and it attacks
const PALE_LUNGE_WINDUP = 0.45;
const PALE_LUNGE_SPEED = 5;
const PALE_LUNGE_SECONDS = 1.1;
const PALE_LUNGE_CATCH = 0.6;

// Outside, through door 2: open ground, fog, and something forty feet tall walking toward
// you. It's slow, but wherever you go it's there ahead of you in the fog. When it reaches
// you, that's the end (for now).
const FOG_DENSITY = 0.3; // per cell
const DOOR_SHUTS_AT = 2; // cells away from the door, once outside
const GIANT_SCALE = 4.5; // cells tall; a cell is about nine feet
const GIANT_SPEED = 0.3;
const GIANT_STEP_SECONDS = 2.4;
const GIANT_CATCH = 1.3;
const GIANT_LEASH = 15; // farther than this and it reappears ahead of you
const GIANT_AHEAD = 11;
const GIANT_HAZE = 0.4; // the fog hides it less than it would something smaller

const LAMP_POWER = 0.8;
const CANDLE_POWER = 0.28;
const LAMP_SWING = 0.1; // cells either side
const LAMP_LIGHT_SWING = 2.5; // the pool of light on the floor swings further than the bulb
const LIGHT_RANGE = 9; // lights farther than this aren't drawn or heard
const ROCK_SWING = 0.04;
const CLOCK_RANGE = 12;

const MOVE_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
]);

// What's right in front of you, close enough to use. A door's key is null if it never opens.
export type Focus =
  | { kind: "painting"; key: string }
  | { kind: "door"; key: string | null }
  | { kind: "stairs"; key: "down" | "up" }
  | { kind: "journal"; key: string }
  | { kind: "fog"; key?: undefined };

export type GameEvents = {
  onJumpscare: (image: string | null) => void;
  onWalk: () => void; // the first time the player moves
  onFocus: (focus: Focus | null) => void;
  onInteract: (focus: Focus) => void;
  onEnding: () => void;
  onPauseKey: () => void; // P or Esc, or Esc already let go of the mouse
};

export type Game = {
  stop(): void;
  pause(): void; // freezes the house while you read something or the pause menu is open
  resume(): void;
  interact(): void; // the same as pressing E
  openDoor(key: string): void;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sameFocus(a: Focus | null, b: Focus | null) {
  return a?.kind === b?.kind && a?.key === b?.key;
}

// How far `angle` is from straight ahead, from 0 to pi.
function offCenter(angle: number) {
  return Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
}

// Which cells a light can reach, so its glow doesn't leak through walls.
function lightSight(world: World, light: Point): Uint8Array {
  const lit = new Uint8Array(world.width * world.height);
  for (let y = 0; y < world.height; y++) {
    for (let x = 0; x < world.width; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (Math.hypot(cx - light.x, cy - light.y) > 5) continue;
      if (!isWall(world, cx, cy) && lineOfSight(world, light.x, light.y, cx, cy)) {
        lit[y * world.width + x] = 1;
      }
    }
  }
  return lit;
}

// Runs the house in `canvas` until stop() is called.
export function startGame(canvas: HTMLCanvasElement, events: GameEvents): Game {
  const ctx = canvas.getContext("2d")!;
  const world = createWorld();
  const textures = createTextures();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ambience = startAmbience();

  let frame: Frame = resize();
  const player = { x: world.spawn.x, y: world.spawn.y, angle: 0 };
  const figure = { x: 0, y: 0, visible: false, respawnAt: FIRST_FIGURE_SECONDS, stare: 0 };
  const statue = {
    x: world.statueHome.x,
    y: world.statueHome.y,
    seen: false, // you've looked at it
    awake: false, // and then looked away
    path: [] as Point[],
    nextPath: 0,
    stride: 0,
    pose: "reaching" as "reaching" | "lunging",
  };
  const basementStart = { x: 2.5, y: world.basementTop + 2.5 };
  const spiders = Array.from({ length: SPIDER_COUNT }, () => {
    const spot = randomDestination(world, basementStart, 6, 200) ?? basementStart;
    return { ...spot, heading: rand(0, Math.PI * 2), nextTurn: 0, moving: false };
  });
  const pale = {
    x: world.paleHome.x,
    y: world.paleHome.y,
    state: "roam" as "roam" | "follow" | "sniff" | "windup" | "lunge",
    path: [] as Point[],
    scent: [] as Point[], // the way to you, the last time it checked
    nextScent: 0,
    heading: Math.PI, // the way it's facing, in radians
    stride: 0, // distance since its last step
    step: 0 as 0 | 1, // which limbs are forward
    stateUntil: 0, // when sniffing, winding up or lunging ends
    restUntil: 0, // between bursts of crawling it stops where it is
    crawlUntil: 0,
    boredUntil: 0, // until then it ignores your scent
    nextSniff: 0,
  };
  const giant = { x: 0, y: 0, active: false, nextStep: 0 };
  const lights = world.lights.map((light) => ({
    ...light,
    phase: rand(0, Math.PI * 2),
    period: rand(2.8, 3.6),
    swingingRight: true,
    lit: lightSight(world, light),
  }));
  const rockers = world.props
    .filter((prop) => prop.kind === "rocker")
    .map((prop) => ({ prop, phase: rand(0, Math.PI * 2), forward: true }));
  // In dev, the browser console can move things around: __house.player.x = 22.
  if (import.meta.env.DEV) Object.assign(window, { __house: { player, statue, spiders, pale, giant, world, openDoor } });
  const keys = new Set<string>();
  let look = 0; // radians of mouse or touch turning since the last frame
  let walkTouch: { id: number; startX: number; startY: number; x: number; y: number } | null =
    null;
  let lookTouch: { id: number; x: number } | null = null;

  let time = 0;
  let wokeAt = 0; // when you last woke up, for the fade in
  let fadeSeconds = FADE_IN_SECONDS;
  let paused = false;
  let ended = false;
  let relock = false; // capture the mouse again when the game picks back up
  let releasing = false; // the game is letting go of the mouse itself, not the player
  let wasLocked = false;
  let holdUntil = 0; // performance.now() until which nothing moves, after being caught
  let stride = 0; // distance since the last footstep
  let foot = 1; // which foot lands next: -1 left, 1 right
  let bobAmount = 0;
  let bob = 0; // pixels; lowest as each foot lands
  let shake = 0; // pixels of camera shake from the giant's footsteps, dying away
  let walked = false;
  let running = false;
  let flashlight = 1; // how bright the flashlight was last frame
  let flickerUntil = 0;
  let blackoutUntil = 0;
  let nextRunBehind = rand(40, 80);
  let nextDrip = 0;
  let nextSkitter = 0;
  let bittenUntil = 0;
  let nextBite = 0;
  let lastCell = -1;
  let nextTick = 1;
  let tock = false;
  let outside = false;
  let exitDoors: number[] = []; // the doorway to the outside, while it's open
  let lookingAt: Sprite | null = null;
  let focus: Focus | null = null;

  function resize(): Frame {
    // A hidden or zero-size window gives 0 / 0; fall back to widescreen.
    const aspect = clamp(window.innerWidth / window.innerHeight || 16 / 9, 0.75, 2);
    canvas.width = Math.round(HEIGHT * aspect);
    canvas.height = HEIGHT;
    return createFrame(canvas.width, HEIGHT);
  }

  function inBasement() {
    return player.y >= world.basementTop;
  }

  // Walls, furniture and the statue.
  function blocked(x: number, y: number) {
    return (
      isSolid(world, x, y) ||
      (y >= world.basementTop && Math.hypot(x - statue.x, y - statue.y) < STATUE_SIZE)
    );
  }

  function tryMove(dx: number, dy: number) {
    const nx = player.x + dx;
    const edgeX = nx + Math.sign(dx) * RADIUS;
    if (!blocked(edgeX, player.y - RADIUS) && !blocked(edgeX, player.y + RADIUS)) {
      player.x = nx;
    }
    const ny = player.y + dy;
    const edgeY = ny + Math.sign(dy) * RADIUS;
    if (!blocked(player.x - RADIUS, edgeY) && !blocked(player.x + RADIUS, edgeY)) {
      player.y = ny;
    }
  }

  // How a sound at (x, y) reaches you: its volume, its stereo pan, and whether it's muffled.
  function hear(x: number, y: number, carry = 0.05) {
    const dx = x - player.x;
    const dy = y - player.y;
    const turn = Math.atan2(dy, dx) - player.angle;
    const sameFloor = y >= world.basementTop === player.y >= world.basementTop;
    return {
      distance: Math.hypot(dx, dy),
      volume: sameFloor ? 1 / (1 + carry * (dx * dx + dy * dy)) : 0,
      pan: Math.sin(turn) * 0.8,
      muffled: !lineOfSight(world, player.x, player.y, x, y),
    };
  }

  function vanishFigure(seconds: number) {
    figure.visible = false;
    figure.stare = 0;
    figure.respawnAt = time + seconds;
  }

  // Somewhere far away and out of sight.
  function placeFigure() {
    const halfFov = Math.atan(planeLength(frame)) + 0.3;
    const spots = world.figureSpots.filter((spot) => {
      const turn = Math.atan2(spot.y - player.y, spot.x - player.x) - player.angle;
      return (
        Math.hypot(spot.x - player.x, spot.y - player.y) > MIN_FIGURE_DISTANCE &&
        offCenter(turn) > halfFov
      );
    });
    if (spots.length === 0) {
      figure.respawnAt = time + 2;
      return;
    }
    const spot = spots[Math.floor(Math.random() * spots.length)];
    figure.x = spot.x;
    figure.y = spot.y;
    figure.visible = true;
  }

  // Moves something along its path. Returns false once it has arrived.
  function followPath(mover: Point & { path: Point[] }, speed: number) {
    while (mover.path.length > 0) {
      const next = mover.path[0];
      const dx = next.x - mover.x;
      const dy = next.y - mover.y;
      const distance = Math.hypot(dx, dy);
      if (distance > speed) {
        mover.x += (dx / distance) * speed;
        mover.y += (dy / distance) * speed;
        return true;
      }
      mover.x = next.x;
      mover.y = next.y;
      speed -= distance;
      mover.path.shift();
    }
    return false;
  }

  // After it's had you, it leaves you alone for a while.
  function sendPaleHome() {
    pale.x = world.paleHome.x;
    pale.y = world.paleHome.y;
    pale.state = "roam";
    pale.path = [];
    pale.scent = [];
    pale.restUntil = 0;
    pale.boredUntil = time + rand(20, 30);
  }

  // Back on its plinth, praying, as if nothing happened.
  function sendStatueHome() {
    statue.x = world.statueHome.x;
    statue.y = world.statueHome.y;
    statue.seen = false;
    statue.awake = false;
    statue.path = [];
  }

  // A null image picks a random one.
  function caught(image: string | null) {
    events.onJumpscare(image);
    holdUntil = performance.now() + CAUGHT_HOLD_MS;
    player.x = world.spawn.x;
    player.y = world.spawn.y;
    player.angle = 0;
    sendStatueHome();
    sendPaleHome();
    vanishFigure(rand(20, 35));
    wokeAt = time;
    fadeSeconds = FADE_IN_SECONDS;
  }

  // Up or down, in the dark, and out the other end.
  function takeStairs(index: number) {
    const landing = world.stairs.get(index)!;
    playStairs(world.cells[index] === STAIRS_DOWN);
    player.x = landing.x;
    player.y = landing.y;
    player.angle = landing.angle;
    // It doesn't get to wait for you at the bottom of the stairs.
    if (inBasement() && statue.awake) {
      const distance = Math.hypot(player.x - statue.x, player.y - statue.y);
      if (distance < STATUE_CLEARANCE) {
        const spot = randomDestination(world, player, STATUE_CLEARANCE + 3, 200);
        if (spot) Object.assign(statue, spot, { path: [] });
      }
    }
    holdUntil = performance.now() + STAIRS_HOLD_MS;
    wokeAt = time;
    fadeSeconds = STAIRS_FADE_SECONDS;
  }

  // Whether you can see the statue right now: on your screen, not behind a wall, and either in
  // your flashlight's beam or standing in a lamp's light.
  function statueWatched(distance: number) {
    if (!lineOfSight(world, player.x, player.y, statue.x, statue.y)) return false;
    const off = offCenter(Math.atan2(statue.y - player.y, statue.x - player.x) - player.angle);
    const width = Math.atan2(STATUE_SIZE, Math.max(distance, 0.1)); // it's not just a point
    if (off > Math.atan(planeLength(frame)) + width) return false;
    if (flashlight > 0.5 && distance < STATUE_RANGE && off < STATUE_BEAM + width) return true;
    const cell = Math.floor(statue.y) * world.width + Math.floor(statue.x);
    return lights.some(
      (light) =>
        light.kind === "lamp" &&
        time >= blackoutUntil &&
        light.lit[cell] === 1 &&
        Math.hypot(light.x - statue.x, light.y - statue.y) < 3,
    );
  }

  function updateStatue(dt: number) {
    if (!inBasement()) return;
    const dx = player.x - statue.x;
    const dy = player.y - statue.y;
    const distance = Math.hypot(dx, dy);
    const watched = statueWatched(distance);

    if (!statue.awake) {
      if (watched) {
        statue.seen = true;
      } else if (statue.seen) {
        statue.awake = true;
        const sound = hear(statue.x, statue.y, 0.03);
        playStoneGrind(sound.volume, sound.pan, sound.muffled);
      }
      return;
    }
    if (watched) return;

    const speed = STATUE_SPEED * dt;
    const fromX = statue.x;
    const fromY = statue.y;
    if (distance < 1.5 && lineOfSight(world, statue.x, statue.y, player.x, player.y)) {
      statue.x += (dx / distance) * Math.min(speed, distance);
      statue.y += (dy / distance) * Math.min(speed, distance);
    } else {
      if (time > statue.nextPath) {
        statue.nextPath = time + STATUE_REPATH_SECONDS;
        statue.path = findPath(world, statue, player);
      }
      followPath(statue, speed);
    }
    statue.pose = distance < STATUE_LUNGE_DISTANCE ? "lunging" : "reaching";

    statue.stride += Math.hypot(statue.x - fromX, statue.y - fromY);
    if (statue.stride >= STATUE_STRIDE) {
      statue.stride -= STATUE_STRIDE;
      const sound = hear(statue.x, statue.y, 0.03);
      playStatueStep(sound.volume, sound.pan, sound.muffled);
    }
    if (Math.hypot(player.x - statue.x, player.y - statue.y) < STATUE_CATCH) caught(null);
  }

  function updateSpiders(dt: number) {
    if (!inBasement()) return;
    let closest = Infinity;
    let closestSpider: (typeof spiders)[number] | null = null;
    for (const spider of spiders) {
      const dx = player.x - spider.x;
      const dy = player.y - spider.y;
      const distance = Math.hypot(dx, dy);
      const toYou = Math.atan2(dy, dx);
      const near = distance < SPIDER_SIGHT && lineOfSight(world, spider.x, spider.y, player.x, player.y);
      const lit =
        near && flashlight > 0.5 && offCenter(toYou + Math.PI - player.angle) < SPIDER_BEAM;

      let speed = SPIDER_WANDER_SPEED;
      if (lit) {
        spider.heading = toYou + Math.PI + rand(-0.5, 0.5);
        speed = SPIDER_FLEE_SPEED;
      } else if (near) {
        spider.heading = toYou + rand(-0.4, 0.4);
        speed = SPIDER_CREEP_SPEED;
      } else if (time > spider.nextTurn) {
        spider.nextTurn = time + rand(0.6, 2.5);
        spider.heading = rand(0, Math.PI * 2);
        spider.moving = Math.random() < 0.6;
        if (!spider.moving) speed = 0;
      } else if (!spider.moving) {
        speed = 0;
      }

      const nx = spider.x + Math.cos(spider.heading) * speed * dt;
      const ny = spider.y + Math.sin(spider.heading) * speed * dt;
      if (isSolid(world, nx, ny)) spider.heading += Math.PI / 2 + rand(0, Math.PI);
      else {
        spider.x = nx;
        spider.y = ny;
      }
      if (speed > SPIDER_WANDER_SPEED && distance < closest) {
        closest = distance;
        closestSpider = spider;
      }
      if (distance < SPIDER_BITE && time > nextBite) {
        nextBite = time + BITE_COOLDOWN;
        bittenUntil = time + BITE_SECONDS;
        playBite();
      }
    }
    if (closestSpider && time > nextSkitter) {
      nextSkitter = time + rand(0.8, 1.8);
      const sound = hear(closestSpider.x, closestSpider.y, 0.2);
      playSkitter(sound.volume, sound.pan, sound.muffled);
    }
    if (time > nextDrip) {
      nextDrip = time + rand(2.5, 8);
      playDrip(rand(0.2, 0.7), rand(-0.8, 0.8));
    }
  }

  // Turns its body to match how it just moved, and takes a step when it's gone far enough.
  function paleMoved(fromX: number, fromY: number) {
    const dx = pale.x - fromX;
    const dy = pale.y - fromY;
    const moved = Math.hypot(dx, dy);
    if (moved === 0) return;
    pale.heading = Math.atan2(dy, dx);
    pale.stride += moved;
    if (pale.stride >= PALE_STRIDE) {
      pale.stride -= PALE_STRIDE;
      pale.step = pale.step ? 0 : 1;
      const sound = hear(pale.x, pale.y);
      playCrawl(sound.volume, sound.pan, sound.muffled);
    }
  }

  function paleSniffs(minSeconds: number, maxSeconds: number) {
    if (time < pale.nextSniff) return;
    pale.nextSniff = time + rand(minSeconds, maxSeconds);
    const sound = hear(pale.x, pale.y);
    playSniff(sound.volume, sound.pan, sound.muffled);
  }

  function updatePale(dt: number) {
    if (outside) return;
    const dx = player.x - pale.x;
    const dy = player.y - pale.y;
    const distance = Math.hypot(dx, dy);
    const visible = lineOfSight(world, pale.x, pale.y, player.x, player.y);
    const toYou = Math.atan2(dy, dx);

    if (pale.state === "windup") {
      pale.heading = toYou;
      if (time > pale.stateUntil) {
        pale.state = "lunge";
        pale.stateUntil = time + PALE_LUNGE_SECONDS;
      }
      return;
    }
    if (pale.state === "lunge") {
      pale.heading = toYou;
      if (visible && distance > 0) {
        const step = Math.min(distance, PALE_LUNGE_SPEED * dt);
        pale.x += (dx / distance) * step;
        pale.y += (dy / distance) * step;
      }
      if (Math.hypot(player.x - pale.x, player.y - pale.y) < PALE_LUNGE_CATCH) {
        caught(null);
      } else if (time > pale.stateUntil || !visible) {
        // It missed. It backs off, for now.
        pale.state = "roam";
        pale.path = [];
        pale.restUntil = time + 1.5;
        pale.boredUntil = time + rand(8, 12);
      }
      return;
    }

    if (visible && (distance < PALE_BITE_DISTANCE || (running && distance < PALE_SPOOK_DISTANCE))) {
      pale.state = "windup";
      pale.stateUntil = time + PALE_LUNGE_WINDUP;
      playShriek();
      return;
    }

    if (time > pale.nextScent) {
      pale.nextScent = time + PALE_REPATH_SECONDS;
      pale.scent = findPath(world, pale, player);
    }
    const reach = pale.state === "roam" ? PALE_SCENT : PALE_LOSES_SCENT;
    const smelled = time > pale.boredUntil && pale.scent.length > 0 && pale.scent.length <= reach;
    const fromX = pale.x;
    const fromY = pale.y;

    if (pale.state === "sniff") {
      pale.heading = toYou;
      paleSniffs(1, 1.8);
      if (distance > PALE_SNIFF_DISTANCE + 0.7 || !visible) {
        pale.state = "follow";
        pale.crawlUntil = time + rand(2, 4);
      } else if (time > pale.stateUntil) {
        // You've stayed still long enough. You're not interesting.
        pale.state = "roam";
        pale.boredUntil = time + rand(15, 25);
        const away = randomDestination(world, pale, 8, 16);
        pale.path = away ? findPath(world, pale, away) : [];
      }
    } else if (pale.state === "follow") {
      if (!smelled) {
        pale.state = "roam";
        pale.path = [];
      } else if (visible && distance <= PALE_SNIFF_DISTANCE) {
        pale.state = "sniff";
        pale.stateUntil = time + rand(5, 9);
        pale.path = [];
        const sound = hear(pale.x, pale.y);
        playGrowl(sound.volume, sound.pan, sound.muffled);
      } else if (time < pale.restUntil) {
        if (visible) pale.heading = toYou;
        paleSniffs(1.2, 2.2);
      } else if (time > pale.crawlUntil) {
        pale.restUntil = time + rand(0.8, 2);
        pale.crawlUntil = pale.restUntil + rand(2, 4);
      } else if (visible) {
        const step = Math.min(PALE_SPEED * dt, distance - PALE_SNIFF_DISTANCE);
        pale.x += (dx / distance) * step;
        pale.y += (dy / distance) * step;
      } else {
        pale.path = pale.scent;
        followPath(pale, PALE_SPEED * dt);
      }
    } else if (smelled) {
      pale.state = "follow";
      pale.restUntil = time + 1; // it lifts its head first
      pale.crawlUntil = pale.restUntil + rand(2, 4);
    } else if (time < pale.restUntil) {
      paleSniffs(2, 4);
    } else if (!followPath(pale, PALE_SPEED * dt)) {
      pale.restUntil = time + rand(1.5, 4);
      const destination = randomDestination(world, pale, 3, 12);
      if (destination) pale.path = findPath(world, pale, destination);
    }
    paleMoved(fromX, fromY);
  }

  // What it looks like from where you're standing.
  function paleSprite(): Sprite {
    const { x, y, state, heading, step } = pale;
    const look = textures.pale;
    if (state === "lunge") return { x, y, texture: look.front[0], scale: 1.3, lift: 0.15 };
    if (state === "sniff" || state === "windup" || (state === "follow" && time < pale.restUntil)) {
      return { x: x + Math.sin(time * 3) * 0.02, y, texture: look.reared, scale: 1, lift: 0 };
    }
    const facing = offCenter(heading - Math.atan2(player.y - y, player.x - x));
    if (facing < 1) return { x, y, texture: look.front[step], scale: 1, lift: 0 };
    if (facing > 2.1) return { x, y, texture: look.back[step], scale: 1, lift: 0 };
    const towardRight =
      -Math.cos(heading) * Math.sin(player.angle) + Math.sin(heading) * Math.cos(player.angle);
    return {
      x,
      y,
      texture: (towardRight > 0 ? look.right : look.left)[step],
      scale: PALE_SIDE_SCALE,
      lift: (PALE_SIDE_SCALE - 1) / 2,
    };
  }

  // Puts the giant `distance` cells ahead of you, inside the fog.
  function placeGiantAhead(distance: number) {
    const top = world.basementTop - 26;
    giant.x = clamp(player.x + Math.cos(player.angle) * distance, 2, world.width - 2);
    giant.y = clamp(player.y + Math.sin(player.angle) * distance, top, world.basementTop - 2);
    if (!isOutdoors(world, giant.x, giant.y)) {
      giant.x = world.width / 2;
      giant.y = world.basementTop - 6;
    }
  }

  function end() {
    ended = true;
    keys.clear();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    ambience.stop();
    playEnding();
    events.onEnding();
  }

  function updateOutside(dt: number) {
    outside = isOutdoors(world, player.x, player.y);
    ambience.setOutside(outside);

    // Once you're out, the door slams behind you and won't open again.
    if (exitDoors.length > 0 && outside) {
      const clear = exitDoors.every((door) => {
        const doorX = (door % world.width) + 0.5;
        const doorY = Math.floor(door / world.width) + 0.5;
        return Math.hypot(player.x - doorX, player.y - doorY) > DOOR_SHUTS_AT;
      });
      if (clear) {
        for (const door of exitDoors) {
          world.cells[door] = DOOR;
          world.openDoors.delete(door);
        }
        exitDoors = [];
        lights.forEach((light) => (light.lit = lightSight(world, light)));
        playDoorSlam();
        if (!reducedMotion) shake = 6;
        giant.active = true;
        giant.nextStep = time + 1.5;
        placeGiantAhead(GIANT_AHEAD);
      }
    }

    if (!giant.active) return;
    const dx = player.x - giant.x;
    const dy = player.y - giant.y;
    const distance = Math.hypot(dx, dy);
    if (distance > GIANT_LEASH) {
      placeGiantAhead(GIANT_AHEAD);
    } else if (distance > 0) {
      const step = Math.min(distance, GIANT_SPEED * dt);
      giant.x += (dx / distance) * step;
      giant.y += (dy / distance) * step;
    }
    if (time > giant.nextStep) {
      giant.nextStep = time + GIANT_STEP_SECONDS;
      const sound = hear(giant.x, giant.y, 0.008);
      playGiantStep(sound.volume, sound.pan);
      if (!reducedMotion) shake = Math.max(shake, 7 / (1 + 0.05 * distance * distance));
    }
    if (distance < GIANT_CATCH) end();
  }

  function update(dt: number) {
    if (paused || ended || performance.now() < holdUntil) return;
    time += dt;

    if (keys.has("ArrowLeft")) player.angle -= TURN_SPEED * dt;
    if (keys.has("ArrowRight")) player.angle += TURN_SPEED * dt;
    player.angle += look;
    look = 0;

    const pressed = (...codes: string[]) => (codes.some((code) => keys.has(code)) ? 1 : 0);
    let forward = pressed("KeyW", "ArrowUp") - pressed("KeyS", "ArrowDown");
    let strafe = pressed("KeyD") - pressed("KeyA");
    if (walkTouch) {
      forward += clamp((walkTouch.startY - walkTouch.y) / TOUCH_WALK, -1, 1);
      strafe += clamp((walkTouch.x - walkTouch.startX) / TOUCH_WALK, -1, 1);
    }
    const amount = Math.hypot(forward, strafe);
    if (amount > 1) {
      forward /= amount;
      strafe /= amount;
    }

    const hurrying = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const cell = Math.floor(player.y) * world.width + Math.floor(player.x);
    const inWeb = world.webs.has(cell);
    if (inWeb && cell !== lastCell) playWebRustle();
    lastCell = cell;
    const speed =
      (hurrying ? RUN_SPEED : WALK_SPEED) *
      (inWeb ? WEB_SLOW : 1) *
      (time < bittenUntil ? BITE_SLOW : 1) *
      dt;
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    const before = { x: player.x, y: player.y };
    tryMove((cos * forward - sin * strafe) * speed, (sin * forward + cos * strafe) * speed);
    const moved = Math.hypot(player.x - before.x, player.y - before.y);
    running = hurrying && moved > 0.0005;

    // Footsteps land every stride; the head bobs between them.
    const strideLength = hurrying ? RUN_STRIDE : WALK_STRIDE;
    if (moved > 0.0005) {
      if (!walked) {
        walked = true;
        events.onWalk();
      }
      stride += moved;
      if (stride >= strideLength) {
        stride -= strideLength;
        playFootstep(foot * 0.15, hurrying);
        foot = -foot;
      }
    }
    const targetBob = moved > 0.0005 && !reducedMotion ? (hurrying ? 7 : 4) : 0;
    bobAmount += (targetBob - bobAmount) * Math.min(1, dt * 8);
    shake *= Math.exp(-dt * 4);
    bob =
      bobAmount * (Math.abs(Math.sin((stride / strideLength) * Math.PI)) - 0.5) +
      shake * Math.sin(time * 40);

    if (!outside && figure.visible) {
      const distance = Math.hypot(figure.x - player.x, figure.y - player.y);
      if (distance < VANISH_DISTANCE) {
        vanishFigure(rand(14, 28));
        blackoutUntil = time + 0.35;
        flickerUntil = time + 1.2;
        playSting();
      } else if (lookingAt?.texture === textures.figure && distance < STARE_DISTANCE) {
        figure.stare += dt;
        if (figure.stare > STARE_SECONDS) {
          vanishFigure(rand(20, 35));
          blackoutUntil = time + 3;
          events.onJumpscare(null);
        }
      } else {
        figure.stare = Math.max(0, figure.stare - dt);
      }
    } else if (!outside && time > figure.respawnAt) {
      placeFigure();
    } else if (outside) {
      figure.visible = false;
    }

    updateStatue(dt);
    if (performance.now() < holdUntil) return; // it caught you
    updateSpiders(dt);
    updatePale(dt);
    updateOutside(dt);
    if (ended) return;

    // Lamps and rocking chairs creak at each end of their swing, when they change direction.
    for (const light of lights) {
      if (light.kind !== "lamp") continue;
      const swingingRight = Math.cos((time / light.period) * Math.PI * 2 + light.phase) > 0;
      if (swingingRight === light.swingingRight) continue;
      light.swingingRight = swingingRight;
      const sound = hear(light.x, light.y);
      if (sound.distance < LIGHT_RANGE) playCreakAt(sound.volume, sound.pan, sound.muffled, "lamp");
    }
    for (const rocker of rockers) {
      const forward = Math.cos(time * 1.6 + rocker.phase) > 0;
      if (forward === rocker.forward) continue;
      rocker.forward = forward;
      const sound = hear(rocker.prop.x, rocker.prop.y);
      if (sound.distance < LIGHT_RANGE) {
        playCreakAt(sound.volume * 0.7, sound.pan, sound.muffled, "rocker");
      }
    }
    if (time > nextTick) {
      nextTick += 1;
      tock = !tock;
      for (const prop of world.props) {
        if (prop.kind !== "clock") continue;
        const sound = hear(prop.x, prop.y, 0.03);
        if (sound.distance < CLOCK_RANGE) playTick(sound.volume, sound.pan, sound.muffled, tock);
      }
    }

    if (time > nextRunBehind) {
      playRunningBehind();
      nextRunBehind = time + rand(45, 110);
    }

    // The flashlight's nerves are worse downstairs, and that's when the statue moves.
    const flickers = inBasement() ? 0.12 : 0.05;
    if (!reducedMotion && time > flickerUntil && Math.random() < dt * flickers) {
      flickerUntil = time + rand(0.3, 1.2);
    }
  }

  function draw() {
    const fadeIn = Math.min(1, (time - wokeAt) / fadeSeconds);
    let light = fadeIn;
    if (time < blackoutUntil) light = 0;
    else if (time < flickerUntil && Math.random() < 0.5) light *= rand(0.1, 0.45);
    flashlight = light;

    const sprites: Sprite[] = [];
    const viewLights: Lamp[] = [];
    const lightsOn = time < blackoutUntil ? 0 : fadeIn;
    for (const source of lights) {
      if (Math.hypot(source.x - player.x, source.y - player.y) > LIGHT_RANGE) continue;
      if (source.kind === "lamp") {
        const swing = Math.sin((time / source.period) * Math.PI * 2 + source.phase) * LAMP_SWING;
        sprites.push({ x: source.x + swing, y: source.y, texture: textures.lamp, scale: 1, lift: 0 });
        viewLights.push({
          x: source.x + swing * LAMP_LIGHT_SWING,
          y: source.y,
          light: LAMP_POWER * lightsOn * (0.92 + Math.random() * 0.08),
          lit: source.lit,
        });
      } else {
        viewLights.push({
          x: source.x,
          y: source.y,
          light: CANDLE_POWER * lightsOn * (0.75 + Math.random() * 0.25),
          lit: source.lit,
        });
      }
    }
    for (const prop of world.props) {
      if (Math.hypot(prop.x - player.x, prop.y - player.y) > LIGHT_RANGE + 4) continue;
      let x = prop.x;
      const texture = propTextures[prop.kind];
      if (prop.kind === "rocker") {
        const rocker = rockers.find((r) => r.prop === prop)!;
        x += Math.sin(time * 1.6 + rocker.phase) * ROCK_SWING;
      }
      sprites.push({
        x,
        y: prop.y,
        texture: prop.kind === "clock" ? textures.clock[tock ? 1 : 0] : texture,
        scale: 1,
        lift: 0,
        opacity: prop.kind === "web" ? WEB_OPACITY : 1,
      });
    }
    if (figure.visible) {
      sprites.push({ x: figure.x, y: figure.y, texture: textures.figure, scale: 1, lift: 0 });
    }
    if (inBasement()) {
      const { praying, plinth, reaching, lunging } = textures.statue;
      if (statue.awake) {
        sprites.push({ ...world.statueHome, texture: plinth, scale: 1, lift: 0 });
      }
      sprites.push({
        x: statue.x,
        y: statue.y,
        texture: !statue.awake ? praying : statue.pose === "lunging" ? lunging : reaching,
        scale: statue.awake ? STATUE_SCALE : 1,
        lift: statue.awake ? (STATUE_SCALE - 1) / 2 : 0, // feet on the ground
      });
      const frameNow = Math.floor(time * 10) % 2;
      for (const spider of spiders) {
        if (Math.hypot(spider.x - player.x, spider.y - player.y) > SPIDER_DRAW_RANGE) continue;
        sprites.push({
          x: spider.x,
          y: spider.y,
          texture: textures.spider[frameNow],
          scale: SPIDER_SCALE,
          lift: (SPIDER_SCALE - 1) / 2,
        });
      }
    }
    if (!outside) sprites.push(paleSprite());
    if (giant.active) {
      sprites.push({
        x: giant.x,
        y: giant.y,
        texture: textures.figure,
        scale: GIANT_SCALE,
        lift: (GIANT_SCALE - 1) / 2, // feet on the ground
        haze: GIANT_HAZE,
      });
    }

    const brightness = 0.35 + 0.65 * fadeIn;
    lookingAt = render(
      frame,
      world,
      {
        x: player.x,
        y: player.y,
        angle: player.angle,
        bob,
        light,
        ambient: (inBasement() ? BASEMENT_AMBIENT : AMBIENT) * fadeIn,
        outside: brightness,
        time,
        lamps: viewLights,
        fog: [FOG[0] * brightness, FOG[1] * brightness, FOG[2] * brightness],
        fogDensity: FOG_DENSITY,
      },
      textures,
      sprites,
    );
    ctx.putImageData(frame.image, 0, 0);

    const center = frame.center;
    let next: Focus | null = null;
    const journalAhead = paused || ended ? undefined : world.journals.find((book) => {
      const distance = Math.hypot(book.x - player.x, book.y - player.y);
      const turn = Math.atan2(book.y - player.y, book.x - player.x) - player.angle;
      return distance < REACH && offCenter(turn) < JOURNAL_ANGLE;
    });
    if (journalAhead) {
      next = { kind: "journal", key: journalAhead.key! };
    } else if (!paused && !ended && center.distance < REACH) {
      const painting = world.paintings.get(center.index);
      const door = world.doors.get(center.index);
      if (painting) next = { kind: "painting", key: painting };
      else if (door) next = { kind: "door", key: door };
      else if (world.stairs.has(center.index)) {
        next = { kind: "stairs", key: center.cell === STAIRS_UP ? "up" : "down" };
      }
      else if (center.cell === DOOR) next = { kind: "door", key: null };
      else if (center.cell === FOG_WALL) next = { kind: "fog" };
    }
    if (!sameFocus(next, focus)) {
      focus = next;
      events.onFocus(focus);
    }
  }

  const propTextures: Record<PropKind, Texture> = {
    table: textures.table,
    chair: textures.chair,
    rocker: textures.rocker,
    clock: textures.clock[0],
    journal: textures.journal,
    dresser: textures.dresser,
    bed: textures.bed,
    coatrack: textures.coatrack,
    boxes: textures.boxes,
    mannequin: textures.mannequin,
    vase: textures.vase,
    barrel: textures.barrel,
    web: textures.web,
  };

  let last = performance.now();
  let raf = requestAnimationFrame(function tick(now) {
    update(Math.max(0, Math.min(0.05, (now - last) / 1000)));
    last = now;
    draw();
    raf = requestAnimationFrame(tick);
  });

  function lockPointer() {
    void Promise.resolve(canvas.requestPointerLock()).catch(() => {});
  }

  function interact() {
    if (!focus || focus.kind === "fog" || paused || ended || performance.now() < holdUntil) return;
    if (focus.kind === "stairs") takeStairs(frame.center.index);
    else events.onInteract(focus);
  }

  function openDoor(key: string) {
    for (const [index, door] of world.doors) {
      if (door !== key) continue;
      world.doors.delete(index);
      if (world.stairs.has(index)) {
        world.cells[index] = STAIRS_DOWN;
        continue;
      }
      // Each leaf of a double door swings back against the side of the doorway nearest it.
      const leaf = world.cells[index];
      world.openDoors.set(index, { leaf, side: leaf === DOUBLE_DOOR_LEFT ? 1 : -1 });
      world.cells[index] = 0;
      // A door with the outside next to it is the way out.
      const x = index % world.width;
      const y = Math.floor(index / world.width);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isOutdoors(world, x + dx + 0.5, y + dy + 0.5))) {
        exitDoors.push(index);
      }
    }
    // Light can now spill through the doorway.
    lights.forEach((light) => (light.lit = lightSight(world, light)));
    playDoorOpen();
  }

  function onKeyDown(e: KeyboardEvent) {
    unlockAudio();
    if (ended) return;
    if (e.code === "KeyP" || e.code === "Escape") {
      events.onPauseKey();
      return;
    }
    if (paused) return;
    if (e.code === "KeyE") {
      e.preventDefault(); // or the E lands in the riddle box that opens
      interact();
      return;
    }
    if (!MOVE_KEYS.has(e.code)) return;
    e.preventDefault();
    keys.add(e.code);
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.code);
  }
  function onBlur() {
    keys.clear();
    walkTouch = null;
    lookTouch = null;
  }
  function onMouseMove(e: MouseEvent) {
    if (document.pointerLockElement === canvas && !paused) look += e.movementX * MOUSE_LOOK;
  }
  function onPointerDown(e: PointerEvent) {
    unlockAudio();
    if (paused || ended) return;
    if (e.pointerType === "mouse") {
      lockPointer();
      return;
    }
    // Touch: drag on the left half to walk, on the right half to look.
    canvas.setPointerCapture(e.pointerId);
    if (e.clientX < window.innerWidth / 2 && !walkTouch) {
      walkTouch = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY };
    } else if (!lookTouch) {
      lookTouch = { id: e.pointerId, x: e.clientX };
    }
  }
  function onPointerMove(e: PointerEvent) {
    if (walkTouch?.id === e.pointerId) {
      walkTouch.x = e.clientX;
      walkTouch.y = e.clientY;
    } else if (lookTouch?.id === e.pointerId) {
      look += (e.clientX - lookTouch.x) * TOUCH_LOOK;
      lookTouch.x = e.clientX;
    }
  }
  function onPointerUp(e: PointerEvent) {
    if (walkTouch?.id === e.pointerId) walkTouch = null;
    if (lookTouch?.id === e.pointerId) lookTouch = null;
  }
  function onResize() {
    frame = resize();
  }
  // Esc lets go of the mouse before any key event reaches the page, so this is how the game
  // finds out. Letting go of it for any other reason isn't the player asking to pause.
  function onPointerLockChange() {
    const locked = document.pointerLockElement === canvas;
    if (!locked && wasLocked && !releasing && !paused && !ended) {
      relock = true;
      events.onPauseKey();
    }
    wasLocked = locked;
    releasing = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", onResize);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return {
    stop() {
      cancelAnimationFrame(raf);
      if (!ended) ambience.stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    pause() {
      paused = true;
      onBlur();
      if (document.pointerLockElement === canvas) {
        relock = true;
        releasing = true;
        document.exitPointerLock();
      }
    },
    // Call from a click or key handler, so the browser lets the mouse be captured again.
    resume() {
      paused = false;
      last = performance.now();
      if (relock) {
        relock = false;
        lockPointer();
      }
    },
    interact,
    openDoor,
  };
}
