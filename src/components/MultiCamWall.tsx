import { Grid2x2, X } from 'lucide-react';
import type { LiveCamera } from '../types';
import { CameraFeed } from './CameraFeed';
import { sound } from '../sound';

interface MultiCamWallProps {
  open: boolean;
  onClose: () => void;
  cameras: LiveCamera[];
}

export function MultiCamWall({ open, onClose, cameras }: MultiCamWallProps) {
  if (!open) return null;
  const shown = cameras.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 bg-[#08090B]/95 flex flex-col p-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#242830]">
        <div className="flex items-center gap-2.5">
          <Grid2x2 className="w-4 h-4 text-[#FF4D00]" />
          <span className="font-semibold text-sm tracking-widest uppercase">
            MAOTUN // ÇOKLU OPTİK KAMERA DUVARI ({shown.length} KANAL)
          </span>
        </div>
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

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-3 overflow-y-auto">
        {shown.map((cam) => (
          <div key={cam.id} className="inst-plate reticle-corner flex flex-col overflow-hidden">
            <div className="flex-1 min-h-[210px] bg-[#050608]">
              <CameraFeed cam={cam} />
            </div>
            <div className="px-2.5 py-1.5 border-t border-[#242830] flex items-center justify-between bg-[#0E1013]">
              <span className="font-mono-tech text-[10px] text-[#ECEEF2] truncate">{cam.name}</span>
              <span className="font-mono-tech text-[9px] text-[#00E58A] shrink-0">
                ● {cam.city.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
