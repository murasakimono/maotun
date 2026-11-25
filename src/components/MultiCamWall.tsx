import { useMemo, useState } from 'react';
import { Grid2x2, Shuffle, X } from 'lucide-react';
import type { LiveCamera } from '../types';
import { CameraFeed } from './CameraFeed';
import { sound } from '../sound';

interface MultiCamWallProps {
  open: boolean;
  onClose: () => void;
  cameras: LiveCamera[];
}

export function MultiCamWall({ open, onClose, cameras }: MultiCamWallProps) {
  const [page, setPage] = useState(0);

  // Prioritize direct HLS / MP4 / Snapshot streams (zero YouTube iframe restrictions)
  const ordered = useMemo(() => {
    const direct = cameras.filter((c) => c.kind === 'hls' || c.kind === 'mp4' || c.kind === 'snapshot');
    const yt = cameras.filter((c) => c.kind === 'youtube');
    return [...direct, ...yt];
  }, [cameras]);

  if (!open) return null;

  const totalPages = Math.max(1, Math.ceil(ordered.length / 6));
  const start = (page % totalPages) * 6;
  const shown = ordered.slice(start, start + 6);

  return (
    <div className="fixed inset-0 z-50 bg-[#08090B]/95 flex flex-col p-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#242830] gap-3">
        <div className="flex items-center gap-2.5">
          <Grid2x2 className="w-4 h-4 text-[#FF4D00]" />
          <span className="font-semibold text-sm tracking-widest uppercase">
            MAOTUN // ÇOKLU OPTİK KAMERA DUVARI ({shown.length} / {ordered.length} CANLI KAYNAK)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              setPage((p) => (p + 1) % totalPages);
            }}
            className="inst-btn inst-btn-orange px-3 py-1.5"
          >
            <Shuffle className="w-3.5 h-3.5" /> SONRAKİ 6 KAMERA
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="inst-btn px-3 py-1.5"
          >
            <X className="w-4 h-4" /> KAPAT
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 overflow-y-auto">
        {shown.map((cam) => (
          <div key={cam.id} className="inst-plate reticle-corner flex flex-col overflow-hidden">
            <div className="flex-1 min-h-[210px] bg-[#050608]">
              <CameraFeed cam={cam} />
            </div>
            <div className="px-2.5 py-1.5 border-t border-[#242830] flex items-center justify-between bg-[#0E1013] gap-2">
              <span className="font-mono-tech text-[10px] text-[#ECEEF2] truncate">{cam.name}</span>
              <span className="font-mono-tech text-[9px] text-[#00E58A] shrink-0">
                ● {cam.country_code} • {cam.kind.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
