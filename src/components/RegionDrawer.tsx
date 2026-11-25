import React, { useState } from 'react';
import {
  Camera,
  Radio,
  Tv,
  AlertTriangle,
  Plane,
  Newspaper,
  X,
  Play,
  Plus,
  Sparkles,
  ExternalLink,
  WifiOff,
  Orbit,
} from 'lucide-react';
import { apiAiRegionBrief } from '../api';
import { HlsPlayer } from './HlsPlayer';
import type {
  DisasterItem,
  EarthquakeItem,
  FlightItem,
  LiveCamera,
  NewsItem,
  OutageItem,
  PlaceInfo,
  RadioStation,
  SatelliteItem,
  TvChannel,
} from '../types';

interface RegionDrawerProps {
  place: PlaceInfo;
  loading: boolean;
  radios: RadioStation[];
  tvChannels: TvChannel[];
  news: NewsItem[];
  outages: OutageItem[];
  flights: FlightItem[];
  satellites: SatelliteItem[];
  earthquakes: EarthquakeItem[];
  disasters: DisasterItem[];
  cameras: LiveCamera[];
  activeRadio: RadioStation | null;
  onPlayRadio: (st: RadioStation) => void;
  onAddCustomCamera: (cam: LiveCamera) => void;
  onClose: () => void;
}

type DrawerTab = 'cams' | 'radio' | 'tv' | 'alerts' | 'sky' | 'news';

export const RegionDrawer: React.FC<RegionDrawerProps> = ({
  place,
  loading,
  radios,
  tvChannels,
  news,
  outages,
  flights,
  satellites,
  earthquakes,
  disasters,
  cameras,
  activeRadio,
  onPlayRadio,
  onAddCustomCamera,
  onClose,
}) => {
  const [tab, setTab] = useState<DrawerTab>('cams');
  const [activeTv, setActiveTv] = useState<TvChannel | null>(null);
  const [activeCam, setActiveCam] = useState<LiveCamera | null>(null);
  const [customCamName, setCustomCamName] = useState('');
  const [customCamUrl, setCustomCamUrl] = useState('');

  // Optional local Ollama brief
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const localCams = cameras.filter(
    (c) => c.country_code === place.country_code || c.country_code === 'INT'
  );
  const displayCams = localCams.length > 0 ? localCams : cameras.slice(0, 4);

  const localQuakes = earthquakes
    .filter((q) => Math.hypot(q.lat - place.lat, q.lon - place.lon) < 8.5)
    .slice(0, 15);

  const runBrief = async () => {
    setAiLoading(true);
    setAiBrief(null);
    const ctx = [
      `Yakın Depremler: ${localQuakes.slice(0, 4).map((q) => `M${q.mag} ${q.title}`).join(', ') || 'Yok'}`,
      `Havadaki Uçuş Sayısı: ${flights.length}`,
      `İnternet Kesintisi Uyarısı: ${outages.length}`,
      `Son Haberler: ${news.slice(0, 4).map((n) => n.title).join(' | ') || 'Yok'}`,
    ].join('\n');
    try {
      const res = await apiAiRegionBrief(
        `${place.city}, ${place.country}`,
        ctx,
        'http://127.0.0.1:11434',
        'qwen2.5:3b'
      );
      setAiBrief(res);
    } catch (e) {
      setAiBrief(`Ollama erişilemedi (${String(e)}). Lokal AI brifingi için Ollama çalışır durumda olmalı.`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddCam = () => {
    if (!customCamName.trim() || !customCamUrl.trim()) return;
    const isHls = customCamUrl.includes('.m3u8');
    onAddCustomCamera({
      id: `custom-${Date.now()}`,
      name: customCamName.trim(),
      city: place.city,
      country_code: place.country_code,
      lat: place.lat,
      lon: place.lon,
      kind: isHls ? 'hls' : 'youtube',
      embed_url: customCamUrl.trim(),
    });
    setCustomCamName('');
    setCustomCamUrl('');
  };

  return (
    <aside className="fixed top-4 right-4 bottom-4 w-[430px] glass-console z-30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-white/10 flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-mono-tech text-sky-300 tracking-[0.22em] uppercase">
            {place.country_code} • {place.lat.toFixed(3)}, {place.lon.toFixed(3)}
          </div>
          <h2 className="text-base font-bold text-white truncate mt-0.5">{place.city}</h2>
          <div className="text-[11px] text-slate-400 truncate">{place.country}</div>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-6 border-b border-white/10 bg-black/30">
        {[
          { id: 'cams', label: 'KAM', icon: Camera },
          { id: 'radio', label: 'RADYO', icon: Radio },
          { id: 'tv', label: 'TV', icon: Tv },
          { id: 'alerts', label: 'AFET', icon: AlertTriangle },
          { id: 'sky', label: 'GÖK', icon: Plane },
          { id: 'news', label: 'HABER', icon: Newspaper },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as DrawerTab)}
              className={`py-2.5 flex flex-col items-center gap-1 text-[9px] font-mono-tech tracking-wider transition cursor-pointer border-b-2 ${
                active
                  ? 'border-sky-400 text-white bg-white/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="text-[11px] font-mono-tech text-sky-300 animate-pulse">
            Bölgesel sinyaller taranıyor...
          </div>
        )}

        {tab === 'cams' && (
          <div className="space-y-3">
            {activeCam && (
              <div className="space-y-1.5">
                {activeCam.kind === 'hls' ? (
                  <HlsPlayer url={activeCam.embed_url} title={activeCam.name} />
                ) : (
                  <div className="w-full aspect-video bg-black border border-white/10">
                    <iframe
                      src={activeCam.embed_url}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                <div className="text-[11px] font-mono-tech text-emerald-300">{activeCam.name}</div>
              </div>
            )}

            <div className="space-y-1.5">
              {displayCams.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => setActiveCam(cam)}
                  className={`w-full p-2.5 border text-left flex items-center justify-between transition cursor-pointer ${
                    activeCam?.id === cam.id
                      ? 'bg-emerald-950/35 border-emerald-500/70 text-white'
                      : 'bg-white/[0.03] border-white/10 text-slate-200 hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{cam.name}</div>
                    <div className="text-[10px] font-mono-tech text-slate-400">{cam.city} • {cam.kind.toUpperCase()}</div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              ))}
            </div>

            {/* Pin custom live stream to map */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
                BU KOORDİNATA ÖZEL KAMERA / HLS / YOUTUBE EKLE
              </div>
              <input
                value={customCamName}
                onChange={(e) => setCustomCamName(e.target.value)}
                placeholder="Kamera adı (örn: Antakya Meydan)"
                className="w-full bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
              />
              <div className="flex gap-1.5">
                <input
                  value={customCamUrl}
                  onChange={(e) => setCustomCamUrl(e.target.value)}
                  placeholder="YouTube Embed veya .m3u8 URL"
                  className="flex-1 bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                />
                <button
                  onClick={handleAddCam}
                  className="px-3 bg-sky-500/25 border border-sky-400 text-sky-200 text-xs font-mono-tech cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> EKLE
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'radio' && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono-tech text-slate-400 uppercase mb-2">
              {place.country} CANLI RADYO İSTASYONLARI ({radios.length})
            </div>
            {radios.map((r) => {
              const playing = activeRadio?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onPlayRadio(r)}
                  className={`w-full p-2.5 border text-left flex items-center justify-between transition cursor-pointer ${
                    playing
                      ? 'bg-sky-950/40 border-sky-400 text-white'
                      : 'bg-white/[0.03] border-white/10 text-slate-200 hover:border-white/25'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold truncate">{r.name}</div>
                    <div className="text-[10px] font-mono-tech text-slate-400 truncate">
                      {r.bitrate} kbps • {r.tags || r.country}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono-tech shrink-0 ${playing ? 'text-sky-300' : 'text-slate-400'}`}>
                    {playing ? '● ÇALIYOR' : 'DİNLE'}
                  </span>
                </button>
              );
            })}
            {!loading && radios.length === 0 && (
              <div className="text-xs text-slate-500 font-mono-tech">Bu bölge için radyo bulunamadı.</div>
            )}
          </div>
        )}

        {tab === 'tv' && (
          <div className="space-y-3">
            {activeTv && <HlsPlayer url={activeTv.stream_url} title={activeTv.name} />}
            <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
              {place.country_code} AÇIK CANLI TV AKIŞLARI ({tvChannels.length})
            </div>
            <div className="space-y-1.5">
              {tvChannels.map((ch, idx) => (
                <button
                  key={`${ch.name}-${idx}`}
                  onClick={() => setActiveTv(ch)}
                  className={`w-full p-2.5 border text-left flex items-center justify-between transition cursor-pointer ${
                    activeTv?.stream_url === ch.stream_url
                      ? 'bg-amber-950/35 border-amber-400 text-white'
                      : 'bg-white/[0.03] border-white/10 text-slate-200 hover:border-white/25'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold truncate">{ch.name}</div>
                    <div className="text-[10px] font-mono-tech text-slate-400">{ch.group}</div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                </button>
              ))}
              {!loading && tvChannels.length === 0 && (
                <div className="text-xs text-slate-500 font-mono-tech">Bu ülke için açık HLS kanalı bulunamadı.</div>
              )}
            </div>
          </div>
        )}

        {tab === 'alerts' && (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-mono-tech text-red-400 uppercase mb-2">
                YAKIN BÖLGE DEPREMLERİ ({localQuakes.length})
              </div>
              <div className="space-y-1.5">
                {localQuakes.map((q) => (
                  <div key={q.id} className="p-2.5 bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-white truncate">{q.title}</div>
                      <div className="text-[10px] font-mono-tech text-slate-400">
                        {q.source} • Derinlik {q.depth_km.toFixed(1)} km • {q.time_str}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 font-mono-tech font-bold text-xs ${q.mag >= 4 ? 'bg-red-500/25 text-red-300 border border-red-500/60' : 'bg-amber-500/20 text-amber-300'}`}>
                      M{q.mag.toFixed(1)}
                    </span>
                  </div>
                ))}
                {localQuakes.length === 0 && (
                  <div className="text-xs text-slate-500 font-mono-tech">Yakın çevrede son 24 saatte kayıtlı deprem yok.</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono-tech text-sky-400 uppercase mb-2 flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5" /> İNTERNET KESİNTİLERİ — IODA ({outages.length})
              </div>
              {outages.length === 0 ? (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-800/50 text-xs font-mono-tech text-emerald-300">
                  {place.country_code} genelinde aktif büyük BGP/internet kesintisi raporlanmadı.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {outages.map((o, i) => (
                    <div key={i} className="p-2.5 bg-red-950/25 border border-red-700/60 text-xs font-mono-tech text-red-200">
                      {o.entity} • {o.datasource} • Seviye: {o.level}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] font-mono-tech text-orange-400 uppercase mb-2">
                KÜRESEL DOĞAL AFETLER — NASA EONET ({disasters.length})
              </div>
              <div className="space-y-1.5">
                {disasters.slice(0, 6).map((d) => (
                  <div key={d.id} className="p-2 bg-white/[0.03] border border-white/10 text-xs">
                    <div className="text-slate-100 font-medium">{d.title}</div>
                    <div className="text-[10px] font-mono-tech text-orange-300">{d.category} • {d.date_str}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'sky' && (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-mono-tech text-purple-300 uppercase mb-2 flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5" /> CANLI YÖRÜNGE UYDULARI ({satellites.length})
              </div>
              <div className="space-y-1.5">
                {satellites.map((s) => (
                  <div key={s.id} className="p-2.5 bg-purple-950/20 border border-purple-500/30 text-xs flex justify-between">
                    <div>
                      <div className="font-semibold text-white">{s.name}</div>
                      <div className="text-[10px] font-mono-tech text-purple-300">
                        {s.lat.toFixed(2)}, {s.lon.toFixed(2)} • {Math.round(s.alt_km)} km
                      </div>
                    </div>
                    <span className="text-[10px] font-mono-tech text-slate-400">{Math.round(s.velocity_kmh)} km/s</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono-tech text-sky-300 uppercase mb-2">
                BÖLGEDEKİ CANLI UÇUŞLAR — ADS-B ({flights.length})
              </div>
              <div className="space-y-1.5">
                {flights.slice(0, 20).map((f) => (
                  <div key={f.hex} className="p-2 bg-white/[0.03] border border-white/10 text-xs flex justify-between font-mono-tech">
                    <span className="text-white font-bold">{f.callsign || f.hex}</span>
                    <span className="text-slate-400">{f.aircraft_type}</span>
                    <span className="text-sky-300">{f.alt_ft} ft</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'news' && (
          <div className="space-y-3">
            <button
              onClick={runBrief}
              disabled={aiLoading}
              className="w-full py-2 bg-sky-500/20 border border-sky-400/60 text-sky-200 text-xs font-mono-tech uppercase flex items-center justify-center gap-2 cursor-pointer hover:bg-sky-500/30 disabled:opacity-40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiLoading ? 'OLLAMA ANALİZ EDİYOR...' : 'LOKAL AI BÖLGE BRİFİNGİ OLUŞTUR'}
            </button>

            {aiBrief && (
              <div className="p-3 bg-sky-950/30 border border-sky-500/50 text-xs text-slate-100 leading-relaxed">
                {aiBrief}
              </div>
            )}

            <div className="text-[10px] font-mono-tech text-slate-400 uppercase">
              CANLI HABER AKIŞI — GDELT 2.0 ({news.length})
            </div>
            <div className="space-y-2">
              {news.map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2.5 bg-white/[0.03] border border-white/10 hover:border-sky-400/60 transition"
                >
                  <div className="text-xs text-slate-100 leading-snug">{n.title}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono-tech text-slate-400">
                    <span>{n.domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </a>
              ))}
              {!loading && news.length === 0 && (
                <div className="text-xs text-slate-500 font-mono-tech">Bu bölge için anlık haber dönmedi.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
