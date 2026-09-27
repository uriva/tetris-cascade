/**
 * Zero-dependency Web Audio API sound & music engine for Tetris Cascade.
 *
 * Signal flow:
 *
 *   voices ─┬─> sfxBus  ─┐
 *           └─> musicBus ┼─> rumble -> presence -> air -> softClip -> limiter -> out
 *   reverbSend -> convolver -> reverbReturn -> rumble
 *
 * The buses mean the music can be faded independently of the sound effects,
 * and the shared reverb is what glues the lead, pads and drums into one room
 * instead of a pile of separate beeps. All audio is synthesised at runtime:
 * there are no samples to fetch.
 */

import {
  CHORDS,
  THEME_STEPS,
  type BarStyle,
  type DrumHit,
  type ThemeStep,
} from './theme';
import {
  createImpulseResponse,
  createSoftClipCurve,
  playBass,
  playDrum,
  playLead,
  playPad,
  playStab,
  type VoiceBus,
} from './voices';

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.16;
const BPM = 144;

/** Per-section arrangement levels, so the tune builds instead of looping flat. */
const ARRANGEMENT: Record<BarStyle, { drums: number; lead: number; pad: number; stab: number }> = {
  march: { drums: 0.42, lead: 0.8, pad: 0.085, stab: 0.24 },
  chorale: { drums: 0.36, lead: 0.78, pad: 0.15, stab: 0 },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxVolume = 0.7;
  private musicVolume = 0.45;
  private isSoundEnabled = true;
  private isMusicEnabled = true; // Enabled by default!

  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;

  private isPlayingBGM = false;
  private currentStep = 0;
  private nextStepTime = 0;
  private schedulerTimerId: number | null = null;
  /** Chord the off-beat stabs should follow. */
  private activeChord: ThemeStep['chord'] = null;

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.buildGraph(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildGraph(ctx: AudioContext): void {
    // Rolls off inaudible sub rumble from the kick so the low mids stay clean.
    const rumble = ctx.createBiquadFilter();
    rumble.type = 'highpass';
    rumble.frequency.value = 38;
    rumble.Q.value = 0.7;

    // A couple of gentle shelves: the melody's harmonics live around 2-3 kHz and
    // the mix is noticeably nicer once there is some air on top.
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2600;
    presence.Q.value = 0.9;
    presence.gain.value = 2;

    const air = ctx.createBiquadFilter();
    air.type = 'highshelf';
    air.frequency.value = 7000;
    air.gain.value = 3.5;

    const softClip = ctx.createWaveShaper();
    softClip.curve = createSoftClipCurve(1.4);
    softClip.oversample = '2x';

    // Catches the peaks when the lead, pad and drums land on the same step.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.16;

    rumble.connect(presence);
    presence.connect(air);
    air.connect(softClip);
    softClip.connect(limiter);
    limiter.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = createImpulseResponse(ctx, 2.1, 2.7);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.5;
    convolver.connect(reverbReturn);
    reverbReturn.connect(rumble);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(rumble);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.isMusicEnabled ? this.musicVolume : 0;
    this.musicBus.connect(rumble);

    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(convolver);
  }

  private get musicVoiceBus(): VoiceBus | null {
    if (!this.ctx || !this.musicBus || !this.reverbSend) return null;
    return { ctx: this.ctx, dry: this.musicBus, send: this.reverbSend };
  }

  private get sfxVoiceBus(): VoiceBus | null {
    if (!this.ctx || !this.sfxBus) return null;
    // A single shared send keeps the effects in the same space as the music.
    return { ctx: this.ctx, dry: this.sfxBus, send: this.reverbSend ?? this.sfxBus };
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setTargetAtTime(enabled ? this.sfxVolume : 0, this.ctx.currentTime, 0.02);
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.isMusicEnabled = enabled;
    if (enabled) {
      this.startBGM();
    } else {
      this.stopBGM();
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxBus && this.ctx && this.isSoundEnabled) {
      this.sfxBus.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.02);
    }
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicBus && this.ctx && this.isMusicEnabled) {
      this.musicBus.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  // --- Sound Effects ---
  //
  // Everything is scheduled on the audio clock rather than with setTimeout, so
  // the arpeggios and fanfares stay in time even when the main thread is busy
  // rendering the board. Levels here are raw: the SFX bus applies the volume.

  private tone(
    freq: number,
    endFreq: number,
    duration: number,
    level: number,
    type: OscillatorType,
    sendAmount = 0,
    delay = 0,
  ): void {
    const bus = this.sfxVoiceBus;
    if (!bus || !this.isSoundEnabled) return;
    const start = bus.ctx.currentTime + delay;

    const osc = bus.ctx.createOscillator();
    const gain = bus.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + duration * 0.8);
    }
    gain.gain.setValueAtTime(Math.max(0.0002, level), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(bus.dry);

    const extras: AudioNode[] = [gain];
    if (sendAmount > 0) {
      const send = bus.ctx.createGain();
      send.gain.value = sendAmount;
      gain.connect(send);
      send.connect(bus.send);
      extras.push(send);
    }

    osc.start(start);
    osc.stop(start + duration + 0.02);
    osc.onended = (): void => {
      osc.disconnect();
      for (const node of extras) node.disconnect();
    };
  }

  /** Runs a scale or arpeggio with a fixed gap between notes. */
  private run(
    notes: readonly number[],
    spacing: number,
    duration: number,
    level: number,
    type: OscillatorType,
    sendAmount: number,
  ): void {
    notes.forEach((freq, index) => {
      this.tone(freq, freq, duration, level, type, sendAmount, index * spacing);
    });
  }

  public playMove(): void {
    this.tone(440, 320, 0.045, 0.16, 'triangle', 0.04);
  }

  public playRotate(): void {
    this.tone(380, 760, 0.06, 0.22, 'sine', 0.08);
  }

  public playSoftDrop(): void {
    this.tone(220, 200, 0.03, 0.1, 'triangle');
  }

  public playHardDrop(): void {
    // Sub thump plus a short filtered scrape for the impact.
    this.tone(170, 44, 0.14, 0.5, 'sine', 0.05);
    this.tone(900, 300, 0.05, 0.12, 'sawtooth', 0.1);
  }

  public playLock(): void {
    this.tone(260, 180, 0.05, 0.16, 'square', 0.05);
  }

  public playHold(): void {
    this.tone(480, 480, 0.05, 0.2, 'sine', 0.1);
    this.tone(640, 640, 0.07, 0.2, 'sine', 0.12, 0.04);
  }

  public playClear(lines: number): void {
    if (lines === 4) {
      this.playTetris();
      return;
    }

    const chordMap: Record<number, readonly number[]> = {
      1: [523.25, 659.25],
      2: [523.25, 659.25, 783.99],
      3: [659.25, 783.99, 987.77, 1046.5],
    };

    const notes = chordMap[lines] ?? [523.25, 659.25];
    const bus = this.sfxVoiceBus;
    // A low chord stab under the rising sparkle gives the clear some weight.
    if (bus) {
      playStab(bus, notes.map((freq) => freq / 2), bus.ctx.currentTime, 0.9, 0.3);
    }
    this.run(notes, 0.05, 0.22, 0.16, 'triangle', 0.22);
  }

  public playCascade(step: number): void {
    const baseFrequencies = [
      [587.33, 739.99, 880.0],
      [739.99, 880.0, 1108.73],
      [880.0, 1108.73, 1318.51],
      [1046.5, 1318.51, 1567.98, 2093.0],
    ];

    const index = Math.min(Math.max(step, 1) - 1, baseFrequencies.length - 1);
    this.run(baseFrequencies[index], 0.045, 0.24, 0.22, 'sine', 0.25);
  }

  public playTetris(): void {
    const fanfare = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    this.run(fanfare, 0.065, 0.3, 0.2, 'square', 0.3);
    const bus = this.sfxVoiceBus;
    // Bright major chord underneath the run for a bit of weight.
    if (bus) {
      playStab(bus, [523.25, 659.25, 783.99, 1046.5], bus.ctx.currentTime, 1, 0.2);
    }
  }

  public playLevelUp(): void {
    this.run([440, 554.37, 659.25, 880, 1108.73], 0.055, 0.24, 0.22, 'triangle', 0.28);
  }

  public playGameOver(): void {
    const notes = [587.33, 523.25, 466.16, 440, 392.0, 349.23, 293.66];
    this.run(notes, 0.095, 0.34, 0.18, 'sawtooth', 0.3);
    const bus = this.sfxVoiceBus;
    if (bus) {
      playStab(bus, [293.66, 349.23, 440], bus.ctx.currentTime + 0.1, 0.8, 0.16);
    }
  }

  // --- Iconic Tetris Theme A (Korobeiniki) Lookahead Scheduler ---

  public startBGM(): void {
    if (this.isPlayingBGM) return;
    const ctx = this.initContext();
    if (!ctx || !this.musicBus) return;

    this.musicBus.gain.setTargetAtTime(this.musicVolume, ctx.currentTime, 0.08);

    this.isPlayingBGM = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime + 0.08;
    this.activeChord = null;

    this.ensureScheduler();
  }

  public pauseBGM(): void {
    this.isPlayingBGM = false;
    this.clearScheduler();
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  public resumeBGM(): void {
    if (!this.isMusicEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (this.musicBus) {
      this.musicBus.gain.setTargetAtTime(this.musicVolume, ctx.currentTime, 0.05);
    }

    this.isPlayingBGM = true;
    this.nextStepTime = ctx.currentTime + 0.08;
    this.ensureScheduler();
  }

  public stopBGM(): void {
    this.isPlayingBGM = false;
    this.currentStep = 0;
    this.activeChord = null;
    this.clearScheduler();
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
  }

  private ensureScheduler(): void {
    if (this.schedulerTimerId !== null || typeof window === 'undefined') return;
    this.schedulerTimerId = window.setInterval(() => this.scheduleLoop(), LOOKAHEAD_MS);
  }

  private clearScheduler(): void {
    if (this.schedulerTimerId === null) return;
    clearInterval(this.schedulerTimerId);
    this.schedulerTimerId = null;
  }

  private scheduleLoop(): void {
    if (!this.isPlayingBGM || !this.isMusicEnabled || !this.ctx) return;

    const secondsPer16th = 60.0 / (BPM * 4.0);

    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      const step = THEME_STEPS[this.currentStep % THEME_STEPS.length];
      this.playStep(step, this.nextStepTime, secondsPer16th);
      this.nextStepTime += secondsPer16th;
      this.currentStep++;
    }
  }

  private playStep(step: ThemeStep, time: number, secondsPer16th: number): void {
    const bus = this.musicVoiceBus;
    if (!bus) return;

    const mix = ARRANGEMENT[step.style];
    const sixteenth = secondsPer16th;

    if (step.lead > 0 && step.leadDur > 0) {
      // 88% length plus a short release gives the melody a staccato bite while
      // still letting long chorale notes ring.
      const dur = step.leadDur * sixteenth * 0.88;
      playLead(bus, step.lead, time, dur, {
        level: mix.lead,
        brightness: step.style === 'chorale' ? 0.9 : 1.15,
        vibrato: step.style === 'chorale',
        octave: step.octave,
      });
    }

    if (step.bass > 0 && step.bassDur > 0) {
      playBass(bus, step.bass, time, step.bassDur * sixteenth * 0.86, 0.5);
    }

    // `chord` is only set on bar downbeats, so the pad is always restruck there
    // and rings for exactly one bar.
    if (step.chord) {
      this.activeChord = step.chord;
      const organ = step.style === 'chorale';
      playPad(bus, CHORDS[step.chord], time, 8 * sixteenth, {
        level: mix.pad,
        attack: organ ? 0.09 : 0.02,
        release: organ ? 0.3 : 0.14,
        brightness: organ ? 0.85 : 0.6,
      });
    }

    if (step.stab > 0 && this.activeChord) {
      playStab(bus, CHORDS[this.activeChord], time, step.stab, mix.stab);
    }

    for (const hit of step.drums) {
      this.playDrumHit(bus, hit, time, mix.drums);
    }
  }

  /** Small stereo offsets so the kit sits around the listener instead of on top. */
  private playDrumHit(bus: VoiceBus, hit: DrumHit, time: number, level: number): void {
    const pan = DRUM_PAN[hit] ?? 0;
    playDrum(bus, hit, time, level, pan);
  }
}

const DRUM_PAN: Record<DrumHit, number> = {
  kick: 0,
  snare: -0.08,
  hat: 0.18,
  ohat: -0.2,
  tom: 0.24,
  crash: -0.12,
};

export const sound = new SoundEngine();
