/**
 * Musical data for the Tetris Cascade BGM (Korobeiniki / Theme A).
 *
 * The song is described bar-by-bar, then expanded into a flat list of 16th-note
 * steps that the audio scheduler walks through. Keeping the arrangement at bar
 * resolution means the harmony, bass pattern and drum groove stay locked
 * together instead of drifting per-note.
 */

/** Note frequency definitions (Hz), equal temperament from A4 = 440. */
export const NOTE = {
  REST: 0,
  A2: 110.0,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  GS2: 103.83, // G#2
  GS3: 207.65, // G#3
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  GS4: 415.3, // G#4
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  GS5: 830.61,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
} as const;

export type ChordKey = 'E' | 'E7' | 'Am' | 'C' | 'Dm';

/**
 * Pad voicings sit between roughly 175 and 415 Hz: low enough to stay under
 * the melody, high enough that they do not pile onto the bass line.
 */
export const CHORDS: Record<ChordKey, readonly number[]> = {
  E: [246.94, 329.63, 415.3], // G#3 B3  G#4
  E7: [246.94, 329.63, 293.66], // G#3 B3  D4   (dominant 7)
  Am: [220.0, 261.63, 329.63], // A3  C4  E4
  C: [196.0, 261.63, 329.63], // G3  C4  E4
  Dm: [174.61, 220.0, 293.66], // F3  A3  D4
};

export type DrumHit = 'kick' | 'snare' | 'hat' | 'ohat' | 'tom' | 'crash';

export type BarStyle = 'march' | 'chorale';

export const STEPS_PER_BAR = 8;

export interface ThemeStep {
  /** Melody pitch, 0 = rest. */
  lead: number;
  /** Melody length in 16th notes. */
  leadDur: number;
  /** Double the melody an octave down with a soft reed voice. */
  octave: boolean;
  /** Bass pitch, 0 = rest. */
  bass: number;
  /** Bass length in 16th notes. */
  bassDur: number;
  /** Chord to (re)start at this step, null = keep the previous one running. */
  chord: ChordKey | null;
  /** Off-beat chord stab velocity, 0 = silent. */
  stab: number;
  /** Drum hits starting on this step, with velocity. */
  drums: DrumHit[];
  /** Style of the bar this step belongs to. */
  style: BarStyle;
}

type MelodyNote = readonly [step: number, note: number, dur: number];

interface Bar {
  /** [step offset, pitch, length in 16ths] */
  melody: readonly MelodyNote[];
  /** Alternating root / fifth for the bass line. */
  bass: readonly [number, number];
  chord: ChordKey;
  style?: BarStyle;
  /** Adds a snare/tom fill in the last beat. */
  fill?: boolean;
  /** Adds a crash on the downbeat. */
  crash?: boolean;
}

// Part A, phrase 1 (bars 1-8): E5 B4 C5 | D5 C5 B4 | A4 A4 C5 | E5 D5 C5
//                              B4 C5 | D5 E5 | C5 A4 | A4
const PHRASE_A1: readonly Bar[] = [
  { melody: [[0, NOTE.E5, 4], [4, NOTE.B4, 2], [6, NOTE.C5, 2]], bass: [NOTE.E3, NOTE.B2], chord: 'E' },
  { melody: [[0, NOTE.D5, 4], [4, NOTE.C5, 2], [6, NOTE.B4, 2]], bass: [NOTE.E3, NOTE.GS2], chord: 'E' },
  { melody: [[0, NOTE.A4, 4], [4, NOTE.A4, 2], [6, NOTE.C5, 2]], bass: [NOTE.A2, NOTE.E3], chord: 'Am' },
  { melody: [[0, NOTE.E5, 4], [4, NOTE.D5, 2], [6, NOTE.C5, 2]], bass: [NOTE.C3, NOTE.G3], chord: 'C' },
  { melody: [[0, NOTE.B4, 6], [6, NOTE.C5, 2]], bass: [NOTE.GS2, NOTE.E3], chord: 'E' },
  { melody: [[0, NOTE.D5, 4], [4, NOTE.E5, 4]], bass: [NOTE.GS2, NOTE.E3], chord: 'E' },
  { melody: [[0, NOTE.C5, 4], [4, NOTE.A4, 4]], bass: [NOTE.A2, NOTE.E3], chord: 'Am' },
  { melody: [[0, NOTE.A4, 4]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', fill: true },
];

// Part A, phrase 2 (bars 9-16)
const PHRASE_A2: readonly Bar[] = [
  { melody: [[0, NOTE.D5, 6], [6, NOTE.F5, 2]], bass: [NOTE.D3, NOTE.A3], chord: 'Dm' },
  { melody: [[0, NOTE.A5, 4], [4, NOTE.G5, 2], [6, NOTE.F5, 2]], bass: [NOTE.D3, NOTE.A3], chord: 'Dm' },
  { melody: [[0, NOTE.E5, 6], [6, NOTE.C5, 2]], bass: [NOTE.C3, NOTE.G3], chord: 'C' },
  { melody: [[0, NOTE.E5, 4], [4, NOTE.D5, 2], [6, NOTE.C5, 2]], bass: [NOTE.C3, NOTE.G3], chord: 'C' },
  { melody: [[0, NOTE.B4, 6], [6, NOTE.C5, 2]], bass: [NOTE.GS2, NOTE.E3], chord: 'E' },
  { melody: [[0, NOTE.D5, 4], [4, NOTE.E5, 4]], bass: [NOTE.GS2, NOTE.E3], chord: 'E' },
  { melody: [[0, NOTE.C5, 4], [4, NOTE.A4, 4]], bass: [NOTE.A2, NOTE.E3], chord: 'Am' },
  { melody: [[0, NOTE.A4, 4]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', fill: true },
];

// Part C, the chorale (bars 17-32). Long half notes, E7 where the melody's D
// turns the dominant into a V7 chord that pulls back to A minor.
const CHORALE: readonly Bar[] = [
  { melody: [[0, NOTE.E5, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale', crash: true },
  { melody: [[0, NOTE.C5, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.D5, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E7', style: 'chorale' },
  { melody: [[0, NOTE.B4, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E7', style: 'chorale' },
  { melody: [[0, NOTE.C5, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.A4, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.GS4, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E', style: 'chorale' },
  { melody: [[0, NOTE.B4, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E', style: 'chorale' },
  { melody: [[0, NOTE.E5, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.C5, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.D5, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E7', style: 'chorale' },
  { melody: [[0, NOTE.B4, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E7', style: 'chorale' },
  { melody: [[0, NOTE.C5, 4], [4, NOTE.E5, 4]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.A5, 8]], bass: [NOTE.A2, NOTE.E3], chord: 'Am', style: 'chorale' },
  { melody: [[0, NOTE.GS5, 8]], bass: [NOTE.GS2, NOTE.E3], chord: 'E', style: 'chorale' },
  { melody: [], bass: [NOTE.GS2, NOTE.E3], chord: 'E', style: 'chorale', fill: true },
];

// Off-beat stab velocities: fills the gaps between the on-beat melody notes.
const MARCH_STABS: readonly number[] = [0, 0.42, 0, 0.6, 0, 0.42, 0, 0.66];

/** Straight march groove: driving kick, backbeat snare, closed hats, open hat pickup. */
function marchDrums(bar: Bar, step: number): DrumHit[] {
  const hits: DrumHit[] = [];
  if (bar.crash && step === 0) hits.push('crash');
  switch (step) {
    case 0:
      hits.push('kick', 'hat');
      break;
    case 2:
      hits.push('snare', 'hat');
      break;
    case 3:
      hits.push('kick', 'hat');
      break;
    case 4:
      hits.push('kick', 'hat');
      break;
    case 6:
      hits.push('snare', 'hat');
      break;
    case 7:
      hits.push('ohat');
      if (bar.fill) hits.push('snare', 'tom');
      break;
    default:
      break;
  }
  return hits;
}

/** Half-time chorale groove so the long organ notes breathe. */
function choraleDrums(bar: Bar, step: number): DrumHit[] {
  const hits: DrumHit[] = [];
  if (bar.crash && step === 0) hits.push('crash');
  switch (step) {
    case 0:
      hits.push('kick', 'hat');
      break;
    case 4:
      hits.push('kick', 'snare', 'hat');
      break;
    case 7:
      hits.push('ohat');
      if (bar.fill) hits.push('snare', 'tom', 'tom');
      break;
    default:
      break;
  }
  return hits;
}

function expandBar(bar: Bar, out: ThemeStep[]): void {
  const style: BarStyle = bar.style ?? 'march';
  const base = out.length;

  for (let i = 0; i < STEPS_PER_BAR; i++) {
    out.push({
      lead: NOTE.REST,
      leadDur: 0,
      octave: false,
      bass: NOTE.REST,
      bassDur: 0,
      chord: null,
      stab: 0,
      drums: [],
      style,
    });
  }

  for (const [step, note, dur] of bar.melody) {
    const target = out[base + step];
    target.lead = note;
    target.leadDur = dur;
    // Long chorale notes get the octave-down reed doubling.
    target.octave = style === 'chorale' && dur >= 8;
  }

  const [root, fifth] = bar.bass;
  if (style === 'chorale') {
    out[base].bass = root;
    out[base].bassDur = 4;
    out[base + 4].bass = fifth;
    out[base + 4].bassDur = 4;
  } else {
    for (let beat = 0; beat < 4; beat++) {
      const step = base + beat * 2;
      out[step].bass = beat % 2 === 0 ? root : fifth;
      out[step].bassDur = 2;
    }
  }

  out[base].chord = bar.chord;

  for (let i = 0; i < STEPS_PER_BAR; i++) {
    const target = out[base + i];
    target.drums = style === 'chorale' ? choraleDrums(bar, i) : marchDrums(bar, i);
    if (style === 'march') {
      target.stab = MARCH_STABS[i];
    }
  }
}

/**
 * Full arrangement: Part A played twice, then the Part C chorale.
 * 32 bars = 256 sixteenth-note steps.
 */
function buildTheme(): ThemeStep[] {
  const steps: ThemeStep[] = [];
  for (const bar of [...PHRASE_A1, ...PHRASE_A2, ...PHRASE_A1, ...PHRASE_A2, ...CHORALE]) {
    expandBar(bar, steps);
  }
  return steps;
}

export const THEME_STEPS: readonly ThemeStep[] = buildTheme();
