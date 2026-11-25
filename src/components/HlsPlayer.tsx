import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  title?: string;
  className?: string;
  muted?: boolean;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  src,
  title,
  className = 'w-full h-full',
  muted = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setErr(null);

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setErr('AKIŞ ÇEVRİMDIŞI VEYA BÖLGE KISITLI');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src]);

  return (
    <div className={`relative bg-[#08090B] overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        controls
        playsInline
        muted={muted}
        className="w-full h-full object-contain"
      />
      {title && (
        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-[#08090B]/85 border border-[#242830] text-[9px] font-mono-tech text-[#00E58A] pointer-events-none">
          ● {title}
        </div>
      )}
      {err && (
        <div className="absolute inset-0 bg-[#08090B]/90 flex items-center justify-center p-4 text-center text-[11px] font-mono-tech text-[#FFB800]">
          {err}
        </div>
      )}
    </div>
  );
};
