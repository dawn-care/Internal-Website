// Every sound here is synthesized with the Web Audio API, so the house needs no audio files
// beyond the jumpscare sound.

type Audio = { ctx: AudioContext; out: GainNode; noise: AudioBuffer };

let audio: Audio | null = null;

function getAudio(): Audio {
  if (audio) return audio;
  const ctx = new AudioContext();
  const out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  audio = { ctx, out, noise };
  return audio;
}

// Browsers only allow sound after a user gesture, so call this from click and key handlers.
export function unlockAudio() {
  const { ctx } = getAudio();
  if (ctx.state === "suspended") void ctx.resume();
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function noiseSource(a: Audio, loop = false) {
  const source = a.ctx.createBufferSource();
  source.buffer = a.noise;
  source.loop = loop;
  return source;
}

function filter(a: Audio, type: BiquadFilterType, frequency: number, q = 1) {
  const node = a.ctx.createBiquadFilter();
  node.type = type;
  node.frequency.value = frequency;
  node.Q.value = q;
  return node;
}

// A gain node that swells to `peak` and dies away, for one-shot sounds starting at `t`.
function envelope(a: Audio, t: number, attack: number, peak: number, decay: number) {
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return gain;
}

function thump(a: Audio, dest: AudioNode, t: number, from: number, to: number, volume: number) {
  const osc = a.ctx.createOscillator();
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.12);
  osc.connect(envelope(a, t, 0.005, volume, 0.15)).connect(dest);
  osc.start(t);
  osc.stop(t + 0.25);
}

// A floorboard creak: a buzzy tone stuttered by a fast square wave (stick-slip friction).
function creak(a: Audio, dest: AudioNode, t: number, volume: number, pitch = rand(140, 260)) {
  const osc = a.ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(pitch, t);
  osc.frequency.linearRampToValueAtTime(pitch * rand(0.8, 1.25), t + 0.45);

  const stutter = a.ctx.createGain();
  stutter.gain.value = 0.5;
  const lfo = a.ctx.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = rand(22, 40);
  const depth = a.ctx.createGain();
  depth.gain.value = 0.5;
  lfo.connect(depth).connect(stutter.gain);

  osc
    .connect(stutter)
    .connect(filter(a, "bandpass", rand(700, 1200), 6))
    .connect(envelope(a, t, 0.1, volume, 0.35))
    .connect(dest);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.6);
  lfo.stop(t + 0.6);
}

function step(a: Audio, dest: AudioNode, t: number, volume: number) {
  // Heel: a soft low thump on the boards.
  thump(a, dest, t, rand(75, 95), 40, 0.5 * volume);

  // Scuff: a short burst of filtered noise, from a random spot so no two steps match.
  const scuff = noiseSource(a);
  scuff
    .connect(filter(a, "bandpass", rand(350, 700), 0.9))
    .connect(envelope(a, t, 0.004, 0.35 * volume, 0.09))
    .connect(dest);
  scuff.start(t, rand(0, 1.5));
  scuff.stop(t + 0.15);
}

export function playFootstep(pan: number, running: boolean) {
  const a = getAudio();
  const t = a.ctx.currentTime;
  const volume = running ? 1 : 0.7;
  const panner = a.ctx.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(a.out);
  step(a, panner, t, volume);
  if (Math.random() < 0.18) creak(a, panner, t + 0.04, 0.05 * volume);
}

// A sound source somewhere in the house: quieter with distance, panned toward it, and muffled
// when there's a wall in the way. Returns the node to connect the sound to.
function placed(a: Audio, volume: number, pan: number, muffled: boolean): AudioNode {
  const panner = a.ctx.createStereoPanner();
  panner.pan.value = Math.max(-1, Math.min(1, pan));
  panner.connect(a.out);
  const gain = a.ctx.createGain();
  gain.gain.value = volume;
  gain.connect(panner);
  if (!muffled) return gain;
  const wall = filter(a, "lowpass", 500);
  wall.connect(gain);
  return wall;
}

// Something creaking somewhere in the house: the chain of a swinging lamp (high and thin) or
// a rocking chair (low and woody).
export function playCreakAt(volume: number, pan: number, muffled: boolean, kind: "lamp" | "rocker") {
  if (volume < 0.01) return;
  const a = getAudio();
  const pitch = kind === "lamp" ? rand(330, 480) : rand(150, 210);
  creak(a, placed(a, volume, pan, muffled), a.ctx.currentTime, 0.12, pitch);
}

// One swing of a grandfather clock's pendulum.
export function playTick(volume: number, pan: number, muffled: boolean, tock: boolean) {
  if (volume < 0.01) return;
  const a = getAudio();
  const t = a.ctx.currentTime;
  const dest = placed(a, volume, pan, muffled);
  const click = a.ctx.createOscillator();
  click.type = "square";
  click.frequency.value = tock ? 1300 : 1700;
  click.connect(filter(a, "bandpass", tock ? 1300 : 1700, 6)).connect(envelope(a, t, 0.002, 0.12, 0.04)).connect(dest);
  click.start(t);
  click.stop(t + 0.08);
  thump(a, dest, t, tock ? 220 : 260, 120, 0.08);
}

// A footstep of something forty feet tall.
export function playGiantStep(volume: number, pan: number) {
  if (volume < 0.01) return;
  const a = getAudio();
  const t = a.ctx.currentTime;
  const dest = placed(a, volume, pan, false);
  const boom = a.ctx.createOscillator();
  boom.frequency.setValueAtTime(48, t);
  boom.frequency.exponentialRampToValueAtTime(22, t + 0.9);
  boom.connect(envelope(a, t, 0.01, 0.9, 1.1)).connect(dest);
  boom.start(t);
  boom.stop(t + 1.3);
  const rumble = noiseSource(a);
  rumble.connect(filter(a, "lowpass", 140)).connect(envelope(a, t, 0.02, 0.7, 1.2)).connect(dest);
  rumble.start(t, rand(0, 0.5));
  rumble.stop(t + 1.3);
}

// The way back in, slammed shut.
export function playDoorSlam() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  thump(a, a.out, t, 110, 40, 1);
  const crack = noiseSource(a);
  crack.connect(filter(a, "lowpass", 1800)).connect(envelope(a, t, 0.002, 0.6, 0.25)).connect(a.out);
  crack.start(t, rand(0, 1));
  crack.stop(t + 0.3);
  creak(a, a.out, t + 0.1, 0.08, 90);
}

// A falling hiss as the floating head dissolves in the light.
export function playFade() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  const hiss = noiseSource(a);
  const band = filter(a, "bandpass", 4000, 3);
  band.frequency.exponentialRampToValueAtTime(300, t + 1.2);
  hiss.connect(band).connect(envelope(a, t, 0.05, 0.3, 1.2)).connect(a.out);
  hiss.start(t, rand(0, 0.5));
  hiss.stop(t + 1.4);
}

// Everything swells, then nothing.
export function playEnding() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  const swell = a.ctx.createGain();
  swell.gain.setValueAtTime(0.0001, t);
  swell.gain.exponentialRampToValueAtTime(0.5, t + 2.5);
  swell.gain.setValueAtTime(0.5, t + 2.5);
  swell.gain.exponentialRampToValueAtTime(0.0001, t + 2.7);
  swell.connect(a.out);
  const wash = noiseSource(a);
  wash.connect(filter(a, "lowpass", 600)).connect(swell);
  wash.start(t, rand(0, 0.5));
  wash.stop(t + 2.8);
  for (const frequency of [36.7, 38.9, 55, 77.8]) {
    const osc = a.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequency;
    osc.connect(filter(a, "lowpass", 300)).connect(swell);
    osc.start(t);
    osc.stop(t + 2.8);
  }
}

// Someone running up behind you, getting closer, then nothing.
export function playRunningBehind() {
  const a = getAudio();
  const start = a.ctx.currentTime + 0.05;
  const steps = 7 + Math.floor(Math.random() * 4);
  const panner = a.ctx.createStereoPanner();
  panner.pan.value = rand(-0.3, 0.3);
  panner.connect(a.out);
  const near = filter(a, "lowpass", 400);
  near.frequency.setValueAtTime(400, start);
  near.frequency.exponentialRampToValueAtTime(2500, start + steps * 0.22);
  near.connect(panner);
  for (let i = 0; i < steps; i++) {
    const closer = (i + 1) / steps;
    step(a, near, start + i * 0.22 + rand(-0.02, 0.02), 0.15 + 0.85 * closer * closer);
  }
}

// One rasping breath through a narrowed throat: noise that rattles, with a thin whistle.
function rasp(
  a: Audio,
  dest: AudioNode,
  t: number,
  pitch: number,
  duration: number,
  rattle: number,
) {
  const breath = noiseSource(a);
  const stutter = a.ctx.createGain();
  stutter.gain.value = 0.6;
  const lfo = a.ctx.createOscillator();
  lfo.type = "square";
  lfo.frequency.value = rattle;
  const depth = a.ctx.createGain();
  depth.gain.value = 0.4;
  lfo.connect(depth).connect(stutter.gain);
  const swell = a.ctx.createGain();
  swell.gain.setValueAtTime(0.0001, t);
  swell.gain.linearRampToValueAtTime(0.6, t + duration * 0.4);
  swell.gain.linearRampToValueAtTime(0.0001, t + duration);
  breath.connect(filter(a, "bandpass", pitch, 4)).connect(stutter).connect(swell).connect(dest);

  const whistle = a.ctx.createOscillator();
  whistle.type = "triangle";
  whistle.frequency.setValueAtTime(pitch * 0.35, t);
  whistle.frequency.linearRampToValueAtTime(pitch * 0.4, t + duration);
  const whistleGain = a.ctx.createGain();
  whistleGain.gain.value = 0.05;
  whistle.connect(whistleGain).connect(swell);

  breath.start(t, rand(0, 0.5));
  lfo.start(t);
  whistle.start(t);
  for (const source of [breath, lfo, whistle]) source.stop(t + duration + 0.05);
}

export type Wheeze = {
  // Where the head is relative to you; `chasing` makes it breathe faster.
  update(volume: number, pan: number, muffled: boolean, chasing: boolean): void;
  stop(): void;
};

// The floating head's breathing, for as long as it exists.
export function startWheeze(): Wheeze {
  const a = getAudio();
  const panner = a.ctx.createStereoPanner();
  panner.connect(a.out);
  const level = a.ctx.createGain();
  level.gain.value = 0;
  level.connect(panner);
  const wall = filter(a, "lowpass", 8000);
  wall.connect(level);
  let chasing = false;
  let timer = 0;

  const breathe = () => {
    const pace = chasing ? 0.6 : 1;
    const t = a.ctx.currentTime + 0.05;
    rasp(a, wall, t, 1050, 1.1 * pace, 26);
    rasp(a, wall, t + 1.35 * pace, 600, 1.4 * pace, 17);
    timer = window.setTimeout(breathe, (3200 + rand(-300, 300)) * pace);
  };
  breathe();

  return {
    update(volume, pan, muffled, isChasing) {
      const now = a.ctx.currentTime;
      level.gain.setTargetAtTime(volume, now, 0.1);
      panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.1);
      wall.frequency.setTargetAtTime(muffled ? 450 : 8000, now, 0.2);
      chasing = isChasing;
    },
    stop() {
      clearTimeout(timer);
      level.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.2);
    },
  };
}

// A heavy door swinging open on old hinges.
export function playDoorOpen() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  thump(a, a.out, t, 140, 70, 0.5);
  creak(a, a.out, t + 0.15, 0.18, 120);
  creak(a, a.out, t + 0.55, 0.15, 100);
  creak(a, a.out, t + 0.95, 0.1, 85);
}

export function playWrongAnswer() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  thump(a, a.out, t, 70, 35, 0.4);
  whisper(a, a.out, t + 0.1);
}

// A soft, sad chord as a memory comes back.
export function playMemory() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  const swell = a.ctx.createGain();
  swell.gain.setValueAtTime(0.0001, t);
  swell.gain.exponentialRampToValueAtTime(0.07, t + 1);
  swell.gain.exponentialRampToValueAtTime(0.0001, t + 4);
  swell.connect(a.out);
  const soft = filter(a, "lowpass", 900);
  soft.connect(swell);
  for (const frequency of [196, 233.1, 293.7]) {
    const osc = a.ctx.createOscillator();
    osc.frequency.value = frequency;
    osc.connect(soft);
    osc.start(t);
    osc.stop(t + 4.1);
  }
}

function knock(a: Audio, dest: AudioNode, t: number) {
  thump(a, dest, t, 120, 60, 0.4);
  const hit = noiseSource(a);
  hit.connect(filter(a, "bandpass", 260, 2)).connect(envelope(a, t, 0.002, 0.3, 0.06)).connect(dest);
  hit.start(t, rand(0, 1.5));
  hit.stop(t + 0.1);
}

function whisper(a: Audio, dest: AudioNode, t: number) {
  const breath = noiseSource(a);
  const band = filter(a, "bandpass", 1800, 12);
  band.frequency.setValueAtTime(1800, t);
  band.frequency.linearRampToValueAtTime(3200, t + 0.7);
  band.frequency.linearRampToValueAtTime(2200, t + 1.6);
  breath.connect(band).connect(envelope(a, t, 0.5, 0.08, 1.2)).connect(dest);
  breath.start(t, rand(0, 0.3));
  breath.stop(t + 1.8);
}

// Something elsewhere in the house: muffled, off to one side.
function distantSound(a: Audio, dest: AudioNode) {
  const t = a.ctx.currentTime;
  const panner = a.ctx.createStereoPanner();
  panner.pan.value = rand(-0.9, 0.9);
  panner.connect(dest);
  const far = filter(a, "lowpass", 900);
  far.connect(panner);

  const kind = Math.floor(Math.random() * 4);
  if (kind === 0) {
    creak(a, far, t, 0.12);
    creak(a, far, t + rand(0.4, 0.8), 0.09);
  } else if (kind === 1) {
    const knocks = 2 + Math.floor(Math.random() * 3);
    let at = t;
    for (let i = 0; i < knocks; i++) {
      knock(a, far, at);
      at += rand(0.28, 0.45);
    }
  } else if (kind === 2) {
    whisper(a, panner, t);
  } else {
    // The whole house groaning as it settles.
    const groan = filter(a, "lowpass", 300);
    groan.connect(far);
    creak(a, groan, t, 0.3, rand(45, 70));
    creak(a, groan, t + 0.4, 0.25, rand(40, 60));
  }
}

export type Ambience = {
  setOutside(outside: boolean): void; // wind instead of the house's own noises
  stop(): void;
};

// A low, uneasy drone, room tone and the odd distant noise.
export function startAmbience(): Ambience {
  const a = getAudio();
  const t = a.ctx.currentTime;
  const bus = a.ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(1, t + 4);
  bus.connect(a.out);
  const sources: AudioScheduledSourceNode[] = [];

  // Low tones a semitone apart grind against each other, with two slightly detuned so the
  // drone slowly throbs.
  const drone = a.ctx.createGain();
  drone.gain.value = 0.12;
  const droneFilter = filter(a, "lowpass", 140);
  droneFilter.connect(drone).connect(bus);
  for (const frequency of [41.2, 41.7, 43.65, 61.7]) {
    const osc = a.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    osc.connect(droneFilter);
    sources.push(osc);
  }

  // Room tone: looped noise through a lowpass that slowly wanders, like wind in the walls.
  // Outside, it opens up into a real wind.
  const room = noiseSource(a, true);
  const roomFilter = filter(a, "lowpass", 200);
  const wander = a.ctx.createOscillator();
  wander.frequency.value = 0.05;
  const wanderDepth = a.ctx.createGain();
  wanderDepth.gain.value = 140;
  wander.connect(wanderDepth).connect(roomFilter.frequency);
  const roomGain = a.ctx.createGain();
  roomGain.gain.value = 0.05;
  room.connect(roomFilter).connect(roomGain).connect(bus);
  sources.push(room, wander);

  for (const source of sources) source.start(t);

  let outside = false;
  let timer = 0;
  const schedule = () => {
    timer = window.setTimeout(() => {
      if (!outside) distantSound(a, bus);
      schedule();
    }, rand(6000, 15000));
  };
  schedule();

  return {
    setOutside(isOutside) {
      if (isOutside === outside) return;
      outside = isOutside;
      const now = a.ctx.currentTime;
      roomGain.gain.setTargetAtTime(outside ? 0.22 : 0.05, now, 1.5);
      roomFilter.frequency.setTargetAtTime(outside ? 500 : 200, now, 1.5);
      wanderDepth.gain.setTargetAtTime(outside ? 350 : 140, now, 1.5);
    },
    stop() {
      clearTimeout(timer);
      const now = a.ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(0.0001, now, 0.3);
      for (const source of sources) source.stop(now + 1.5);
    },
  };
}

// A heartbeat that speeds up for `seconds`. Returns a function that silences it early.
export function startHeartbeat(seconds: number): () => void {
  const a = getAudio();
  const bus = a.ctx.createGain();
  bus.connect(a.out);
  const end = a.ctx.currentTime + seconds;
  let t = a.ctx.currentTime + 0.1;
  let interval = 1;
  while (t < end) {
    thump(a, bus, t, 60, 38, 0.7);
    thump(a, bus, t + 0.22, 55, 35, 0.45);
    t += interval;
    interval = Math.max(0.45, interval * 0.86);
  }
  return () => bus.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.05);
}

// A rising swell that cuts off, for when the figure vanishes.
export function playSting() {
  const a = getAudio();
  const t = a.ctx.currentTime;
  const swell = a.ctx.createGain();
  swell.gain.setValueAtTime(0.0001, t);
  swell.gain.exponentialRampToValueAtTime(0.5, t + 0.55);
  swell.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
  swell.connect(a.out);

  const rush = noiseSource(a);
  const band = filter(a, "bandpass", 300, 4);
  band.frequency.exponentialRampToValueAtTime(4000, t + 0.6);
  rush.connect(band).connect(swell);
  rush.start(t, rand(0, 1));
  rush.stop(t + 0.7);

  // A cluster of semitones, dissonant on purpose.
  const cluster = filter(a, "lowpass", 1200);
  const clusterGain = a.ctx.createGain();
  clusterGain.gain.value = 0.15;
  cluster.connect(clusterGain).connect(swell);
  for (const frequency of [233, 247, 262]) {
    const osc = a.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequency;
    osc.connect(cluster);
    osc.start(t);
    osc.stop(t + 0.7);
  }
}
