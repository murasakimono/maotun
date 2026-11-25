import { useState } from 'react';
import { Award, Camera, CheckCircle2, Compass, MapPin, Sparkles, Trash2, X } from 'lucide-react';
import type { DiscoveryPin, DiscoveryQuest, PlaceInfo } from '../types';
import { api } from '../api';
import { extractExifGps, haversineKm } from '../geo';
import { sound } from '../sound';

interface DiscoveryModalProps {
  open: boolean;
  onClose: () => void;
  place: PlaceInfo | null;
  pins: DiscoveryPin[];
  onAddPin: (pin: DiscoveryPin) => void;
  onDeletePin: (id: string) => void;
  onFlyTo: (lat: number, lon: number, zoom?: number) => void;
}

export function DiscoveryModal({
  open,
  onClose,
  place,
  pins,
  onAddPin,
  onDeletePin,
  onFlyTo,
}: DiscoveryModalProps) {
  const [quest, setQuest] = useState<DiscoveryQuest | null>(null);
  const [loadingQuest, setLoadingQuest] = useState(false);
  const [note, setNote] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!open) return null;

  const totalXp = pins.reduce((s, p) => s + p.xp, 0);
  const uniqueCities = new Set(pins.map((p) => `${p.city}-${p.country_code}`)).size;
  const rank =
    totalXp >= 1500
      ? 'Küresel Seyyah'
      : totalXp >= 600
      ? 'Usta Haritacı'
      : totalXp >= 200
      ? 'Saha Kâşifi'
      : 'Gezgin';

  const generateQuest = async () => {
    sound.playClick();
    setLoadingQuest(true);
    setStatusMsg('');
    const targetLat = place?.lat ?? 41.0082;
    const targetLon = place?.lon ?? 28.9784;
    const targetCity = place?.city ?? 'İstanbul';
    const targetCc = place?.country_code ?? 'TR';

    try {
      const [pois, wikis] = await Promise.all([
        api.getOsmNearby(targetLat, targetLon, 'quest').catch(() => []),
        api.getWikiNearby(targetLat, targetLon, targetCc).catch(() => []),
      ]);

      const pool: { title: string; lat: number; lon: number; hint: string }[] = [
        ...pois.map((p) => ({
          title: p.name,
          lat: p.lat,
          lon: p.lon,
          hint: p.extra ? `Kategori: ${p.extra}` : 'Bölgedeki tarihi / kültürel nokta',
        })),
        ...wikis.map((w) => ({
          title: w.title,
          lat: w.lat,
          lon: w.lon,
          hint: `Merkeze ${Math.round(w.dist_m)} m mesafede — Vikipedi kayıtlı nokta`,
        })),
      ];

      if (pool.length === 0) {
        setStatusMsg('Bu koordinatta kayıtlı keşif noktası bulunamadı. Başka bir ilçe seçip tekrar dene.');
      } else {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const roll = Math.random();
        const rarity: DiscoveryQuest['rarity'] =
          roll > 0.78 ? 'Gizli Hazine' : roll > 0.4 ? 'Nadir' : 'Sıradan';
        const baseXp = rarity === 'Gizli Hazine' ? 250 : rarity === 'Nadir' ? 120 : 60;
        setQuest({
          id: `q-${Date.now()}`,
          title: pick.title,
          city: targetCity,
          country_code: targetCc,
          lat: pick.lat,
          lon: pick.lon,
          rarity,
          baseXp,
          hint: pick.hint,
        });
        onFlyTo(pick.lat, pick.lon, 14.5);
      }
    } finally {
      setLoadingQuest(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const target = quest ?? {
      id: `custom-${Date.now()}`,
      title: place?.city ? `${place.city} Keşfi` : 'Özel Keşif',
      city: place?.city ?? 'İstanbul',
      country_code: place?.country_code ?? 'TR',
      lat: place?.lat ?? 41.0082,
      lon: place?.lon ?? 28.9784,
      rarity: 'Sıradan' as const,
      baseXp: 75,
      hint: '',
    };

    const exif = await extractExifGps(file);
    let gpsVerified = false;
    let bonus = 0;
    if (exif) {
      const distKm = haversineKm(exif.lat, exif.lon, target.lat, target.lon);
      if (distKm <= 3.0) {
        gpsVerified = true;
        bonus = 100;
      }
    }

    // Resize image down to a compact thumbnail so localStorage stays fast and light
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);

        const pin: DiscoveryPin = {
          id: `pin-${Date.now()}`,
          title: target.title,
          city: target.city,
          country_code: target.country_code,
          lat: exif ? exif.lat : target.lat,
          lon: exif ? exif.lon : target.lon,
          photoDataUrl: dataUrl,
          note: note.trim(),
          xp: target.baseXp + bonus,
          gpsVerified,
          createdAt: new Date().toLocaleDateString('tr-TR'),
        };
        onAddPin(pin);
        sound.playAlert();
        setNote('');
        setQuest(null);
        setStatusMsg(
          gpsVerified
            ? `Tebrikler! EXIF GPS doğrulandı: +${pin.xp} XP kazanıldı ve fotoğrafın küreye pinlendi.`
            : `Harika! +${pin.xp} XP kazanıldı ve fotoğrafın küreye pinlendi.`
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl atlas-glass rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5A952]/15 flex items-center justify-center">
              <Award className="w-5 h-5 text-[#E5A952]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#E6E8EC]">MAOTUN Keşif & Fotoğraf Pasaportu</h2>
              <p className="text-xs text-[#8E95A3]">
                Rütbe: <strong className="text-[#E5A952]">{rank}</strong> •{' '}
                <span className="font-mono-tech">{totalXp} XP</span> • {uniqueCities} farklı bölge • {pins.length} fotoğraf
              </p>
            </div>
          </div>
          <button onClick={onClose} className="atlas-btn p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Quest Generator */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#E6E8EC]">
                  Rastgele Mekân Avı ({place ? `${place.city}, ${place.country}` : 'İstanbul'})
                </div>
                <div className="text-[11px] text-[#8E95A3]">
                  Seçili ilçede gerçek bir tarihi yapı, müze veya seyir noktası bulur. Fotoğrafını yükleyince XP kazanırsın.
                </div>
              </div>
              <button
                onClick={generateQuest}
                disabled={loadingQuest}
                className="atlas-btn atlas-btn-amber px-3.5 py-2 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingQuest ? 'Aranıyor...' : 'Görev Üret'}
              </button>
            </div>

            {quest && (
              <div className="rounded-xl bg-[#0B0D11] border border-[#E5A952]/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{quest.title}</span>
                  <span className="font-mono-tech text-[11px] px-2 py-0.5 rounded-full bg-[#E5A952]/20 text-[#E5A952]">
                    {quest.rarity} • +{quest.baseXp} XP
                  </span>
                </div>
                <div className="text-xs text-[#8E95A3]">{quest.hint}</div>
                <div className="font-mono-tech text-[11px] text-[#60A5FA]">
                  {quest.lat.toFixed(5)}°N, {quest.lon.toFixed(5)}°E
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Kısa keşif notu (opsiyonel)..."
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E5A952]"
                  />
                  <label className="atlas-btn atlas-btn-amber px-3 py-1.5 cursor-pointer shrink-0">
                    <Camera className="w-3.5 h-3.5" /> Fotoğraf Yükle
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
                <div className="text-[10px] text-[#5C6372]">
                  İpucu: Telefonla çekilmiş GPS EXIF bilgili JPEG yüklersen otomatik konum doğrulanır ve +100 bonus XP verir.
                </div>
              </div>
            )}

            {!quest && (
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                <span className="text-[11px] text-[#8E95A3]">
                  Görev beklemeden bulunduğun/seçili şehre doğrudan kendi fotoğrafını da pinleyebilirsin:
                </span>
                <label className="atlas-btn px-3 py-1.5 bg-white/[0.06] cursor-pointer shrink-0">
                  <Camera className="w-3.5 h-3.5 text-[#E5A952]" /> Direkt Pinle
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            )}

            {statusMsg && (
              <div className="text-xs text-[#4ADE80] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" /> {statusMsg}
              </div>
            )}
          </div>

          {/* Passport Gallery */}
          <div>
            <div className="text-xs font-semibold text-[#C4C9D4] mb-2.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#E5A952]" /> Kişisel Fotoğraf Pasaportun ({pins.length})
            </div>
            {pins.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#5C6372] rounded-xl border border-dashed border-white/10">
                Henüz pinlenmiş keşfin yok. Yukarıdan "Görev Üret"e bas veya ilk fotoğrafını yükle.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pins.map((p) => (
                  <div key={p.id} className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden flex flex-col">
                    <img src={p.photoDataUrl} alt={p.title} className="w-full h-36 object-cover" />
                    <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#E6E8EC] truncate">{p.title}</span>
                          <span className="font-mono-tech text-[10px] text-[#E5A952] shrink-0">+{p.xp} XP</span>
                        </div>
                        <div className="text-[11px] text-[#8E95A3]">
                          {p.city} ({p.country_code}) • {p.createdAt}
                          {p.gpsVerified && <span className="text-[#4ADE80] ml-1.5">✓ GPS Doğrulandı</span>}
                        </div>
                        {p.note && <div className="text-xs text-[#C4C9D4] mt-1">{p.note}</div>}
                      </div>
                      <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                        <button
                          onClick={() => {
                            onFlyTo(p.lat, p.lon, 13);
                            onClose();
                          }}
                          className="atlas-btn px-2 py-1 text-[11px] text-[#60A5FA]"
                        >
                          <MapPin className="w-3 h-3" /> Haritada Göster
                        </button>
                        <button
                          onClick={() => onDeletePin(p.id)}
                          className="atlas-btn p-1 hover:text-[#E85D4A]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
