import { AmbientSoundId, AmbientPreference } from "../types";
import {
  AMBIENT_SOUND_OPTIONS,
  DEFAULT_AMBIENT_PREFERENCE,
  AMBIENT_PREFERENCE_STORAGE_KEY,
} from "../data/ambientSounds";

export interface AmbientEngineState {
  isPlaying: boolean;
  activeSoundId: AmbientSoundId;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  isFading: boolean;
  isUsingLocalAsset: boolean;
  persistentPlayback: boolean;
}

type StateListener = (state: AmbientEngineState) => void;

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSoundId: AmbientSoundId = "piano-waterfall";
  private isPlaying = false;
  private isMuted = false;
  private volume = 0.35; // Default 35%
  private isFading = false;
  private isUsingLocalAsset = false;
  private persistentPlayback = false;

  // Track currently active audio nodes / intervals
  private currentSourceNodes: {
    audioElement?: HTMLAudioElement;
    elementSource?: MediaElementAudioSourceNode;
    oscillators?: OscillatorNode[];
    noiseNodes?: AudioNode[];
    gains?: GainNode[];
    intervals?: any[];
  } | null = null;

  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.loadSavedPreferences();
  }

  private loadSavedPreferences() {
    try {
      const saved = localStorage.getItem(AMBIENT_PREFERENCE_STORAGE_KEY);
      if (saved) {
        const parsed: AmbientPreference = JSON.parse(saved);
        if (parsed.soundId && AMBIENT_SOUND_OPTIONS.some((s) => s.id === parsed.soundId)) {
          this.activeSoundId = parsed.soundId;
        } else {
          this.activeSoundId = "piano-waterfall";
        }
        if (typeof parsed.volume === "number") {
          this.volume = Math.max(0, Math.min(1, parsed.volume));
        }
        if (typeof parsed.isMuted === "boolean") {
          this.isMuted = parsed.isMuted;
        }
        if (typeof parsed.persistentPlayback === "boolean") {
          this.persistentPlayback = parsed.persistentPlayback;
        }
      }
    } catch (e) {
      console.warn("Could not load ambient sound preferences from localStorage:", e);
    }
  }

  public savePreferences(rememberChoice: boolean) {
    try {
      if (rememberChoice) {
        const pref: AmbientPreference = {
          soundId: this.activeSoundId,
          volume: this.volume,
          isMuted: this.isMuted,
          rememberChoice: true,
          persistentPlayback: this.persistentPlayback,
        };
        localStorage.setItem(AMBIENT_PREFERENCE_STORAGE_KEY, JSON.stringify(pref));
      } else {
        localStorage.removeItem(AMBIENT_PREFERENCE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Could not save ambient sound preference:", e);
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): AmbientEngineState {
    return {
      isPlaying: this.isPlaying,
      activeSoundId: this.activeSoundId,
      volume: this.volume,
      isMuted: this.isMuted,
      isFading: this.isFading,
      isUsingLocalAsset: this.isUsingLocalAsset,
      persistentPlayback: this.persistentPlayback,
    };
  }

  public isPersistentPlayback(): boolean {
    return this.persistentPlayback;
  }

  public setPersistentPlayback(enabled: boolean) {
    this.persistentPlayback = enabled;
    this.savePreferences(true);
    this.notify();
  }

  private initContext(): AudioContext | null {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  // Create continuous pink noise buffer (Paul Kellet algorithm)
  private createPinkNoiseBuffer(ctx: AudioContext, durationSeconds: number = 6): AudioBuffer {
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let b0_L = 0, b1_L = 0, b2_L = 0, b3_L = 0, b4_L = 0, b5_L = 0, b6_L = 0;
    let b0_R = 0, b1_R = 0, b2_R = 0, b3_R = 0, b4_R = 0, b5_R = 0, b6_R = 0;

    for (let i = 0; i < bufferSize; i++) {
      const wL = Math.random() * 2 - 1;
      const wR = Math.random() * 2 - 1;

      b0_L = 0.99886 * b0_L + wL * 0.0555179;
      b1_L = 0.99332 * b1_L + wL * 0.0750759;
      b2_L = 0.96900 * b2_L + wL * 0.1538520;
      b3_L = 0.86650 * b3_L + wL * 0.3104856;
      b4_L = 0.55000 * b4_L + wL * 0.5329522;
      b5_L = -0.7616 * b5_L - wL * 0.0168980;
      left[i] = (b0_L + b1_L + b2_L + b3_L + b4_L + b5_L + b6_L + wL * 0.5362) * 0.08;
      b6_L = wL * 0.115926;

      b0_R = 0.99886 * b0_R + wR * 0.0555179;
      b1_R = 0.99332 * b1_R + wR * 0.0750759;
      b2_R = 0.96900 * b2_R + wR * 0.1538520;
      b3_R = 0.86650 * b3_R + wR * 0.3104856;
      b4_R = 0.55000 * b4_R + wR * 0.5329522;
      b5_R = -0.7616 * b5_R - wR * 0.0168980;
      right[i] = (b0_R + b1_R + b2_R + b3_R + b4_R + b5_R + b6_R + wR * 0.5362) * 0.08;
      b6_R = wR * 0.115926;
    }
    return buffer;
  }

  // Create continuous warm brown noise buffer
  private createBrownNoiseBuffer(ctx: AudioContext, durationSeconds: number = 6): AudioBuffer {
    const bufferSize = ctx.sampleRate * durationSeconds;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let lastOutL = 0.0;
    let lastOutR = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const wL = Math.random() * 2 - 1;
      const wR = Math.random() * 2 - 1;

      lastOutL = (lastOutL + 0.02 * wL) / 1.02;
      lastOutR = (lastOutR + 0.02 * wR) / 1.02;

      left[i] = lastOutL * 0.75;
      right[i] = lastOutR * 0.75;
    }
    return buffer;
  }

  /**
   * Start or crossfade to an ambient soundscape
   */
  public async playSound(soundId?: AmbientSoundId): Promise<void> {
    const targetSound = soundId || this.activeSoundId;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    // If already playing the same sound, do not restart
    if (this.isPlaying && this.activeSoundId === targetSound) {
      return;
    }

    this.isFading = true;
    this.notify();

    // 1. If a sound is currently playing, smoothly fade it out
    if (this.currentSourceNodes) {
      await this.fadeOutCurrentSource(1.0);
    }

    this.activeSoundId = targetSound;
    this.isPlaying = true;

    // 2. Lazy load the audio asset or use procedural synthesis
    const soundOpt = AMBIENT_SOUND_OPTIONS.find((s) => s.id === targetSound);
    const localPath = soundOpt?.audioPath;

    let startedWithLocal = false;
    if (localPath) {
      startedWithLocal = await this.tryStartLocalAudio(localPath);
    }

    if (!startedWithLocal) {
      this.isUsingLocalAsset = false;
      this.startProceduralSound(targetSound);
    } else {
      this.isUsingLocalAsset = true;
    }

    // 3. Smooth Fade-in (1.5s) to default 30-40% volume (0.35)
    const now = ctx.currentTime;
    const targetVolume = this.isMuted ? 0.0001 : Math.max(0.0001, this.volume);
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0.0001, now);
    this.masterGain.gain.exponentialRampToValueAtTime(targetVolume, now + 1.5);

    setTimeout(() => {
      this.isFading = false;
      this.notify();
    }, 1500);

    this.notify();
  }

  /**
   * Play from local MP3 file with seamless looping
   */
  private async tryStartLocalAudio(path: string): Promise<boolean> {
    if (!this.ctx || !this.masterGain) return false;

    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = path;
      audio.loop = true;
      audio.preload = "auto";
      audio.crossOrigin = "anonymous";

      const onCanPlay = () => {
        try {
          if (!this.ctx || !this.masterGain) {
            resolve(false);
            return;
          }
          const source = this.ctx.createMediaElementSource(audio);
          const channelGain = this.ctx.createGain();
          channelGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
          source.connect(channelGain);
          channelGain.connect(this.masterGain);

          audio
            .play()
            .then(() => {
              this.currentSourceNodes = {
                audioElement: audio,
                elementSource: source,
                gains: [channelGain],
              };
              resolve(true);
            })
            .catch(() => {
              resolve(false);
            });
        } catch (e) {
          resolve(false);
        }
      };

      const onError = () => {
        resolve(false);
      };

      audio.addEventListener("canplaythrough", onCanPlay, { once: true });
      audio.addEventListener("error", onError, { once: true });

      // Fallback timeout if asset doesn't load within 500ms
      setTimeout(() => {
        audio.removeEventListener("canplaythrough", onCanPlay);
        audio.removeEventListener("error", onError);
        resolve(false);
      }, 500);
    });
  }

  /**
   * Procedural Audio Synthesizer focused on Flowing Waterfall and Natural Water
   */
  private startProceduralSound(soundId: AmbientSoundId) {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;

    const sourceRecord: {
      oscillators: OscillatorNode[];
      noiseNodes: AudioNode[];
      gains: GainNode[];
      intervals: any[];
    } = {
      oscillators: [],
      noiseNodes: [],
      gains: [],
      intervals: [],
    };

    switch (soundId) {
      case "piano-waterfall": {
        // Relaxing Piano Music & Flowing Water Sounds (Soothing Relaxation style)
        // 1. Waterfall & Stream Water Bed
        const pinkBuffer = this.createPinkNoiseBuffer(ctx, 6);
        const brownBuffer = this.createBrownNoiseBuffer(ctx, 6);

        const pinkSource = ctx.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;

        const brownSource = ctx.createBufferSource();
        brownSource.buffer = brownBuffer;
        brownSource.loop = true;

        const waterFilter = ctx.createBiquadFilter();
        waterFilter.type = "lowpass";
        waterFilter.frequency.setValueAtTime(1200, ctx.currentTime);
        waterFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        const waterGain = ctx.createGain();
        waterGain.gain.setValueAtTime(0.45, ctx.currentTime);

        pinkSource.connect(waterFilter);
        brownSource.connect(waterFilter);
        waterFilter.connect(waterGain);
        waterGain.connect(this.masterGain);

        pinkSource.start();
        brownSource.start();

        sourceRecord.noiseNodes.push(pinkSource, brownSource);
        sourceRecord.gains.push(waterGain);

        // 2. Procedural Soothing Piano Chords (Slow contemplative arpeggios in C / G / Am / F)
        const chordPitches = [
          // C Major
          [130.81, 196.00, 261.63, 329.63, 392.00, 523.25],
          // G/B
          [123.47, 196.00, 293.66, 392.00, 493.88, 587.33],
          // A Minor
          [110.00, 164.81, 220.00, 261.63, 329.63, 440.00],
          // F Major 7
          [87.31, 130.81, 174.61, 220.00, 261.63, 329.63],
        ];

        let chordIndex = 0;
        let noteInChord = 0;

        const playProceduralPianoNote = (freq: number, velocity: number) => {
          if (!this.ctx || !this.isPlaying || !this.masterGain) return;
          try {
            const now = this.ctx.currentTime;
            // Dual-oscillator for acoustic piano detuned warmth
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const noteGain = this.ctx.createGain();

            osc1.type = "sine";
            osc1.frequency.setValueAtTime(freq, now);

            osc2.type = "triangle";
            osc2.frequency.setValueAtTime(freq * 1.002, now);

            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(Math.min(4500, freq * 4), now);
            filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.2), now + 3.0);

            noteGain.gain.setValueAtTime(0.0001, now);
            noteGain.gain.linearRampToValueAtTime(0.18 * velocity, now + 0.015);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(noteGain);
            noteGain.connect(this.masterGain);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 4.0);
            osc2.stop(now + 4.0);
          } catch (e) {}
        };

        // Trigger notes at relaxed 1.1s intervals
        const pianoInterval = setInterval(() => {
          if (!this.ctx || !this.isPlaying) return;
          const currentChord = chordPitches[chordIndex];
          const freq = currentChord[noteInChord];
          playProceduralPianoNote(freq, noteInChord === 0 ? 0.9 : 0.65);

          noteInChord++;
          if (noteInChord >= currentChord.length) {
            noteInChord = 0;
            chordIndex = (chordIndex + 1) % chordPitches.length;
          }
        }, 1100);

        sourceRecord.intervals.push(pianoInterval);
        break;
      }

      case "flowing-waterfall": {
        // Continuous, peaceful natural waterfall & water flowing over rocks:
        // Deep plunge body + resonant stone bandpass + gentle aerated spray (low-pass filtered to avoid harsh sibilance)
        const pinkBuffer = this.createPinkNoiseBuffer(ctx, 6);
        const brownBuffer = this.createBrownNoiseBuffer(ctx, 6);

        // Pink noise generator for rushing stream body
        const pinkSource = ctx.createBufferSource();
        pinkSource.buffer = pinkBuffer;
        pinkSource.loop = true;

        // Brown noise generator for deep waterfall rumble
        const brownSource = ctx.createBufferSource();
        brownSource.buffer = brownBuffer;
        brownSource.loop = true;

        // Low-pass filter to remove harsh high frequencies (>1500Hz)
        const masterWaterFilter = ctx.createBiquadFilter();
        masterWaterFilter.type = "lowpass";
        masterWaterFilter.frequency.setValueAtTime(1450, ctx.currentTime);
        masterWaterFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        // Bandpass filter 1: Main water cascade (520Hz)
        const cascadeFilter = ctx.createBiquadFilter();
        cascadeFilter.type = "bandpass";
        cascadeFilter.frequency.setValueAtTime(520, ctx.currentTime);
        cascadeFilter.Q.setValueAtTime(1.3, ctx.currentTime);

        // Bandpass filter 2: Rocks & water tumbling (980Hz)
        const streamFilter = ctx.createBiquadFilter();
        streamFilter.type = "bandpass";
        streamFilter.frequency.setValueAtTime(980, ctx.currentTime);
        streamFilter.Q.setValueAtTime(1.9, ctx.currentTime);

        // Slow subtle LFO for organic fluid turbulence
        const lfo1 = ctx.createOscillator();
        lfo1.type = "sine";
        lfo1.frequency.setValueAtTime(0.18, ctx.currentTime);

        const lfo1Gain = ctx.createGain();
        lfo1Gain.gain.setValueAtTime(110, ctx.currentTime);
        lfo1.connect(lfo1Gain);
        lfo1Gain.connect(cascadeFilter.frequency);

        const lfo2 = ctx.createOscillator();
        lfo2.type = "sine";
        lfo2.frequency.setValueAtTime(0.27, ctx.currentTime);

        const lfo2Gain = ctx.createGain();
        lfo2Gain.gain.setValueAtTime(140, ctx.currentTime);
        lfo2.connect(lfo2Gain);
        lfo2Gain.connect(streamFilter.frequency);

        // Individual gains
        const brownGain = ctx.createGain();
        brownGain.gain.setValueAtTime(0.55, ctx.currentTime);

        const pinkGain = ctx.createGain();
        pinkGain.gain.setValueAtTime(0.75, ctx.currentTime);

        const overallSoundGain = ctx.createGain();
        overallSoundGain.gain.setValueAtTime(0.9, ctx.currentTime);

        // Audio Graph Routing
        brownSource.connect(brownGain);
        brownGain.connect(masterWaterFilter);

        pinkSource.connect(cascadeFilter);
        cascadeFilter.connect(pinkGain);

        pinkSource.connect(streamFilter);
        streamFilter.connect(pinkGain);

        pinkGain.connect(masterWaterFilter);
        masterWaterFilter.connect(overallSoundGain);
        overallSoundGain.connect(this.masterGain);

        pinkSource.start();
        brownSource.start();
        lfo1.start();
        lfo2.start();

        sourceRecord.noiseNodes.push(pinkSource, brownSource);
        sourceRecord.oscillators.push(lfo1, lfo2);
        sourceRecord.gains.push(brownGain, pinkGain, overallSoundGain, lfo1Gain, lfo2Gain);
        break;
      }

      case "running-stream": {
        // Soft running stream water trickling peacefully over smooth stones
        const pinkBuffer = this.createPinkNoiseBuffer(ctx, 4);
        const noise = ctx.createBufferSource();
        noise.buffer = pinkBuffer;
        noise.loop = true;

        const filter1 = ctx.createBiquadFilter();
        filter1.type = "bandpass";
        filter1.frequency.setValueAtTime(460, ctx.currentTime);
        filter1.Q.setValueAtTime(2.2, ctx.currentTime);

        const filter2 = ctx.createBiquadFilter();
        filter2.type = "peaking";
        filter2.frequency.setValueAtTime(1150, ctx.currentTime);
        filter2.gain.setValueAtTime(4.0, ctx.currentTime);
        filter2.Q.setValueAtTime(2.2, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.35, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(90, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(filter1.frequency);

        const soundGain = ctx.createGain();
        soundGain.gain.setValueAtTime(0.8, ctx.currentTime);

        noise.connect(filter1);
        filter1.connect(filter2);
        filter2.connect(soundGain);
        soundGain.connect(this.masterGain);

        noise.start();
        lfo.start();

        sourceRecord.noiseNodes.push(noise);
        sourceRecord.oscillators.push(lfo);
        sourceRecord.gains.push(soundGain, lfoGain);
        break;
      }

      case "gentle-rain": {
        // Soft rainfall on forest leaves
        const pinkBuffer = this.createPinkNoiseBuffer(ctx, 4);
        const rainNoise = ctx.createBufferSource();
        rainNoise.buffer = pinkBuffer;
        rainNoise.loop = true;

        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = "lowpass";
        rainFilter.frequency.setValueAtTime(1100, ctx.currentTime);
        rainFilter.Q.setValueAtTime(0.7, ctx.currentTime);

        const rainGain = ctx.createGain();
        rainGain.gain.setValueAtTime(0.65, ctx.currentTime);

        rainNoise.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(this.masterGain);
        rainNoise.start();

        sourceRecord.noiseNodes.push(rainNoise);
        sourceRecord.gains.push(rainGain);

        // Random subtle raindrop pitter-patter bursts
        const dropInterval = setInterval(() => {
          if (!this.ctx || !this.isPlaying || !this.masterGain) return;
          try {
            const drop = this.ctx.createOscillator();
            const dropGain = this.ctx.createGain();
            drop.type = "sine";
            const freq = 1600 + Math.random() * 1600;
            drop.frequency.setValueAtTime(freq, this.ctx.currentTime);
            drop.frequency.exponentialRampToValueAtTime(freq * 0.6, this.ctx.currentTime + 0.04);

            dropGain.gain.setValueAtTime(0.012 + Math.random() * 0.015, this.ctx.currentTime);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);

            drop.connect(dropGain);
            dropGain.connect(this.masterGain);
            drop.start();
            drop.stop(this.ctx.currentTime + 0.06);
          } catch (e) {}
        }, 220);

        sourceRecord.intervals.push(dropInterval);
        break;
      }

      case "forest-breeze": {
        // Tranquil forest breeze in trees
        const brownBuffer = this.createBrownNoiseBuffer(ctx, 4);
        const wind = ctx.createBufferSource();
        wind.buffer = brownBuffer;
        wind.loop = true;

        const windFilter = ctx.createBiquadFilter();
        windFilter.type = "lowpass";
        windFilter.frequency.setValueAtTime(320, ctx.currentTime);

        const windLfo = ctx.createOscillator();
        windLfo.frequency.setValueAtTime(0.12, ctx.currentTime);
        const windLfoGain = ctx.createGain();
        windLfoGain.gain.setValueAtTime(140, ctx.currentTime);
        windLfo.connect(windLfoGain);
        windLfoGain.connect(windFilter.frequency);

        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(0.55, ctx.currentTime);

        wind.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.masterGain);

        wind.start();
        windLfo.start();

        sourceRecord.noiseNodes.push(wind);
        sourceRecord.oscillators.push(windLfo);
        sourceRecord.gains.push(windGain, windLfoGain);
        break;
      }

      case "ocean-shore": {
        // Slow soothing ocean waves
        const pinkBuffer = this.createPinkNoiseBuffer(ctx, 6);
        const wave = ctx.createBufferSource();
        wave.buffer = pinkBuffer;
        wave.loop = true;

        const waveFilter = ctx.createBiquadFilter();
        waveFilter.type = "lowpass";
        waveFilter.frequency.setValueAtTime(450, ctx.currentTime);

        const waveLfo = ctx.createOscillator();
        waveLfo.frequency.setValueAtTime(0.09, ctx.currentTime); // ~11s wave cycle

        const waveLfoGain = ctx.createGain();
        waveLfoGain.gain.setValueAtTime(320, ctx.currentTime);
        waveLfo.connect(waveLfoGain);
        waveLfoGain.connect(waveFilter.frequency);

        const swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0.7, ctx.currentTime);

        wave.connect(waveFilter);
        waveFilter.connect(swellGain);
        swellGain.connect(this.masterGain);

        wave.start();
        waveLfo.start();

        sourceRecord.noiseNodes.push(wave);
        sourceRecord.oscillators.push(waveLfo);
        sourceRecord.gains.push(swellGain, waveLfoGain);
        break;
      }
    }

    this.currentSourceNodes = sourceRecord;
  }

  /**
   * Fade out current audio source smoothly
   */
  private async fadeOutCurrentSource(durationSeconds: number = 1.2): Promise<void> {
    if (!this.currentSourceNodes || !this.ctx || !this.masterGain) {
      this.cleanupCurrentSource();
      return;
    }

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    return new Promise((resolve) => {
      setTimeout(() => {
        this.cleanupCurrentSource();
        resolve();
      }, durationSeconds * 1000);
    });
  }

  private cleanupCurrentSource() {
    if (!this.currentSourceNodes) return;

    if (this.currentSourceNodes.audioElement) {
      try {
        this.currentSourceNodes.audioElement.pause();
        this.currentSourceNodes.audioElement.src = "";
      } catch (e) {}
    }

    if (this.currentSourceNodes.oscillators) {
      this.currentSourceNodes.oscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
    }

    if (this.currentSourceNodes.noiseNodes) {
      this.currentSourceNodes.noiseNodes.forEach((node) => {
        try {
          if ("stop" in node) (node as any).stop();
          node.disconnect();
        } catch (e) {}
      });
    }

    if (this.currentSourceNodes.gains) {
      this.currentSourceNodes.gains.forEach((g) => {
        try {
          g.disconnect();
        } catch (e) {}
      });
    }

    if (this.currentSourceNodes.intervals) {
      this.currentSourceNodes.intervals.forEach((id) => clearInterval(id));
    }

    this.currentSourceNodes = null;
  }

  /**
   * Stop / Pause ambient playback with graceful fade out
   */
  public async pause(durationSeconds: number = 1.2): Promise<void> {
    if (!this.isPlaying) return;

    this.isFading = true;
    this.notify();

    await this.fadeOutCurrentSource(durationSeconds);

    this.isPlaying = false;
    this.isFading = false;
    this.notify();
  }

  /**
   * Adjust master volume (0.0 to 1.0)
   */
  public setVolume(newVolume: number) {
    const clamped = Math.max(0, Math.min(1, newVolume));
    this.volume = clamped;

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      const effectiveVol = this.isMuted ? 0.0001 : Math.max(0.0001, clamped);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(effectiveVol, now + 0.1);
    }

    this.notify();
  }

  /**
   * Toggle mute state
   */
  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      const target = this.isMuted ? 0.0001 : Math.max(0.0001, this.volume);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(target, now + 0.15);
    }
    this.notify();
  }

  /**
   * Select a different sound (will crossfade if currently playing)
   */
  public async selectSound(soundId: AmbientSoundId): Promise<void> {
    if (this.activeSoundId === soundId && this.isPlaying) return;

    this.activeSoundId = soundId;
    if (this.isPlaying) {
      await this.playSound(soundId);
    } else {
      this.notify();
    }
  }
}

export const ambientEngine = new AmbientAudioEngine();
