import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Flame, Play, RefreshCw, Trophy, X } from 'lucide-react';
import type { LiveCamera } from '../types';
import { CameraFeed } from './CameraFeed';
import { haversineKm } from '../geo';
import { sound } from '../sound';

interface SignalHuntModalProps {
  open: boolean;
  onClose: () => void;
  cameras: LiveCamera[];
}

export function SignalHuntModal({ open, onClose, cameras }: SignalHuntModalProps) {
  const playable = useMemo(
    () => cameras.filter((c) => c.kind === 'hls' || c.kind === 'mp4' || c.kind === 'snapshot'),
    [cameras]
  );

  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem('maotun_hunt_hi') || 0));
  const [targetCam, setTargetCam] = useState<LiveCamera | null>(null);
  const [guess, setGuess] = useState<{ lat: number; lon: number } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lastDist, setLastDist] = useState<number | null>(null);
  const [lastPts, setLastPts] = useState(0);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const pickNextCamera = () => {
    if (playable.length === 0) return;
    const pick = playable[Math.floor(Math.random() * playable.length)];
    setTargetCam(pick);
    setGuess(null);
    setRevealed(false);
    setLastDist(null);
    setLastPts(0);
  };

  useEffect(() => {
    if (open && !targetCam && playable.length > 0) {
      pickNextCamera();
    }
  }, [open, playable.length]);

  if (!open) return null;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (revealed || !mapRef.current) return;
    sound.playClick();
    const rect = mapRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const lon = nx * 360 - 180;
    const lat = 90 - ny * 180;
    setGuess({ lat, lon });
  };

  const submitGuess = () => {
    if (!guess || !targetCam) return;
    const dist = haversineKm(guess.lat, guess.lon, targetCam.lat, targetCam.lon);
    const pts = Math.round(5000 * Math.exp(-dist / 2200));
    const nextTotal = totalScore + pts;
    setLastDist(dist);
    setLastPts(pts);
    setTotalScore(nextTotal);
    setStreak((s) => (pts >= 2000 ? s + 1 : 0));
    if (nextTotal > highScore) {
      setHighScore(nextTotal);
      localStorage.setItem('maotun_hunt_hi', String(nextTotal));
    }
    setRevealed(true);
    sound.playAlert();
  };

  const nextRound = () => {
    sound.playClick();
    if (round >= 5) {
      setRound(1);
      setTotalScore(0);
      setStreak(0);
    } else {
      setRound((r) => r + 1);
    }
    pickNextCamera();
  };

  const toPct = (lat: number, lon: number) => ({
    left: `${((lon + 180) / 360) * 100}%`,
    top: `${((90 - lat) / 180) * 100}%`,
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl atlas-glass rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crosshair className="w-4 h-4 text-[#E5A952]" />
            <span className="text-sm font-semibold">Sinyal Avı — Canlı Kamera GeoGuessr</span>
            <span className="font-mono-tech text-xs px-2 py-0.5 rounded bg-white/[0.06] text-[#E5A952]">
              Tur {round}/5
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono-tech">
            <span className="text-[#4ADE80]">Puan: {totalScore}</span>
            <span className="text-[#E5A952] flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {streak}</span>
            <span className="text-[#8E95A3] flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> {highScore}</span>
            <button onClick={onClose} className="atlas-btn p-1.5"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto">
          {/* Left: Live Mystery Camera */}
          <div className="space-y-2.5">
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-white/10">
              {targetCam ? (
                <CameraFeed cam={targetCam} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#8E95A3]">
                  Canlı kamera yükleniyor...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8E95A3]">
                {revealed && targetCam
                  ? `Gerçek Konum: ${targetCam.name} (${targetCam.country_code})`
                  : 'İpucu: Tabelalara, araç yönüne, iklime ve mimariye bak!'}
              </span>
              <button onClick={pickNextCamera} className="atlas-btn px-2.5 py-1 bg-white/[0.06] text-[11px]">
                <RefreshCw className="w-3 h-3" /> Kamerayı Değiştir
              </button>
            </div>
          </div>

          {/* Right: Interactive Dark World Guess Map */}
          <div className="flex flex-col justify-between gap-3">
            <div
              ref={mapRef}
              onClick={handleMapClick}
              className="relative aspect-[2/1] w-full rounded-xl overflow-hidden border border-white/15 bg-[#0B1018] cursor-crosshair select-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(96,165,250,0.08), transparent 70%), linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 10% 20%, 10% 20%',
              }}
            >
              {/* Subtle continent guide labels */}
              <span className="absolute left-[18%] top-[28%] text-[9px] text-white/20 pointer-events-none">K. AMERİKA</span>
              <span className="absolute left-[28%] top-[68%] text-[9px] text-white/20 pointer-events-none">G. AMERİKA</span>
              <span className="absolute left-[50%] top-[24%] text-[9px] text-white/20 pointer-events-none">AVRUPA</span>
              <span className="absolute left-[52%] top-[52%] text-[9px] text-white/20 pointer-events-none">AFRİKA</span>
              <span className="absolute left-[72%] top-[28%] text-[9px] text-white/20 pointer-events-none">ASYA</span>
              <span className="absolute left-[82%] top-[72%] text-[9px] text-white/20 pointer-events-none">OKYANUSYA</span>
              <span className="absolute left-[57%] top-[29%] text-[9px] text-[#E5A952]/40 pointer-events-none">TR</span>

              {guess && (
                <div
                  className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full bg-[#E5A952] border-2 border-white shadow"
                  style={toPct(guess.lat, guess.lon)}
                />
              )}
              {revealed && targetCam && (
                <div
                  className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-[#4ADE80] border-2 border-white shadow animate-pulse"
                  style={toPct(targetCam.lat, targetCam.lon)}
                />
              )}
            </div>

            {revealed && lastDist !== null ? (
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#8E95A3]">Sapma Mesafesi</div>
                  <div className="font-mono-tech text-lg font-semibold text-white">
                    {Math.round(lastDist).toLocaleString('tr-TR')} km{' '}
                    <span className="text-[#4ADE80] text-sm ml-1">+{lastPts} puan</span>
                  </div>
                </div>
                <button onClick={nextRound} className="atlas-btn atlas-btn-amber px-4 py-2">
                  <Play className="w-3.5 h-3.5" /> {round >= 5 ? 'Yeni Oyun' : 'Sonraki Tur'}
                </button>
              </div>
            ) : (
              <button
                onClick={submitGuess}
                disabled={!guess}
                className="w-full atlas-btn atlas-btn-amber py-2.5 disabled:opacity-40"
              >
                {guess
                  ? `Tahmini Kilitle (${guess.lat.toFixed(1)}°, ${guess.lon.toFixed(1)}°)`
                  : 'Haritada Bir Noktaya Tıkla'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
