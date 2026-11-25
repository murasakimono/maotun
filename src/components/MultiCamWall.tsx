import React from 'react';
import { X, Video } from 'lucide-react';
import { HlsPlayer } from './HlsPlayer';
import type { LiveCamera } from '../types';

interface MultiCamWallProps {
  cameras: LiveCamera[];
  onClose: () => void;
}

export const MultiCamWall: React.FC<MultiCamWallProps> = ({ cameras, onClose }) => {
  const wallCams = cameras.slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-5">
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2.5">
          <Video className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-[10px] font-mono-tech text-emerald-400 tracking-[0.25em] uppercase">
              MAOTUN // ÇOKLU CANLI DÜNYA DUVARI
            </div>
            <div className="text-sm font-bold text-white">6 ŞEHİR EŞZAMANLI CANLI GÖZLEM</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 bg-white/5 border border-white/15 text-xs font-mono-tech text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" /> KÜREYE DÖN
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 overflow-hidden">
        {wallCams.map((cam) => (
          <div key={cam.id} className="relative bg-black border border-white/12 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 bg-black/80 border-b border-white/10 flex items-center justify-between text-[10px] font-mono-tech">
              <span className="text-emerald-300 font-bold truncate">● {cam.name}</span>
              <span className="text-slate-400">{cam.city}</span>
            </div>
            <div className="flex-1 relative">
              {cam.kind === 'hls' ? (
                <HlsPlayer url={cam.embed_url} />
              ) : (
                <iframe
                  src={cam.embed_url}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
