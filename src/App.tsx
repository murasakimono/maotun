import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Radio,
  Video,
  Bell,
  Activity,
  Flame,
  Plane,
  Orbit,
  Camera,
  Volume2,
  Square,
  RefreshCw,
} from 'lucide-react';
import {
  apiGetDisasters,
  apiGetEarthquakes,
  apiGetFlights,
  apiGetNews,
  apiGetOutages,
  apiGetRadios,
  apiGetSatellites,
  apiGetTvChannels,
  apiReverseGeocode,
  apiSearchPlace,
} from './api';
import { DEFAULT_CAMERAS, QUICK_CITIES } from './cameras';
import { GlobeMap } from './components/GlobeMap';
import { RegionDrawer } from './components/RegionDrawer';
import { MultiCamWall } from './components/MultiCamWall';
import { AlertModal } from './components/AlertModal';
import type {
  AlertRule,
  DisasterItem,
  EarthquakeItem,
  FlightItem,
  LayerState,
  LiveCamera,
  NewsItem,
  OutageItem,
  PlaceInfo,
  RadioStation,
  SatelliteItem,
  TvChannel,
} from './types';

const DEFAULT_ALERTS: AlertRule[] = [
  { id: 'r-tr', label: 'Türkiye / Hatay Deprem Alarmı', keyword: 'HATAY', minMag: 3.5, enabled: true },
  { id: 'r-global', label: 'Küresel Büyük Deprem (M ≥ 5.5)', keyword: '', minMag: 5.5, enabled: true },
];

export function App() {
  const [earthquakes, setEarthquakes] = useState<EarthquakeItem[]>([]);
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [satellites, setSatellites] = useState<SatelliteItem[]>([]);
  const [cameras, setCameras] = useState<LiveCamera[]>(() => {
    try {
      const saved = localStorage.getItem('maotun_custom_cams');
      return saved ? [...DEFAULT_CAMERAS, ...(JSON.parse(saved) as LiveCamera[])] : DEFAULT_CAMERAS;
    } catch {
      return DEFAULT_CAMERAS;
    }
  });

  const [layers, setLayers] = useState<LayerState>({
    earthquakes: true,
    disasters: true,
    flights: true,
    satellites: true,
    cameras: true,
  });

  // Search
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceInfo[]>([]);

  // Active Region Inspector
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom: number; ts: number } | null>(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [radios, setRadios] = useState<RadioStation[]>([]);
  const [tvChannels, setTvChannels] = useState<TvChannel[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [outages, setOutages] = useState<OutageItem[]>([]);

  // Persistent Live Radio Audio Player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeRadio, setActiveRadio] = useState<RadioStation | null>(null);

  // Modals
  const [showCamWall, setShowCamWall] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    try {
      const raw = localStorage.getItem('maotun_alerts');
      return raw ? (JSON.parse(raw) as AlertRule[]) : DEFAULT_ALERTS;
    } catch {
      return DEFAULT_ALERTS;
    }
  });

  const refreshGlobalFeeds = async () => {
    const [q, d, s, f] = await Promise.all([
      apiGetEarthquakes().catch(() => []),
      apiGetDisasters().catch(() => []),
      apiGetSatellites().catch(() => []),
      apiGetFlights(41.0082, 28.9784, 180).catch(() => []),
    ]);
    setEarthquakes(q);
    setDisasters(d);
    setSatellites(s);
    setFlights(f);
  };

  useEffect(() => {
    refreshGlobalFeeds();
    const t = setInterval(() => {
      apiGetSatellites().then(setSatellites).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const inspectCoords = async (lat: number, lon: number, presetPlace?: PlaceInfo) => {
    setSelectedCoords({ lat, lon });
    setRegionLoading(true);
    const place = presetPlace ?? (await apiReverseGeocode(lat, lon));
    setSelectedPlace(place);

    const [rList, tvList, nList, oList, fList] = await Promise.all([
      apiGetRadios(place.country_code, place.city).catch(() => []),
      apiGetTvChannels(place.country_code).catch(() => []),
      apiGetNews(place.city || place.country).catch(() => []),
      apiGetOutages(place.country_code).catch(() => []),
      apiGetFlights(lat, lon, 160).catch(() => []),
    ]);

    setRadios(rList);
    setTvChannels(tvList);
    setNews(nList);
    setOutages(oList);
    if (fList.length > 0) setFlights(fList);
    setRegionLoading(false);
  };

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    const res = await apiSearchPlace(searchText.trim()).catch(() => []);
    setSearchResults(res);
  };

  const handlePlayRadio = (station: RadioStation) => {
    if (!audioRef.current) return;
    if (activeRadio?.id === station.id) {
      audioRef.current.pause();
      setActiveRadio(null);
      return;
    }
    audioRef.current.src = station.stream_url;
    audioRef.current.play().catch(() => {});
    setActiveRadio(station);
  };

  const triggeredCount = earthquakes.filter((q) =>
    alertRules.some(
      (r) =>
        r.enabled &&
        q.mag >= r.minMag &&
        (r.keyword.trim() === '' || q.title.toLowerCase().includes(r.keyword.toLowerCase()))
    )
  ).length;

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#05070A]">
      <audio ref={audioRef} />

      {/* 100% Full-Bleed Interactive 3D World Globe */}
      <GlobeMap
        earthquakes={earthquakes}
        disasters={disasters}
        flights={flights}
        satellites={satellites}
        cameras={cameras}
        layers={layers}
        selectedCoords={selectedCoords}
        flyTarget={flyTarget}
        onMapClick={(lat, lon) => inspectCoords(lat, lon)}
        onSelectCamera={(cam) => {
          setFlyTarget({ lat: cam.lat, lon: cam.lon, zoom: 11, ts: Date.now() });
          inspectCoords(cam.lat, cam.lon, {
            display_name: cam.name,
            city: cam.city,
            country: cam.country_code,
            country_code: cam.country_code,
            lat: cam.lat,
            lon: cam.lon,
          });
        }}
      />

      {/* Floating Top-Left: Brand + Semt/Şehir Search + Quick Cities */}
      <div className="fixed top-4 left-4 z-20 flex flex-col gap-2 w-[380px]">
        <div className="glass-console px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_12px_#38bdf8]" />
            <div>
              <div className="text-xs font-bold tracking-[0.26em] text-white uppercase">MAOTUN</div>
              <div className="text-[9px] font-mono-tech text-slate-400">
                CANLI DÜNYA SİNYAL KONSOLU • {earthquakes.length} DEPREM • {flights.length} UÇUŞ
              </div>
            </div>
          </div>
          <button
            onClick={refreshGlobalFeeds}
            title="Canlı Verileri Yenile"
            className="p-1.5 text-slate-400 hover:text-sky-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="glass-console flex items-center px-3 py-2 gap-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Semt, şehir veya ülke ara (örn: Kadıköy, Antakya, Tokyo)..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            className="text-[10px] font-mono-tech text-sky-300 hover:text-white uppercase cursor-pointer"
          >
            GİT
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="glass-console divide-y divide-white/10 max-h-52 overflow-y-auto">
            {searchResults.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setSearchResults([]);
                  setSearchText('');
                  setFlyTarget({ lat: p.lat, lon: p.lon, zoom: 11.5, ts: Date.now() });
                  inspectCoords(p.lat, p.lon, p);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/5 text-xs text-slate-200 cursor-pointer"
              >
                <div className="font-semibold text-white">{p.city}</div>
                <div className="text-[10px] text-slate-400 truncate">{p.display_name}</div>
              </button>
            ))}
          </div>
        )}

        {/* Quick Cities Strip */}
        <div className="flex flex-wrap gap-1">
          {QUICK_CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => {
                setFlyTarget({ lat: c.lat, lon: c.lon, zoom: c.zoom, ts: Date.now() });
                inspectCoords(c.lat, c.lon, {
                  display_name: c.name,
                  city: c.name,
                  country: c.cc === 'TR' ? 'Türkiye' : c.cc,
                  country_code: c.cc,
                  lat: c.lat,
                  lon: c.lon,
                });
              }}
              className="px-2 py-1 glass-console text-[10px] font-mono-tech text-slate-300 hover:text-sky-300 cursor-pointer transition"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Bottom-Left: Layer Toggles + Multi-Cam Wall + Smart Alerts + Live Radio Tuner */}
      <div className="fixed bottom-4 left-4 z-20 flex flex-col gap-2">
        {activeRadio && (
          <div className="glass-console px-3.5 py-2 flex items-center gap-3 w-fit">
            <Volume2 className="w-4 h-4 text-sky-400 animate-pulse" />
            <div className="text-xs">
              <div className="font-semibold text-white leading-tight">{activeRadio.name}</div>
              <div className="text-[10px] font-mono-tech text-sky-300">
                CANLI RADYO • {activeRadio.country} • {activeRadio.bitrate} kbps
              </div>
            </div>
            <button
              onClick={() => {
                audioRef.current?.pause();
                setActiveRadio(null);
              }}
              className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
              title="Durdur"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        )}

        <div className="glass-console p-1.5 flex items-center gap-1 flex-wrap">
          {[
            { key: 'earthquakes' as const, label: 'Deprem', icon: Activity, col: 'text-red-400' },
            { key: 'disasters' as const, label: 'Afet', icon: Flame, col: 'text-orange-400' },
            { key: 'flights' as const, label: 'Uçuş', icon: Plane, col: 'text-sky-400' },
            { key: 'satellites' as const, label: 'Uydu', icon: Orbit, col: 'text-purple-400' },
            { key: 'cameras' as const, label: 'Kamera', icon: Camera, col: 'text-emerald-400' },
          ].map((l) => {
            const Icon = l.icon;
            const on = layers[l.key];
            return (
              <button
                key={l.key}
                onClick={() => setLayers((prev) => ({ ...prev, [l.key]: !prev[l.key] }))}
                className={`px-2.5 py-1.5 text-[10px] font-mono-tech uppercase flex items-center gap-1.5 cursor-pointer transition ${
                  on ? `bg-white/10 text-white` : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${on ? l.col : 'text-slate-600'}`} />
                {l.label}
              </button>
            );
          })}

          <div className="h-4 w-px bg-white/15 mx-1" />

          <button
            onClick={() => setShowCamWall(true)}
            className="px-2.5 py-1.5 text-[10px] font-mono-tech uppercase text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" /> KAMERA DUVARI
          </button>

          <button
            onClick={() => setShowAlerts(true)}
            className="px-2.5 py-1.5 text-[10px] font-mono-tech uppercase text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            ALARMLAR {triggeredCount > 0 && <span className="px-1 bg-red-600 text-white">{triggeredCount}</span>}
          </button>
        </div>
      </div>

      {/* Right Floating Region Inspector */}
      {selectedPlace && (
        <RegionDrawer
          place={selectedPlace}
          loading={regionLoading}
          radios={radios}
          tvChannels={tvChannels}
          news={news}
          outages={outages}
          flights={flights}
          satellites={satellites}
          earthquakes={earthquakes}
          disasters={disasters}
          cameras={cameras}
          activeRadio={activeRadio}
          onPlayRadio={handlePlayRadio}
          onAddCustomCamera={(cam) => {
            setCameras((prev) => {
              const next = [cam, ...prev];
              const customOnly = next.filter((c) => c.id.startsWith('custom-'));
              localStorage.setItem('maotun_custom_cams', JSON.stringify(customOnly));
              return next;
            });
          }}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {showCamWall && <MultiCamWall cameras={cameras} onClose={() => setShowCamWall(false)} />}

      {showAlerts && (
        <AlertModal
          rules={alertRules}
          earthquakes={earthquakes}
          onAddRule={(r) => {
            const next = [r, ...alertRules];
            setAlertRules(next);
            localStorage.setItem('maotun_alerts', JSON.stringify(next));
          }}
          onDeleteRule={(id) => {
            const next = alertRules.filter((x) => x.id !== id);
            setAlertRules(next);
            localStorage.setItem('maotun_alerts', JSON.stringify(next));
          }}
          onClose={() => setShowAlerts(false)}
        />
      )}
    </div>
  );
}

export default App;
