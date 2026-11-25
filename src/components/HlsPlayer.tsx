import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Maximize2, Pause, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react';

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
  muted: initialMuted = false,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(true);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [volume, setVolume] = useState(0.85);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    setErr(null);
    setBuffering(true);
    setPaused(false);

    let hls: Hls | null = null;
    let retries = 0;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Prevents stalling at 0:18 on standard IPTV segments
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 20,
        manifestLoadingTimeOut: 12000,
        levelLoadingTimeOut: 12000,
        fragLoadingTimeOut: 15000,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setBuffering(false);
        video.muted = muted;
        video.volume = volume;
        video.play().catch(() => {
          // If unmuted autoplay is blocked, retry muted
          video.muted = true;
          setMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retries < 3) {
          retries += 1;
          hls?.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retries < 3) {
          retries += 1;
          hls?.recoverMediaError();
        } else {
          setBuffering(false);
          setErr('Yayın şu an çevrimdışı veya bölge/CORS kısıtlı.');
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.play().catch(() => {});
    }

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => {
      setBuffering(false);
      setPaused(false);
    };
    const onPause = () => setPaused(true);

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('pause', onPause);
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [src, reloadNonce]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      if (hlsRef.current?.liveSyncPosition) {
        v.currentTime = hlsRef.current.liveSyncPosition;
      }
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const jumpLive = () => {
    const v = videoRef.current;
    if (!v) return;
    if (hlsRef.current?.liveSyncPosition) {
      v.currentTime = hlsRef.current.liveSyncPosition;
    }
    v.play().catch(() => {});
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
  };

  const handleVolume = (val: number) => {
    const v = videoRef.current;
    setVolume(val);
    if (v) {
      v.volume = val;
      if (val > 0 && muted) {
        v.muted = false;
        setMuted(false);
      }
    }
  };

  const goFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      v.requestFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className={`relative bg-[#07090C] overflow-hidden group ${className}`}>
      <video
        ref={videoRef}
        playsInline
        muted={muted}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Top Live Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-black/75 border border-white/10 font-mono-tech text-[10px] text-[#4ADE80] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          CANLI{title ? ` • ${title}` : ''}
        </span>
        {buffering && !err && (
          <span className="px-2 py-0.5 rounded-md bg-black/75 font-mono-tech text-[10px] text-[#E5A952]">
            Yükleniyor...
          </span>
        )}
      </div>

      {/* Custom Clean Live Control Bar (No misleading 0:06/0:18 VOD bar!) */}
      {!err && (
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/90 via-black/55 to-transparent flex items-center justify-between gap-2 opacity-95 group-hover:opacity-100 transition">
          <div className="flex items-center gap-1.5">
            <button onClick={togglePlay} className="atlas-btn w-7 h-7 bg-white/10" title="Oynat / Duraklat">
              {paused ? <Play className="w-3.5 h-3.5 text-white" /> : <Pause className="w-3.5 h-3.5 text-white" />}
            </button>
            <button
              onClick={jumpLive}
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-[#E5A952] hover:text-[#090B0E] font-mono-tech text-[10px] text-[#E6E8EC] transition cursor-pointer"
              title="Canlı uca atla"
            >
              ● CANLI
            </button>
            <button onClick={toggleMute} className="atlas-btn w-7 h-7 bg-white/10" title="Ses">
              {muted ? <VolumeX className="w-3.5 h-3.5 text-[#E85D4A]" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => handleVolume(Number(e.target.value))}
              className="w-16 accent-[#E5A952] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setReloadNonce((n) => n + 1)}
              className="atlas-btn w-7 h-7 bg-white/10"
              title="Yayını Yenile"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button onClick={goFullscreen} className="atlas-btn w-7 h-7 bg-white/10" title="Tam Ekran">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {err && (
        <div className="absolute inset-0 bg-[#090B0E]/92 flex flex-col items-center justify-center p-4 text-center gap-2">
          <div className="text-xs text-[#E5A952]">{err}</div>
          <button
            onClick={() => setReloadNonce((n) => n + 1)}
            className="atlas-btn px-3 py-1.5 bg-white/10 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
};
