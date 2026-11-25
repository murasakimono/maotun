import { useEffect, useRef } from 'react';

interface AudioSpectrumProps {
  audioEl: HTMLAudioElement | null;
  active: boolean;
}

export function AudioSpectrum({ audioEl, active }: AudioSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const hookedElRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!active || !audioEl) return;
    if (hookedElRef.current !== audioEl) {
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        const src = ctx.createMediaElementSource(audioEl);
        src.connect(analyser);
        analyser.connect(ctx.destination);
        ctxRef.current = ctx;
        analyserRef.current = analyser;
        hookedElRef.current = audioEl;
      } catch {
        // Remote stream without CORS headers: fallback carrier visualizer will run
      }
    }
    if (ctxRef.current?.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
  }, [audioEl, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    let raf = 0;
    const bins = new Uint8Array(32);

    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#090A0D';
      g.fillRect(0, 0, w, h);

      let hasRealSignal = false;
      if (active && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(bins);
        for (let i = 0; i < bins.length; i++) {
          if (bins[i] > 4) {
            hasRealSignal = true;
            break;
          }
        }
      }

      const barCount = 24;
      const gap = 2;
      const barW = Math.floor((w - gap * (barCount - 1)) / barCount);

      for (let i = 0; i < barCount; i++) {
        let val = 0.08;
        if (active) {
          if (hasRealSignal) {
            val = Math.max(0.08, bins[i] / 255);
          } else {
            // Smooth procedural carrier modulation when remote stream is CORS-opaque
            const wave =
              Math.sin(t * 0.006 + i * 0.55) * 0.35 +
              Math.sin(t * 0.013 - i * 0.9) * 0.25 +
              0.42;
            const envelope = 1 - Math.abs(i - barCount / 2) / (barCount * 0.65);
            val = Math.max(0.1, Math.min(0.95, wave * envelope));
          }
        }
        const bh = Math.max(2, Math.floor(val * (h - 4)));
        g.fillStyle = val > 0.72 ? '#FF4D00' : val > 0.42 ? '#ECEEF2' : '#4D5461';
        g.fillRect(i * (barW + gap), h - bh - 2, barW, bh);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      width={220}
      height={34}
      className="w-full h-[34px] border border-[#242830] block"
    />
  );
}
