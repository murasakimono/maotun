import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  Cable,
  CloudRain,
  Command,
  Compass,
  Flame,
  Grid2x2,
  Moon,
  Mountain,
  Orbit,
  Pause,
  Plane,
  Play,
  Radio,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Ship,
  Sparkles,
  Tv,
  Video,
  Waves,
} from 'lucide-react';
import type {
  AlertRule,
  ApiKeysConfig,
  DisasterItem,
  EarthquakeItem,
  FireHotspot,
  FlightItem,
  KiwiSdrNode,
  LayerState,
  LiveCamera,
  PlaceInfo,
  RainViewerMeta,
  SatelliteLive,
  SatelliteTle,
  ShipItem,
  SpaceWeather,
} from './types';
import { api } from './api';
import { DEFAULT_CAMERAS, QUICK_CITIES } from './cameras';
import { propagateSatellites } from './geo';
import { sound } from './sound';
import { GlobeMap } from './components/GlobeMap';
import { RegionDrawer } from './components/RegionDrawer';
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

export function App() {
  // Live Feed States
  const [earthquakes, setEarthquakes] = useState<EarthquakeItem[]>([]);
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [flights, setFlights] = useState<FlightItem[]>([]);
  const [militaryFlights, setMilitaryFlights] = useState<FlightItem[]>([]);
  const [satTles, setSatTles] = useState<SatelliteTle[]>([]);
  const [satellites, setSatellites] = useState<SatelliteLive[]>([]);
  const [selectedSat, setSelectedSat] = useState<SatelliteLive | null>(null);
  const [kiwisdr, setKiwisdr] = useState<KiwiSdrNode[]>([]);
  const [rainMeta, setRainMeta] = useState<RainViewerMeta | null>(null);
  const [radarIdx, setRadarIdx] = useState(0);
  const [radarPlaying, setRadarPlaying] = useState(false);
  const [spaceWeather, setSpaceWeather] = useState<SpaceWeather | null>(null);
  const [ships, setShips] = useState<ShipItem[]>([]);
  const [fires, setFires] = useState<FireHotspot[]>([]);

  // User Persisted States
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
  const [requestedTab, setRequestedTab] = useState<{
    tab: 'cams' | 'radio' | 'sdr' | 'tv' | 'signals' | 'news' | 'brief';
    ts: number;
  } | null>(null);

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
    kiwisdr: false,
    radar: false,
    aurora: false,
    cables: true,
    ships: false,
    fires: false,
    cameras: true,
    terminator: true,
    terrain: false,
  });

  // UI & Navigation States
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [activeCamera, setActiveCamera] = useState<LiveCamera | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom?: number; ts: number } | null>(null);
  const [wallOpen, setWallOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  const [autopilotLabel, setAutopilotLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceInfo[]>([]);
  const [cursor, setCursor] = useState({ lat: 38.8, lon: 32.5, zoom: 3.1 });
  const [clock, setClock] = useState(() => new Date());

  const autopilotIdxRef = useRef(0);

  // Live Clock (1s)
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Global Ctrl+K shortcut
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

  // Refresh All Core Feeds
  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [eq, dis, flt, mil, tles, sdr, rv, sw, shp, liveCams] = await Promise.all([
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
      ]);
      if (liveCams.length > 0) setLiveCameras(liveCams);
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

      if (config.firmsKey.trim()) {
        api.getFirmsFires(config.firmsKey).then(setFires).catch(() => {});
      }

      // Evaluate alert rules
      for (const r of rules) {
        if (!r.enabled) continue;
        const hit = eq.find(
          (e) =>
            e.mag >= r.minMag &&
            e.title.toUpperCase().includes(r.keyword.toUpperCase())
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
    const id = setInterval(refreshAll, 90_000);
    return () => clearInterval(id);
  }, [refreshAll]);

  // Real-time 60-second SGP4 Satellite Tick (every 3s for smooth orbital motion)
  useEffect(() => {
    if (satTles.length === 0) return;
    const id = setInterval(() => {
      setSatellites(propagateSatellites(satTles));
    }, 3000);
    return () => clearInterval(id);
  }, [satTles]);

  // RainViewer Radar Playback Animation
  useEffect(() => {
    if (!radarPlaying || !rainMeta || rainMeta.frames.length === 0) return;
    const id = setInterval(() => {
      setRadarIdx((i) => (i + 1) % rainMeta.frames.length);
    }, 850);
    return () => clearInterval(id);
  }, [radarPlaying, rainMeta]);

  // Optional AISstream.io Live Global Maritime WebSocket
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
              [[30.0, 20.0], [46.0, 42.0]], // Turkey, Med, Black Sea, Aegean, Suez
              [[48.0, -6.0], [60.0, 15.0]], // English Channel & North Sea
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
              name: (meta.ShipName || `VESSEL ${mmsi}`).trim(),
              lat: pos.Latitude,
              lon: pos.Longitude,
              sog: pos.Sog || 0,
              cog: pos.Cog || 0,
              source: 'AISSTREAM',
            };
            setShips((prev) => {
              const filtered = prev.filter((s) => s.mmsi !== mmsi);
              return [item, ...filtered].slice(0, 180);
            });
          }
        } catch {
          // ignore malformed packet
        }
      };
    } catch {
      // ignore ws error
    }
    return () => {
      ws?.close();
    };
  }, [config.aisstreamKey, layers.ships]);

  // Cinematic Autopilot Showcase Tour (2nd Monitor Mode)
  useEffect(() => {
    if (!autopilot) {
      setAutopilotLabel('');
      return;
    }
    const stops: { label: string; lat: number; lon: number; zoom: number }[] = [
      { label: 'İSTANBUL BOĞAZI // TR', lat: 41.02, lon: 28.98, zoom: 7.2 },
      { label: 'HATAY & DOĞU ANADOLU FAYI // TR', lat: 36.2, lon: 36.16, zoom: 7.0 },
      { label: 'TOKYO SHIBUYA // JP', lat: 35.67, lon: 139.65, zoom: 7.4 },
      { label: 'NEW YORK MANHATTAN // US', lat: 40.71, lon: -74.0, zoom: 7.2 },
      { label: 'REYKJAVIK AURORA KUŞAĞI // IS', lat: 64.14, lon: -21.94, zoom: 5.2 },
    ];
    const iss = satellites.find((s) => s.id === '25544' || s.name.includes('ISS'));
    if (iss) {
      stops.splice(1, 0, {
        label: `ISS YÖRÜNGE TAKİBİ (${iss.alt_km.toFixed(0)} KM)`,
        lat: iss.lat,
        lon: iss.lon,
        zoom: 3.6,
      });
    }
    if (earthquakes[0]) {
      stops.splice(2, 0, {
        label: `SON DEPREM M${earthquakes[0].mag.toFixed(1)} // ${earthquakes[0].title}`,
        lat: earthquakes[0].lat,
        lon: earthquakes[0].lon,
        zoom: 6.4,
      });
    }

    const goNext = () => {
      const st = stops[autopilotIdxRef.current % stops.length];
      autopilotIdxRef.current += 1;
      setAutopilotLabel(st.label);
      setFlyTarget({ lat: st.lat, lon: st.lon, zoom: st.zoom, ts: Date.now() });
    };

    goNext();
    const id = setInterval(goNext, 9500);
    return () => clearInterval(id);
  }, [autopilot]);

  const handleSelectCoord = async (lat: number, lon: number) => {
    const place = await api.reverseGeocode(lat, lon);
    setSelectedPlace(place);
    api.getFlights(lat, lon, 200).then(setFlights).catch(() => {});
  };

  const handleQuickCity = (c: (typeof QUICK_CITIES)[number]) => {
    sound.playClick();
    setFlyTarget({ lat: c.lat, lon: c.lon, zoom: 7.5, ts: Date.now() });
    setSelectedPlace({
      display_name: `${c.name}, ${c.country}`,
      city: c.name,
      country: c.country,
      country_code: c.country_code,
      lat: c.lat,
      lon: c.lon,
    });
    api.getFlights(c.lat, c.lon, 200).then(setFlights).catch(() => {});
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;
    sound.playClick();
    const res = await api.searchPlace(searchText.trim()).catch(() => []);
    setSearchResults(res);
  };

  const toggleLayer = (k: keyof LayerState) => {
    setLayers((prev) => {
      const next = !prev[k];
      sound.playToggle(next);
      return { ...prev, [k]: next };
    });
  };

  const saveConfig = (next: ApiKeysConfig) => {
    setConfig(next);
    localStorage.setItem('maotun_config_v2', JSON.stringify(next));
  };

  const saveCameras = (next: LiveCamera[]) => {
    setCustomCameras(next);
    localStorage.setItem('maotun_custom_cameras_v2', JSON.stringify(next));
  };

  const openDrawerTab = (tab: 'cams' | 'radio' | 'sdr' | 'tv' | 'signals' | 'news' | 'brief') => {
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
    setRequestedTab({ tab, ts: Date.now() });
  };

  const saveRules = (next: AlertRule[]) => {
    setRules(next);
    localStorage.setItem('maotun_rules', JSON.stringify(next));
  };

  const radarTileUrl = useMemo(() => {
    if (!rainMeta || rainMeta.frames.length === 0) return null;
    const f = rainMeta.frames[radarIdx] || rainMeta.frames[rainMeta.frames.length - 1];
    return `${rainMeta.host}${f.path}/256/{z}/{x}/{y}/6/1_1.png`;
  }, [rainMeta, radarIdx]);

  const radarTimeLabel = useMemo(() => {
    if (!rainMeta || !rainMeta.frames[radarIdx]) return '--:--';
    const d = new Date(rainMeta.frames[radarIdx].time * 1000);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }, [rainMeta, radarIdx]);

  // Ctrl+K Command Palette Actions
  const paletteActions: PaletteAction[] = useMemo(() => {
    const list: PaletteAction[] = [
      {
        id: 'act-iss',
        group: 'UYDU',
        label: 'ISS (Uluslararası Uzay İstasyonu) Kilitle & Yörünge Çiz',
        hint: 'SGP4',
        run: () => {
          const iss = satellites.find((s) => s.id === '25544' || s.name.includes('ISS'));
          if (iss) {
            setSelectedSat(iss);
            setFlyTarget({ lat: iss.lat, lon: iss.lon, zoom: 3.8, ts: Date.now() });
          }
        },
      },
      {
        id: 'act-autopilot',
        group: 'MOD',
        label: autopilot ? 'Otopilot Vitrin Turunu Durdur' : 'Otopilot Sinematik Vitrin Turunu Başlat',
        hint: '2. EKRAN',
        run: () => setAutopilot((a) => !a),
      },
      {
        id: 'act-wall',
        group: 'OPTİK',
        label: '6-Şehir Çoklu Kamera Duvarını Aç',
        run: () => setWallOpen(true),
      },
      {
        id: 'act-settings',
        group: 'SİSTEM',
        label: 'Ayarlar, Opsiyonel Anahtarlar & Kamera JSON Yedekleme',
        run: () => setSettingsOpen(true),
      },
      {
        id: 'act-alerts',
        group: 'SİSTEM',
        label: 'Bölgesel Sismik Alarm Kurallarını Düzenle',
        run: () => setAlertsOpen(true),
      },
    ];

    QUICK_CITIES.forEach((c) => {
      list.push({
        id: `city-${c.name}`,
        group: 'ŞEHİR',
        label: `${c.name}, ${c.country}`,
        hint: `${c.lat.toFixed(1)}°, ${c.lon.toFixed(1)}°`,
        run: () => handleQuickCity(c),
      });
    });

    const layerDefs: [keyof LayerState, string][] = [
      ['radar', 'RainViewer Canlı Yağış Radarı'],
      ['aurora', 'NOAA Canlı Aurora Ovali'],
      ['kiwisdr', 'KiwiSDR Kısa Dalga Alıcıları'],
      ['military', 'Askerî & Özel (MIL/LADD/PIA) Uçuşlar'],
      ['cables', 'Denizaltı Fiber Optik Kablolar'],
      ['faults', 'Türkiye Aktif Fay Hatları (KAF/DAF)'],
      ['terrain', '3D Arazi Kabartması (DEM)'],
      ['terminator', 'Gerçek Zamanlı Gece/Gündüz Çizgisi'],
      ['ships', 'Canlı AIS Deniz Trafiği'],
      ['fires', 'NASA FIRMS Termal Yangınlar'],
    ];
    layerDefs.forEach(([k, label]) => {
      list.push({
        id: `lyr-${k}`,
        group: 'KATMAN',
        label: `${label} (${layers[k] ? 'KAPAT' : 'AÇ'})`,
        run: () => toggleLayer(k),
      });
    });

    return list;
  }, [satellites, autopilot, layers]);

  const layerRack: {
    key: keyof LayerState;
    label: string;
    count?: number;
    color: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'earthquakes', label: 'DEPREM', count: earthquakes.length, color: '#FF4D00', icon: <Activity className="w-3.5 h-3.5" /> },
    { key: 'faults', label: 'FAY HAT', color: '#FF2A3B', icon: <Activity className="w-3.5 h-3.5" /> },
    { key: 'disasters', label: 'AFET', count: disasters.length, color: '#FF7A00', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'flights', label: 'SİVİL', count: flights.length, color: '#00D4FF', icon: <Plane className="w-3.5 h-3.5" /> },
    { key: 'military', label: 'ASKERÎ', count: militaryFlights.length, color: '#FFB800', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'satellites', label: 'UYDU', count: satellites.length, color: '#ECEEF2', icon: <Orbit className="w-3.5 h-3.5" /> },
    { key: 'kiwisdr', label: 'KIWISDR', count: kiwisdr.length, color: '#C084FC', icon: <Waves className="w-3.5 h-3.5" /> },
    { key: 'radar', label: 'RADAR', color: '#38BDF8', icon: <CloudRain className="w-3.5 h-3.5" /> },
    { key: 'aurora', label: 'AURORA', color: '#00E58A', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: 'cables', label: 'FİBER', color: '#00D4FF', icon: <Cable className="w-3.5 h-3.5" /> },
    { key: 'ships', label: 'GEMİ', count: ships.length, color: '#38BDF8', icon: <Ship className="w-3.5 h-3.5" /> },
    { key: 'fires', label: 'YANGIN', count: fires.length, color: '#FF3B00', icon: <Flame className="w-3.5 h-3.5" /> },
    { key: 'cameras', label: 'KAMERA', count: cameras.length, color: '#00E58A', icon: <Video className="w-3.5 h-3.5" /> },
    { key: 'terminator', label: 'GECE', color: '#FF4D00', icon: <Moon className="w-3.5 h-3.5" /> },
    { key: 'terrain', label: '3D ARAZİ', color: '#9BA3B0', icon: <Mountain className="w-3.5 h-3.5" /> },
  ];

  const utcStr = clock.toISOString().slice(11, 19);
  const trStr = clock.toLocaleTimeString('tr-TR', { hour12: false });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08090B]">
      {/* 3D Interactive World Globe */}
      <GlobeMap
        earthquakes={earthquakes}
        disasters={disasters}
        flights={flights}
        militaryFlights={militaryFlights}
        satellites={satellites}
        selectedSat={selectedSat}
        onSelectSat={setSelectedSat}
        kiwisdr={kiwisdr}
        auroraPoints={spaceWeather?.aurora_points ?? []}
        ships={ships}
        fires={fires}
        cameras={cameras}
        layers={layers}
        radarTileUrl={radarTileUrl}
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

      {/* TOP SWISS INSTRUMENT BAR */}
      <header className="fixed top-0 left-0 right-0 h-[44px] bg-[#0B0C0E]/95 border-b border-[#242830] z-30 flex items-center justify-between px-3 gap-3">
        {/* Brand + Clocks + Space Weather Kp */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 pr-3 border-r border-[#242830]">
            <span className="led-dot bg-[#FF4D00] animate-led" />
            <span className="font-bold text-sm tracking-[0.2em] text-white">MAOTUN</span>
            <span className="font-mono-tech text-[9px] px-1 py-0.5 border border-[#242830] text-[#7C8492]">
              2.0
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-3 font-mono-tech text-[10px] text-[#9BA3B0]">
            <span>
              UTC <strong className="text-[#ECEEF2]">{utcStr}</strong>
            </span>
            <span className="text-[#2E333D]">|</span>
            <span>
              TR <strong className="text-[#ECEEF2]">{trStr}</strong>
            </span>
            {spaceWeather && (
              <>
                <span className="text-[#2E333D]">|</span>
                <span
                  className={
                    spaceWeather.kp_index >= 5
                      ? 'text-[#FF4D00]'
                      : spaceWeather.kp_index >= 4
                      ? 'text-[#FFB800]'
                      : 'text-[#00E58A]'
                  }
                >
                  KP {spaceWeather.kp_index.toFixed(1)} ({spaceWeather.storm_level})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center Search + Ctrl+K + Quick Cities */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <form onSubmit={handleSearch} className="flex items-center bg-[#08090B] border border-[#242830] focus-within:border-[#FF4D00]">
              <Search className="w-3.5 h-3.5 text-[#5E6673] ml-2.5 shrink-0" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Şehir, koordinat veya ülke ara..."
                className="flex-1 bg-transparent px-2 py-1.5 font-mono-tech text-[11px] text-[#ECEEF2] placeholder-[#555C69] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setPaletteOpen(true);
                }}
                className="px-2 py-1 border-l border-[#242830] font-mono-tech text-[9px] text-[#7C8492] hover:text-[#FF4D00] flex items-center gap-1 cursor-pointer"
                title="Komut Paleti (Ctrl+K)"
              >
                <Command className="w-2.5 h-2.5" /> K
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 inst-panel divide-y divide-[#1D2129] z-50">
                {searchResults.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      sound.playClick();
                      setSelectedPlace(p);
                      setFlyTarget({ lat: p.lat, lon: p.lon, zoom: 8.5, ts: Date.now() });
                      setSearchResults([]);
                      setSearchText('');
                      api.getFlights(p.lat, p.lon, 200).then(setFlights).catch(() => {});
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-[#161921] transition cursor-pointer"
                  >
                    <div className="text-xs font-medium text-[#ECEEF2]">{p.city}</div>
                    <div className="font-mono-tech text-[10px] text-[#7C8492] truncate">
                      {p.display_name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-1">
            {QUICK_CITIES.slice(0, 5).map((c) => (
              <button
                key={c.name}
                onClick={() => handleQuickCity(c)}
                className="inst-btn px-2 py-1 text-[10px]"
              >
                {c.name.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => openDrawerTab('radio')}
            className="inst-btn px-2.5 py-1.5"
            title="Canlı Yerel Radyolar + FFT Spektrum"
          >
            <Radio className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span className="hidden md:inline">RADYO</span>
          </button>
          <button
            onClick={() => openDrawerTab('tv')}
            className="inst-btn px-2.5 py-1.5"
            title="Canlı TV Kanalları (IPTV HLS)"
          >
            <Tv className="w-3.5 h-3.5 text-[#FF4D00]" />
            <span className="hidden md:inline">TV</span>
          </button>
          <button
            onClick={() => {
              sound.playToggle(!autopilot);
              setAutopilot((a) => !a);
            }}
            className={`inst-btn px-2.5 py-1.5 ${autopilot ? 'inst-btn-active' : ''}`}
            title="Sinematik Otopilot Vitrin Turu (2. Ekran)"
          >
            <Compass className={`w-3.5 h-3.5 ${autopilot ? 'text-[#FF4D00] animate-spin' : ''}`} />
            <span className="hidden md:inline">TUR</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setWallOpen(true);
            }}
            className="inst-btn px-2.5 py-1.5"
            title="Çoklu Kamera Duvarı"
          >
            <Grid2x2 className="w-3.5 h-3.5 text-[#00E58A]" />
            <span className="hidden md:inline">DUVAR</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setAlertsOpen(true);
            }}
            className="inst-btn px-2 py-1.5"
            title="Sismik Alarm Kuralları"
          >
            <Bell className="w-3.5 h-3.5 text-[#FFB800]" />
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setSettingsOpen(true);
            }}
            className="inst-btn px-2 py-1.5"
            title="Ayarlar & Opsiyonel Anahtarlar"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              sound.playClick();
              refreshAll();
            }}
            className="inst-btn px-2 py-1.5"
            title="Canlı Akışları Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#FF4D00]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Alert or Autopilot Banner */}
      {(alertBanner || autopilotLabel) && (
        <div className="fixed top-[52px] left-1/2 -translate-x-1/2 z-30 inst-panel border-l-2 border-l-[#FF4D00] px-3.5 py-1.5 flex items-center gap-3">
          <span className="led-dot bg-[#FF4D00] animate-led" />
          <span className="font-mono-tech text-[11px] text-[#ECEEF2]">
            {alertBanner || `OTOPİLOT // ${autopilotLabel}`}
          </span>
          {alertBanner && (
            <button
              onClick={() => setAlertBanner(null)}
              className="font-mono-tech text-[10px] text-[#7C8492] hover:text-white cursor-pointer"
            >
              [X]
            </button>
          )}
        </div>
      )}

      {/* LEFT VERTICAL SWISS INSTRUMENT LAYER RACK */}
      <nav className="fixed top-[54px] left-3 bottom-10 w-[134px] z-20 flex flex-col gap-1 overflow-y-auto pr-0.5 pointer-events-auto">
        <div className="px-2 py-1 bg-[#0B0C0E]/90 border border-[#242830] font-mono-tech text-[9px] text-[#7C8492] tracking-widest">
          KATMAN ANAHTARI
        </div>
        {layerRack.map((item) => {
          const on = layers[item.key];
          return (
            <button
              key={item.key}
              onClick={() => toggleLayer(item.key)}
              className={`px-2 py-1.5 border text-left flex items-center justify-between transition cursor-pointer ${
                on
                  ? 'bg-[#12151B]/95 border-[#3A414E] text-[#ECEEF2]'
                  : 'bg-[#0B0C0E]/75 border-[#1C1F26] text-[#5B6370] hover:text-[#9BA3B0]'
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono-tech text-[10px]">
                <span
                  className="led-dot"
                  style={{ backgroundColor: on ? item.color : '#262A33' }}
                />
                {item.label}
              </span>
              {typeof item.count === 'number' && (
                <span className="font-mono-tech text-[9px] text-[#7C8492]">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* RAINVIEWER LIVE RADAR TIME-SCRUB BAR */}
      {layers.radar && rainMeta && rainMeta.frames.length > 0 && (
        <div className="fixed bottom-11 left-1/2 -translate-x-1/2 z-30 inst-panel reticle-corner px-3 py-2 flex items-center gap-3 w-[360px] max-w-[90vw]">
          <button
            onClick={() => {
              sound.playClick();
              setRadarPlaying((p) => !p);
            }}
            className="inst-btn inst-btn-orange p-1.5"
          >
            {radarPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between font-mono-tech text-[9px] text-[#9BA3B0] mb-1">
              <span>RAINVIEWER YAĞIŞ RADARI</span>
              <span className="text-[#38BDF8]">{radarTimeLabel}</span>
            </div>
            <input
              type="range"
              min={0}
              max={rainMeta.frames.length - 1}
              value={radarIdx}
              onChange={(e) => setRadarIdx(Number(e.target.value))}
              className="w-full accent-[#FF4D00] h-1 bg-[#242830] cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* BOTTOM SWISS COORDINATE RULER & TELEMETRY FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 h-[28px] bg-[#0B0C0E]/95 border-t border-[#242830] z-20 flex items-center justify-between px-3 font-mono-tech text-[10px] text-[#7C8492]">
        <div className="flex items-center gap-3">
          <span className="text-[#ECEEF2]">
            LAT {Math.abs(cursor.lat).toFixed(4)}°{cursor.lat >= 0 ? 'N' : 'S'}
          </span>
          <span className="text-[#ECEEF2]">
            LON {Math.abs(cursor.lon).toFixed(4)}°{cursor.lon >= 0 ? 'E' : 'W'}
          </span>
          <span className="hidden sm:inline text-[#5E6673]">Z {cursor.zoom.toFixed(2)}</span>
          <span className="hidden md:inline-block w-24 h-2.5 ruler-x opacity-60" />
        </div>

        <div className="flex items-center gap-3 truncate">
          {selectedSat ? (
            <span className="flex items-center gap-2 text-[#FF4D00]">
              <span>YÖRÜNGE KİLİTLİ: {selectedSat.name}</span>
              <button
                onClick={() => setSelectedSat(null)}
                className="underline text-[#ECEEF2] cursor-pointer"
              >
                TEMİZLE
              </button>
            </span>
          ) : earthquakes[0] ? (
            <span className="truncate">
              SON SİSMİK:{' '}
              <strong className="text-[#FF4D00]">M{earthquakes[0].mag.toFixed(1)}</strong>{' '}
              {earthquakes[0].title} ({earthquakes[0].source})
            </span>
          ) : (
            <span>KÜREDE HERHANGİ BİR NOKTAYA TIKLAYARAK TELEMETRİ ÇEKİN • CTRL+K</span>
          )}
        </div>
      </footer>

      {/* RIGHT REGION DRAWER */}
      <RegionDrawer
        place={selectedPlace}
        onClose={() => {
          setSelectedPlace(null);
          setActiveCamera(null);
        }}
        cameras={cameras}
        onAddCamera={(cam) => saveCameras([cam, ...customCameras])}
        earthquakes={earthquakes}
        flights={flights}
        kiwisdr={kiwisdr}
        activeCamera={activeCamera}
        onSelectCamera={setActiveCamera}
        config={config}
        requestedTab={requestedTab}
      />

      {/* MODALS */}
      <MultiCamWall open={wallOpen} onClose={() => setWallOpen(false)} cameras={cameras} />
      <AlertModal open={alertsOpen} onClose={() => setAlertsOpen(false)} rules={rules} onSaveRules={saveRules} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={saveConfig}
        cameras={cameras}
        onImportCameras={(imported) => saveCameras(imported)}
      />
    </div>
  );
}
