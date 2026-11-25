import { Pause, Play, Radio, X } from 'lucide-react';
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
  if (!station) return null;

  return (
    <div className="fixed bottom-4 left-4 z-30 atlas-glass rounded-2xl px-3 py-2 w-[265px] max-w-[42vw] flex flex-col gap-1.5">
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
      <div className="rounded-lg overflow-hidden">
        <AudioSpectrum audioEl={audioEl} active={!paused} />
      </div>
    </div>
  );
}
