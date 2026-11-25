import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Command,
  Pause,
  Play,
  RefreshCw,
  Ruler,
  Search,
  X,
} from 'lucide-react';
import type {
  AlertRule,
  ApiKeysConfig,
  DisasterItem,
  DiscoveryPin,
  EarthquakeItem,
  FireballItem,
  FireHotspot,
  FlightItem,
  KiwiSdrNode,
  LayerState,
  LiveCamera,
  OsmPoi,
  PlaceInfo,
  RadioStation,
  RainViewerMeta,
  RocketLaunch,
  SatelliteLive,
  SatelliteTle,
  ShipItem,
  SpaceWeather,
  TorRelay,
} from './types';
import { api } from './api';
import { DEFAULT_CAMERAS, QUICK_CITIES } from './cameras';
import { haversineKm, propagateSatellites } from './geo';
import { sound } from './sound';
import { GlobeMap } from './components/GlobeMap';
import { RegionDrawer, type DrawerPrimaryTab, type MediaSubTab } from './components/RegionDrawer';
import { FloatingDock } from './components/FloatingDock';
import { MiniRadioBar } from './components/MiniRadioBar';
import { WikiPulseBar } from './components/WikiPulseBar';
import { DiscoveryModal } from './components/DiscoveryModal';
import { MultiCamWall } from './components/MultiCamWall';
import { AlertModal } from './components/AlertModal';
import { CommandPalette, type PaletteAction } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';

const DEFAULT_RULES: AlertRule[] = [
  { id: 'tr-hatay', label: 'Hatay / Doğu Akdeniz (M≥4.0)', keyword: 'HATAY', minMag: 4.0, enabled: true },
  { id: 'tr-ist', label: 'Marmara / İstanbul (M≥4.0)', keyword: 'MARMARA', minMag: 4.0, enabled: true },
];

const DEFAULT_CONFIG: ApiKeysConfig = {
  aisstreamKey: '',
  firmsKey: '',
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'qwen2.5:3b',
  soundEnabled: true,
};

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function App() {
  // Live Feed States
  const [earthquakes, setEarthquakes] = useState<EarthquakeItem[]>([]);
  const [selectedEq, setSelectedEq] = useState<EarthquakeItem | null>(null);
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [militaryFlights, setMilitaryFlights] = useState<FlightItem[]>([]);
  const [satTles, setSatTles] = useState<SatelliteTle[]>([]);
  const [satellites, setSatellites] = useState<SatelliteLive[]>([]);
  const [selectedSat, setSelectedSat] = useState<SatelliteLive | null>(null);
  const [rockets, setRockets] = useState<RocketLaunch[]>([]);
  const [fireballs, setFireballs] = useState<FireballItem[]>([]);
  const [torRelays, setTorRelays] = useState<TorRelay[]>([]);
  const [kiwisdr, setKiwisdr] = useState<KiwiSdrNode[]>([]);
  const [rainMeta, setRainMeta] = useState<RainViewerMeta | null>(null);
  const [radarIdx, setRadarIdx] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(false);
  const [nasaGibsDate, setNasaGibsDate] = useState(yesterdayIso);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const [ships, setShips] = useState<ShipItem[]>([]);
  const [fires, setFires] = useState<FireHotspot[]>([]);
  const [osmPois, setOsmPois] = useState<OsmPoi[]>([]);

  // Persisted User States
  const [customCameras, setCustomCameras] = useState<LiveCamera[]>(() => {
    try {
      const saved = localStorage.getItem('maotun_custom_cameras_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [liveCameras, setLiveCameras] = useState<LiveCamera[]>(DEFAULT_CAMERAS);
  const cameras = useMemo(() => [...customCameras, ...liveCameras], [customCameras, liveCameras]);

  const [discoveries, setDiscoveries] = useState<DiscoveryPin[]>(() => {
    try {
      const saved = localStorage.getItem('maotun_discoveries_v3');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rules, setRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem('maotun_rules');
      return saved ? JSON.parse(saved) : DEFAULT_RULES;
    } catch {
      return DEFAULT_RULES;
    }
  });

  const [config, setConfig] = useState<ApiKeysConfig>(() => {
    try {
      const saved = localStorage.getItem('maotun_config_v2');
      const parsed = saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
      sound.enabled = parsed.soundEnabled;
      return parsed;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [layers, setLayers] = useState<LayerState>({
    earthquakes: true,
    faults: true,
    disasters: true,
    flights: true,
    military: true,
    satellites: true,
    rockets: true,
    fireballs: false,
    kiwisdr: false,
    radar: false,
    aurora: false,
    cables: true,
    tor: false,
    railways: false,
    ships: false,
    fires: false,
    cameras: true,
    terminator: true,
    terrain: false,
    nasaGibs: false,
    discoveries: true,
  });

  // Persistent Background Radio Player (keeps playing when drawer closes!)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingRadio, setPlayingRadio] = useState<RadioStation | null>(null);
  const [radioPaused, setRadioPaused] = useState(false);

  // UI States
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [requestedTab, setRequestedTab] = useState<{
    primary: DrawerPrimaryTab;
    mediaSub?: MediaSubTab;
    ts: number;
  } | null>(null);
  const [activeCamera, setActiveCamera] = useState<LiveCamera | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom?: number; ts: number } | null>(null);
  const [wallOpen, setWallOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [wikiPulseOpen, setWikiPulseOpen] = useState(false);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePts, setMeasurePts] = useState<{ lat: number; lon: number }[]>([]);
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotLabel, setAutopilotLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceInfo[]>([]);
  const [cursor, setCursor] = useState({ lat: 38.8, lon: 32.5, zoom: 3.15 });
  const [clock, setClock] = useState(() => new Date());
  const autopilotIdxRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        sound.playClick();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [eq, dis, flt, mil, tles, sdr, rv, sw, shp, liveCams, rck, fb, tor] = await Promise.all([
        api.getEarthquakes().catch(() => []),
        api.getDisasters().catch(() => []),
        api.getFlights(39.0, 34.0, 250).catch(() => []),
        api.getMilitaryFlights().catch(() => []),
        api.getSatelliteTles().catch(() => []),
        api.getKiwiSdrNodes().catch(() => []),
        api.getRainViewerMeta().catch(() => null),
        api.getSpaceWeather().catch(() => null),
        api.getShips().catch(() => []),
        api.getLiveCameras().catch(() => []),
        api.getRockets().catch(() => []),
        api.getFireballs().catch(() => []),
        api.getTorRelays().catch(() => []),
      ]);
      setEarthquakes(eq);
      setDisasters(dis);
      setFlights(flt);
      setMilitaryFlights(mil);
      setSatTles(tles);
      setSatellites(propagateSatellites(tles));
      setKiwisdr(sdr);
      if (rv && rv.frames.length > 0) {
        setRainMeta(rv);
        setRadarIdx(rv.frames.length - 1);
      }
      setSpaceWeather(sw);
      setShips((prev) => (prev.some((s) => s.source === 'AISSTREAM') ? prev : shp));
      if (liveCams.length > 0) setLiveCameras(liveCams);
      setRockets(rck);
      setFireballs(fb);
      setTorRelays(tor);

      if (config.firmsKey.trim()) {
        api.getFirmsFires(config.firmsKey).then(setFires).catch(() => {});
      }

      for (const r of rules) {
        if (!r.enabled) continue;
        const hit = eq.find(
          (e) => e.mag >= r.minMag && e.title.toUpperCase().includes(r.keyword.toUpperCase())
        );
        if (hit) {
          setAlertBanner(`${r.label}: M${hit.mag.toFixed(1)} — ${hit.title}`);
          sound.playAlert();
          break;
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [rules, config.firmsKey]);

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, 120_000);
    return () => clearInterval(id);
  }, [refreshAll]);

  // Smooth SGP4 Satellite Tick
  useEffect(() => {
    if (satTles.length === 0) return;
    const id = setInterval(() => setSatellites(propagateSatellites(satTles)), 3000);
    return () => clearInterval(id);
  }, [satTles]);

  // Radar Playback
  useEffect(() => {
    if (!radarPlaying || !rainMeta || rainMeta.frames.length === 0) return;
    const id = setInterval(() => setRadarIdx((i) => (i + 1) % rainMeta.frames.length), 850);
    return () => clearInterval(id);
  }, [radarPlaying, rainMeta]);

  // Optional AISstream WebSocket
  useEffect(() => {
    const key = config.aisstreamKey.trim();
    if (!key || !layers.ships) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            APIKey: key,
            BoundingBoxes: [
              [[30.0, 20.0], [46.0, 42.0]],
              [[48.0, -6.0], [60.0, 15.0]],
            ],
            FilterMessageTypes: ['PositionReport'],
          })
        );
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          const meta = msg.MetaData;
          const pos = msg.Message?.PositionReport;
          if (meta && pos) {
            const mmsi = String(meta.MMSI);
            const item: ShipItem = {
              mmsi,
              name: (meta.ShipName || `GEMİ ${mmsi}`).trim(),
              lat: pos.Latitude,
              lon: pos.Longitude,
              sog: pos.Sog || 0,
              cog: pos.Cog || 0,
              source: 'AISSTREAM',
            };
            setShips((prev) => [item, ...prev.filter((s) => s.mmsi !== mmsi)].slice(0, 180));
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
    return () => ws?.close();
  }, [config.aisstreamKey, layers.ships]);

  // Autopilot Showcase Tour
  useEffect(() => {
    if (!autopilot) {
      setAutopilotLabel('');
      return;
    }
    const stops = [
      { label: 'İstanbul Boğazı', lat: 41.02, lon: 28.98, zoom: 7.4 },
      { label: 'Hatay & Doğu Akdeniz', lat: 36.2, lon: 36.16, zoom: 7.1 },
      { label: 'Tokyo — Shibuya', lat: 35.67, lon: 139.65, zoom: 7.5 },
      { label: 'New York — Manhattan', lat: 40.71, lon: -74.0, zoom: 7.3 },
      { label: 'Reykjavik Aurora Kuşağı', lat: 64.14, lon: -21.94, zoom: 5.4 },
    ];
    const iss = satellites.find((s) => s.id === '25544' || s.name.includes('ISS'));
    if (iss) stops.splice(1, 0, { label: `ISS Yörünge (${iss.alt_km.toFixed(0)} km)`, lat: iss.lat, lon: iss.lon, zoom: 3.8 });
    const go = () => {
      const st = stops[autopilotIdxRef.current % stops.length];
      autopilotIdxRef.current += 1;
      setAutopilotLabel(st.label);
      setFlyTarget({ lat: st.lat, lon: st.lon, zoom: st.zoom, ts: Date.now() });
    };
    go();
    const id = setInterval(go, 9500);
    return () => clearInterval(id);
  }, [autopilot]);

  const handlePlayRadio = (st: RadioStation) => {
    sound.playClick();
    if (playingRadio?.id === st.id) {
      if (audioRef.current) {
        if (radioPaused) {
          audioRef.current.play().catch(() => {});
          setRadioPaused(false);
        } else {
          audioRef.current.pause();
          setRadioPaused(true);
        }
      }
      return;
    }
    setPlayingRadio(st);
    setRadioPaused(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = st.stream_url;
        audioRef.current.play().catch(() => {});
      }
    }, 30);
  };

  const handleSelectCoord = async (lat: number, lon: number) => {
    if (measureMode) {
      setMeasurePts((prev) => (prev.length >= 2 ? [{ lat, lon }] : [...prev, { lat, lon }]));
      return;
    }
    const place = await api.reverseGeocode(lat, lon);
    setSelectedPlace(place);
    api.getFlights(lat, lon, 200).then(setFlights).catch(() => {});
  };

  const openDrawerTo = (primary: DrawerPrimaryTab, mediaSub?: MediaSubTab) => {
    sound.playClick();
    if (!selectedPlace) {
      setSelectedPlace({
        display_name: 'İstanbul, Türkiye',
        city: 'İstanbul',
        country: 'Türkiye',
        country_code: 'TR',
        lat: 41.0082,
        lon: 28.9784,
      });
    }
    setRequestedTab({ primary, mediaSub, ts: Date.now() });
  };

  const toggleLayer = (k: keyof LayerState) => {
    setLayers((prev) => {
      const next = !prev[k];
      sound.playToggle(next);
      return { ...prev, [k]: next };
    });
  };

  const saveDiscoveries = (next: DiscoveryPin[]) => {
    setDiscoveries(next);
    try {
      localStorage.setItem('maotun_discoveries_v3', JSON.stringify(next));
    } catch {
      // storage quota guard
    }
  };

  const radarTileUrl = useMemo(() => {
    if (!rainMeta || rainMeta.frames.length === 0) return null;
    const f = rainMeta.frames[radarIdx] || rainMeta.frames[rainMeta.frames.length - 1];
    return `${rainMeta.host}${f.path}/256/{z}/{x}/{y}/6/1_1.png`;
  }, [rainMeta, radarIdx]);

  const measureInfo = useMemo(() => {
    if (measurePts.length !== 2) return null;
    const km = haversineKm(measurePts[0].lat, measurePts[0].lon, measurePts[1].lat, measurePts[1].lon);
    const flightHr = km / 840;
    const tzDiff = Math.round((measurePts[1].lon - measurePts[0].lon) / 15);
    return { km, flightHr, tzDiff };
  }, [measurePts]);

  const paletteActions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [
      {
        id: 'act-iss',
        group: 'UYDU',
        label: 'ISS Kilitle & 90 dk Yörünge Çiz',
        run: () => {
          const iss = satellites.find((s) => s.id === '25544' || s.name.includes('ISS'));
          if (iss) {
            setSelectedSat(iss);
            setFlyTarget({ lat: iss.lat, lon: iss.lon, zoom: 3.8, ts: Date.now() });
          }
        },
      },
      { id: 'act-disc', group: 'KEŞİF', label: 'Rastgele Mekân Avı & Fotoğraf Pasaportu', run: () => setDiscoveryOpen(true) },
      { id: 'act-wall', group: 'MEDYA', label: '6-Şehir Çoklu Kamera Duvarı', run: () => setWallOpen(true) },
      { id: 'act-radio', group: 'MEDYA', label: 'Canlı Yerel Radyolar (FFT)', run: () => openDrawerTo('media', 'radio') },
      { id: 'act-tv', group: 'MEDYA', label: 'Canlı TV Kanalları (IPTV)', run: () => openDrawerTo('media', 'tv') },
      { id: 'act-gibs', group: 'UYDU', label: `NASA GIBS Günlük Uydu Fotoğrafı (${layers.nasaGibs ? 'Kapat' : 'Aç'})`, run: () => toggleLayer('nasaGibs') },
      { id: 'act-rail', group: 'ŞEHİR', label: `Global/TR Metro & Raylı Sistem (${layers.railways ? 'Kapat' : 'Aç'})`, run: () => toggleLayer('railways') },
      { id: 'act-wiki', group: 'NABIZ', label: 'Canlı Vikipedi Düzenleme Nabzı', run: () => setWikiPulseOpen((v) => !v) },
      { id: 'act-measure', group: 'ARAÇ', label: '2 Nokta 3D Mesafe & Uçuş Ölçeri', run: () => { setMeasureMode((v) => !v); setMeasurePts([]); } },
    ];
    QUICK_CITIES.forEach((c) => {
      list.push({
        id: `city-${c.name}`,
        group: 'ŞEHİR',
        label: `${c.name}, ${c.country}`,
        run: () => {
          setFlyTarget({ lat: c.lat, lon: c.lon, zoom: 7.5, ts: Date.now() });
          setSelectedPlace({
            display_name: `${c.name}, ${c.country}`,
            city: c.name,
            country: c.country,
            country_code: c.country_code,
            lat: c.lat,
            lon: c.lon,
          });
        },
      });
    });
    return list;
  }, [satellites, layers]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    sound.playClick();
    const res = await api.searchPlace(searchText.trim()).catch(() => []);
    setSearchResults(res);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090B0E]">
      {/* Global Persistent Radio Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Full-Bleed 3D Interactive World Globe */}
      <GlobeMap
        earthquakes={earthquakes}
        selectedEq={selectedEq}
        onSelectEq={setSelectedEq}
        disasters={disasters}
        flights={flights}
        militaryFlights={militaryFlights}
        satellites={satellites}
        selectedSat={selectedSat}
        onSelectSat={setSelectedSat}
        rockets={rockets}
        fireballs={fireballs}
        torRelays={torRelays}
        kiwisdr={kiwisdr}
        auroraPoints={spaceWeather?.aurora_points ?? []}
        ships={ships}
        fires={fires}
        cameras={cameras}
        osmPois={osmPois}
        discoveries={discoveries}
        measurePts={measurePts}
        measureMode={measureMode}
        layers={layers}
        radarTileUrl={radarTileUrl}
        nasaGibsDate={nasaGibsDate}
        flyTarget={flyTarget}
        onSelectCoord={handleSelectCoord}
        onSelectCamera={(cam) => {
          setActiveCamera(cam);
          setSelectedPlace({
            display_name: cam.name,
            city: cam.city,
            country: cam.country_code,
            country_code: cam.country_code,
            lat: cam.lat,
            lon: cam.lon,
          });
        }}
        onCursorMove={(lat, lon, zoom) => setCursor({ lat, lon, zoom })}
      />

      {/* SERENE FLOATING TOP BAR (No heavy full-width box chrome!) */}
      <header className="fixed top-3.5 left-4 right-4 z-30 flex items-center justify-between gap-3 pointer-events-none">
        {/* Left: Brand & Live Minimal Telemetry */}
        <div className="atlas-pill rounded-2xl px-3.5 py-2 flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5A952]" />
            <span className="font-semibold text-sm tracking-[0.14em] text-white">MAOTUN</span>
          </div>
          <span className="h-3.5 w-px bg-white/10 hidden md:block" />
          <div className="hidden md:flex items-center gap-2.5 font-mono-tech text-[11px] text-[#8E95A3]">
            <span className="text-[#E6E8EC]">{clock.toLocaleTimeString('tr-TR', { hour12: false })}</span>
            <span>UTC {clock.toISOString().slice(11, 16)}</span>
            {spaceWeather && (
              <span className={spaceWeather.kp_index >= 5 ? 'text-[#E85D4A]' : 'text-[#4ADE80]'}>
                Kp {spaceWeather.kp_index.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Center: Floating Search Pill */}
        <div className="relative flex-1 max-w-md pointer-events-auto">
          <form onSubmit={handleSearch} className="atlas-pill rounded-2xl flex items-center px-3 py-1.5 gap-2 focus-within:border-[#E5A952]/60">
            <Search className="w-3.5 h-3.5 text-[#8E95A3] shrink-0" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="İlçe, şehir veya ülke ara..."
              className="flex-1 bg-transparent text-xs text-[#E6E8EC] placeholder-[#68707F] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => { sound.playClick(); setPaletteOpen(true); }}
              className="px-2 py-0.5 rounded-lg bg-white/[0.06] font-mono-tech text-[10px] text-[#8E95A3] hover:text-[#E5A952] flex items-center gap-1 cursor-pointer"
              title="Komut Paleti (Ctrl+K)"
            >
              <Command className="w-2.5 h-2.5" /> K
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 atlas-glass rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
              {searchResults.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    sound.playClick();
                    setSelectedPlace(p);
                    setFlyTarget({ lat: p.lat, lon: p.lon, zoom: 9.2, ts: Date.now() });
                    setSearchResults([]);
                    setSearchText('');
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.06] transition cursor-pointer"
                >
                  <div className="text-xs font-medium text-[#E6E8EC]">{p.city}</div>
                  <div className="text-[11px] text-[#8E95A3] truncate">{p.display_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Minimal Coordinate Readout & Refresh */}
        <div className="atlas-pill rounded-2xl px-3 py-1.5 flex items-center gap-2.5 pointer-events-auto">
          <span className="hidden lg:inline font-mono-tech text-[11px] text-[#8E95A3]">
            {cursor.lat.toFixed(2)}°{cursor.lat >= 0 ? 'N' : 'S'}, {Math.abs(cursor.lon).toFixed(2)}°{cursor.lon >= 0 ? 'E' : 'W'}
          </span>
          <button
            onClick={() => { sound.playClick(); refreshAll(); }}
            className="atlas-btn p-1"
            title="Canlı verileri yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#E5A952]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Active Mode / Alert / Measurement / NASA GIBS Date Floating Pills */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
        {(alertBanner || autopilotLabel) && (
          <div className="atlas-glass rounded-full px-4 py-1.5 flex items-center gap-2.5 pointer-events-auto text-xs">
            <span className="w-2 h-2 rounded-full bg-[#E85D4A] animate-pulse" />
            <span>{alertBanner || `Otopilot: ${autopilotLabel}`}</span>
            {alertBanner && (
              <button onClick={() => setAlertBanner(null)} className="text-[#8E95A3] hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {measureMode && (
          <div className="atlas-glass rounded-full px-4 py-1.5 flex items-center gap-3 pointer-events-auto text-xs">
            <Ruler className="w-3.5 h-3.5 text-[#E5A952]" />
            {measureInfo ? (
              <span className="font-mono-tech">
                {measureInfo.km.toFixed(0)} km • Uçuş ~{measureInfo.flightHr.toFixed(1)} sa • Saat farkı {measureInfo.tzDiff >= 0 ? `+${measureInfo.tzDiff}` : measureInfo.tzDiff}s
              </span>
            ) : (
              <span>Haritada {measurePts.length === 0 ? '1.' : '2.'} noktaya tıklayın</span>
            )}
            <button
              onClick={() => { setMeasureMode(false); setMeasurePts([]); }}
              className="text-[#8E95A3] hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {layers.nasaGibs && (
          <div className="atlas-glass rounded-full px-3.5 py-1.5 flex items-center gap-2 pointer-events-auto text-xs">
            <Calendar className="w-3.5 h-3.5 text-[#4ADE80]" />
            <span className="text-[#8E95A3]">NASA VIIRS Uydu:</span>
            <input
              type="date"
              value={nasaGibsDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setNasaGibsDate(e.target.value)}
              className="bg-transparent font-mono-tech text-xs text-white focus:outline-none"
            />
          </div>
        )}

        {layers.radar && rainMeta && rainMeta.frames.length > 0 && (
          <div className="atlas-glass rounded-full px-3.5 py-1.5 flex items-center gap-2.5 pointer-events-auto w-[310px]">
            <button onClick={() => setRadarPlaying((p) => !p)} className="atlas-btn atlas-btn-amber w-6 h-6 rounded-full">
              {radarPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <input
              type="range"
              min={0}
              max={rainMeta.frames.length - 1}
              value={radarIdx}
              onChange={(e) => setRadarIdx(Number(e.target.value))}
              className="flex-1 accent-[#E5A952]"
            />
            <span className="font-mono-tech text-[10px] text-[#60A5FA]">
              {new Date((rainMeta.frames[radarIdx]?.time || 0) * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Live Wikimedia Pulse Widget */}
      <WikiPulseBar open={wikiPulseOpen} onClose={() => setWikiPulseOpen(false)} />

      {/* Persistent Bottom-Left Mini Radio Player */}
      <MiniRadioBar
        station={playingRadio}
        paused={radioPaused}
        audioEl={audioRef.current}
        onTogglePause={() => playingRadio && handlePlayRadio(playingRadio)}
        onStop={() => {
          audioRef.current?.pause();
          setPlayingRadio(null);
          setRadioPaused(false);
        }}
      />

      {/* Minimalist Bottom-Center 6-Group Floating Dock (Replaces ugly 15-box left wall!) */}
      <FloatingDock
        layers={layers}
        onToggleLayer={toggleLayer}
        counts={{
          eq: earthquakes.length,
          disasters: disasters.length,
          flights: flights.length,
          mil: militaryFlights.length,
          sats: satellites.length,
          rockets: rockets.length,
          fireballs: fireballs.length,
          kiwisdr: kiwisdr.length,
          tor: torRelays.length,
          ships: ships.length,
          fires: fires.length,
          cams: cameras.length,
          discoveries: discoveries.length,
        }}
        measureMode={measureMode}
        onToggleMeasure={() => { setMeasureMode((v) => !v); setMeasurePts([]); }}
        autopilot={autopilot}
        onToggleAutopilot={() => setAutopilot((v) => !v)}
        wikiPulseOpen={wikiPulseOpen}
        onToggleWikiPulse={() => setWikiPulseOpen((v) => !v)}
        onOpenWall={() => setWallOpen(true)}
        onOpenRadio={() => openDrawerTo('media', 'radio')}
        onOpenTv={() => openDrawerTo('media', 'tv')}
        onOpenDiscovery={() => setDiscoveryOpen(true)}
        onOpenAlerts={() => setAlertsOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Right Smart 4-Tab Region Drawer */}
      <RegionDrawer
        place={selectedPlace}
        onClose={() => { setSelectedPlace(null); setActiveCamera(null); }}
        cameras={cameras}
        onAddCamera={(cam) => {
          const next = [cam, ...customCameras];
          setCustomCameras(next);
          localStorage.setItem('maotun_custom_cameras_v2', JSON.stringify(next));
        }}
        earthquakes={earthquakes}
        onSelectEq={(eq) => {
          setSelectedEq(eq);
          setFlyTarget({ lat: eq.lat, lon: eq.lon, zoom: 7.5, ts: Date.now() });
        }}
        kiwisdr={kiwisdr}
        activeCamera={activeCamera}
        onSelectCamera={setActiveCamera}
        playingRadio={playingRadio}
        radioPaused={radioPaused}
        onPlayRadio={handlePlayRadio}
        onShowOsmPois={setOsmPois}
        onOpenDiscovery={() => setDiscoveryOpen(true)}
        config={config}
        requestedTab={requestedTab}
      />

      {/* Modals */}
      <DiscoveryModal
        open={discoveryOpen}
        onClose={() => setDiscoveryOpen(false)}
        place={selectedPlace}
        pins={discoveries}
        onAddPin={(pin) => saveDiscoveries([pin, ...discoveries])}
        onDeletePin={(id) => saveDiscoveries(discoveries.filter((p) => p.id !== id))}
        onFlyTo={(lat, lon, zoom) => setFlyTarget({ lat, lon, zoom, ts: Date.now() })}
      />
      <MultiCamWall open={wallOpen} onClose={() => setWallOpen(false)} cameras={cameras} />
      <AlertModal
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        rules={rules}
        onSaveRules={(next) => {
          setRules(next);
          localStorage.setItem('maotun_rules', JSON.stringify(next));
        }}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={(next) => {
          setConfig(next);
          localStorage.setItem('maotun_config_v2', JSON.stringify(next));
        }}
        cameras={cameras}
        onImportCameras={(imported) => {
          setCustomCameras(imported);
          localStorage.setItem('maotun_custom_cameras_v2', JSON.stringify(imported));
        }}
      />
    </div>
  );
}
