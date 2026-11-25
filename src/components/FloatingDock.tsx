import { useState } from 'react';
import {
  Bell,
  Camera,
  Command,
  Compass,
  Flame,
  Globe,
  Grid2x2,
  MapPin,
  Orbit,
  Radio,
  Ruler,
  Settings,
  TrainFront,
  Tv,
  Wrench,
} from 'lucide-react';
import type { LayerState } from '../types';
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
  };
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
  onOpenAlerts: () => void;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
}

export function FloatingDock({
  layers,
  onToggleLayer,
  counts,
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
        className="w-full px-3 py-2 rounded-lg flex items-center justify-between hover:bg-white/[0.06] transition text-left cursor-pointer"
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
      {/* Popover Panel Above Dock */}
      {openGroup && (
        <div className="w-[330px] max-w-[92vw] atlas-glass rounded-2xl p-2 space-y-0.5">
          {openGroup === 'nature' && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#E5A952]">
                Doğa, Sismik & Uydu Görüntüsü
              </div>
              <ToggleRow layerKey="earthquakes" label="Depremler (Kandilli + AFAD + USGS)" count={counts.eq} dot="#E85D4A" />
              <ToggleRow layerKey="faults" label="Türkiye Aktif Fay Hatları (KAF/DAF)" dot="#EF4444" />
              <ToggleRow layerKey="disasters" label="NASA EONET Küresel Afetler" count={counts.disasters} dot="#F97316" />
              <ToggleRow layerKey="radar" label="RainViewer Canlı Yağış Radarı" sub="Zaman kaydırıcılı" dot="#60A5FA" />
              <ToggleRow layerKey="nasaGibs" label="NASA GIBS Günlük Uydu Fotoğrafı" sub="Gerçek bulut & True Color" dot="#4ADE80" />
              <ToggleRow layerKey="fires" label="NASA FIRMS Termal Yangınlar" count={counts.fires} dot="#EF4444" />
            </>
          )}

          {openGroup === 'sky' && (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#E5A952]">
                Havacılık, Yörünge & Uzay
              </div>
              <ToggleRow layerKey="flights" label="Canlı Sivil Uçuşlar (adsb.lol)" count={counts.flights} dot="#60A5FA" />
              <ToggleRow layerKey="military" label="Askerî & Özel (MIL / LADD / PIA)" count={counts.mil} dot="#E5A952" />
              <ToggleRow layerKey="satellites" label="SGP4 Canlı Uydular (ISS, Starlink, GPS)" count={counts.sats} dot="#E6E8EC" />
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
              <ToggleRow layerKey="railways" label="Global & TR Metro / Raylı Sistem Ağı" sub="OpenRailwayMap" dot="#34D399" />
              <ToggleRow layerKey="cables" label="Denizaltı Fiber Optik Kablolar" dot="#60A5FA" />
              <ToggleRow layerKey="kiwisdr" label="KiwiSDR Kısa Dalga Radyo Alıcıları" count={counts.kiwisdr} dot="#C084FC" />
              <ToggleRow layerKey="tor" label="Tor Onionoo Canlı Ağ Düğümleri" count={counts.tor} dot="#A855F7" />
              <ToggleRow layerKey="ships" label="Canlı AIS Deniz Trafiği" count={counts.ships} dot="#38BDF8" />
              <div className="h-px bg-white/10 my-1" />
              <ToggleRow layerKey="terminator" label="Gerçek Zamanlı Gece / Gündüz Çizgisi" dot="#E5A952" />
              <ToggleRow layerKey="terrain" label="3D Arazi Kabartması (Terrain DEM)" dot="#9CA3AF" />
            </>
          )}

          {openGroup === 'media' && (
            <div className="p-1 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#E5A952]">
                Canlı Kameralar, Radyo & TV
              </div>
              <ToggleRow layerKey="cameras" label="Haritada 180+ Canlı Kamera Pinleri" count={counts.cams} dot="#4ADE80" />
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => { setOpenGroup(null); onOpenWall(); }}
                  className="atlas-btn flex-col py-2.5 bg-white/[0.04]"
                >
                  <Grid2x2 className="w-4 h-4 text-[#4ADE80]" />
                  <span className="text-[11px]">6'lı Duvar</span>
                </button>
                <button
                  onClick={() => { setOpenGroup(null); onOpenRadio(); }}
                  className="atlas-btn flex-col py-2.5 bg-white/[0.04]"
                >
                  <Radio className="w-4 h-4 text-[#60A5FA]" />
                  <span className="text-[11px]">Radyolar</span>
                </button>
                <button
                  onClick={() => { setOpenGroup(null); onOpenTv(); }}
                  className="atlas-btn flex-col py-2.5 bg-white/[0.04]"
                >
                  <Tv className="w-4 h-4 text-[#E5A952]" />
                  <span className="text-[11px]">Canlı TV</span>
                </button>
              </div>
            </div>
          )}

          {openGroup === 'quest' && (
            <div className="p-1 space-y-1.5">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#E5A952]">
                MAOTUN Keşif & Fotoğraf Pasaportu
              </div>
              <ToggleRow layerKey="discoveries" label="Kendi Altın Fotoğraf Pinlerim" count={counts.discoveries} dot="#FBBF24" />
              <button
                onClick={() => { setOpenGroup(null); onOpenDiscovery(); }}
                className="w-full atlas-btn atlas-btn-amber py-2.5 mt-1"
              >
                <MapPin className="w-4 h-4" /> Pasaportu & Keşif Görevini Aç
              </button>
            </div>
          )}

          {openGroup === 'tools' && (
            <div className="p-1 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-[#E5A952]">
                Araçlar & Komuta
              </div>
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
                <span className="flex items-center gap-2"><Compass className="w-4 h-4" /> Sinematik Otopilot Vitrin Turu</span>
                <span className="font-mono-tech text-[10px]">{autopilot ? 'AÇIK' : 'KAPALI'}</span>
              </button>
              <button
                onClick={() => { sound.playToggle(!wikiPulseOpen); onToggleWikiPulse(); setOpenGroup(null); }}
                className={`w-full atlas-btn justify-between px-3 py-2 ${wikiPulseOpen ? 'bg-[#E5A952]/20 text-[#E5A952]' : ''}`}
              >
                <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Canlı Vikipedi Nabzı (SSE)</span>
                <span className="font-mono-tech text-[10px]">{wikiPulseOpen ? 'AÇIK' : 'KAPALI'}</span>
              </button>
              <div className="h-px bg-white/10 my-1" />
              <div className="grid grid-cols-3 gap-1.5">
                <button onClick={() => { setOpenGroup(null); onOpenPalette(); }} className="atlas-btn flex-col py-2 bg-white/[0.04]">
                  <Command className="w-3.5 h-3.5 text-[#E5A952]" />
                  <span className="text-[10px]">Ctrl+K</span>
                </button>
                <button onClick={() => { setOpenGroup(null); onOpenAlerts(); }} className="atlas-btn flex-col py-2 bg-white/[0.04]">
                  <Bell className="w-3.5 h-3.5 text-[#E85D4A]" />
                  <span className="text-[10px]">Alarmlar</span>
                </button>
                <button onClick={() => { setOpenGroup(null); onOpenSettings(); }} className="atlas-btn flex-col py-2 bg-white/[0.04]">
                  <Settings className="w-3.5 h-3.5 text-[#8E95A3]" />
                  <span className="text-[10px]">Ayarlar</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Minimalist Floating Dock */}
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
