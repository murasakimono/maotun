import { useState } from 'react';
import { Check, Download, Map, X } from 'lucide-react';
import { TURKEY_81, type TurkeyProvince } from '../data/turkey81';
import { sound } from '../sound';

interface TurkeyFogModalProps {
  open: boolean;
  onClose: () => void;
  visitedPlakas: string[];
  onToggleProvince: (plaka: string) => void;
  onFlyTo: (lat: number, lon: number, zoom?: number) => void;
}

const REGIONS: ('Tümü' | TurkeyProvince['region'])[] = [
  'Tümü',
  'Marmara',
  'Ege',
  'Akdeniz',
  'İç Anadolu',
  'Karadeniz',
  'Doğu Anadolu',
  'Güneydoğu Anadolu',
];

export function TurkeyFogModal({
  open,
  onClose,
  visitedPlakas,
  onToggleProvince,
  onFlyTo,
}: TurkeyFogModalProps) {
  const [region, setRegion] = useState<'Tümü' | TurkeyProvince['region']>('Tümü');

  if (!open) return null;

  const visitedSet = new Set(visitedPlakas);
  const pct = ((visitedPlakas.length / 81) * 100).toFixed(1);
  const totalDistricts = TURKEY_81.filter((p) => visitedSet.has(p.plaka)).reduce(
    (acc, p) => acc + p.districts,
    0
  );
  const filtered = region === 'Tümü' ? TURKEY_81 : TURKEY_81.filter((p) => p.region === region);

  const exportPng = () => {
    sound.playClick();
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const g = canvas.getContext('2d');
    if (!g) return;

    g.fillStyle = '#090B0E';
    g.fillRect(0, 0, 1200, 675);

    g.fillStyle = '#E5A952';
    g.font = 'bold 28px sans-serif';
    g.fillText('MAOTUN // TÜRKİYE KEŞİF PASAPORTU', 48, 62);

    g.fillStyle = '#E6E8EC';
    g.font = 'bold 46px monospace';
    g.fillText(`%${pct}  (${visitedPlakas.length} / 81 İl)`, 48, 124);

    g.fillStyle = '#8E95A3';
    g.font = '18px sans-serif';
    g.fillText(`Kapsanan Tahmini İlçe Havuzu: ${totalDistricts} / 973 • ${new Date().toLocaleDateString('tr-TR')}`, 48, 158);

    // Draw stylized map dots of 81 provinces
    TURKEY_81.forEach((p) => {
      const x = 80 + ((p.lon - 25.5) / 19.5) * 1040;
      const y = 590 - ((p.lat - 35.8) / 6.6) * 380;
      const on = visitedSet.has(p.plaka);
      g.beginPath();
      g.arc(x, y, on ? 9 : 4.5, 0, Math.PI * 2);
      g.fillStyle = on ? '#E5A952' : 'rgba(255,255,255,0.16)';
      g.fill();
      if (on) {
        g.fillStyle = '#E6E8EC';
        g.font = '11px sans-serif';
        g.fillText(p.name, x + 12, y + 4);
      }
    });

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `maotun-turkiye-kesif-${visitedPlakas.length}-81.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl atlas-glass rounded-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5A952]/15 flex items-center justify-center">
              <Map className="w-5 h-5 text-[#E5A952]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">81 İl Türkiye Sisi Kaldır & Seyahat İstatistikleri</h2>
              <p className="text-xs text-[#8E95A3]">
                <strong className="text-[#E5A952] font-mono-tech">%{pct}</strong> keşfedildi ({visitedPlakas.length}/81 il • ~{totalDistricts}/973 ilçe)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportPng} className="atlas-btn atlas-btn-amber px-3 py-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> PNG Kart İndir
            </button>
            <button onClick={onClose} className="atlas-btn p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-5 pt-3">
          <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden">
            <div className="h-full bg-[#E5A952] transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Region Filter Pills */}
        <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b border-white/[0.08]">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => { sound.playClick(); setRegion(r); }}
              className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                region === r
                  ? 'bg-[#E5A952] text-[#090B0E] font-semibold'
                  : 'bg-white/[0.05] text-[#C4C9D4] hover:bg-white/[0.1]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* 81 Province Grid */}
        <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filtered.map((p) => {
            const on = visitedSet.has(p.plaka);
            return (
              <div
                key={p.plaka}
                className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 transition ${
                  on
                    ? 'bg-[#E5A952]/15 border-[#E5A952]/50 text-white'
                    : 'bg-white/[0.025] border-white/[0.07] text-[#8E95A3] hover:bg-white/[0.06]'
                }`}
              >
                <button
                  onClick={() => {
                    sound.playToggle(!on);
                    onToggleProvince(p.plaka);
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                >
                  <span className="font-mono-tech text-[10px] opacity-70">{p.plaka}</span>
                  <span className="text-xs font-medium truncate">{p.name}</span>
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onFlyTo(p.lat, p.lon, 8.2);
                    onClose();
                  }}
                  title="Haritada göster"
                  className="shrink-0 cursor-pointer"
                >
                  {on ? <Check className="w-3.5 h-3.5 text-[#E5A952]" /> : <span className="text-[10px] opacity-40">→</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
