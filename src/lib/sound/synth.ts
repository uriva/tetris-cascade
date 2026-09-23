/**
 * Zero-dependency Web Audio API Sound & Music Engine for Tetris Cascade
 * Generates all retro sound effects and the iconic Tetris Theme A (Korobeiniki) procedurally.
 */

// Note frequency definitions (Hz)
const N = {
  REST: 0,
  A2: 110.00,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.00,
  GS2: 103.83, // G#2
  GS3: 207.65, // G#3
  A3: 220.00,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  GS4: 415.30,
  A4: 440.00,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  GS5: 830.61,
  A5: 880.00,
  B5: 987.77,
  C6: 1046.50,
};

// Full Korobeiniki Theme A (Melody, Bass, Rhythm) in 16th-note steps
interface MusicStep {
  lead: number;      // Lead frequency
  leadDur: number;   // Duration in 16th notes
  bass: number;      // Bass frequency
  bassDur: number;   // Duration in 16th notes
  perc?: 'hat' | 'snare';
}

// 64 16th-note steps = 4 measures of 4/4 (Section 1) + 64 steps (Section 2) = 128 steps total loop
function createKorobeinikiPattern(): MusicStep[] {
  const steps: MusicStep[] = [];

  const add = (lead: number, leadDur: number, bass: number, bassDur: number, perc?: 'hat' | 'snare') => {
    steps.push({ lead, leadDur, bass, bassDur, perc });
  };

  // Section 1: E5 - B4 - C5 - D5 - C5 - B4 - A4 - A4 - C5 - E5 - D5 - C5 - B4...
  // Bar 1
  add(N.E5, 4, N.E3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.B2, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.B4, 2, N.E3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.B2, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 2
  add(N.D5, 4, N.E3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.GS2, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.E3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.B4, 2, N.GS2, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 3
  add(N.A4, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.A4, 2, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 4
  add(N.E5, 4, N.C3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.G3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.D5, 2, N.C3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.G3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 5
  add(N.B4, 6, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 6
  add(N.D5, 4, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.E5, 4, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 7
  add(N.C5, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.A4, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 8
  add(N.A4, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Section 2: D5 - F5 - A5 - G5 - F5 - E5 - C5 - E5 - D5 - C5 - B4...
  // Bar 9
  add(N.D5, 6, N.D3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.A3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.D3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.F5, 2, N.A3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 10
  add(N.A5, 4, N.D3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.A3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.G5, 2, N.D3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.F5, 2, N.A3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 11
  add(N.E5, 6, N.C3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.G3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.C3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.G3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 12
  add(N.E5, 4, N.C3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.G3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.D5, 2, N.C3, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.G3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 13
  add(N.B4, 6, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.C5, 2, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 14
  add(N.D5, 4, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.E5, 4, N.GS2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 15
  add(N.C5, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.A4, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  // Bar 16
  add(N.A4, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 4, N.A2, 2, 'hat');
  add(N.REST, 0, N.REST, 0);
  add(N.REST, 0, N.E3, 2, 'snare');
  add(N.REST, 0, N.REST, 0);

  return steps;
}

const KOROBEINIKI_STEPS = createKorobeinikiPattern();

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxVolume = 0.7;
  private musicVolume = 0.45;
  private isSoundEnabled = true;
  private isMusicEnabled = true; // Enabled by default!

  // Precise Web Audio API lookahead scheduler state
  private isPlayingBGM = false;
  private currentStep = 0;
  private nextStepTime = 0;
  private schedulerTimerId: number | null = null;
  private bpm = 138;

  public initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.isMusicEnabled = enabled;
    if (!enabled) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
  }

  // --- Sound Effects ---

  public playMove(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(this.sfxVolume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  }

  public playRotate(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(this.sfxVolume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.065);
  }

  public playSoftDrop(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);

    gain.gain.setValueAtTime(this.sfxVolume * 0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  }

  public playHardDrop(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Sub bass punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(this.sfxVolume * 0.45, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);

    // Noise click impact
    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1000, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(this.sfxVolume * 0.25, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start();
  }

  public playLock(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(this.sfxVolume * 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.055);
  }

  public playHold(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [480, 640].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (i + 1) * 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + (i + 1) * 0.07);
    });
  }

  public playClear(lines: number): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (lines === 4) {
      this.playTetris();
      return;
    }

    const chordMap: Record<number, number[]> = {
      1: [523.25, 659.25],
      2: [523.25, 659.25, 783.99],
      3: [659.25, 783.99, 987.77, 1046.5],
    };

    const notes = chordMap[lines] || [523.25, 659.25];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(this.sfxVolume * 0.2, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.22);
    });
  }

  public playCascade(step: number): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const baseFrequencies = [
      [587.33, 739.99, 880.0],
      [739.99, 880.0, 1108.73],
      [880.0, 1108.73, 1318.51],
      [1046.5, 1318.51, 1567.98, 2093.0],
    ];

    const idx = Math.min(step - 1, baseFrequencies.length - 1);
    const notes = baseFrequencies[Math.max(0, idx)];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.26);
    });
  }

  public playTetris(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const fanfare = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.51];
    const now = ctx.currentTime;

    fanfare.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.38);
    });
  }

  public playLevelUp(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const notes = [440, 554.37, 659.25, 880, 1108.73];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.27);
    });
  }

  public playGameOver(): void {
    if (!this.isSoundEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    const notes = [587.33, 523.25, 466.16, 440, 392.0, 349.23, 293.66];
    const now = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.22);
    });
  }

  // --- Iconic Tetris Theme A (Korobeiniki) Lookahead Scheduler ---

  public startBGM(): void {
    if (this.isPlayingBGM) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.isPlayingBGM = true;
    this.currentStep = 0;
    this.nextStepTime = ctx.currentTime + 0.05;

    // Run lookahead scheduler every 25ms
    this.schedulerTimerId = window.setInterval(() => {
      this.scheduleLoop();
    }, 25);
  }

  public stopBGM(): void {
    this.isPlayingBGM = false;
    if (this.schedulerTimerId !== null) {
      clearInterval(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }
  }

  private scheduleLoop(): void {
    if (!this.isPlayingBGM || !this.isMusicEnabled || !this.ctx) return;

    const scheduleAheadTime = 0.15; // Schedule 150ms ahead
    const secondsPer16th = 60.0 / (this.bpm * 4.0); // 16th note duration

    while (this.nextStepTime < this.ctx.currentTime + scheduleAheadTime) {
      const step = KOROBEINIKI_STEPS[this.currentStep % KOROBEINIKI_STEPS.length];
      this.playStepNotes(step, this.nextStepTime, secondsPer16th);

      this.nextStepTime += secondsPer16th;
      this.currentStep++;
    }
  }

  private playStepNotes(step: MusicStep, time: number, secondsPer16th: number): void {
    if (!this.ctx) return;

    // 1. Lead Melody Note (Rich square wave with soft filter)
    if (step.lead > 0 && step.leadDur > 0) {
      const dur = step.leadDur * secondsPer16th * 0.88; // Slight staccato spacing
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(step.lead, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, time);

      gain.gain.setValueAtTime(this.musicVolume * 0.16, time);
      gain.gain.exponentialRampToValueAtTime(this.musicVolume * 0.12, time + dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + dur + 0.02);
    }

    // 2. Bass Note (Warm triangle/sawtooth punch)
    if (step.bass > 0 && step.bassDur > 0) {
      const dur = step.bassDur * secondsPer16th * 0.82;
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();

      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(step.bass, time);

      bGain.gain.setValueAtTime(this.musicVolume * 0.22, time);
      bGain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      bOsc.connect(bGain);
      bGain.connect(this.ctx.destination);

      bOsc.start(time);
      bOsc.stop(time + dur + 0.02);
    }

    // 3. Chiptune Percussion (Hi-hat / Snare)
    if (step.perc) {
      this.playPercussion(step.perc, time);
    }
  }

  private playPercussion(type: 'hat' | 'snare', time: number): void {
    if (!this.ctx) return;

    if (type === 'hat') {
      // Metallic noise click
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.02), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 200);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.musicVolume * 0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(time);
    } else if (type === 'snare') {
      // 8-bit snare punch
      const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.05), this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 400);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.musicVolume * 0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(time);
    }
  }
}

export const sound = new SoundEngine();
