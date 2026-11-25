import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Award,
  Building2,
  Camera,
  CloudRain,
  Cpu,
  Droplets,
  ExternalLink,
  Moon,
  Newspaper,
  Pause,
  Play,
  Plus,
  Radio,
  ShieldAlert,
  Sparkles,
  Sun,
  Trees,
  Tv,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import type {
  ApiKeysConfig,
  CountryContext,
  EarthquakeItem,
  IstanbulData,
  KiwiSdrNode,
  LiveCamera,
  NewsItem,
  OsmPoi,
  OutageItem,
  PlaceInfo,
  RadioStation,
  RichForecast,
  TvChannel,
  WikiPlace,
  WildlifeObs,
} from '../types';
import { api } from '../api';
import { computeAstroInfo, weatherCodeText } from '../geo';
import { HlsPlayer } from './HlsPlayer';
import { CameraFeed } from './CameraFeed';
import { sound } from '../sound';

export type DrawerPrimaryTab = 'overview' | 'media' | 'city' | 'news';
export type MediaSubTab = 'cams' | 'radio' | 'tv' | 'sdr';

interface RegionDrawerProps {
  place: PlaceInfo | null;
  onClose: () => void;
  cameras: LiveCamera[];
  onAddCamera: (cam: LiveCamera) => void;
  earthquakes: EarthquakeItem[];
  onSelectEq: (eq: EarthquakeItem) => void;
  kiwisdr: KiwiSdrNode[];
  activeCamera: LiveCamera | null;
  onSelectCamera: (cam: LiveCamera | null) => void;
  playingRadio: RadioStation | null;
  radioPaused: boolean;
  onPlayRadio: (st: RadioStation) => void;
  onShowOsmPois: (pois: OsmPoi[]) => void;
  onOpenDiscovery: () => void;
  config: ApiKeysConfig;
  requestedTab?: { primary: DrawerPrimaryTab; mediaSub?: MediaSubTab; ts: number } | null;
}

export function RegionDrawer({
  place,
  onClose,
  cameras,
  onAddCamera,
  earthquakes,
  onSelectEq,
  kiwisdr,
  activeCamera,
  onSelectCamera,
  playingRadio,
  radioPaused,
  onPlayRadio,
  onShowOsmPois,
  onOpenDiscovery,
  config,
  requestedTab,
}: RegionDrawerProps) {
  const [tab, setTab] = useState<DrawerPrimaryTab>('overview');
  const [mediaSub, setMediaSub] = useState<MediaSubTab>('cams');

  const [forecast, setForecast] = useState<RichForecast | null>(null);
  const [countryCtx, setCountryCtx] = useState<CountryContext | null>(null);
  const [wikiPlaces, setWikiPlaces] = useState<WikiPlace[]>([]);
  const [wildlife, setWildlife] = useState<WildlifeObs[]>([]);
  const [istanbul, setIstanbul] = useState<IstanbulData | null>(null);
  const [radios, setRadios] = useState<RadioStation[]>([]);
  const [tvs, setTvs] = useState<TvChannel[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [outages, setOutages] = useState<OutageItem[]>([]);
  const [osmPois, setOsmPois] = useState<OsmPoi[]>([]);
  const [activePoiKind, setActivePoiKind] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [playingTv, setPlayingTv] = useState<TvChannel | null>(null);
  const [brief, setBrief] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);

  // Custom camera form
  const [showAddCam, setShowAddCam] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamUrl, setNewCamUrl] = useState('');
  const [newCamKind, setNewCamKind] = useState<'youtube' | 'hls' | 'mp4' | 'snapshot'>('hls');

  useEffect(() => {
    if (!place) return;
    setLoading(true);
    setBrief('');
    setPlayingTv(null);
    setOsmPois([]);
    setActivePoiKind('');

    const isIstanbul =
      place.city.toLowerCase().includes('istanbul') ||
      place.display_name.toLowerCase().includes('istanbul') ||
      (Math.abs(place.lat - 41.01) < 0.45 && Math.abs(place.lon - 29.0) < 0.65);

    Promise.all([
      api.getForecastRich(place.lat, place.lon).catch(() => null),
      api.getCountryContext(place.country_code).catch(() => null),
      api.getWikiNearby(place.lat, place.lon, place.country_code).catch(() => []),
      api.getInaturalist(place.lat, place.lon).catch(() => []),
      api.getRadios(place.country_code, place.city).catch(() => []),
      api.getTvChannels(place.country_code).catch(() => []),
      api.getNews(place.city !== 'Bölge' ? place.city : place.country).catch(() => []),
      api.getOutages(place.country_code).catch(() => []),
      isIstanbul ? api.getIstanbulData().catch(() => null) : Promise.resolve(null),
    ]).then(([fc, ctx, wk, wl, rad, tv, nw, outg, ist]) => {
      setForecast(fc);
      setCountryCtx(ctx);
      setWikiPlaces(wk);
      setWildlife(wl);
      setRadios(rad);
      setTvs(tv);
      setNews(nw);
      setOutages(outg);
      setIstanbul(ist);
      setLoading(false);
    });
  }, [place?.lat, place?.lon, place?.country_code]);

  useEffect(() => {
    if (activeCamera) {
      setTab('media');
      setMediaSub('cams');
    }
  }, [activeCamera]);

  useEffect(() => {
    if (requestedTab) {
      setTab(requestedTab.primary);
      if (requestedTab.mediaSub) setMediaSub(requestedTab.mediaSub);
    }
  }, [requestedTab]);

  const nearbySdr = useMemo(() => {
    if (!place) return [];
    return [...kiwisdr]
      .map((k) => ({ ...k, dist: Math.hypot(k.lat - place.lat, k.lon - place.lon) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 12);
  }, [kiwisdr, place]);

  if (!place) return null;

  const regionCams = cameras.filter(
    (c) =>
      c.country_code === place.country_code ||
      Math.hypot(c.lat - place.lat, c.lon - place.lon) < 8
  );
  const displayCams = regionCams.length > 0 ? regionCams.slice(0, 20) : cameras.slice(0, 20);

  const nearbyEq = earthquakes
    .filter((e) => Math.hypot(e.lat - place.lat, e.lon - place.lon) < 7)
    .slice(0, 10);

  const astro = computeAstroInfo(
    forecast?.daily[0]?.sunrise,
    forecast?.daily[0]?.sunset,
    forecast?.cloud_cover ?? 30
  );

  const loadOsmKind = async (kind: string) => {
    sound.playClick();
    setActivePoiKind(kind);
    const list = await api.getOsmNearby(place.lat, place.lon, kind).catch(() => []);
    setOsmPois(list);
    onShowOsmPois(list);
  };

  const handleAddCam = () => {
    if (!newCamName.trim() || !newCamUrl.trim()) return;
    sound.playClick();
    let url = newCamUrl.trim();
    if (newCamKind === 'youtube' && url.includes('watch?v=')) {
      const vid = url.split('watch?v=')[1].split('&')[0];
      url = `https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&mute=1`;
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
      refresh_sec: newCamKind === 'snapshot' ? 5 : undefined,
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
      forecast
        ? `Hava: ${forecast.temp_c}°C (${weatherCodeText(forecast.weather_code)}), Rüzgâr ${forecast.wind_kmh} km/s, AQI ${forecast.us_aqi}, Sahra tozu ${forecast.dust}`
        : '',
      `Yakın depremler: ${nearbyEq.slice(0, 4).map((e) => `M${e.mag} ${e.title}`).join('; ') || 'Yok'}`,
      `OONI sansür anomalisi: ${countryCtx?.ooni_alerts.slice(0, 3).map((o) => o.domain).join(', ') || 'Yok'}`,
      `Haberler: ${news.slice(0, 4).map((n) => n.title).join(' | ') || 'Yok'}`,
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
      setBrief(`Ollama bağlantısı kurulamadı (${String(e)}).`);
    } finally {
      setBriefLoading(false);
    }
  };

  return (
    <aside className="fixed top-16 right-4 bottom-20 w-[410px] max-w-[92vw] atlas-glass rounded-2xl flex flex-col z-30 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[#E6E8EC] truncate">{place.city}</h2>
            <span className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.07] text-[#E5A952]">
              {place.country_code}
            </span>
          </div>
          <p className="text-xs text-[#8E95A3] truncate mt-0.5">
            {place.country} • <span className="font-mono-tech">{place.lat.toFixed(3)}°, {place.lon.toFixed(3)}°</span>
          </p>
        </div>
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="atlas-btn p-1.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Clean Primary Tabs */}
      <div className="grid grid-cols-4 px-2 pt-1.5 border-b border-white/[0.08]">
        {[
          { k: 'overview' as const, label: 'Genel', icon: <Sun className="w-3.5 h-3.5" /> },
          { k: 'media' as const, label: 'Medya', icon: <Radio className="w-3.5 h-3.5" /> },
          { k: 'city' as const, label: 'Şehir & Ağ', icon: <Building2 className="w-3.5 h-3.5" /> },
          { k: 'news' as const, label: 'Haber & AI', icon: <Newspaper className="w-3.5 h-3.5" /> },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => { sound.playClick(); setTab(t.k); }}
            className={`pb-2 pt-1 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 transition cursor-pointer ${
              tab === t.k
                ? 'border-[#E5A952] text-[#E6E8EC]'
                : 'border-transparent text-[#8E95A3] hover:text-[#E6E8EC]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {loading && (
          <div className="text-xs text-[#E5A952] animate-pulse">Bölge verileri güncelleniyor...</div>
        )}

        {/* TAB 1: OVERVIEW (7-Day Weather, Marine, Astro, Pollen, Currency, Wiki, Wildlife, Discovery) */}
        {tab === 'overview' && (
          <>
            {/* Hero Weather + 7-Day Forecast */}
            {forecast && (
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-mono-tech text-4xl font-semibold text-white leading-none">
                      {Math.round(forecast.temp_c)}°
                    </div>
                    <div className="text-xs text-[#8E95A3] mt-1">
                      {weatherCodeText(forecast.weather_code)} • Hissedilen {Math.round(forecast.apparent_c)}°
                    </div>
                  </div>
                  <div className="text-right font-mono-tech text-[11px] text-[#8E95A3] space-y-0.5">
                    <div className="flex items-center justify-end gap-1"><Wind className="w-3 h-3" /> {Math.round(forecast.wind_kmh)} km/s</div>
                    <div className="flex items-center justify-end gap-1"><Droplets className="w-3 h-3" /> %{Math.round(forecast.humidity)} nem</div>
                    <div>AQI <span className={forecast.us_aqi > 100 ? 'text-[#E85D4A]' : 'text-[#4ADE80]'}>{forecast.us_aqi || '--'}</span></div>
                  </div>
                </div>

                {/* 7-Day Forecast List */}
                {forecast.daily.length > 0 && (
                  <div className="pt-2 border-t border-white/[0.07] space-y-1.5">
                    <div className="text-[11px] font-semibold text-[#8E95A3]">7 Günlük Tahmin</div>
                    {forecast.daily.map((d, i) => {
                      const dayName =
                        i === 0
                          ? 'Bugün'
                          : new Date(d.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
                      return (
                        <div key={d.date} className="flex items-center justify-between text-xs py-0.5">
                          <span className="w-20 text-[#C4C9D4]">{dayName}</span>
                          <span className="text-[11px] text-[#8E95A3] flex-1 truncate">
                            {weatherCodeText(d.weather_code)}
                            {d.rain_prob >= 20 && (
                              <span className="text-[#60A5FA] ml-1.5">
                                <CloudRain className="w-3 h-3 inline mr-0.5" />%{d.rain_prob}
                              </span>
                            )}
                          </span>
                          <span className="font-mono-tech text-xs text-[#8E95A3] w-20 text-right">
                            {Math.round(d.temp_min)}° <span className="text-white font-medium">/ {Math.round(d.temp_max)}°</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Coastal Marine + Flood + Dust/Pollen */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.07] text-xs">
                  {forecast.sea_temp_c !== null && (
                    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                      <div className="text-[10px] text-[#60A5FA]">Deniz Suyu & Dalga</div>
                      <div className="font-mono-tech font-semibold text-white mt-0.5">
                        {forecast.sea_temp_c.toFixed(1)}°C • {(forecast.wave_height_m ?? 0).toFixed(1)}m
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="text-[10px] text-[#E5A952]">Sahra Tozu & PM2.5</div>
                    <div className="font-mono-tech font-semibold text-white mt-0.5">
                      {forecast.dust.toFixed(0)} µg • PM2.5: {forecast.pm25.toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="text-[10px] text-[#E5A952] flex items-center gap-1">
                      <Sun className="w-3 h-3" /> Altın Saat
                    </div>
                    <div className="font-mono-tech font-semibold text-white mt-0.5">
                      {astro.goldenEvening}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="text-[10px] text-[#8E95A3] flex items-center gap-1">
                      <Moon className="w-3 h-3" /> {astro.moonPhase}
                    </div>
                    <div className="font-mono-tech font-semibold text-white mt-0.5">
                      Yıldız: {astro.starScore}/100
                    </div>
                  </div>
                  {forecast.river_discharge !== null && forecast.river_discharge > 0.5 && (
                    <div className="col-span-2 rounded-xl bg-white/[0.03] px-3 py-2 flex items-center justify-between">
                      <span className="text-[11px] text-[#60A5FA]">Yakın Nehir Debisi</span>
                      <span className="font-mono-tech text-xs text-white">
                        {forecast.river_discharge.toFixed(1)} m³/s (Ort: {(forecast.river_mean ?? 0).toFixed(1)})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discovery Quest CTA */}
            <button
              onClick={onOpenDiscovery}
              className="w-full atlas-btn atlas-btn-amber py-2.5 justify-between px-3.5"
            >
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4" /> Bu İlçede Rastgele Keşif Görevi Al
              </span>
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Currency & Public Holiday */}
            {countryCtx && (
              <div className="pt-3 border-t border-white/[0.07] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8E95A3]">Canlı Kur</span>
                  <span className="font-mono-tech text-[#E6E8EC]">
                    {countryCtx.local_to_try
                      ? `1 ${countryCtx.local_currency} = ${countryCtx.local_to_try.toFixed(2)} ₺`
                      : `USD ${countryCtx.usd_try.toFixed(2)}₺ • EUR ${countryCtx.eur_try.toFixed(2)}₺`}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#8E95A3] shrink-0">Sıradaki Tatil</span>
                  <span className="text-[#C4C9D4] truncate">{countryCtx.next_holiday}</span>
                </div>
              </div>
            )}

            {/* Wikipedia Nearby Landmarks */}
            {wikiPlaces.length > 0 && (
              <div className="pt-3 border-t border-white/[0.07] space-y-1.5">
                <div className="text-[11px] font-semibold text-[#8E95A3]">Yakındaki Tarihi & Önemli Noktalar</div>
                <div className="space-y-1">
                  {wikiPlaces.slice(0, 6).map((w) => (
                    <a
                      key={w.pageid}
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.05] transition text-xs"
                    >
                      <span className="text-[#E6E8EC] truncate">{w.title}</span>
                      <span className="font-mono-tech text-[10px] text-[#8E95A3] shrink-0 ml-2">
                        {Math.round(w.dist_m)} m
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* iNaturalist Live Wildlife Photos */}
            {wildlife.length > 0 && (
              <div className="pt-3 border-t border-white/[0.07] space-y-2">
                <div className="text-[11px] font-semibold text-[#8E95A3] flex items-center gap-1.5">
                  <Trees className="w-3.5 h-3.5 text-[#4ADE80]" /> Yakında Gözlenen Yaban Hayatı (iNaturalist)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {wildlife.slice(0, 4).map((wl) => (
                    <div key={wl.id} className="rounded-xl overflow-hidden bg-white/[0.03]">
                      <img src={wl.photo_url} alt={wl.common_name} className="w-full h-24 object-cover" />
                      <div className="p-2">
                        <div className="text-[11px] font-medium text-[#E6E8EC] truncate">{wl.common_name}</div>
                        <div className="text-[10px] text-[#8E95A3] truncate">{wl.observed_on}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: MEDIA (Cams, Persistent Radio, Live TV, KiwiSDR) */}
        {tab === 'media' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1 bg-white/[0.03] p-1 rounded-xl">
              {[
                { k: 'cams' as const, label: 'Kamera', icon: <Camera className="w-3 h-3" /> },
                { k: 'radio' as const, label: 'Radyo', icon: <Radio className="w-3 h-3" /> },
                { k: 'tv' as const, label: 'TV', icon: <Tv className="w-3 h-3" /> },
                { k: 'sdr' as const, label: 'KiwiSDR', icon: <Waves className="w-3 h-3" /> },
              ].map((s) => (
                <button
                  key={s.k}
                  onClick={() => { sound.playClick(); setMediaSub(s.k); }}
                  className={`py-1.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
                    mediaSub === s.k ? 'bg-[#E5A952] text-[#090B0E]' : 'text-[#8E95A3] hover:text-white'
                  }`}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {mediaSub === 'cams' && (
              <div className="space-y-2.5">
                {activeCamera && (
                  <div className="rounded-xl overflow-hidden bg-black">
                    <div className="aspect-video w-full">
                      <CameraFeed cam={activeCamera} />
                    </div>
                    <div className="px-3 py-1.5 flex items-center justify-between text-[11px] bg-white/[0.04]">
                      <span className="truncate">{activeCamera.name}</span>
                      <span className="text-[#4ADE80] shrink-0">Canlı</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8E95A3]">{displayCams.length} kamera</span>
                  <button onClick={() => setShowAddCam((v) => !v)} className="atlas-btn px-2.5 py-1 bg-white/[0.05] text-xs">
                    <Plus className="w-3.5 h-3.5 text-[#E5A952]" /> Kamera Ekle
                  </button>
                </div>

                {showAddCam && (
                  <div className="rounded-xl bg-white/[0.04] p-3 space-y-2">
                    <input
                      value={newCamName}
                      onChange={(e) => setNewCamName(e.target.value)}
                      placeholder="Kamera adı"
                      className="w-full bg-[#090B0E] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      value={newCamUrl}
                      onChange={(e) => setNewCamUrl(e.target.value)}
                      placeholder="HLS (.m3u8), MP4, Snapshot veya YouTube URL"
                      className="w-full bg-[#090B0E] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={newCamKind}
                        onChange={(e) => setNewCamKind(e.target.value as 'hls' | 'mp4' | 'snapshot' | 'youtube')}
                        className="bg-[#090B0E] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                      >
                        <option value="hls">HLS (.m3u8)</option>
                        <option value="mp4">MP4</option>
                        <option value="snapshot">JPEG Snapshot</option>
                        <option value="youtube">YouTube Live</option>
                      </select>
                      <button onClick={handleAddCam} className="atlas-btn atlas-btn-amber px-3 py-1">Kaydet</button>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  {displayCams.map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => { sound.playClick(); onSelectCamera(cam); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        activeCamera?.id === cam.id ? 'bg-[#E5A952]/15 text-white' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{cam.name}</div>
                        <div className="text-[10px] text-[#8E95A3]">{cam.city} • {cam.kind.toUpperCase()}</div>
                      </div>
                      <Play className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mediaSub === 'radio' && (
              <div className="space-y-1">
                <div className="text-[11px] text-[#8E95A3] pb-1">
                  Radyoyu açtığında paneli kapatsan bile sol altta çalmaya devam eder.
                </div>
                {radios.map((st) => {
                  const isThis = playingRadio?.id === st.id;
                  return (
                    <button
                      key={st.id || st.stream_url}
                      onClick={() => onPlayRadio(st)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        isThis ? 'bg-[#E5A952]/18 text-white' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{st.name}</div>
                        <div className="text-[10px] text-[#8E95A3] truncate">{st.bitrate} kbps • {st.tags || st.country}</div>
                      </div>
                      {isThis && !radioPaused ? (
                        <Pause className="w-3.5 h-3.5 text-[#E5A952] shrink-0" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {mediaSub === 'tv' && (
              <div className="space-y-2.5">
                {playingTv && (
                  <div className="rounded-xl overflow-hidden bg-black">
                    <div className="aspect-video w-full">
                      <HlsPlayer src={playingTv.stream_url} />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {tvs.map((ch, idx) => (
                    <button
                      key={`${ch.name}-${idx}`}
                      onClick={() => { sound.playClick(); setPlayingTv(ch); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition cursor-pointer ${
                        playingTv?.stream_url === ch.stream_url ? 'bg-[#E5A952]/15 text-white' : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{ch.name}</div>
                        <div className="text-[10px] text-[#8E95A3]">{ch.group}</div>
                      </div>
                      <Tv className="w-3.5 h-3.5 text-[#E5A952] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mediaSub === 'sdr' && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-[#8E95A3]">En yakın açık KiwiSDR kısa dalga alıcıları (0–30 MHz)</div>
                {nearbySdr.map((k, i) => {
                  const safeUrl = k.url.startsWith('http') ? k.url : `http://${k.url}`;
                  return (
                    <a
                      key={i}
                      href={safeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block px-3 py-2 rounded-xl hover:bg-white/[0.05] transition"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-[#E6E8EC] truncate">{k.name}</span>
                        <ExternalLink className="w-3 h-3 text-[#C084FC] shrink-0" />
                      </div>
                      <div className="font-mono-tech text-[10px] text-[#8E95A3] mt-0.5">
                        {k.bands} • {k.users}/{k.users_max} kullanıcı
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CITY & INFRASTRUCTURE (Overpass POI, Istanbul Dams, TR Pharmacies, Seismic, OONI/BGP) */}
        {tab === 'city' && (
          <div className="space-y-4">
            {/* 1-Click OSM Nearby Radar */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#C4C9D4]">Tek Tıkla Yakın Çevre (Haritada Pinler)</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { k: 'metro', label: 'Metro / Ray' },
                  { k: 'hospital', label: 'Hastane' },
                  { k: 'pharmacy', label: 'Eczane' },
                  { k: 'park', label: 'Park / Toplanma' },
                  { k: 'ev', label: 'EV Şarj' },
                ].map((b) => (
                  <button
                    key={b.k}
                    onClick={() => loadOsmKind(b.k)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                      activePoiKind === b.k
                        ? 'bg-[#E5A952] text-[#090B0E] font-semibold'
                        : 'bg-white/[0.05] text-[#C4C9D4] hover:bg-white/[0.1]'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              {osmPois.length > 0 && (
                <div className="max-h-36 overflow-y-auto space-y-1 pt-1">
                  {osmPois.slice(0, 12).map((p) => (
                    <div key={p.id} className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
                      <span className="truncate text-[#E6E8EC]">{p.name}</span>
                      <span className="text-[10px] text-[#8E95A3] shrink-0 ml-2">{p.extra || p.kind}</span>
                    </div>
                  ))}
                </div>
              )}
              {place.country_code === 'TR' && (
                <a
                  href="https://www.turkiye.gov.tr/saglik-titck-nobetci-eczane-sorgulama"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] text-[#E5A952] hover:underline"
                >
                  Resmî e-Devlet Nöbetçi Eczane Sorgula <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Istanbul Special: ISKI Dams */}
            {istanbul && (
              <div className="pt-3 border-t border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#60A5FA]">İstanbul İSKİ Baraj Dolulukları</span>
                  <span className="font-mono-tech text-xs font-semibold text-white">
                    Ort. %{istanbul.total_dam_percent.toFixed(1)}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {istanbul.dams.slice(0, 6).map((d) => (
                    <div key={d.name} className="space-y-0.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#C4C9D4]">{d.name}</span>
                        <span className="font-mono-tech text-[#8E95A3]">%{d.percent.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                        <div className="h-full bg-[#60A5FA]" style={{ width: `${Math.min(100, d.percent)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[#5C6372]">{istanbul.note}</div>
              </div>
            )}

            {/* Seismic & Felt Radius */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <div className="text-xs font-semibold text-[#E85D4A] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Bölgedeki Depremler ({nearbyEq.length})
              </div>
              {nearbyEq.length === 0 ? (
                <div className="text-xs text-[#8E95A3]">Yakın çevrede son 24 saatte kayıt yok.</div>
              ) : (
                <div className="space-y-1">
                  {nearbyEq.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => { sound.playClick(); onSelectEq(e); }}
                      className="w-full text-left px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-[#E6E8EC] truncate">{e.title}</div>
                        <div className="text-[10px] text-[#8E95A3]">{e.source} • {e.depth_km.toFixed(1)} km</div>
                      </div>
                      <span className="font-mono-tech text-xs font-semibold text-[#E85D4A] ml-2">
                        M{e.mag.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* OONI Censorship + IODA/RIPE BGP */}
            <div className="pt-3 border-t border-white/[0.08] space-y-2">
              <div className="text-xs font-semibold text-[#E5A952] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> İnternet Sansürü (OONI) & BGP Omurgası
              </div>
              {countryCtx && countryCtx.ooni_alerts.length > 0 ? (
                <div className="space-y-1">
                  {countryCtx.ooni_alerts.slice(0, 5).map((o, i) => (
                    <div key={i} className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] flex items-center justify-between text-xs">
                      <span className="truncate text-[#E6E8EC]">{o.domain}</span>
                      <span className={`font-mono-tech text-[10px] ${o.confirmed ? 'text-[#E85D4A]' : 'text-[#E5A952]'}`}>
                        {o.confirmed ? 'Engelli' : 'Anomali'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#4ADE80]">OONI güncel anomali bildirimi yok.</div>
              )}
              {outages.map((o, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] text-[11px] text-[#8E95A3]">
                  <span className="text-[#E6E8EC]">{o.entity}</span> • {o.datasource}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: NEWS & LOCAL OLLAMA AI */}
        {tab === 'news' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-white/[0.03] p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#E6E8EC] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#E5A952]" /> Lokal Ollama Durum Özeti
                </span>
                <span className="font-mono-tech text-[10px] text-[#8E95A3]">{config.ollamaModel}</span>
              </div>
              <button
                onClick={runAiBrief}
                disabled={briefLoading}
                className="w-full atlas-btn atlas-btn-amber py-2"
              >
                {briefLoading ? 'Analiz ediliyor...' : 'Bölge Brifingi Üret'}
              </button>
              {brief && (
                <div className="text-xs leading-relaxed text-[#E6E8EC] whitespace-pre-wrap pt-1">
                  {brief}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-[#8E95A3]">GDELT Güncel Haberler</div>
              {news.map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition"
                >
                  <div className="text-xs text-[#E6E8EC] leading-snug">{n.title}</div>
                  <div className="text-[10px] text-[#8E95A3] mt-1 flex items-center justify-between">
                    <span>{n.domain}</span>
                    <ExternalLink className="w-3 h-3 text-[#E5A952]" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
