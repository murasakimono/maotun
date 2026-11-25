import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Cpu,
  ExternalLink,
  Newspaper,
  Pause,
  Play,
  Plus,
  Radio,
  Tv,
  Video,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import type {
  ApiKeysConfig,
  EarthquakeItem,
  FlightItem,
  KiwiSdrNode,
  LiveCamera,
  NewsItem,
  OutageItem,
  PlaceInfo,
  RadioStation,
  TvChannel,
  WeatherAqi,
} from '../types';
import { api } from '../api';
import { HlsPlayer } from './HlsPlayer';
import { CameraFeed } from './CameraFeed';
import { AudioSpectrum } from './AudioSpectrum';
import { sound } from '../sound';

interface RegionDrawerProps {
  place: PlaceInfo | null;
  onClose: () => void;
  cameras: LiveCamera[];
  onAddCamera: (cam: LiveCamera) => void;
  earthquakes: EarthquakeItem[];
  flights: FlightItem[];
  kiwisdr: KiwiSdrNode[];
  activeCamera: LiveCamera | null;
  onSelectCamera: (cam: LiveCamera | null) => void;
  config: ApiKeysConfig;
  requestedTab?: { tab: 'cams' | 'radio' | 'sdr' | 'tv' | 'signals' | 'news' | 'brief'; ts: number } | null;
}

type TabKey = 'cams' | 'radio' | 'sdr' | 'tv' | 'signals' | 'news' | 'brief';

export function RegionDrawer({
  place,
  onClose,
  cameras,
  onAddCamera,
  earthquakes,
  flights,
  kiwisdr,
  activeCamera,
  onSelectCamera,
  config,
  requestedTab,
}: RegionDrawerProps) {
  const [tab, setTab] = useState<TabKey>('cams');
  const [radios, setRadios] = useState<RadioStation[]>([]);
  const [tvs, setTvs] = useState<TvChannel[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [outages, setOutages] = useState<OutageItem[]>([]);
  const [weather, setWeather] = useState<WeatherAqi | null>(null);
  const [loading, setLoading] = useState(false);

  const [playingRadio, setPlayingRadio] = useState<RadioStation | null>(null);
  const [radioPaused, setRadioPaused] = useState(false);
  const [playingTv, setPlayingTv] = useState<TvChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  // Add custom cam form
  const [showAddCam, setShowAddCam] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamUrl, setNewCamUrl] = useState('');
  const [newCamKind, setNewCamKind] = useState<'youtube' | 'hls' | 'snapshot'>('hls');
  const [newCamRefresh, setNewCamRefresh] = useState(5);

  useEffect(() => {
    if (!place) return;
    setLoading(true);
    setBrief('');
    setPlayingTv(null);
    Promise.all([
      api.getRadios(place.country_code, place.city).catch(() => []),
      api.getTvChannels(place.country_code).catch(() => []),
      api.getNews(place.city !== 'Bölge' ? place.city : place.country).catch(() => []),
      api.getOutages(place.country_code).catch(() => []),
      api.getWeatherAqi(place.lat, place.lon).catch(() => null),
    ]).then(([r, t, n, o, w]) => {
      setRadios(r);
      setTvs(t);
      setNews(n);
      setOutages(o);
      setWeather(w);
      setLoading(false);
    });
  }, [place?.lat, place?.lon, place?.country_code]);

  useEffect(() => {
    if (activeCamera) setTab('cams');
  }, [activeCamera]);

  useEffect(() => {
    if (requestedTab) setTab(requestedTab.tab);
  }, [requestedTab]);

  const nearbySdr = useMemo(() => {
    if (!place) return [];
    return [...kiwisdr]
      .map((k) => ({
        ...k,
        dist: Math.hypot(k.lat - place.lat, k.lon - place.lon),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 14);
  }, [kiwisdr, place]);

  if (!place) return null;

  const regionCams = cameras.filter(
    (c) =>
      c.country_code === place.country_code ||
      Math.hypot(c.lat - place.lat, c.lon - place.lon) < 8
  );
  const displayCams = regionCams.length > 0 ? regionCams : cameras;

  const nearbyEq = earthquakes
    .filter((e) => Math.hypot(e.lat - place.lat, e.lon - place.lon) < 7)
    .slice(0, 10);

  const toggleRadio = (st: RadioStation) => {
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

  const handleAddCam = () => {
    if (!newCamName.trim() || !newCamUrl.trim()) return;
    sound.playClick();
    let url = newCamUrl.trim();
    if (newCamKind === 'youtube' && url.includes('watch?v=')) {
      const vid = url.split('watch?v=')[1].split('&')[0];
      url = `https://www.youtube.com/embed/${vid}?autoplay=1&mute=1`;
    }
    const cam: LiveCamera = {
      id: `custom-${Date.now()}`,
      name: newCamName.trim(),
      city: place.city,
      country_code: place.country_code,
      lat: place.lat,
      lon: place.lon,
      kind: newCamKind,
      embed_url: url,
      refresh_sec: newCamKind === 'snapshot' ? newCamRefresh : undefined,
    };
    onAddCamera(cam);
    onSelectCamera(cam);
    setNewCamName('');
    setNewCamUrl('');
    setShowAddCam(false);
  };

  const runAiBrief = async () => {
    sound.playClick();
    setBriefLoading(true);
    setBrief('');
    const ctx = [
      weather
        ? `Hava: ${weather.temp_c}°C, Rüzgâr ${weather.wind_kmh} km/s, Nem %${weather.humidity}, PM2.5: ${weather.pm25}, US AQI: ${weather.us_aqi}`
        : '',
      `Yakın depremler (${nearbyEq.length}): ${nearbyEq.slice(0, 4).map((e) => `M${e.mag} ${e.title}`).join('; ') || 'Yok'}`,
      `Bölgedeki canlı uçuş sayısı: ${flights.length}`,
      `İnternet/BGP durumu: ${outages.map((o) => `${o.entity} ${o.datasource} (${o.level})`).join('; ') || 'Normal'}`,
      `Güncel başlıklar: ${news.slice(0, 4).map((n) => n.title).join(' | ') || 'Yok'}`,
    ].join('\n');
    try {
      const out = await api.aiRegionBrief(
        `${place.city}, ${place.country}`,
        ctx,
        config.ollamaEndpoint,
        config.ollamaModel
      );
      setBrief(out);
    } catch (e) {
      setBrief(`Ollama erişilemedi (${String(e)}). Lokal Ollama servisinin çalıştığından emin olun.`);
    } finally {
      setBriefLoading(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'cams', label: 'KAM', icon: <Video className="w-3 h-3" /> },
    { key: 'radio', label: 'RADYO', icon: <Radio className="w-3 h-3" /> },
    { key: 'sdr', label: 'SDR', icon: <Waves className="w-3 h-3" /> },
    { key: 'tv', label: 'TV', icon: <Tv className="w-3 h-3" /> },
    { key: 'signals', label: 'SİNYAL', icon: <Activity className="w-3 h-3" /> },
    { key: 'news', label: 'HABER', icon: <Newspaper className="w-3 h-3" /> },
    { key: 'brief', label: 'AI', icon: <Cpu className="w-3 h-3" /> },
  ];

  const aqiColor =
    !weather || weather.us_aqi <= 50
      ? 'text-[#00E58A]'
      : weather.us_aqi <= 100
      ? 'text-[#FFB800]'
      : 'text-[#FF2A3B]';

  return (
    <aside className="fixed top-[52px] right-3 bottom-9 w-[420px] max-w-[94vw] inst-panel reticle-corner flex flex-col z-30">
      <audio ref={audioRef} crossOrigin="anonymous" />

      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-[#242830] flex items-start justify-between gap-2 bg-[#0B0C0E]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono-tech text-[10px] px-1.5 py-0.5 bg-[#FF4D00] text-[#08090B] font-semibold">
              {place.country_code}
            </span>
            <h2 className="font-semibold text-sm text-[#ECEEF2] truncate uppercase tracking-wide">
              {place.city}
            </h2>
          </div>
          <p className="font-mono-tech text-[10px] text-[#7C8492] truncate mt-0.5">
            {place.country} • {place.lat.toFixed(4)}°N, {place.lon.toFixed(4)}°E
          </p>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="inst-btn p-1"
          title="Paneli Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Open-Meteo Weather & Air Quality Telemetry Strip */}
      {weather && (
        <div className="grid grid-cols-4 border-b border-[#242830] bg-[#0F1115] divide-x divide-[#242830] font-mono-tech text-[10px]">
          <div className="px-2.5 py-1.5">
            <div className="text-[#5E6673] text-[9px]">SICAKLIK</div>
            <div className="text-[#ECEEF2] font-semibold">{weather.temp_c.toFixed(1)}°C</div>
          </div>
          <div className="px-2.5 py-1.5">
            <div className="text-[#5E6673] text-[9px] flex items-center gap-1">
              <Wind className="w-2.5 h-2.5" /> RÜZGÂR
            </div>
            <div className="text-[#ECEEF2] font-semibold">{weather.wind_kmh.toFixed(0)} KM/S</div>
          </div>
          <div className="px-2.5 py-1.5">
            <div className="text-[#5E6673] text-[9px]">PM2.5</div>
            <div className="text-[#ECEEF2] font-semibold">{weather.pm25.toFixed(1)} µg</div>
          </div>
          <div className="px-2.5 py-1.5">
            <div className="text-[#5E6673] text-[9px]">US AQI</div>
            <div className={`font-semibold ${aqiColor}`}>{weather.us_aqi || '--'}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-7 border-b border-[#242830] bg-[#0B0C0E]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              sound.playClick();
              setTab(t.key);
            }}
            className={`py-2 flex flex-col items-center gap-0.5 font-mono-tech text-[9px] tracking-wider border-b-2 transition cursor-pointer ${
              tab === t.key
                ? 'border-[#FF4D00] text-white bg-[#15181F]'
                : 'border-transparent text-[#6B7280] hover:text-[#ECEEF2]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading && (
          <div className="font-mono-tech text-[10px] text-[#FF4D00] animate-pulse">
            // TELEMETRİ SENKRONİZE EDİLİYOR...
          </div>
        )}

        {/* CAMERAS */}
        {tab === 'cams' && (
          <div className="space-y-2.5">
            {activeCamera && (
              <div className="border border-[#242830] bg-[#08090B]">
                <div className="aspect-video w-full">
                  <CameraFeed cam={activeCamera} />
                </div>
                <div className="px-2.5 py-1.5 flex items-center justify-between border-t border-[#242830]">
                  <span className="font-mono-tech text-[10px] text-[#ECEEF2] truncate">
                    {activeCamera.name}
                  </span>
                  <span className="font-mono-tech text-[9px] text-[#00E58A]">● CANLI</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-[10px] text-[#7C8492]">
                OPTİK KAYNAKLAR ({displayCams.length})
              </span>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAddCam((s) => !s);
                }}
                className="inst-btn px-2 py-1 text-[10px]"
              >
                <Plus className="w-3 h-3 text-[#FF4D00]" /> KAYNAK EKLE
              </button>
            </div>

            {showAddCam && (
              <div className="inst-plate p-2.5 space-y-2">
                <input
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                  placeholder="Kamera adı (ör. Beşiktaş Trafik / İBB)"
                  className="w-full bg-[#08090B] border border-[#242830] px-2 py-1.5 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#FF4D00]"
                />
                <input
                  value={newCamUrl}
                  onChange={(e) => setNewCamUrl(e.target.value)}
                  placeholder="YouTube Live, .m3u8 HLS veya JPEG Snapshot URL"
                  className="w-full bg-[#08090B] border border-[#242830] px-2 py-1.5 font-mono-tech text-xs text-[#ECEEF2] focus:outline-none focus:border-[#FF4D00]"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={newCamKind}
                    onChange={(e) =>
                      setNewCamKind(e.target.value as 'youtube' | 'hls' | 'snapshot')
                    }
                    className="bg-[#08090B] border border-[#242830] px-2 py-1 font-mono-tech text-[10px] text-[#ECEEF2]"
                  >
                    <option value="hls">HLS (.m3u8)</option>
                    <option value="youtube">YouTube Live</option>
                    <option value="snapshot">JPEG Snapshot (Oto Yenile)</option>
                  </select>
                  {newCamKind === 'snapshot' && (
                    <input
                      type="number"
                      min={2}
                      max={60}
                      value={newCamRefresh}
                      onChange={(e) => setNewCamRefresh(Number(e.target.value) || 5)}
                      className="w-14 bg-[#08090B] border border-[#242830] px-1.5 py-1 font-mono-tech text-[10px] text-[#ECEEF2]"
                      title="Yenileme (sn)"
                    />
                  )}
                  <button onClick={handleAddCam} className="inst-btn inst-btn-orange px-3 py-1">
                    KAYDET
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {displayCams.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => {
                    sound.playClick();
                    onSelectCamera(cam);
                  }}
                  className={`w-full text-left px-2.5 py-2 border transition flex items-center justify-between cursor-pointer ${
                    activeCamera?.id === cam.id
                      ? 'bg-[#FF4D00]/12 border-[#FF4D00]'
                      : 'bg-[#111317] border-[#242830] hover:border-[#4A5261]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#ECEEF2] truncate">{cam.name}</div>
                    <div className="font-mono-tech text-[10px] text-[#7C8492]">
                      {cam.city} • {cam.kind.toUpperCase()}
                    </div>
                  </div>
                  <Play className="w-3.5 h-3.5 text-[#00E58A] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RADIO + LIVE FFT SPECTRUM */}
        {tab === 'radio' && (
          <div className="space-y-2.5">
            {playingRadio && (
              <div className="inst-plate p-2.5 space-y-2 border-l-2 border-l-[#FF4D00]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono-tech text-[9px] text-[#FF4D00]">
                      ● CANLI YAYIN ({playingRadio.bitrate} KBPS)
                    </div>
                    <div className="text-xs font-semibold text-white truncate">
                      {playingRadio.name}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRadio(playingRadio)}
                    className="inst-btn inst-btn-orange p-1.5"
                  >
                    {radioPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <AudioSpectrum audioEl={audioRef.current} active={!radioPaused} />
              </div>
            )}

            <div className="space-y-1">
              {radios.map((st) => (
                <button
                  key={st.id || st.stream_url}
                  onClick={() => toggleRadio(st)}
                  className={`w-full text-left px-2.5 py-2 border transition flex items-center justify-between cursor-pointer ${
                    playingRadio?.id === st.id
                      ? 'bg-[#FF4D00]/12 border-[#FF4D00]'
                      : 'bg-[#111317] border-[#242830] hover:border-[#4A5261]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#ECEEF2] truncate">{st.name}</div>
                    <div className="font-mono-tech text-[10px] text-[#7C8492] truncate">
                      {st.bitrate} KBPS • {st.tags || st.country}
                    </div>
                  </div>
                  <Radio className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" />
                </button>
              ))}
              {!loading && radios.length === 0 && (
                <div className="font-mono-tech text-xs text-[#6B7280] text-center py-6">
                  BU BÖLGEDE RADYO BULUNAMADI
                </div>
              )}
            </div>
          </div>
        )}

        {/* KIWISDR SHORTWAVE RECEIVERS */}
        {tab === 'sdr' && (
          <div className="space-y-2">
            <div className="font-mono-tech text-[10px] text-[#C084FC]">
              EN YAKIN AÇIK KIWISDR KISA DALGA ALICILARI (0–30 MHZ)
            </div>
            {nearbySdr.map((k, i) => {
              const safeUrl = k.url.startsWith('http') ? k.url : `http://${k.url}`;
              return (
                <a
                  key={i}
                  href={safeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-2.5 py-2 bg-[#111317] border border-[#242830] hover:border-[#C084FC] transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#ECEEF2] truncate">{k.name}</span>
                    <ExternalLink className="w-3 h-3 text-[#C084FC] shrink-0" />
                  </div>
                  <div className="font-mono-tech text-[10px] text-[#7C8492] mt-0.5 flex items-center justify-between">
                    <span>{k.bands}</span>
                    <span>
                      SLOTS: {k.users}/{k.users_max}
                    </span>
                  </div>
                </a>
              );
            })}
            {nearbySdr.length === 0 && (
              <div className="font-mono-tech text-xs text-[#6B7280] text-center py-6">
                KIWISDR LİSTESİ YÜKLENİYOR...
              </div>
            )}
          </div>
        )}

        {/* LIVE TV */}
        {tab === 'tv' && (
          <div className="space-y-2.5">
            {playingTv && (
              <div className="border border-[#242830] bg-[#08090B]">
                <div className="aspect-video w-full">
                  <HlsPlayer src={playingTv.stream_url} />
                </div>
                <div className="px-2.5 py-1.5 font-mono-tech text-[10px] text-[#ECEEF2] border-t border-[#242830] flex justify-between">
                  <span className="truncate">{playingTv.name}</span>
                  <span className="text-[#FF4D00]">HLS</span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              {tvs.map((ch, idx) => (
                <button
                  key={`${ch.name}-${idx}`}
                  onClick={() => {
                    sound.playClick();
                    setPlayingTv(ch);
                  }}
                  className={`w-full text-left px-2.5 py-2 border transition flex items-center justify-between cursor-pointer ${
                    playingTv?.stream_url === ch.stream_url
                      ? 'bg-[#FF4D00]/12 border-[#FF4D00]'
                      : 'bg-[#111317] border-[#242830] hover:border-[#4A5261]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#ECEEF2] truncate">{ch.name}</div>
                    <div className="font-mono-tech text-[10px] text-[#7C8492]">{ch.group}</div>
                  </div>
                  <Tv className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SIGNALS */}
        {tab === 'signals' && (
          <div className="space-y-3">
            <div>
              <div className="font-mono-tech text-[10px] text-[#FF4D00] mb-1.5">
                BÖLGEDEKİ DEPREMLER ({nearbyEq.length})
              </div>
              {nearbyEq.length === 0 ? (
                <div className="font-mono-tech text-[11px] text-[#6B7280] inst-plate p-2">
                  YAKIN ÇEVREDE SİSMİK KAYIT YOK
                </div>
              ) : (
                <div className="space-y-1">
                  {nearbyEq.map((e) => (
                    <div
                      key={e.id}
                      className="inst-plate px-2.5 py-1.5 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-[#ECEEF2] truncate">{e.title}</div>
                        <div className="font-mono-tech text-[10px] text-[#7C8492]">
                          {e.source} • {e.depth_km.toFixed(1)} KM • {e.time_str}
                        </div>
                      </div>
                      <span
                        className={`font-mono-tech text-xs font-semibold px-1.5 py-0.5 ${
                          e.mag >= 4
                            ? 'bg-[#FF2A3B]/20 text-[#FF2A3B]'
                            : 'bg-[#FFB800]/15 text-[#FFB800]'
                        }`}
                      >
                        M{e.mag.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="font-mono-tech text-[10px] text-[#00D4FF] mb-1.5">
                İNTERNET / BGP OMURGASI (IODA + RIPE RIS)
              </div>
              {outages.length === 0 ? (
                <div className="font-mono-tech text-[11px] text-[#00E58A] inst-plate p-2">
                  ● ANOMALİ / KESİNTİ YOK
                </div>
              ) : (
                <div className="space-y-1">
                  {outages.map((o, i) => (
                    <div key={i} className="inst-plate px-2.5 py-1.5 font-mono-tech text-[10px]">
                      <div className="text-[#ECEEF2]">{o.entity}</div>
                      <div className="text-[#7C8492]">
                        {o.datasource} • DURUM: {o.level.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEWS */}
        {tab === 'news' && (
          <div className="space-y-1.5">
            {news.map((n, i) => (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block inst-plate p-2.5 hover:border-[#FF4D00] transition"
              >
                <div className="text-xs text-[#ECEEF2] leading-snug">{n.title}</div>
                <div className="font-mono-tech text-[10px] text-[#7C8492] mt-1 flex items-center justify-between">
                  <span>{n.domain}</span>
                  <ExternalLink className="w-3 h-3 text-[#FF4D00]" />
                </div>
              </a>
            ))}
            {!loading && news.length === 0 && (
              <div className="font-mono-tech text-xs text-[#6B7280] text-center py-6">
                GDELT HABERİ BULUNAMADI
              </div>
            )}
          </div>
        )}

        {/* AI BRIEF */}
        {tab === 'brief' && (
          <div className="space-y-2.5">
            <div className="inst-plate p-2.5 font-mono-tech text-[10px] text-[#7C8492]">
              MODEL: <span className="text-[#ECEEF2]">{config.ollamaModel}</span> • ENDPOINT:{' '}
              <span className="text-[#ECEEF2]">{config.ollamaEndpoint}</span>
            </div>
            <button
              onClick={runAiBrief}
              disabled={briefLoading}
              className="w-full inst-btn inst-btn-orange py-2"
            >
              {briefLoading ? 'BRİFİNG OLUŞTURULUYOR...' : 'BÖLGE DURUM BRİFİNGİ ÜRET'}
            </button>
            {brief && (
              <div className="inst-plate p-3 text-xs leading-relaxed text-[#ECEEF2] whitespace-pre-wrap border-l-2 border-l-[#00D4FF]">
                {brief}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
