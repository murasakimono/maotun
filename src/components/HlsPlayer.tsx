import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  url: string;
  title?: string;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({ url, title }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    setErr(null);

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setErr('Akış şu an çevrimdışı veya bölge kısıtlı.');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [url]);

  return (
    <div className="relative w-full aspect-video bg-black border border-white/10 overflow-hidden">
      <video ref={videoRef} controls playsInline className="w-full h-full object-contain" />
      {title && (
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 text-[10px] font-mono-tech text-emerald-300 pointer-events-none">
          ● CANLI • {title}
        </div>
      )}
      {err && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 text-center text-xs font-mono-tech text-amber-300">
          {err}
        </div>
      )}
    </div>
  );
};
