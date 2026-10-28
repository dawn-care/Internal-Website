import {
  playCreakAt,
  playDoorOpen,
  playDoorSlam,
  playEnding,
  playFade,
  playFootstep,
  playGiantStep,
  playRunningBehind,
  playSting,
  playTick,
  startAmbience,
  startWheeze,
  unlockAudio,
} from "../audio";
import { imageByName } from "../media";
import {
  createWorld,
  findPath,
  isOutdoors,
  isSolid,
  isWall,
  lineOfSight,
  randomDestination,
  type Point,
  type World,
} from "./map";
import { createFrame, planeLength, render, type Frame, type Lamp, type Sprite } from "./raycaster";
import { HEAD_IMAGE } from "./story";
import { createTextures, DOOR, FOG, FOG_WALL } from "./textures";

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
const REACH = 1.6; // how close you need to be to a painting or door to use it
const AMBIENT = 0.045; // how much you can see outside the flashlight's beam

// The figure vanishes if you walk up to it. Stare at it from afar for too long and it doesn't.
const VANISH_DISTANCE = 3.5;
const STARE_DISTANCE = 8; // beyond this it's too dark to see, so looking doesn't count
const STARE_SECONDS = 2.5;
const FIRST_FIGURE_SECONDS = 8;
const MIN_FIGURE_DISTANCE = 7;

// The floating head drifts slower than you walk. It chases you while it can see you (or hear
// you running nearby), searches where it last saw you, then gives up and wanders. Holding
// your flashlight on it makes it fade away, for a while.
const HEAD_WANDER_SPEED = 0.5;
const HEAD_CHASE_SPEED = 1.05;
const HEAD_SIGHT = 9;
const HEAD_HEARING = 4; // running this close gives you away, wall or not
const HEAD_SEARCH_SECONDS = 6;
const HEAD_CATCH = 0.5;
const HEAD_BEAM = 0.22; // radians either side of straight ahead that the flashlight covers
const HEAD_BEAM_RANGE = 7;
const HEAD_FADE_SECONDS = 2; // of steady light to make it disappear
const HEAD_RETURN_SECONDS = 2.5; // to fade back in, once out of the light
const CAUGHT_HOLD_MS = 3000;

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

const LAMP_POWER = 1.3;
const CANDLE_POWER = 0.5;
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
  | { kind: "fog"; key?: undefined };

export type GameEvents = {
  onJumpscare: (image: string | null) => void;
  onWalk: () => void; // the first time the player moves
  onFocus: (focus: Focus | null) => void;
  onInteract: (focus: Focus) => void;
  onEnding: () => void;
};

export type Game = {
  stop(): void;
  pause(): void; // freezes the house while a memory or riddle is open
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
  const headImage = imageByName(HEAD_IMAGE);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ambience = startAmbience();
  const wheeze = startWheeze();

  let frame: Frame = resize();
  const player = { x: world.spawn.x, y: world.spawn.y, angle: 0 };
  const figure = { x: 0, y: 0, visible: false, respawnAt: FIRST_FIGURE_SECONDS, stare: 0 };
  const head = {
    x: world.headHome.x,
    y: world.headHome.y,
    state: "wander" as "wander" | "chase" | "search",
    path: [] as Point[],
    lastSeen: { x: 0, y: 0 },
    searchUntil: 0,
    opacity: 1,
    goneUntil: 0, // while time is before this, it has faded away
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
  if (import.meta.env.DEV) Object.assign(window, { __house: { player, head, giant, world } });
  const keys = new Set<string>();
  let look = 0; // radians of mouse or touch turning since the last frame
  let walkTouch: { id: number; startX: number; startY: number; x: number; y: number } | null =
    null;
  let lookTouch: { id: number; x: number } | null = null;

  let time = 0;
  let wokeAt = 0; // when you last woke up, for the fade in
  let paused = false;
  let ended = false;
  let lockedBeforePause = false;
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
  let nextTick = 1;
  let tock = false;
  let outside = false;
  let exitDoor: number | null = null; // the door to the outside, while it's open
  let lookingAt: Sprite | null = null;
  let focus: Focus | null = null;

  function resize(): Frame {
    // A hidden or zero-size window gives 0 / 0; fall back to widescreen.
    const aspect = clamp(window.innerWidth / window.innerHeight || 16 / 9, 0.75, 2);
    canvas.width = Math.round(HEIGHT * aspect);
    canvas.height = HEIGHT;
    return createFrame(canvas.width, HEIGHT);
  }

  function tryMove(dx: number, dy: number) {
    const nx = player.x + dx;
    const edgeX = nx + Math.sign(dx) * RADIUS;
    if (!isSolid(world, edgeX, player.y - RADIUS) && !isSolid(world, edgeX, player.y + RADIUS)) {
      player.x = nx;
    }
    const ny = player.y + dy;
    const edgeY = ny + Math.sign(dy) * RADIUS;
    if (!isSolid(world, player.x - RADIUS, edgeY) && !isSolid(world, player.x + RADIUS, edgeY)) {
      player.y = ny;
    }
  }

  // How a sound at (x, y) reaches you: its volume, its stereo pan, and whether it's muffled.
  function hear(x: number, y: number, carry = 0.05) {
    const dx = x - player.x;
    const dy = y - player.y;
    const turn = Math.atan2(dy, dx) - player.angle;
    return {
      distance: Math.hypot(dx, dy),
      volume: 1 / (1 + carry * (dx * dx + dy * dy)),
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

  // Moves the head along its path. Returns false once it has arrived.
  function followPath(speed: number) {
    while (head.path.length > 0) {
      const next = head.path[0];
      const dx = next.x - head.x;
      const dy = next.y - head.y;
      const distance = Math.hypot(dx, dy);
      if (distance > speed) {
        head.x += (dx / distance) * speed;
        head.y += (dy / distance) * speed;
        return true;
      }
      head.x = next.x;
      head.y = next.y;
      speed -= distance;
      head.path.shift();
    }
    return false;
  }

  function sendHeadHome() {
    head.x = world.headHome.x;
    head.y = world.headHome.y;
    head.state = "wander";
    head.path = [];
  }

  function caught() {
    events.onJumpscare(headImage);
    holdUntil = performance.now() + CAUGHT_HOLD_MS;
    player.x = world.spawn.x;
    player.y = world.spawn.y;
    player.angle = 0;
    sendHeadHome();
    vanishFigure(rand(20, 35));
    wokeAt = time;
  }

  // The head comes back somewhere you can't see it, well away from you.
  function returnHead() {
    head.goneUntil = 0;
    head.opacity = 0;
    sendHeadHome();
    for (let attempt = 0; attempt < 12; attempt++) {
      const spot = randomDestination(world, world.headHome, 0, 40);
      if (
        spot &&
        Math.hypot(spot.x - player.x, spot.y - player.y) > 8 &&
        !lineOfSight(world, spot.x, spot.y, player.x, player.y)
      ) {
        head.x = spot.x;
        head.y = spot.y;
        return;
      }
    }
  }

  function updateHead(dt: number) {
    if (head.goneUntil > 0) {
      if (time > head.goneUntil) returnHead();
      return;
    }

    const distance = Math.hypot(player.x - head.x, player.y - head.y);
    const visible = lineOfSight(world, head.x, head.y, player.x, player.y);
    const seen = distance < HEAD_SIGHT && visible;
    const heard = running && distance < HEAD_HEARING;
    if (seen || heard) {
      head.state = "chase";
      head.lastSeen = { x: player.x, y: player.y };
      head.path = [];
    }

    // In the flashlight's beam it slows, and fades.
    const turn = Math.atan2(head.y - player.y, head.x - player.x) - player.angle;
    const inBeam =
      flashlight > 0.5 && visible && distance < HEAD_BEAM_RANGE && offCenter(turn) < HEAD_BEAM;
    if (inBeam) {
      head.opacity -= dt / HEAD_FADE_SECONDS;
      if (head.opacity <= 0) {
        head.goneUntil = time + rand(12, 20);
        playFade();
        return;
      }
    } else {
      head.opacity = Math.min(1, head.opacity + dt / HEAD_RETURN_SECONDS);
    }
    const slow = inBeam ? 0.4 : 1;

    if (head.state === "chase") {
      if (seen) {
        const step = Math.min(distance, HEAD_CHASE_SPEED * slow * dt);
        head.x += ((player.x - head.x) / distance) * step;
        head.y += ((player.y - head.y) / distance) * step;
      } else {
        if (head.path.length === 0) head.path = findPath(world, head, head.lastSeen);
        if (!followPath(HEAD_CHASE_SPEED * slow * dt)) {
          head.state = "search";
          head.searchUntil = time + HEAD_SEARCH_SECONDS;
        }
      }
    } else {
      const searching = head.state === "search";
      if (searching && time > head.searchUntil) head.state = "wander";
      if (!followPath(HEAD_WANDER_SPEED * slow * dt)) {
        const destination = searching
          ? randomDestination(world, head, 1, 3)
          : randomDestination(world, head, 3, 12);
        if (destination) head.path = findPath(world, head, destination);
      }
    }

    // Too faded to hurt you.
    if (head.opacity > 0.5 && Math.hypot(player.x - head.x, player.y - head.y) < HEAD_CATCH) {
      caught();
    }
  }

  // Puts the giant `distance` cells ahead of you, inside the fog.
  function placeGiantAhead(distance: number) {
    const top = world.height - 26;
    giant.x = clamp(player.x + Math.cos(player.angle) * distance, 2, world.width - 2);
    giant.y = clamp(player.y + Math.sin(player.angle) * distance, top, world.height - 2);
    if (!isOutdoors(world, giant.x, giant.y)) {
      giant.x = world.width / 2;
      giant.y = world.height - 6;
    }
  }

  function end() {
    ended = true;
    keys.clear();
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    ambience.stop();
    wheeze.stop();
    playEnding();
    events.onEnding();
  }

  function updateOutside(dt: number) {
    outside = isOutdoors(world, player.x, player.y);
    ambience.setOutside(outside);

    // Once you're out, the door slams behind you and won't open again.
    if (exitDoor !== null && outside) {
      const doorX = (exitDoor % world.width) + 0.5;
      const doorY = Math.floor(exitDoor / world.width) + 0.5;
      if (Math.hypot(player.x - doorX, player.y - doorY) > DOOR_SHUTS_AT) {
        world.cells[exitDoor] = DOOR;
        exitDoor = null;
        lights.forEach((light) => (light.lit = lightSight(world, light)));
        if (isOutdoors(world, head.x, head.y)) sendHeadHome();
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
    const speed = (hurrying ? RUN_SPEED : WALK_SPEED) * dt;
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

    updateHead(dt);
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

    if (!reducedMotion && time > flickerUntil && Math.random() < dt * 0.05) {
      flickerUntil = time + rand(0.3, 1.2);
    }
  }

  function draw() {
    const fadeIn = Math.min(1, (time - wokeAt) / FADE_IN_SECONDS);
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
      let texture = textures.table;
      if (prop.kind === "chair") texture = textures.chair;
      if (prop.kind === "clock") texture = textures.clock[tock ? 1 : 0];
      if (prop.kind === "rocker") {
        texture = textures.rocker;
        const rocker = rockers.find((r) => r.prop === prop)!;
        x += Math.sin(time * 1.6 + rocker.phase) * ROCK_SWING;
      }
      sprites.push({ x, y: prop.y, texture, scale: 1, lift: 0 });
    }
    if (figure.visible) {
      sprites.push({ x: figure.x, y: figure.y, texture: textures.figure, scale: 1, lift: 0 });
    }
    if (head.goneUntil === 0) {
      sprites.push({
        x: head.x,
        y: head.y,
        texture: textures.head,
        scale: 0.5,
        lift: 0.06 + Math.sin(time * 1.7) * 0.05,
        opacity: head.opacity,
      });
    }
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
        ambient: AMBIENT * fadeIn,
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

    if (!ended) {
      const sound = hear(head.x, head.y);
      const present = head.goneUntil === 0 ? head.opacity : 0;
      const chasing = head.state === "chase";
      wheeze.update(sound.volume * present * (chasing ? 1.4 : 1), sound.pan, sound.muffled, chasing);
    }

    const center = frame.center;
    let next: Focus | null = null;
    if (!paused && !ended && center.distance < REACH) {
      const painting = world.paintings.get(center.index);
      const door = world.doors.get(center.index);
      if (painting) next = { kind: "painting", key: painting };
      else if (door) next = { kind: "door", key: door };
      else if (center.cell === DOOR) next = { kind: "door", key: null };
      else if (center.cell === FOG_WALL) next = { kind: "fog" };
    }
    if (!sameFocus(next, focus)) {
      focus = next;
      events.onFocus(focus);
    }
  }

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
    if (focus && focus.kind !== "fog" && !paused && !ended) events.onInteract(focus);
  }

  function onKeyDown(e: KeyboardEvent) {
    unlockAudio();
    if (paused || ended) return;
    if (e.code === "KeyE") {
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

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  window.addEventListener("resize", onResize);
  document.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  return {
    stop() {
      cancelAnimationFrame(raf);
      if (!ended) {
        ambience.stop();
        wheeze.stop();
      }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    pause() {
      paused = true;
      onBlur();
      lockedBeforePause = document.pointerLockElement === canvas;
      if (lockedBeforePause) document.exitPointerLock();
    },
    // Call from a click or key handler, so the browser lets the mouse be captured again.
    resume() {
      paused = false;
      last = performance.now();
      if (lockedBeforePause) lockPointer();
    },
    interact,
    openDoor(key) {
      for (const [index, door] of world.doors) {
        if (door !== key) continue;
        world.doors.delete(index);
        world.cells[index] = 0;
        // A door with the outside next to it is the way out.
        const x = index % world.width;
        const y = Math.floor(index / world.width);
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isOutdoors(world, x + dx + 0.5, y + dy + 0.5))) {
          exitDoor = index;
        }
      }
      // Light can now spill through the doorway.
      lights.forEach((light) => (light.lit = lightSight(world, light)));
      playDoorOpen();
    },
  };
}
