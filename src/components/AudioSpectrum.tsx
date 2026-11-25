import { useEffect, useRef } from 'react';

interface AudioSpectrumProps {
  audioEl: HTMLAudioElement | null;
  active: boolean;
}

/**
 * Animated signal-level visualizer for live radio streams.
 * Note: Intentionally does NOT attach AudioContext.createMediaElementSource(audioEl),
 * because Chromium/WebView2 mutes cross-origin radio streams without CORS headers
 * to silence when routed through MediaElementAudioSourceNode.
 */
export function AudioSpectrum({ audioEl: _audioEl, active }: AudioSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    let raf = 0;
    let lastDraw = 0;

    const draw = (t: number) => {
      if (t - lastDraw < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = t;

      const w = canvas.width;
      const h = canvas.height;
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#090A0D';
      g.fillRect(0, 0, w, h);

      const barCount = 24;
      const gap = 2;
      const barW = Math.floor((w - gap * (barCount - 1)) / barCount);

      for (let i = 0; i < barCount; i++) {
        let val = 0.08;
        if (active) {
          const wave =
            Math.sin(t * 0.0055 + i * 0.55) * 0.32 +
            Math.sin(t * 0.012 - i * 0.85) * 0.24 +
            Math.cos(t * 0.0085 + i * 1.15) * 0.12 +
            0.44;
          const envelope = 1 - Math.abs(i - barCount / 2) / (barCount * 0.68);
          val = Math.max(0.1, Math.min(0.95, wave * envelope));
        }
        const bh = Math.max(2, Math.floor(val * (h - 4)));
        g.fillStyle = val > 0.72 ? '#E5A952' : val > 0.42 ? '#C4C9D4' : '#4D5461';
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
      height={28}
      className="w-full h-[28px] rounded-md block"
    />
  );
}
