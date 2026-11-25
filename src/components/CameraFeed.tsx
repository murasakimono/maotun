import { useEffect, useState } from 'react';
import type { LiveCamera } from '../types';
import { HlsPlayer } from './HlsPlayer';

interface CameraFeedProps {
  cam: LiveCamera;
  className?: string;
}

export function CameraFeed({ cam, className = 'w-full h-full' }: CameraFeedProps) {
  const [tick, setTick] = useState(Date.now());
  const refreshSec = cam.refresh_sec ?? 5;

  useEffect(() => {
    if (cam.kind !== 'snapshot') return;
    const id = setInterval(() => setTick(Date.now()), refreshSec * 1000);
    return () => clearInterval(id);
  }, [cam.kind, refreshSec]);

  if (cam.kind === 'hls') {
    return <HlsPlayer src={cam.embed_url} className={className} muted />;
  }

  if (cam.kind === 'mp4') {
    return (
      <div className={`relative bg-[#08090B] ${className}`}>
        <video
          src={cam.embed_url}
          autoPlay
          loop
          muted
          playsInline
          controls
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-[#08090B]/85 border border-[#242830] font-mono-tech text-[9px] text-[#00D4FF]">
          MP4 LIVE
        </span>
      </div>
    );
  }

  if (cam.kind === 'snapshot') {
    const sep = cam.embed_url.includes('?') ? '&' : '?';
    return (
      <div className={`relative bg-[#08090B] ${className}`}>
        <img
          src={`${cam.embed_url}${sep}_t=${tick}`}
          alt={cam.name}
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-[#08090B]/85 border border-[#242830] font-mono-tech text-[9px] text-[#00E58A]">
          SNAP {refreshSec}S
        </span>
      </div>
    );
  }

  return (
    <iframe
      src={cam.embed_url}
      title={cam.name}
      referrerPolicy="strict-origin-when-cross-origin"
      className={`${className} border-0 bg-[#08090B]`}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
