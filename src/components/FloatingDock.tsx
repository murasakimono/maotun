import { useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  Bookmark,
  Camera,
  Command,
  Compass,
  Flame,
  Globe,
  Grid2x2,
  Map,
  MapPin,
  Orbit,
  Radio,
  Ruler,
  Settings,
  TrainFront,
  Tv,
  Volume2,
  Wrench,
} from 'lucide-react';
import type { LayerState, SavedPreset } from '../types';
import type { AmbientMode } from '../ambient';
import { sound } from '../sound';

type GroupId = 'nature' | 'sky' | 'city' | 'media' | 'quest' | 'tools' | null;

interface FloatingDockProps {
  layers: LayerState;
  onToggleLayer: (k: keyof LayerState) => void;
  counts: {
    eq: number;
    disasters: number;
    flights: number;
    mil: number;
    sats: number;
    rockets: number;
    fireballs: number;
    kiwisdr: number;
    tor: number;
    ships: number;
    fires: number;
    cams: number;
    discoveries: number;
    visitedCount: number;
  };
  ambientMode: AmbientMode;
  onChangeAmbient: (m: AmbientMode) => void;
  presets: SavedPreset[];
  onApplyPreset: (p: SavedPreset) => void;
  onSaveCurrentPreset: () => void;
  measureMode: boolean;
  onToggleMeasure: () => void;
  autopilot: boolean;
  onToggleAutopilot: () => void;
  wikiPulseOpen: boolean;
  onToggleWikiPulse: () => void;
  onOpenWall: () => void;
  onOpenRadio: () => void;
  onOpenTv: () => void;
  onOpenDiscovery: () => void;
  onOpenTurkeyFog: () => void;
  onOpenCompare: () => void;
  onOpenAlerts: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
}

export function FloatingDock({
  layers,
  onToggleLayer,
  counts,
  ambientMode,
  onChangeAmbient,
  presets,
  onApplyPreset,
  onSaveCurrentPreset,
  measureMode,
  onToggleMeasure,
  autopilot,
  onToggleAutopilot,
  wikiPulseOpen,
  onToggleWikiPulse,
  onOpenWall,
  onOpenRadio,
  onOpenTv,
  onOpenDiscovery,
  onOpenTurkeyFog,
  onOpenCompare,
  onOpenAlerts,
  onOpenPalette,
  onOpenSettings,
}: FloatingDockProps) {
  const [openGroup, setOpenGroup] = useState<GroupId>(null);

  const toggleGroup = (g: GroupId) => {
    sound.playClick();
    setOpenGroup((cur) => (cur === g ? null : g));
  };

  const ToggleRow = ({
    layerKey,
    label,
    sub,
    count,
    dot,
  }: {
    layerKey: keyof LayerState;
    label: string;
    sub?: string;
    count?: number;
    dot: string;
  }) => {
    const on = layers[layerKey];
    return (
      <button
        onClick={() => onToggleLayer(layerKey)}
        className="w-full px-3 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/[0.06] transition text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0 transition"
            style={{ backgroundColor: on ? dot : 'rgba(255,255,255,0.16)' }}
          />
          <div className="min-w-0">
            <div className={`text-xs font-medium ${on ? 'text-[#E6E8EC]' : 'text-[#8E95A3]'}`}>
              {label}
            </div>
            {sub && <div className="text-[10px] text-[#5C6372]">{sub}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {typeof count === 'number' && (
            <span className="font-mono-tech text-[10px] text-[#8E95A3]">{count}</span>
          )}
          <span
            className={`w-7 h-4 rounded-full p-0.5 transition flex items-center ${
              on ? 'bg-[#E5A952] justify-end' : 'bg-white/10 justify-start'
            }`}
          >
            <span className="w-3 h-3 rounded-full bg-[#090B0E]" />
          </span>
        </div>
      </button>
    );
  };

  const groups: { id: Exclude<GroupId, null>; label: string; icon: React.ReactNode }[] = [
    { id: 'nature', label: 'Doğa', icon: <Flame className="w-4 h-4" /> },
    { id: 'sky', label: 'Gökyüzü', icon: <Orbit className="w-4 h-4" /> },
    { id: 'city', label: 'Şehir & Ağ', icon: <TrainFront className="w-4 h-4" /> },
    { id: 'media', label: 'Medya', icon: <Camera className="w-4 h-4" /> },
    { id: 'quest', label: 'Keşif', icon: <MapPin className="w-4 h-4" /> },
    { id: 'tools', label: 'Araçlar', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2.5">
      {openGroup && (
        <div className="w-[345px] max-w-[92vw] atlas-glass rounded-2xl p-2 space-y-0.5 max-h-[70vh] overflow-y-auto">
          {openGroup === 'nature' && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#E5A952]">
                Doğa, Atmosfer & Uydu Görüntüsü
              </div>
              <ToggleRow layerKey="earthquakes" label="Depremler (Kandilli + AFAD + USGS)" count={counts.eq} dot="#E85D4A" />
              <ToggleRow layerKey="faults" label="Türkiye Aktif Fay Hatları (KAF/DAF)" dot="#EF4444" />
              <ToggleRow layerKey="disasters" label="NASA EONET Küresel Afetler" count={counts.disasters} dot="#F97316" />
              <ToggleRow layerKey="windFlow" label="Canlı Rüzgâr Akış Çizgileri" sub="Animasyonlu akışkan parçacık" dot="#93C5FD" />
              <ToggleRow layerKey="tempHeat" label="Küresel Sıcaklık Isı Haritası" sub="Open-Meteo anlık termal" dot="#E5A952" />
              <ToggleRow layerKey="radar" label="RainViewer Canlı Yağış Radarı" sub="Zaman kaydırıcılı" dot="#60A5FA" />
              <ToggleRow layerKey="nasaGibs" label="NASA GIBS Günlük Uydu Fotoğrafı" dot="#4ADE80" />
              <ToggleRow layerKey="fires" label="NASA FIRMS Termal Yangınlar" count={counts.fires} dot="#EF4444" />
            </>
          )}

          {openGroup === 'sky' && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#E5A952]">
                Havacılık, Havalimanları & Uzay
              </div>
              <ToggleRow layerKey="flights" label="Canlı Sivil Uçuşlar (Yönlü İkon)" count={counts.flights} dot="#60A5FA" />
              <ToggleRow layerKey="military" label="Askerî & Özel (MIL / LADD / PIA)" count={counts.mil} dot="#E5A952" />
              <ToggleRow layerKey="flightTrails" label="Canlı Uçuş İzleri (Flight Trails)" dot="#93C5FD" />
              <ToggleRow layerKey="airports" label="Havalimanı Kalkış/İniş Panoları" sub="IST, SAW, LHR, JFK, HND..." dot="#E5A952" />
              <ToggleRow layerKey="satellites" label="SGP4 Canlı Uydular (90 dk Yörünge)" count={counts.sats} dot="#E6E8EC" />
              <ToggleRow layerKey="rockets" label="Yaklaşan Roket Fırlatmaları" count={counts.rockets} dot="#F59E0B" />
              <ToggleRow layerKey="fireballs" label="NASA JPL Meteor / Ateş Topları" count={counts.fireballs} dot="#FB7185" />
              <ToggleRow layerKey="aurora" label="NOAA Canlı Aurora Ovali" dot="#4ADE80" />
            </>
          )}

          {openGroup === 'city' && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#E5A952]">
                Şehir Altyapısı, Deniz & Sinyal Ağı
              </div>
              <ToggleRow layerKey="railways" label="Global & TR Metro / Raylı Sistem Ağı" dot="#34D399" />
              <ToggleRow layerKey="cables" label="Denizaltı Fiber Optik Kablolar" dot="#60A5FA" />
              <ToggleRow layerKey="kiwisdr" label="KiwiSDR Kısa Dalga Alıcıları" count={counts.kiwisdr} dot="#C084FC" />
              <ToggleRow layerKey="tor" label="Tor Onionoo Canlı Ağ Düğümleri" count={counts.tor} dot="#A855F7" />
              <ToggleRow layerKey="ships" label="Canlı AIS Deniz Trafiği" count={counts.ships} dot="#38BDF8" />
              <div className="h-px bg-white/10 my-1" />
              <ToggleRow layerKey="terminator" label="Gerçek Zamanlı Gece / Gündüz Çizgisi" dot="#E5A952" />
              <ToggleRow layerKey="terrain" label="3D Arazi Kabartması (Terrain DEM)" dot="#9CA3AF" />
            </>
          )}

          {openGroup === 'media' && (
            <div className="p-1 space-y-2">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#E5A952]">
                Canlı Kameralar, Radyo, TV & Ses Manzarası
              </div>
              <ToggleRow layerKey="cameras" label="Haritada 180+ Canlı Kamera Pinleri" count={counts.cams} dot="#4ADE80" />
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => { setOpenGroup(null); onOpenWall(); }} className="atlas-btn flex-col py-2 bg-white/[0.04]">
                  <Grid2x2 className="w-4 h-4 text-[#4ADE80]" />
                  <span className="text-[11px]">6'lı Duvar</span>
                </button>
                <button onClick={() => { setOpenGroup(null); onOpenRadio(); }} className="atlas-btn flex-col py-2 bg-white/[0.04]">
                  <Radio className="w-4 h-4 text-[#60A5FA]" />
                  <span className="text-[11px]">Radyolar</span>
                </button>
                <button onClick={() => { setOpenGroup(null); onOpenTv(); }} className="atlas-btn flex-col py-2 bg-white/[0.04]">
                  <Tv className="w-4 h-4 text-[#E5A952]" />
                  <span className="text-[11px]">Canlı TV</span>
                </button>
              </div>
              <div className="pt-2 border-t border-white/10 px-1 space-y-1.5">
                <div className="text-[10px] text-[#8E95A3] flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3 text-[#E5A952]" /> Şehir Ses Manzarası (Ambient)
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(
                    [
                      ['off', 'Kapalı'],
                      ['rain', 'Yağmur'],
                      ['sea', 'Boğaz'],
                      ['city', 'Şehir'],
                      ['wind', 'Rüzgâr'],
                    ] as [AmbientMode, string][]
                  ).map(([m, lbl]) => (
                    <button
                      key={m}
                      onClick={() => { sound.playClick(); onChangeAmbient(m); }}
                      className={`py-1.5 rounded-lg text-[10px] transition cursor-pointer ${
                        ambientMode === m
                          ? 'bg-[#E5A952] text-[#090B0E] font-semibold'
                          : 'bg-white/[0.05] text-[#C4C9D4] hover:bg-white/[0.1]'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {openGroup === 'quest' && (
            <div className="p-1 space-y-1.5">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#E5A952]">
                Keşif Pasaportu & 81 İl Türkiye Sisi Kaldır
              </div>
              <ToggleRow layerKey="discoveries" label="Kendi Altın Fotoğraf Pinlerim" count={counts.discoveries} dot="#FBBF24" />
              <ToggleRow layerKey="turkeyFog" label="Türkiye 81 İl Keşif Haritası" count={counts.visitedCount} dot="#E5A952" />
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => { setOpenGroup(null); onOpenDiscovery(); }}
                  className="atlas-btn atlas-btn-amber py-2 text-xs"
                >
                  <MapPin className="w-3.5 h-3.5" /> Fotoğraf Pasaportu
                </button>
                <button
                  onClick={() => { setOpenGroup(null); onOpenTurkeyFog(); }}
                  className="atlas-btn py-2 bg-white/[0.06] text-xs"
                >
                  <Map className="w-3.5 h-3.5 text-[#E5A952]" /> 81 İl ({counts.visitedCount}/81)
                </button>
              </div>
            </div>
          )}

          {openGroup === 'tools' && (
            <div className="p-1 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#E5A952]">
                Araçlar, Karşılaştırma & Profiller
              </div>
              <button
                onClick={() => { setOpenGroup(null); onOpenCompare(); }}
                className="w-full atlas-btn justify-between px-3 py-2 bg-white/[0.04]"
              >
                <span className="flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-[#E5A952]" /> Canlı Bölge Karşılaştır</span>
                <span className="text-[10px] text-[#8E95A3]">2 Şehir</span>
              </button>
              <button
                onClick={() => { sound.playToggle(!measureMode); onToggleMeasure(); setOpenGroup(null); }}
                className={`w-full atlas-btn justify-between px-3 py-2 ${measureMode ? 'bg-[#E5A952]/20 text-[#E5A952]' : ''}`}
              >
                <span className="flex items-center gap-2"><Ruler className="w-4 h-4" /> 2 Nokta Mesafe & Uçuş Ölçeri</span>
                <span className="font-mono-tech text-[10px]">{measureMode ? 'AKTİF' : 'KAPALI'}</span>
              </button>
              <button
                onClick={() => { sound.playToggle(!autopilot); onToggleAutopilot(); setOpenGroup(null); }}
                className={`w-full atlas-btn justify-between px-3 py-2 ${autopilot ? 'bg-[#E5A952]/20 text-[#E5A952]' : ''}`}
              >
                <span className="flex items-center gap-2"><Compass className="w-4 h-4" /> Sinematik Otopilot Turu</span>
                <span className="font-mono-tech text-[10px]">{autopilot ? 'AÇIK' : 'KAPALI'}</span>
              </button>
              <button
                onClick={() => { sound.playToggle(!wikiPulseOpen); onToggleWikiPulse(); setOpenGroup(null); }}
                className={`w-full atlas-btn justify-between px-3 py-2 ${wikiPulseOpen ? 'bg-[#E5A952]/20 text-[#E5A952]' : ''}`}
              >
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Canlı Vikipedi Nabzı</span>
                <span className="font-mono-tech text-[10px]">{wikiPulseOpen ? 'AÇIK' : 'KAPALI'}</span>
              </button>

              {/* Offline Favorite Profiles / Presets */}
              <div className="pt-1.5 mt-1 border-t border-white/10 px-1 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-[#8E95A3]">
                  <span className="flex items-center gap-1"><Bookmark className="w-3 h-3 text-[#E5A952]" /> Hızlı Profiller</span>
                  <button onClick={onSaveCurrentPreset} className="text-[#E5A952] hover:underline cursor-pointer">
                    + Mevcut Görünümü Kaydet
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { sound.playClick(); onApplyPreset(p); setOpenGroup(null); }}
                      className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-[#E5A952]/20 hover:text-[#E5A952] text-[10px] text-[#C4C9D4] cursor-pointer"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/10">
                <button onClick={() => { setOpenGroup(null); onOpenPalette(); }} className="atlas-btn flex-col py-1.5 bg-white/[0.04]">
                  <Command className="w-3.5 h-3.5 text-[#E5A952]" />
                  <span className="text-[10px]">Ctrl+K</span>
                </button>
                <button onClick={() => { setOpenGroup(null); onOpenAlerts(); }} className="atlas-btn flex-col py-1.5 bg-white/[0.04]">
                  <Bell className="w-3.5 h-3.5 text-[#E85D4A]" />
                  <span className="text-[10px]">Alarmlar</span>
                </button>
                <button onClick={() => { setOpenGroup(null); onOpenSettings(); }} className="atlas-btn flex-col py-1.5 bg-white/[0.04]">
                  <Settings className="w-3.5 h-3.5 text-[#8E95A3]" />
                  <span className="text-[10px]">Ayarlar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="atlas-pill rounded-2xl px-2 py-1.5 flex items-center gap-1">
        {groups.map((g) => {
          const active = openGroup === g.id;
          return (
            <button
              key={g.id}
              onClick={() => toggleGroup(g.id)}
              className={`atlas-btn px-3 py-2 rounded-xl ${
                active ? 'bg-[#E5A952]/18 text-[#E5A952]' : 'text-[#C4C9D4]'
              }`}
            >
              {g.icon}
              <span className="hidden sm:inline text-xs">{g.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
