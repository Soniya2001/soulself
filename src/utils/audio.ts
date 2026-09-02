// Pure Web Audio API gentle sound effects and ambient soundscape

class AudioManager {
  private ctx: AudioContext | null = null;
  private isAmbientPlaying = false;
  private ambientGain: GainNode | null = null;
  private ambientInterval: any = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Soft page turn sound
  playPageTurn() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {
      // Ignore audio errors if browser blocks autoplay
    }
  }

  // Soft sparkle / sticker placement chime
  playSparkleChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const freqs = [880, 1174.66, 1318.51, 1760]; // A5, D6, E6, A6
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.04);

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.04 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + idx * 0.04);
        osc.stop(this.ctx.currentTime + idx * 0.04 + 0.36);
      });
    } catch (e) {}
  }

  // Peaceful save chime (gentle harp chord)
  playSaveChime() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.06);

        gain.gain.setValueAtTime(0.05, this.ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + i * 0.06 + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + i * 0.06);
        osc.stop(this.ctx.currentTime + i * 0.06 + 0.65);
      });
    } catch (e) {}
  }

  // Gentle tap / undo / delete sound
  playGentleTap() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {}
  }

  // Toggle ambient peaceful meditative soundscape (soft low sine warm pad)
  toggleAmbient(enabled?: boolean): boolean {
    try {
      this.initContext();
      if (!this.ctx) return false;

      const shouldPlay = enabled !== undefined ? enabled : !this.isAmbientPlaying;
      if (shouldPlay && !this.isAmbientPlaying) {
        this.isAmbientPlaying = true;
        this.startWarmPad();
      } else if (!shouldPlay && this.isAmbientPlaying) {
        this.isAmbientPlaying = false;
        this.stopWarmPad();
      }
      return this.isAmbientPlaying;
    } catch (e) {
      return false;
    }
  }

  private startWarmPad() {
    if (!this.ctx) return;
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 2);
    this.ambientGain.connect(this.ctx.destination);

    const chords = [
      [261.63, 329.63, 392.0], // C major
      [220.0, 261.63, 329.63], // A minor
      [174.61, 220.0, 261.63], // F major
      [196.0, 246.94, 293.66], // G major
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (!this.ctx || !this.isAmbientPlaying || !this.ambientGain) return;
      const currentNotes = chords[chordIdx % chords.length];
      chordIdx++;

      currentNotes.forEach((f) => {
        if (!this.ctx || !this.ambientGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, this.ctx.currentTime);

        g.gain.setValueAtTime(0.001, this.ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 2);
        g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 5.5);

        osc.connect(g);
        g.connect(this.ambientGain);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 5.6);
      });
    };

    playChord();
    this.ambientInterval = setInterval(playChord, 5000);
  }

  private stopWarmPad() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1);
      setTimeout(() => {
        if (this.ambientGain) {
          this.ambientGain.disconnect();
          this.ambientGain = null;
        }
      }, 1000);
    }
  }

  getIsAmbientPlaying() {
    return this.isAmbientPlaying;
  }
}

export const audioManager = new AudioManager();
