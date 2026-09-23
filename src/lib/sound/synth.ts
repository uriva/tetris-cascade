/**
 * Zero-dependency Web Audio API Sound Engine for Tetris Cascade
 * Generates all chiptune and modern arcade synth effects procedurally.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxVolume = 0.7;
  private musicVolume = 0.4;
  private isSoundEnabled = true;
  private isMusicEnabled = false;
  private bgmIntervalId: number | null = null;
  private bgmStep = 0;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

    gain.gain.setValueAtTime(this.sfxVolume * 0.5, ctx.currentTime);
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
    noiseGain.gain.setValueAtTime(this.sfxVolume * 0.3, ctx.currentTime);
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
      1: [523.25, 659.25],          // C5, E5
      2: [523.25, 659.25, 783.99],   // C5, E5, G5
      3: [659.25, 783.99, 987.77, 1046.50], // E5, G5, B5, C6
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
      [587.33, 739.99, 880.00],         // D5, F#5, A5 (Cascade 1)
      [739.99, 880.00, 1108.73],        // F#5, A5, C#6 (Cascade 2)
      [880.00, 1108.73, 1318.51],       // A5, C#6, E6 (Cascade 3)
      [1046.50, 1318.51, 1567.98, 2093.00], // C6, E6, G6, C7 (Cascade 4+)
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

    // Glorious fanfare: C5, E5, G5, B5, C6
    const fanfare = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];
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

    const notes = [587.33, 523.25, 466.16, 440, 392.00, 349.23, 293.66];
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

  // --- Procedural Synthwave / Chiptune Background Music ---

  public startBGM(): void {
    if (this.bgmIntervalId !== null) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Classic Korobeiniki / Russian Dance inspired cyberpunk bassline
    // Tempo: ~135 BPM (step interval ~111ms for 16th notes)
    const bassline = [
      130.81, 0, 130.81, 0,  // C3
      116.54, 0, 116.54, 0,  // Bb2
      103.83, 0, 103.83, 0,  // Ab2
      98.00,  0, 98.00,  0,  // G2
    ];

    const melody = [
      659.25, 493.88, 523.25, 587.33, // E5, B4, C5, D5
      523.25, 493.88, 440.00, 0,      // C5, B4, A4
      440.00, 523.25, 659.25, 587.33, // A4, C5, E5, D5
      523.25, 493.88, 523.25, 587.33, // C5, B4, C5, D5
    ];

    const stepMs = 120;
    this.bgmStep = 0;

    this.bgmIntervalId = window.setInterval(() => {
      if (!this.isMusicEnabled || !this.ctx) return;

      const now = this.ctx.currentTime;
      const bFreq = bassline[this.bgmStep % bassline.length];
      const mFreq = melody[this.bgmStep % melody.length];

      // Bass note
      if (bFreq > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bFreq, now);

        bGain.gain.setValueAtTime(this.musicVolume * 0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        bOsc.connect(bGain);
        bGain.connect(this.ctx.destination);

        bOsc.start(now);
        bOsc.stop(now + 0.11);
      }

      // Melody note
      if (mFreq > 0) {
        const mOsc = this.ctx.createOscillator();
        const mGain = this.ctx.createGain();
        mOsc.type = 'triangle';
        mOsc.frequency.setValueAtTime(mFreq, now);

        mGain.gain.setValueAtTime(this.musicVolume * 0.15, now);
        mGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        mOsc.connect(mGain);
        mGain.connect(this.ctx.destination);

        mOsc.start(now);
        mOsc.stop(now + 0.19);
      }

      this.bgmStep++;
    }, stepMs);
  }

  public stopBGM(): void {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }
}

export const sound = new SoundEngine();
