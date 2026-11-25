// Pure WebAudio Ambient City Soundscape Generator (Zero external files)
export type AmbientMode = 'off' | 'rain' | 'sea' | 'city' | 'wind';

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private src: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  public current: AmbientMode = 'off';

  setMode(mode: AmbientMode, volume = 0.22) {
    this.stop();
    this.current = mode;
    if (mode === 'off') return;

    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // Generate 4s stereo pink/brown noise buffer
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + w * 0.029;
        b1 = 0.985 * b1 + w * 0.032;
        b2 = 0.95 * b2 + w * 0.048;
        data[i] = (b0 + b1 + b2 + w * 0.04) * 0.55;
      }
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), ctx.currentTime + 0.6);

    if (mode === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 0.65;
    } else if (mode === 'sea') {
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.14; // slow wave swell
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.lfo = lfo;
    } else if (mode === 'city') {
      filter.type = 'lowpass';
      filter.frequency.value = 240;
    } else if (mode === 'wind') {
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 2.4;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.22;
      lfoGain.gain.value = 260;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      this.lfo = lfo;
    }

    src.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);
    src.start();
    this.src = src;
    this.gain = master;
  }

  setVolume(vol: number) {
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(Math.max(0.001, vol), this.ctx.currentTime, 0.1);
    }
  }

  stop() {
    try {
      this.src?.stop();
      this.lfo?.stop();
    } catch {
      // ignore
    }
    this.src = null;
    this.lfo = null;
    this.gain = null;
    this.current = 'off';
  }
}

export const ambient = new AmbientEngine();
