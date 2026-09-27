/**
 * Individual synth voices for the music engine.
 *
 * Every voice is a small, self-contained subtractive synth: a couple of
 * detuned oscillators (or filtered noise for percussion) through an amplitude
 * envelope, optionally through a resonant filter with its own envelope, then
 * split between a dry bus and a reverb send. Nothing is sampled, so there are
 * no assets to load and the whole engine stays dependency-free.
 */

import type { DrumHit } from './theme';

/** Destination pair handed to every voice. */
export interface VoiceBus {
  ctx: AudioContext;
  /** Where the dry signal goes (the music or SFX bus). */
  dry: AudioNode;
  /** Where the reverb send is tapped from. */
  send: AudioNode;
}

const MIN_GAIN = 0.0001;

/** Shared white-noise buffer, generated once per audio context. */
const noiseCache = new WeakMap<AudioContext, AudioBuffer>();

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;

  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  noiseCache.set(ctx, buffer);
  return buffer;
}

/**
 * Collects every node belonging to one voice so they are all scheduled from the
 * same start time and disconnected together once the voice has rung out.
 */
class Voice {
  private readonly sources: { source: AudioScheduledSourceNode; end: number }[] = [];
  private readonly nodes: AudioNode[] = [];

  public constructor(
    private readonly ctx: AudioContext,
    private readonly start: number,
  ) {}

  /** Schedules a source to run from the voice's start time for `duration`. */
  private schedule(source: AudioScheduledSourceNode, duration: number, offset = 0): AudioScheduledSourceNode {
    const end = this.start + duration;
    if (offset > 0) {
      // Only buffer sources accept a read offset.
      (source as AudioBufferSourceNode).start(this.start, offset);
    } else {
      source.start(this.start);
    }
    source.stop(end);
    this.sources.push({ source, end });
    return source;
  }

  public osc(type: OscillatorType, freq: number, duration: number, detune = 0): OscillatorNode {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = Math.max(0, freq);
    osc.detune.value = detune;
    this.schedule(osc, duration);
    this.nodes.push(osc);
    return osc;
  }

  public noise(duration: number): AudioBufferSourceNode {
    const source = this.ctx.createBufferSource();
    source.buffer = getNoiseBuffer(this.ctx);
    // Start at a random offset so repeated hits are not identical.
    const span = Math.max(0, source.buffer.duration - duration - 0.05);
    this.schedule(source, duration, Math.random() * span);
    this.nodes.push(source);
    return source;
  }

  public gain(value = 1): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.value = value;
    this.nodes.push(gain);
    return gain;
  }

  public filter(type: BiquadFilterType, frequency: number, q = 1): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    this.nodes.push(filter);
    return filter;
  }

  public pan(value: number): StereoPannerNode {
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = value;
    this.nodes.push(pan);
    return pan;
  }

  /** Sends the finished voice to the dry bus and, optionally, to the reverb. */
  public output(node: AudioNode, bus: VoiceBus, sendAmount: number): this {
    node.connect(bus.dry);
    if (sendAmount > 0) {
      const send = this.gain(sendAmount);
      node.connect(send);
      send.connect(bus.send);
    }
    return this;
  }

  public dispose(): void {
    // Disconnect once the longest-running source has finished, otherwise a
    // short click transient would cut the note it belongs to.
    let tail: AudioScheduledSourceNode | undefined;
    let tailEnd = -Infinity;
    for (const part of this.sources) {
      if (part.end > tailEnd) {
        tail = part.source;
        tailEnd = part.end;
      }
    }
    if (!tail) return;
    tail.onended = (): void => {
      for (const part of this.sources) part.source.disconnect();
      for (const node of this.nodes) node.disconnect();
    };
  }
}

/**
 * Ramps a gain param through attack / decay / sustain, then releases it.
 * Returns the time the voice has fully died.
 */
function envelope(
  param: AudioParam,
  time: number,
  duration: number,
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
): number {
  const hold = Math.max(duration, 0.01);
  const a = Math.min(attack, hold * 0.5);
  const d = Math.min(decay, hold * 0.6);
  const releaseStart = time + hold;
  const releaseEnd = releaseStart + release;
  const ceiling = Math.max(MIN_GAIN * 2, peak);
  const sustainLevel = Math.max(MIN_GAIN, peak * sustain);

  param.cancelScheduledValues(time);
  param.setValueAtTime(MIN_GAIN, time);
  param.exponentialRampToValueAtTime(ceiling, time + a);
  param.exponentialRampToValueAtTime(sustainLevel, time + a + d);
  param.setValueAtTime(sustainLevel, releaseStart);
  param.exponentialRampToValueAtTime(MIN_GAIN, releaseEnd);
  return releaseEnd;
}

type Partial = readonly [type: OscillatorType, detune: number, level: number, ratio: number];

/**
 * Detuned oscillator stack. The slow beating between near-unison voices is what
 * makes a chiptune lead sound wide instead of thin.
 */
function stack(
  voice: Voice,
  freq: number,
  life: number,
  partials: readonly Partial[],
  pan: number,
  destination: AudioNode,
): OscillatorNode[] {
  const spread = voice.pan(pan);
  spread.connect(destination);

  return partials.map(([type, detune, level, ratio]) => {
    const gain = voice.gain(level);
    const osc = voice.osc(type, freq * ratio, life, detune);
    osc.connect(gain);
    gain.connect(spread);
    return osc;
  });
}

export interface LeadOptions {
  /** Overall level, 0..1. */
  level: number;
  /** Filter brightness multiplier; above 1 opens the lead up. */
  brightness: number;
  /** Adds a delayed vibrato, which long held notes need to avoid sounding dead. */
  vibrato: boolean;
  /** Adds a soft octave-down reed doubling underneath. */
  octave: boolean;
}

// Two squares a few cents apart give the hollow chiptune body and beat against
// each other; the saws add the harmonics that make it cut through the mix.
const LEAD_SQUARE_L: readonly Partial[] = [['square', -7, 0.46, 1]];
const LEAD_SQUARE_R: readonly Partial[] = [['square', 7, 0.46, 1]];
const LEAD_SAWS: readonly Partial[] = [
  ['sawtooth', 0, 0.32, 1],
  ['sawtooth', 11, 0.16, 2],
];
const LEAD_SUB: readonly Partial[] = [['sine', 0, 0.16, 0.5]];

/**
 * Melody voice: two squares and a saw a few cents apart through a filter
 * envelope that opens on the attack and settles back, plus a sine sub for body.
 */
export function playLead(
  bus: VoiceBus,
  freq: number,
  time: number,
  duration: number,
  options: LeadOptions,
): void {
  const { ctx } = bus;
  const pitch = Math.max(20, freq);
  const voice = new Voice(ctx, time);

  const amp = voice.gain(0);
  // Opens well above the fundamental on the attack, then settles back, so the
  // melody has both bite and body instead of sitting as a dull sine-ish tone.
  const tone = voice.filter('lowpass', Math.min(14000, Math.max(2600, pitch * 18 * options.brightness)), 0.8);
  tone.frequency.exponentialRampToValueAtTime(
    Math.min(11000, Math.max(1300, pitch * 7 * options.brightness)),
    time + Math.min(0.24, duration * 0.55),
  );
  tone.connect(amp);

  const release = Math.min(0.22, Math.max(0.05, duration * 0.5));
  const endTime = envelope(amp.gain, time, duration, options.level * 0.5, 0.012, 0.09, 0.72, release);
  const life = endTime - time + 0.02;

  // Split across the pan so the two detuned squares beat left against right.
  const partials = [
    ...stack(voice, pitch, life, LEAD_SQUARE_L, -0.2, tone),
    ...stack(voice, pitch, life, LEAD_SQUARE_R, 0.2, tone),
    ...stack(voice, pitch, life, LEAD_SAWS, -0.08, tone),
    ...stack(voice, pitch, life, LEAD_SUB, 0, amp),
  ];

  if (options.vibrato) {
    const lfo = voice.osc('sine', 5.4, life);
    const depth = voice.gain(0);
    depth.gain.setValueAtTime(0, time);
    depth.gain.setValueAtTime(0, time + Math.min(0.28, duration * 0.5));
    depth.gain.linearRampToValueAtTime(9, time + Math.min(0.7, duration));
    lfo.connect(depth);
    // Detune in cents, ramped in so the note starts straight then warms up.
    for (const osc of partials) depth.connect(osc.detune);
  }

  if (options.octave) {
    stack(voice, pitch, life, [['triangle', 0, 0.3, 0.5]], -0.06, amp);
  }

  voice.output(amp, bus, options.level * 0.22);
  voice.dispose();
}

/** Percussive tone with a fast pitch drop: kick, toms, snare body. */
function pitchDrop(
  voice: Voice,
  bus: VoiceBus,
  time: number,
  duration: number,
  startHz: number,
  endHz: number,
  peak: number,
  type: OscillatorType,
  pan: number,
): void {
  const osc = voice.osc(type, startHz, duration + 0.02);
  osc.frequency.exponentialRampToValueAtTime(endHz, time + duration * 0.55);

  const gain = voice.gain(0);
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, time + duration);

  const spread = voice.pan(pan);
  osc.connect(gain);
  gain.connect(spread);
  spread.connect(bus.dry);
}

/** Filtered noise burst: snare body, cymbals, attack transients. */
function noiseBurst(
  voice: Voice,
  bus: VoiceBus,
  time: number,
  duration: number,
  peak: number,
  filterType: BiquadFilterType,
  frequency: number,
  endFrequency: number,
  q: number,
  pan: number,
): void {
  const source = voice.noise(duration + 0.02);
  const filter = voice.filter(filterType, frequency, q);
  if (endFrequency !== frequency) {
    filter.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
  }

  const gain = voice.gain(0);
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(MIN_GAIN, time + duration);

  const spread = voice.pan(pan);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(spread);
  spread.connect(bus.dry);

  const send = voice.gain(peak * 0.5);
  spread.connect(send);
  send.connect(bus.send);
}

/**
 * Bass voice: a sine sub carrying the weight plus a filtered saw for
 * definition, and a short transient click so notes stay audible on laptop
 * speakers.
 */
export function playBass(
  bus: VoiceBus,
  freq: number,
  time: number,
  duration: number,
  level: number,
): void {
  const { ctx } = bus;
  const pitch = Math.max(20, freq);
  const voice = new Voice(ctx, time);

  const amp = voice.gain(0);
  const tone = voice.filter('lowpass', Math.min(2400, pitch * 9), 3.2);
  tone.frequency.exponentialRampToValueAtTime(
    Math.min(700, Math.max(120, pitch * 3.4)),
    time + duration * 0.7,
  );
  tone.connect(amp);

  const release = Math.min(0.14, Math.max(0.04, duration * 0.4));
  const endTime = envelope(amp.gain, time, duration, level * 0.44, 0.006, 0.07, 0.6, release);
  const life = endTime - time + 0.02;

  voice.osc('sine', pitch, life).connect(amp);

  const body = voice.gain(0.26);
  voice.osc('sawtooth', pitch, life).connect(body);
  body.connect(tone);

  const click = voice.gain(0);
  click.gain.setValueAtTime(level * 0.12, time);
  click.gain.exponentialRampToValueAtTime(MIN_GAIN, time + 0.05);
  voice.osc('triangle', pitch * 2, 0.06).connect(click);
  click.connect(amp);

  voice.output(amp, bus, level * 0.05);
  voice.dispose();
}

export interface PadOptions {
  level: number;
  /** Chorale pads swell slowly; stabs have a fast transient. */
  attack: number;
  release: number;
  /** 0 = dark and closed, 1 = open and bright. */
  brightness: number;
}

const PAD_PARTIALS: readonly Partial[] = [
  ['sawtooth', -8, 0.15, 1],
  ['sawtooth', 7, 0.15, 1],
  ['triangle', 0, 0.12, 1],
];

/** Sustained chord bed. Detuned saws plus a triangle give it an organ warmth. */
export function playPad(
  bus: VoiceBus,
  chord: readonly number[],
  time: number,
  duration: number,
  options: PadOptions,
): void {
  const { ctx } = bus;
  const voice = new Voice(ctx, time);

  const amp = voice.gain(0);
  const tone = voice.filter('lowpass', 1000 + 1400 * options.brightness, 0.7);
  tone.frequency.linearRampToValueAtTime(1400 + 2200 * options.brightness, time + duration * 0.6);
  tone.connect(amp);

  const endTime = envelope(
    amp.gain,
    time,
    duration,
    options.level,
    options.attack,
    Math.min(0.2, duration * 0.3),
    0.8,
    options.release,
  );
  const life = endTime - time + 0.02;

  const spread = Math.min(0.42, 0.14 + chord.length * 0.06);
  chord.forEach((freq, index) => {
    const position = chord.length > 1 ? (index / (chord.length - 1)) * 2 - 1 : 0;
    stack(voice, freq, life, PAD_PARTIALS, position * spread, tone);
  });

  voice.output(amp, bus, options.level * 0.4);
  voice.dispose();
}

/** Short filtered chord hit for the off-beat groove. */
export function playStab(
  bus: VoiceBus,
  chord: readonly number[],
  time: number,
  velocity: number,
  level: number,
): void {
  const { ctx } = bus;
  const duration = 0.1;
  const voice = new Voice(ctx, time);

  const amp = voice.gain(0);
  const tone = voice.filter('lowpass', 3200, 1.6);
  tone.frequency.exponentialRampToValueAtTime(1500, time + duration);
  tone.connect(amp);

  const endTime = envelope(amp.gain, time, duration, level * velocity * 0.5, 0.005, 0.06, 0.28, 0.07);
  const life = endTime - time + 0.02;

  const spread = Math.min(0.4, 0.12 + chord.length * 0.05);
  const partials: readonly Partial[] = [
    ['square', 0, 0.26, 1],
    ['sawtooth', 8, 0.16, 1],
  ];
  chord.forEach((freq, index) => {
    const position = chord.length > 1 ? (index / (chord.length - 1)) * 2 - 1 : 0;
    // Alternate sides so the stabs pump instead of stacking in the middle.
    const side = index % 2 === 0 ? 1 : -1;
    stack(voice, freq, life, partials, position * spread * side, tone);
  });

  voice.output(amp, bus, level * velocity * 0.3);
  voice.dispose();
}

interface DrumShape {
  duration: number;
  /** Peak level before the bus gain is applied. */
  peak: number;
}

const DRUM_SHAPES: Record<DrumHit, DrumShape> = {
  kick: { duration: 0.22, peak: 0.5 },
  snare: { duration: 0.16, peak: 0.44 },
  hat: { duration: 0.05, peak: 0.46 },
  ohat: { duration: 0.28, peak: 0.36 },
  tom: { duration: 0.24, peak: 0.44 },
  crash: { duration: 1.6, peak: 0.4 },
};

/** One percussion hit, panned slightly off-centre so the kit has width. */
export function playDrum(bus: VoiceBus, hit: DrumHit, time: number, level: number, pan = 0): void {
  const shape = DRUM_SHAPES[hit];
  const peak = shape.peak * level;
  const voice = new Voice(bus.ctx, time);

  switch (hit) {
    case 'kick':
      pitchDrop(voice, bus, time, shape.duration, 140, 44, peak, 'sine', pan);
      noiseBurst(voice, bus, time, 0.012, peak * 0.3, 'highpass', 2200, 2200, 0.7, pan);
      break;
    case 'snare':
      noiseBurst(voice, bus, time, shape.duration, peak * 0.75, 'bandpass', 1900, 1500, 0.8, pan);
      pitchDrop(voice, bus, time, 0.1, 210, 150, peak * 0.5, 'triangle', pan);
      break;
    case 'hat':
      noiseBurst(voice, bus, time, shape.duration, peak, 'highpass', 6200, 6200, 0.9, pan);
      break;
    case 'ohat':
      noiseBurst(voice, bus, time, shape.duration, peak, 'highpass', 5400, 5400, 0.9, pan);
      break;
    case 'tom':
      pitchDrop(voice, bus, time, shape.duration, 240, 110, peak, 'sine', pan);
      noiseBurst(voice, bus, time, 0.05, peak * 0.25, 'bandpass', 1200, 900, 1, pan);
      break;
    case 'crash':
      noiseBurst(voice, bus, time, shape.duration, peak, 'highpass', 4200, 3400, 0.6, pan);
      break;
    default:
      break;
  }

  voice.dispose();
}

/**
 * Procedural room impulse: exponentially decaying noise that gets darker as it
 * decays, plus a few early reflections so it reads as a space rather than a
 * wash.
 */
export function createImpulseResponse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const earlyTaps = [0.011, 0.019, 0.027, 0.041, 0.058];

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const progress = i / length;
      // Damping increases over time, so highs die before lows.
      const coefficient = 0.55 - 0.4 * progress;
      smooth += coefficient * (Math.random() * 2 - 1 - smooth);
      data[i] = smooth * Math.pow(1 - progress, decay);
    }
    for (let tap = 0; tap < earlyTaps.length; tap++) {
      const index = Math.floor(earlyTaps[tap] * ctx.sampleRate) + (channel === 1 ? 37 : 0);
      if (index < length) {
        data[index] += (tap % 2 === 0 ? 0.45 : -0.35) / (tap + 1);
      }
    }
  }

  return impulse;
}

/** Soft saturation curve: adds harmonics and stops the mix from sounding brittle. */
export function createSoftClipCurve(amount: number): Float32Array<ArrayBuffer> {
  const samples = 2048;
  const scale = Math.tanh(amount);
  return Float32Array.from({ length: samples }, (_, i) => {
    const x = (i / (samples - 1)) * 2 - 1;
    return Math.tanh(x * amount) / scale;
  });
}
