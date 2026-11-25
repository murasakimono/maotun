import { useState } from 'react';
import { Pause, Play, Radio, Volume2, VolumeX, X } from 'lucide-react';
import type { RadioStation } from '../types';
import { AudioSpectrum } from './AudioSpectrum';

interface MiniRadioBarProps {
  station: RadioStation | null;
  paused: boolean;
  audioEl: HTMLAudioElement | null;
  onTogglePause: () => void;
  onStop: () => void;
}

export function MiniRadioBar({
  station,
  paused,
  audioEl,
  onTogglePause,
  onStop,
}: MiniRadioBarProps) {
  const [vol, setVol] = useState(0.85);
  if (!station) return null;

  const setVolume = (v: number) => {
    setVol(v);
    if (audioEl) {
      audioEl.muted = v === 0;
      audioEl.volume = v;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-30 atlas-glass rounded-2xl px-3 py-2 w-[275px] max-w-[42vw] flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-3.5 h-3.5 text-[#E5A952] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#E6E8EC] truncate">{station.name}</div>
            <div className="font-mono-tech text-[10px] text-[#8E95A3] truncate">
              {station.country} • {station.bitrate} kbps
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onTogglePause} className="atlas-btn atlas-btn-amber w-7 h-7 rounded-lg">
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onStop} className="atlas-btn w-7 h-7 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVolume(vol === 0 ? 0.85 : 0)}
          className="text-[#8E95A3] hover:text-white cursor-pointer"
          title="Sesi Kapat / Aç"
        >
          {vol === 0 ? <VolumeX className="w-3.5 h-3.5 text-[#E85D4A]" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full h-1 accent-[#E5A952] cursor-pointer"
        />
      </div>
      <div className="rounded-lg overflow-hidden">
        <AudioSpectrum audioEl={audioEl} active={!paused} />
      </div>
    </div>
  );
}
